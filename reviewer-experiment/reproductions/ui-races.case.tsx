// @vitest-environment jsdom
// Audit reproductions: these assertions demonstrate defects in commit 087baec.
// They are not acceptance tests for the intended behavior. See README.md.
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";

const backend = vi.hoisted(() => ({
  load: vi.fn(), rpc: vi.fn(), survey: vi.fn(), count: vi.fn(), qr: vi.fn(),
}));
vi.mock("react-dom/client", () => ({ createRoot: () => ({ render: vi.fn() }) }));
vi.mock("qrcode", () => ({ default: { toDataURL: backend.qr } }));
vi.mock("../../src/lib", () => ({
  configured: true,
  ordered: (s: unknown) => s,
  createCsv: vi.fn(),
  surveyById: backend.survey,
  studentDb: {
    rpc: backend.rpc,
    from: () => ({ select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: backend.load }) }) }) }),
  },
  db: { from: () => ({ select: () => ({ eq: backend.count }) }) },
}));
import { Present, StudentRoute } from "../../src/main";

const survey = {
  id: "survey-a", title: "Audit-only survey", status: "active", public_slug: "a",
  questions: [{ id: "q", question_text: "Choose", choices: [
    { id: "a", choice_text: "Answer A" }, { id: "b", choice_text: "Answer B" },
  ] }],
};
beforeEach(() => {
  localStorage.clear();
  backend.load.mockResolvedValue({ data: survey, error: null });
  backend.survey.mockResolvedValue(survey);
  backend.qr.mockResolvedValue("data:image/png;base64,TEST");
  backend.count.mockResolvedValue({ count: 1, error: null });
});
afterEach(() => {
  cleanup(); vi.restoreAllMocks(); vi.resetAllMocks(); vi.useRealTimers();
});

it("reproduces changing the visible selection after the submitted payload is fixed", async () => {
  let finish!: (value: unknown) => void;
  backend.rpc.mockReturnValue(new Promise((resolve) => { finish = resolve; }));
  const user = userEvent.setup();
  render(<MemoryRouter initialEntries={["/s/a"]}><Routes>
    <Route path="/s/:slug" element={<StudentRoute />} />
  </Routes></MemoryRouter>);
  await user.click(await screen.findByLabelText("Answer A"));
  await user.click(screen.getByRole("button", { name: /submit response/i }));
  expect((screen.getByRole("button", { name: /submitting/i }) as HTMLButtonElement).disabled).toBe(true);
  await user.click(screen.getByLabelText("Answer B"));
  expect((screen.getByLabelText("Answer B") as HTMLInputElement).checked).toBe(true);
  expect(backend.rpc).toHaveBeenCalledTimes(1);
  expect(backend.rpc.mock.calls[0][1].p_answers).toEqual([{ question_id: "q", choice_id: "a" }]);
  await act(async () => { finish({ data: "response-a", error: null }); });
  expect(screen.getByRole("heading", { name: "Thank you!" })).toBeTruthy();
});

it("reproduces a count-only failure hiding the valid QR and instructor controls", async () => {
  vi.useFakeTimers();
  backend.count
    .mockResolvedValueOnce({ count: 1, error: null })
    .mockResolvedValueOnce({ count: null, error: { message: "count transport failed" } })
    .mockResolvedValueOnce({ count: 2, error: null });
  render(<MemoryRouter initialEntries={["/surveys/survey-a/present"]}><Routes>
    <Route path="/surveys/:id/present" element={<Present />} />
  </Routes></MemoryRouter>);
  await act(async () => {});
  expect(screen.getByRole("img", { name: /QR code linking/i })).toBeTruthy();
  expect(screen.getByRole("button", { name: "Close survey" })).toBeTruthy();
  await act(async () => { await vi.advanceTimersByTimeAsync(10000); });
  expect(screen.getByRole("alert")).toBeTruthy();
  expect(screen.queryByRole("img", { name: /QR code linking/i })).toBeNull();
  expect(screen.queryByRole("button", { name: "Close survey" })).toBeNull();
  expect(screen.queryByRole("link", { name: "View results" })).toBeNull();
  expect(backend.qr).toHaveBeenCalledTimes(2);
  await act(async () => { await vi.advanceTimersByTimeAsync(10000); });
  expect(screen.getByRole("img", { name: /QR code linking/i })).toBeTruthy();
  expect(screen.getByText("2")).toBeTruthy();
});
