// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Link, MemoryRouter, Route, Routes } from "react-router-dom";

const backend = vi.hoisted(() => ({
  load: vi.fn(),
  rpc: vi.fn(),
  eqSlug: vi.fn(),
  eqStatus: vi.fn(),
}));
vi.mock("react-dom/client", () => ({
  createRoot: () => ({ render: vi.fn() }),
}));
vi.mock("./lib", () => ({
  configured: true,
  ordered: (survey: unknown) => survey,
  createCsv: vi.fn(),
  surveyById: vi.fn(),
  studentDb: {
    rpc: backend.rpc,
    from: () => ({
      select: () => ({
        eq: backend.eqSlug,
      }),
    }),
  },
}));
import { Student, StudentRoute } from "./main";

const survey = {
  id: "survey-1",
  title: "Class check-in",
  description: "Test only",
  status: "active",
  questions: [
    {
      id: "q1",
      question_text: "Ready?",
      choices: [
        { id: "yes", choice_text: "Yes" },
        { id: "no", choice_text: "No" },
      ],
    },
    {
      id: "q2",
      question_text: "Topic?",
      choices: [
        { id: "react", choice_text: "React" },
        { id: "sql", choice_text: "SQL" },
      ],
    },
  ],
};
function showSurvey() {
  return render(
    <MemoryRouter initialEntries={["/s/survey-1"]}>
      <Routes>
        <Route path="/s/:slug" element={<Student />} />
      </Routes>
    </MemoryRouter>,
  );
}
async function answerBoth(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByLabelText("Yes"));
  await user.click(screen.getByLabelText("SQL"));
}

beforeEach(() => {
  localStorage.clear();
  backend.eqSlug.mockReturnValue({ eq: backend.eqStatus });
  backend.eqStatus.mockReturnValue({ maybeSingle: backend.load });
  backend.load.mockResolvedValue({ data: survey, error: null });
  backend.rpc.mockResolvedValue({ data: "response-1", error: null });
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe("student survey", () => {
  it("requests only the active survey matching the route", async () => {
    showSurvey();
    await screen.findByRole("heading", { name: "Class check-in" });
    expect(backend.eqSlug).toHaveBeenCalledWith("public_slug", "survey-1");
    expect(backend.eqStatus).toHaveBeenCalledWith("status", "active");
  });
  it("rejects missing answers without making a submission", async () => {
    const user = userEvent.setup();
    showSurvey();
    await screen.findByText("Class check-in");
    await user.click(screen.getByRole("button", { name: /submit response/i }));
    expect(screen.getByRole("alert").textContent).toMatch(
      /answer every question/i,
    );
    expect(backend.rpc).not.toHaveBeenCalled();
  });
  it("sends both selected answers and shows confirmation on success", async () => {
    const user = userEvent.setup();
    showSurvey();
    await answerBoth(user);
    await user.click(screen.getByRole("button", { name: /submit response/i }));
    expect(
      await screen.findByRole("heading", { name: "Thank you!" }),
    ).toBeTruthy();
    expect(backend.rpc).toHaveBeenCalledWith(
      "submit_survey_response",
      expect.objectContaining({
        p_survey_id: "survey-1",
        p_anonymous_token: expect.any(String),
        p_answers: expect.arrayContaining([
          { question_id: "q1", choice_id: "yes" },
          { question_id: "q2", choice_id: "sql" },
        ]),
      }),
    );
    expect(localStorage.getItem("classroom-survey-token")).toBeTruthy();
  });
  it.each([
    ["DUPLICATE_RESPONSE", /already submitted/i],
    ["SURVEY_NOT_ACTIVE", /no longer accepting responses/i],
    ["unexpected internals", /could not be submitted/i],
  ])("shows a safe error for %s and enables retry", async (error, expected) => {
    backend.rpc.mockResolvedValue({ data: null, error: { message: error } });
    const user = userEvent.setup();
    showSurvey();
    await answerBoth(user);
    await user.click(screen.getByRole("button", { name: /submit response/i }));
    expect((await screen.findByRole("alert")).textContent).toMatch(expected);
    expect(
      (
        screen.getByRole("button", {
          name: /submit response/i,
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(false);
    expect(screen.queryByRole("heading", { name: "Thank you!" })).toBeNull();
  });
  it("shows a storage error without sending a response", async () => {
    const user = userEvent.setup();
    showSurvey();
    await answerBoth(user);
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    await user.click(screen.getByRole("button", { name: /submit response/i }));
    expect(screen.getByRole("alert").textContent).toMatch(
      /storage is unavailable/i,
    );
    expect(backend.rpc).not.toHaveBeenCalled();
    expect(
      (
        screen.getByRole("button", {
          name: /submit response/i,
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(false);
  });
  it("handles an unavailable survey without exposing database errors", async () => {
    backend.load.mockResolvedValue({
      data: null,
      error: { message: "private database error" },
    });
    showSurvey();
    await screen.findByRole("heading", { name: "Survey unavailable" });
    expect(screen.getByText(/no longer accepting responses/i)).toBeTruthy();
    expect(screen.queryByText(/private database error/i)).toBeNull();
    expect(backend.rpc).not.toHaveBeenCalled();
  });
  it("disables repeated submission while the request is pending", async () => {
    let resolve!: (value: { data: string; error: null }) => void;
    backend.rpc.mockReturnValue(
      new Promise((r) => {
        resolve = r;
      }),
    );
    const user = userEvent.setup();
    showSurvey();
    await answerBoth(user);
    const button = screen.getByRole("button", { name: /submit response/i });
    await user.click(button);
    expect((button as HTMLButtonElement).disabled).toBe(true);
    await user.click(button);
    expect(backend.rpc).toHaveBeenCalledTimes(1);
    resolve({ data: "response", error: null });
    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "Thank you!" })).toBeTruthy(),
    );
  });
  it("reuses an existing browser token", async () => {
    localStorage.setItem("classroom-survey-token", "existing-browser-token");
    const user = userEvent.setup();
    showSurvey();
    await answerBoth(user);
    await user.click(screen.getByRole("button", { name: /submit response/i }));
    await screen.findByRole("heading", { name: "Thank you!" });
    expect(backend.rpc).toHaveBeenCalledWith(
      "submit_survey_response",
      expect.objectContaining({ p_anonymous_token: "existing-browser-token" }),
    );
  });
  it("recovers after a failed request when the student retries", async () => {
    backend.rpc
      .mockResolvedValueOnce({
        data: null,
        error: { message: "network failure" },
      })
      .mockResolvedValueOnce({ data: "response", error: null });
    const user = userEvent.setup();
    showSurvey();
    await answerBoth(user);
    await user.click(screen.getByRole("button", { name: /submit response/i }));
    expect((await screen.findByRole("alert")).textContent).toMatch(
      /could not be submitted/i,
    );
    await user.click(screen.getByRole("button", { name: /submit response/i }));
    expect(
      await screen.findByRole("heading", { name: "Thank you!" }),
    ).toBeTruthy();
    expect(backend.rpc).toHaveBeenCalledTimes(2);
  });
  it("does not carry answers between survey routes", async () => {
    const other = { ...survey, id: "survey-2", title: "Other survey" };
    backend.load
      .mockResolvedValueOnce({ data: survey, error: null })
      .mockResolvedValueOnce({ data: other, error: null });
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/s/survey-1"]}>
        <Link to="/s/survey-2">Other survey link</Link>
        <Routes>
          <Route path="/s/:slug" element={<StudentRoute />} />
        </Routes>
      </MemoryRouter>,
    );
    await answerBoth(user);
    await user.click(screen.getByText("Other survey link"));
    await screen.findByRole("heading", { name: "Other survey" });
    expect((screen.getByLabelText("Yes") as HTMLInputElement).checked).toBe(
      false,
    );
    expect((screen.getByLabelText("SQL") as HTMLInputElement).checked).toBe(
      false,
    );
    await user.click(screen.getByRole("button", { name: /submit response/i }));
    expect(screen.getByRole("alert").textContent).toMatch(
      /answer every question/i,
    );
    expect(backend.rpc).not.toHaveBeenCalled();
  });
  it("does not let a late previous survey load replace the current route", async () => {
    let resolveFirst!: (value: unknown) => void;
    backend.load
      .mockReturnValueOnce(
        new Promise((resolve) => {
          resolveFirst = resolve;
        }),
      )
      .mockResolvedValueOnce({
        data: { ...survey, id: "survey-2", title: "Other survey" },
        error: null,
      });
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/s/survey-1"]}>
        <Link to="/s/survey-2">Other survey link</Link>
        <Routes>
          <Route path="/s/:slug" element={<StudentRoute />} />
        </Routes>
      </MemoryRouter>,
    );
    await user.click(screen.getByText("Other survey link"));
    await screen.findByRole("heading", { name: "Other survey" });
    await act(async () => {
      resolveFirst({ data: survey, error: null });
    });
    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: "Other survey" }),
      ).toBeTruthy(),
    );
    expect(
      screen.queryByRole("heading", { name: "Class check-in" }),
    ).toBeNull();
  });
  it("shows a safe error and enables retry if the request rejects", async () => {
    backend.rpc.mockRejectedValueOnce(new Error("connection interrupted"));
    const user = userEvent.setup();
    showSurvey();
    await answerBoth(user);
    await user.click(screen.getByRole("button", { name: /submit response/i }));
    expect((await screen.findByRole("alert")).textContent).toMatch(
      /could not be submitted/i,
    );
    expect(
      (
        screen.getByRole("button", {
          name: /submit response/i,
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(false);
  });
  it("does not remain loading if the initial request rejects", async () => {
    backend.load.mockRejectedValueOnce(new Error("connection interrupted"));
    showSurvey();
    expect(
      await screen.findByRole("heading", { name: "Survey unavailable" }),
    ).toBeTruthy();
    expect(screen.queryByText("connection interrupted")).toBeNull();
  });
  it("allows a student to answer and submit using the keyboard", async () => {
    // jsdom does not provide CSS.escape; these fixture radio names are simple identifiers.
    vi.stubGlobal("CSS", { escape: (value: string) => value });
    const user = userEvent.setup();
    showSurvey();
    await screen.findByRole("heading", { name: "Class check-in" });
    await user.tab();
    expect(document.activeElement).toBe(screen.getByLabelText("Yes"));
    await user.keyboard("{ArrowDown}");
    expect((screen.getByLabelText("No") as HTMLInputElement).checked).toBe(
      true,
    );
    await user.tab();
    expect(document.activeElement).toBe(screen.getByLabelText("React"));
    await user.keyboard("{ArrowDown}");
    expect((screen.getByLabelText("SQL") as HTMLInputElement).checked).toBe(
      true,
    );
    await user.tab();
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: /submit response/i }),
    );
    await user.keyboard("{Enter}");
    expect(
      await screen.findByRole("heading", { name: "Thank you!" }),
    ).toBeTruthy();
    expect(backend.rpc).toHaveBeenCalledWith(
      "submit_survey_response",
      expect.objectContaining({
        p_answers: expect.arrayContaining([
          { question_id: "q1", choice_id: "no" },
          { question_id: "q2", choice_id: "sql" },
        ]),
      }),
    );
  });
});
