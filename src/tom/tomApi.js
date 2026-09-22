import { supabase } from "../lib/supabaseClient";
import {
  MECHANISM_STATUS,
} from "./tomConstants";

const MECHANISMS_TABLE = "tom_mechanisms";
const MEDIA_TABLE      = "tom_mechanism_media";
const STORAGE_BUCKET   = "tom-media";
const LOCAL_STORAGE_KEY = "tom-local-mechanisms";

function missingSupabaseError() {
  return new Error("Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON to your .env file.");
}


/**
 * Client-side file validation for upload safety and size constraints.
 */
export function validateUploadFile(file) {
  if (!file) return { valid: true };
  const MAX_SIZE_MB = 25;
  if (file.size > MAX_SIZE_MB * 1024 * 1024) {
    return { valid: false, error: `File "${file.name}" exceeds the ${MAX_SIZE_MB}MB size limit.` };
  }
  // Whitelist of safe file extensions
  const allowedExt = /\.(png|jpg|jpeg|gif|webp|bmp|ico|pdf|doc|docx|ppt|pptx|xls|xlsx|mp4|webm|mov|avi|mkv|mp3|wav|ogg|zip|rar|7z|gz|tar|stl|obj|step|stp|iges|igs|dwg|dxf|html|htm|json|txt|csv|md)$/i;
  if (!allowedExt.test(file.name)) {
    return { valid: false, error: `File type "${file.name.split('.').pop()}" is not permitted. Only images, documents, videos, CAD files, and archives are allowed.` };
  }
  return { valid: true };
}

export function getLocalMechanisms() {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return list
      .filter((m) => m && !String(m.id || "").startsWith("builtin-"))
      .map((m) => ({ ...m, status: m.status || MECHANISM_STATUS.APPROVED }));
  } catch (err) {
    console.warn("Could not read local mechanisms:", err);
    return [];
  }
}

export function saveLocalMechanisms(list) {
  if (!Array.isArray(list)) return;
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list));
  } catch (err) {
    console.warn("Storage quota exceeded or write failed. Running emergency compaction...", err);
    try {
      // Pass 1: Prune large base64 media data from older submissions
      const compacted = list.map((m, idx) => {
        if (idx === 0) return m; // Preserve newest submission intact
        return {
          ...m,
          media: (m.media || []).map((row) => {
            if (row.file_url && typeof row.file_url === "string" && row.file_url.startsWith("data:") && row.file_url.length > 50000) {
              return { ...row, file_url: "" };
            }
            return row;
          }),
        };
      });
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(compacted));
    } catch {
      try {
        // Pass 2: Retain newest 20 submissions with lightweight media references
        const pruned = list.slice(0, 20).map((m) => ({
          ...m,
          media: (m.media || []).filter((r) => !r.file_url?.startsWith("data:") || r.file_url.length < 30000),
        }));
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(pruned));
      } catch (finalErr) {
        console.error("Critical: Local storage quota completely full:", finalErr);
      }
    }
  }
}

function resizeImageToThumbnail(file, maxWidth = 800, maxHeight = 600, quality = 0.8) {
  return new Promise((resolve) => {
    if (!file) return resolve("");
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target.result;
      if (typeof window === "undefined" || !window.Image) {
        return resolve(result);
      }
      const img = new Image();
      img.onload = () => {
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
        if (!ctx) return resolve(result);
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = () => resolve(result);
      img.src = result;
    };
    reader.onerror = () => resolve("");
    reader.readAsDataURL(file);
  });
}

function readFileAsDataUrl(file) {
  return new Promise((resolve) => {
    if (!file) return resolve({ url: "", blobOnly: false });
    // If file is very large (> 3.5MB), fallback to blob URL to protect localStorage quota.
    // Blob URLs are session-scoped and won't survive a page refresh.
    if (file.size > 3.5 * 1024 * 1024) {
      try {
        return resolve({ url: URL.createObjectURL(file), blobOnly: true });
      } catch {
        return resolve({ url: "", blobOnly: false });
      }
    }
    const reader = new FileReader();
    reader.onload = () => resolve({ url: reader.result, blobOnly: false });
    reader.onerror = () => {
      try {
        resolve({ url: URL.createObjectURL(file), blobOnly: true });
      } catch {
        resolve({ url: "", blobOnly: false });
      }
    };
    reader.readAsDataURL(file);
  });
}

// ─── READ ───────────────────────────────────────────────────────────────────

/**
 * Single unified repository: returns built-in kinematic models,
 * local student submissions, and approved Supabase entries.
 */
export async function fetchApprovedMechanisms() {
  const localList = getLocalMechanisms().filter((m) => m.status === MECHANISM_STATUS.APPROVED || !m.status);
  let supabaseList = [];
  let error = null;

  if (supabase) {
    try {
      let res = await supabase
        .from(MECHANISMS_TABLE)
        .select("*, tom_mechanism_media(count)")
        .eq("status", MECHANISM_STATUS.APPROVED)
        .order("created_at", { ascending: false });

      if (res.error && res.error.message && res.error.message.toLowerCase().includes("relationship")) {
        res = await supabase
          .from(MECHANISMS_TABLE)
          .select("*")
          .eq("status", MECHANISM_STATUS.APPROVED)
          .order("created_at", { ascending: false });
      }

      if (res.error) {
        error = res.error;
      } else {
        supabaseList = res.data || [];
      }
    } catch (e) {
      error = e;
    }
  }

  // Deduplicate and merge:
  // 1. Local student submissions (most recent first)
  // 2. Supabase approved mechanisms
  const seenIds = new Set();
  const merged = [];

  for (const m of localList) {
    const key = String(m.id);
    if (!key.startsWith("builtin-") && !seenIds.has(key)) {
      seenIds.add(key);
      merged.push(m);
    }
  }

  for (const m of supabaseList) {
    const key = String(m.id);
    if (!key.startsWith("builtin-") && !seenIds.has(key)) {
      seenIds.add(key);
      merged.push(m);
    }
  }

  const enriched = merged.map((m) => {
    const rawImage = m.cover_image || m.preview_image_url || m.image_url || m.image;
    const cleanImage =
      rawImage && typeof rawImage === "string" && !rawImage.startsWith("data:image/svg+xml")
        ? rawImage
        : null;
    return {
      ...m,
      cover_image: cleanImage,
      preview_image_url: cleanImage,
    };
  });

  return { data: enriched, error };
}

/** Admin moderation queue: returns pending mechanisms from local storage and Supabase. */
export async function fetchPendingMechanisms() {
  const localPending = getLocalMechanisms().filter((m) => m.status === MECHANISM_STATUS.PENDING);
  let supabasePending = [];
  let error = null;

  if (supabase) {
    try {
      const res = await supabase
        .from(MECHANISMS_TABLE)
        .select("*")
        .eq("status", MECHANISM_STATUS.PENDING)
        .order("created_at", { ascending: true });
      if (res.error) error = res.error;
      else supabasePending = res.data || [];
    } catch (e) {
      error = e;
    }
  }

  const seenIds = new Set(localPending.map((m) => String(m.id)));
  const merged = [...localPending];
  for (const item of supabasePending) {
    if (!seenIds.has(String(item.id))) {
      seenIds.add(String(item.id));
      merged.push(item);
    }
  }

  return { data: merged, error };
}

/** Full detail (mechanism + all its media rows) for any mechanism. */
export async function fetchMechanismDetail(id) {
  const targetId = String(id);

  // 1. Check local student submissions
  const localItems = getLocalMechanisms();
  const local = localItems.find((m) => String(m.id) === targetId);
  if (local) {
    const rawImage = local.cover_image || local.image;
    const cleanImage = rawImage && typeof rawImage === "string" && !rawImage.startsWith("data:image/svg+xml") ? rawImage : null;
    return { mechanism: { ...local, cover_image: cleanImage, preview_image_url: cleanImage }, media: local.media || [], error: null };
  }

  // 3. Check Supabase
  if (supabase) {
    try {
      const [{ data: mechanism, error: mechError }, { data: media, error: mediaError }] =
        await Promise.all([
          supabase.from(MECHANISMS_TABLE).select("*").eq("id", id).single(),
          supabase.from(MEDIA_TABLE).select("*").eq("mechanism_id", id).order("created_at", { ascending: true }),
        ]);
      if (mechanism) {
        const rawImage = mechanism.cover_image || mechanism.image;
        const cleanImage = rawImage && typeof rawImage === "string" && !rawImage.startsWith("data:image/svg+xml") ? rawImage : null;
        return { mechanism: { ...mechanism, cover_image: cleanImage, preview_image_url: cleanImage }, media: media || [], error: mechError || mediaError };
      }
    } catch {
      // ignore
    }
  }

  return { mechanism: null, media: [], error: new Error("Mechanism not found") };
}

// ─── WRITE ──────────────────────────────────────────────────────────────────


/**
 * Creates a mechanism and saves it to the local repository,
 * and simultaneously uploads to Supabase if configured.
 * Submissions are published immediately as APPROVED (live in repository).
 */
export async function submitMechanism(formValues, filesByType, { approved = true } = {}) {
  const links = formValues.num_links ? Number(formValues.num_links) : 4;
  const joints = formValues.num_joints ? Number(formValues.num_joints) : 4;
  const higherPairs = formValues.higher_pairs ? Number(formValues.higher_pairs) : 0;
  const dof = formValues.degrees_of_freedom !== undefined && formValues.degrees_of_freedom !== null && formValues.degrees_of_freedom !== ""
    ? Number(formValues.degrees_of_freedom)
    : (3 * (links - 1) - 2 * joints - higherPairs);

  // Extract uploaded files for instant local display
  const localMedia = [];
  let localCoverImage = formValues.cover_image || null;
  let hasBlobOnlyFiles = false;

  for (const [type, files] of Object.entries(filesByType || {})) {
    const list = files ? Array.from(files) : [];
    for (const file of list) {
      const isImg =
        type === "image" ||
        type === "drawing" ||
        (file.type && file.type.startsWith("image/")) ||
        /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(file.name);

      const fileUrl = isImg
        ? await resizeImageToThumbnail(file)
        : (await readFileAsDataUrl(file)).url;

      const { blobOnly } = isImg ? { blobOnly: false } : await readFileAsDataUrl(file).catch(() => ({ blobOnly: false }));
      if (blobOnly) hasBlobOnlyFiles = true;

      if (!localCoverImage && isImg) {
        localCoverImage = fileUrl;
      }
      localMedia.push({
        id: "media-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6),
        file_type: type === "animation_html" ? "animation" : type,
        file_name: file.name,
        file_url: fileUrl,
        format: /\.(html|htm)$/i.test(file.name) ? "html" : undefined,
      });
    }
  }

  let htmlAnim = (formValues.html_animation_url || formValues.animation_url || "").trim();
  if (!htmlAnim) {
    const uploadedHtml = localMedia.find((m) => /\.(html|htm)$/i.test(m.file_name) || m.format === "html");
    if (uploadedHtml) {
      htmlAnim = uploadedHtml.file_url;
    }
  }

  // Include direct HTML animation link if provided and not already in media
  if (htmlAnim && !localMedia.some((m) => m.file_url === htmlAnim)) {
    localMedia.push({
      id: "media-html-anim-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6),
      file_type: "animation",
      file_name: "Interactive HTML Animation",
      file_url: htmlAnim,
      is_embed: true,
      format: "html",
    });
  } else if (formValues.animation_url && formValues.animation_url.trim()) {
    localMedia.push({
      id: "media-anim-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6),
      file_type: "animation",
      file_name: "Student Custom Animation",
      file_url: formValues.animation_url.trim(),
      is_embed: true,
    });
  }

  // Include direct virtual mechanism / simulation link if provided
  if (formValues.virtual_mechanism_url && formValues.virtual_mechanism_url.trim()) {
    localMedia.push({
      id: "media-vm-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6),
      file_type: "virtual_mechanism",
      file_name: "Student Virtual Mechanism",
      file_url: formValues.virtual_mechanism_url.trim(),
      is_embed: true,
    });
  }

  // Only use cover image if student uploaded or linked one in the form
  if (!localCoverImage) {
    localCoverImage = formValues.background_image || formValues.bg_image_url || null;
  }

  const localId = "student-" + Date.now();

  const localMech = {
    id: localId,
    admin_feedback: null,
    name: formValues.name.trim(),
    category: formValues.category || "Four-bar",
    short_description: formValues.short_description || (formValues.description ? (formValues.description.slice(0, 140) + (formValues.description.length > 140 ? "..." : "")) : "Student mechanism project."),
    detailed_description: formValues.detailed_description || formValues.description || "",
    working_principle: formValues.working_principle || formValues.description || "",
    applications: formValues.applications || null,
    num_links: links,
    num_joints: joints,
    higher_pairs: higherPairs,
    degrees_of_freedom: dof,
    input_link: formValues.input_link || "Link 1 (Driver)",
    output_link: formValues.output_link || "Output / Rocker",
    additional_technical_details: formValues.additional_technical_details || null,
    student_name: formValues.student_name.trim(),
    team_members: formValues.team_members || null,
    department: "Mechanical Engineering",
    college: "NMIET",
    academic_year: formValues.academic_year || "TE Mech",
    motion_type: formValues.motion_type || "Oscillating / Rocker",
    html_animation_url: htmlAnim || null,
    animation_url: htmlAnim || (formValues.animation_url ? formValues.animation_url.trim() : null),
    virtual_mechanism_url: formValues.virtual_mechanism_url ? formValues.virtual_mechanism_url.trim() : null,
    external_links: [
      ...(htmlAnim ? [htmlAnim] : []),
      ...(formValues.video_url ? [formValues.video_url.trim()] : []),
      ...(formValues.virtual_mechanism_url ? [formValues.virtual_mechanism_url.trim()] : []),
      ...(Array.isArray(formValues.external_links)
        ? formValues.external_links
        : typeof formValues.external_links === "string" && formValues.external_links.trim()
        ? formValues.external_links.split(",").map((s) => s.trim()).filter(Boolean)
        : []),
    ],
    status: approved !== false ? MECHANISM_STATUS.APPROVED : MECHANISM_STATUS.PENDING,
    cover_image: localCoverImage,
    preview_image_url: localCoverImage,
    background_image: formValues.background_image || formValues.bg_image_url || null,
    bg_image_url: formValues.background_image || formValues.bg_image_url || null,
    media: localMedia,
    created_at: new Date().toISOString(),
  };

  // 1. Immediately prepend to local repository
  const currentLocal = getLocalMechanisms();
  saveLocalMechanisms([localMech, ...currentLocal]);

  // 2. If Supabase is available, push to Supabase in parallel
  const uploadErrors = [];
  let submissionError = null;
  if (supabase) {
    try {
      const payload = {
        name:                          localMech.name,
        category:                      localMech.category,
        short_description:             localMech.short_description,
        detailed_description:          localMech.detailed_description,
        working_principle:             localMech.working_principle,
        applications:                  localMech.applications,
        num_links:                     localMech.num_links,
        num_joints:                    localMech.num_joints,
        degrees_of_freedom:            localMech.degrees_of_freedom,
        input_link:                    localMech.input_link,
        output_link:                   localMech.output_link,
        additional_technical_details:  localMech.additional_technical_details,
        student_name:                  localMech.student_name,
        team_members:                  localMech.team_members,
        department:                    localMech.department,
        college:                       localMech.college,
        academic_year:                 localMech.academic_year,
        external_links:                localMech.external_links,
        status:                        approved !== false ? MECHANISM_STATUS.APPROVED : MECHANISM_STATUS.PENDING,
        cover_image:                   localCoverImage,
      };

      // Only include optional fields if they have truthy values
      if (localMech.admin_feedback) payload.admin_feedback = localMech.admin_feedback;
      if (localMech.tracking_code) payload.tracking_code = localMech.tracking_code;

      let { data: remoteMech, error: dbError } = await supabase
        .from(MECHANISMS_TABLE)
        .insert([payload])
        .select()
        .single();

      // Fallback: If remote table schema cache complains about an unadded column (PGRST204)
      if (dbError && dbError.code === "PGRST204") {
        console.warn("Supabase schema column mismatch. Retrying insert with core columns:", dbError.message);
        const corePayload = {
          name: localMech.name,
          category: localMech.category,
          short_description: localMech.short_description,
          detailed_description: localMech.detailed_description,
          working_principle: localMech.working_principle,
          num_links: localMech.num_links,
          num_joints: localMech.num_joints,
          degrees_of_freedom: localMech.degrees_of_freedom,
          input_link: localMech.input_link,
          output_link: localMech.output_link,
          student_name: localMech.student_name,
          department: localMech.department,
          college: localMech.college,
          academic_year: localMech.academic_year,
          status: approved !== false ? MECHANISM_STATUS.APPROVED : MECHANISM_STATUS.PENDING,
          cover_image: localCoverImage,
        };
        const retryRes = await supabase
          .from(MECHANISMS_TABLE)
          .insert([corePayload])
          .select()
          .single();
        remoteMech = retryRes.data;
        dbError = retryRes.error;
      }

      if (dbError) {
        submissionError = dbError;
        console.error("Supabase insert mechanism error:", dbError.message || dbError);
      } else if (remoteMech) {
        // If remote insert succeeded, update local mechanism ID with the remote UUID
        localMech.id = remoteMech.id;
        const currentUpdated = getLocalMechanisms().map((m) =>
          m.id === localId ? { ...m, id: remoteMech.id } : m
        );
        saveLocalMechanisms(currentUpdated);

        let remoteCover = null;
        let remoteBg = null;
        for (const [type, files] of Object.entries(filesByType || {})) {
          const list = files ? Array.from(files) : [];
          for (const file of list) {
            const { error: uploadError, path } = await uploadMechanismFile(remoteMech.id, type, file);
            if (uploadError) {
              uploadErrors.push(uploadError);
              continue;
            }
            const url = publicMediaUrl(path);
            if (!remoteCover && (type === "image" || type === "drawing")) remoteCover = url;
            if (type === "background_image") remoteBg = url;
            
            try {
              if (/\.(html|htm)$/i.test(file.name)) {
                await supabase.from(MECHANISMS_TABLE).update({ html_animation_url: url }).eq("id", remoteMech.id);
              }
              if (/\.(stl|gltf|glb|obj)$/i.test(file.name)) {
                await supabase.from(MECHANISMS_TABLE).update({ cad_model_url: url }).eq("id", remoteMech.id);
              }
              if (type === "document") {
                await supabase.from(MECHANISMS_TABLE).update({ report_url: url }).eq("id", remoteMech.id);
              }
            } catch {
              // optional column updates
            }

            try {
              await supabase.from("tom_mechanism_media").insert([{
                mechanism_id: remoteMech.id,
                file_type: (type === "background_image") ? "image" : (type === "animation_html" ? "animation" : type),
                file_name: file.name,
                file_path: path,
                file_url: url
              }]);
            } catch (mediaErr) {
              console.warn("Could not insert to tom_mechanism_media:", mediaErr);
            }
          }
        }
        
        const updates = {};
        if (remoteCover) updates.cover_image = remoteCover;
        if (remoteBg) updates.background_image = remoteBg;
        if (Object.keys(updates).length > 0) {
          try {
            await supabase.from(MECHANISMS_TABLE).update(updates).eq("id", remoteMech.id);
          } catch {
            // ignore
          }
        }
      }
    } catch (err) {
      submissionError = err;
      console.warn("Supabase background sync exception:", err);
    }
  }

  return { mechanism: localMech, uploadErrors, hasBlobOnlyFiles, error: submissionError };
}

async function uploadMechanismFile(mechanismId, type, file) {
  if (!supabase) {
    return { error: missingSupabaseError(), path: "" };
  }

  const safeName = file.name.replace(/[^\w.-]+/g, "_");
  const path = `${mechanismId}/${type}/${Date.now()}-${safeName}`;
  const contentType = file.type || (/\.(html|htm)$/i.test(file.name) ? "text/html" : undefined);
  const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType,
  });
  return { error, path };
}

function publicMediaUrl(path) {
  if (!supabase) return "";
  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
  return data?.publicUrl || "";
}

/** Admin: approve a pending mechanism. */
export async function approveMechanism(id) {
  const list = getLocalMechanisms();
  const idx = list.findIndex((m) => String(m.id) === String(id));
  if (idx !== -1) {
    list[idx].status = MECHANISM_STATUS.APPROVED;
    list[idx].admin_feedback = null;
    saveLocalMechanisms(list);
  }

  let dbError = null;
  if (supabase) {
    try {
      const { error } = await supabase
        .from(MECHANISMS_TABLE)
        .update({ status: MECHANISM_STATUS.APPROVED, admin_feedback: null })
        .eq("id", id);
      if (error) {
        dbError = error;
        console.error("Supabase approve error:", error.message || error);
      }
    } catch (err) {
      dbError = err;
      console.error("Supabase approve exception:", err);
    }
  }
  return { error: dbError };
}

/** Admin: reject a pending submission with optional faculty feedback. */
export async function rejectMechanism(id, feedback = "") {
  const list = getLocalMechanisms();
  const idx = list.findIndex((m) => String(m.id) === String(id));
  if (idx !== -1) {
    list[idx].status = MECHANISM_STATUS.REJECTED;
    list[idx].admin_feedback = feedback ? feedback.trim() : null;
    saveLocalMechanisms(list);
  }

  let dbError = null;
  if (supabase) {
    try {
      const { error } = await supabase
        .from(MECHANISMS_TABLE)
        .update({
          status: MECHANISM_STATUS.REJECTED,
          admin_feedback: feedback ? feedback.trim() : null,
        })
        .eq("id", id);
      if (error) {
        dbError = error;
        console.error("Supabase reject error:", error.message || error);
      }
    } catch (err) {
      dbError = err;
      console.error("Supabase reject exception:", err);
    }
  }
  return { error: dbError };
}

/** Admin: edit an approved/pending mechanism's fields. */
export async function updateMechanism(id, fields) {
  const list = getLocalMechanisms();
  const idx = list.findIndex((m) => String(m.id) === String(id));
  if (idx !== -1) {
    list[idx] = { ...list[idx], ...fields };
    saveLocalMechanisms(list);
  }

  let dbError = null;
  if (supabase) {
    try {
      const { error } = await supabase.from(MECHANISMS_TABLE).update(fields).eq("id", id);
      if (error) {
        dbError = error;
        console.error("Supabase update error:", error.message || error);
      }
    } catch (err) {
      dbError = err;
      console.error("Supabase update exception:", err);
    }
  }
  return { error: dbError };
}

/** Admin: permanently delete a mechanism. */
export async function deleteMechanism(id) {
  const list = getLocalMechanisms().filter((m) => String(m.id) !== String(id));
  saveLocalMechanisms(list);

  let dbError = null;
  if (supabase) {
    try {
      const { error } = await supabase.from(MECHANISMS_TABLE).delete().eq("id", id);
      if (error) {
        dbError = error;
        console.error("Supabase delete error:", error.message || error);
      }
    } catch (err) {
      dbError = err;
      console.error("Supabase delete exception:", err);
    }
  }
  return { error: dbError };
}

/** Admin: remove a single uploaded resource from a mechanism. */
export async function deleteMechanismMedia(mediaRow) {
  const list = getLocalMechanisms();
  for (const m of list) {
    if (Array.isArray(m.media)) {
      m.media = m.media.filter((item) => item.id !== mediaRow.id);
    }
  }
  saveLocalMechanisms(list);

  let dbError = null;
  if (supabase && mediaRow.file_path) {
    try {
      const { error: storageErr } = await supabase.storage.from(STORAGE_BUCKET).remove([mediaRow.file_path]);
      if (storageErr) console.warn("Storage remove warning:", storageErr.message || storageErr);
      const { error: dbErr } = await supabase.from(MEDIA_TABLE).delete().eq("id", mediaRow.id);
      if (dbErr) {
        dbError = dbErr;
        console.error("Supabase delete media error:", dbErr.message || dbErr);
      }
    } catch (err) {
      dbError = err;
      console.error("Supabase delete media exception:", err);
    }
  }
  return { error: dbError };
}

/**
 * Pushes any student submissions stored only in localStorage to the Supabase database.
 * Returns { syncedCount, error }
 */
export async function syncLocalMechanismsToSupabase() {
  if (!supabase) return { syncedCount: 0, error: new Error("Supabase is not configured.") };
  const localList = getLocalMechanisms();
  let count = 0;
  let lastError = null;

  for (const m of localList) {
    // If it's a locally generated ID (e.g. student-...) and not a remote UUID
    if (String(m.id || "").startsWith("student-")) {
      const payload = {
        name: m.name,
        category: m.category || "Four-bar",
        short_description: m.short_description || m.description || "",
        detailed_description: m.detailed_description || m.description || "",
        working_principle: m.working_principle || m.description || "",
        applications: m.applications || null,
        num_links: m.num_links || 4,
        num_joints: m.num_joints || 4,
        degrees_of_freedom: m.degrees_of_freedom || 1,
        input_link: m.input_link || "Link 1",
        output_link: m.output_link || "Output",
        student_name: m.student_name || "Student Submission",
        team_members: m.team_members || null,
        department: m.department || "Mechanical Engineering",
        college: m.college || "NMIET",
        academic_year: m.academic_year || "TE Mech",
        status: m.status || MECHANISM_STATUS.APPROVED,
        cover_image: m.cover_image || null,
      };

      const { data, error } = await supabase.from(MECHANISMS_TABLE).insert([payload]).select().single();
      if (!error && data) {
        count++;
        m.id = data.id;
      } else if (error) {
        lastError = error;
        console.warn("Could not sync local item to Supabase:", error.message || error);
      }
    }
  }

  if (count > 0) {
    saveLocalMechanisms(localList);
  }
  return { syncedCount: count, error: lastError };
}

