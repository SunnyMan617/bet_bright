import { useMemo, useState, type FormEvent } from "react";
import {
  Activity,
  ArrowRight,
  BadgeCheck,
  Braces,
  Check,
  ChevronRight,
  CircleAlert,
  Clipboard,
  Copy,
  Database,
  ExternalLink,
  FileInput,
  Fingerprint,
  Github,
  Layers3,
  LoaderCircle,
  LockKeyhole,
  Plus,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Trash2,
  Unplug,
  Waypoints,
  X,
  Zap,
} from "lucide-react";
import type {
  ConvertedSlip,
  DecodedSlip,
  EncodedSlip,
  SelectionIdentity,
  SlipLeg,
} from "../shared/contracts";
import { ApiError, api } from "./api";

type Mode = "decode" | "encode" | "convert";
type Result = DecodedSlip | EncodedSlip | ConvertedSlip;
type SelectionRow = {
  id: string;
  eventId: string;
  marketId: string;
  outcomeId: string;
};

const emptyRow = (): SelectionRow => ({
  id: crypto.randomUUID(),
  eventId: "",
  marketId: "",
  outcomeId: "",
});

const MODES: Array<{
  id: Mode;
  label: string;
  description: string;
  icon: typeof FileInput;
}> = [
  { id: "decode", label: "Decode", description: "Reveal every leg", icon: FileInput },
  { id: "encode", label: "Encode", description: "Create a new code", icon: Braces },
  { id: "convert", label: "Convert", description: "Clone and prove", icon: RefreshCw },
];

function unwrapSlip(result: Result): DecodedSlip {
  return "slip" in result ? result.slip : result;
}

function formatTime(value?: string): string {
  if (!value) return "Start time unavailable";
  return new Intl.DateTimeFormat("en-NG", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function titleCase(value: string): string {
  return value
    .replaceAll("-", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function CopyButton({ value, label = "Copy" }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1_800);
  }
  return (
    <button className="copy-button" type="button" onClick={copy} aria-label={`Copy ${value}`}>
      {copied ? <Check size={15} /> : <Copy size={15} />}
      {copied ? "Copied" : label}
    </button>
  );
}

function LegCard({ leg, index }: { leg: SlipLeg; index: number }) {
  return (
    <article className={`leg-card ${!leg.isActive ? "leg-inactive" : ""}`}>
      <div className="timeline-column" aria-hidden="true">
        <span className="leg-number">{index + 1}</span>
        <span className="timeline-line" />
      </div>
      <div className="leg-content">
        <div className="leg-meta-row">
          <span className="sport-chip">{titleCase(leg.sport)}</span>
          <span className="league-name">{leg.region ? `${leg.region} · ` : ""}{leg.league}</span>
          {leg.isLive && <span className="live-chip"><i /> Live</span>}
          {!leg.isActive && <span className="unavailable-chip">Unavailable</span>}
        </div>
        <h3>{leg.event}</h3>
        <p className="start-time">{formatTime(leg.startsAt)}</p>
        <div className="pick-row">
          <div>
            <span className="pick-label">{leg.market}</span>
            <strong>{leg.selection}</strong>
          </div>
          <span className="odds">{leg.odds ? leg.odds.toFixed(2) : "—"}</span>
        </div>
      </div>
    </article>
  );
}

function SlipResult({
  result,
  onEdit,
}: {
  result: Result;
  onEdit: (selections: SelectionIdentity[]) => void;
}) {
  const slip = unwrapSlip(result);
  const verification = "verification" in result ? result.verification : undefined;
  const converted = "sourceCode" in result ? result : undefined;
  return (
    <section className="result-section" aria-live="polite">
      <div className="result-heading">
        <div>
          <span className="eyebrow"><BadgeCheck size={15} /> Read from Betway</span>
          <h2>{slip.selections.length}-leg booking slip</h2>
        </div>
        <span className="fetch-time">Updated just now</span>
      </div>

      {verification && (
        <div className={`proof-banner ${verification.matched ? "proof-success" : "proof-warning"}`}>
          {verification.matched ? <ShieldCheck size={21} /> : <CircleAlert size={21} />}
          <div>
            <strong>{verification.matched ? "Verified on Betway" : "Selection set changed"}</strong>
            <span>
              {verification.matched
                ? `All ${verification.decodedCount} selections match after loading the new code.`
                : `${verification.missing.length} selection(s) are no longer accepted by Betway.`}
            </span>
          </div>
        </div>
      )}

      <div className="ticket">
        <header className="ticket-header">
          <div className="ticket-code-block">
            <span>{converted ? "New booking code" : "Booking code"}</span>
            <strong>{slip.code}</strong>
          </div>
          <CopyButton value={slip.code} />
        </header>
        {converted && (
          <div className="conversion-line">
            <span>{converted.sourceCode}</span><ArrowRight size={16} /><strong>{converted.code}</strong>
          </div>
        )}
        <div className="ticket-summary">
          <div><span>Total odds</span><strong>{slip.totalOdds.toFixed(2)}</strong></div>
          <div><span>Selections</span><strong>{slip.selections.length}</strong></div>
          <div><span>Available now</span><strong>{slip.activeSelections}/{slip.selections.length}</strong></div>
          <div><span>Source</span><strong>Betway NG</strong></div>
        </div>
        <div className="legs-list">
          {slip.selections.map((leg, index) => (
            <LegCard key={`${leg.outcomeId}-${index}`} leg={leg} index={index} />
          ))}
        </div>
        <footer className="ticket-footer">
          <button
            type="button"
            className="text-button"
            onClick={() => onEdit(slip.selections)}
          >
            <Layers3 size={16} /> Use these selections in Encode
          </button>
          <a
            href={`https://www.betway.com.ng/?bookingCode=${slip.code}`}
            target="_blank"
            rel="noreferrer"
          >
            Open on Betway <ExternalLink size={14} />
          </a>
        </footer>
      </div>
    </section>
  );
}

function App() {
  const [mode, setMode] = useState<Mode>("decode");
  const [code, setCode] = useState("");
  const [rows, setRows] = useState<SelectionRow[]>([emptyRow(), emptyRow()]);
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<{ message: string; code?: string } | null>(null);

  const modeInfo = useMemo(() => MODES.find((item) => item.id === mode)!, [mode]);

  function changeMode(next: Mode) {
    setMode(next);
    setError(null);
    setResult(null);
  }

  function updateRow(id: string, field: keyof Omit<SelectionRow, "id">, value: string) {
    setRows((current) =>
      current.map((row) => (row.id === id ? { ...row, [field]: value } : row)),
    );
  }

  function editSelections(selections: SelectionIdentity[]) {
    setRows(
      selections.map((selection) => ({
        id: crypto.randomUUID(),
        eventId: String(selection.eventId),
        marketId: selection.marketId,
        outcomeId: selection.outcomeId,
      })),
    );
    setMode("encode");
    setResult(null);
    setError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      if (mode === "decode") setResult(await api.decode(code));
      if (mode === "convert") setResult(await api.convert(code));
      if (mode === "encode") {
        const selections = rows.map((row) => ({
          eventId: Number(row.eventId),
          marketId: row.marketId.trim(),
          outcomeId: row.outcomeId.trim(),
        }));
        setResult(await api.encode(selections));
      }
    } catch (caught) {
      const apiError = caught as ApiError;
      setError({ message: apiError.message || "Something went wrong.", code: apiError.code });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="BetBridge home">
          <span className="brand-mark"><Waypoints size={21} /></span>
          <span>BetBridge</span>
        </a>
        <div className="topbar-right">
          <span className="connection-pill"><i /> Betway connector live</span>
          <a className="github-link" href={import.meta.env.VITE_REPOSITORY_URL || "#"} target="_blank" rel="noreferrer">
            <Github size={18} /><span>Repository</span>
          </a>
        </div>
      </header>

      <main id="top">
        <section className="hero">
          <div className="hero-copy">
            <span className="hero-kicker"><Sparkles size={14} /> Booking codes, made transparent</span>
            <h1>Inspect. Rebuild.<br /><em>Prove the match.</em></h1>
            <p>
              A focused toolkit for Betway Nigeria slips. See every event, market,
              pick and price—then create a fresh code and verify it against Betway.
            </p>
          </div>
          <div className="hero-stat-card" aria-hidden="true">
            <div className="pulse-rings"><span /><span /><Zap size={24} /></div>
            <div><strong>&lt; 30s</strong><span>Target verification time</span></div>
          </div>
        </section>

        <section className="product-grid">
          <div className="workspace-card">
            <nav className="mode-tabs" aria-label="Booking code operations">
              {MODES.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    type="button"
                    key={item.id}
                    className={mode === item.id ? "active" : ""}
                    onClick={() => changeMode(item.id)}
                  >
                    <Icon size={18} />
                    <span><strong>{item.label}</strong><small>{item.description}</small></span>
                  </button>
                );
              })}
            </nav>

            <div className="form-area">
              <div className="form-heading">
                <span className="step-label">01 · INPUT</span>
                <h2>{modeInfo.label} a booking slip</h2>
                <p>
                  {mode === "decode" && "Enter a Betway Nigeria code to retrieve the current slip directly from the operator."}
                  {mode === "encode" && "Add Betway event, market and outcome identifiers. The returned code is loaded again to verify it."}
                  {mode === "convert" && "Create a fresh Betway code for the same selection set, then compare both slips."}
                </p>
              </div>

              <form onSubmit={submit}>
                {mode !== "encode" ? (
                  <label className="code-field">
                    <span>Betway booking code</span>
                    <div className="input-shell">
                      <Fingerprint size={19} />
                      <input
                        value={code}
                        onChange={(event) => setCode(event.target.value.toUpperCase())}
                        placeholder="e.g. BW69727F3B"
                        autoComplete="off"
                        spellCheck={false}
                        maxLength={20}
                        required
                      />
                      {code && <button type="button" onClick={() => setCode("")} aria-label="Clear code"><X size={17} /></button>}
                    </div>
                    <small><LockKeyhole size={13} /> Read-only operator lookup. No Betway account is required.</small>
                  </label>
                ) : (
                  <div className="selection-editor">
                    <div className="selection-labels"><span>Event ID</span><span>Market ID</span><span>Outcome ID</span><i /></div>
                    {rows.map((row, index) => (
                      <div className="selection-row" key={row.id}>
                        <label><span>Event ID</span><input inputMode="numeric" value={row.eventId} onChange={(e) => updateRow(row.id, "eventId", e.target.value)} placeholder="71924972" required /></label>
                        <label><span>Market ID</span><input value={row.marketId} onChange={(e) => updateRow(row.id, "marketId", e.target.value)} placeholder="719249721" required /></label>
                        <label><span>Outcome ID</span><input value={row.outcomeId} onChange={(e) => updateRow(row.id, "outcomeId", e.target.value)} placeholder="7192497211" required /></label>
                        <button type="button" className="remove-row" disabled={rows.length === 1} onClick={() => setRows((current) => current.filter((item) => item.id !== row.id))} aria-label={`Remove selection ${index + 1}`}><Trash2 size={16} /></button>
                      </div>
                    ))}
                    <button className="add-row" type="button" onClick={() => setRows((current) => [...current, emptyRow()])}><Plus size={16} /> Add selection</button>
                  </div>
                )}

                {error && (
                  <div className="error-box" role="alert">
                    <CircleAlert size={20} />
                    <div><strong>Couldn’t complete the request</strong><span>{error.message}</span></div>
                    {error.code && <code>{error.code}</code>}
                  </div>
                )}

                <button className="primary-button" type="submit" disabled={loading}>
                  {loading ? <LoaderCircle className="spinner" size={19} /> : mode === "convert" ? <RefreshCw size={18} /> : mode === "encode" ? <Braces size={18} /> : <Zap size={18} />}
                  {loading ? "Talking to Betway…" : mode === "decode" ? "Decode live slip" : mode === "encode" ? "Create & verify code" : "Convert & prove match"}
                  {!loading && <ChevronRight size={18} />}
                </button>
              </form>
            </div>

            {result && <SlipResult result={result} onEdit={editSelections} />}
          </div>

          <aside className="side-column">
            <section className="proof-card">
              <span className="step-label">THE PROOF LOOP</span>
              <h2>Trust the operator,<br />verify the result.</h2>
              <div className="proof-steps">
                <div><span><FileInput size={17} /></span><p><strong>Read</strong><small>Fetch the source slip from Betway</small></p></div>
                <i />
                <div><span><RefreshCw size={17} /></span><p><strong>Recreate</strong><small>Submit the exact selection identities</small></p></div>
                <i />
                <div><span><BadgeCheck size={17} /></span><p><strong>Compare</strong><small>Reload and diff both selection sets</small></p></div>
              </div>
            </section>

            <section className="signal-card">
              <div className="signal-icon"><Activity size={20} /></div>
              <div><strong>Live operator data</strong><span>Odds and availability can move between requests.</span></div>
            </section>

            <section className="details-card">
              <h3>Built for the handoff</h3>
              <ul>
                <li><ShieldCheck size={16} /><span>Server-side Betway adapter</span></li>
                <li><Database size={16} /><span>SQLite operation audit</span></li>
                <li><Clipboard size={16} /><span>Exact selection identities</span></li>
                <li><Unplug size={16} /><span>Timeout and upstream errors</span></li>
              </ul>
            </section>
          </aside>
        </section>
      </main>

      <footer className="page-footer">
        <span>BetBridge is an independent technical demonstration and is not affiliated with Betway.</span>
        <span>18+ · Gamble responsibly</span>
      </footer>
    </div>
  );
}

export default App;
