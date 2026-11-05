import { describe, expect, it } from "vitest";
import { createCsv, csvCell, type Survey } from "./lib";
describe("CSV export", () => {
  it("escapes quotes, commas and spreadsheet formulas", () => {
    expect(csvCell('a,"b"')).toBe('"a,""b"""');
    expect(csvCell("=1+1")).toBe('"\'=1+1"');
  });
  it("maps answers to ordered question columns", () => {
    const survey = {
      questions: [
        {
          id: "q",
          question_text: "Question?",
          position: 0,
          question_type: "multiple_choice",
          choices: [{ id: "c", choice_text: "Yes", position: 0 }],
        },
      ],
    } as Survey;
    expect(
      createCsv(survey, [
        {
          id: "r",
          submitted_at: "today",
          answers: [{ question_id: "q", choice_id: "c" }],
        },
      ]),
    ).toContain('"r","today","Yes"');
  });
  it("exports a header for an empty survey and empty cells for missing answers", () => {
    const survey: Survey = {
      id: "s",
      title: "Test",
      description: null,
      status: "draft",
      public_slug: null,
      created_at: "today",
      questions: [
        {
          id: "q",
          question_text: "Question",
          question_type: "multiple_choice",
          position: 0,
          choices: [],
        },
      ],
    };
    expect(createCsv(survey, [])).toBe(
      '"response_id","submitted_at","Question"',
    );
    expect(
      createCsv(survey, [{ id: "r", submitted_at: "today", answers: [] }]),
    ).toBe('"response_id","submitted_at","Question"\r\n"r","today",""');
  });
  it("preserves Unicode and line breaks while escaping spreadsheet formulas", () => {
    expect(csvCell('Café, "yes"\nnext')).toBe('"Café, ""yes""\nnext"');
    for (const prefix of ["=", "+", "-", "@"]) {
      expect(csvCell(` \t${prefix}1`)).toBe(`"' \t${prefix}1"`);
    }
    expect(csvCell("ordinary text")).toBe('"ordinary text"');
  });
  it("matches out-of-order answers to question columns and escapes exported text", () => {
    const survey = {
      questions: [
        {
          id: "q1",
          question_text: "=First?",
          choices: [{ id: "a", choice_text: 'Yes, "please"' }],
        },
        {
          id: "q2",
          question_text: "Second?",
          choices: [{ id: "b", choice_text: "+formula" }],
        },
        {
          id: "q3",
          question_text: "Third?",
          choices: [{ id: "c", choice_text: "Other" }],
        },
      ],
    } as unknown as Survey;
    expect(
      createCsv(survey, [
        {
          id: "r1",
          submitted_at: "today",
          answers: [
            { question_id: "q2", choice_id: "b" },
            { question_id: "q1", choice_id: "a" },
          ],
        },
        {
          id: "r2",
          submitted_at: "tomorrow",
          answers: [{ question_id: "q3", choice_id: "c" }],
        },
      ]),
    ).toBe(
      '"response_id","submitted_at","\'=First?","Second?","Third?"\r\n"r1","today","Yes, ""please""","\'+formula",""\r\n"r2","tomorrow","","","Other"',
    );
  });
  it("keeps every response once in a large export", () => {
    const survey = { questions: [] } as unknown as Survey;
    const responses = Array.from({ length: 601 }, (_, i) => ({
      id: `response-${i}`,
      submitted_at: "today",
      answers: [],
    }));
    const rows = createCsv(survey, responses).split("\r\n");
    expect(rows).toHaveLength(602);
    expect(new Set(rows.slice(1)).size).toBe(601);
    expect(rows[601]).toBe('"response-600","today"');
  });
});
