import { useEffect, useMemo, useState } from "react";
import { tomCategoryMeta } from "./tomConstants";
import { fetchMechanismDetail, deleteMechanism, deleteMechanismMedia, approveMechanism, rejectMechanism } from "./tomApi";
import MechanismPreview from "./MechanismPreview.jsx";
import { analyzeMechanism } from "./kinematics.js";
import KinematicWorkbench from "./KinematicWorkbench.jsx";
import FourBarVirtualLab from "./FourBarVirtualLab.jsx";

const TABS = ["Overview", "Animation", "Virtual Lab", "Kinematic Solver", "Images", "Videos", "CAD", "Documents"];

function tabForType(type) {
  if (type === "image" || type === "drawing") return "Images";
  if (type === "video") return "Videos";
  if (type === "animation") return "Animation";
  if (type === "virtual_mechanism") return "Virtual Lab";
  if (type === "cad") return "CAD";
  return "Documents";
}

function getVideoEmbedUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== "string") return null;
  const url = rawUrl.trim();

  // YouTube watch or short URL
  const ytMatch = url.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/i);
  if (ytMatch && ytMatch[1]) {
    return `https://www.youtube-nocookie.com/embed/${ytMatch[1]}`;
  }

  // YouTube embed URL
  const ytEmbed = url.match(/(?:https?:\/\/)?(?:www\.)?youtube(?:-nocookie)?\.com\/embed\/([a-zA-Z0-9_-]{11})/i);
  if (ytEmbed && ytEmbed[1]) {
    return `https://www.youtube-nocookie.com/embed/${ytEmbed[1]}`;
  }

  // Vimeo
  const vimeo = url.match(/(?:https?:\/\/)?(?:www\.)?vimeo\.com\/([0-9]+)/i);
  if (vimeo && vimeo[1]) {
    return `https://player.vimeo.com/video/${vimeo[1]}`;
  }

  // Loom
  const loom = url.match(/(?:https?:\/\/)?(?:www\.)?loom\.com\/(?:share|embed)\/([a-zA-Z0-9]+)/i);
  if (loom && loom[1]) {
    return `https://www.loom.com/embed/${loom[1]}`;
  }

  // Google Drive
  const drive = url.match(/(?:https?:\/\/)?drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/i);
  if (drive && drive[1]) {
    return `https://drive.google.com/file/d/${drive[1]}/preview`;
  }

  return null;
}

function isSafeUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== "string") return false;
  const trimmed = rawUrl.trim().toLowerCase();
  return (
    trimmed.startsWith("https://") ||
    trimmed.startsWith("http://") ||
    trimmed.startsWith("data:") ||
    trimmed.startsWith("blob:")
  );
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
    const groups = { Images: [], Videos: [], Animation: [], "Virtual Lab": [], CAD: [], Documents: [] };
    media.forEach((m) => {
      const tab = tabForType(m.file_type);
      if (groups[tab]) groups[tab].push(m);
    });

    if (mechanism?.animation_url) {
      const animLink = mechanism.animation_url.trim();
      if (animLink && !groups.Animation.some((v) => v.file_url === animLink)) {
        groups.Animation.push({
          id: "student-anim-url",
          mechanism_id: id,
          file_type: "animation",
          file_name: "Student Custom Animation",
          file_url: animLink,
          is_embed: true,
        });
      }
    }

    if (mechanism?.virtual_mechanism_url) {
      const vmLink = mechanism.virtual_mechanism_url.trim();
      if (vmLink && !groups["Virtual Lab"].some((v) => v.file_url === vmLink)) {
        groups["Virtual Lab"].push({
          id: "student-vm-url",
          mechanism_id: id,
          file_type: "virtual_mechanism",
          file_name: "Student Virtual Mechanism",
          file_url: vmLink,
          is_embed: true,
        });
      }
    }

    if (mechanism?.external_links && Array.isArray(mechanism.external_links)) {
      mechanism.external_links.forEach((link, idx) => {
        if (!link) return;
        const embed = getVideoEmbedUrl(link);
        if (embed && !groups.Videos.some((v) => v.file_url === link || v.file_url === embed)) {
          groups.Videos.push({
            id: `ext-video-${idx}`,
            mechanism_id: id,
            file_type: "video",
            file_name: `Working Demonstration Video`,
            file_url: embed,
            is_embed: true,
          });
        }
      });
    }

    return groups;
  }, [media, mechanism, id]);

  const analysis = useMemo(() => (mechanism ? analyzeMechanism(mechanism) : null), [mechanism]);

  const availableTabs = useMemo(
    () => TABS.filter((t) => {
      if (t === "Overview" || t === "Kinematic Solver" || t === "Animation" || t === "Virtual Lab") return true;
      return mediaByTab[t]?.length > 0;
    }),
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
                const base = window.location.href.split("#")[0];
                const shareUrl = `${base}#mechanism/${id}`;
                navigator.clipboard.writeText(shareUrl);
                setCopied(true);
                setTimeout(() => setCopied(false), 2200);
              } catch {
                navigator.clipboard.writeText(window.location.href);
                setCopied(true);
                setTimeout(() => setCopied(false), 2200);
              }
            }}
          >
            {copied ? "✓ Link Copied!" : "🔗 Share Link"}
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
            {tab === "Kinematic Solver" ? "⚙️ Movement Calculator" : tab === "Animation" ? "🌀 Animation" : tab === "Virtual Lab" ? "🔬 Virtual Lab" : tab}
          </button>
        ))}
      </div>

      <div className="tom-detail__panel">
        {activeTab === "Overview" ? (
          <OverviewPanel mechanism={mechanism} />
        ) : activeTab === "Virtual Lab" ? (
          <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: "24px" }}>
            {(mechanism.virtual_mechanism_url || (mediaByTab["Virtual Lab"] && mediaByTab["Virtual Lab"].length > 0)) && (
              <div style={{
                padding: "22px 24px",
                borderRadius: "20px",
                border: "1px solid rgba(56, 189, 248, 0.45)",
                background: "linear-gradient(135deg, rgba(56, 189, 248, 0.12), rgba(99, 102, 241, 0.06))",
                boxShadow: "0 10px 30px rgba(56, 189, 248, 0.15)",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 14 }}>
                  <div>
                    <span style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      fontSize: "0.72rem",
                      fontFamily: "var(--font-mono, monospace)",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      color: "#38bdf8",
                      letterSpacing: "0.08em"
                    }}>
                      ⚡ Student Virtual Mechanism
                    </span>
                    <h3 style={{ margin: "4px 0 0", color: "#f8fafc", fontSize: "1.15rem" }}>
                      Interactive Virtual Mechanism Simulation
                    </h3>
                  </div>
                  {mechanism.virtual_mechanism_url && isSafeUrl(mechanism.virtual_mechanism_url) && (
                    <a
                      href={getVideoEmbedUrl(mechanism.virtual_mechanism_url.trim()) || mechanism.virtual_mechanism_url.trim()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="primary-btn"
                      style={{ minHeight: "38px", padding: "0 20px", fontSize: "0.85rem" }}
                    >
                      Open Full Simulation ↗
                    </a>
                  )}
                </div>

                {mechanism.virtual_mechanism_url && isSafeUrl(mechanism.virtual_mechanism_url) && (
                  <div style={{
                    width: "100%",
                    height: "460px",
                    borderRadius: "14px",
                    overflow: "hidden",
                    border: "1px solid rgba(255, 255, 255, 0.12)",
                    background: "#070b14",
                    marginBottom: 12
                  }}>
                    <iframe
                      src={getVideoEmbedUrl(mechanism.virtual_mechanism_url.trim()) || mechanism.virtual_mechanism_url.trim()}
                      title="Student Virtual Mechanism"
                      sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-downloads"
                      style={{ width: "100%", height: "100%", border: 0 }}
                      allow="accelerometer; autoplay; encrypted-media; gyroscope; fullscreen"
                    />
                  </div>
                )}

                {mediaByTab["Virtual Lab"]?.filter((r) => r.id !== "student-vm-url").map((row) => (
                  <div key={row.id} style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "12px 16px",
                    background: "rgba(0,0,0,0.35)",
                    borderRadius: "12px",
                    border: "1px solid rgba(255,255,255,0.08)",
                    marginTop: 8
                  }}>
                    <span style={{ fontSize: "0.88rem", color: "#f8fafc", fontWeight: 600 }}>
                      📦 {row.file_name}
                    </span>
                    <div style={{ display: "flex", gap: 10 }}>
                      <a href={row.file_url} target="_blank" rel="noopener noreferrer" className="secondary-btn secondary-btn--cyan" style={{ minHeight: "34px", padding: "0 14px", fontSize: "0.78rem" }}>
                        View Simulation
                      </a>
                      <a href={row.file_url} download className="secondary-btn" style={{ minHeight: "34px", padding: "0 14px", fontSize: "0.78rem" }}>
                        Download
                      </a>
                      {isAdmin && (
                        <button type="button" className="icon-button icon-button--danger" onClick={() => handleDeleteMedia(row)} aria-label="Remove file">
                          🗑
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <FourBarVirtualLab initialMechanism={mechanism} />
          </div>
        ) : activeTab === "Kinematic Solver" ? (
          <KinematicWorkbench
            initialMechanism={mechanism}
            onApply={(updated) => {
              setMechanism((cur) => ({
                ...cur,
                num_links: updated.links,
                num_joints: updated.joints,
                higher_pairs: updated.higherPairs,
                degrees_of_freedom: updated.analysis.result,
              }));
              onChanged?.();
            }}
          />
        ) : (
          <MediaPanel
            items={mediaByTab[activeTab] || []}
            tab={activeTab}
            isAdmin={isAdmin}
            onDelete={handleDeleteMedia}
            mechanism={mechanism}
            analysis={analysis}
            onOpenVirtualLab={() => setActiveTab("Virtual Lab")}
          />
        )}
      </div>

      <h2 className="tom-detail__section-title">Mechanism Specifications</h2>
      <div className="tom-spec-grid">
        <SpecCard label="Parts / Links" value={mechanism.num_links ?? analysis?.links ?? 4} />
        <SpecCard label="Joints" value={mechanism.num_joints ?? analysis?.joints ?? 4} />
        <SpecCard label="Contact Points" value={mechanism.higher_pairs ?? analysis?.higherPairs ?? 0} />
        <SpecCard label="Movement Type" value={analysis?.result ? `${analysis.result} DOF` : `${mechanism.degrees_of_freedom ?? 1} DOF`} />
        <SpecCard label="Joint Type" value={mechanism.kinematic_pairs || "Pin / Pivot Joints"} />
        <SpecCard label="Driver / Input" value={mechanism.input_link || "Link 1 (Driver)"} />
        <SpecCard label="Output Movement" value={mechanism.output_link || "Output / Rocker"} />
      </div>
      {analysis && (
        <div className={`analysis-status analysis-status--${analysis.status}`} style={{ margin: "16px 0" }}>
          <div>
            <span className="analysis-status__eyebrow">Mobility Classification</span>
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
              <li key={url}><a href={url} target="_blank" rel="noopener noreferrer">{url}</a></li>
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
  const rawCover = mechanism.cover_image || mechanism.preview_image_url || mechanism.image || null;
  const cover =
    rawCover && typeof rawCover === "string" && !rawCover.startsWith("data:image/svg+xml")
      ? rawCover
      : null;

  return (
    <div className="tom-overview">
      {cover && (
        <div className="tom-overview__media-hero" style={{ marginBottom: 20, borderRadius: 16, overflow: "hidden", border: "1px solid var(--border)", maxHeight: 380, background: "rgba(0,0,0,0.2)" }}>
          <img
            src={cover}
            alt={mechanism.name}
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
            style={{ width: "100%", maxHeight: 380, objectFit: "cover", display: "block" }}
          />
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

function VideoPlayerItem({ row }) {
  const embedUrl = getVideoEmbedUrl(row.file_url);
  if (embedUrl || row.is_embed) {
    const src = embedUrl || row.file_url;
    return (
      <div
        className="tom-media-item__iframe-wrap"
        style={{
          position: "relative",
          width: "100%",
          paddingBottom: "56.25%",
          height: 0,
          borderRadius: "12px",
          overflow: "hidden",
          background: "#000",
        }}
      >
        <iframe
          src={src}
          title={row.file_name || "Video Demonstration"}
          style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: 0 }}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>
    );
  }
  return <video className="tom-media-item__video" src={row.file_url} controls preload="metadata" />;
}

function MediaPanel({ items, tab, isAdmin, onDelete, mechanism, analysis, onOpenVirtualLab }) {
  if (tab === "Animation") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {mechanism && analysis && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 10 }}>
              <p style={{ margin: 0, color: "var(--muted)", font: "500 0.9rem var(--font-body)" }}>
                Interactive animation showing how this mechanism moves:
              </p>
              {onOpenVirtualLab && (
                <button
                  type="button"
                  className="button button--secondary button--toolbar"
                  onClick={onOpenVirtualLab}
                  style={{ fontSize: "0.84rem", borderColor: "rgba(56, 189, 248, 0.4)", color: "#38bdf8", display: "inline-flex", alignItems: "center", gap: 6 }}
                >
                  🔬 Open Mechanism Simulator →
                </button>
              )}
            </div>
            <MechanismPreview mechanism={mechanism} analysis={analysis} />
          </div>
        )}
        {items.length > 0 && (
          <div className="tom-media-gallery" style={{ marginTop: 12 }}>
            {items.map((row) => (
              <div key={row.id} className="tom-media-item">
                <VideoPlayerItem row={row} />
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
            <VideoPlayerItem row={row} />
          ) : row.file_type === "image" || row.file_type === "drawing" ? (
            <img className="tom-media-item__image" src={row.file_url} alt={row.file_name} />
          ) : (
            <a className="tom-media-item__file" href={row.file_url} target="_blank" rel="noopener noreferrer">
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
        <a className="button button--secondary" href={row.file_url} target="_blank" rel="noopener noreferrer">View</a>
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
