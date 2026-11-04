// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Link, MemoryRouter, Route, Routes } from "react-router-dom";
const backend = vi.hoisted(() => ({ rpc: vi.fn(), csv: vi.fn() }));
vi.mock("react-dom/client", () => ({
  createRoot: () => ({ render: vi.fn() }),
}));
vi.mock("./lib", () => ({
  configured: true,
  ordered: (s: unknown) => s,
  createCsv: backend.csv,
  surveyById: vi.fn(),
  db: { rpc: backend.rpc },
}));
vi.mock("recharts", () => {
  const Box = ({ children }: { children?: React.ReactNode }) => (
    <div>{children}</div>
  );
  return {
    Bar: Box,
    BarChart: Box,
    CartesianGrid: Box,
    ResponsiveContainer: Box,
    Tooltip: Box,
    XAxis: Box,
    YAxis: Box,
  };
});
import { Results } from "./main";
const survey = {
  id: "survey-a",
  title: "Test results A",
  status: "closed",
  questions: [
    {
      id: "q1",
      question_text: "Ready?",
      choices: [
        { id: "yes", choice_text: "Yes" },
        { id: "no", choice_text: "No" },
      ],
    },
  ],
};
const response = (id: string, choice: string) => ({
  id,
  submitted_at: "2026-01-01",
  answers: [{ question_id: "q1", choice_id: choice }],
});
const snapshot = (responses: ReturnType<typeof response>[]) => ({
  survey,
  responses,
});
function showResults() {
  render(
    <MemoryRouter initialEntries={["/surveys/survey-a/results"]}>
      <Routes>
        <Route path="/surveys/:id/results" element={<Results />} />
      </Routes>
    </MemoryRouter>,
  );
}
beforeEach(() => {
  backend.rpc.mockResolvedValue({ data: snapshot([]), error: null });
  backend.csv.mockReturnValue("csv");
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});
describe("results page", () => {
  it("renders zero responses and zero percentages without invalid numbers", async () => {
    showResults();
    expect(await screen.findByText("0 responses")).toBeTruthy();
    expect(screen.getByText(/No responses yet/)).toBeTruthy();
    expect(screen.getAllByText(/0 · 0%/)).toHaveLength(2);
    expect(screen.queryByText(/NaN|Infinity/)).toBeNull();
    expect(backend.rpc).toHaveBeenCalledWith("get_survey_results", {
      p_survey_id: "survey-a",
    });
  });
  it("shows counts and percentages from the same loaded snapshot", async () => {
    backend.rpc.mockResolvedValue({
      data: snapshot([
        response("a", "yes"),
        response("b", "yes"),
        response("c", "no"),
      ]),
      error: null,
    });
    showResults();
    await screen.findByText("3 responses");
    expect(screen.getByText("2 · 66.7%")).toBeTruthy();
    expect(screen.getByText("1 · 33.3%")).toBeTruthy();
  });
  it("refreshes counts and clears a previous load error after recovery", async () => {
    backend.rpc
      .mockResolvedValueOnce({
        data: null,
        error: new Error("temporary failure"),
      })
      .mockResolvedValueOnce({
        data: snapshot([response("a", "yes")]),
        error: null,
      });
    showResults();
    expect(await screen.findByRole("alert")).toBeTruthy();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("1 response")).toBeTruthy();
    expect(screen.queryByRole("alert")).toBeNull();
  });
  it("does not replace the current survey with a late response from the previous route", async () => {
    let first!: (value: unknown) => void;
    backend.rpc
      .mockReturnValueOnce(
        new Promise((resolve) => {
          first = resolve;
        }),
      )
      .mockResolvedValueOnce({
        data: {
          survey: { ...survey, id: "survey-b", title: "Test results B" },
          responses: [],
        },
        error: null,
      });
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/surveys/survey-a/results"]}>
        <Link to="/surveys/survey-b/results">Results B</Link>
        <Routes>
          <Route path="/surveys/:id/results" element={<Results />} />
        </Routes>
      </MemoryRouter>,
    );
    await user.click(screen.getByText("Results B"));
    expect(
      await screen.findByRole("heading", { name: "Test results B" }),
    ).toBeTruthy();
    await act(async () => {
      first({ data: snapshot([]), error: null });
    });
    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: "Test results B" }),
      ).toBeTruthy(),
    );
    expect(
      screen.queryByRole("heading", { name: "Test results A" }),
    ).toBeNull();
  });
  it("does not show the previous survey after the next survey fails to load", async () => {
    backend.rpc
      .mockResolvedValueOnce({
        data: snapshot([response("a", "yes")]),
        error: null,
      })
      .mockResolvedValueOnce({ data: null, error: new Error("load failed") });
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/surveys/survey-a/results"]}>
        <Link to="/surveys/survey-b/results">Results B</Link>
        <Routes>
          <Route path="/surveys/:id/results" element={<Results />} />
        </Routes>
      </MemoryRouter>,
    );
    await screen.findByRole("heading", { name: "Test results A" });
    await user.click(screen.getByText("Results B"));
    expect((await screen.findByRole("alert")).textContent).toMatch(
      /load failed/,
    );
    expect(
      screen.queryByRole("heading", { name: "Test results A" }),
    ).toBeNull();
    expect(screen.queryByRole("button", { name: "Export CSV" })).toBeNull();
  });
  it("keeps exports aligned with the loaded results before and after refresh", async () => {
    const initial = snapshot([response("a", "yes")]);
    const refreshed = snapshot([response("a", "yes"), response("b", "no")]);
    backend.rpc
      .mockResolvedValueOnce({ data: initial, error: null })
      .mockResolvedValueOnce({ data: refreshed, error: null });
    vi.stubGlobal("URL", {
      ...URL,
      createObjectURL: vi.fn(() => "blob:test"),
      revokeObjectURL: vi.fn(),
    });
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    const user = userEvent.setup();
    showResults();
    await screen.findByText("1 response");
    await user.click(screen.getByRole("button", { name: "Export CSV" }));
    expect(backend.csv).toHaveBeenLastCalledWith(
      initial.survey,
      initial.responses,
    );
    await user.click(screen.getByRole("button", { name: "Refresh" }));
    await screen.findByText("2 responses");
    await user.click(screen.getByRole("button", { name: "Export CSV" }));
    expect(backend.csv).toHaveBeenLastCalledWith(
      refreshed.survey,
      refreshed.responses,
    );
    expect(backend.csv).toHaveBeenCalledTimes(2);
    vi.unstubAllGlobals();
  });
  it("clears a failed refresh after the next refresh succeeds", async () => {
    backend.rpc
      .mockResolvedValueOnce({
        data: snapshot([response("a", "yes")]),
        error: null,
      })
      .mockResolvedValueOnce({ data: null, error: new Error("refresh failed") })
      .mockResolvedValueOnce({
        data: snapshot([response("a", "yes"), response("b", "no")]),
        error: null,
      });
    const user = userEvent.setup();
    showResults();
    await screen.findByText("1 response");
    await user.click(screen.getByRole("button", { name: "Refresh" }));
    expect((await screen.findByRole("alert")).textContent).toMatch(
      /refresh failed/,
    );
    await user.click(screen.getByRole("button", { name: "Refresh" }));
    await screen.findByText("2 responses");
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
