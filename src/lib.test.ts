import { describe, expect, it } from 'vitest';
import { createCsv, csvCell, type Survey } from './lib';
describe('CSV export', () => {
  it('escapes quotes, commas and spreadsheet formulas', () => {
    expect(csvCell('a,"b"')).toBe('"a,""b"""');
    expect(csvCell('=1+1')).toBe('"\'=1+1"');
  });
  it('maps answers to ordered question columns', () => {
    const survey = { questions: [{ id:'q', question_text:'Question?', position:0, question_type:'multiple_choice', choices:[{ id:'c',choice_text:'Yes',position:0 }] }] } as Survey;
    expect(createCsv(survey,[{id:'r',submitted_at:'today',answers:[{question_id:'q',choice_id:'c'}]}])).toContain('"r","today","Yes"');
  });
});
