import { useState } from "react";
import MechanismForm from "../tom/MechanismForm.jsx";
import { submitMechanism } from "../tom/tomApi.js";
import { useMechanisms } from "../context/MechanismsContext.jsx";

/**
 * Student mechanism submission page.
 * Displays submission form and returns to repository upon completion.
 */
export default function SubmitPage({ onNavigate, showToast }) {
  const { refreshData } = useMechanisms();
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  return (
    <section className="submit-page-shell">
      <div className="submit-page-topbar">
        <button
          type="button"
          className="back-btn"
          onClick={() => onNavigate("repository")}
        >
          ← Back to Cloud Repository
        </button>
        <span className="submit-page-badge">
          🏛 NMIET · Department of Mechanical Engineering
        </span>
      </div>

      <MechanismForm
        onCancel={() => onNavigate("repository")}
        onSubmit={async (payload, files) => {
          setSubmitting(true);
          setFormError("");
          const { error, uploadErrors } = await submitMechanism(payload, files);
          setSubmitting(false);

          if (error) {
            setFormError(
              error.message || "Failed to submit mechanism. Please check your fields and try again."
            );
            return;
          }

          if (uploadErrors?.length) {
            showToast(
              "⚠️ Submission saved — some large media files may not persist without Supabase configured."
            );
          } else {
            showToast("✅ Mechanism submitted successfully for faculty review!");
          }

          await refreshData();
          onNavigate("repository");
        }}
        submitting={submitting}
        formError={formError}
      />
    </section>
  );
}
