import { supabase } from "../lib/supabaseClient";
import { MECHANISM_STATUS, BUILTIN_MECHANISMS } from "./tomConstants";
import { getMechanismPoster } from "./mechanismDrawings";

const MECHANISMS_TABLE = "tom_mechanisms";
const MEDIA_TABLE      = "tom_mechanism_media";
const STORAGE_BUCKET   = "tom-media";
const LOCAL_STORAGE_KEY = "tom-local-mechanisms";

function missingSupabaseError() {
  return new Error("Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON to your .env file.");
}

export function getLocalMechanisms() {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return list.map((m) => ({ ...m, status: MECHANISM_STATUS.APPROVED }));
  } catch (err) {
    console.warn("Could not read local mechanisms:", err);
    return [];
  }
}

export function saveLocalMechanisms(list) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list));
  } catch (err) {
    console.warn("Could not save local mechanisms:", err);
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
  // 3. Built-in interactive mechanisms (5 core models)
  const seenIds = new Set();
  const merged = [];

  for (const m of localList) {
    const key = String(m.id);
    if (!seenIds.has(key)) {
      seenIds.add(key);
      merged.push(m);
    }
  }

  for (const m of supabaseList) {
    const key = String(m.id);
    if (!seenIds.has(key)) {
      seenIds.add(key);
      merged.push(m);
    }
  }

  for (const m of BUILTIN_MECHANISMS) {
    const key = String(m.id);
    if (!seenIds.has(key)) {
      seenIds.add(key);
      merged.push(m);
    }
  }

  const enriched = merged.map((m) => {
    const poster = getMechanismPoster(m);
    return {
      ...m,
      cover_image: poster,
      preview_image_url: poster,
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

  // 1. Check built-in interactive mechanisms first
  const builtIn = BUILTIN_MECHANISMS.find((m) => String(m.id) === targetId);
  if (builtIn) {
    const poster = getMechanismPoster(builtIn);
    const media = [];
    if (builtIn.external_links?.[0]) {
      media.push({
        id: "media-builtin-" + builtIn.id,
        mechanism_id: builtIn.id,
        file_type: "video",
        file_name: "Working Demonstration",
        file_url: builtIn.external_links[0],
      });
    }
    return { mechanism: { ...builtIn, cover_image: poster, preview_image_url: poster }, media, error: null };
  }

  // 2. Check local student submissions
  const localItems = getLocalMechanisms();
  const local = localItems.find((m) => String(m.id) === targetId);
  if (local) {
    const poster = getMechanismPoster(local);
    return { mechanism: { ...local, cover_image: poster, preview_image_url: poster }, media: local.media || [], error: null };
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
        const poster = getMechanismPoster(mechanism);
        return { mechanism: { ...mechanism, cover_image: poster, preview_image_url: poster }, media: media || [], error: mechError || mediaError };
      }
    } catch {
      // ignore
    }
  }

  return { mechanism: null, media: [], error: new Error("Mechanism not found") };
}

// ─── WRITE ──────────────────────────────────────────────────────────────────

/**
 * Creates a mechanism and saves it directly to the local repository,
 * and simultaneously uploads to Supabase if configured.
 * Student submissions appear immediately in the Cloud Repository!
 */
export async function submitMechanism(formValues, filesByType) {
  const links = formValues.num_links ? Number(formValues.num_links) : 4;
  const joints = formValues.num_joints ? Number(formValues.num_joints) : 4;
  const higherPairs = formValues.higher_pairs ? Number(formValues.higher_pairs) : 0;
  const dof = formValues.degrees_of_freedom !== undefined && formValues.degrees_of_freedom !== null && formValues.degrees_of_freedom !== ""
    ? Number(formValues.degrees_of_freedom)
    : (3 * (links - 1) - 2 * joints - higherPairs);

  // Extract uploaded files for instant local display
  const localMedia = [];
  let localCoverImage = formValues.cover_image || null;

  for (const [type, files] of Object.entries(filesByType || {})) {
    const list = files ? Array.from(files) : [];
    for (const file of list) {
      const isImg =
        type === "image" ||
        type === "drawing" ||
        (file.type && file.type.startsWith("image/")) ||
        /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(file.name);

      const url = isImg
        ? await resizeImageToThumbnail(file)
        : URL.createObjectURL(file);

      if (!localCoverImage && isImg) {
        localCoverImage = url;
      }
      localMedia.push({
        id: "media-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6),
        file_type: type,
        file_name: file.name,
        file_url: url,
      });
    }
  }

  // Fallback to dynamic blueprint poster if no image was provided
  if (!localCoverImage) {
    localCoverImage = getMechanismPoster({
      name: formValues.name,
      category: formValues.category,
      degrees_of_freedom: dof,
      student_name: formValues.student_name,
    });
  }

  const localId = "student-" + Date.now();
  const localMech = {
    id: localId,
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
    academic_year: formValues.academic_year || "SE Mech",
    external_links: formValues.video_url
      ? [formValues.video_url.trim()]
      : Array.isArray(formValues.external_links)
      ? formValues.external_links
      : typeof formValues.external_links === "string" && formValues.external_links.trim()
      ? formValues.external_links.split(",").map((s) => s.trim()).filter(Boolean)
      : [],
    status: MECHANISM_STATUS.APPROVED, // Approved locally so it appears in Cloud Repository immediately!
    cover_image: localCoverImage,
    preview_image_url: localCoverImage,
    media: localMedia,
    created_at: new Date().toISOString(),
  };

  // 1. Immediately prepend to local repository
  const currentLocal = getLocalMechanisms();
  saveLocalMechanisms([localMech, ...currentLocal]);

  // 2. If Supabase is available, push to Supabase in parallel
  const uploadErrors = [];
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
        status:                        MECHANISM_STATUS.APPROVED,
        cover_image:                   localCoverImage,
      };

      const { data: remoteMech, error: dbError } = await supabase
        .from(MECHANISMS_TABLE)
        .insert([payload])
        .select()
        .single();

      if (!dbError && remoteMech) {
        let remoteCover = null;
        for (const [type, files] of Object.entries(filesByType || {})) {
          const list = files ? Array.from(files) : [];
          for (const file of list) {
            const { error: uploadError, path } = await uploadMechanismFile(remoteMech.id, type, file);
            if (uploadError) {
              uploadErrors.push({ type, name: file.name, message: uploadError.message });
              continue;
            }
            const url = publicMediaUrl(path);
            if (!remoteCover && (type === "image" || type === "drawing")) remoteCover = url;
            await supabase.from(MEDIA_TABLE).insert([{
              mechanism_id: remoteMech.id,
              file_type: type,
              file_name: file.name,
              file_path: path,
              file_url: url,
            }]);
          }
        }
        if (remoteCover) {
          await supabase.from(MECHANISMS_TABLE).update({ cover_image: remoteCover }).eq("id", remoteMech.id);
        }
      }
    } catch (err) {
      console.warn("Supabase background sync skipped:", err);
    }
  }

  return { mechanism: localMech, uploadErrors, error: null };
}

async function uploadMechanismFile(mechanismId, type, file) {
  if (!supabase) {
    return { error: missingSupabaseError(), path: "" };
  }

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

/** Admin: approve a pending mechanism. */
export async function approveMechanism(id) {
  const list = getLocalMechanisms();
  const idx = list.findIndex((m) => String(m.id) === String(id));
  if (idx !== -1) {
    list[idx].status = MECHANISM_STATUS.APPROVED;
    saveLocalMechanisms(list);
  }

  if (supabase) {
    try {
      await supabase.from(MECHANISMS_TABLE).update({ status: MECHANISM_STATUS.APPROVED }).eq("id", id);
    } catch {
      // ignore
    }
  }
  return { error: null };
}

/** Admin: reject a pending submission. */
export async function rejectMechanism(id) {
  const list = getLocalMechanisms();
  const idx = list.findIndex((m) => String(m.id) === String(id));
  if (idx !== -1) {
    list[idx].status = MECHANISM_STATUS.REJECTED;
    saveLocalMechanisms(list);
  }

  if (supabase) {
    try {
      await supabase.from(MECHANISMS_TABLE).update({ status: MECHANISM_STATUS.REJECTED }).eq("id", id);
    } catch {
      // ignore
    }
  }
  return { error: null };
}

/** Admin: edit an approved/pending mechanism's fields. */
export async function updateMechanism(id, fields) {
  const list = getLocalMechanisms();
  const idx = list.findIndex((m) => String(m.id) === String(id));
  if (idx !== -1) {
    list[idx] = { ...list[idx], ...fields };
    saveLocalMechanisms(list);
  }

  if (supabase) {
    try {
      await supabase.from(MECHANISMS_TABLE).update(fields).eq("id", id);
    } catch {
      // ignore
    }
  }
  return { error: null };
}

/** Admin: permanently delete a mechanism. */
export async function deleteMechanism(id) {
  const list = getLocalMechanisms().filter((m) => String(m.id) !== String(id));
  saveLocalMechanisms(list);

  if (supabase) {
    try {
      await supabase.from(MECHANISMS_TABLE).delete().eq("id", id);
    } catch {
      // ignore
    }
  }
  return { error: null };
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

  if (supabase && mediaRow.file_path) {
    try {
      await supabase.storage.from(STORAGE_BUCKET).remove([mediaRow.file_path]);
      await supabase.from(MEDIA_TABLE).delete().eq("id", mediaRow.id);
    } catch {
      // ignore
    }
  }
  return { error: null };
}
