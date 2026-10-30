import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  BrowserRouter,
  Link,
  Navigate,
  Route,
  Routes,
  useNavigate,
  useParams,
} from "react-router-dom";
import type { Session } from "@supabase/supabase-js";
import QRCode from "qrcode";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  configured,
  createCsv,
  db,
  ordered,
  surveyById,
  type Response,
  type Survey,
} from "./lib";
import "./style.css";

const message = (e: unknown) =>
  e instanceof Error ? e.message : "Something went wrong. Please try again.";
function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    db.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data } = db.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);
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
  if (loading) return <main className="center">Loading…</main>;
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
      <Route path="/s/:slug" element={<Student />} />
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
function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const nav = useNavigate();
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const { error } = await db.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) setError("Unable to sign in. Check your email and password.");
    else nav("/dashboard");
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
function Dashboard({ email }: { email: string }) {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const nav = useNavigate();
  async function load() {
    setLoading(true);
    const { data, error } = await db
      .from("surveys")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) setError(message(error));
    else setSurveys(data as Survey[]);
    setLoading(false);
  }
  useEffect(() => {
    void load();
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
    setBusy(s.id);
    setError("");
    try {
      if (kind === "duplicate") {
        const original = await surveyById(s.id);
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
        if (error) throw error;
        nav(`/surveys/${data}/edit`);
        return;
      }
      if (kind === "activate") {
        const { error } = await db.rpc("activate_survey", {
          p_survey_id: s.id,
        });
        if (error) throw error;
        nav(`/surveys/${s.id}/present`);
        return;
      }
      const request =
        kind === "delete"
          ? db.from("surveys").delete().eq("id", s.id)
          : db
              .from("surveys")
              .update({ status: kind === "close" ? "closed" : "archived" })
              .eq("id", s.id);
      const { error } = await request;
      if (error) throw error;
      await load();
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy("");
    }
  }
  const visible = surveys.filter(
    (s) =>
      s.title.toLowerCase().includes(search.toLowerCase()) &&
      (status === "all" || s.status === status),
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
function Editor() {
  const { id } = useParams();
  const nav = useNavigate();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [questions, setQuestions] = useState<DraftQuestion[]>([newQuestion()]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(!!id);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!id) return;
    surveyById(id)
      .then((s) => {
        if (!s) throw new Error("Survey not found");
        if (s.status !== "draft")
          throw new Error("Only draft surveys can be edited.");
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
      .catch((e) => setError(message(e)))
      .finally(() => setLoading(false));
  }, [id]);
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
    setBusy(true);
    setError("");
    const { error } = await db.rpc("save_survey", {
      p_survey_id: id || null,
      p_title: title.trim(),
      p_description: description.trim() || null,
      p_questions: questions.map((q) => ({
        question_text: q.question_text.trim(),
        question_type: q.question_type,
        choices: q.choices.map((c) => c.trim()),
      })),
    });
    setBusy(false);
    if (error) setError(message(error));
    else nav("/dashboard");
  }
  if (loading) return <main className="container">Loading survey…</main>;
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
        <form onSubmit={save}>
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
            <section className="panel question-editor" key={q.key}>
              <div className="row">
                <h2>Question {i + 1}</h2>
                <div className="actions">
                  <button
                    type="button"
                    className="text-button"
                    onClick={() => move(i, i - 1)}
                    disabled={i === 0}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="text-button"
                    onClick={() => move(i, i + 1)}
                    disabled={i === questions.length - 1}
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    className="text-button danger"
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
                  onChange={(e) => change(i, { question_text: e.target.value })}
                  required
                />
              </label>
              <label>
                Question type
                <select
                  value={q.question_type}
                  onChange={(e) => {
                    const type = e.target
                      .value as DraftQuestion["question_type"];
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
                    aria-label={`Move choice ${n + 1} up`}
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
                    aria-label={`Move choice ${n + 1} down`}
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
                    disabled={
                      q.question_type === "true_false" || q.choices.length <= 2
                    }
                    onClick={() =>
                      change(i, {
                        choices: q.choices.filter((_, j) => j !== n),
                      })
                    }
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
          </div>
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
        </form>
      </main>
    </>
  );
}
function Present() {
  const { id } = useParams();
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [qr, setQr] = useState("");
  const [count, setCount] = useState(0);
  const [error, setError] = useState("");
  const nav = useNavigate();
  useEffect(() => {
    if (!id) return;
    let alive = true;
    async function load() {
      try {
        const s = await surveyById(id!);
        if (!s || s.status !== "active")
          throw new Error("This survey is not active.");
        const url = `${window.location.origin}/s/${s.public_slug}`;
        const image = await QRCode.toDataURL(url, { width: 600, margin: 2 });
        if (alive) {
          setSurvey(s);
          setQr(image);
        }
        const { count, error } = await db
          .from("responses")
          .select("id", { count: "exact", head: true })
          .eq("survey_id", id!);
        if (error) throw error;
        if (alive) setCount(count || 0);
      } catch (e) {
        if (alive) setError(message(e));
      }
    }
    void load();
    const timer = setInterval(() => void load(), 10000);
    return () => {
      alive = false;
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
    const { error } = await db
      .from("surveys")
      .update({ status: "closed" })
      .eq("id", id);
    if (error) setError(message(error));
    else nav("/dashboard");
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
              {window.location.origin}/s/{survey.public_slug}
            </p>
            <p className="response-count">
              <strong>{count}</strong> responses
            </p>
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
              <button onClick={() => void close()}>Close survey</button>
            </div>
          </>
        )}
      </main>
    </>
  );
}
function Student() {
  const { slug } = useParams();
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [state, setState] = useState<"loading" | "ready" | "success" | "error">(
    "loading",
  );
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    async function load() {
      const { data, error } = await db
        .from("surveys")
        .select("*, questions(*, choices(*))")
        .eq("public_slug", slug)
        .eq("status", "active")
        .maybeSingle();
      if (error || !data) {
        setError(
          "This survey is unavailable or no longer accepting responses.",
        );
        setState("error");
      } else {
        setSurvey(ordered(data as Survey));
        setState("ready");
      }
    }
    void load();
  }, [slug]);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!survey) return;
    if ((survey.questions || []).some((q) => !answers[q.id])) {
      setError("Please answer every question before submitting.");
      return;
    }
    setBusy(true);
    setError("");
    let token = localStorage.getItem("classroom-survey-token");
    if (!token) {
      token = crypto.randomUUID();
      localStorage.setItem("classroom-survey-token", token);
    }
    const { error } = await db.rpc("submit_survey_response", {
      p_survey_id: survey.id,
      p_anonymous_token: token,
      p_answers: Object.entries(answers).map(([question_id, choice_id]) => ({
        question_id,
        choice_id,
      })),
    });
    setBusy(false);
    if (error) {
      setError(
        error.message.includes("DUPLICATE_RESPONSE")
          ? "You have already submitted a response to this survey."
          : error.message.includes("SURVEY_NOT_ACTIVE")
            ? "This survey is no longer accepting responses."
            : "Your response could not be submitted. Please try again.",
      );
    } else setState("success");
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
          <fieldset className="panel" key={q.id}>
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
function Results() {
  const { id } = useParams();
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [responses, setResponses] = useState<Response[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  async function load() {
    if (!id) return;
    setLoading(true);
    try {
      const s = await surveyById(id);
      if (!s) throw new Error("Survey not found");
      const all: Response[] = [];
      const pageSize = 500;
      for (let start = 0; ;) {
        const { data, error } = await db
          .from("responses")
          .select("id, submitted_at, answers(question_id, choice_id)")
          .eq("survey_id", id)
          .order("submitted_at")
          .order("id")
          .range(start, start + pageSize - 1);
        if (error) throw error;
        all.push(...(data as Response[]));
        if (data.length === 0) break;
        start += data.length;
      }
      setSurvey(s);
      setResponses(all);
    } catch (e) {
      setError(message(e));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
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
                const data = q.choices.map((c) => {
                  const count = responses.filter((r) =>
                    r.answers.some(
                      (a) => a.question_id === q.id && a.choice_id === c.id,
                    ),
                  ).length;
                  const answered = responses.filter((r) =>
                    r.answers.some((a) => a.question_id === q.id),
                  ).length;
                  return {
                    name: c.choice_text,
                    count,
                    percentage: answered
                      ? Math.round((count / answered) * 1000) / 10
                      : 0,
                  };
                });
                return (
                  <section className="panel result" key={q.id}>
                    <p className="eyebrow">
                      Question {String(i + 1).padStart(2, "0")}
                    </p>
                    <h2>{q.question_text}</h2>
                    <div className="chart">
                      <ResponsiveContainer width="100%" height={220}>
                        <BarChart
                          data={data}
                          layout="vertical"
                          margin={{ left: 15, right: 20 }}
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            horizontal={false}
                          />
                          <XAxis type="number" allowDecimals={false} />
                          <YAxis type="category" dataKey="name" width={120} />
                          <Tooltip />
                          <Bar dataKey="count" fill="#246959" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <ul className="result-list">
                      {data.map((d) => (
                        <li key={d.name}>
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
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);
