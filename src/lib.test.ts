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
