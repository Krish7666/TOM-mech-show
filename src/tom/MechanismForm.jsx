import { useState } from "react";
import { EMPTY_MECHANISM_FORM, ACCEPT, ACADEMIC_YEARS } from "./tomConstants";
import { validateUploadFile } from "./tomApi";

function isHtmlFormatUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== "string") return false;
  const u = rawUrl.trim().toLowerCase();
  return (
    u.endsWith(".html") ||
    u.endsWith(".htm") ||
    u.includes(".html?") ||
    u.includes(".htm?") ||
    u.startsWith("data:text/html")
  );
}

export default function MechanismForm({ onCancel, onSubmit, submitting, formError: externalFormError }) {
  const [form, setForm] = useState(EMPTY_MECHANISM_FORM);
  const [files, setFiles] = useState({});
  const [imagePreview, setImagePreview] = useState("");
  const [bgImagePreview, setBgImagePreview] = useState("");
  const [imageUrlInput, setImageUrlInput] = useState("");
  const [bgImageUrl, setBgImageUrl] = useState("");
  const [localError, setLocalError] = useState("");
  const [animMode, setAnimMode] = useState("upload"); // "upload" | "url"
  const [htmlFileObj, setHtmlFileObj] = useState(null);
  const [htmlFilePreview, setHtmlFilePreview] = useState("");

  const formError = localError || externalFormError;

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((cur) => ({ ...cur, [name]: value }));
    if (name === "html_animation_url" && localError) {
      setLocalError("");
    }
  }

  function handleHtmlFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!/\.(html|htm)$/i.test(file.name)) {
      setLocalError("Please select an animation file with a .html or .htm extension.");
      return;
    }
    setLocalError("");
    setHtmlFileObj(file);
    setFiles((cur) => ({ ...cur, animation_html: [file] }));
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target.result;
      setHtmlFilePreview(dataUrl);
      setForm((cur) => ({ ...cur, html_animation_url: dataUrl }));
    };
    reader.readAsDataURL(file);
  }

  function handleFileChange(slot, fileList) {
    if (fileList && fileList.length > 0) {
      for (const file of Array.from(fileList)) {
        const val = validateUploadFile(file);
        if (!val.valid) {
          setLocalError(val.error);
          return;
        }
      }
    }
    setLocalError("");
    setFiles((cur) => ({ ...cur, [slot]: fileList }));

    if ((slot === "image" || slot === "background_image") && fileList && fileList[0]) {
      const file = fileList[0];
      const reader = new FileReader();
      reader.onload = (e) => {
        const rawData = e.target.result;
        if (typeof window === "undefined" || !window.Image) {
          if (slot === "image") setImagePreview(rawData);
          else setBgImagePreview(rawData);
          return;
        }
        const img = new Image();
        img.onload = () => {
          const maxWidth = slot === "image" ? 800 : 1920;
          const maxHeight = slot === "image" ? 600 : 1080;
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
            const compressed = canvas.toDataURL("image/jpeg", 0.85);
            if (slot === "image") setImagePreview(compressed);
            else setBgImagePreview(compressed);
          } else {
            if (slot === "image") setImagePreview(rawData);
            else setBgImagePreview(rawData);
          }
        };
        img.onerror = () => {
          if (slot === "image") setImagePreview(rawData);
          else setBgImagePreview(rawData);
        };
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
    setLocalError("");

    const animUrl = (form.html_animation_url || "").trim();
    if (animUrl && !htmlFileObj) {
      const lower = animUrl.toLowerCase();
      if (!lower.startsWith("http://") && !lower.startsWith("https://") && !lower.startsWith("data:text/html")) {
        setLocalError("HTML Animation link must start with http:// or https://");
        return;
      }
      if (!isHtmlFormatUrl(animUrl)) {
        setLocalError("Animation link must be in HTML format (.html only). Example: https://example.com/animation.html");
        return;
      }
    }

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
      html_animation_url: animUrl || null,
      animation_url: animUrl || (form.animation_url ? form.animation_url.trim() : null),
      virtual_mechanism_url: form.virtual_mechanism_url ? form.virtual_mechanism_url.trim() : null,
      external_links: [
        ...(animUrl ? [animUrl] : []),
        ...(form.video_url ? [form.video_url.trim()] : []),
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
          <select
            className="field__control"
            name="academic_year"
            value={form.academic_year}
            onChange={handleChange}
          >
            {ACADEMIC_YEARS.map((yr) => (
              <option key={yr} value={yr}>
                {yr}
              </option>
            ))}
          </select>
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
      {(imagePreview || bgImageUrl || bgImagePreview) && (
        <div style={{
          display: "flex",
          gap: "16px",
          alignItems: "center",
          padding: "14px 18px",
          background: (bgImagePreview || bgImageUrl)
            ? `linear-gradient(rgba(12, 16, 26, 0.78), rgba(12, 16, 26, 0.94)), url(${bgImagePreview || bgImageUrl}) center/cover no-repeat`
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
              ✓ Thumbnail Ready {(bgImageUrl || bgImagePreview) && "+ Background Set"}
            </strong>
            <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--muted)" }}>
              {imagePreview ? "Mechanism image is set." : "Card background is set."}
              {(bgImageUrl || bgImagePreview) && " Custom background backdrop applied."}
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
              setBgImagePreview("");
              setFiles((cur) => {
                const copy = { ...cur };
                delete copy.image;
                delete copy.background_image;
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

        <label className="field">
          <span className="field__label">Upload Background Image (Optional)</span>
          <input
            className="field__control"
            type="file"
            accept="image/*"
            onChange={(e) => handleFileChange("background_image", e.target.files)}
          />
          <span className="field__hint" style={{ fontSize: "0.74rem", color: "var(--muted)" }}>
            Select a local image to use as the backdrop for your card.
          </span>
        </label>

        <label className="field">
          <span className="field__label">Or Paste Background Link (Optional)</span>
          <input
            className="field__control"
            name="background_image"
            placeholder="https://... direct image link"
            value={bgImageUrl}
            onChange={(e) => setBgImageUrl(e.target.value)}
          />
          <span className="field__hint" style={{ fontSize: "0.74rem", color: "var(--muted)" }}>
            Paste an image link to use as the background backdrop.
          </span>
        </label>
      </div>

      <h3 className="tom-form__section-title" style={{ marginTop: "1.4rem" }}>
        4. Interactive Mechanism Animation (HTML Format Only)
      </h3>
      <p style={{ margin: "0 0 14px 0", fontSize: "0.86rem", color: "var(--muted)" }}>
        Upload your mechanism animation file in HTML format (<strong>.html file</strong>) or provide an external web link.
        A live interactive preview will load below, and your animation will be displayed directly on your mechanism's page!
      </p>

      {/* Mode Switcher */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "14px", flexWrap: "wrap" }}>
        <button
          type="button"
          className={`button ${animMode === "upload" ? "button--primary" : "button--secondary"}`}
          style={{ fontSize: "0.85rem", padding: "7px 18px" }}
          onClick={() => setAnimMode("upload")}
        >
          📁 Upload .html File
        </button>
        <button
          type="button"
          className={`button ${animMode === "url" ? "button--primary" : "button--secondary"}`}
          style={{ fontSize: "0.85rem", padding: "7px 18px" }}
          onClick={() => setAnimMode("url")}
        >
          🔗 Enter .html Web Link
        </button>
      </div>

      {/* Live Animation & Virtual Mechanism Status Badge */}
      {(htmlFileObj || form.html_animation_url || files.animation?.[0] || form.animation_url || files.virtual_mechanism?.[0] || form.virtual_mechanism_url) && (
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
          {htmlFileObj && (
            <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.84rem", color: "#38bdf8" }}>
              <span>📁</span>
              <span>
                <strong>HTML File Selected:</strong> {htmlFileObj.name} ({(htmlFileObj.size / 1024).toFixed(1)} KB)
              </span>
            </div>
          )}
          {!htmlFileObj && form.html_animation_url && (
            <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.84rem", color: "#38bdf8" }}>
              <span>🌐</span>
              <span>
                <strong>HTML Animation Linked:</strong> {form.html_animation_url}
              </span>
            </div>
          )}
          {(files.animation?.[0] || form.animation_url) && (
            <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.84rem", color: "#38bdf8" }}>
              <span>🌀</span>
              <span>
                <strong>Animation Media:</strong> {files.animation?.[0]?.name || form.animation_url}
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

      {animMode === "upload" ? (
        <div style={{
          border: "2px dashed rgba(56, 189, 248, 0.4)",
          borderRadius: "16px",
          padding: "24px 20px",
          textAlign: "center",
          background: "rgba(56, 189, 248, 0.04)",
          marginBottom: "16px",
        }}>
          {htmlFileObj ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: "1.8rem" }}>🌐</span>
                <div style={{ textAlign: "left" }}>
                  <strong style={{ color: "#38bdf8", fontSize: "0.95rem", display: "block" }}>
                    {htmlFileObj.name}
                  </strong>
                  <span style={{ fontSize: "0.76rem", color: "var(--muted)" }}>
                    {(htmlFileObj.size / 1024).toFixed(1)} KB · Ready to preview &amp; upload
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="button button--danger"
                style={{ padding: "6px 14px", fontSize: "0.8rem" }}
                onClick={() => {
                  setHtmlFileObj(null);
                  setHtmlFilePreview("");
                  setForm((cur) => ({ ...cur, html_animation_url: "" }));
                  setFiles((cur) => {
                    const copy = { ...cur };
                    delete copy.animation_html;
                    return copy;
                  });
                }}
              >
                ✕ Remove File
              </button>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: "2.2rem", marginBottom: 8 }}>🌐</div>
              <strong style={{ display: "block", color: "#f8fafc", fontSize: "0.95rem", marginBottom: 6 }}>
                Click to browse or drop your .html animation file here
              </strong>
              <p style={{ margin: "0 0 14px", fontSize: "0.8rem", color: "var(--muted)" }}>
                Accepts standalone HTML files (.html / .htm) with CSS, SVG, or Canvas animation.
              </p>
              <label className="button button--primary" style={{ display: "inline-flex", cursor: "pointer", padding: "8px 22px", fontSize: "0.85rem" }}>
                Select .html File
                <input
                  type="file"
                  accept=".html,.htm,text/html"
                  onChange={handleHtmlFileChange}
                  style={{ display: "none" }}
                />
              </label>
            </div>
          )}
        </div>
      ) : (
        <div className="project-form__grid" style={{ marginBottom: "16px" }}>
          <label className="field field--wide" style={{ gridColumn: "1 / -1" }}>
            <span className="field__label" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>HTML Animation Link / URL (.html format only) *</span>
              <span style={{ fontSize: "0.72rem", color: "var(--cyan)", background: "rgba(56, 189, 248, 0.12)", border: "1px solid rgba(56, 189, 248, 0.25)", padding: "2px 8px", borderRadius: "999px", fontWeight: 600 }}>
                🌐 HTML Format Only
              </span>
            </span>
            <input
              className="field__control"
              type="url"
              name="html_animation_url"
              placeholder="https://.../mechanism-animation.html (e.g. hosted on GitHub Pages or web server)"
              value={form.html_animation_url || ""}
              onChange={handleChange}
            />
            <span className="field__hint" style={{ fontSize: "0.74rem", color: "var(--muted)", marginTop: "4px" }}>
              Submit a direct link to your HTML animation. Must end in <strong>.html</strong> or <strong>.htm</strong>.
            </span>
          </label>
        </div>
      )}

      {/* Live Interactive HTML Animation Preview while filling the form */}
      {(htmlFilePreview || (form.html_animation_url && form.html_animation_url.trim())) && (
        <div style={{
          padding: "16px",
          borderRadius: "16px",
          border: (htmlFilePreview || isHtmlFormatUrl(form.html_animation_url)) ? "1px solid rgba(56, 189, 248, 0.4)" : "1px solid rgba(239, 68, 68, 0.4)",
          background: (htmlFilePreview || isHtmlFormatUrl(form.html_animation_url)) ? "rgba(56, 189, 248, 0.05)" : "rgba(239, 68, 68, 0.05)",
          marginBottom: "16px",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: "1.2rem" }}>{(htmlFilePreview || isHtmlFormatUrl(form.html_animation_url)) ? "🌐" : "⚠️"}</span>
              <div>
                <strong style={{ fontSize: "0.88rem", color: (htmlFilePreview || isHtmlFormatUrl(form.html_animation_url)) ? "#38bdf8" : "#f87171" }}>
                  {(htmlFilePreview || isHtmlFormatUrl(form.html_animation_url)) ? "Live HTML Animation Preview" : "Invalid Format: .html format only"}
                </strong>
                <span style={{ display: "block", fontSize: "0.76rem", color: "var(--muted)" }}>
                  {(htmlFilePreview || isHtmlFormatUrl(form.html_animation_url))
                    ? (htmlFileObj ? `Viewing uploaded file: ${htmlFileObj.name}` : "Interactive preview verified — this will be embedded directly on your mechanism's page.")
                    : "The link must end with .html or .htm. Other video or image formats are not allowed here."}
                </span>
              </div>
            </div>
            {form.html_animation_url && !htmlFilePreview && isHtmlFormatUrl(form.html_animation_url) && (
              <a
                href={form.html_animation_url.trim()}
                target="_blank"
                rel="noopener noreferrer"
                className="secondary-btn secondary-btn--small"
                style={{ textDecoration: "none" }}
              >
                Test in New Tab ↗
              </a>
            )}
          </div>

          {(htmlFilePreview || isHtmlFormatUrl(form.html_animation_url)) && (
            <div style={{
              width: "100%",
              height: "360px",
              borderRadius: "12px",
              overflow: "hidden",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              background: "#080c16",
            }}>
              <iframe
                src={htmlFilePreview || form.html_animation_url.trim()}
                title="Live HTML Animation Preview"
                sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-downloads"
                style={{ width: "100%", height: "100%", border: 0, display: "block" }}
                allow="accelerometer; autoplay; encrypted-media; gyroscope"
              />
            </div>
          )}
        </div>
      )}

      <div className="project-form__grid">
        <label className="field">
          <span className="field__label">Upload Animation File (Optional)</span>
          <input
            className="field__control"
            type="file"
            accept={ACCEPT.animation}
            onChange={(e) => handleFileChange("animation", e.target.files)}
          />
          <span className="field__hint" style={{ fontSize: "0.74rem", color: "var(--muted)" }}>
            Optional animated GIF, MP4, or WebM video file.
          </span>
        </label>

        <label className="field">
          <span className="field__label">Virtual Mechanism / Simulation Link (Optional)</span>
          <input
            className="field__control"
            name="virtual_mechanism_url"
            placeholder="e.g. GeoGebra, Desmos, Tinkercad URL"
            value={form.virtual_mechanism_url || ""}
            onChange={handleChange}
          />
          <span className="field__hint" style={{ fontSize: "0.74rem", color: "var(--muted)" }}>
            Link to any supplementary online virtual lab or simulation.
          </span>
        </label>
      </div>

      <h3 className="tom-form__section-title" style={{ marginTop: "1.4rem" }}>
        5. 3D CAD Model & Project Document
      </h3>
      <div className="project-form__grid">
        <label className="field">
          <span className="field__label">3D CAD Model (Optional)</span>
          <input
            className="field__control"
            type="file"
            accept={ACCEPT.cad}
            onChange={(e) => handleFileChange("cad", e.target.files)}
          />
          <span className="field__hint" style={{ fontSize: "0.74rem", color: "var(--muted)" }}>
            Upload STL, GLTF, or GLB for interactive 3D viewing.
          </span>
        </label>

        <label className="field">
          <span className="field__label">Project Report or Document (Optional)</span>
          <input
            className="field__control"
            type="file"
            accept={ACCEPT.document}
            onChange={(e) => handleFileChange("document", e.target.files)}
          />
          <span className="field__hint" style={{ fontSize: "0.74rem", color: "var(--muted)" }}>
            Upload PDF report, PPT synopsis, or project documentation if available.
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
