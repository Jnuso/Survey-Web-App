-- Read-only screenshot query for the original fictional Survey Test.
-- Excludes anonymous browser tokens and credentials.
select s.title as survey,
       r.id as response_id,
       r.submitted_at,
       q.question_text,
       c.choice_text as answer
from public.responses r
join public.surveys s on s.id = r.survey_id
join public.answers a on a.response_id = r.id
join public.questions q on q.id = a.question_id
left join public.choices c on c.id = a.choice_id
where r.survey_id = '47bf2335-910a-434d-b521-ecd3caf81da4'
order by r.submitted_at, q.position;
