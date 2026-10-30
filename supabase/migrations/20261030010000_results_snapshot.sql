-- Return the survey definition and all its responses from one statement snapshot.
-- The JSON result is a single row, so PostgREST's per-row limit does not truncate it.
create function public.get_survey_results(p_survey_id uuid)
returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare result jsonb;
begin
  if not public.is_instructor() then raise exception 'AUTH_REQUIRED'; end if;
  select jsonb_build_object(
    'survey', to_jsonb(s) || jsonb_build_object('questions', coalesce((
      select jsonb_agg(to_jsonb(q) || jsonb_build_object('choices', coalesce((
        select jsonb_agg(to_jsonb(c) order by c.position, c.id)
        from public.choices c where c.question_id = q.id
      ), '[]'::jsonb)) order by q.position, q.id)
      from public.questions q where q.survey_id = s.id
    ), '[]'::jsonb)),
    'responses', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', r.id, 'submitted_at', r.submitted_at,
        'answers', coalesce((
          select jsonb_agg(jsonb_build_object('question_id', a.question_id, 'choice_id', a.choice_id) order by a.question_id)
          from public.answers a where a.response_id = r.id
        ), '[]'::jsonb)
      ) order by r.submitted_at, r.id)
      from public.responses r where r.survey_id = s.id
    ), '[]'::jsonb)
  ) into result from public.surveys s where s.id = p_survey_id;
  if result is null then raise exception 'SURVEY_NOT_FOUND'; end if;
  return result;
end;
$$;
revoke all on function public.get_survey_results(uuid) from public, anon;
grant execute on function public.get_survey_results(uuid) to authenticated;
