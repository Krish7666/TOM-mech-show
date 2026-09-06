import { useEffect, useMemo, useState, useCallback } from "react";
import { TOM_CATEGORIES, tomCategoryMeta } from "./tomConstants";
import { fetchApprovedMechanisms, fetchPendingMechanisms, submitMechanism, approveMechanism, rejectMechanism } from "./tomApi";
import MechanismCard from "./MechanismCard.jsx";
import MechanismForm from "./MechanismForm.jsx";
import MechanismDetail from "./MechanismDetail.jsx";

export default function TomShowcase({ isAdmin, onRequestAdminLogin }) {
  const [mechanisms, setMechanisms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState("");
  const [search, setSearch] = useState("");
  const [activeCat, setActiveCat] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [showPending, setShowPending] = useState(false);
  const [pending, setPending] = useState([]);

  async function loadApproved() {
    setLoading(true);
    const { data, error } = await fetchApprovedMechanisms();
    if (error) setDbError("Could not load mechanisms. Check your Supabase / TOM table setup.");
    else setDbError("");
    setMechanisms(data);
    setLoading(false);
  }

  async function loadPending() {
    const { data } = await fetchPendingMechanisms();
    setPending(data);
  }

  useEffect(() => {
    async function run() { await loadApproved(); }
    run();
  }, []);

  useEffect(() => {
    async function run() { if (isAdmin) await loadPending(); }
    run();
  }, [isAdmin]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return mechanisms.filter((m) => {
      if (activeCat && m.category !== activeCat) return false;
      if (!q) return true;
      return [m.name, m.category, m.student_name, m.college]
        .some((v) => (v || "").toLowerCase().includes(q));
    });
  }, [mechanisms, activeCat, search]);

  function flash(msg) {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(""), 3000);
  }

  const handleSetSelectedId = useCallback((id) => {
    setSelectedId(id);
  }, []);

  const handleRequestAdminLoginWrapper = useCallback(() => {
    onRequestAdminLogin();
  }, [onRequestAdminLogin]);

  async function handleSubmitMechanism(formValues, filesByType) {
    setFormError("");
    if (!formValues.name.trim() || !formValues.category.trim() || !formValues.student_name.trim()) {
      setFormError("Mechanism name, category, and student name are required.");
      return;
    }
    setSubmitting(true);
    const { error, uploadErrors } = await submitMechanism(formValues, filesByType);
    setSubmitting(false);

    if (error) {
      setFormError("Failed to submit mechanism. Please try again.");
      return;
    }
    setShowForm(false);
    flash(
      uploadErrors?.length
        ? `Submitted for review — ${uploadErrors.length} file(s) failed to upload.`
        : "Mechanism submitted! It will appear once an admin approves it."
    );
    if (isAdmin) loadPending();
  }

  async function handleQuickApprove(id) {
    await approveMechanism(id);
    loadPending();
    loadApproved();
    flash("Mechanism approved.");
  }

  async function handleQuickReject(id) {
    await rejectMechanism(id);
    loadPending();
    flash("Mechanism rejected.");
  }

  if (selectedId) {
    return (
      <MechanismDetail
        id={selectedId}
        isAdmin={isAdmin}
        onBack={() => setSelectedId(null)}
        onChanged={() => { loadApproved(); if (isAdmin) loadPending(); }}
      />
    );
  }

  return (
    <section className="tom-showcase" aria-label="TOM Mechanism Showcase">
      {/* ── HEADER ─────────────────────────────────────────────────────── */}
      <div className="tom-showcase__hero" role="banner">
        <div className="hero-badge" aria-label="TOM Mechanism Showcase badge">
          <span className="hero-badge__dot" />
          TOM Mechanism Showcase
        </div>
        <h1 className="hero-title">
          Theory of Machines <span>Showcase</span>
        </h1>
        <p className="hero-copy">
          Explore student-built mechanisms with live kinematic analysis — four-bar linkages, 
          slider-cranks, cam systems, and more. Every submission includes drawings, videos, 
          CAD files, and technical breakdowns validated with Grubler's equation.
        </p>
      </div>

      {dbError && (
        <div style={{
          padding: "14px 20px", marginBottom: 16,
          background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)",
          borderRadius: 16, color: "#fca5a5", fontSize: "0.9rem",
        }}>
          ⚠️ {dbError}
        </div>
      )}

      {successMsg && <div className="toast toast--success">{successMsg}</div>}

      {/* ── CONTROLS ───────────────────────────────────────────────────── */}
      <div className="controls-panel">
        <div className="controls-row">
          <div className="search-box">
            <span className="search-box__icon" aria-hidden="true">⌕</span>
            <input
              className="search-box__input"
              placeholder="Search mechanism, category, student, or college..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search mechanisms"
            />
          </div>
          <button type="button" className="button button--primary button--toolbar"
            onClick={() => { setShowForm((v) => !v); setFormError(""); }}
            aria-pressed={showForm}
            aria-expanded={showForm}
            aria-controls="mechanism-form">
            {showForm ? "✕ Close Panel" : "+ Add Mechanism"}
          </button>
          {isAdmin && pending.length > 0 && (
            <button type="button" className="button button--secondary button--toolbar"
              onClick={() => setShowPending((v) => !v)}
              aria-pressed={showPending}
              aria-expanded={showPending}
              aria-controls="pending-queue">
              🔔 Pending ({pending.length})
            </button>
          )}
        </div>

        <div className="category-row" role="group" aria-label="Filter by mechanism category">
          <button type="button"
            className={`category-pill${activeCat ? "" : " category-pill--active"}`}
            onClick={() => setActiveCat("")}
            aria-pressed={!activeCat}
            aria-current={!activeCat ? "true" : "false"}>
            All
          </button>
          {TOM_CATEGORIES.map((cat) => {
            const meta = tomCategoryMeta(cat);
            const isActive = activeCat === cat;
            return (
              <button key={cat} type="button"
                className={`category-pill${isActive ? " category-pill--active" : ""}`}
                style={{ "--pill-color": meta.color, "--pill-bg": `${meta.color}22`, "--pill-border": `${meta.color}55` }}
                onClick={() => setActiveCat(isActive ? "" : cat)}
                aria-pressed={isActive}
                aria-current={isActive ? "true" : "false"}>
                <span aria-hidden="true">{meta.icon}</span><span>{cat}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── ADMIN PENDING QUEUE ────────────────────────────────────────── */}
      {isAdmin && showPending && (
        <div className="tom-pending-queue" id="pending-queue" aria-label="Pending review queue">
          <h3 className="tom-form__section-title">Pending Review</h3>
          {pending.length === 0 ? (
            <p className="tom-overview__empty">Nothing waiting for review.</p>
          ) : (
            pending.map((m) => (
              <div key={m.id} className="tom-pending-row">
                <button type="button" className="tom-pending-row__name" onClick={() => setSelectedId(m.id)}>
                  {m.name} <span className="tom-pending-row__cat">· {m.category}</span>
                </button>
                <span className="tom-pending-row__student">{m.student_name}</span>
                <div className="tom-pending-row__actions">
                  <button type="button" className="button button--primary" onClick={() => handleQuickApprove(m.id)}>Approve</button>
                  <button type="button" className="button button--danger" onClick={() => handleQuickReject(m.id)}>Reject</button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ── ADD MECHANISM FORM ─────────────────────────────────────────── */}
      {showForm && (
        <MechanismForm
          onCancel={() => setShowForm(false)}
          onSubmit={handleSubmitMechanism}
          submitting={submitting}
          formError={formError}
        />
      )}

      {/* ── GRID ───────────────────────────────────────────────────────── */}
      {loading ? (
        <section className="empty-state" aria-busy="true" aria-label="Loading mechanisms">
          <div className="empty-state__icon" style={{ animation: "spin 1s linear infinite" }}>⚙️</div>
          <h2 className="empty-state__title">Loading mechanisms…</h2>
        </section>
      ) : filtered.length === 0 ? (
        <section className="empty-state" aria-label="No mechanisms found">
          <div className="empty-state__icon">🔍</div>
          <h2 className="empty-state__title">No mechanisms found</h2>
          <p className="empty-state__copy">
            Try another keyword, clear the category filter, or add the first mechanism to this category.
          </p>
        </section>
      ) : (
        <section className="tom-grid" aria-label={`Showing ${filtered.length} mechanism${filtered.length === 1 ? "" : "s"}`}>
          {filtered.map((m) => (
            <MechanismCard
              key={m.id}
              mechanism={m}
              mediaCount={m.tom_mechanism_media?.[0]?.count}
              onView={handleSetSelectedId}
            />
          ))}
        </section>
      )}

      {!isAdmin && (
        <p className="tom-showcase__admin-hint">
          Reviewing submissions? <button type="button" className="tom-link-btn" onClick={handleRequestAdminLoginWrapper}>Log in as admin</button>
        </p>
      )}
    </section>
  );
}
