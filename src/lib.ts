import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const configured = Boolean(url && key);
export const db = createClient(url || 'http://127.0.0.1:54321', key || 'unconfigured');
export type Choice = { id: string; choice_text: string; position: number };
export type Question = { id: string; question_text: string; question_type: 'multiple_choice' | 'true_false'; position: number; choices: Choice[] };
export type Survey = { id: string; title: string; description: string | null; status: 'draft' | 'active' | 'closed' | 'archived'; public_slug: string | null; created_at: string; questions?: Question[] };
export type Response = { id: string; submitted_at: string; answers: { question_id: string; choice_id: string }[] };
export function ordered(s: Survey): Survey { return { ...s, questions: (s.questions || []).sort((a,b) => a.position-b.position).map(q => ({...q, choices: q.choices.sort((a,b) => a.position-b.position)})) }; }
export async function surveyById(id: string) { const { data, error } = await db.from('surveys').select('*, questions(*, choices(*))').eq('id', id).maybeSingle(); if(error) throw error; return data ? ordered(data as Survey) : null; }
export function csvCell(value: string) { const safe = /^[\t\r\n ]*[=+@-]/.test(value) ? "'" + value : value; return `"${safe.replaceAll('"','""')}"`; }
export function createCsv(s: Survey, responses: Response[]) { const questions = s.questions || []; return [ ['response_id','submitted_at',...questions.map(q=>q.question_text)], ...responses.map(r=>[r.id,r.submitted_at,...questions.map(q=>q.choices.find(c=>c.id===r.answers.find(a=>a.question_id===q.id)?.choice_id)?.choice_text || '')]) ].map(row=>row.map(csvCell).join(',')).join('\r\n'); }
