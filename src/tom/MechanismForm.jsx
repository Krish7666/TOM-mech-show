import { useState, useEffect } from "react";
import {
  EMPTY_MECHANISM_FORM,
  ACCEPT,
  ACADEMIC_YEARS,
  TOM_CATEGORIES,
  MOTION_TYPES,
} from "./tomConstants";
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

export default function MechanismForm({
  initialValues = null,
  isEditing = false,
  title = "",
  submitLabel = "",
  onCancel,
  onSubmit,
  submitting,
  formError: externalFormError,
}) {
  const [form, setForm] = useState(() => {
    if (initialValues) {
      return {
        ...EMPTY_MECHANISM_FORM,
        ...initialValues,
        name: initialValues.name || "",
        category: initialValues.category || "Four-bar",
        short_description: initialValues.short_description || "",
        detailed_description: initialValues.detailed_description || initialValues.description || "",
        description: initialValues.detailed_description || initialValues.description || initialValues.short_description || "",
        working_principle: initialValues.working_principle || initialValues.detailed_description || "",
        applications: initialValues.applications || "",
        num_links: String(initialValues.num_links ?? initialValues.links ?? 4),
        num_joints: String(initialValues.num_joints ?? initialValues.joints ?? 4),
        higher_pairs: String(initialValues.higher_pairs ?? initialValues.higherPairs ?? 0),
        degrees_of_freedom: Number(initialValues.degrees_of_freedom ?? 1),
        input_link: initialValues.input_link || "Link 1 (Driver / Crank)",
        output_link: initialValues.output_link || "Output / Rocker",
        student_name: initialValues.student_name || "",
        team_members: initialValues.team_members || "",
        academic_year: initialValues.academic_year || "TE Mech",
        motion_type: initialValues.motion_type || "Oscillating / Rocker",
        video_url: initialValues.video_url || initialValues.video || "",
        html_animation_url: initialValues.html_animation_url || initialValues.animation_url || "",
        animation_url: initialValues.html_animation_url || initialValues.animation_url || "",
        virtual_mechanism_url: initialValues.virtual_mechanism_url || "",
        department: initialValues.department || "Mechanical Engineering",
        college: initialValues.college || "NMIET",
        additional_technical_details: typeof initialValues.additional_technical_details === "string" ? initialValues.additional_technical_details : "",
      };
    }
    return { ...EMPTY_MECHANISM_FORM };
  });

  const [files, setFiles] = useState({});
  const [imagePreview, setImagePreview] = useState(() => initialValues?.cover_image || initialValues?.image || "");
  const [bgImagePreview, setBgImagePreview] = useState(() => initialValues?.background_image || initialValues?.bg_image_url || "");
  const [imageUrlInput, setImageUrlInput] = useState(() => (typeof initialValues?.cover_image === "string" && initialValues.cover_image.startsWith("http") ? initialValues.cover_image : ""));
  const [bgImageUrl, setBgImageUrl] = useState(() => (typeof initialValues?.background_image === "string" && initialValues.background_image.startsWith("http") ? initialValues.background_image : ""));
  const [localError, setLocalError] = useState("");
  const [animMode, setAnimMode] = useState(() => (initialValues?.html_animation_url && initialValues.html_animation_url.startsWith("http") ? "url" : "upload"));
  const [htmlFileObj, setHtmlFileObj] = useState(null);
  const [htmlFilePreview, setHtmlFilePreview] = useState(() => initialValues?.html_animation_url || initialValues?.animation_url || "");

  const formError = localError || externalFormError;

  // Sync state if initialValues changes
  useEffect(() => {
    if (initialValues) {
      setForm((cur) => ({
        ...cur,
        ...initialValues,
        name: initialValues.name || "",
        category: initialValues.category || "Four-bar",
        short_description: initialValues.short_description || "",
        detailed_description: initialValues.detailed_description || initialValues.description || "",
        description: initialValues.detailed_description || initialValues.description || initialValues.short_description || "",
        working_principle: initialValues.working_principle || initialValues.detailed_description || "",
        applications: initialValues.applications || "",
        num_links: String(initialValues.num_links ?? initialValues.links ?? 4),
        num_joints: String(initialValues.num_joints ?? initialValues.joints ?? 4),
        higher_pairs: String(initialValues.higher_pairs ?? initialValues.higherPairs ?? 0),
        degrees_of_freedom: Number(initialValues.degrees_of_freedom ?? 1),
        input_link: initialValues.input_link || "Link 1 (Driver / Crank)",
        output_link: initialValues.output_link || "Output / Rocker",
        student_name: initialValues.student_name || "",
        team_members: initialValues.team_members || "",
        academic_year: initialValues.academic_year || "TE Mech",
        motion_type: initialValues.motion_type || "Oscillating / Rocker",
        video_url: initialValues.video_url || initialValues.video || "",
        html_animation_url: initialValues.html_animation_url || initialValues.animation_url || "",
        animation_url: initialValues.html_animation_url || initialValues.animation_url || "",
        virtual_mechanism_url: initialValues.virtual_mechanism_url || "",
        department: initialValues.department || "Mechanical Engineering",
        college: initialValues.college || "NMIET",
        additional_technical_details: typeof initialValues.additional_technical_details === "string" ? initialValues.additional_technical_details : "",
      }));
      if (initialValues.cover_image || initialValues.image) {
        setImagePreview(initialValues.cover_image || initialValues.image);
      }
      if (initialValues.background_image || initialValues.bg_image_url) {
        setBgImagePreview(initialValues.background_image || initialValues.bg_image_url);
      }
      if (initialValues.html_animation_url || initialValues.animation_url) {
        setHtmlFilePreview(initialValues.html_animation_url || initialValues.animation_url);
      }
    }
  }, [initialValues]);

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

  // Calculate live Grubler DOF
  const numLinks = Math.max(1, parseInt(form.num_links || "4", 10) || 4);
  const numJoints = Math.max(0, parseInt(form.num_joints || "4", 10) || 4);
  const numHigher = Math.max(0, parseInt(form.higher_pairs || "0", 10) || 0);
  const calculatedDof = Math.max(0, 3 * (numLinks - 1) - 2 * numJoints - numHigher);

  async function handleSubmit(e) {
    e.preventDefault();
    setLocalError("");

    let animUrl = (form.html_animation_url || "").trim();

    // If an HTML file was uploaded, ensure it is converted to data URL before dispatching
    if (htmlFileObj && (!animUrl || animUrl.startsWith("blob:") || !animUrl.startsWith("data:text/html"))) {
      try {
        const dataUrl = await new Promise((resolve, reject) => {
          const r = new FileReader();
          r.onload = () => resolve(r.result);
          r.onerror = reject;
          r.readAsDataURL(htmlFileObj);
        });
        animUrl = dataUrl;
      } catch (err) {
        console.warn("Could not read HTML file as Data URL:", err);
      }
    }

    if (animUrl && !htmlFileObj) {
      const lower = animUrl.toLowerCase();
      if (!lower.startsWith("http://") && !lower.startsWith("https://") && !lower.startsWith("data:text/html") && !lower.startsWith("blob:")) {
        setLocalError("HTML Animation link must start with http:// or https://, or be an uploaded .html file.");
        return;
      }
      if (!isHtmlFormatUrl(animUrl)) {
        setLocalError("Animation link must be in HTML format (.html only). Example: https://example.com/animation.html");
        return;
      }
    }

    const finalCover = imagePreview || imageUrlInput.trim() || form.cover_image || null;
    const finalBg = bgImageUrl.trim() || bgImagePreview || form.background_image || null;
    const desc = (form.detailed_description || form.description || form.short_description || "").trim();

    const payload = {
      ...form,
      name: form.name.trim(),
      category: form.category || "Four-bar",
      student_name: form.student_name.trim(),
      team_members: form.team_members?.trim() || form.student_name.trim(),
      academic_year: form.academic_year || "TE Mech",
      short_description: form.short_description?.trim() || (desc ? (desc.slice(0, 140) + (desc.length > 140 ? "..." : "")) : "Student mechanism project."),
      detailed_description: desc,
      working_principle: form.working_principle?.trim() || desc,
      applications: form.applications?.trim() || null,
      num_links: numLinks,
      num_joints: numJoints,
      higher_pairs: numHigher,
      degrees_of_freedom: calculatedDof,
      input_link: form.input_link?.trim() || "Link 1 (Driver / Crank)",
      output_link: form.output_link?.trim() || "Output / Rocker",
      motion_type: form.motion_type || "Oscillating / Rocker",
      html_animation_url: animUrl || null,
      animation_url: animUrl || (form.animation_url ? form.animation_url.trim() : null),
      virtual_mechanism_url: form.virtual_mechanism_url ? form.virtual_mechanism_url.trim() : null,
      video_url: form.video_url ? form.video_url.trim() : (form.video ? form.video.trim() : ""),
      video: form.video_url ? form.video_url.trim() : (form.video ? form.video.trim() : ""),
      college: form.college?.trim() || "NMIET",
      department: form.department?.trim() || "Mechanical Engineering",
      additional_technical_details: form.additional_technical_details || "",
      cover_image: finalCover,
      preview_image_url: finalCover,
      background_image: finalBg,
      bg_image_url: finalBg,
    };

    onSubmit(payload, files);
  }

  return (
    <form className="project-form tom-form" onSubmit={handleSubmit}>
      <div className="project-form__header">
        <div>
          <p className="project-form__eyebrow">TOM Mechanism Showcase · NMIET Mechanical Engineering</p>
          <h2 className="project-form__title">
            {title || (isEditing ? "Edit Mechanism Specifications" : "Submit Your Mechanism")}
          </h2>
        </div>
        <p className="project-form__hint">
          {isEditing
            ? "Full editing panel: All technical parameters, descriptions, authors, and media files are open to edit."
            : "Share your mechanical engineering mechanism model with the showcase repository."}
        </p>
      </div>

      {/* SECTION 1: MECHANISM CLASSIFICATION & DESCRIPTIONS */}
      <h3 className="tom-form__section-title">1. Mechanism Overview &amp; Classification</h3>
      <div className="project-form__grid">
        <label className="field field--wide" style={{ gridColumn: "1 / -1" }}>
          <span className="field__label">Mechanism Name *</span>
          <input
            className="field__control"
            name="name"
            placeholder="e.g. Four-Bar Linkage / Whitworth Quick Return / Geneva Mechanism"
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
            {TOM_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span className="field__label">Short Summary (Card Preview)</span>
          <input
            className="field__control"
            name="short_description"
            placeholder="One-sentence highlight of this mechanism's purpose"
            value={form.short_description || ""}
            onChange={handleChange}
          />
        </label>

        <label className="field field--wide" style={{ gridColumn: "1 / -1" }}>
          <span className="field__label">Detailed Description &amp; Motion Characteristics</span>
          <textarea
            className="field__control field__control--textarea"
            name="detailed_description"
            rows={3}
            placeholder="Describe what the mechanism does, how it transforms motion (e.g. rotary to reciprocating), and key structural traits..."
            value={form.detailed_description || form.description || ""}
            onChange={(e) => {
              handleChange(e);
              setForm((cur) => ({ ...cur, description: e.target.value }));
            }}
          />
        </label>

        <label className="field field--wide" style={{ gridColumn: "1 / -1" }}>
          <span className="field__label">Working Principle &amp; Functional Operation</span>
          <textarea
            className="field__control field__control--textarea"
            name="working_principle"
            rows={3}
            placeholder="Explain step-by-step how the driver link actuates the system, transmission angles, and output behavior..."
            value={form.working_principle || ""}
            onChange={handleChange}
          />
        </label>

        <label className="field field--wide" style={{ gridColumn: "1 / -1" }}>
          <span className="field__label">Practical &amp; Industrial Applications</span>
          <textarea
            className="field__control field__control--textarea"
            name="applications"
            rows={2}
            placeholder="e.g. Shaper and slotting machines, automotive windshield wipers, robotics, printing presses..."
            value={form.applications || ""}
            onChange={handleChange}
          />
        </label>
      </div>

      {/* SECTION 2: AUTHORS & INSTITUTION */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem", marginTop: "1.4rem", marginBottom: "0.5rem" }}>
        <h3 className="tom-form__section-title" style={{ margin: 0, border: "none", paddingTop: 0 }}>
          2. Authors &amp; Institutional Details
        </h3>
        <span style={{ fontSize: "0.8rem", color: "var(--accent, #6366f1)", background: "rgba(99, 102, 241, 0.1)", border: "1px solid rgba(99, 102, 241, 0.2)", padding: "0.25rem 0.75rem", borderRadius: "9999px", fontWeight: 500 }}>
          🏛 NMIET · Mechanical Engineering
        </span>
      </div>

      <div className="project-form__grid">
        <label className="field" style={{ gridColumn: "span 2" }}>
          <span className="field__label">Student / Team Members *</span>
          <input
            className="field__control"
            name="student_name"
            placeholder="e.g. Aarav Patil, Sakshi Verma, Rahul Shinde (or single student name)"
            value={form.student_name}
            onChange={(e) => {
              const val = e.target.value;
              setForm((cur) => ({ ...cur, student_name: val, team_members: val }));
            }}
            required
          />
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
          <span className="field__label">Department</span>
          <input
            className="field__control"
            name="department"
            value={form.department || "Mechanical Engineering"}
            onChange={handleChange}
          />
        </label>

        <label className="field">
          <span className="field__label">College / Institute</span>
          <input
            className="field__control"
            name="college"
            value={form.college || "NMIET"}
            onChange={handleChange}
          />
        </label>
      </div>

      {/* SECTION 3: KINEMATICS & MOBILITY (DOF) */}
      <h3 className="tom-form__section-title" style={{ marginTop: "1.4rem" }}>
        3. Kinematics, Joints &amp; Mobility (DOF)
      </h3>
      <div className="project-form__grid">
        <label className="field">
          <span className="field__label">Number of Links (L)</span>
          <input
            className="field__control"
            type="number"
            min="1"
            name="num_links"
            value={form.num_links}
            onChange={handleChange}
          />
        </label>

        <label className="field">
          <span className="field__label">Number of Lower Pairs / Joints (J)</span>
          <input
            className="field__control"
            type="number"
            min="0"
            name="num_joints"
            value={form.num_joints}
            onChange={handleChange}
          />
        </label>

        <label className="field">
          <span className="field__label">Number of Higher Pairs (H)</span>
          <input
            className="field__control"
            type="number"
            min="0"
            name="higher_pairs"
            value={form.higher_pairs}
            onChange={handleChange}
          />
        </label>

        {/* Live Mobility Display Card */}
        <div style={{
          gridColumn: "1 / -1",
          padding: "10px 16px",
          background: "rgba(56, 189, 248, 0.08)",
          border: "1px solid rgba(56, 189, 248, 0.25)",
          borderRadius: "12px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "10px",
        }}>
          <div>
            <span style={{ fontSize: "0.78rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "1px", fontWeight: 700 }}>
              Kutzbach / Grübler Formula
            </span>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.95rem", color: "#f8fafc", marginTop: 2 }}>
              F = 3(L - 1) - 2J - H = 3({numLinks} - 1) - 2({numJoints}) - {numHigher}
            </div>
          </div>
          <div style={{
            background: calculatedDof === 1 ? "rgba(34, 197, 94, 0.2)" : "rgba(251, 191, 36, 0.2)",
            color: calculatedDof === 1 ? "#4ade80" : "#fbbf24",
            border: `1px solid ${calculatedDof === 1 ? "rgba(34, 197, 94, 0.4)" : "rgba(251, 191, 36, 0.4)"}`,
            padding: "6px 14px",
            borderRadius: "8px",
            fontWeight: "bold",
            fontSize: "0.95rem",
          }}>
            Mobility: {calculatedDof} DOF {calculatedDof === 1 ? "(Constrained Mechanism)" : calculatedDof === 0 ? "(Structure / Frame)" : "(Multi-Degree of Freedom)"}
          </div>
        </div>

        <label className="field">
          <span className="field__label">Motion Type</span>
          <select
            className="field__control"
            name="motion_type"
            value={form.motion_type}
            onChange={handleChange}
          >
            {MOTION_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span className="field__label">Input Link / Driver</span>
          <input
            className="field__control"
            name="input_link"
            placeholder="e.g. Link 1 (Driver / Crank)"
            value={form.input_link || ""}
            onChange={handleChange}
          />
        </label>

        <label className="field">
          <span className="field__label">Output Link / Follower</span>
          <input
            className="field__control"
            name="output_link"
            placeholder="e.g. Output / Rocker / Slider"
            value={form.output_link || ""}
            onChange={handleChange}
          />
        </label>
      </div>

      {/* SECTION 4: THUMBNAIL & BACKGROUND IMAGES */}
      <h3 className="tom-form__section-title" style={{ marginTop: "1.4rem" }}>
        4. Thumbnail Photo &amp; Visual Backdrop
      </h3>
      <p style={{ margin: "0 0 14px 0", fontSize: "0.86rem", color: "var(--muted)" }}>
        Add a photo of your mechanism. This image directly represents your model on the showcase card and header.
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
              ✓ Cover Photo Set {(bgImageUrl || bgImagePreview) && "+ Background Backdrop Ready"}
            </strong>
            <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--muted)" }}>
              {imagePreview ? "Mechanism card image is active." : "Card background is set."}
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
              setForm((cur) => ({ ...cur, cover_image: null, background_image: null }));
              setFiles((cur) => {
                const copy = { ...cur };
                delete copy.image;
                delete copy.background_image;
                return copy;
              });
            }}
          >
            ✕ Reset Visuals
          </button>
        </div>
      )}

      <div className="project-form__grid">
        <label className="field">
          <span className="field__label">Upload Cover Photo File</span>
          <input
            className="field__control"
            type="file"
            accept="image/*"
            onChange={(e) => handleFileChange("image", e.target.files)}
          />
          <span className="field__hint" style={{ fontSize: "0.74rem", color: "var(--muted)" }}>
            Select an image from your computer or phone.
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
            Paste a direct URL to any mechanism photo online.
          </span>
        </label>

        <label className="field">
          <span className="field__label">Upload Background Backdrop (Optional)</span>
          <input
            className="field__control"
            type="file"
            accept="image/*"
            onChange={(e) => handleFileChange("background_image", e.target.files)}
          />
          <span className="field__hint" style={{ fontSize: "0.74rem", color: "var(--muted)" }}>
            Optional full-bleed card backdrop.
          </span>
        </label>

        <label className="field">
          <span className="field__label">Or Paste Background URL (Optional)</span>
          <input
            className="field__control"
            name="background_image"
            placeholder="https://... direct image link"
            value={bgImageUrl}
            onChange={(e) => setBgImageUrl(e.target.value)}
          />
        </label>
      </div>

      {/* SECTION 5: INTERACTIVE HTML MECHANISM ANIMATION */}
      <h3 className="tom-form__section-title" style={{ marginTop: "1.4rem" }}>
        5. Interactive Mechanism Animation (HTML Format Only)
      </h3>
      <p style={{ margin: "0 0 14px 0", fontSize: "0.86rem", color: "var(--muted)" }}>
        Upload your standalone mechanism animation file in HTML format (<strong>.html file</strong>) or provide an external web link.
        A live interactive preview will load below, and your animation will be embedded directly on your mechanism's page!
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

      {/* Animation Status Card */}
      {(htmlFileObj || form.html_animation_url) && (
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
                <strong>HTML File Attached:</strong> {htmlFileObj.name} ({(htmlFileObj.size / 1024).toFixed(1)} KB)
              </span>
            </div>
          )}
          {!htmlFileObj && form.html_animation_url && (
            <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.84rem", color: "#38bdf8" }}>
              <span>🌐</span>
              <span>
                <strong>HTML Animation Source:</strong> {form.html_animation_url.startsWith("data:") ? "Embedded Standalone HTML File" : form.html_animation_url}
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
          {htmlFileObj || (htmlFilePreview && htmlFilePreview.startsWith("data:text/html")) ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: "1.8rem" }}>🌐</span>
                <div style={{ textAlign: "left" }}>
                  <strong style={{ display: "block", color: "#f8fafc", fontSize: "0.92rem" }}>
                    {htmlFileObj?.name || "Active Interactive HTML Animation"}
                  </strong>
                  <span style={{ fontSize: "0.78rem", color: "#38bdf8" }}>
                    ✓ Standalone HTML Simulation is loaded and ready
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="button button--ghost"
                style={{ fontSize: "0.8rem", padding: "6px 14px" }}
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
                Accepts standalone HTML files (.html / .htm) with CSS, SVG, or Canvas simulation.
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
                  {(htmlFilePreview || isHtmlFormatUrl(form.html_animation_url)) ? "Live Interactive HTML Animation Preview" : "Invalid Format: .html format only"}
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

      {/* SECTION 6: SUPPLEMENTARY MEDIA, CAD & DOCUMENTATION */}
      <h3 className="tom-form__section-title" style={{ marginTop: "1.4rem" }}>
        6. Supplementary Media, CAD &amp; Documentation
      </h3>
      <div className="project-form__grid">
        <label className="field">
          <span className="field__label">Video Demo URL (Optional)</span>
          <input
            className="field__control"
            name="video_url"
            placeholder="YouTube, Vimeo, or Google Drive video link"
            value={form.video_url || form.video || ""}
            onChange={handleChange}
          />
          <span className="field__hint" style={{ fontSize: "0.74rem", color: "var(--muted)" }}>
            Direct link to video demonstration.
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
            Supplementary simulation or virtual lab link.
          </span>
        </label>

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
            Upload PDF report or documentation.
          </span>
        </label>

        <label className="field field--wide" style={{ gridColumn: "1 / -1" }}>
          <span className="field__label">Additional Technical Notes / Observations</span>
          <textarea
            className="field__control field__control--textarea"
            name="additional_technical_details"
            rows={2}
            placeholder="Add any faculty notes, special kinematic considerations, assembly notes, or references..."
            value={form.additional_technical_details || ""}
            onChange={handleChange}
          />
        </label>
      </div>

      <div className="project-form__footer" style={{ marginTop: "1.8rem" }}>
        <div className="project-form__message" role="status" aria-live="polite">{formError}</div>
        <div className="project-form__actions">
          <button type="button" className="button button--ghost" onClick={onCancel} disabled={submitting}>
            Cancel
          </button>
          <button type="submit" className="button button--primary" disabled={submitting}>
            {submitting ? "Saving…" : (submitLabel || (isEditing ? "Save Changes" : "Publish Mechanism"))}
          </button>
        </div>
      </div>
    </form>
  );
}
