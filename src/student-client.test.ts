import { afterEach, describe, expect, it, vi } from "vitest";
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.resetModules();
});
describe("anonymous student client", () => {
  it("can make a student request when the instructor session lookup fails", async () => {
    const fetchStub = vi.fn().mockResolvedValue(
      new Response(JSON.stringify([{ id: "s", title: "Survey" }]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchStub);
    const { db, studentDb } = await import("./lib");
    const instructorSession = vi
      .spyOn(db.auth, "getSession")
      .mockRejectedValue(new Error("session unavailable"));
    const { data, error } = await studentDb.from("surveys").select("id,title");
    expect(error).toBeNull();
    expect(data).toEqual([{ id: "s", title: "Survey" }]);
    expect(fetchStub).toHaveBeenCalledTimes(1);
    expect(instructorSession).not.toHaveBeenCalled();
  });
  it("never attaches the instructor's session token to student requests", async () => {
    const fetchStub = vi
      .fn()
      .mockResolvedValue(
        new Response("[]", {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );
    vi.stubGlobal("fetch", fetchStub);
    const { db, studentDb } = await import("./lib");
    const instructorSession = vi
      .spyOn(db.auth, "getSession")
      .mockResolvedValue({
        data: { session: { access_token: "instructor-token" } },
        error: null,
      } as never);
    const { error } = await studentDb.from("surveys").select("id");
    expect(error).toBeNull();
    const headers = new Headers(fetchStub.mock.calls[0][1].headers);
    expect(headers.get("apikey")).toBeTruthy();
    expect(headers.get("authorization") || "").not.toContain(
      "instructor-token",
    );
    expect(instructorSession).not.toHaveBeenCalled();
  });
});
