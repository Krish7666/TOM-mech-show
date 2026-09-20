import { memo, useState } from "react";
import { tomCategoryMeta } from "./tomConstants";

const MechanismCard = memo(function MechanismCard({ mechanism, onView }) {
  const [imgError, setImgError] = useState(false);

  const directCover =
    mechanism.cover_image ||
    mechanism.preview_image_url ||
    mechanism.image_url ||
    mechanism.thumbnail ||
    mechanism.image;

  // Only use valid non-SVG-blueprint images
  const coverImage =
    directCover && typeof directCover === "string" && !directCover.startsWith("data:image/svg+xml")
      ? directCover
      : null;

  const directBg =
    mechanism.background_image ||
    mechanism.bg_image_url ||
    mechanism.thumbnail_bg_url;

  const bgImage =
    directBg && typeof directBg === "string" && !directBg.startsWith("data:image/svg+xml")
      ? directBg
      : null;

  const category = mechanism.category || "Four-bar";
  const meta = tomCategoryMeta(category);

  // Vibrant gradient themes per category for rich visual variety
  const categoryGradients = {
    "Four-bar": "linear-gradient(135deg, rgba(56, 189, 248, 0.22), rgba(14, 165, 233, 0.06))",
    "Slider-crank": "linear-gradient(135deg, rgba(52, 211, 153, 0.22), rgba(16, 185, 129, 0.06))",
    "Quick-return": "linear-gradient(135deg, rgba(251, 191, 36, 0.22), rgba(245, 158, 11, 0.06))",
    "Gear mechanisms": "linear-gradient(135deg, rgba(129, 140, 248, 0.22), rgba(99, 102, 241, 0.06))",
    "Cam mechanisms": "linear-gradient(135deg, rgba(244, 114, 182, 0.22), rgba(236, 72, 153, 0.06))",
    "Couplings": "linear-gradient(135deg, rgba(251, 146, 60, 0.22), rgba(234, 88, 12, 0.06))",
    "Steering mechanisms": "linear-gradient(135deg, rgba(163, 230, 53, 0.22), rgba(132, 204, 22, 0.06))",
    "Other": "linear-gradient(135deg, rgba(192, 132, 252, 0.22), rgba(168, 85, 247, 0.06))",
  };
  const cardGradient = categoryGradients[category] || categoryGradients["Other"];

  const showFallback = !coverImage || imgError;

  return (
    <article
      className="tom-card"
      onClick={() => onView(mechanism.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onView(mechanism.id);
        }
      }}
      style={{
        cursor: "pointer",
        ...(bgImage ? {
          backgroundImage: `linear-gradient(180deg, rgba(12, 18, 32, 0.72) 0%, rgba(12, 18, 32, 0.94) 100%), url(${bgImage})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        } : {})
      }}
    >
      <div
        className="tom-card__media"
        style={bgImage ? {
          backgroundImage: `linear-gradient(rgba(9, 14, 26, 0.3), rgba(9, 14, 26, 0.65)), url(${bgImage})`,
          backgroundSize: "cover",
          backgroundPosition: "center"
        } : {}}
      >
        {!showFallback ? (
          <img
            className="tom-card__image"
            src={coverImage}
            alt={mechanism.name}
            loading="lazy"
            onError={() => setImgError(true)}
          />
        ) : (
          <div
            className="tom-card__clean-banner"
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              background: cardGradient,
              position: "relative",
            }}
          >
            <div
              style={{
                width: "56px",
                height: "56px",
                borderRadius: "16px",
                background: "rgba(255, 255, 255, 0.08)",
                border: `1px solid ${meta.color}45`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "26px",
                boxShadow: `0 8px 22px ${meta.color}28`,
              }}
            >
              {meta.icon}
            </div>
            <span
              style={{
                marginTop: "10px",
                fontFamily: "var(--font-mono, monospace)",
                fontSize: "0.72rem",
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: meta.color,
              }}
            >
              {category}
            </span>
          </div>
        )}
      </div>

      <div className="tom-card__body">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
          <h3 className="tom-card__title">{mechanism.name}</h3>
          <span
            style={{
              fontSize: "0.74rem",
              color: "#38bdf8",
              fontWeight: 600,
              display: "inline-flex",
              alignItems: "center",
              gap: "2px",
              flexShrink: 0,
              padding: "2px 8px",
              borderRadius: "999px",
              background: "rgba(56, 189, 248, 0.08)",
              border: "1px solid rgba(56, 189, 248, 0.2)",
            }}
          >
            Explore →
          </span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "6px", marginTop: "8px" }}>
          <p className="tom-card__student" style={{ margin: 0 }}>
            <span className="tom-card__student-badge">
              👤 {mechanism.student_name || "Student Project"}
            </span>
          </p>
          <div style={{ display: "flex", gap: "4px", alignItems: "center", flexWrap: "wrap" }}>
            {mechanism.academic_year && (
              <span
                style={{
                  fontSize: "0.68rem",
                  color: "#a78bfa",
                  background: "rgba(167, 139, 250, 0.12)",
                  border: "1px solid rgba(167, 139, 250, 0.3)",
                  padding: "2px 7px",
                  borderRadius: "999px",
                  fontWeight: 600,
                }}
              >
                🎓 {mechanism.academic_year}
              </span>
            )}
            {mechanism.degrees_of_freedom !== undefined && (
              <span
                style={{
                  fontSize: "0.68rem",
                  color: "#34d399",
                  background: "rgba(52, 211, 153, 0.12)",
                  border: "1px solid rgba(52, 211, 153, 0.3)",
                  padding: "2px 7px",
                  borderRadius: "999px",
                  fontWeight: 600,
                }}
              >
                {mechanism.degrees_of_freedom} DOF
              </span>
            )}
            {(mechanism.html_animation_url || (mechanism.animation_url && mechanism.animation_url.toLowerCase().includes(".html"))) && (
              <span
                style={{
                  fontSize: "0.68rem",
                  color: "#38bdf8",
                  background: "rgba(56, 189, 248, 0.12)",
                  border: "1px solid rgba(56, 189, 248, 0.3)",
                  padding: "2px 7px",
                  borderRadius: "999px",
                  fontWeight: 600,
                }}
              >
                🌐 HTML
              </span>
            )}
          </div>
        </div>

      </div>
    </article>
  );
});

export default MechanismCard;
