// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Link, MemoryRouter, Route, Routes } from "react-router-dom";
const backend = vi.hoisted(() => ({
  survey: vi.fn(),
  count: vi.fn(),
  close: vi.fn(),
  closeId: vi.fn(),
  closeStatus: vi.fn(),
  qr: vi.fn(),
}));
vi.mock("react-dom/client", () => ({
  createRoot: () => ({ render: vi.fn() }),
}));
vi.mock("qrcode", () => ({ default: { toDataURL: backend.qr } }));
vi.mock("./lib", () => ({
  configured: true,
  ordered: (s: unknown) => s,
  createCsv: vi.fn(),
  surveyById: backend.survey,
  db: {
    from: (table: string) =>
      table === "responses"
        ? { select: () => ({ eq: backend.count }) }
        : { update: () => ({ eq: backend.closeId }) },
  },
}));
import { Present } from "./main";
const survey = {
  id: "a",
  title: "Live survey",
  status: "active",
  public_slug: "a",
};
function show() {
  render(
    <MemoryRouter initialEntries={["/surveys/a/present"]}>
      <Routes>
        <Route path="/surveys/:id/present" element={<Present />} />
        <Route path="/dashboard" element={<h1>Dashboard destination</h1>} />
      </Routes>
    </MemoryRouter>,
  );
}
beforeEach(() => {
  backend.survey.mockResolvedValue(survey);
  backend.qr.mockResolvedValue("data:image/png;base64,TEST");
  backend.count.mockResolvedValue({ count: 3, error: null });
  backend.closeId.mockReturnValue({ eq: backend.closeStatus });
  backend.closeStatus.mockReturnValue({
    select: () => ({ maybeSingle: backend.close }),
  });
  backend.close.mockResolvedValue({ data: { id: "a" }, error: null });
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.clearAllMocks();
  vi.useRealTimers();
});
describe("survey presentation", () => {
  it("shows the active title, generated link, QR and response count", async () => {
    show();
    expect(
      await screen.findByRole("heading", { name: "Live survey" }),
    ).toBeTruthy();
    expect(await screen.findByText("3")).toBeTruthy();
    expect(
      screen.getByRole("img", { name: /QR code linking/i }).getAttribute("src"),
    ).toBe("data:image/png;base64,TEST");
    expect(backend.qr).toHaveBeenCalledWith(
      expect.stringContaining("#/s/a"),
      expect.any(Object),
    );
  });
  it("does not close when confirmation is cancelled", async () => {
    const user = userEvent.setup();
    vi.spyOn(window, "confirm").mockReturnValue(false);
    show();
    await screen.findByText("3");
    await user.click(screen.getByRole("button", { name: "Close survey" }));
    expect(backend.close).not.toHaveBeenCalled();
  });
  it("recovers polling after a transient failure", async () => {
    vi.useFakeTimers();
    backend.survey
      .mockRejectedValueOnce(new Error("network unavailable"))
      .mockResolvedValueOnce(survey);
    show();
    await act(async () => {});
    expect(screen.getByRole("alert").textContent).toMatch(
      /network unavailable/,
    );
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10000);
    });
    expect(screen.getByRole("heading", { name: "Live survey" })).toBeTruthy();
    expect(screen.queryByRole("alert")).toBeNull();
  });
  it("does not start overlapping polls while a slow request is pending", async () => {
    vi.useFakeTimers();
    let finish!: (v: unknown) => void;
    backend.count.mockReturnValueOnce(
      new Promise((r) => {
        finish = r;
      }),
    );
    show();
    await act(async () => {});
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30000);
    });
    expect(backend.survey).toHaveBeenCalledTimes(1);
    await act(async () => {
      finish({ count: 4, error: null });
    });
    expect(screen.getByText("4")).toBeTruthy();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10000);
    });
    expect(backend.survey).toHaveBeenCalledTimes(2);
  });
  it("reports a rejected close request instead of failing silently", async () => {
    const user = userEvent.setup();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    backend.close.mockRejectedValueOnce(new Error("close failed"));
    show();
    await screen.findByText("3");
    await user.click(screen.getByRole("button", { name: "Close survey" }));
    expect((await screen.findByRole("alert")).textContent).toMatch(
      /close failed/,
    );
    expect(
      screen.queryByRole("heading", { name: "Dashboard destination" }),
    ).toBeNull();
  });
  it("prevents a second close request while the first is pending", async () => {
    let finish!: (result: unknown) => void;
    backend.close.mockReturnValueOnce(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const user = userEvent.setup();
    show();
    await screen.findByText("3");
    await user.click(screen.getByRole("button", { name: "Close survey" }));
    expect(
      (screen.getByRole("button", { name: "Closing…" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    await user.click(screen.getByRole("button", { name: "Closing…" }));
    expect(backend.close).toHaveBeenCalledTimes(1);
    expect(backend.closeId).toHaveBeenCalledWith("id", "a");
    expect(backend.closeStatus).toHaveBeenCalledWith("status", "active");
    await act(async () => {
      finish({ data: { id: "a" }, error: null });
    });
    expect(
      await screen.findByRole("heading", { name: "Dashboard destination" }),
    ).toBeTruthy();
  });
  it("does not claim success when the close update affects no active survey", async () => {
    backend.close.mockResolvedValueOnce({ data: null, error: null });
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const user = userEvent.setup();
    show();
    await screen.findByText("3");
    await user.click(screen.getByRole("button", { name: "Close survey" }));
    expect((await screen.findByRole("alert")).textContent).toMatch(
      /could not be closed/i,
    );
    expect(
      screen.queryByRole("heading", { name: "Dashboard destination" }),
    ).toBeNull();
    expect(screen.getByRole("button", { name: "Close survey" })).toBeTruthy();
  });
  it("does not navigate away after a late close on a previous survey", async () => {
    let finish!: (v: unknown) => void;
    backend.close.mockReturnValueOnce(
      new Promise((r) => {
        finish = r;
      }),
    );
    backend.survey.mockResolvedValueOnce(survey).mockResolvedValueOnce({
      ...survey,
      id: "b",
      title: "Survey B",
      public_slug: "b",
    });
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/surveys/a/present"]}>
        <Link to="/surveys/b/present">Open B</Link>
        <Routes>
          <Route path="/surveys/:id/present" element={<Present />} />
          <Route path="/dashboard" element={<h1>Dashboard destination</h1>} />
        </Routes>
      </MemoryRouter>,
    );
    await screen.findByText("3");
    await user.click(screen.getByRole("button", { name: "Close survey" }));
    await user.click(screen.getByText("Open B"));
    await screen.findByRole("heading", { name: "Survey B" });
    await act(async () => {
      finish({ data: { id: "a" }, error: null });
    });
    expect(screen.getByRole("heading", { name: "Survey B" })).toBeTruthy();
    expect(
      screen.queryByRole("heading", { name: "Dashboard destination" }),
    ).toBeNull();
  });
  it("does not let a successful poll clear a close error", async () => {
    vi.useFakeTimers();
    let finishPoll!: (v: unknown) => void;
    backend.count
      .mockResolvedValueOnce({ count: 3, error: null })
      .mockReturnValueOnce(
        new Promise((r) => {
          finishPoll = r;
        }),
      );
    backend.close.mockRejectedValueOnce(new Error("close failed"));
    vi.spyOn(window, "confirm").mockReturnValue(true);
    show();
    await act(async () => {});
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10000);
    });
    await act(async () => {
      screen.getByRole("button", { name: "Close survey" }).click();
    });
    expect(screen.getByRole("alert").textContent).toMatch(/close failed/);
    await act(async () => {
      finishPoll({ count: 3, error: null });
    });
    expect(screen.getByRole("alert").textContent).toMatch(/close failed/);
  });
  it("hides the old QR while the next presentation is loading", async () => {
    let finish!: (v: unknown) => void;
    backend.survey.mockResolvedValueOnce(survey).mockReturnValueOnce(
      new Promise((r) => {
        finish = r;
      }),
    );
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/surveys/a/present"]}>
        <Link to="/surveys/b/present">Open B</Link>
        <Routes>
          <Route path="/surveys/:id/present" element={<Present />} />
        </Routes>
      </MemoryRouter>,
    );
    await screen.findByText("3");
    await user.click(screen.getByText("Open B"));
    expect(screen.queryByRole("heading", { name: "Live survey" })).toBeNull();
    expect(screen.queryByRole("img", { name: /QR code/i })).toBeNull();
    expect(screen.queryByRole("button", { name: "Close survey" })).toBeNull();
    await act(async () => {
      finish({ ...survey, id: "b", title: "Survey B", public_slug: "b" });
    });
    expect(
      await screen.findByRole("heading", { name: "Survey B" }),
    ).toBeTruthy();
  });
  it("does not show zero while the first response count is still loading", async () => {
    let finish!: (v: unknown) => void;
    backend.count.mockReturnValueOnce(
      new Promise((r) => {
        finish = r;
      }),
    );
    show();
    await screen.findByRole("heading", { name: "Live survey" });
    expect(screen.getByText("Loading responses…")).toBeTruthy();
    expect(screen.queryByText("0")).toBeNull();
    await act(async () => {
      finish({ count: 7, error: null });
    });
    expect(await screen.findByText("7")).toBeTruthy();
  });
  it("does not present a missing count as zero", async () => {
    backend.count.mockResolvedValueOnce({ count: null, error: null });
    show();
    expect((await screen.findByRole("alert")).textContent).toMatch(
      /unable to load response count/i,
    );
    expect(screen.queryByText("0")).toBeNull();
  });
});
