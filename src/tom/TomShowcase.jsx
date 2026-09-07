import { useEffect, useMemo, useState } from "react";
import { TOM_CATEGORIES, tomCategoryMeta } from "./tomConstants";
import { fetchApprovedMechanisms, fetchPendingMechanisms, submitMechanism, approveMechanism, rejectMechanism } from "./tomApi";
import { isSupabaseConfigured } from "../lib/supabaseClient";
import { getMechanismPoster } from "./mechanismDrawings";
import MechanismCard from "./MechanismCard.jsx";
import MechanismForm from "./MechanismForm.jsx";
import MechanismDetail from "./MechanismDetail.jsx";

export default function TomShowcase({ isAdmin, onRequestAdminLogin, onRequestAddMechanism }) {
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
  const [viewMode, setViewMode] = useState("grid"); // "grid" | "table"
  const [sortBy, setSortBy] = useState("newest"); // "newest" | "name" | "dof"

  async function loadApproved() {
    setLoading(true);
    const { data, error } = await fetchApprovedMechanisms();
    if (error && isSupabaseConfigured) {
      setDbError(error.message || "Could not load mechanisms from Supabase. Check your connection or table schema.");
    } else {
      setDbError("");
    }
    setMechanisms(data || []);
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

  const sortedAndFiltered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = mechanisms.filter((m) => {
      if (activeCat && m.category !== activeCat) return false;
      if (!q) return true;
      return [m.name, m.category, m.student_name, m.college]
        .some((v) => (v || "").toLowerCase().includes(q));
    });

    if (sortBy === "name") {
      return [...list].sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    }
    if (sortBy === "dof") {
      return [...list].sort((a, b) => (b.degrees_of_freedom ?? 1) - (a.degrees_of_freedom ?? 1));
    }
    return list;
  }, [mechanisms, activeCat, search, sortBy]);

  function flash(msg) {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(""), 3000);
  }

  async function handleSubmitMechanism(formValues, filesByType) {
    setFormError("");
    if (!formValues.name.trim() || !formValues.category.trim() || !formValues.student_name.trim()) {
      setFormError("Mechanism name, category, and student name are required.");
      return;
    }
    setSubmitting(true);
    const enrichedValues = {
      ...formValues,
      college: "NMIET",
      department: "Mechanical Engineering",
    };
    const { error, uploadErrors } = await submitMechanism(enrichedValues, filesByType);
    setSubmitting(false);

    if (error) {
      setFormError("Failed to submit mechanism. Please try again.");
      return;
    }
    setShowForm(false);
    flash(
      uploadErrors?.length
        ? `Mechanism published! (${uploadErrors.length} file(s) failed to upload)`
        : "Mechanism submitted and published live in the repository!"
    );
    await loadApproved();
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
    <section className="tom-showcase">
      {/* ── HEADER ─────────────────────────────────────────────────────── */}
      <div className="tom-showcase__hero">
        <div className="hero-badge">
          <span className="hero-badge__dot" />
          Cloud Repository · NMIET Mechanical
        </div>
        <h1 className="hero-title">
          Theory of Machines <span>Cloud Repository</span>
        </h1>
        <p className="hero-copy">
          The central repository for kinematic mechanisms, interactive simulations, and student projects from NMIET Mechanical Engineering — complete with live motion animations, Grübler DOF calculations, technical drawings, demonstration videos, and CAD models.
        </p>
      </div>

      {!isSupabaseConfigured && (
        <div style={{
          padding: "14px 18px", marginBottom: 20,
          background: "rgba(251, 191, 36, 0.08)", border: "1px solid rgba(251, 191, 36, 0.25)",
          borderRadius: 14, color: "var(--text)", fontSize: "0.88rem", lineHeight: 1.5
        }}>
          <strong style={{ color: "var(--gold)", display: "block", marginBottom: 3 }}>
            💡 Cloud Repository Active (Local &amp; Interactive Mode)
          </strong>
          Built-in kinematic mechanism models and all new student submissions are live with animated simulations and calculations. Add your <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON</code> in <code>.env</code> whenever you wish to enable multi-device cloud synchronization.
        </div>
      )}

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

      <div className="controls-panel">
        <div className="controls-row">
          <div className="search-box">
            <span className="search-box__icon" aria-hidden="true">⌕</span>
            <input
              className="search-box__input"
              placeholder="Search mechanism, category, student, or college..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button type="button" className="button button--primary button--toolbar"
            onClick={() => {
              if (onRequestAddMechanism) {
                onRequestAddMechanism();
              } else {
                setShowForm((v) => !v);
                setFormError("");
              }
            }}>
            {showForm ? "✕ Close Form" : "+ Add Mechanism"}
          </button>
          {isAdmin && pending.length > 0 && (
            <button type="button" className="button button--secondary button--toolbar"
              onClick={() => setShowPending((v) => !v)}>
              🔔 Pending ({pending.length})
            </button>
          )}
        </div>

        <div className="category-row">
          <button type="button"
            className={`category-pill${activeCat ? "" : " category-pill--active"}`}
            onClick={() => setActiveCat("")}>
            All
          </button>
          {TOM_CATEGORIES.map((cat) => {
            const meta = tomCategoryMeta(cat);
            const isActive = activeCat === cat;
            return (
              <button key={cat} type="button"
                className={`category-pill${isActive ? " category-pill--active" : ""}`}
                style={{ "--pill-color": meta.color, "--pill-bg": `${meta.color}22`, "--pill-border": `${meta.color}55` }}
                onClick={() => setActiveCat(isActive ? "" : cat)}>
                <span>{meta.icon}</span><span>{cat}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="repository-meta-bar">
        <div className="repository-meta-bar__left">
          <span className="repository-count-tag">
            Showing <strong>{sortedAndFiltered.length}</strong> of <strong>{mechanisms.length}</strong> mechanisms
          </span>
          {activeCat && (
            <span className="active-filter-pill">
              Category: {activeCat} <button type="button" onClick={() => setActiveCat("")} aria-label="Clear category filter">×</button>
            </span>
          )}
        </div>

        <div className="repository-meta-bar__right">
          <label className="sort-label">
            <span>Sort by:</span>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="sort-select">
              <option value="newest">Newest First</option>
              <option value="name">Alphabetical (A-Z)</option>
              <option value="dof">Mobility (DOF)</option>
            </select>
          </label>

          <div className="view-mode-toggle" role="group" aria-label="View mode">
            <button
              type="button"
              className={`view-mode-btn${viewMode === "grid" ? " view-mode-btn--active" : ""}`}
              onClick={() => setViewMode("grid")}
              title="Card Grid View"
            >
              ⊞ Grid
            </button>
            <button
              type="button"
              className={`view-mode-btn${viewMode === "table" ? " view-mode-btn--active" : ""}`}
              onClick={() => setViewMode("table")}
              title="Engineering Data Table View"
            >
              ☰ Table
            </button>
          </div>
        </div>
      </div>

      {isAdmin && showPending && (
        <div className="tom-pending-queue">
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

      {showForm ? (
        <div className="submit-page-shell" style={{ marginTop: 24 }}>
          <div className="submit-page-topbar">
            <button
              type="button"
              className="back-btn"
              onClick={() => setShowForm(false)}
            >
              ← Back to Showcase List
            </button>
            <span className="submit-page-badge">
              🏛 NMIET · Mechanical Engineering
            </span>
          </div>

          <MechanismForm
            onCancel={() => setShowForm(false)}
            onSubmit={async (vals, files) => {
              await handleSubmitMechanism(vals, files);
            }}
            submitting={submitting}
            formError={formError}
          />
        </div>
      ) : (
        <>
          {loading ? (
            <section className="empty-state">
              <div className="empty-state__icon" style={{ animation: "spin 1s linear infinite" }}>⚙️</div>
              <h2 className="empty-state__title">Loading mechanisms…</h2>
            </section>
          ) : sortedAndFiltered.length === 0 ? (
            <section className="empty-state">
              <div className="empty-state__icon">🔍</div>
              <h2 className="empty-state__title">No mechanisms found</h2>
              <p className="empty-state__copy">
                Try another keyword, clear the category filter, or add the first mechanism to this category.
              </p>
            </section>
          ) : viewMode === "table" ? (
            <div className="engineering-table-container">
              <table className="engineering-table">
                <thead>
                  <tr>
                    <th>Mechanism Name</th>
                    <th>Category</th>
                    <th>Planar DOF (F)</th>
                    <th>Links (L)</th>
                    <th>Joints (J)</th>
                    <th>Student / Contributor</th>
                    <th>Institute</th>
                    <th style={{ textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedAndFiltered.map((m) => (
                    <tr key={m.id} onClick={() => setSelectedId(m.id)} style={{ cursor: "pointer" }}>
                      <td>
                        <div className="table-mechanism-cell">
                          <img
                            src={getMechanismPoster(m)}
                            alt={m.name}
                            style={{ width: 42, height: 42, borderRadius: 8, objectFit: "cover", flexShrink: 0, border: "1px solid var(--border)" }}
                          />
                          <div>
                            <strong>{m.name}</strong>
                            <span className="table-subtext">{m.short_description?.slice(0, 48)}...</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="category-pill" style={{ padding: "4px 10px", fontSize: "0.72rem" }}>
                          {m.category}
                        </span>
                      </td>
                      <td>
                        <span className="table-dof-badge">
                          F = {m.degrees_of_freedom ?? 1}
                        </span>
                      </td>
                      <td>{m.num_links ?? 4}</td>
                      <td>{m.num_joints ?? 4}</td>
                      <td><strong>{m.student_name}</strong></td>
                      <td>{m.college || "NMIET"}</td>
                      <td style={{ textAlign: "right" }}>
                        <button
                          type="button"
                          className="button button--card"
                          style={{ padding: "6px 14px", minHeight: 34, fontSize: "0.8rem" }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedId(m.id);
                          }}
                        >
                          Explore →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <section className="tom-grid">
              {sortedAndFiltered.map((m) => (
                <MechanismCard
                  key={m.id}
                  mechanism={m}
                  mediaCount={m.tom_mechanism_media?.[0]?.count}
                  onView={setSelectedId}
                />
              ))}
            </section>
          )}

          {!isAdmin && (
            <p className="tom-showcase__admin-hint">
              Reviewing submissions? <button type="button" className="tom-link-btn" onClick={onRequestAdminLogin}>Log in as admin</button>
            </p>
          )}
        </>
      )}
    </section>
  );
}
