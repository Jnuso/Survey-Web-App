// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  act,
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
const backend = vi.hoisted(() => ({
  list: vi.fn(),
  write: vi.fn(),
  writeId: vi.fn(),
  writeStatus: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  rpc: vi.fn(),
  survey: vi.fn(),
  signout: vi.fn(),
}));
vi.mock("react-dom/client", () => ({
  createRoot: () => ({ render: vi.fn() }),
}));
vi.mock("./lib", () => ({
  configured: true,
  ordered: (s: unknown) => s,
  createCsv: vi.fn(),
  surveyById: backend.survey,
  db: {
    rpc: backend.rpc,
    auth: { signOut: backend.signout },
    from: () => ({
      select: () => ({ order: backend.list }),
      update: backend.update,
      delete: backend.remove,
    }),
  },
}));
import { Dashboard } from "./main";
const surveys = [
  {
    id: "a",
    title: "Active Survey",
    status: "active",
    created_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "b",
    title: "Draft Survey",
    status: "draft",
    created_at: "2026-01-02T00:00:00Z",
  },
];
function show() {
  render(
    <MemoryRouter initialEntries={["/dashboard"]}>
      <Routes>
        <Route
          path="/dashboard"
          element={<Dashboard email="test@example.com" />}
        />
        <Route
          path="/surveys/:id/present"
          element={<h1>Presentation destination</h1>}
        />
        <Route path="/surveys/:id/edit" element={<h1>Editor destination</h1>} />
        <Route path="/surveys/new" element={<h1>New survey destination</h1>} />
      </Routes>
    </MemoryRouter>,
  );
}
beforeEach(() => {
  backend.list.mockResolvedValue({ data: surveys, error: null });
  backend.rpc.mockResolvedValue({ data: null, error: null });
  backend.update.mockReturnValue({ eq: backend.writeId });
  backend.remove.mockReturnValue({ eq: backend.writeId });
  backend.writeId.mockReturnValue({ eq: backend.writeStatus });
  backend.writeStatus.mockReturnValue({
    select: () => ({ maybeSingle: backend.write }),
  });
  backend.write.mockResolvedValue({ data: { id: "a" }, error: null });
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});
describe("instructor dashboard", () => {
  it("filters surveys by title and status", async () => {
    const user = userEvent.setup();
    show();
    await screen.findByRole("heading", { name: "Active Survey" });
    await user.type(screen.getByLabelText("Search"), "draft");
    expect(screen.getByRole("heading", { name: "Draft Survey" })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Active Survey" })).toBeNull();
    await user.selectOptions(screen.getByLabelText("Status"), "active");
    expect(screen.getByText(/no surveys match/i)).toBeTruthy();
  });
  it("activates the selected draft and navigates to presentation", async () => {
    const user = userEvent.setup();
    show();
    const heading = await screen.findByRole("heading", {
      name: "Draft Survey",
    });
    const card = heading.closest("article")!;
    await user.click(within(card).getByRole("button", { name: "Activate" }));
    expect(
      await screen.findByRole("heading", { name: "Presentation destination" }),
    ).toBeTruthy();
    expect(backend.rpc).toHaveBeenCalledWith("activate_survey", {
      p_survey_id: "b",
    });
  });
  it("duplicates question content into a new survey without reusing IDs", async () => {
    backend.survey.mockResolvedValueOnce({
      questions: [
        {
          id: "original-q",
          question_text: "Ready?",
          question_type: "multiple_choice",
          choices: [
            { id: "original-c", choice_text: "Yes" },
            { id: "other-c", choice_text: "No" },
          ],
        },
        {
          id: "original-q2",
          question_text: "Finished?",
          question_type: "true_false",
          choices: [
            { id: "t", choice_text: "True" },
            { id: "f", choice_text: "False" },
          ],
        },
      ],
    });
    backend.rpc.mockResolvedValueOnce({ data: "new-id", error: null });
    const user = userEvent.setup();
    show();
    const heading = await screen.findByRole("heading", {
      name: "Draft Survey",
    });
    await user.click(
      within(heading.closest("article")!).getByRole("button", {
        name: "Duplicate",
      }),
    );
    expect(
      await screen.findByRole("heading", { name: "Editor destination" }),
    ).toBeTruthy();
    expect(backend.survey).toHaveBeenCalledWith("b");
    expect(backend.rpc).toHaveBeenCalledWith("save_survey", {
      p_survey_id: null,
      p_title: "Copy of Draft Survey",
      p_description: undefined,
      p_questions: [
        {
          question_text: "Ready?",
          question_type: "multiple_choice",
          choices: ["Yes", "No"],
        },
        {
          question_text: "Finished?",
          question_type: "true_false",
          choices: ["True", "False"],
        },
      ],
    });
  });
  it("does not mutate when deletion is cancelled", async () => {
    const user = userEvent.setup();
    vi.spyOn(window, "confirm").mockReturnValue(false);
    show();
    const heading = await screen.findByRole("heading", {
      name: "Draft Survey",
    });
    await user.click(
      within(heading.closest("article")!).getByRole("button", {
        name: "Delete",
      }),
    );
    expect(backend.writeId).not.toHaveBeenCalled();
  });
  it("does not remain loading if the list request rejects", async () => {
    backend.list.mockRejectedValueOnce(new Error("list unavailable"));
    show();
    expect((await screen.findByRole("alert")).textContent).toMatch(
      /list unavailable/,
    );
    expect(screen.queryByText("Loading surveys…")).toBeNull();
  });
  it("retries a failed list load without showing a false empty state", async () => {
    backend.list
      .mockRejectedValueOnce(new Error("list unavailable"))
      .mockResolvedValueOnce({ data: surveys, error: null });
    const user = userEvent.setup();
    show();
    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(screen.queryByText(/your first survey starts here/i)).toBeNull();
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(
      await screen.findByRole("heading", { name: "Draft Survey" }),
    ).toBeTruthy();
    expect(screen.queryByRole("alert")).toBeNull();
  });
  it("does not report a successful close when no row was updated", async () => {
    backend.write.mockResolvedValueOnce({ data: null, error: null });
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const user = userEvent.setup();
    show();
    const heading = await screen.findByRole("heading", {
      name: "Active Survey",
    });
    await user.click(
      within(heading.closest("article")!).getByRole("button", {
        name: "Close",
      }),
    );
    expect((await screen.findByRole("alert")).textContent).toMatch(
      /could not be updated/i,
    );
  });
  it("closes only the selected active survey and reloads after a returned row", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    backend.write.mockResolvedValueOnce({ data: { id: "a" }, error: null });
    const user = userEvent.setup();
    show();
    const heading = await screen.findByRole("heading", {
      name: "Active Survey",
    });
    await user.click(
      within(heading.closest("article")!).getByRole("button", {
        name: "Close",
      }),
    );
    await screen.findByRole("heading", { name: "Active Survey" });
    expect(backend.update).toHaveBeenCalledWith({ status: "closed" });
    expect(backend.writeId).toHaveBeenCalledWith("id", "a");
    expect(backend.writeStatus).toHaveBeenCalledWith("status", "active");
    expect(backend.list).toHaveBeenCalledTimes(2);
  });
  it("reports a rejected update and allows another attempt", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    backend.write.mockRejectedValueOnce(new Error("update failed"));
    const user = userEvent.setup();
    show();
    const heading = await screen.findByRole("heading", {
      name: "Active Survey",
    });
    const button = within(heading.closest("article")!).getByRole("button", {
      name: "Close",
    });
    await user.click(button);
    expect((await screen.findByRole("alert")).textContent).toMatch(
      /update failed/,
    );
    expect((button as HTMLButtonElement).disabled).toBe(false);
  });
  it("uses the delete operation and reloads after a confirmed deletion", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    backend.write.mockResolvedValueOnce({ data: { id: "b" }, error: null });
    const user = userEvent.setup();
    show();
    const heading = await screen.findByRole("heading", {
      name: "Draft Survey",
    });
    await user.click(
      within(heading.closest("article")!).getByRole("button", {
        name: "Delete",
      }),
    );
    await screen.findByRole("heading", { name: "Draft Survey" });
    expect(backend.remove).toHaveBeenCalledTimes(1);
    expect(backend.update).not.toHaveBeenCalled();
    expect(backend.writeId).toHaveBeenCalledWith("id", "b");
    expect(backend.writeStatus).toHaveBeenCalledWith("status", "draft");
    expect(backend.list).toHaveBeenCalledTimes(2);
  });
  it("does not navigate away from a new page after a late activation", async () => {
    let finish!: (result: unknown) => void;
    backend.rpc.mockReturnValueOnce(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    const user = userEvent.setup();
    show();
    const heading = await screen.findByRole("heading", {
      name: "Draft Survey",
    });
    await user.click(
      within(heading.closest("article")!).getByRole("button", {
        name: "Activate",
      }),
    );
    await user.click(screen.getByRole("link", { name: /new survey/i }));
    expect(
      await screen.findByRole("heading", { name: "New survey destination" }),
    ).toBeTruthy();
    await act(async () => {
      finish({ data: null, error: null });
    });
    expect(
      screen.getByRole("heading", { name: "New survey destination" }),
    ).toBeTruthy();
    expect(
      screen.queryByRole("heading", { name: "Presentation destination" }),
    ).toBeNull();
  });
  it("does not start duplication after leaving during the source lookup", async () => {
    let finish!: (value: unknown) => void;
    backend.survey.mockReturnValueOnce(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    const user = userEvent.setup();
    show();
    const heading = await screen.findByRole("heading", {
      name: "Draft Survey",
    });
    await user.click(
      within(heading.closest("article")!).getByRole("button", {
        name: "Duplicate",
      }),
    );
    await user.click(screen.getByRole("link", { name: /new survey/i }));
    await screen.findByRole("heading", { name: "New survey destination" });
    await act(async () => {
      finish({ id: "b", questions: [] });
    });
    expect(backend.rpc).not.toHaveBeenCalled();
  });
  it("does not navigate back after a duplicate finishes on another page", async () => {
    let finish!: (value: unknown) => void;
    backend.survey.mockResolvedValueOnce({ id: "b", questions: [] });
    backend.rpc.mockReturnValueOnce(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    const user = userEvent.setup();
    show();
    const heading = await screen.findByRole("heading", {
      name: "Draft Survey",
    });
    await user.click(
      within(heading.closest("article")!).getByRole("button", {
        name: "Duplicate",
      }),
    );
    await waitFor(() => expect(backend.rpc).toHaveBeenCalled());
    await user.click(screen.getByRole("link", { name: /new survey/i }));
    await screen.findByRole("heading", { name: "New survey destination" });
    await act(async () => {
      finish({ data: "new-id", error: null });
    });
    expect(
      screen.getByRole("heading", { name: "New survey destination" }),
    ).toBeTruthy();
  });
});
