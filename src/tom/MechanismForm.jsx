import { useState } from "react";
import { EMPTY_MECHANISM_FORM, TOM_CATEGORIES, ACCEPT, MECHANISM_TYPE_SUGGESTIONS } from "./tomConstants";
import { suggestAnimationDescription } from "./tomKinematics";

const FILE_SLOTS = [
  { key: "image",     label: "Mechanism Images",        hint: "Photos of the built/CAD model" },
  { key: "drawing",   label: "Engineering Drawings",     hint: "Orthographic / dimensioned views" },
  { key: "video",     label: "Working Video",            hint: "Mechanism in motion" },
  { key: "animation", label: "Animation / Simulation",   hint: "GIF or rendered animation" },
  { key: "cad",       label: "CAD Files",                hint: "STEP, DWG, SLDPRT, STL, etc." },
  { key: "document",  label: "PDFs / Documentation",     hint: "Report, datasheet, references" },
  { key: "other",     label: "Other Supporting Files",   hint: "Anything else worth attaching" },
];

export default function MechanismForm({ onCancel, onSubmit, submitting, formError }) {
  const [form, setForm] = useState(EMPTY_MECHANISM_FORM);
  const [files, setFiles] = useState({});

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((cur) => ({ ...cur, [name]: value }));
  }

  function handleFileChange(slot, fileList) {
    setFiles((cur) => ({ ...cur, [slot]: fileList }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    onSubmit(form, files);
  }

  return (
    <form className="project-form tom-form" onSubmit={handleSubmit}>
      <div className="project-form__header">
        <div>
          <p className="project-form__eyebrow">TOM Mechanism Showcase</p>
          <h2 className="project-form__title">Add Your Mechanism</h2>
        </div>
        <p className="project-form__hint">
          Submissions go to admin review before appearing in the public showcase.
        </p>
      </div>

      {/* ── BASIC INFORMATION ─────────────────────────────────────────── */}
      <h3 className="tom-form__section-title">Basic Information</h3>
      <div className="project-form__grid">
        <label className="field">
          <span className="field__label">Mechanism Name *</span>
          <input className="field__control" name="name" placeholder="Four Bar Mechanism"
            value={form.name} onChange={handleChange} required />
        </label>

        <label className="field">
          <span className="field__label">Category *</span>
          <input className="field__control" name="category" list="tom-category-suggestions"
            placeholder="Four-bar, Cam mechanisms..." value={form.category} onChange={handleChange} required />
          <datalist id="tom-category-suggestions">
            {TOM_CATEGORIES.map((c) => <option key={c} value={c} />)}
          </datalist>
        </label>

        <label className="field field--wide">
          <span className="field__label">Short Description</span>
          <textarea className="field__control field__control--textarea" name="short_description" rows={2}
            placeholder="One or two lines for the mechanism card." value={form.short_description} onChange={handleChange} />
        </label>

        <label className="field field--wide">
          <span className="field__label">Detailed Description</span>
          <textarea className="field__control field__control--textarea" name="detailed_description" rows={4}
            placeholder="Full explanation for the showcase page." value={form.detailed_description} onChange={handleChange} />
        </label>

        <label className="field field--wide">
          <span className="field__label">Working Principle</span>
          <textarea className="field__control field__control--textarea" name="working_principle" rows={3}
            value={form.working_principle} onChange={handleChange} />
        </label>

        <label className="field field--wide">
          <span className="field__label">Applications</span>
          <textarea className="field__control field__control--textarea" name="applications" rows={2}
            value={form.applications} onChange={handleChange} />
        </label>
      </div>

      {/* ── TECHNICAL INFORMATION ─────────────────────────────────────── */}
      <h3 className="tom-form__section-title">Technical Information</h3>
      <div className="project-form__grid">
        <label className="field">
          <span className="field__label">Number of Links</span>
          <input className="field__control" name="num_links" type="number" min="0"
            value={form.num_links} onChange={handleChange} />
        </label>
        <label className="field">
          <span className="field__label">Number of Joints</span>
          <input className="field__control" name="num_joints" type="number" min="0"
            value={form.num_joints} onChange={handleChange} />
        </label>
        <label className="field">
          <span className="field__label">Higher Pairs (H)</span>
          <input className="field__control" name="num_higher_pairs" type="number" min="0"
            value={form.num_higher_pairs} onChange={handleChange} />
          <span className="field__hint">Used by the live DOF calculator (Grubler's equation).</span>
        </label>
        <label className="field">
          <span className="field__label">Kinematic Pairs</span>
          <input className="field__control" name="kinematic_pairs" placeholder="Turning, sliding..."
            value={form.kinematic_pairs} onChange={handleChange} />
        </label>
        <label className="field">
          <span className="field__label">Degrees of Freedom</span>
          <input className="field__control" name="degrees_of_freedom" type="number" min="0"
            value={form.degrees_of_freedom} onChange={handleChange} />
        </label>
        <label className="field">
          <span className="field__label">Input Link</span>
          <input className="field__control" name="input_link"
            value={form.input_link} onChange={handleChange} />
        </label>
        <label className="field">
          <span className="field__label">Output Link</span>
          <input className="field__control" name="output_link"
            value={form.output_link} onChange={handleChange} />
        </label>
        <label className="field field--wide">
          <span className="field__label">Additional Technical Details</span>
          <textarea className="field__control field__control--textarea" name="additional_technical_details" rows={3}
            value={form.additional_technical_details} onChange={handleChange} />
        </label>
        <label className="field field--wide">
          <span className="field__label">Mechanism Type</span>
          <input className="field__control" name="mechanism_type" list="tom-mechanism-type-suggestions"
            placeholder="Leave blank unless it needs a special live-preview animation"
            value={form.mechanism_type} onChange={handleChange} />
          <datalist id="tom-mechanism-type-suggestions">
            {MECHANISM_TYPE_SUGGESTIONS.map((t) => <option key={t} value={t} />)}
          </datalist>
          <span className="field__hint">
            Optional. Most categories get their live-preview animation automatically from Category above —
            only set this for special cases like "pick-and-place".
          </span>
        </label>
      </div>

      {/* ── VIDEO & LIVE PREVIEW CAPTION ──────────────────────────────── */}
      <h3 className="tom-form__section-title">Video &amp; Animation Caption</h3>
      <div className="project-form__grid">
        <label className="field field--wide">
          <span className="field__label">Video URL (optional)</span>
          <input className="field__control" name="video_url" placeholder="https://www.youtube.com/embed/..."
            value={form.video_url} onChange={handleChange} />
          <span className="field__hint">Use a YouTube "embed" URL — a normal watch/share link won't play here.</span>
        </label>
        <label className="field field--wide">
          <span className="field__label">Animation Caption (optional)</span>
          <div style={{ display: "flex", gap: 8 }}>
            <textarea className="field__control field__control--textarea" name="animation_description" rows={2}
              placeholder="One line describing the motion — shown under the live preview."
              value={form.animation_description} onChange={handleChange} style={{ flex: 1 }} />
            <button type="button" className="button button--ghost" style={{ alignSelf: "flex-start" }}
              onClick={() => setForm((cur) => ({
                ...cur,
                animation_description: suggestAnimationDescription({
                  name: cur.name, category: cur.category, mechanism_type: cur.mechanism_type,
                }),
              }))}>
              Suggest
            </button>
          </div>
          <span className="field__hint">"Suggest" fills in a draft from the name/category — edit it however you like.</span>
        </label>
      </div>

      {/* ── STUDENT INFORMATION ───────────────────────────────────────── */}
      <h3 className="tom-form__section-title">Student Information</h3>
      <div className="project-form__grid">
        <label className="field">
          <span className="field__label">Student Name *</span>
          <input className="field__control" name="student_name"
            value={form.student_name} onChange={handleChange} required />
        </label>
        <label className="field">
          <span className="field__label">Team Members</span>
          <input className="field__control" name="team_members" placeholder="Comma separated"
            value={form.team_members} onChange={handleChange} />
        </label>
        <label className="field">
          <span className="field__label">Department</span>
          <input className="field__control" name="department" placeholder="Mechanical Engineering"
            value={form.department} onChange={handleChange} />
        </label>
        <label className="field">
          <span className="field__label">College / Institution</span>
          <input className="field__control" name="college" placeholder="NMIET"
            value={form.college} onChange={handleChange} />
        </label>
        <label className="field">
          <span className="field__label">Academic Year</span>
          <input className="field__control" name="academic_year" placeholder="SE Mech, 2025-28"
            value={form.academic_year} onChange={handleChange} />
        </label>
        <label className="field">
          <span className="field__label">External Links</span>
          <input className="field__control" name="external_links" placeholder="Comma separated URLs"
            value={form.external_links} onChange={handleChange} />
        </label>
      </div>

      {/* ── MEDIA & RESOURCES ─────────────────────────────────────────── */}
      <h3 className="tom-form__section-title">Media &amp; Resources</h3>
      <div className="tom-form__uploads">
        {FILE_SLOTS.map((slot) => (
          <label key={slot.key} className="field tom-upload">
            <span className="field__label">{slot.label}</span>
            <span className="tom-upload__hint">{slot.hint}</span>
            <input
              className="tom-upload__input"
              type="file"
              multiple
              accept={ACCEPT[slot.key]}
              onChange={(e) => handleFileChange(slot.key, e.target.files)}
            />
            {files[slot.key]?.length > 0 && (
              <span className="tom-upload__count">{files[slot.key].length} file(s) selected</span>
            )}
          </label>
        ))}
      </div>

      <div className="project-form__footer">
        <div className="project-form__message" role="status" aria-live="polite">{formError}</div>
        <div className="project-form__actions">
          <button type="button" className="button button--ghost" onClick={onCancel} disabled={submitting}>
            Cancel
          </button>
          <button type="submit" className="button button--primary" disabled={submitting}>
            {submitting ? "Submitting…" : "Submit for Review"}
          </button>
        </div>
      </div>
    </form>
  );
}
