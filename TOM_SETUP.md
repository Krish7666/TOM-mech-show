# TOM Mechanism Showcase — Setup & Test Guide

This is now a standalone TOM (Theory of Machines) showcase — the older
Mech-AIML "Projects" tab has been removed, matching the direction the
project had already moved in (package name, README, and the TOM-specific
admin key all pointed the same way).

## What's in this build

Real shared backend (Supabase) + the live DOF calculator / animated
mechanism preview that got added along the way — merged into one app
instead of living as two disconnected implementations.

```
src/lib/supabaseClient.js   ← Supabase client. Exports `supabase` as null
                               (not a throw) when VITE_SUPABASE_URL/ANON are
                               missing, so the app boots and shows an inline
                               warning instead of a blank screen.
src/tom/tomConstants.js     ← categories, media types, form shape
src/tom/tomKinematics.js    ← pure functions: Grubler's-equation DOF calc,
                               mechanism classification, animation-caption
                               suggestion, SVG geometry helpers
src/tom/tomApi.js           ← all Supabase calls (fetch/submit/approve/
                               reject/update/delete), each guarded against
                               a missing Supabase config
src/tom/TomShowcase.jsx     ← browse grid, search/filter, add flow, admin
                               pending-review queue
src/tom/MechanismCard.jsx   ← mechanism card for the grid
src/tom/MechanismForm.jsx   ← "Add Mechanism" form — basic/technical/
                               student info, 7 media upload slots, optional
                               video URL + animation caption (with a
                               "Suggest" button, never auto-filled silently)
src/tom/MechanismDetail.jsx ← showcase page (tabs, specs, resources, team,
                               admin approve/reject/delete)
src/tom/MechanismPreview.jsx← live DOF calculator + animated SVG preview
                               (four-bar, gears, cam-follower, Ackermann
                               steering, pick-and-place)
src/tom/tom.css             ← styling for the module above
src/tom/tomPreview.css      ← styling for the calculator/preview specifically
supabase/tom_schema.sql     ← DB tables + RLS policies + storage bucket
```

`App.jsx` is now a thin shell: admin login modal + `<TomShowcase/>`. No
Projects tab, no localStorage data store.

## 1. Run the SQL migration

Open your Supabase project → SQL Editor → run `supabase/tom_schema.sql`.
It's safe to re-run even if you ran an earlier version — the `alter table
... add column if not exists` lines bring an existing table up to date
without touching existing rows. New columns since the last version:

- `num_higher_pairs` — the H term in Grubler's equation
- `mechanism_type` — optional hint (e.g. `"pick-and-place"`) that selects a
  special preview animation; leave blank and the category name picks the
  animation automatically
- `video_url`, `animation_description` — optional YouTube embed + a one-line
  caption shown under the live preview

## 2. Run it

```bash
npm install
npm run dev
```

If `.env` is missing `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON`, the app
still loads and shows an inline warning banner instead of crashing —
useful for local UI work without a backend, but nothing will actually
save until those are set.

## 3. How the live preview picks an animation

`tomKinematics.previewKindFor()` matches, in order: `mechanism_type ===
"pick-and-place"` first, then the category name containing "gear", "cam",
"steering", or "four-bar". Anything else (Slider-crank, Quick-return,
Couplings, Other, ...) shows a plain "not available for this category yet"
message with the DOF result and explanation still shown — it deliberately
does **not** fall back to the four-bar animation, since that would show a
visually wrong mechanism for a kinematically different one. Add a new
`case` in `MechanismPreview.jsx`'s `LivePreview` switch plus a matching
branch in `previewKindFor()` to cover another category.

## 4. Who can edit the calculator's numbers

The DOF calculator is viewable and interactive for everyone (dragging the
link/joint/higher-pair counts updates the live result and animation for
anyone browsing). Only admins can actually **save** those numbers back to
the mechanism's stored spec — otherwise any visitor could silently
overwrite another student's submitted technical details, since there's no
per-student ownership check (see the security note below).

## 5. Test checklist

- [ ] Submit a mechanism with a couple of images/a PDF → confirm it does
      **not** show up in the public grid yet (status: pending).
- [ ] Log in as admin → "🔔 Pending" → Approve it → confirm it now shows in
      the grid with a cover image.
- [ ] Open a mechanism's detail page → confirm the live preview renders for
      Four-bar/Gear/Cam/Steering categories, and shows the neutral
      "not available" message for anything else.
- [ ] As admin, adjust the calculator's Links/Joints/Higher Pairs and hit
      "Save to mechanism" → confirm the Technical Details spec cards above
      update to match.
- [ ] As a non-admin, confirm the calculator inputs are disabled but the
      live numbers/animation still update as you'd expect from the
      mechanism's registered values.
- [ ] Delete a single resource and a whole mechanism as admin → confirm
      both actually remove the underlying storage file(s) and DB rows.
- [ ] Temporarily rename `VITE_SUPABASE_URL` in `.env` → confirm the app
      still loads and shows the warning banner instead of a blank page.

## 6. Known limitations (by design, to avoid over-building)

- **Admin is still just a client-side password flag** (`tom_admin_token` in
  localStorage). RLS is permissive rather than truly locked to an admin
  identity — see the security note in `tom_schema.sql`. Real enforcement
  needs Supabase Auth, which is a bigger change than this feature.
- **No per-student accounts**, so "students can't edit each other's
  mechanisms" is enforced the same way as before: only the shared admin can
  edit/delete/save-calculator-changes after submission.
- File type validation is by the browser's `accept` attribute only, not
  re-validated server-side.
- The live-preview animations are illustrative (parameterized by
  link/joint counts to *look* plausible), not a real kinematic solver —
  don't present the exact traced path as dimensionally accurate.
