import { useState } from "react";
import { EMPTY_MECHANISM_FORM, ACCEPT } from "./tomConstants";

export default function MechanismForm({ onCancel, onSubmit, submitting, formError }) {
  const [form, setForm] = useState(EMPTY_MECHANISM_FORM);
  const [files, setFiles] = useState({});
  const [imagePreview, setImagePreview] = useState("");
  const [imageUrlInput, setImageUrlInput] = useState("");
  const [bgImageUrl, setBgImageUrl] = useState("");

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((cur) => ({ ...cur, [name]: value }));
  }

  function handleFileChange(slot, fileList) {
    setFiles((cur) => ({ ...cur, [slot]: fileList }));

    if (slot === "image" && fileList && fileList[0]) {
      const file = fileList[0];
      const reader = new FileReader();
      reader.onload = (e) => {
        const rawData = e.target.result;
        if (typeof window === "undefined" || !window.Image) {
          setImagePreview(rawData);
          return;
        }
        const img = new Image();
        img.onload = () => {
          const maxWidth = 800;
          const maxHeight = 600;
          let { width, height } = img;
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            setImagePreview(canvas.toDataURL("image/jpeg", 0.85));
          } else {
            setImagePreview(rawData);
          }
        };
        img.onerror = () => setImagePreview(rawData);
        img.src = rawData;
      };
      reader.readAsDataURL(file);
    }
  }

  function handleUrlChange(e) {
    const val = e.target.value;
    setImageUrlInput(val);
    if (val.trim()) {
      setImagePreview(val.trim());
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    const finalCover = imagePreview || imageUrlInput.trim() || null;
    const finalBg = bgImageUrl.trim() || null;
    const payload = {
      ...form,
      name: form.name.trim(),
      category: form.category || "Four-bar",
      student_name: form.student_name.trim(),
      team_members: form.team_members?.trim() || form.student_name.trim(),
      academic_year: form.academic_year || "SE Mech",
      short_description: form.description
        ? (form.description.slice(0, 140) + (form.description.length > 140 ? "..." : ""))
        : "Student mechanism project.",
      detailed_description: form.description || "",
      working_principle: form.description || "",
      num_links: 4,
      num_joints: 4,
      higher_pairs: 0,
      degrees_of_freedom: 1,
      animation_url: form.animation_url ? form.animation_url.trim() : null,
      virtual_mechanism_url: form.virtual_mechanism_url ? form.virtual_mechanism_url.trim() : null,
      external_links: [
        ...(form.video_url ? [form.video_url.trim()] : []),
        ...(form.animation_url ? [form.animation_url.trim()] : []),
        ...(form.virtual_mechanism_url ? [form.virtual_mechanism_url.trim()] : []),
      ],
      college: "NMIET",
      department: "Mechanical Engineering",
      cover_image: finalCover,
      background_image: finalBg,
      bg_image_url: finalBg,
    };
    onSubmit(payload, files);
  }

  return (
    <form className="project-form tom-form" onSubmit={handleSubmit}>
      <div className="project-form__header">
        <div>
          <p className="project-form__eyebrow">TOM Mechanism Showcase · NMIET</p>
          <h2 className="project-form__title">Submit Your Mechanism</h2>
        </div>
        <p className="project-form__hint">
          Share your mechanical engineering mechanism model with the showcase.
        </p>
      </div>

      <h3 className="tom-form__section-title">1. Mechanism Information</h3>
      <div className="project-form__grid">
        <label className="field field--wide" style={{ gridColumn: "1 / -1" }}>
          <span className="field__label">Mechanism Name *</span>
          <input
            className="field__control"
            name="name"
            placeholder="e.g. Four-Bar Linkage / Quick Return / Gearbox"
            value={form.name}
            onChange={handleChange}
            required
          />
        </label>

        <label className="field field--wide" style={{ gridColumn: "1 / -1" }}>
          <span className="field__label">What does this mechanism do? (Description)</span>
          <textarea
            className="field__control field__control--textarea"
            name="description"
            rows={3}
            placeholder="Describe what the mechanism does, how it moves, and where it is used..."
            value={form.description}
            onChange={handleChange}
          />
        </label>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem", marginTop: "1.2rem", marginBottom: "0.5rem" }}>
        <h3 className="tom-form__section-title" style={{ margin: 0, border: "none", paddingTop: 0 }}>
          2. Student / Team Members
        </h3>
        <span style={{ fontSize: "0.8rem", color: "var(--accent, #6366f1)", background: "rgba(99, 102, 241, 0.1)", border: "1px solid rgba(99, 102, 241, 0.2)", padding: "0.25rem 0.75rem", borderRadius: "9999px", fontWeight: 500 }}>
          🏛 NMIET · Mechanical Engineering
        </span>
      </div>

      <div className="project-form__grid">
        <label className="field field--wide" style={{ gridColumn: "1 / -1" }}>
          <span className="field__label">Student / Contributor Name(s) *</span>
          <input
            className="field__control"
            name="student_name"
            placeholder="e.g. Aarav Patil, Sakshi Verma, Rahul Shinde"
            value={form.student_name}
            onChange={handleChange}
            required
          />
          <span className="field__hint" style={{ fontSize: "0.75rem", color: "var(--muted)", marginTop: "4px" }}>
            Add student name(s) or team members who worked on this model.
          </span>
        </label>

        <label className="field">
          <span className="field__label">Academic Year / Class</span>
          <input
            className="field__control"
            name="academic_year"
            placeholder="e.g. SE Mech / TE Mech / BE Mech"
            value={form.academic_year}
            onChange={handleChange}
          />
        </label>

        <label className="field">
          <span className="field__label">Video Demo URL (Optional)</span>
          <input
            className="field__control"
            name="video_url"
            placeholder="YouTube link or Drive video link"
            value={form.video_url}
            onChange={handleChange}
          />
        </label>
      </div>

      <h3 className="tom-form__section-title" style={{ marginTop: "1.2rem" }}>
        3. Thumbnail Photo / Image
      </h3>
      <p style={{ margin: "0 0 14px 0", fontSize: "0.86rem", color: "var(--muted)" }}>
        Add a photo of your mechanism. This image will directly become the thumbnail card in the showcase.
      </p>

      {/* Live Thumbnail Preview */}
      {(imagePreview || bgImageUrl) && (
        <div style={{
          display: "flex",
          gap: "16px",
          alignItems: "center",
          padding: "14px 18px",
          background: bgImageUrl
            ? `linear-gradient(rgba(12, 16, 26, 0.78), rgba(12, 16, 26, 0.94)), url(${bgImageUrl}) center/cover no-repeat`
            : "rgba(251, 191, 36, 0.08)",
          border: "1px solid rgba(251, 191, 36, 0.3)",
          borderRadius: "16px",
          marginBottom: "16px",
          position: "relative",
          overflow: "hidden"
        }}>
          {imagePreview && (
            <img
              src={imagePreview}
              alt="Thumbnail preview"
              style={{
                width: "110px",
                height: "75px",
                borderRadius: "10px",
                objectFit: "cover",
                border: "1px solid rgba(255,255,255,0.2)",
                boxShadow: "0 4px 12px rgba(0,0,0,0.4)"
              }}
            />
          )}
          <div style={{ flex: 1 }}>
            <strong style={{ display: "block", fontSize: "0.9rem", color: "#f8fafc", marginBottom: "4px" }}>
              ✓ Thumbnail Ready {bgImageUrl && "+ Background Set"}
            </strong>
            <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--muted)" }}>
              {imagePreview ? "Mechanism image is set." : "Card background is set."}
              {bgImageUrl && " Custom background backdrop applied."}
            </p>
          </div>
          <button
            type="button"
            className="button button--ghost"
            style={{ padding: "6px 14px", fontSize: "0.78rem", height: "auto" }}
            onClick={() => {
              setImagePreview("");
              setImageUrlInput("");
              setBgImageUrl("");
              setFiles((cur) => {
                const copy = { ...cur };
                delete copy.image;
                return copy;
              });
            }}
          >
            ✕ Reset
          </button>
        </div>
      )}

      <div className="project-form__grid">
        <label className="field">
          <span className="field__label">Upload Photo File</span>
          <input
            className="field__control"
            type="file"
            accept="image/*"
            onChange={(e) => handleFileChange("image", e.target.files)}
          />
          <span className="field__hint" style={{ fontSize: "0.74rem", color: "var(--muted)" }}>
            Select a photo from your computer or phone.
          </span>
        </label>

        <label className="field">
          <span className="field__label">Or Paste Image Link / URL</span>
          <input
            className="field__control"
            placeholder="https://... direct image link"
            value={imageUrlInput}
            onChange={handleUrlChange}
          />
          <span className="field__hint" style={{ fontSize: "0.74rem", color: "var(--muted)" }}>
            Paste a direct link to any mechanism photo online.
          </span>
        </label>

        <label className="field field--wide" style={{ gridColumn: "1 / -1" }}>
          <span className="field__label">Thumbnail Background Image Link / URL (Optional)</span>
          <input
            className="field__control"
            name="background_image"
            placeholder="https://... direct image link for thumbnail background backdrop"
            value={bgImageUrl}
            onChange={(e) => setBgImageUrl(e.target.value)}
          />
          <span className="field__hint" style={{ fontSize: "0.74rem", color: "var(--muted)" }}>
            Paste an image link to use as the background backdrop for your mechanism's card in the showcase.
          </span>
        </label>
      </div>

      <h3 className="tom-form__section-title" style={{ marginTop: "1.4rem" }}>
        4. Custom Animation &amp; Virtual Mechanism (Optional)
      </h3>
      <p style={{ margin: "0 0 14px 0", fontSize: "0.86rem", color: "var(--muted)" }}>
        If you created your own animation video, GIF, or an online interactive virtual simulation of this mechanism, you can upload or link it below.
      </p>

      {/* Live Animation & Virtual Mechanism Status Badge */}
      {(files.animation?.[0] || form.animation_url || files.virtual_mechanism?.[0] || form.virtual_mechanism_url) && (
        <div style={{
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          padding: "12px 16px",
          background: "linear-gradient(135deg, rgba(56, 189, 248, 0.08), rgba(168, 85, 247, 0.06))",
          border: "1px solid rgba(56, 189, 248, 0.3)",
          borderRadius: "14px",
          marginBottom: "16px",
        }}>
          {(files.animation?.[0] || form.animation_url) && (
            <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.84rem", color: "#38bdf8" }}>
              <span>🌀</span>
              <span>
                <strong>Animation Attached:</strong> {files.animation?.[0]?.name || form.animation_url}
              </span>
            </div>
          )}
          {(files.virtual_mechanism?.[0] || form.virtual_mechanism_url) && (
            <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.84rem", color: "#34d399" }}>
              <span>🔬</span>
              <span>
                <strong>Virtual Mechanism Attached:</strong> {files.virtual_mechanism?.[0]?.name || form.virtual_mechanism_url}
              </span>
            </div>
          )}
        </div>
      )}

      <div className="project-form__grid">
        <label className="field">
          <span className="field__label">Upload Custom Animation File</span>
          <input
            className="field__control"
            type="file"
            accept={ACCEPT.animation}
            onChange={(e) => handleFileChange("animation", e.target.files)}
          />
          <span className="field__hint" style={{ fontSize: "0.74rem", color: "var(--muted)" }}>
            Upload an animated GIF, MP4, or WebM showing your mechanism moving.
          </span>
        </label>

        <label className="field">
          <span className="field__label">Or Paste Animation Link / URL</span>
          <input
            className="field__control"
            name="animation_url"
            placeholder="https://... direct link to GIF, MP4, or animation video"
            value={form.animation_url || ""}
            onChange={handleChange}
          />
          <span className="field__hint" style={{ fontSize: "0.74rem", color: "var(--muted)" }}>
            Direct link to your animated motion video or GIF online.
          </span>
        </label>

        <label className="field">
          <span className="field__label">Virtual Mechanism / Simulation Link</span>
          <input
            className="field__control"
            name="virtual_mechanism_url"
            placeholder="e.g. GeoGebra, Desmos, Tinkercad, or web simulation URL"
            value={form.virtual_mechanism_url || ""}
            onChange={handleChange}
          />
          <span className="field__hint" style={{ fontSize: "0.74rem", color: "var(--muted)" }}>
            Link to any online virtual lab, 3D model viewer, or interactive simulation.
          </span>
        </label>

        <label className="field">
          <span className="field__label">Or Upload Virtual Mechanism File</span>
          <input
            className="field__control"
            type="file"
            accept={ACCEPT.virtual_mechanism}
            onChange={(e) => handleFileChange("virtual_mechanism", e.target.files)}
          />
          <span className="field__hint" style={{ fontSize: "0.74rem", color: "var(--muted)" }}>
            Upload an interactive HTML file, 3D model (GLTF/GLB/STEP), or simulation file.
          </span>
        </label>
      </div>

      <h3 className="tom-form__section-title" style={{ marginTop: "1.4rem" }}>
        5. Optional Project Document / CAD File
      </h3>
      <div className="project-form__grid">
        <label className="field field--wide" style={{ gridColumn: "1 / -1" }}>
          <span className="field__label">Project Report or CAD Model (Optional)</span>
          <input
            className="field__control"
            type="file"
            accept={ACCEPT.document}
            onChange={(e) => handleFileChange("document", e.target.files)}
          />
          <span className="field__hint" style={{ fontSize: "0.74rem", color: "var(--muted)" }}>
            Upload PDF report, PPT synopsis, or 3D STEP/CAD model if available.
          </span>
        </label>
      </div>

      <div className="project-form__footer" style={{ marginTop: "1.8rem" }}>
        <div className="project-form__message" role="status" aria-live="polite">{formError}</div>
        <div className="project-form__actions">
          <button type="button" className="button button--ghost" onClick={onCancel} disabled={submitting}>
            Cancel
          </button>
          <button type="submit" className="button button--primary" disabled={submitting}>
            {submitting ? "Submitting…" : "Submit Mechanism"}
          </button>
        </div>
      </div>
    </form>
  );
}
