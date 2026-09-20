import { useState } from "react";
import {
  submitMechanism,
  approveMechanism,
  rejectMechanism,
  deleteMechanism as apiDeleteMechanism,
  updateMechanism as apiUpdateMechanism,
} from "../tom/tomApi.js";
import { TOM_CATEGORIES } from "../tom/tomConstants.js";
import { isSupabaseConfigured } from "../lib/supabaseClient.js";
import { mechanismToForm, EMPTY_ADMIN_FORM } from "../tom/mechanismUtils.js";
import { useMechanisms } from "../context/MechanismsContext.jsx";
import ConfirmDialog from "../components/ConfirmDialog.jsx";

/**
 * Full admin moderation dashboard.
 * All form state and confirm-dialog state live here, not in App.jsx.
 */
export default function AdminPage({ onLogout, onNavigate, showToast }) {
  const { mechanisms, pendingMechanisms, refreshData } = useMechanisms();

  // ── Add / Edit form state ────────────────────────────────────────────────
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingMechanismId, setEditingMechanismId] = useState(null);
  const [newMechanism, setNewMechanism] = useState(EMPTY_ADMIN_FORM);
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // ── Confirm dialog state ─────────────────────────────────────────────────
  const [dialog, setDialog] = useState({
    open: false,
    title: "",
    message: "",
    danger: false,
    onConfirm: null,
  });

  // ── Rejection with feedback modal state ───────────────────────────────────
  const [rejectionModal, setRejectionModal] = useState({
    open: false,
    id: null,
    name: "",
    feedback: "",
  });

  function openDialog(opts) {
    setDialog({ open: true, ...opts });
  }
  function closeDialog() {
    setDialog({ open: false, title: "", message: "", danger: false, onConfirm: null });
  }

  // ── Form handlers ────────────────────────────────────────────────────────
  function startEditingMechanism(mechanism) {
    setEditingMechanismId(mechanism.id);
    setNewMechanism(mechanismToForm(mechanism));
    setFormError("");
    setShowAddForm(true);
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setNewMechanism((cur) => ({ ...cur, [name]: value }));
  }

  function handleImageChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setFormError("Please select an image file.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setNewMechanism((cur) => ({ ...cur, image: reader.result }));
      setFormError("");
    };
    reader.readAsDataURL(file);
  }

  async function handleAddMechanismSubmit(e) {
    e.preventDefault();
    if (!newMechanism.name || !newMechanism.student_name || !newMechanism.category) {
      setFormError("Please fill in the mechanism name, category, and student name.");
      return;
    }
    setSubmitting(true);
    setFormError("");
    try {
      const payload = {
        name: newMechanism.name,
        category: newMechanism.category,
        student_name: newMechanism.student_name,
        team_members: newMechanism.team_members || newMechanism.student_name,
        college: newMechanism.college || "NMIET",
        department: newMechanism.department || "Mechanical Engineering",
        short_description: newMechanism.short_description || "Faculty/Admin added mechanism.",
        detailed_description: newMechanism.information || "",
        num_links: Number(newMechanism.links || 4),
        num_joints: Number(newMechanism.joints || 4),
        higher_pairs: Number(newMechanism.higherPairs || 0),
        instructions: (newMechanism.instructions || "")
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean),
        video: newMechanism.video || "",
        html_animation_url: newMechanism.html_animation_url?.trim() || null,
        animation_url: newMechanism.html_animation_url?.trim() || null,
      };

      if (editingMechanismId) {
        await apiUpdateMechanism(editingMechanismId, payload);
        showToast("Mechanism updated.");
      } else {
        await submitMechanism(payload, {}, { approved: true });
        showToast("New mechanism added to repository.");
      }

      await refreshData();
      setShowAddForm(false);
      setEditingMechanismId(null);
      setNewMechanism(EMPTY_ADMIN_FORM);
    } catch (err) {
      setFormError("Could not save mechanism. " + (err?.message || ""));
    } finally {
      setSubmitting(false);
    }
  }

  // ── Moderation actions ───────────────────────────────────────────────────
  async function handleApprovePending(id) {
    await approveMechanism(id);
    await refreshData();
    showToast("✅ Mechanism approved and published to showcase.");
  }

  function handleRejectPending(id) {
    const mech = pendingMechanisms.find((m) => String(m.id) === String(id));
    setRejectionModal({
      open: true,
      id,
      name: mech?.name || "this submission",
      feedback: "",
    });
  }

  async function handleConfirmRejection() {
    const { id, feedback } = rejectionModal;
    setRejectionModal({ open: false, id: null, name: "", feedback: "" });
    await rejectMechanism(id, feedback);
    await refreshData();
    showToast("Submission marked as rejected with faculty feedback.");
  }

  function handleDeleteMechanism(id) {
    const mech = mechanisms.find((m) => String(m.id) === String(id));
    if (!mech) return;
    openDialog({
      title: "Delete Mechanism",
      message: `Delete "${mech.name}"? This cannot be undone.`,
      danger: true,
      onConfirm: async () => {
        closeDialog();
        await apiDeleteMechanism(id);
        await refreshData();
        showToast(`"${mech.name}" deleted.`);
      },
    });
  }

  return (
    <>
      <ConfirmDialog
        isOpen={dialog.open}
        title={dialog.title}
        message={dialog.message}
        danger={dialog.danger}
        confirmLabel="Yes, proceed"
        cancelLabel="Cancel"
        onConfirm={dialog.onConfirm}
        onCancel={closeDialog}
      />

      {/* ── REJECTION & FEEDBACK MODAL ── */}
      {rejectionModal.open && (
        <div
          className="confirm-dialog-backdrop"
          onClick={() => setRejectionModal({ open: false, id: null, name: "", feedback: "" })}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="confirm-dialog-card"
            style={{ maxWidth: 480 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: "0 0 8px", fontSize: "1.2rem", color: "#f87171" }}>
              Reject / Request Revisions
            </h3>
            <p style={{ margin: "0 0 16px", color: "var(--muted)", fontSize: "0.88rem" }}>
              Provide feedback for <strong>"{rejectionModal.name}"</strong> to record faculty review notes.
            </p>

            <label style={{ display: "block", marginBottom: 16 }}>
              <span style={{ fontSize: "0.78rem", fontWeight: 600, color: "#e2e8f0", display: "block", marginBottom: 6 }}>
                Faculty Feedback / Action Required (Optional)
              </span>
              <textarea
                value={rejectionModal.feedback}
                onChange={(e) => setRejectionModal((cur) => ({ ...cur, feedback: e.target.value }))}
                placeholder="e.g. Please verify link lengths L3 and L4. The model does not satisfy Grashof crank-rocker condition."
                rows={4}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: "8px",
                  background: "rgba(255, 255, 255, 0.05)",
                  border: "1px solid var(--border)",
                  color: "#fff",
                  fontSize: "0.85rem",
                  resize: "vertical",
                  fontFamily: "inherit",
                }}
              />
            </label>

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button
                type="button"
                className="secondary-btn"
                onClick={() => setRejectionModal({ open: false, id: null, name: "", feedback: "" })}
              >
                Cancel
              </button>
              <button
                type="button"
                className="danger-btn"
                onClick={handleConfirmRejection}
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}


      <section className="admin-shell">
        <div className="admin-header">
          <div>
            <h2>Admin &amp; Moderation Dashboard</h2>
            <p style={{ margin: "4px 0 0", color: "var(--muted)", fontSize: "0.9rem" }}>
              Manage verified curriculum mechanisms and moderate student project submissions.
            </p>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            {onNavigate && (
              <button
                type="button"
                className="secondary-btn"
                onClick={() => onNavigate("repository")}
              >
                View Repository
              </button>
            )}
            <button type="button" className="secondary-btn" onClick={onLogout}>
              Sign Out
            </button>
          </div>
        </div>

        {/* ── SUMMARY CARDS ── */}
        <div className="admin-summary">
          <div className="summary-card">
            <span>Approved Models</span>
            <strong>{mechanisms.length}</strong>
          </div>
          <div className="summary-card">
            <span>Pending Review</span>
            <strong style={{ color: pendingMechanisms.length > 0 ? "var(--gold)" : "inherit" }}>
              {pendingMechanisms.length}
            </strong>
          </div>
          <div className="summary-card">
            <span>Storage Backend</span>
            <strong>{isSupabaseConfigured ? "Supabase Cloud" : "Local Sync Engine"}</strong>
          </div>
        </div>

        {/* ── PENDING SUBMISSIONS QUEUE ── */}
        <div className="admin-panel" style={{ marginBottom: 28 }}>
          <div className="admin-panel__header">
            <div>
              <h3>Student Submissions Pending Moderation</h3>
              <span>{pendingMechanisms.length} awaiting faculty review</span>
            </div>
          </div>

          {pendingMechanisms.length === 0 ? (
            <div
              style={{
                padding: "32px 20px",
                textAlign: "center",
                borderRadius: "16px",
                background: "rgba(255,255,255,0.02)",
                border: "1px dashed var(--border)",
                color: "var(--muted)",
                fontSize: "0.9rem",
              }}
            >
              <span style={{ fontSize: "1.6rem", display: "block", marginBottom: 8 }}>✅</span>
              <strong>All Submissions Cleared</strong>
              <p style={{ margin: "6px 0 0", fontSize: "0.82rem" }}>
                There are no pending submissions awaiting approval.
              </p>
            </div>
          ) : (
            <div className="admin-list">
              {pendingMechanisms.map((pending) => (
                <div
                  key={pending.id}
                  className="admin-item"
                  style={{ flexDirection: "column", alignItems: "stretch", gap: 14 }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      flexWrap: "wrap",
                      gap: 8,
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <strong style={{ fontSize: "1.05rem" }}>{pending.name}</strong>
                      </div>
                      <p style={{ margin: "2px 0 0", color: "var(--muted)", fontSize: "0.85rem" }}>
                        {pending.category} · By {pending.student_name} ({pending.academic_year || "Student"}) ·{" "}
                        {pending.college || "NMIET"}
                      </p>
                    </div>
                    <span
                      style={{
                        padding: "4px 10px",
                        borderRadius: 999,
                        background: "rgba(251,191,36,0.14)",
                        border: "1px solid rgba(251,191,36,0.3)",
                        color: "var(--gold)",
                        fontSize: "0.72rem",
                        fontWeight: 700,
                        textTransform: "uppercase",
                      }}
                    >
                      Pending Review
                    </span>
                  </div>

                  {pending.admin_feedback && (
                    <div
                      style={{
                        padding: "8px 12px",
                        borderRadius: "8px",
                        background: "rgba(239, 68, 68, 0.1)",
                        border: "1px solid rgba(239, 68, 68, 0.25)",
                        color: "#fca5a5",
                        fontSize: "0.82rem",
                      }}
                    >
                      <strong>Previous Feedback:</strong> {pending.admin_feedback}
                    </div>
                  )}

                  <p style={{ margin: 0, color: "#cbd5e1", fontSize: "0.88rem", lineHeight: 1.5 }}>
                    {pending.short_description || pending.detailed_description || "No description provided."}
                  </p>


                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: 10,
                      paddingTop: 10,
                      borderTop: "1px solid rgba(255,255,255,0.06)",
                    }}
                  >
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.78rem", color: "var(--muted)" }}>
                      Links: {pending.num_links ?? 4} | Joints: {pending.num_joints ?? 4} | Higher Pairs:{" "}
                      {pending.higher_pairs ?? 0} | DOF: {pending.degrees_of_freedom ?? 1}
                    </span>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        type="button"
                        className="primary-btn"
                        style={{ minHeight: 36, padding: "0 14px", fontSize: "0.82rem" }}
                        onClick={() => handleApprovePending(pending.id)}
                      >
                        ✓ Approve
                      </button>
                      <button
                        type="button"
                        className="danger-btn"
                        style={{ minHeight: 36, padding: "0 14px", fontSize: "0.82rem" }}
                        onClick={() => handleRejectPending(pending.id)}
                      >
                        ✕ Reject
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── APPROVED CATALOG ── */}
        <div className="admin-panel">
          <div className="admin-panel__header">
            <div>
              <h3>Approved Mechanism Catalog</h3>
              <span>{mechanisms.length} active models in repository</span>
            </div>
            <button
              type="button"
              className="primary-btn"
              onClick={() => {
                setShowAddForm((prev) => !prev);
                if (showAddForm) {
                  setEditingMechanismId(null);
                  setNewMechanism(EMPTY_ADMIN_FORM);
                }
              }}
            >
              {showAddForm ? "Close Form" : "+ Add Mechanism"}
            </button>
          </div>

          {showAddForm && (
            <form
              className="mechanism-form"
              onSubmit={handleAddMechanismSubmit}
              style={{ marginBottom: 24, borderBottom: "1px solid var(--border)", paddingBottom: 24 }}
            >
              <div className="form-heading">
                <h3>{editingMechanismId ? "Update Mechanism Details" : "Add a Mechanism to Catalog"}</h3>
              </div>
              <div className="mechanism-form__grid">
                <label className="field">
                  <span className="field__label">Mechanism Name *</span>
                  <input
                    name="name"
                    value={newMechanism.name}
                    onChange={handleChange}
                    placeholder="e.g. Quick Return Mechanism"
                    required
                  />
                </label>

                <label className="field">
                  <span className="field__label">Category *</span>
                  <select name="category" value={newMechanism.category} onChange={handleChange}>
                    {TOM_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field field--full">
                  <span className="field__label">Student / Author Name(s) *</span>
                  <input
                    name="student_name"
                    value={newMechanism.student_name}
                    onChange={handleChange}
                    placeholder="e.g. Aarav Patil, Sakshi Verma"
                    required
                  />
                </label>

                <label className="field field--full">
                  <span className="field__label">Short Description</span>
                  <input
                    name="short_description"
                    value={newMechanism.short_description}
                    onChange={handleChange}
                    placeholder="Brief project overview"
                  />
                </label>

                <label className="field field--full">
                  <span className="field__label">Working Principle &amp; Details</span>
                  <textarea
                    name="information"
                    value={newMechanism.information}
                    onChange={handleChange}
                    rows="3"
                    placeholder="Explain the kinematic function and application"
                  />
                </label>

                <label className="field">
                  <span className="field__label">Number of Links (L)</span>
                  <input name="links" type="number" value={newMechanism.links} onChange={handleChange} min="1" />
                </label>

                <label className="field">
                  <span className="field__label">Number of Lower Joints (J)</span>
                  <input name="joints" type="number" value={newMechanism.joints} onChange={handleChange} min="0" />
                </label>

                <label className="field">
                  <span className="field__label">Number of Higher Pairs (H)</span>
                  <input
                    name="higherPairs"
                    type="number"
                    value={newMechanism.higherPairs}
                    onChange={handleChange}
                    min="0"
                  />
                </label>

                <label className="field field--full">
                  <span className="field__label">HTML Animation Link (.html format only)</span>
                  <input
                    name="html_animation_url"
                    value={newMechanism.html_animation_url || ""}
                    onChange={handleChange}
                    placeholder="https://.../animation.html"
                  />
                </label>

                <label className="field field--full">
                  <span className="field__label">Video / Embed URL</span>
                  <input
                    name="video"
                    value={newMechanism.video}
                    onChange={handleChange}
                    placeholder="https://youtube.com/watch?v=..."
                  />
                </label>

                <label className="field field--full">
                  <span className="field__label">Mechanism Cover Image</span>
                  <input type="file" accept="image/*" onChange={handleImageChange} />
                  {newMechanism.image && (
                    <img
                      className="form-image-preview"
                      src={newMechanism.image}
                      alt="Selected mechanism preview"
                      style={{ marginTop: 8 }}
                    />
                  )}
                </label>
              </div>

              {formError && <div className="login-error" style={{ marginTop: 12 }}>{formError}</div>}

              <div className="form-actions" style={{ marginTop: 16 }}>
                <button type="submit" className="primary-btn" disabled={submitting}>
                  {submitting ? "Saving..." : editingMechanismId ? "Save Changes" : "Create Mechanism"}
                </button>
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => {
                    setShowAddForm(false);
                    setEditingMechanismId(null);
                    setNewMechanism(EMPTY_ADMIN_FORM);
                    setFormError("");
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          <div className="admin-list">
            {mechanisms.length === 0 ? (
              <div style={{ padding: "32px 20px", textAlign: "center", color: "var(--muted)" }}>
                No approved mechanisms in catalog yet.
              </div>
            ) : (
              mechanisms.map((mechanism) => (
                <div key={mechanism.id} className="admin-item">
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <strong>{mechanism.name}</strong>
                      {(mechanism.html_animation_url || mechanism.animation_url) && (
                        <span
                          style={{
                            fontSize: "0.68rem",
                            padding: "2px 8px",
                            borderRadius: "999px",
                            background: "rgba(56, 189, 248, 0.12)",
                            border: "1px solid rgba(56, 189, 248, 0.3)",
                            color: "#38bdf8",
                            fontWeight: 600,
                          }}
                        >
                          🌐 HTML Animation
                        </span>
                      )}
                    </div>
                    <p style={{ margin: "2px 0 0", color: "var(--muted)", fontSize: "0.85rem" }}>
                      {mechanism.category} · By {mechanism.student_name || "Student"}
                    </p>
                  </div>
                  <div className="admin-item__actions">
                    <span
                      className="admin-item__status"
                      style={{
                        background: "rgba(34, 197, 94, 0.12)",
                        borderColor: "rgba(34, 197, 94, 0.25)",
                        color: "#86efac",
                      }}
                    >
                      Approved
                    </span>
                    <button
                      type="button"
                      className="secondary-btn secondary-btn--small"
                      onClick={() => startEditingMechanism(mechanism)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="danger-btn"
                      title="Delete mechanism"
                      onClick={() => handleDeleteMechanism(mechanism.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </>
  );
}
