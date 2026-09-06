import React, { useRef } from "react";
import { tomCategoryMeta } from "./tomConstants";

// Reuses the project card's 3D tilt feel via plain CSS hover (kept dependency-free
// here; App.jsx's useTilt hook is intentionally not imported to avoid coupling
// this module back to App.jsx internals).
function MechanismCard({ mechanism, mediaCount, onView }) {
  const meta = tomCategoryMeta(mechanism.category);
  const cardRef = useRef(null);

  return (
    <article
      ref={cardRef}
      className="tom-card"
      style={{ "--card-accent": meta.color }}
    >
      <div className="tom-card__media">
        {mechanism.cover_image ? (
          <img className="tom-card__image" src={mechanism.cover_image} alt={mechanism.name} loading="lazy" />
        ) : (
          <div className="tom-card__fallback" aria-hidden="true">{meta.icon}</div>
        )}
        <div className="tom-card__grid-overlay" aria-hidden="true" />
        <div className="tom-card__category">
          <span>{meta.icon}</span>
          <span>{mechanism.category || "Other"}</span>
        </div>
      </div>

      <div className="tom-card__body">
        <h3 className="tom-card__title">{mechanism.name}</h3>
        <p className="tom-card__description">
          {mechanism.short_description || "No description added yet."}
        </p>

        <div className="tom-card__meta-row">
          {mechanism.student_name && (
            <span className="tom-card__meta-item">👤 {mechanism.student_name}</span>
          )}
          <span className="tom-card__meta-item">
            📎 {mediaCount ?? 0} resource{mediaCount === 1 ? "" : "s"}
          </span>
        </div>

        <div className="tom-card__meta-row tom-card__meta-row--muted">
          <span className="tom-card__meta-item">
            🗓 {mechanism.created_at ? new Date(mechanism.created_at).toLocaleDateString() : "—"}
          </span>
        </div>

        <button type="button" className="button button--card tom-card__view-btn" onClick={() => onView(mechanism.id)}>
          View Mechanism →
        </button>
      </div>
    </article>
  );
}

export default React.memo(MechanismCard);
