-- Compare the loaded version while holding the same row lock as the save.
begin;
create or replace function public.touch_survey() returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := greatest(clock_timestamp(), old.updated_at + interval '1 microsecond');
  return new;
end;
$$;
alter function public.save_survey(uuid,text,text,jsonb) rename to save_survey_internal;
revoke all on function public.save_survey_internal(uuid,text,text,jsonb) from public, anon, authenticated;
create function public.save_survey_checked(p_survey_id uuid, p_title text, p_description text, p_questions jsonb, p_expected_updated_at timestamptz default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare current_version timestamptz;
begin
  if not public.is_instructor() then raise exception 'AUTH_REQUIRED'; end if;
  if p_survey_id is not null then
    select updated_at into current_version from public.surveys where id=p_survey_id and status='draft' for update;
    if not found then raise exception 'DRAFT_REQUIRED'; end if;
    if p_expected_updated_at is null or current_version is distinct from p_expected_updated_at then raise exception 'DRAFT_CONFLICT'; end if;
  end if;
  return public.save_survey_internal(p_survey_id,p_title,p_description,p_questions);
end;
$$;
-- Retain creation compatibility, but older clients cannot overwrite drafts.
create function public.save_survey(p_survey_id uuid, p_title text, p_description text, p_questions jsonb)
returns uuid language sql security definer set search_path = '' as $$
  select public.save_survey_checked(p_survey_id,p_title,p_description,p_questions,null);
$$;
revoke all on function public.save_survey(uuid,text,text,jsonb) from public,anon;
revoke all on function public.save_survey_checked(uuid,text,text,jsonb,timestamptz) from public,anon;
grant execute on function public.save_survey(uuid,text,text,jsonb) to authenticated;
grant execute on function public.save_survey_checked(uuid,text,text,jsonb,timestamptz) to authenticated;
commit;
