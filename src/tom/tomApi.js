import { supabase } from "../lib/supabaseClient";
import { MECHANISM_STATUS } from "./tomConstants";

const MECHANISMS_TABLE = "tom_mechanisms";
const MEDIA_TABLE      = "tom_mechanism_media";
const STORAGE_BUCKET   = "tom-media";

function missingSupabaseError() {
  return new Error("Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON to your .env file.");
}

// ─── READ ───────────────────────────────────────────────────────────────────

/** Public grid: only approved mechanisms. */
export async function fetchApprovedMechanisms() {
  if (!supabase) return { data: [], error: missingSupabaseError() };
  const { data, error } = await supabase
    .from(MECHANISMS_TABLE)
    .select("*, tom_mechanism_media(count)")
    .eq("status", MECHANISM_STATUS.APPROVED)
    .order("created_at", { ascending: false });
  return { data: data || [], error };
}

/** Admin moderation queue: everything waiting for review. */
export async function fetchPendingMechanisms() {
  if (!supabase) return { data: [], error: missingSupabaseError() };
  const { data, error } = await supabase
    .from(MECHANISMS_TABLE)
    .select("*")
    .eq("status", MECHANISM_STATUS.PENDING)
    .order("created_at", { ascending: true });
  return { data: data || [], error };
}

/** Full detail (mechanism + all its media rows) for the showcase page. */
export async function fetchMechanismDetail(id) {
  if (!supabase) return { mechanism: null, media: [], error: missingSupabaseError() };
  const [{ data: mechanism, error: mechError }, { data: media, error: mediaError }] =
    await Promise.all([
      supabase.from(MECHANISMS_TABLE).select("*").eq("id", id).single(),
      supabase.from(MEDIA_TABLE).select("*").eq("mechanism_id", id).order("created_at", { ascending: true }),
    ]);
  return { mechanism, media: media || [], error: mechError || mediaError };
}

// ─── WRITE ──────────────────────────────────────────────────────────────────

/**
 * Creates a mechanism (status: pending) and uploads its attached files,
 * writing one tom_mechanism_media row per successfully uploaded file.
 * filesByType: { image: FileList|File[], video: [...], animation, cad, document, drawing, other }
 * Returns { mechanism, uploadErrors } — uploadErrors is a list of {type, name, message}
 * for any individual file that failed, so the rest of the submission still succeeds.
 */
export async function submitMechanism(formValues, filesByType) {
  if (!supabase) return { mechanism: null, uploadErrors: [], error: missingSupabaseError() };

  const payload = {
    name:                          formValues.name.trim(),
    category:                      formValues.category,
    short_description:             formValues.short_description,
    detailed_description:          formValues.detailed_description,
    working_principle:             formValues.working_principle,
    applications:                  formValues.applications,
    num_links:                     formValues.num_links || null,
    num_joints:                    formValues.num_joints || null,
    num_higher_pairs:              formValues.num_higher_pairs || 0,
    kinematic_pairs:               formValues.kinematic_pairs,
    degrees_of_freedom:            formValues.degrees_of_freedom || null,
    input_link:                    formValues.input_link,
    output_link:                   formValues.output_link,
    additional_technical_details:  formValues.additional_technical_details,
    mechanism_type:                formValues.mechanism_type || null,
    student_name:                  formValues.student_name,
    team_members:                  formValues.team_members,
    department:                    formValues.department,
    college:                       formValues.college,
    academic_year:                 formValues.academic_year,
    external_links: formValues.external_links
      ? formValues.external_links.split(",").map((s) => s.trim()).filter(Boolean)
      : [],
    video_url:              formValues.video_url || null,
    animation_description:  formValues.animation_description || null,
    status: MECHANISM_STATUS.PENDING,
  };

  const { data: mechanism, error } = await supabase
    .from(MECHANISMS_TABLE)
    .insert([payload])
    .select()
    .single();

  if (error) return { mechanism: null, uploadErrors: [], error };

  const uploadErrors = [];
  let coverImage = null;
  for (const [type, files] of Object.entries(filesByType || {})) {
    const list = files ? Array.from(files) : [];
    for (const file of list) {
      const { error: uploadError, path } = await uploadMechanismFile(mechanism.id, type, file);
      if (uploadError) {
        uploadErrors.push({ type, name: file.name, message: uploadError.message });
        continue;
      }
      const url = publicMediaUrl(path);
      if (!coverImage && (type === "image" || type === "drawing")) coverImage = url;
      const { error: rowError } = await supabase.from(MEDIA_TABLE).insert([{
        mechanism_id: mechanism.id,
        file_type: type,
        file_name: file.name,
        file_path: path,
        file_url: url,
      }]);
      if (rowError) uploadErrors.push({ type, name: file.name, message: rowError.message });
    }
  }

  if (coverImage) {
    await supabase.from(MECHANISMS_TABLE).update({ cover_image: coverImage }).eq("id", mechanism.id);
    mechanism.cover_image = coverImage;
  }

  return { mechanism, uploadErrors, error: null };
}

async function uploadMechanismFile(mechanismId, type, file) {
  if (!supabase) return { error: missingSupabaseError(), path: "" };
  const safeName = file.name.replace(/[^\w.-]+/g, "_");
  const path = `${mechanismId}/${type}/${Date.now()}-${safeName}`;
  const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  return { error, path };
}

function publicMediaUrl(path) {
  if (!supabase) return "";
  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
  return data?.publicUrl || "";
}

/** Admin: approve a pending mechanism so it appears in the public showcase. */
export async function approveMechanism(id) {
  if (!supabase) return { error: missingSupabaseError() };
  return supabase.from(MECHANISMS_TABLE).update({ status: MECHANISM_STATUS.APPROVED }).eq("id", id);
}

/** Admin: reject a pending submission (kept, marked rejected — not shown publicly). */
export async function rejectMechanism(id) {
  if (!supabase) return { error: missingSupabaseError() };
  return supabase.from(MECHANISMS_TABLE).update({ status: MECHANISM_STATUS.REJECTED }).eq("id", id);
}

/** Admin: edit an approved/pending mechanism's fields (also used by the live DOF calculator's "Save"). */
export async function updateMechanism(id, fields) {
  if (!supabase) return { error: missingSupabaseError() };
  return supabase.from(MECHANISMS_TABLE).update(fields).eq("id", id);
}

/** Admin: permanently delete a mechanism (media rows cascade via FK). */
export async function deleteMechanism(id) {
  if (!supabase) return { error: missingSupabaseError() };
  return supabase.from(MECHANISMS_TABLE).delete().eq("id", id);
}

/** Admin: remove a single uploaded resource from a mechanism. */
export async function deleteMechanismMedia(mediaRow) {
  if (!supabase) return { error: missingSupabaseError() };
  await supabase.storage.from(STORAGE_BUCKET).remove([mediaRow.file_path]);
  return supabase.from(MEDIA_TABLE).delete().eq("id", mediaRow.id);
}
