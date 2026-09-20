import { useEffect, useMemo, useState } from "react";
import { tomCategoryMeta } from "./tomConstants";
import { fetchMechanismDetail, deleteMechanism, deleteMechanismMedia, approveMechanism, rejectMechanism } from "./tomApi";
import { analyzeMechanism } from "./kinematics.js";

import { lazy, Suspense } from "react";
const Mechanism3DViewer = lazy(() => import("./Mechanism3DViewer.jsx"));

const TABS = ["Overview", "Animation", "Images", "Videos", "CAD / 3D", "Documents"];

function tabForType(type) {
  if (type === "image" || type === "drawing") return "Images";
  if (type === "video") return "Videos";
  if (type === "animation") return "Animation";
  if (type === "cad") return "CAD / 3D";
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
  try {
    const parsed = new URL(rawUrl.trim());
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

function isHtmlAnimationUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== "string") return false;
  if (!isSafeUrl(rawUrl)) return false;
  const u = rawUrl.trim().toLowerCase();
  return (
    u.endsWith(".html") ||
    u.endsWith(".htm") ||
    u.includes(".html?") ||
    u.includes(".htm?")
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

  const htmlAnimationUrl = useMemo(() => {
    if (mechanism?.html_animation_url && isHtmlAnimationUrl(mechanism.html_animation_url)) {
      return mechanism.html_animation_url.trim();
    }
    if (mechanism?.animation_url && isHtmlAnimationUrl(mechanism.animation_url)) {
      return mechanism.animation_url.trim();
    }
    const animRow = media.find((m) => m.file_type === "animation" && isHtmlAnimationUrl(m.file_url));
    if (animRow) return animRow.file_url.trim();
    if (Array.isArray(mechanism?.external_links)) {
      const link = mechanism.external_links.find((l) => isHtmlAnimationUrl(l));
      if (link) return link.trim();
    }
    return null;
  }, [mechanism, media]);

  const mediaByTab = useMemo(() => {
    const groups = { Images: [], Videos: [], Animation: [], "Virtual Lab": [], Documents: [] };
    media.forEach((m) => {
      const tab = tabForType(m.file_type);
      if (groups[tab]) groups[tab].push(m);
    });


    if (htmlAnimationUrl && !groups.Animation.some((v) => v.file_url === htmlAnimationUrl)) {
      groups.Animation.unshift({
        id: "student-html-anim-url",
        mechanism_id: id,
        file_type: "animation",
        file_name: "Interactive HTML Mechanism Animation",
        file_url: htmlAnimationUrl,
        is_embed: true,
        is_html: true,
      });
    } else if (mechanism?.animation_url) {
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
  }, [media, mechanism, id, htmlAnimationUrl]);

  const analysis = useMemo(() => (mechanism ? analyzeMechanism(mechanism) : null), [mechanism]);

  const availableTabs = useMemo(
    () =>
      TABS.filter((t) => {
        if (t === "Overview" || t === "Animation") return true;
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
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 8 }}>
          <div className="tom-detail__category-badge">
            <span>{meta.icon}</span><span>{mechanism.category || "Other"}</span>
          </div>
          {htmlAnimationUrl && (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "4px 12px",
                borderRadius: "999px",
                background: "rgba(56, 189, 248, 0.15)",
                border: "1px solid rgba(56, 189, 248, 0.35)",
                color: "#38bdf8",
                fontSize: "0.78rem",
                fontWeight: 700,
                letterSpacing: "0.02em",
              }}
            >
              🌐 Interactive HTML Animation Available
            </span>
          )}
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
            {tab === "Animation" ? (htmlAnimationUrl ? "🌐 HTML Animation" : "🌀 Animation") : tab}
          </button>
        ))}
      </div>


      <div className="tom-detail__panel">
        {activeTab === "Overview" ? (
          <OverviewPanel mechanism={mechanism} htmlAnimationUrl={htmlAnimationUrl} />
        ) : (
          <MediaPanel
            items={mediaByTab[activeTab] || []}
            tab={activeTab}
            isAdmin={isAdmin}
            onDelete={handleDeleteMedia}
            mechanism={mechanism}
            htmlAnimationUrl={htmlAnimationUrl}
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
            {mechanism.external_links.filter(isSafeUrl).map((url) => (
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

function OverviewPanel({ mechanism, htmlAnimationUrl }) {
  const [reloadKey, setReloadKey] = useState(0);
  const rawCover = mechanism.cover_image || mechanism.preview_image_url || mechanism.image || null;
  const cover =
    rawCover && typeof rawCover === "string" && !rawCover.startsWith("data:image/svg+xml")
      ? rawCover
      : null;

  return (
    <div className="tom-overview">
      {/* ── INTERACTIVE HTML ANIMATION (EMBEDDED ON MECHANISM PAGE) ── */}
      {htmlAnimationUrl && (
        <div
          style={{
            marginBottom: 24,
            borderRadius: 18,
            overflow: "hidden",
            border: "1px solid rgba(56, 189, 248, 0.4)",
            background: "linear-gradient(135deg, rgba(56, 189, 248, 0.1), rgba(14, 165, 233, 0.04))",
            boxShadow: "0 12px 32px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(56, 189, 248, 0.15)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "12px 18px",
              background: "rgba(10, 16, 28, 0.88)",
              borderBottom: "1px solid rgba(56, 189, 248, 0.2)",
              flexWrap: "wrap",
              gap: 10,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: "1.25rem" }}>🌐</span>
              <div>
                <strong style={{ color: "#f8fafc", fontSize: "0.98rem", display: "block" }}>
                  Interactive Mechanism Animation
                </strong>
                <span style={{ fontSize: "0.76rem", color: "#38bdf8", fontFamily: "var(--font-mono, monospace)" }}>
                  HTML Animation (.html) · Submitted by {mechanism.student_name || "Student"}
                </span>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <button
                type="button"
                className="secondary-btn secondary-btn--small"
                style={{ padding: "5px 12px", fontSize: "0.78rem" }}
                onClick={() => setReloadKey((k) => k + 1)}
                title="Restart Animation"
              >
                🔄 Reload Animation
              </button>
              <a
                href={isSafeUrl(htmlAnimationUrl) ? htmlAnimationUrl : "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="primary-btn"
                style={{ padding: "5px 14px", fontSize: "0.78rem", minHeight: "32px", textDecoration: "none" }}
              >
                Open Fullscreen ↗
              </a>
            </div>
          </div>

          <div style={{ width: "100%", height: "480px", background: "#050811", position: "relative" }}>
            <iframe
              key={reloadKey}
              src={htmlAnimationUrl}
              title={`${mechanism.name} Interactive HTML Animation`}
              sandbox="allow-scripts allow-popups allow-forms"
              style={{ width: "100%", height: "100%", border: 0, display: "block" }}
              allow="accelerometer; autoplay; encrypted-media; gyroscope"
            />
          </div>
        </div>
      )}

      {cover && !htmlAnimationUrl && (
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
          sandbox="allow-scripts allow-same-origin allow-popups allow-presentation"
          allowFullScreen
        />
      </div>
    );
  }
  return <video className="tom-media-item__video" src={row.file_url} controls preload="metadata" />;
}

function MediaPanel({ items, tab, isAdmin, onDelete, mechanism, htmlAnimationUrl, onOpenVirtualLab }) {
  const [animReloadKey, setAnimReloadKey] = useState(0);

  if (tab === "Animation") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {/* Featured Student HTML Animation */}
        {htmlAnimationUrl && (
          <div
            style={{
              borderRadius: 18,
              overflow: "hidden",
              border: "1px solid rgba(56, 189, 248, 0.4)",
              background: "linear-gradient(135deg, rgba(56, 189, 248, 0.1), rgba(14, 165, 233, 0.04))",
              boxShadow: "0 10px 30px rgba(0, 0, 0, 0.4)",
              marginBottom: 10,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "12px 18px",
                background: "rgba(10, 16, 28, 0.88)",
                borderBottom: "1px solid rgba(56, 189, 248, 0.2)",
                flexWrap: "wrap",
                gap: 8,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: "1.2rem" }}>🌐</span>
                <strong style={{ fontSize: "0.95rem", color: "#38bdf8" }}>
                  Interactive Mechanism Animation (HTML)
                </strong>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <button
                  type="button"
                  className="secondary-btn secondary-btn--small"
                  onClick={() => setAnimReloadKey((k) => k + 1)}
                >
                  🔄 Reload
                </button>
                <a
                  href={isSafeUrl(htmlAnimationUrl) ? htmlAnimationUrl : "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="primary-btn"
                  style={{ padding: "5px 14px", fontSize: "0.78rem", minHeight: "32px", textDecoration: "none" }}
                >
                  Open Full View ↗
                </a>
              </div>
            </div>
            <div style={{ width: "100%", height: "500px", background: "#050811" }}>
              <iframe
                key={animReloadKey}
                src={htmlAnimationUrl}
                title={`${mechanism?.name || "Mechanism"} Interactive Animation`}
                sandbox="allow-scripts allow-popups allow-forms"
                style={{ width: "100%", height: "100%", border: 0, display: "block" }}
                allow="accelerometer; autoplay; encrypted-media; gyroscope"
              />
            </div>
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

        {!htmlAnimationUrl && items.length === 0 && (
          <div style={{ textAlign: "center", padding: "32px 16px" }}>
            <p className="tom-overview__empty" style={{ margin: "0 0 14px" }}>
              No animation uploaded yet by student.
            </p>
            {onOpenVirtualLab && (
              <button
                type="button"
                className="button button--secondary"
                onClick={onOpenVirtualLab}
                style={{ borderColor: "rgba(56, 189, 248, 0.4)", color: "#38bdf8" }}
              >
                🔬 Open Virtual Lab Simulator for this Mechanism →
              </button>
            )}
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
          ) : row.file_type === "cad" ? (
            <Suspense fallback={<div style={{ height: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#38bdf8' }}>Loading 3D Viewer...</div>}>
              <Mechanism3DViewer url={row.file_url} />
            </Suspense>
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
