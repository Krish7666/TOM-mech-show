import { useEffect, useMemo, useState } from "react";
import { tomCategoryMeta } from "./tomConstants";
import { submitMechanism, approveMechanism, rejectMechanism } from "./tomApi";
import { isSupabaseConfigured } from "../lib/supabaseClient";
import { useMechanisms } from "../context/MechanismsContext.jsx";
import MechanismCard from "./MechanismCard.jsx";
import MechanismForm from "./MechanismForm.jsx";
import MechanismDetail from "./MechanismDetail.jsx";

export default function TomShowcase({ isAdmin, onRequestAdminLogin, onRequestAddMechanism }) {
  // Data from shared context — no extra Supabase call here
  const { mechanisms, pendingMechanisms: pending, loading, refreshData } = useMechanisms();

  const [dbError] = useState("");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [showPending, setShowPending] = useState(false);
  const [viewMode, setViewMode] = useState("grid"); // "grid" | "table"
  const [sortBy, setSortBy] = useState("newest"); // "newest" | "name" | "dof"
  const [dofFilter, setDofFilter] = useState("all"); // "all" | "1" | "multi" | "structure"
  const [yearFilter, setYearFilter] = useState("all"); // "all" | "SE Mech" | "TE Mech" | "BE Mech"


  useEffect(() => {
    function parseHash() {
      const hash = window.location.hash.replace(/^#\/?/, "");
      if (hash.startsWith("mechanism/")) {
        const id = hash.replace("mechanism/", "");
        if (id) setSelectedId(id);
      } else if (hash === "repository" || hash === "models") {
        setSelectedId(null);
      }
    }
    parseHash();
    window.addEventListener("hashchange", parseHash);
    return () => window.removeEventListener("hashchange", parseHash);
  }, []);

  useEffect(() => {
    const currentHash = window.location.hash.replace(/^#\/?/, "");
    if (selectedId) {
      if (currentHash !== `mechanism/${selectedId}`) {
        window.location.hash = `mechanism/${selectedId}`;
      }
    } else if (currentHash.startsWith("mechanism/")) {
      window.location.hash = "repository";
    }
  }, [selectedId]);

  function handleSelectMechanism(id) {
    setSelectedId(id);
  }

  const sortedAndFiltered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = mechanisms.filter((m) => {
      if (dofFilter === "1" && (m.degrees_of_freedom ?? 1) !== 1) return false;
      if (dofFilter === "multi" && (m.degrees_of_freedom ?? 1) <= 1) return false;
      if (dofFilter === "structure" && (m.degrees_of_freedom ?? 1) > 0) return false;
      if (yearFilter !== "all" && (m.academic_year || "").toLowerCase() !== yearFilter.toLowerCase()) return false;
      if (!q) return true;
      return [
        m.name,
        m.category,
        m.student_name,
        m.team_members,
        m.short_description,
        m.detailed_description,
        m.applications,
        m.working_principle,
        m.college,
        m.academic_year,
      ].some((v) => (v || "").toLowerCase().includes(q));
    });

    if (sortBy === "name") {
      return [...list].sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    }
    if (sortBy === "dof") {
      return [...list].sort((a, b) => (b.degrees_of_freedom ?? 1) - (a.degrees_of_freedom ?? 1));
    }
    return list;
  }, [mechanisms, search, sortBy, dofFilter, yearFilter]);


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
    const { error, hasBlobOnlyFiles } = await submitMechanism(enrichedValues, filesByType);
    setSubmitting(false);

    if (error) {
      setFormError("Failed to submit mechanism. Please try again.");
      return;
    }
    setShowForm(false);
    flash(
      hasBlobOnlyFiles
        ? "Mechanism submitted! ⚠️ Large file(s) are session-only — upload to Supabase to persist."
        : "✅ Mechanism published live to the cloud repository!"
    );
    await refreshData();
  }

  async function handleQuickApprove(id) {
    await approveMechanism(id);
    await refreshData();
    flash("Mechanism approved.");
  }

  async function handleQuickReject(id) {
    await rejectMechanism(id);
    await refreshData();
    flash("Mechanism rejected.");
  }


  if (selectedId) {
    return (
      <MechanismDetail
        id={selectedId}
        isAdmin={isAdmin}
        onBack={() => handleSelectMechanism(null)}
        onChanged={() => refreshData()}
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
          The central repository for kinematic mechanisms, interactive simulations, and student projects from NMIET Mechanical Engineering — complete with live motion animations, mobility &amp; DOF calculations, technical drawings, and demonstration videos.
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
      </div>

      <div className="repository-meta-bar">
        <div className="repository-meta-bar__left">
          <span className="repository-count-tag">
            Showing <strong>{sortedAndFiltered.length}</strong> of <strong>{mechanisms.length}</strong> mechanisms
          </span>
        </div>

        <div className="repository-meta-bar__right">
          <label className="sort-label">
            <span>Class:</span>
            <select value={yearFilter} onChange={(e) => setYearFilter(e.target.value)} className="sort-select">
              <option value="all">All Classes</option>
              <option value="SE Mech">SE Mech</option>
              <option value="TE Mech">TE Mech</option>
              <option value="BE Mech">BE Mech</option>
            </select>
          </label>

          <label className="sort-label">
            <span>Movement:</span>
            <select value={dofFilter} onChange={(e) => setDofFilter(e.target.value)} className="sort-select">
              <option value="all">All Movements</option>
              <option value="1">Controlled Motion (1-Way)</option>
              <option value="multi">Flexible Motion (Multi-Way)</option>
              <option value="structure">Fixed Structure</option>
            </select>
          </label>

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
                <button type="button" className="tom-pending-row__name" onClick={() => handleSelectMechanism(m.id)}>
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
            <section className="tom-grid">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="tom-card--skeleton">
                  <div className="skeleton-thumb" />
                  <div className="skeleton-body">
                    <div className="skeleton-line skeleton-line--title" />
                    <div className="skeleton-line" />
                    <div className="skeleton-line skeleton-line--short" />
                  </div>
                </div>
              ))}
            </section>
          ) : sortedAndFiltered.length === 0 ? (
            <section className="empty-state">
              <div className="empty-state__icon">🔍</div>
              <h2 className="empty-state__title">No mechanisms found</h2>
              <p className="empty-state__copy">
                Try another keyword or filter criteria.
              </p>
            </section>
          ) : viewMode === "table" ? (
            <div className="engineering-table-container">
              <table className="engineering-table">
                <thead>
                  <tr>
                    <th>Mechanism Name</th>
                    <th>Category</th>
                    <th>Movement</th>
                    <th>Parts</th>
                    <th>Joints</th>
                    <th>Student / Contributor</th>
                    <th>Institute</th>
                    <th style={{ textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedAndFiltered.map((m) => {
                    const catMeta = tomCategoryMeta(m.category);
                    return (
                      <tr key={m.id} onClick={() => handleSelectMechanism(m.id)} style={{ cursor: "pointer" }}>
                        <td>
                          <div className="table-mechanism-cell">
                            {m.cover_image || m.preview_image_url || m.image_url || m.image ? (
                              <img
                                src={m.cover_image || m.preview_image_url || m.image_url || m.image}
                                alt={m.name}
                                onError={(e) => {
                                  e.currentTarget.style.display = "none";
                                }}
                                style={{ width: 42, height: 42, borderRadius: 8, objectFit: "cover", flexShrink: 0, border: "1px solid var(--border)" }}
                              />
                            ) : (
                              <div style={{
                                width: 42, height: 42, borderRadius: 8, display: "grid", placeItems: "center",
                                background: `${catMeta.color}22`, border: `1px solid ${catMeta.color}45`,
                                fontSize: "1.2rem", flexShrink: 0
                              }}>
                                {catMeta.icon}
                              </div>
                            )}
                            <div>
                              <strong>{m.name}</strong>
                              <span className="table-subtext">{m.short_description?.slice(0, 48)}...</span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span
                            className="category-pill"
                            style={{
                              padding: "4px 10px",
                              fontSize: "0.72rem",
                              "--pill-color": catMeta.color,
                              "--pill-bg": `${catMeta.color}22`,
                              "--pill-border": `${catMeta.color}55`,
                            }}
                          >
                            <span>{catMeta.icon}</span> <span>{m.category}</span>
                          </span>
                        </td>
                      <td>
                        <span className="table-dof-badge">
                          {m.degrees_of_freedom ?? 1} DOF
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
                            handleSelectMechanism(m.id);
                          }}
                        >
                          Explore →
                        </button>
                      </td>
                      </tr>
                    );
                  })}
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
                  onView={handleSelectMechanism}
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
