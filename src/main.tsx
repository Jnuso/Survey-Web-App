import React, { Suspense, lazy, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  HashRouter,
  Link,
  Navigate,
  Route,
  Routes,
  useNavigate,
  useParams,
  useMatch,
} from "react-router-dom";
import type { Session } from "@supabase/supabase-js";
import {
  configured,
  createCsv,
  db,
  ordered,
  surveyById,
  studentDb,
  type Response,
  type Survey,
} from "./lib";
import "./style.css";
const ResultsChart = lazy(() => import("./ResultsChart"));

const message = (e: unknown) =>
  e instanceof Error
    ? e.message
    : typeof e === "object" && e !== null && "message" in e
      ? String(e.message)
      : "Something went wrong. Please try again.";
export function App() {
  const studentRoute = useMatch("/s/:slug");
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(false);
  const [authAttempt, setAuthAttempt] = useState(0);
  useEffect(() => {
    let current = true;
    let authChanged = false;
    setLoading(true);
    setAuthError(false);
    Promise.resolve()
      .then(() => db.auth.getSession())
      .then(({ data, error }) => {
        if (error) throw error;
        if (current && !authChanged) setSession(data.session);
      })
      .catch(() => {
        if (current && !authChanged) setAuthError(true);
      })
      .finally(() => {
        if (current && !authChanged) setLoading(false);
      });
    const { data } = db.auth.onAuthStateChange((event, s) => {
      if (event === "INITIAL_SESSION") return;
      authChanged = true;
      if (current) {
        setSession(s);
        setAuthError(false);
        setLoading(false);
      }
    });
    return () => {
      current = false;
      data.subscription.unsubscribe();
    };
  }, [authAttempt]);
  if (!configured)
    return (
      <main className="center">
        <div className="panel">
          <p className="eyebrow">Setup required</p>
          <h1>Connect your database</h1>
          <p>
            Copy <code>.env.example</code> to <code>.env</code> and add your
            Supabase project URL and publishable key. See the README for setup
            instructions.
          </p>
        </div>
      </main>
    );
  if (studentRoute)
    return (
      <Routes>
        <Route path="/s/:slug" element={<StudentRoute />} />
      </Routes>
    );
  if (loading) return <main className="center">Loading…</main>;
  if (authError)
    return (
      <main className="center">
        <div className="panel">
          <p role="alert">Unable to check your session. Please try again.</p>
          <button onClick={() => setAuthAttempt((n) => n + 1)}>
            Try again
          </button>
        </div>
      </main>
    );
  const guard = (component: React.ReactNode) =>
    session ? component : <Navigate to="/login" replace />;
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route
        path="/login"
        element={session ? <Navigate to="/dashboard" replace /> : <Login />}
      />
      <Route
        path="/dashboard"
        element={guard(<Dashboard email={session?.user.email || ""} />)}
      />
      <Route path="/surveys/new" element={guard(<Editor />)} />
      <Route path="/surveys/:id/edit" element={guard(<Editor />)} />
      <Route path="/surveys/:id/present" element={guard(<Present />)} />
      <Route path="/surveys/:id/results" element={guard(<Results />)} />
      <Route path="/s/:slug" element={<StudentRoute />} />
      <Route
        path="*"
        element={
          <main className="center">
            <h1>Page not found</h1>
            <Link to="/">Go home</Link>
          </main>
        }
      />
    </Routes>
  );
}
function Header() {
  return (
    <header>
      <Link to="/dashboard" className="brand">
        <span>✳</span> Classroom Survey
      </Link>
      <Link to="/dashboard">Dashboard</Link>
    </header>
  );
}
function Landing() {
  return (
    <main className="center">
      <div className="hero">
        <p className="eyebrow">A clearer view of your classroom</p>
        <h1>Make space for every answer.</h1>
        <p>
          Simple, anonymous check-ins that help you understand where your
          students are.
        </p>
        <Link className="button" to="/login">
          Instructor sign in <span>→</span>
        </Link>
      </div>
    </main>
  );
}
export function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const nav = useNavigate();
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const { error } = await db.auth.signInWithPassword({ email, password });
      if (error) setError("Unable to sign in. Check your email and password.");
      else nav("/dashboard");
    } catch {
      setError("Unable to sign in. Check your email and password.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="center">
      <form className="panel login" onSubmit={submit}>
        <Link to="/" className="brand">
          ✳ Classroom Survey
        </Link>
        <h1>Welcome back.</h1>
        <p>Sign in to manage your surveys.</p>
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </label>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <button disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
      </form>
    </main>
  );
}
export function Dashboard({ email }: { email: string }) {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [throughDate, setThroughDate] = useState("");
  const [status, setStatus] = useState("all");
  const [loadFailed, setLoadFailed] = useState(false);
  const loadVersion = useRef(0);
  const actionVersion = useRef(0);
  const nav = useNavigate();
  async function load() {
    const version = ++loadVersion.current;
    setLoading(true);
    try {
      const { data, error } = await db
        .from("surveys")
        .select("*")
        .order("created_at", { ascending: false });
      if (version !== loadVersion.current) return;
      if (error) throw error;
      setSurveys(data as Survey[]);
      setLoadFailed(false);
      setError("");
    } catch (e) {
      if (version === loadVersion.current) {
        setError(message(e));
        setLoadFailed(true);
      }
    } finally {
      if (version === loadVersion.current) setLoading(false);
    }
  }
  useEffect(() => {
    void load();
    return () => {
      loadVersion.current++;
      actionVersion.current++;
    };
  }, []);
  async function action(s: Survey, kind: string) {
    if (
      ["delete", "archive", "close"].includes(kind) &&
      !window.confirm(
        kind === "delete"
          ? `Permanently delete “${s.title}” and all its responses? Consider archiving instead.`
          : `${kind === "close" ? "Close" : "Archive"} “${s.title}”?`,
      )
    )
      return;
    const version = ++actionVersion.current;
    setBusy(s.id);
    setError("");
    try {
      if (kind === "duplicate") {
        const original = await surveyById(s.id);
        if (version !== actionVersion.current) return;
        if (!original) throw new Error("Survey not found");
        const { data, error } = await db.rpc("save_survey", {
          p_survey_id: null,
          p_title: `Copy of ${s.title}`,
          p_description: s.description,
          p_questions: original.questions?.map((q) => ({
            question_text: q.question_text,
            question_type: q.question_type,
            choices: q.choices.map((c) => c.choice_text),
          })),
        });
        if (version !== actionVersion.current) return;
        if (error) throw error;
        nav(`/surveys/${data}/edit`);
        return;
      }
      if (kind === "activate") {
        const { error } = await db.rpc("activate_survey", {
          p_survey_id: s.id,
        });
        if (version !== actionVersion.current) return;
        if (error) throw error;
        nav(`/surveys/${s.id}/present`);
        return;
      }
      const request =
        kind === "delete"
          ? db.from("surveys").delete()
          : db
              .from("surveys")
              .update({ status: kind === "close" ? "closed" : "archived" });
      const { data, error } = await request
        .eq("id", s.id)
        .eq("status", s.status)
        .select("id")
        .maybeSingle();
      if (version !== actionVersion.current) return;
      if (error) throw error;
      if (!data)
        throw new Error(
          "The survey could not be updated. Refresh and check its status and your access.",
        );
      await load();
    } catch (e) {
      if (version === actionVersion.current) setError(message(e));
    } finally {
      if (version === actionVersion.current) setBusy("");
    }
  }
  const visible = surveys.filter(
    (s) =>
      s.title.toLowerCase().includes(search.toLowerCase()) &&
      (status === "all" || s.status === status) &&
      (!fromDate ||
        new Date(s.created_at) >= new Date(`${fromDate}T00:00:00`)) &&
      (!throughDate ||
        new Date(s.created_at) <= new Date(`${throughDate}T23:59:59.999`)),
  );
  return (
    <>
      <Header />
      <main className="container">
        <div className="heading">
          <div>
            <p className="eyebrow">Instructor workspace</p>
            <h1>Your surveys</h1>
            <p>Signed in as {email}</p>
          </div>
          <div className="actions">
            <Link className="button" to="/surveys/new">
              + New survey
            </Link>
            <button
              className="secondary"
              onClick={() => void db.auth.signOut()}
            >
              Sign out
            </button>
          </div>
        </div>
        <div className="filters">
          <label>
            Created from
            <input
              type="date"
              value={fromDate}
              max={throughDate || undefined}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </label>
          <label>
            Created through
            <input
              type="date"
              value={throughDate}
              min={fromDate || undefined}
              onChange={(e) => setThroughDate(e.target.value)}
            />
          </label>
          <label className="search-filter">
            Search
            <input
              placeholder="Search surveys"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <label>
            Status
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="all">All statuses</option>
              {["draft", "active", "closed", "archived"].map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
            </select>
          </label>
        </div>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        {loading ? (
          <p>Loading surveys…</p>
        ) : loadFailed ? (
          <button className="secondary" onClick={() => void load()}>
            Try again
          </button>
        ) : visible.length === 0 ? (
          <div className="panel empty">
            <h2>
              {surveys.length
                ? "No surveys match your search."
                : "Your first survey starts here."}
            </h2>
            <p>Create a quick check-in for your class.</p>
            <Link to="/surveys/new">Create a survey →</Link>
          </div>
        ) : (
          <div className="survey-list">
            {visible.map((s) => (
              <article className="panel survey" key={s.id}>
                <div>
                  <span className={"badge " + s.status}>{s.status}</span>
                  <h2>{s.title}</h2>
                  <p>Created {new Date(s.created_at).toLocaleDateString()}</p>
                </div>
                <div className="actions">
                  {s.status === "draft" && (
                    <Link to={`/surveys/${s.id}/edit`}>Edit</Link>
                  )}
                  {s.status !== "draft" && (
                    <Link to={`/surveys/${s.id}/results`}>Results</Link>
                  )}
                  {s.status === "active" && (
                    <Link to={`/surveys/${s.id}/present`}>Present</Link>
                  )}
                  {s.status === "draft" && (
                    <button
                      disabled={!!busy}
                      onClick={() => void action(s, "activate")}
                    >
                      Activate
                    </button>
                  )}
                  {s.status === "active" && (
                    <button
                      className="secondary"
                      disabled={!!busy}
                      onClick={() => void action(s, "close")}
                    >
                      Close
                    </button>
                  )}
                  <button
                    className="text-button"
                    disabled={!!busy}
                    onClick={() => void action(s, "duplicate")}
                  >
                    Duplicate
                  </button>
                  {s.status !== "active" && s.status !== "archived" && (
                    <button
                      className="text-button"
                      disabled={!!busy}
                      onClick={() => void action(s, "archive")}
                    >
                      Archive
                    </button>
                  )}
                  <button
                    className="text-button danger"
                    disabled={!!busy}
                    onClick={() => void action(s, "delete")}
                  >
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
type DraftQuestion = {
  key: string;
  question_text: string;
  question_type: "multiple_choice" | "true_false";
  choices: string[];
};
const newQuestion = (): DraftQuestion => ({
  key: crypto.randomUUID(),
  question_text: "",
  question_type: "multiple_choice",
  choices: ["", ""],
});
export function Editor() {
  const { id } = useParams();
  const nav = useNavigate();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [questions, setQuestions] = useState<DraftQuestion[]>([newQuestion()]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(!!id);
  const [busy, setBusy] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const editorVersion = useRef(0);
  const [revision, setRevision] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [validate, setValidate] = useState(false);
  useEffect(() => {
    editorVersion.current++;
    setBusy(false);
    setLoadFailed(false);
    let current = true;
    setError("");
    setSavedId(null);
    setRevision(null);
    setValidate(false);
    if (!id) {
      setTitle("");
      setDescription("");
      setQuestions([newQuestion()]);
      setLoading(false);
      return () => {
        current = false;
        editorVersion.current++;
      };
    }
    setLoading(true);
    setTitle("");
    setDescription("");
    setQuestions([newQuestion()]);
    surveyById(id)
      .then((s) => {
        if (!current) return;
        if (!s) throw new Error("Survey not found");
        if (s.status !== "draft")
          throw new Error("Only draft surveys can be edited.");
        setRevision(s.updated_at || null);
        setTitle(s.title);
        setDescription(s.description || "");
        setQuestions(
          (s.questions || []).map((q) => ({
            key: q.id,
            question_text: q.question_text,
            question_type: q.question_type,
            choices: q.choices.map((c) => c.choice_text),
          })),
        );
      })
      .catch((e) => {
        if (current) {
          setError(message(e));
          setLoadFailed(true);
        }
      })
      .finally(() => {
        if (current) setLoading(false);
      });
    return () => {
      current = false;
      editorVersion.current++;
    };
  }, [id, loadAttempt]);
  function change(i: number, patch: Partial<DraftQuestion>) {
    setQuestions((q) => q.map((v, n) => (n === i ? { ...v, ...patch } : v)));
  }
  function move(i: number, j: number) {
    if (j < 0 || j >= questions.length) return;
    setQuestions((q) => {
      const copy = [...q];
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy;
    });
  }
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setValidate(true);
    const activate =
      (e.nativeEvent as SubmitEvent).submitter?.getAttribute("value") ===
      "activate";
    if (!title.trim()) {
      setError("Enter a survey title.");
      return;
    }
    if (
      !questions.length ||
      questions.some(
        (q) =>
          !q.question_text.trim() ||
          q.choices.length < 2 ||
          q.choices.some((c) => !c.trim()),
      )
    ) {
      setError(
        "Add at least one question and complete every question and choice.",
      );
      return;
    }
    const version = editorVersion.current;
    setBusy(true);
    setError("");
    try {
      const { data, error } = await db.rpc("save_survey_checked", {
        p_survey_id: savedId || id || null,
        p_expected_updated_at: revision,
        p_title: title.trim(),
        p_description: description.trim() || null,
        p_questions: questions.map((q) => ({
          question_text: q.question_text.trim(),
          question_type: q.question_type,
          choices: q.choices.map((c) => c.trim()),
        })),
      });
      if (version !== editorVersion.current) return;
      if (error) {
        setError(
          message(error).includes("DRAFT_CONFLICT")
            ? "This draft changed in another tab. Copy your edits before reloading; saving was stopped to protect newer changes."
            : message(error),
        );
      } else if (activate) {
        setSavedId(data as string);
        const saved = await surveyById(data as string);
        if (version !== editorVersion.current) return;
        setRevision(saved?.updated_at || null);
        const result = await db.rpc("activate_survey", { p_survey_id: data });
        if (version !== editorVersion.current) return;
        if (result.error)
          setError("Draft saved. Activation failed: " + message(result.error));
        else nav(`/surveys/${data}/present`);
      } else nav("/dashboard");
    } catch (e) {
      if (version === editorVersion.current) setError(message(e));
    } finally {
      if (version === editorVersion.current) setBusy(false);
    }
  }
  if (loading) return <main className="container">Loading survey…</main>;
  if (loadFailed)
    return (
      <>
        <Header />
        <main className="container narrow">
          <Link to="/dashboard">← Back to surveys</Link>
          <p role="alert" className="error">
            {error}
          </p>
          <button
            className="secondary"
            onClick={() => setLoadAttempt((n) => n + 1)}
          >
            Try again
          </button>
        </main>
      </>
    );
  return (
    <>
      <Header />
      <main className="container narrow">
        <Link to="/dashboard">← Back to surveys</Link>
        <div className="heading">
          <div>
            <p className="eyebrow">Survey editor</p>
            <h1>{id ? "Edit survey" : "Create a survey"}</h1>
            <p>Build a quick check-in for your students.</p>
          </div>
        </div>
        <form onSubmit={save} onInvalid={() => setValidate(true)}>
          <fieldset className="editor-fields" disabled={busy}>
            <section className="panel">
              <h2>The details</h2>
              <label>
                Survey title
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  maxLength={200}
                />
              </label>
              {validate && !title.trim() && (
                <p className="error">Enter a survey title.</p>
              )}
              <label>
                Description <span className="muted">(optional)</span>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </label>
            </section>
            {questions.map((q, i) => (
              <section
                className="panel question-editor"
                key={q.key}
                aria-labelledby={`question-heading-${q.key}`}
              >
                <div className="row">
                  <h2 id={`question-heading-${q.key}`}>Question {i + 1}</h2>
                  <div className="actions">
                    <button
                      type="button"
                      className="text-button"
                      aria-label={`Move question ${i + 1} up`}
                      onClick={() => move(i, i - 1)}
                      disabled={i === 0}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className="text-button"
                      aria-label={`Move question ${i + 1} down`}
                      onClick={() => move(i, i + 1)}
                      disabled={i === questions.length - 1}
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      className="text-button danger"
                      aria-label={`Delete question ${i + 1}`}
                      onClick={() => {
                        if (window.confirm("Delete this question?"))
                          setQuestions((v) => v.filter((_, n) => n !== i));
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
                <label>
                  Question
                  <input
                    value={q.question_text}
                    onChange={(e) =>
                      change(i, { question_text: e.target.value })
                    }
                    required
                  />
                </label>
                {validate && !q.question_text.trim() && (
                  <p className="error">Enter the question text.</p>
                )}
                <label>
                  Question type
                  <select
                    value={q.question_type}
                    onChange={(e) => {
                      const type = e.target
                        .value as DraftQuestion["question_type"];
                      if (
                        q.question_type === "multiple_choice" &&
                        q.choices.some((choice) => choice.trim()) &&
                        !window.confirm(
                          "Changing the question type will replace its answer choices. Continue?",
                        )
                      )
                        return;
                      change(i, {
                        question_type: type,
                        choices:
                          type === "true_false" ? ["True", "False"] : ["", ""],
                      });
                    }}
                  >
                    <option value="multiple_choice">Multiple choice</option>
                    <option value="true_false">True / False</option>
                  </select>
                </label>
                <p className="field-title">Answer choices</p>
                {q.choices.map((choice, n) => (
                  <div className="choice-edit" key={n}>
                    {validate && !choice.trim() && (
                      <span className="error">Enter this answer choice.</span>
                    )}
                    <label className="sr-only" htmlFor={`${q.key}-${n}`}>
                      Choice {n + 1}
                    </label>
                    <input
                      id={`${q.key}-${n}`}
                      value={choice}
                      disabled={q.question_type === "true_false"}
                      onChange={(e) =>
                        change(i, {
                          choices: q.choices.map((c, j) =>
                            j === n ? e.target.value : c,
                          ),
                        })
                      }
                      required
                    />
                    <button
                      type="button"
                      className="text-button"
                      aria-label={`Move choice ${n + 1} up in question ${i + 1}`}
                      disabled={q.question_type === "true_false" || n === 0}
                      onClick={() => {
                        const c = [...q.choices];
                        [c[n - 1], c[n]] = [c[n], c[n - 1]];
                        change(i, { choices: c });
                      }}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className="text-button"
                      aria-label={`Move choice ${n + 1} down in question ${i + 1}`}
                      disabled={
                        q.question_type === "true_false" ||
                        n === q.choices.length - 1
                      }
                      onClick={() => {
                        const c = [...q.choices];
                        [c[n + 1], c[n]] = [c[n], c[n + 1]];
                        change(i, { choices: c });
                      }}
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      className="text-button danger"
                      aria-label={`Remove choice ${n + 1} from question ${i + 1}`}
                      disabled={
                        q.question_type === "true_false" ||
                        q.choices.length <= 2
                      }
                      onClick={() => {
                        if (
                          !choice.trim() ||
                          window.confirm("Remove this answer choice?")
                        )
                          change(i, {
                            choices: q.choices.filter((_, j) => j !== n),
                          });
                      }}
                    >
                      Remove
                    </button>
                  </div>
                ))}
                {q.question_type === "multiple_choice" && (
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => change(i, { choices: [...q.choices, ""] })}
                  >
                    + Add choice
                  </button>
                )}
              </section>
            ))}
            <div className="actions">
              <button
                type="button"
                className="secondary"
                onClick={() => setQuestions((q) => [...q, newQuestion()])}
              >
                + Add question
              </button>
              <button disabled={busy || (!!error && !!id && !title)}>
                {busy ? "Saving…" : "Save draft"}
              </button>
              <button name="action" value="activate" disabled={busy}>
                {busy ? "Saving..." : "Save and activate"}
              </button>
            </div>
            {error && (
              <p role="alert" className="error">
                {error}
              </p>
            )}
          </fieldset>
        </form>
      </main>
    </>
  );
}
export function Present() {
  const { id } = useParams();
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [qr, setQr] = useState("");
  const [count, setCount] = useState<number | null>(null);
  const [countError, setCountError] = useState("");
  const [error, setError] = useState("");
  const [closing, setClosing] = useState(false);
  const [closeError, setCloseError] = useState("");
  const closeVersion = useRef(0);
  const nav = useNavigate();
  useEffect(() => {
    if (!id) return;
    closeVersion.current++;
    setSurvey(null);
    setQr("");
    setCount(null);
    setCountError("");
    setError("");
    setCloseError("");
    setClosing(false);
    let alive = true;
    let latestRequest = 0;
    let inFlight = false;
    async function load() {
      if (inFlight) return;
      inFlight = true;
      const request = ++latestRequest;
      try {
        const s = await surveyById(id!);
        if (!s || s.status !== "active")
          throw new Error("This survey is not active.");
        const url = `${window.location.origin}${import.meta.env.BASE_URL}#/s/${s.public_slug}`;
        const QRCode = (await import("qrcode")).default;
        const image = await QRCode.toDataURL(url, { width: 600, margin: 2 });
        if (!alive || request !== latestRequest) return;
        setSurvey(s);
        setQr(image);
        setError("");
        try {
          const { count, error } = await db
            .from("responses")
            .select("id", { count: "exact", head: true })
            .eq("survey_id", id!);
          if (error) throw error;
          if (count === null) throw new Error("Unable to load response count.");
          if (alive && request === latestRequest) {
            setCount(count);
            setCountError("");
          }
        } catch {
          if (alive && request === latestRequest) {
            setCount(null);
            setCountError(
              "Unable to load response count. Retrying automatically.",
            );
          }
        }
      } catch (e) {
        if (alive && request === latestRequest) setError(message(e));
      } finally {
        inFlight = false;
      }
    }
    void load();
    const timer = setInterval(() => void load(), 10000);
    return () => {
      alive = false;
      closeVersion.current++;
      clearInterval(timer);
    };
  }, [id]);
  async function close() {
    if (
      !window.confirm(
        "Close this survey? Students will no longer be able to submit.",
      )
    )
      return;
    const version = closeVersion.current;
    setCloseError("");
    setClosing(true);
    try {
      const { data, error } = await db
        .from("surveys")
        .update({ status: "closed" })
        .eq("id", id)
        .eq("status", "active")
        .select("id")
        .maybeSingle();
      if (version !== closeVersion.current) return;
      if (error) throw error;
      if (!data)
        throw new Error(
          "The survey could not be closed. Refresh and check its status and your access.",
        );
      nav("/dashboard");
    } catch (e) {
      if (version === closeVersion.current) setCloseError(message(e));
    } finally {
      if (version === closeVersion.current) setClosing(false);
    }
  }
  return (
    <>
      <Header />
      <main className="container present">
        {error ? (
          <p role="alert" className="error">
            {error}
          </p>
        ) : !survey ? (
          <p>Loading presentation…</p>
        ) : (
          <>
            <p className="eyebrow">Live classroom survey</p>
            <h1>{survey.title}</h1>
            <p>Scan to share your answer</p>
            <img className="qr" src={qr} alt="QR code linking to the survey" />
            <p className="survey-url">
              {window.location.origin}
              {import.meta.env.BASE_URL}#/s/{survey.public_slug}
            </p>
            <p className="response-count">
              {count === null ? (
                countError ? (
                  "Response count unavailable"
                ) : (
                  "Loading responses…"
                )
              ) : (
                <>
                  <strong>{count}</strong> responses
                </>
              )}
            </p>
            {countError && (
              <p role="alert" className="error">
                {countError}
              </p>
            )}
            {closeError && (
              <p role="alert" className="error">
                {closeError}
              </p>
            )}
            <div className="actions">
              <a
                className="button secondary"
                href={qr}
                download="survey-qr.png"
              >
                Download QR code
              </a>
              <Link className="button secondary" to={`/surveys/${id}/results`}>
                View results
              </Link>
              <button disabled={closing} onClick={() => void close()}>
                {closing ? "Closing…" : "Close survey"}
              </button>
            </div>
          </>
        )}
      </main>
    </>
  );
}
export function StudentRoute() {
  const { slug } = useParams();
  return <Student key={slug} />;
}
export function Student() {
  const { slug } = useParams();
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [state, setState] = useState<"loading" | "ready" | "success" | "error">(
    "loading",
  );
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  useEffect(() => {
    let current = true;
    setState("loading");
    setSurvey(null);
    setAnswers({});
    setError("");
    async function load() {
      try {
        const { data, error } = await studentDb
          .from("surveys")
          .select("*, questions(*, choices(*))")
          .eq("public_slug", slug)
          .eq("status", "active")
          .maybeSingle();
        if (!current) return;
        if (error || !data) throw error || new Error("Survey unavailable");
        setSurvey(ordered(data as Survey));
        setState("ready");
      } catch {
        if (!current) return;
        setError(
          "This survey is unavailable or no longer accepting responses.",
        );
        setState("error");
      }
    }
    void load();
    return () => {
      current = false;
    };
  }, [slug, loadAttempt]);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!survey) return;
    if ((survey.questions || []).some((q) => !answers[q.id])) {
      setError("Please answer every question before submitting.");
      return;
    }
    setBusy(true);
    setError("");
    let token: string | null;
    try {
      token = localStorage.getItem("classroom-survey-token");
      if (!token) {
        token = crypto.randomUUID();
        localStorage.setItem("classroom-survey-token", token);
      }
    } catch {
      setBusy(false);
      setError("Browser storage is unavailable. Enable it and try again.");
      return;
    }
    try {
      const { error } = await studentDb.rpc("submit_survey_response", {
        p_survey_id: survey.id,
        p_anonymous_token: token,
        p_answers: Object.entries(answers).map(([question_id, choice_id]) => ({
          question_id,
          choice_id,
        })),
      });
      if (error) {
        setError(
          error.message.includes("DUPLICATE_RESPONSE")
            ? "You have already submitted a response to this survey."
            : error.message.includes("SURVEY_NOT_ACTIVE")
              ? "This survey is no longer accepting responses."
              : "Your response could not be submitted. Please try again.",
        );
      } else setState("success");
    } catch {
      setError("Your response could not be submitted. Please try again.");
    } finally {
      setBusy(false);
    }
  }
  if (state === "success")
    return (
      <main className="center">
        <div className="panel thank-you">
          <div className="success-icon">✓</div>
          <h1>Thank you!</h1>
          <p>Your response has been recorded.</p>
        </div>
      </main>
    );
  if (state === "loading")
    return <main className="center">Loading survey…</main>;
  if (state === "error" || !survey)
    return (
      <main className="center">
        <div className="panel">
          <h1>Survey unavailable</h1>
          <p>{error}</p>
          <button onClick={() => setLoadAttempt((n) => n + 1)}>
            Try again
          </button>
        </div>
      </main>
    );
  return (
    <main className="student">
      <div className="student-top">
        <span className="brand">✳ Classroom Survey</span>
        <span>Anonymous response</span>
      </div>
      <div className="student-title">
        <p className="eyebrow">Your input matters</p>
        <h1>{survey.title}</h1>
        <p>{survey.description}</p>
      </div>
      <form onSubmit={submit}>
        {survey.questions?.map((q, i) => (
          <fieldset className="panel" key={q.id} disabled={busy}>
            <legend className="sr-only">
              Question {i + 1}: {q.question_text}
            </legend>
            <p className="eyebrow">Question {String(i + 1).padStart(2, "0")}</p>
            <h2>{q.question_text}</h2>
            {q.choices.map((c) => (
              <label className="answer" key={c.id}>
                <input
                  type="radio"
                  name={q.id}
                  value={c.id}
                  checked={answers[q.id] === c.id}
                  onChange={() => setAnswers((a) => ({ ...a, [q.id]: c.id }))}
                />
                <span>{c.choice_text}</span>
              </label>
            ))}
          </fieldset>
        ))}
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <button className="submit" disabled={busy}>
          {busy ? "Submitting…" : "Submit response →"}
        </button>
        <p className="muted">Your response is anonymous.</p>
      </form>
    </main>
  );
}
export function Results() {
  const { id } = useParams();
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [responses, setResponses] = useState<Response[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const requestVersion = useRef(0);
  async function load() {
    if (!id) return;
    const version = ++requestVersion.current;
    setLoading(true);
    try {
      const { data, error } = await db.rpc("get_survey_results", {
        p_survey_id: id,
      });
      if (version !== requestVersion.current) return;
      if (error) throw error;
      const snapshot = data as { survey: Survey; responses: Response[] };
      setSurvey(ordered(snapshot.survey));
      setResponses(snapshot.responses);
      setError("");
    } catch (e) {
      if (version === requestVersion.current) setError(message(e));
    } finally {
      if (version === requestVersion.current) setLoading(false);
    }
  }
  useEffect(() => {
    setSurvey(null);
    setResponses([]);
    setError("");
    void load();
    return () => {
      requestVersion.current++;
    };
  }, [id]);
  function download() {
    if (!survey) return;
    const blob = new Blob([createCsv(survey, responses)], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "survey-results.csv";
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <>
      <Header />
      <main className="container">
        <Link to="/dashboard">← Back to surveys</Link>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        {loading ? (
          <p>Loading results…</p>
        ) : !survey && error ? (
          <button className="secondary" onClick={() => void load()}>
            Try again
          </button>
        ) : (
          survey && (
            <>
              <div className="heading">
                <div>
                  <p className="eyebrow">Survey results</p>
                  <h1>{survey.title}</h1>
                  <p>
                    {responses.length}{" "}
                    {responses.length === 1 ? "response" : "responses"}
                  </p>
                </div>
                <div className="actions">
                  <button className="secondary" onClick={() => void load()}>
                    Refresh
                  </button>
                  <button onClick={download}>Export CSV</button>
                  {survey.status === "active" && (
                    <Link
                      className="button secondary"
                      to={`/surveys/${id}/present`}
                    >
                      Present QR
                    </Link>
                  )}
                </div>
              </div>
              {responses.length === 0 && (
                <div className="panel empty">
                  No responses yet. Display the QR code so students can join.
                </div>
              )}
              {survey.questions?.map((q, i) => {
                const counts = new Map(q.choices.map((c) => [c.id, 0]));
                for (const response of responses) {
                  const answer = response.answers.find(
                    (a) => a.question_id === q.id,
                  );
                  if (answer && counts.has(answer.choice_id))
                    counts.set(
                      answer.choice_id,
                      counts.get(answer.choice_id)! + 1,
                    );
                }
                const answered = [...counts.values()].reduce(
                  (sum, count) => sum + count,
                  0,
                );
                const data = q.choices.map((c) => ({
                  id: c.id,
                  name: c.choice_text,
                  count: counts.get(c.id) || 0,
                  percentage: answered
                    ? Math.round(((counts.get(c.id) || 0) / answered) * 1000) /
                      10
                    : 0,
                }));
                return (
                  <section className="panel result" key={q.id}>
                    <p className="eyebrow">
                      Question {String(i + 1).padStart(2, "0")}
                    </p>
                    <h2>{q.question_text}</h2>
                    <p>
                      {answered} answered / {responses.length - answered}{" "}
                      unanswered
                    </p>
                    <Suspense fallback={<p>Loading chart...</p>}>
                      <ResultsChart data={data} />
                    </Suspense>
                    <ul className="result-list">
                      {data.map((d) => (
                        <li key={d.id}>
                          <span>{d.name}</span>
                          <strong>
                            {d.count} · {d.percentage}%
                          </strong>
                        </li>
                      ))}
                    </ul>
                  </section>
                );
              })}
            </>
          )
        )}
      </main>
    </>
  );
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>,
);
