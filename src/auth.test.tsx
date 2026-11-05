// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
const backend = vi.hoisted(() => ({
  session: vi.fn(),
  signIn: vi.fn(),
  unsubscribe: vi.fn(),
  onAuth: vi.fn(),
  load: vi.fn(),
}));
vi.mock("react-dom/client", () => ({
  createRoot: () => ({ render: vi.fn() }),
}));
vi.mock("./lib", () => ({
  configured: true,
  ordered: (s: unknown) => s,
  createCsv: vi.fn(),
  surveyById: vi.fn(),
  studentDb: {
    from: () => ({
      select: () => ({
        eq: () => ({ eq: () => ({ maybeSingle: backend.load }) }),
      }),
    }),
  },
  db: {
    auth: {
      getSession: backend.session,
      signInWithPassword: backend.signIn,
      onAuthStateChange: backend.onAuth,
    },
  },
}));
import { App, Login } from "./main";
beforeEach(() => {
  backend.session.mockResolvedValue({ data: { session: null }, error: null });
  backend.onAuth.mockReturnValue({
    data: { subscription: { unsubscribe: backend.unsubscribe } },
  });
  backend.load.mockResolvedValue({
    data: { id: "public", title: "Public survey", questions: [] },
    error: null,
  });
  backend.signIn.mockResolvedValue({ data: {}, error: null });
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});
function renderLogin() {
  render(
    <MemoryRouter initialEntries={["/login"]}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<h1>Dashboard destination</h1>} />
      </Routes>
    </MemoryRouter>,
  );
}
async function fillCredentials(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("Email"), "test@example.com");
  await user.type(screen.getByLabelText("Password"), "test-password");
}
describe("instructor authentication", () => {
  it("redirects a signed-out visitor from dashboard to sign-in", async () => {
    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <App />
      </MemoryRouter>,
    );
    expect(
      await screen.findByRole("heading", { name: "Welcome back." }),
    ).toBeTruthy();
  });
  it("shows a generic error for invalid credentials and allows retry", async () => {
    backend.signIn.mockResolvedValueOnce({
      error: { message: "internal auth details" },
    });
    const user = userEvent.setup();
    renderLogin();
    await fillCredentials(user);
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    expect((await screen.findByRole("alert")).textContent).toMatch(
      /unable to sign in/i,
    );
    expect(screen.queryByText(/internal auth details/i)).toBeNull();
    expect(
      (screen.getByRole("button", { name: "Sign in" }) as HTMLButtonElement)
        .disabled,
    ).toBe(false);
  });
  it("navigates to dashboard after successful sign-in", async () => {
    const user = userEvent.setup();
    renderLogin();
    await fillCredentials(user);
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    expect(
      await screen.findByRole("heading", { name: "Dashboard destination" }),
    ).toBeTruthy();
    expect(backend.signIn).toHaveBeenCalledWith({
      email: "test@example.com",
      password: "test-password",
    });
  });
  it("prevents repeated sign-in attempts while a request is pending", async () => {
    let finish!: (result: unknown) => void;
    backend.signIn.mockReturnValueOnce(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    const user = userEvent.setup();
    renderLogin();
    await fillCredentials(user);
    const button = screen.getByRole("button", { name: "Sign in" });
    await user.click(button);
    expect((button as HTMLButtonElement).disabled).toBe(true);
    await user.click(button);
    expect(backend.signIn).toHaveBeenCalledTimes(1);
    await act(async () => {
      finish({ data: {}, error: null });
    });
    expect(
      await screen.findByRole("heading", { name: "Dashboard destination" }),
    ).toBeTruthy();
  });
  it("recovers if the sign-in request rejects", async () => {
    backend.signIn.mockRejectedValueOnce(new Error("network failed"));
    const user = userEvent.setup();
    renderLogin();
    await fillCredentials(user);
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    expect((await screen.findByRole("alert")).textContent).toMatch(
      /unable to sign in/i,
    );
    expect(
      (screen.getByRole("button", { name: "Sign in" }) as HTMLButtonElement)
        .disabled,
    ).toBe(false);
  });
  it("does not remain loading when session lookup rejects", async () => {
    backend.session.mockRejectedValueOnce(new Error("network failed"));
    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <App />
      </MemoryRouter>,
    );
    expect(
      await screen.findByText(/unable to check your session/i),
    ).toBeTruthy();
  });
  it("offers retry when session lookup returns an error", async () => {
    backend.session
      .mockResolvedValueOnce({
        data: { session: null },
        error: new Error("storage failed"),
      })
      .mockResolvedValueOnce({ data: { session: null }, error: null });
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <App />
      </MemoryRouter>,
    );
    expect(await screen.findByRole("alert")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(
      await screen.findByRole("heading", { name: "Welcome back." }),
    ).toBeTruthy();
    expect(backend.session).toHaveBeenCalledTimes(2);
  });
  it("lets students open a public survey even if session lookup fails", async () => {
    backend.session.mockRejectedValueOnce(new Error("auth unavailable"));
    render(
      <MemoryRouter initialEntries={["/s/public"]}>
        <App />
      </MemoryRouter>,
    );
    expect(
      await screen.findByRole("heading", { name: "Public survey" }),
    ).toBeTruthy();
    expect(screen.queryByText(/unable to check your session/i)).toBeNull();
  });
  it("does not hide a session error when the initial auth event is null", async () => {
    let reject!: (reason: unknown) => void;
    backend.session.mockReturnValueOnce(
      new Promise((_, r) => {
        reject = r;
      }),
    );
    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <App />
      </MemoryRouter>,
    );
    await waitFor(() => expect(backend.session).toHaveBeenCalled());
    const callback = backend.onAuth.mock.calls[0][0];
    await act(async () => {
      callback("INITIAL_SESSION", null);
      reject(new Error("failed"));
    });
    expect(
      await screen.findByText(/unable to check your session/i),
    ).toBeTruthy();
  });
  it("does not restore an old session after a newer sign-out event", async () => {
    let resolve!: (result: unknown) => void;
    backend.session.mockReturnValueOnce(
      new Promise((r) => {
        resolve = r;
      }),
    );
    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <App />
      </MemoryRouter>,
    );
    await waitFor(() => expect(backend.session).toHaveBeenCalled());
    const callback = backend.onAuth.mock.calls[0][0];
    await act(async () => {
      callback("SIGNED_OUT", null);
    });
    expect(
      await screen.findByRole("heading", { name: "Welcome back." }),
    ).toBeTruthy();
    await act(async () => {
      resolve({
        data: { session: { user: { email: "old@example.com" } } },
        error: null,
      });
    });
    expect(screen.getByRole("heading", { name: "Welcome back." })).toBeTruthy();
  });
  it("opens the public route case-insensitively if auth fails", async () => {
    backend.session.mockRejectedValueOnce(new Error("auth unavailable"));
    render(
      <MemoryRouter initialEntries={["/S/public"]}>
        <App />
      </MemoryRouter>,
    );
    expect(
      await screen.findByRole("heading", { name: "Public survey" }),
    ).toBeTruthy();
  });
});
