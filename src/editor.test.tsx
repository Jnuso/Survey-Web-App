// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Link, MemoryRouter, Route, Routes } from "react-router-dom";
const backend = vi.hoisted(() => ({ rpc: vi.fn(), survey: vi.fn() }));
vi.mock("react-dom/client", () => ({
  createRoot: () => ({ render: vi.fn() }),
}));
vi.mock("./lib", () => ({
  configured: true,
  ordered: (s: unknown) => s,
  createCsv: vi.fn(),
  surveyById: backend.survey,
  db: { rpc: backend.rpc },
}));
import { Editor } from "./main";
const draft = (id: string, title: string) => ({
  id,
  title,
  description: "",
  status: "draft",
  questions: [
    {
      id: `${id}-q`,
      question_text: "Question?",
      question_type: "multiple_choice",
      choices: [{ choice_text: "A" }, { choice_text: "B" }],
    },
  ],
});
function showEditor(path = "/surveys/new") {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/surveys/new" element={<Editor />} />
        <Route path="/surveys/:id/edit" element={<Editor />} />
        <Route path="/dashboard" element={<h1>Dashboard destination</h1>} />
      </Routes>
    </MemoryRouter>,
  );
}
beforeEach(() => {
  backend.rpc.mockResolvedValue({ data: "survey-id", error: null });
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});
async function completeForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("Survey title"), "Class check-in");
  await user.type(screen.getByLabelText("Question", { exact: true }), "Ready?");
  await user.type(screen.getByLabelText("Choice 1"), "Yes");
  await user.type(screen.getByLabelText("Choice 2"), "No");
}
describe("survey editor", () => {
  it.each(["active", "closed", "archived"])(
    "does not offer editing for a %s survey",
    async (status) => {
      backend.survey.mockResolvedValueOnce({
        ...draft("a", "Existing survey"),
        status,
      });
      showEditor("/surveys/a/edit");
      expect((await screen.findByRole("alert")).textContent).toMatch(
        /only draft surveys can be edited/i,
      );
      expect(screen.queryByLabelText("Survey title")).toBeNull();
      expect(screen.queryByRole("button", { name: "Save draft" })).toBeNull();
      expect(backend.rpc).not.toHaveBeenCalled();
    },
  );
  it("rejects a title containing only whitespace before saving", async () => {
    const user = userEvent.setup();
    showEditor();
    await completeForm(user);
    await user.clear(screen.getByLabelText("Survey title"));
    await user.type(screen.getByLabelText("Survey title"), "   ");
    await user.click(screen.getByRole("button", { name: "Save draft" }));
    expect((await screen.findByRole("alert")).textContent).toMatch(
      /enter a survey title/i,
    );
    expect(backend.rpc).not.toHaveBeenCalled();
  });
  it.each(["Question", "Choice 1"])(
    "rejects whitespace-only %s and saves after correction",
    async (field) => {
      const user = userEvent.setup();
      showEditor();
      await completeForm(user);
      const input = screen.getByLabelText(field, { exact: true });
      await user.clear(input);
      await user.type(input, "   ");
      await user.click(screen.getByRole("button", { name: "Save draft" }));
      expect((await screen.findByRole("alert")).textContent).toMatch(
        /complete every question and choice/i,
      );
      expect(backend.rpc).not.toHaveBeenCalled();
      await user.clear(input);
      await user.type(input, field === "Question" ? "Corrected?" : "Corrected");
      await user.click(screen.getByRole("button", { name: "Save draft" }));
      expect(
        await screen.findByRole("heading", { name: "Dashboard destination" }),
      ).toBeTruthy();
      expect(backend.rpc).toHaveBeenCalledTimes(1);
    },
  );
  it("saves a valid draft with the entered questions and choices", async () => {
    const user = userEvent.setup();
    showEditor();
    await completeForm(user);
    await user.click(screen.getByRole("button", { name: "Save draft" }));
    expect(
      await screen.findByRole("heading", { name: "Dashboard destination" }),
    ).toBeTruthy();
    expect(backend.rpc).toHaveBeenCalledWith(
      "save_survey",
      expect.objectContaining({
        p_title: "Class check-in",
        p_questions: [
          {
            question_text: "Ready?",
            question_type: "multiple_choice",
            choices: ["Yes", "No"],
          },
        ],
      }),
    );
  });
  it("does not replace filled choices when the type-change warning is cancelled", async () => {
    const user = userEvent.setup();
    showEditor();
    await completeForm(user);
    vi.spyOn(window, "confirm").mockReturnValue(false);
    await user.selectOptions(
      screen.getByLabelText("Question type"),
      "true_false",
    );
    expect(
      (screen.getByLabelText("Question type") as HTMLSelectElement).value,
    ).toBe("multiple_choice");
    expect((screen.getByLabelText("Choice 1") as HTMLInputElement).value).toBe(
      "Yes",
    );
  });
  it("replaces choices with True and False after the warning is accepted", async () => {
    const user = userEvent.setup();
    showEditor();
    await completeForm(user);
    vi.spyOn(window, "confirm").mockReturnValue(true);
    await user.selectOptions(
      screen.getByLabelText("Question type"),
      "true_false",
    );
    expect((screen.getByLabelText("Choice 1") as HTMLInputElement).value).toBe(
      "True",
    );
    expect((screen.getByLabelText("Choice 2") as HTMLInputElement).value).toBe(
      "False",
    );
    await user.click(screen.getByRole("button", { name: "Save draft" }));
    expect(backend.rpc).toHaveBeenCalledWith(
      "save_survey",
      expect.objectContaining({
        p_questions: [
          {
            question_text: "Ready?",
            question_type: "true_false",
            choices: ["True", "False"],
          },
        ],
      }),
    );
  });
  it("enables retry and reports a failed save if the request rejects", async () => {
    backend.rpc.mockRejectedValueOnce(new Error("connection failed"));
    const user = userEvent.setup();
    showEditor();
    await completeForm(user);
    await user.click(screen.getByRole("button", { name: "Save draft" }));
    expect((await screen.findByRole("alert")).textContent).toMatch(
      /connection failed/i,
    );
    expect(
      (screen.getByRole("button", { name: "Save draft" }) as HTMLButtonElement)
        .disabled,
    ).toBe(false);
  });
  it("does not overwrite a newer editor with a late earlier draft", async () => {
    let first!: (value: unknown) => void;
    backend.survey
      .mockReturnValueOnce(
        new Promise((resolve) => {
          first = resolve;
        }),
      )
      .mockResolvedValueOnce(draft("b", "Survey B"));
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/surveys/a/edit"]}>
        <Link to="/surveys/b/edit">Edit B</Link>
        <Routes>
          <Route path="/surveys/:id/edit" element={<Editor />} />
        </Routes>
      </MemoryRouter>,
    );
    await user.click(screen.getByText("Edit B"));
    expect(await screen.findByDisplayValue("Survey B")).toBeTruthy();
    await act(async () => {
      first(draft("a", "Survey A"));
    });
    expect(screen.getByDisplayValue("Survey B")).toBeTruthy();
    expect(screen.queryByDisplayValue("Survey A")).toBeNull();
  });
  it("does not navigate away from a different draft when an earlier save finishes", async () => {
    let complete!: (value: unknown) => void;
    backend.survey
      .mockResolvedValueOnce(draft("a", "Survey A"))
      .mockResolvedValueOnce(draft("b", "Survey B"));
    backend.rpc.mockReturnValueOnce(
      new Promise((resolve) => {
        complete = resolve;
      }),
    );
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/surveys/a/edit"]}>
        <Link to="/surveys/b/edit">Edit B</Link>
        <Routes>
          <Route path="/surveys/:id/edit" element={<Editor />} />
          <Route path="/dashboard" element={<h1>Dashboard destination</h1>} />
        </Routes>
      </MemoryRouter>,
    );
    await screen.findByDisplayValue("Survey A");
    await user.click(screen.getByRole("button", { name: "Save draft" }));
    await user.click(screen.getByText("Edit B"));
    await screen.findByDisplayValue("Survey B");
    await act(async () => {
      complete({ data: "a", error: null });
    });
    expect(screen.getByDisplayValue("Survey B")).toBeTruthy();
    expect(
      screen.queryByRole("heading", { name: "Dashboard destination" }),
    ).toBeNull();
    expect(
      (screen.getByRole("button", { name: "Save draft" }) as HTMLButtonElement)
        .disabled,
    ).toBe(false);
  });
  it("does not offer an editable form when an existing draft fails to load, and can retry", async () => {
    backend.survey
      .mockRejectedValueOnce(new Error("load failed"))
      .mockResolvedValueOnce(draft("a", "Survey A"));
    const user = userEvent.setup();
    showEditor("/surveys/a/edit");
    expect((await screen.findByRole("alert")).textContent).toMatch(
      /load failed/,
    );
    expect(screen.queryByLabelText("Survey title")).toBeNull();
    expect(backend.rpc).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByDisplayValue("Survey A")).toBeTruthy();
  });
  it("disables editing while a save is in flight", async () => {
    let complete!: (value: unknown) => void;
    backend.rpc.mockReturnValueOnce(
      new Promise((resolve) => {
        complete = resolve;
      }),
    );
    const user = userEvent.setup();
    showEditor();
    await completeForm(user);
    await user.click(screen.getByRole("button", { name: "Save draft" }));
    expect(
      (screen.getByLabelText("Survey title") as HTMLInputElement).matches(
        ":disabled",
      ),
    ).toBe(true);
    expect(
      (
        screen.getByRole("button", {
          name: "+ Add question",
        }) as HTMLButtonElement
      ).matches(":disabled"),
    ).toBe(true);
    await act(async () => {
      complete({ data: "a", error: null });
    });
    expect(
      await screen.findByRole("heading", { name: "Dashboard destination" }),
    ).toBeTruthy();
  });
  it("provides meaningful names for question controls", async () => {
    const user = userEvent.setup();
    showEditor();
    await user.click(screen.getByRole("button", { name: "+ Add question" }));
    await user.type(
      within(screen.getByRole("region", { name: "Question 1" })).getByLabelText(
        "Question",
      ),
      "First",
    );
    await user.type(
      within(screen.getByRole("region", { name: "Question 2" })).getByLabelText(
        "Question",
      ),
      "Second",
    );
    expect(
      screen.getByRole("button", { name: "Move question 1 down" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Move question 2 up" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Delete question 2" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Remove choice 1 from question 1" }),
    ).toBeTruthy();
    expect(
      within(screen.getByRole("region", { name: "Question 2" })).getByLabelText(
        "Choice 1",
      ),
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Move choice 1 down in question 2" }),
    ).toBeTruthy();
    await user.click(
      screen.getByRole("button", { name: "Move question 2 up" }),
    );
    expect(
      (
        within(
          screen.getByRole("region", { name: "Question 1" }),
        ).getByLabelText("Question") as HTMLInputElement
      ).value,
    ).toBe("Second");
    expect(
      (
        within(
          screen.getByRole("region", { name: "Question 2" }),
        ).getByLabelText("Question") as HTMLInputElement
      ).value,
    ).toBe("First");
    expect(
      within(screen.getByRole("region", { name: "Question 1" })).getByLabelText(
        "Choice 1",
      ),
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Move choice 1 down in question 1" }),
    ).toBeTruthy();
  });
});
