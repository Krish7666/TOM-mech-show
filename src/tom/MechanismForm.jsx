import { useState } from "react";
import { EMPTY_MECHANISM_FORM, TOM_CATEGORIES, ACCEPT } from "./tomConstants";
import { calculateDof } from "./kinematics.js";

const FILE_SLOTS = [
  { key: "image",    label: "Photo / CAD Render",       hint: "Image of prototype, CAD screenshot, or drawing" },
  { key: "video",    label: "Demonstration Video",      hint: "Short video clip showing motion" },
  { key: "document", label: "Project Report / CAD File", hint: "PDF synopsis, datasheet, or 3D CAD/STEP file" },
];

export default function MechanismForm({ onCancel, onSubmit, submitting, formError }) {
  const [form, setForm] = useState(EMPTY_MECHANISM_FORM);
  const [files, setFiles] = useState({});
  const [imagePreview, setImagePreview] = useState("");
  const [imageUrlInput, setImageUrlInput] = useState("");

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((cur) => ({ ...cur, [name]: value }));
  }

  function handleFileChange(slot, fileList) {
    setFiles((cur) => ({ ...cur, [slot]: fileList }));

    if ((slot === "image" || slot === "drawing") && fileList && fileList[0]) {
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
            setImagePreview(canvas.toDataURL("image/jpeg", 0.82));
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

  const links = Number(form.num_links) || 0;
  const joints = Number(form.num_joints) || 0;
  const higherPairs = Number(form.higher_pairs) || 0;
  const dofCalc = calculateDof({ links, joints, higherPairs });
  const dof = dofCalc.result;

  function handleSubmit(e) {
    e.preventDefault();
    const finalCover = imagePreview || imageUrlInput.trim() || null;
    const payload = {
      ...form,
      student_name: form.student_name.trim(),
      team_members: form.student_name.trim(),
      short_description: form.description
        ? (form.description.slice(0, 140) + (form.description.length > 140 ? "..." : ""))
        : "",
      detailed_description: form.description || "",
      working_principle: form.description || "",
      num_links: links || null,
      num_joints: joints || null,
      degrees_of_freedom: dof,
      external_links: form.video_url ? [form.video_url.trim()] : [],
      college: "NMIET",
      department: "Mechanical Engineering",
      cover_image: finalCover,
    };
    onSubmit(payload, files);
  }

  return (
    <form className="project-form tom-form" onSubmit={handleSubmit}>
      <div className="project-form__header">
        <div>
          <p className="project-form__eyebrow">TOM Mechanism Showcase · NMIET</p>
          <h2 className="project-form__title">Add Your Mechanism</h2>
        </div>
        <p className="project-form__hint">
          Quick submission for NMIET Mechanical Engineering students.
        </p>
      </div>

      <h3 className="tom-form__section-title">1. Basic Details</h3>
      <div className="project-form__grid">
        <label className="field">
          <span className="field__label">Mechanism Name *</span>
          <input
            className="field__control"
            name="name"
            placeholder="e.g. Four-Bar Linkage / Whitworth Quick Return"
            value={form.name}
            onChange={handleChange}
            required
          />
        </label>

        <label className="field">
          <span className="field__label">Category *</span>
          <select
            className="field__control"
            name="category"
            value={form.category}
            onChange={handleChange}
            required
          >
            {TOM_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>

        <label className="field field--wide" style={{ gridColumn: "1 / -1" }}>
          <span className="field__label">Mechanism Description &amp; Working Principle</span>
          <textarea
            className="field__control field__control--textarea"
            name="description"
            rows={3}
            placeholder="Explain what the mechanism does, how it transforms motion, and its key practical applications..."
            value={form.description}
            onChange={handleChange}
          />
        </label>
      </div>

      <h3 className="tom-form__section-title">2. Kinematic Mobility</h3>
      <div className="project-form__grid">
        <label className="field">
          <span className="field__label">Number of Links (L)</span>
          <input
            className="field__control"
            name="num_links"
            type="number"
            min="1"
            value={form.num_links}
            onChange={handleChange}
          />
        </label>

        <label className="field">
          <span className="field__label">Lower Pairs / Joints (J)</span>
          <input
            className="field__control"
            name="num_joints"
            type="number"
            min="0"
            value={form.num_joints}
            onChange={handleChange}
          />
        </label>

        <label className="field">
          <span className="field__label">Higher Pairs (H)</span>
          <input
            className="field__control"
            name="higher_pairs"
            type="number"
            min="0"
            value={form.higher_pairs}
            onChange={handleChange}
          />
        </label>

        <div className="field" style={{ justifyContent: "center" }}>
          <span className="field__label">Calculated Mobility (DOF)</span>
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "10px 14px",
            borderRadius: "12px",
            background: "rgba(251, 191, 36, 0.08)",
            border: "1px solid rgba(251, 191, 36, 0.25)",
            fontFamily: "var(--font-mono, monospace)",
            fontSize: "0.85rem",
            color: "var(--gold, #fbbf24)"
          }}>
            <strong>DOF = {dof}</strong>
            <span style={{ fontSize: "0.75rem", color: "var(--muted, #94a3b8)" }}>
              {dof === 1
                ? "(1 Input constrained motion)"
                : dof > 1
                ? `(${dof} Inputs needed)`
                : "(Locked frame/structure)"}
            </span>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem", marginTop: "1rem", marginBottom: "0.5rem" }}>
        <h3 className="tom-form__section-title" style={{ margin: 0, border: "none", paddingTop: 0 }}>
          3. Student Members
        </h3>
        <span style={{ fontSize: "0.8rem", color: "var(--accent, #6366f1)", background: "rgba(99, 102, 241, 0.1)", border: "1px solid rgba(99, 102, 241, 0.2)", padding: "0.25rem 0.75rem", borderRadius: "9999px", fontWeight: 500 }}>
          🏛 NMIET · Mechanical Engineering
        </span>
      </div>
      <div className="project-form__grid">
        <label className="field field--wide" style={{ gridColumn: "1 / -1" }}>
          <span className="field__label">Student Member(s) *</span>
          <input
            className="field__control"
            name="student_name"
            placeholder="e.g. Aarav Patil, Sakshi Verma, Rahul Shinde (All members in one entry)"
            value={form.student_name}
            onChange={handleChange}
            required
          />
          <span className="field__hint" style={{ fontSize: "0.75rem", color: "var(--muted, #94a3b8)", marginTop: "4px" }}>
            All student project members in a single entry (comma-separated for group projects).
          </span>
        </label>

        <label className="field">
          <span className="field__label">Academic Year / Class</span>
          <input
            className="field__control"
            name="academic_year"
            placeholder="e.g. SE Mech / TE Mech"
            value={form.academic_year}
            onChange={handleChange}
          />
        </label>

        <label className="field">
          <span className="field__label">Video / Demo URL (Optional)</span>
          <input
            className="field__control"
            name="video_url"
            placeholder="YouTube, Google Drive, or Loom link"
            value={form.video_url}
            onChange={handleChange}
          />
        </label>
      </div>

      <h3 className="tom-form__section-title">4. Mechanism Image / Poster &amp; Project Files</h3>
      <p style={{ margin: "0 0 12px 0", fontSize: "0.82rem", color: "var(--muted)" }}>
        Upload a photo or CAD screenshot of your mechanism. It will serve directly as the showcase thumbnail poster in the repository.
      </p>

      {imagePreview && (
        <div style={{
          display: "flex",
          gap: "16px",
          alignItems: "center",
          padding: "12px 16px",
          background: "rgba(56, 189, 248, 0.08)",
          border: "1px solid rgba(56, 189, 248, 0.3)",
          borderRadius: "14px",
          marginBottom: "16px"
        }}>
          <img
            src={imagePreview}
            alt="Thumbnail preview"
            style={{
              width: "100px",
              height: "70px",
              borderRadius: "8px",
              objectFit: "cover",
              border: "1px solid rgba(255,255,255,0.2)"
            }}
          />
          <div style={{ flex: 1 }}>
            <span style={{ display: "inline-block", fontSize: "0.72rem", fontWeight: 700, color: "#34d399", background: "rgba(52, 211, 153, 0.15)", padding: "2px 8px", borderRadius: "999px", marginBottom: "4px" }}>
              ✓ Repository Thumbnail Active
            </span>
            <p style={{ margin: 0, fontSize: "0.8rem", color: "#f8fafc" }}>
              This image is optimized and will be displayed as the card poster in the repository.
            </p>
          </div>
          <button
            type="button"
            className="button button--ghost"
            style={{ padding: "4px 10px", fontSize: "0.75rem", height: "auto" }}
            onClick={() => {
              setImagePreview("");
              setImageUrlInput("");
            }}
          >
            ✕ Remove
          </button>
        </div>
      )}

      <div className="tom-form__uploads">
        {FILE_SLOTS.map((slot) => (
          <label key={slot.key} className="field tom-upload">
            <span className="field__label">{slot.label}</span>
            <span className="tom-upload__hint">{slot.hint}</span>
            <input
              className="tom-upload__input"
              type="file"
              multiple={slot.key !== "image"}
              accept={ACCEPT[slot.key]}
              onChange={(e) => handleFileChange(slot.key, e.target.files)}
            />
            {files[slot.key]?.length > 0 && (
              <span className="tom-upload__count">{files[slot.key].length} file(s) selected</span>
            )}
          </label>
        ))}
      </div>

      <label className="field" style={{ marginTop: "12px" }}>
        <span className="field__label">Or Paste Image URL (Optional)</span>
        <input
          className="field__control"
          placeholder="https://... direct image link"
          value={imageUrlInput}
          onChange={handleUrlChange}
        />
      </label>

      <div className="project-form__footer">
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
