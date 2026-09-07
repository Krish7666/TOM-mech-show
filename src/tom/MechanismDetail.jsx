import { useEffect, useMemo, useState } from "react";
import { tomCategoryMeta } from "./tomConstants";
import { fetchMechanismDetail, deleteMechanism, deleteMechanismMedia, approveMechanism, rejectMechanism } from "./tomApi";
import { getMechanismPoster } from "./mechanismDrawings";
import MechanismPreview from "./MechanismPreview.jsx";
import { analyzeMechanism } from "./kinematics.js";
import KinematicWorkbench from "./KinematicWorkbench.jsx";

const TABS = ["Overview", "Animation", "Kinematic Solver", "Images", "Videos", "CAD", "Documents"];

function tabForType(type) {
  if (type === "image" || type === "drawing") return "Images";
  if (type === "video") return "Videos";
  if (type === "animation") return "Animation";
  if (type === "cad") return "CAD";
  return "Documents";
}

export default function MechanismDetail({ id, isAdmin, onBack, onChanged }) {
  const [mechanism, setMechanism] = useState(null);
  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("Overview");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      setActiveTab("Overview");
      const { mechanism, media, error } = await fetchMechanismDetail(id);
      if (cancelled) return;
      if (error) setError("Could not load this mechanism.");
      setMechanism(mechanism || null);
      setMedia(media);
      setLoading(false);
    }
    run();
    return () => { cancelled = true; };
  }, [id]);

  const mediaByTab = useMemo(() => {
    const groups = { Images: [], Videos: [], Animation: [], CAD: [], Documents: [] };
    media.forEach((m) => groups[tabForType(m.file_type)].push(m));
    return groups;
  }, [media]);

  const analysis = useMemo(() => (mechanism ? analyzeMechanism(mechanism) : null), [mechanism]);

  const availableTabs = useMemo(
    () => TABS.filter((t) => t === "Overview" || t === "Kinematic Solver" || t === "Animation" || mediaByTab[t]?.length > 0),
    [mediaByTab],
  );

  async function handleDeleteMechanism() {
    if (!window.confirm("Delete this mechanism and all its media? This can't be undone.")) return;
    setBusy(true);
    const { error } = await deleteMechanism(id);
    setBusy(false);
    if (!error) { onChanged?.(); onBack(); }
  }

  async function handleDeleteMedia(row) {
    if (!window.confirm(`Remove "${row.file_name}"?`)) return;
    setBusy(true);
    await deleteMechanismMedia(row);
    setMedia((cur) => cur.filter((m) => m.id !== row.id));
    setBusy(false);
  }

  async function handleApprove() {
    setBusy(true);
    await approveMechanism(id);
    setMechanism((cur) => ({ ...cur, status: "approved" }));
    setBusy(false);
    onChanged?.();
  }

  async function handleReject() {
    setBusy(true);
    await rejectMechanism(id);
    setBusy(false);
    onChanged?.();
    onBack();
  }

  if (loading) {
    return (
      <section className="empty-state">
        <div className="empty-state__icon" style={{ animation: "spin 1s linear infinite" }}>⚙️</div>
        <h2 className="empty-state__title">Loading mechanism…</h2>
      </section>
    );
  }

  if (error || !mechanism) {
    return (
      <section className="empty-state">
        <div className="empty-state__icon">⚠️</div>
        <h2 className="empty-state__title">{error || "Mechanism not found"}</h2>
        <button type="button" className="button button--primary" onClick={onBack} style={{ marginTop: 16 }}>
          ← Back to Showcase
        </button>
      </section>
    );
  }

  const meta = tomCategoryMeta(mechanism.category);

  return (
    <section className="tom-detail">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 8 }}>
        <button type="button" className="button button--ghost tom-detail__back" onClick={onBack}>
          ← Browse All Mechanisms
        </button>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button
            type="button"
            className="secondary-btn secondary-btn--small"
            onClick={() => {
              try {
                navigator.clipboard.writeText(window.location.href);
                setCopied(true);
                setTimeout(() => setCopied(false), 2200);
              } catch {
                // clipboard fallback
              }
            }}
          >
            {copied ? "✓ Copied!" : "🔗 Share Link"}
          </button>
          <button
            type="button"
            className="secondary-btn secondary-btn--small"
            onClick={() => window.print()}
          >
            🖨 Print Specs
          </button>
        </div>
      </div>

      {mechanism.status !== "approved" && (
        <div className="tom-detail__status-banner">
          {mechanism.status === "pending" ? "⏳ Pending admin review — not yet public." : "🚫 Rejected — not visible publicly."}
        </div>
      )}

      <header className="tom-detail__header" style={{ "--card-accent": meta.color }}>
        <div className="tom-detail__category-badge">
          <span>{meta.icon}</span><span>{mechanism.category || "Other"}</span>
        </div>
        <h1 className="tom-detail__title">{mechanism.name}</h1>
        <p className="tom-detail__uploader">
          Uploaded by <strong>{mechanism.student_name || "Unknown"}</strong>
          {` · ${mechanism.college || "NMIET"} · Dept. of Mechanical Engineering`}
        </p>

        {isAdmin && (
          <div className="tom-detail__admin-actions">
            {mechanism.status === "pending" && (
              <>
                <button type="button" className="button button--primary" disabled={busy} onClick={handleApprove}>
                  ✓ Approve
                </button>
                <button type="button" className="button button--danger" disabled={busy} onClick={handleReject}>
                  ✕ Reject
                </button>
              </>
            )}
            <button type="button" className="button button--danger" disabled={busy} onClick={handleDeleteMechanism}>
              🗑 Delete
            </button>
          </div>
        )}
      </header>

      <div className="tom-detail__tabs" role="tablist">
        {availableTabs.map((tab) => (
          <button key={tab} type="button" role="tab" aria-selected={activeTab === tab}
            className={`tom-detail__tab${activeTab === tab ? " tom-detail__tab--active" : ""}`}
            onClick={() => setActiveTab(tab)}>
            {tab === "Kinematic Solver" ? "⚙️ Kinematic Solver" : tab === "Animation" ? "🌀 Animation" : tab}
          </button>
        ))}
      </div>

      <div className="tom-detail__panel">
        {activeTab === "Overview" ? (
          <OverviewPanel mechanism={mechanism} />
        ) : activeTab === "Kinematic Solver" ? (
          <KinematicWorkbench initialMechanism={mechanism} />
        ) : (
          <MediaPanel
            items={mediaByTab[activeTab] || []}
            tab={activeTab}
            isAdmin={isAdmin}
            onDelete={handleDeleteMedia}
            mechanism={mechanism}
            analysis={analysis}
          />
        )}
      </div>

      <h2 className="tom-detail__section-title">Technical Details &amp; Kinematics</h2>
      <div className="tom-spec-grid">
        <SpecCard label="Links (L)" value={mechanism.num_links ?? analysis?.links} />
        <SpecCard label="Joints (J)" value={mechanism.num_joints ?? analysis?.joints} />
        <SpecCard label="Higher Pairs (H)" value={mechanism.higher_pairs ?? analysis?.higherPairs ?? 0} />
        <SpecCard label="Calculated DOF" value={analysis?.result ?? mechanism.degrees_of_freedom} />
        <SpecCard label="Kinematic Pairs" value={mechanism.kinematic_pairs || "Lower Pairs (Revolute)"} />
        <SpecCard label="Input Link" value={mechanism.input_link || "Link 1 (Driver)"} />
        <SpecCard label="Output Link" value={mechanism.output_link || "Output / Rocker"} />
      </div>
      {analysis && (
        <div className={`analysis-status analysis-status--${analysis.status}`} style={{ margin: "16px 0" }}>
          <div>
            <span className="analysis-status__eyebrow">Mobility Classification (Grübler's Criteria)</span>
            <h3>{analysis.title}</h3>
          </div>
          <strong>{analysis.status === "invalid" ? "!" : analysis.result}</strong>
          <p>{analysis.explanation}</p>
          <p className="analysis-status__recommendation">{analysis.recommendation}</p>
        </div>
      )}
      {mechanism.additional_technical_details && (
        <p className="tom-detail__extra-tech">{mechanism.additional_technical_details}</p>
      )}

      {media.length > 0 && (
        <>
          <h2 className="tom-detail__section-title">Resources</h2>
          <div className="tom-resource-list">
            {media.map((row) => (
              <ResourceRow key={row.id} row={row} isAdmin={isAdmin} onDelete={handleDeleteMedia} />
            ))}
          </div>
        </>
      )}

      {Array.isArray(mechanism.external_links) && mechanism.external_links.length > 0 && (
        <>
          <h2 className="tom-detail__section-title">External Links</h2>
          <ul className="tom-external-links">
            {mechanism.external_links.map((url) => (
              <li key={url}><a href={url} target="_blank" rel="noreferrer">{url}</a></li>
            ))}
          </ul>
        </>
      )}

      <h2 className="tom-detail__section-title">Team / Contributor</h2>
      <div className="tom-team-card">
        <div className="author-row__avatar">{(mechanism.student_name || "?").charAt(0).toUpperCase()}</div>
        <div>
          <p className="tom-team-card__name">{mechanism.student_name || "Unknown"}</p>
          {mechanism.team_members && mechanism.team_members !== mechanism.student_name && (
            <p className="tom-team-card__members">Team: {mechanism.team_members}</p>
          )}
          <p className="tom-team-card__meta">
            {[mechanism.department || "Mechanical Engineering", mechanism.college || "NMIET", mechanism.academic_year].filter(Boolean).join(" · ")}
          </p>
        </div>
      </div>
    </section>
  );
}

function OverviewPanel({ mechanism }) {
  const cover = getMechanismPoster(mechanism);

  return (
    <div className="tom-overview">
      {cover && (
        <div className="tom-overview__media-hero" style={{ marginBottom: 20, borderRadius: 16, overflow: "hidden", border: "1px solid var(--border)", maxHeight: 380, background: "rgba(0,0,0,0.2)" }}>
          <img src={cover} alt={mechanism.name} style={{ width: "100%", maxHeight: 380, objectFit: "cover", display: "block" }} />
        </div>
      )}
      {mechanism.short_description && <p className="tom-overview__lead">{mechanism.short_description}</p>}
      {mechanism.detailed_description && (
        <>
          <h3>Description</h3>
          <p>{mechanism.detailed_description}</p>
        </>
      )}
      {mechanism.working_principle && (
        <>
          <h3>Working Principle</h3>
          <p>{mechanism.working_principle}</p>
        </>
      )}
      {mechanism.applications && (
        <>
          <h3>Applications</h3>
          <p>{mechanism.applications}</p>
        </>
      )}
      {!mechanism.detailed_description && !mechanism.working_principle && !mechanism.applications && (
        <p className="tom-overview__empty">No additional description provided yet.</p>
      )}
    </div>
  );
}

function MediaPanel({ items, tab, isAdmin, onDelete, mechanism, analysis }) {
  if (tab === "Animation") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {mechanism && analysis && (
          <div>
            <p style={{ margin: "0 0 12px 0", color: "var(--muted)", font: "500 0.9rem var(--font-body)" }}>
              Live mathematical kinematic simulation based on this mechanism’s constraints and geometry:
            </p>
            <MechanismPreview mechanism={mechanism} analysis={analysis} />
          </div>
        )}
        {items.length > 0 && (
          <div className="tom-media-gallery" style={{ marginTop: 12 }}>
            {items.map((row) => (
              <div key={row.id} className="tom-media-item">
                <video className="tom-media-item__video" src={row.file_url} controls preload="metadata" />
                <div className="tom-media-item__caption">
                  <span>{row.file_name}</span>
                  {isAdmin && (
                    <button type="button" className="icon-button icon-button--danger" onClick={() => onDelete(row)} aria-label="Remove file">
                      🗑
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (items.length === 0) {
    return <p className="tom-overview__empty">No {tab.toLowerCase()} uploaded yet.</p>;
  }
  return (
    <div className="tom-media-gallery">
      {items.map((row) => (
        <div key={row.id} className="tom-media-item">
          {row.file_type === "video" || row.file_type === "animation" ? (
            <video className="tom-media-item__video" src={row.file_url} controls preload="metadata" />
          ) : row.file_type === "image" || row.file_type === "drawing" ? (
            <img className="tom-media-item__image" src={row.file_url} alt={row.file_name} />
          ) : (
            <a className="tom-media-item__file" href={row.file_url} target="_blank" rel="noreferrer">
              📄 {row.file_name}
            </a>
          )}
          <div className="tom-media-item__caption">
            <span>{row.file_name}</span>
            {isAdmin && (
              <button type="button" className="icon-button icon-button--danger" onClick={() => onDelete(row)} aria-label="Remove file">
                🗑
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function ResourceRow({ row, isAdmin, onDelete }) {
  return (
    <div className="tom-resource-row">
      <span className="tom-resource-row__icon">
        {row.file_type === "cad" ? "🧩" : row.file_type === "document" ? "📄" : row.file_type === "video" ? "🎬" : row.file_type === "animation" ? "🌀" : "🖼️"}
      </span>
      <span className="tom-resource-row__name">{row.file_name}</span>
      <div className="tom-resource-row__actions">
        <a className="button button--secondary" href={row.file_url} target="_blank" rel="noreferrer">View</a>
        <a className="button button--secondary" href={row.file_url} download>Download</a>
        {isAdmin && (
          <button type="button" className="icon-button icon-button--danger" onClick={() => onDelete(row)} aria-label="Delete file">
            🗑
          </button>
        )}
      </div>
    </div>
  );
}

function SpecCard({ label, value }) {
  return (
    <div className="tom-spec-card">
      <span className="tom-spec-card__label">{label}</span>
      <span className="tom-spec-card__value">{value || value === 0 ? value : "—"}</span>
    </div>
  );
}
