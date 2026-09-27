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
import MechanismForm from "../tom/MechanismForm.jsx";

/**
 * Full admin moderation dashboard.
 * All form state and confirm-dialog state live here, not in App.jsx.
 */
export default function AdminPage({ onLogout, onNavigate, showToast }) {
  const { mechanisms, pendingMechanisms, refreshData } = useMechanisms();

  // ── Add / Edit form state ────────────────────────────────────────────────
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingMechanism, setEditingMechanism] = useState(null);
  const [editingMechanismId, setEditingMechanismId] = useState(null);
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
    setEditingMechanism(mechanism);
    setFormError("");
    setShowAddForm(true);
    window.scrollTo({ top: 320, behavior: "smooth" });
  }

  async function handleFormSubmit(payload, files) {
    setSubmitting(true);
    setFormError("");
    try {
      if (editingMechanismId) {
        const res = await apiUpdateMechanism(editingMechanismId, payload, files);
        if (res?.error) {
          showToast("⚠️ Updated locally, but cloud sync returned: " + (res.error.message || "error"));
        } else {
          showToast("✅ Mechanism updated successfully.");
        }
      } else {
        const res = await submitMechanism(payload, files, { approved: true });
        if (res?.error) {
          showToast("⚠️ Created locally, but cloud sync returned: " + (res.error.message || "error"));
        } else {
          showToast("✅ New mechanism created and published to showcase.");
        }
      }

      await refreshData();
      setShowAddForm(false);
      setEditingMechanismId(null);
      setEditingMechanism(null);
    } catch (err) {
      setFormError("Could not save mechanism: " + (err?.message || ""));
    } finally {
      setSubmitting(false);
    }
  }

  // ── Moderation actions ───────────────────────────────────────────────────
  async function handleApprovePending(id) {
    const res = await approveMechanism(id);
    await refreshData();
    if (res?.error) {
      showToast("⚠️ Approved locally, but Supabase update failed (check auth/RLS permissions).");
    } else {
      showToast("✅ Mechanism approved and published to showcase.");
    }
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
    const res = await rejectMechanism(id, feedback);
    await refreshData();
    if (res?.error) {
      showToast("⚠️ Rejected locally, but Supabase update failed (check auth/RLS permissions).");
    } else {
      showToast("Submission marked as rejected with faculty feedback.");
    }
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
        const res = await apiDeleteMechanism(id);
        await refreshData();
        if (res?.error) {
          showToast(`⚠️ Deleted locally, but Supabase delete failed (check permissions).`);
        } else {
          showToast(`"${mech.name}" deleted.`);
        }
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
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button
                        type="button"
                        className="secondary-btn secondary-btn--small"
                        style={{ minHeight: 36, padding: "0 14px", fontSize: "0.82rem" }}
                        onClick={() => startEditingMechanism(pending)}
                      >
                        ✎ Edit Full Form
                      </button>
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
                setShowAddForm((prev) => {
                  if (prev) {
                    setEditingMechanismId(null);
                    setEditingMechanism(null);
                    return false;
                  }
                  setEditingMechanismId(null);
                  setEditingMechanism(null);
                  return true;
                });
              }}
            >
              {showAddForm ? "Close Form" : "+ Add Mechanism"}
            </button>
          </div>

          {showAddForm && (
            <div style={{ marginBottom: 32, borderBottom: "1px solid var(--border)", paddingBottom: 32 }}>
              <MechanismForm
                initialValues={editingMechanism}
                isEditing={Boolean(editingMechanismId)}
                title={editingMechanismId ? `Edit Mechanism Specifications: ${editingMechanism?.name || ""}` : "Add a Mechanism to Catalog"}
                submitLabel={editingMechanismId ? "Save Changes" : "Create Mechanism"}
                onCancel={() => {
                  setShowAddForm(false);
                  setEditingMechanismId(null);
                  setEditingMechanism(null);
                  setFormError("");
                }}
                onSubmit={handleFormSubmit}
                submitting={submitting}
                formError={formError}
              />
            </div>
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
