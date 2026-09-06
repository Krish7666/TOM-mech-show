# TOM Mechanism Showcase

A TOM-only React + Vite app for showcasing theory-of-machines mechanisms, student submissions, and admin review.

## Run locally

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
```

## Notes

- The app is intentionally focused on the TOM mechanism showcase and removes the older Mech-AIML hub flow.
- Admin access uses the existing password-based client-side gate in the shared Supabase config.
- Supabase env values are still read from VITE_SUPABASE_URL and VITE_SUPABASE_ANON.
