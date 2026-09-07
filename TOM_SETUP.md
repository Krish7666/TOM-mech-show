# TOM Mechanism Showcase — Setup & Test Guide

This is the TOM-only mechanism showcase and no longer depends on the older Mech-AIML hub flow.

## 1. New files added

```
src/lib/supabaseClient.js     ← Supabase client + admin constants, extracted
                                 out of App.jsx (App.jsx now imports from here
                                 instead of creating its own client — same
                                 config, same env vars, zero behavior change)
src/tom/tomConstants.js       ← categories, media types, form shape
src/tom/tomApi.js             ← all Supabase calls for TOM (mirrors the style
                                 already used for the "projects" table)
src/tom/TomShowcase.jsx       ← browse grid, search/filter, add flow, admin
                                 pending-review queue
src/tom/MechanismCard.jsx     ← mechanism card for the grid
src/tom/MechanismForm.jsx     ← "Add Mechanism" form (basic/technical/student
                                 info + 7 media upload slots)
src/tom/MechanismDetail.jsx   ← full showcase page (tabs, specs, resources,
                                 team, admin approve/reject/delete)
src/tom/tom.css               ← styling, reusing the existing design tokens
                                 (--gold, --border, fonts, easing curves) so it
                                 matches the current look exactly
supabase/tom_schema.sql       ← DB tables + RLS policies + storage bucket
```

`App.jsx` itself only got: the client import swapped to the shared file, one
`page` state var, a small tab switcher in the top nav, and an `{page === "tom"
? <TomShowcase/> : <>...existing markup...</>}` branch around the existing
hero/grid. Nothing inside the existing branch was changed.

## 2. Run the SQL migration

Open your Supabase project → SQL Editor → paste and run
`supabase/tom_schema.sql`. It creates:
- `tom_mechanisms` (basic/technical/student info + status)
- `tom_mechanism_media` (one row per uploaded file, FK'd to a mechanism)
- a public `tom-media` storage bucket for the actual files
- permissive RLS policies matching the trust model your `projects` table
  already uses (no Supabase Auth yet — see the security note at the bottom of
  that file, it's worth a read before you show this to a wider audience)

You don't need to change `.env` — it already has `VITE_SUPABASE_URL` and
`VITE_SUPABASE_ANON`, which `src/lib/supabaseClient.js` reads the same way
`App.jsx` did before.

## 3. Run it

```bash
npm install
npm run dev
```

Click the **"⚙️ TOM Mechanisms"** tab top-right.

## 4. Test checklist

- [ ] Existing "Projects" tab still works exactly as before (add/search/
      filter/delete as admin) — nothing here was changed.
- [ ] Submit a mechanism with a couple of images/a PDF attached → confirm
      it does **not** show up in the public grid yet (status: pending).
- [ ] Log in as admin (same password as before) → "🔔 Pending" button appears
      → Approve it → confirm it now shows in the grid with a cover image.
- [ ] Open a mechanism's detail page → check tabs only show up for media
      types that were actually uploaded, Overview always available.
- [ ] As admin, delete a single resource from the detail page's Resources
      list, and separately delete an entire mechanism → confirm both actually
      remove the underlying storage file(s) and DB rows.
- [ ] Search and category filters both narrow the grid correctly.
- [ ] Resize to mobile width — grid goes single-column, tabs wrap, upload
      grid stacks.

## 5. Known limitations (by design, to avoid over-building)

- **Admin is still just a client-side password flag**, same as the existing
  project board. RLS is therefore permissive rather than truly locked to an
  admin identity — flagged in `tom_schema.sql`. Fixing this properly means
  adding real Supabase Auth, which is a bigger change than this feature and
  wasn't part of the brief.
- **No per-student accounts**, so "students can't edit each other's
  mechanisms" is enforced the same way project deletion already is: only the
  shared admin can edit/delete anything after submission.
- File type validation is by the browser's `accept` attribute only (not
  re-validated server-side) — same level of rigor as the rest of the app
  today.
