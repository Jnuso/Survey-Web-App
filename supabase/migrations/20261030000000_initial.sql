-- Classroom Survey initial schema. Create only trusted instructor users; disable public signups.
create extension if not exists pgcrypto;

create table public.surveys (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(trim(title)) > 0),
  description text,
  status text not null default 'draft' check (status in ('draft','active','closed','archived')),
  public_slug text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.questions (
  id uuid primary key default gen_random_uuid(),
  survey_id uuid not null references public.surveys(id) on delete cascade,
  question_text text not null check (length(trim(question_text)) > 0),
  question_type text not null check (question_type in ('multiple_choice','true_false')),
  position integer not null check (position >= 0),
  created_at timestamptz not null default now()
);
create table public.choices (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions(id) on delete cascade,
  choice_text text not null check (length(trim(choice_text)) > 0),
  position integer not null check (position >= 0),
  created_at timestamptz not null default now()
);
create table public.responses (
  id uuid primary key default gen_random_uuid(),
  survey_id uuid not null references public.surveys(id) on delete cascade,
  anonymous_token text not null check (length(anonymous_token) between 16 and 200),
  submitted_at timestamptz not null default now(),
  unique (survey_id, anonymous_token)
);
create table public.answers (
  id uuid primary key default gen_random_uuid(),
  response_id uuid not null references public.responses(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete cascade,
  choice_id uuid references public.choices(id) on delete set null,
  text_answer text,
  created_at timestamptz not null default now(),
  unique (response_id, question_id)
);
create index surveys_status_idx on public.surveys(status);
create unique index only_one_active_survey on public.surveys ((status)) where status = 'active';
create index questions_survey_id_idx on public.questions(survey_id);
create index choices_question_id_idx on public.choices(question_id);
create index responses_survey_id_idx on public.responses(survey_id);
create index responses_submitted_at_idx on public.responses(submitted_at);
create index answers_response_id_idx on public.answers(response_id);
create index answers_question_id_idx on public.answers(question_id);
create index answers_choice_id_idx on public.answers(choice_id);

create function public.touch_survey() returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at := now(); return new; end;
$$;
create trigger surveys_updated_at before update on public.surveys for each row execute function public.touch_survey();

alter table public.surveys enable row level security;
alter table public.questions enable row level security;
alter table public.choices enable row level security;
alter table public.responses enable row level security;
alter table public.answers enable row level security;

-- Only enrolled instructor accounts can manage data; disable public signup as an additional safeguard.
create table public.instructors (user_id uuid primary key references auth.users(id) on delete cascade);
 alter table public.instructors enable row level security;
 revoke all on public.instructors from anon, authenticated;
 create function public.is_instructor() returns boolean language sql stable security definer set search_path = '' as $$ select exists (select 1 from public.instructors where user_id = auth.uid()); $$;
 revoke all on function public.is_instructor() from public;
 grant execute on function public.is_instructor() to authenticated;
create policy instructor_all on public.surveys for all to authenticated using (public.is_instructor()) with check (public.is_instructor());
create policy instructor_all on public.questions for all to authenticated using (public.is_instructor()) with check (public.is_instructor());
create policy instructor_all on public.choices for all to authenticated using (public.is_instructor()) with check (public.is_instructor());
create policy instructor_all on public.responses for all to authenticated using (public.is_instructor()) with check (public.is_instructor());
create policy instructor_all on public.answers for all to authenticated using (public.is_instructor()) with check (public.is_instructor());
create policy student_active_survey on public.surveys for select to anon, authenticated using (status = 'active');
create policy student_active_questions on public.questions for select to anon, authenticated using (
  exists (select 1 from public.surveys s where s.id = survey_id and s.status = 'active')
);
create policy student_active_choices on public.choices for select to anon, authenticated using (
  exists (select 1 from public.questions q join public.surveys s on s.id = q.survey_id
          where q.id = question_id and s.status = 'active')
);
revoke all on public.surveys, public.questions, public.choices, public.responses, public.answers from anon, authenticated;
grant select on public.surveys, public.questions, public.choices to anon;
grant select, insert, update, delete on public.surveys, public.questions, public.choices, public.responses, public.answers to authenticated;

-- Save questions and choices in a single transaction; published surveys retain their history.
-- p_questions = [{question_text, question_type, choices: [string, ...]}, ...]
create function public.save_survey(p_survey_id uuid, p_title text, p_description text, p_questions jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid; q jsonb; c jsonb; v_question_id uuid; q_pos integer := 0; c_pos integer;
begin
  if not public.is_instructor() then raise exception 'AUTH_REQUIRED'; end if;
  if p_title is null or length(trim(p_title)) = 0 then raise exception 'TITLE_REQUIRED'; end if;
  if p_questions is null or jsonb_typeof(p_questions) <> 'array' then raise exception 'INVALID_QUESTIONS'; end if;
  if jsonb_array_length(p_questions) = 0 then raise exception 'QUESTIONS_REQUIRED'; end if;
  if p_survey_id is null then
    insert into public.surveys(title, description) values(trim(p_title), nullif(trim(coalesce(p_description,'')), '')) returning id into v_id;
  else
    select id into v_id from public.surveys where id = p_survey_id and status = 'draft' for update;
    if v_id is null then raise exception 'DRAFT_REQUIRED'; end if;
    update public.surveys set title = trim(p_title), description = nullif(trim(coalesce(p_description,'')), '') where id = v_id;
    delete from public.questions where survey_id = v_id;
  end if;
  for q in select value from jsonb_array_elements(p_questions) loop
    if jsonb_typeof(q) <> 'object' or nullif(trim(q->>'question_text'), '') is null
       or coalesce(q->>'question_type','') not in ('multiple_choice','true_false')
       or jsonb_typeof(q->'choices') is distinct from 'array' then
      raise exception 'INVALID_QUESTION';
    end if;
    if jsonb_array_length(q->'choices') < 2 then raise exception 'CHOICES_REQUIRED'; end if;
    if q->>'question_type' = 'true_false' and (jsonb_array_length(q->'choices') <> 2
       or lower(trim(q->'choices'->>0)) <> 'true' or lower(trim(q->'choices'->>1)) <> 'false') then
      raise exception 'INVALID_TRUE_FALSE';
    end if;
    insert into public.questions(survey_id, question_text, question_type, position)
      values(v_id, trim(q->>'question_text'), q->>'question_type', q_pos) returning id into v_question_id;
    q_pos := q_pos + 1; c_pos := 0;
    for c in select value from jsonb_array_elements(q->'choices') loop
      if jsonb_typeof(c) <> 'string' or nullif(trim(c #>> '{}'), '') is null then raise exception 'INVALID_CHOICE'; end if;
      insert into public.choices(question_id, choice_text, position) values (v_question_id, trim(c #>> '{}'), c_pos);
      c_pos := c_pos + 1;
    end loop;
  end loop;
  return v_id;
end;
$$;

-- Serialize activations; the partial index independently enforces the invariant.
create function public.activate_survey(p_survey_id uuid)
returns public.surveys language plpgsql security definer set search_path = '' as $$
declare result public.surveys;
begin
  if not public.is_instructor() then raise exception 'AUTH_REQUIRED'; end if;
  perform pg_advisory_xact_lock(1095971121);
  select * into result from public.surveys where id = p_survey_id for update;
  if not found then raise exception 'SURVEY_NOT_FOUND'; end if;
  if result.status = 'archived' then raise exception 'SURVEY_ARCHIVED'; end if;
  if not exists (select 1 from public.questions where survey_id = p_survey_id) then raise exception 'QUESTIONS_REQUIRED'; end if;
  update public.surveys set status = 'closed' where status = 'active' and id <> p_survey_id;
  update public.surveys set status = 'active', public_slug = coalesce(public_slug, id::text)
    where id = p_survey_id returning * into result;
  return result;
end;
$$;

-- No anonymous direct writes. Validate all selected choices and commit every answer together.
create function public.submit_survey_response(p_survey_id uuid, p_anonymous_token text, p_answers jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_response_id uuid; v_question_count integer; v_answer_count integer; v_valid_count integer;
begin
  if p_anonymous_token is null or length(p_anonymous_token) not between 16 and 200 then raise exception 'INVALID_TOKEN'; end if;
  -- This row lock serializes a submission with closing/deleting this survey.
  perform 1 from public.surveys where id = p_survey_id and status = 'active' for share;
  if not found then raise exception 'SURVEY_NOT_ACTIVE'; end if;
  if p_answers is null or jsonb_typeof(p_answers) <> 'array' then raise exception 'INVALID_ANSWERS'; end if;
  select count(*) into v_question_count from public.questions where survey_id = p_survey_id;
  v_answer_count := jsonb_array_length(p_answers);
  if v_question_count = 0 or v_answer_count <> v_question_count then raise exception 'MISSING_REQUIRED_ANSWER'; end if;
  -- Compare text UUIDs rather than casting untrusted JSON, so malformed IDs are rejected uniformly.
  select count(distinct q.id) into v_valid_count
    from jsonb_array_elements(p_answers) a
    join public.questions q on q.id::text = a->>'question_id' and q.survey_id = p_survey_id
    join public.choices c on c.id::text = a->>'choice_id' and c.question_id = q.id;
  if v_valid_count <> v_question_count then raise exception 'INVALID_ANSWER'; end if;
  begin
    insert into public.responses(survey_id, anonymous_token) values(p_survey_id, p_anonymous_token) returning id into v_response_id;
  exception when unique_violation then raise exception 'DUPLICATE_RESPONSE';
  end;
  insert into public.answers(response_id, question_id, choice_id)
    select v_response_id, q.id, c.id from jsonb_array_elements(p_answers) a
    join public.questions q on q.id::text = a->>'question_id' and q.survey_id = p_survey_id
    join public.choices c on c.id::text = a->>'choice_id' and c.question_id = q.id;
  return v_response_id;
end;
$$;
revoke all on function public.save_survey(uuid,text,text,jsonb) from public, anon;
revoke all on function public.activate_survey(uuid) from public, anon;
revoke all on function public.submit_survey_response(uuid,text,jsonb) from public;
grant execute on function public.save_survey(uuid,text,text,jsonb) to authenticated;
grant execute on function public.activate_survey(uuid) to authenticated;
grant execute on function public.submit_survey_response(uuid,text,jsonb) to anon, authenticated;



