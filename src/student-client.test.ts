import { afterEach, describe, expect, it, vi } from "vitest";
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.resetModules();
  vi.useRealTimers();
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
    const fetchStub = vi.fn().mockResolvedValue(
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
  it("sends survey and answer details to the submission RPC with anonymous credentials", async () => {
    const fetchStub = vi.fn().mockResolvedValue(
      new Response(JSON.stringify("response-id"), {
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
    const args = {
      p_survey_id: "survey-id",
      p_anonymous_token: "test-token-12345678",
      p_answers: [{ question_id: "q", choice_id: "c" }],
    };
    const { data, error } = await studentDb.rpc("submit_survey_response", args);
    expect(error).toBeNull();
    expect(data).toBe("response-id");
    const [url, request] = fetchStub.mock.calls[0];
    expect(String(url)).toContain("/rest/v1/rpc/submit_survey_response");
    expect(request.method).toBe("POST");
    expect(JSON.parse(request.body)).toEqual(args);
    const headers = new Headers(request.headers);
    expect(headers.get("apikey")).toBeTruthy();
    expect(headers.get("authorization") || "").not.toContain(
      "instructor-token",
    );
    expect(instructorSession).not.toHaveBeenCalled();
  });
  it("preserves database duplicate error codes for friendly UI handling", async () => {
    const fetchStub = vi
      .fn()
      .mockResolvedValue(
        new Response(
          JSON.stringify({ code: "P0001", message: "DUPLICATE_RESPONSE" }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        ),
      );
    vi.stubGlobal("fetch", fetchStub);
    const { studentDb } = await import("./lib");
    const { data, error } = await studentDb.rpc("submit_survey_response", {
      p_survey_id: "s",
      p_anonymous_token: "test-token-12345678",
      p_answers: [],
    });
    expect(data).toBeNull();
    expect(error?.message).toBe("DUPLICATE_RESPONSE");
    expect(error?.code).toBe("P0001");
  });
  it("converts a network failure into a returned error instead of success", async () => {
    const fetchStub = vi
      .fn()
      .mockRejectedValue(new TypeError("network unavailable"));
    vi.stubGlobal("fetch", fetchStub);
    const { studentDb } = await import("./lib");
    vi.useFakeTimers();
    const request = Promise.resolve(studentDb.from("surveys").select("id"));
    await vi.runAllTimersAsync();
    const { data, error } = await request;
    expect(data).toBeNull();
    expect(error?.message).toMatch(/network unavailable/);
    expect(fetchStub).toHaveBeenCalled();
  });
});
