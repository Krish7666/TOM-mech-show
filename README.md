# TOM Mechanism Showcase

A modern React + Vite web application for showcasing student-built Theory of Machines mechanisms with live kinematic analysis, interactive previews, and admin review system.

## ✨ Features

- **Mechanism Gallery** — Browse and filter mechanisms by category (four-bar, slider-crank, gears, cams, etc.)
- **Live DOF Calculator** — Real-time calculation using Grubler's equation (DOF = 3(L-1) - 2J - H)
- **Animated Previews** — Interactive SVG animations for common mechanism types
- **Student Submissions** — Form-based submissions with multi-media support (images, videos, CAD files, documents)
- **Admin Review System** — Password-protected dashboard for reviewing and approving/rejecting submissions
- **Search & Filter** — Find mechanisms by name, category, student, or college
- **Responsive Design** — Mobile-friendly interface with dark theme
- **Accessibility** — WCAG-compliant with keyboard navigation and screen reader support

## 🚀 Quick Start

### Prerequisites
- Node.js 16+
- Supabase project (free tier available at [supabase.com](https://supabase.com))

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/Krish7666/TOM-mech-show.git
cd TOM-mech-show

# 2. Install dependencies
npm install

# 3. Create .env file from example
cp .env.example .env

# 4. Add your Supabase credentials to .env
# VITE_SUPABASE_URL=your-supabase-url
# VITE_SUPABASE_ANON=your-supabase-anon-key

# 5. Run the database migration
# Open your Supabase project → SQL Editor → run supabase/tom_schema.sql

# 6. Start development server
npm run dev
```

The app will be available at `http://localhost:5173`

## 📦 Production Build

```bash
npm run build
npm run preview  # Preview the production build locally
```

## 🔧 Configuration

### Environment Variables

Create a `.env.local` file (or `.env`) with the following:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON=your-anonymous-key
VITE_ADMIN_PASSWORD=your-secure-password
```

See `.env.example` for a template.

### Database Setup

1. Open your Supabase project
2. Navigate to SQL Editor
3. Copy and paste the contents of `supabase/tom_schema.sql`
4. Execute the migration

The migration includes:
- `tom_mechanisms` table
- `tom_mechanism_media` table
- Row-level security (RLS) policies
- Storage buckets for media files

It's safe to re-run—existing tables are updated with new columns if needed.

## 📂 Project Structure

```
src/
├── tom/                      # TOM showcase module
│   ├── TomShowcase.jsx       # Main gallery & admin interface
│   ├── MechanismCard.jsx     # Grid card component
│   ├── MechanismForm.jsx     # Submission form
│   ├── MechanismDetail.jsx   # Detail page with tabs
│   ├── MechanismPreview.jsx  # Live calculator & animations
│   ├── tomApi.js             # Supabase API calls
│   ├── tomConstants.js       # Categories, media types
│   ├── tomKinematics.js      # DOF calculation logic
│   ├── tom.css               # TOM module styles
│   └── tomPreview.css        # Calculator/preview styles
├── lib/
│   └── supabaseClient.js     # Supabase configuration
├── App.jsx                   # App shell with login & theme
├── App.css                   # Global styles & design system
├── main.jsx                  # React entry point
└── index.css                 # Base styles
```

## 🛠️ Development

### Available Scripts

```bash
npm run dev      # Start dev server (Vite)
npm run build    # Build for production
npm run lint     # Run ESLint
npm run preview  # Preview production build
```

### Code Style

- ESLint configured for React + React Hooks
- Consistent naming: BEM for CSS classes, camelCase for JS
- Components use React hooks (no class components)

## 🔐 Admin Panel

1. Click **Admin Login** (top right)
2. Enter the admin password (from `.env`)
3. View the **Pending Review** queue
4. Approve/reject/delete submissions
5. Click **Logout** to exit

> ⚠️ **Security Note:** The admin password is client-side only (suitable for educational projects). For production, use server-side authentication with proper security headers.

## 📊 Mechanism Categories

- Four-bar
- Slider-crank
- Quick-return
- Gear mechanisms
- Cam mechanisms
- Couplings
- Steering mechanisms
- Other

## 📋 Submission Form

Students can submit:
- **Basic Info** — name, category, descriptions
- **Technical Specs** — links, joints, higher pairs, DOF, kinematic info
- **Media** — images, videos, animations, CAD files, documents (up to 7 slots)
- **Student Info** — name, team members, department, college, academic year

## 🎨 Design System

**Colors:**
- Background: `#07070d` (deep navy)
- Text: `#e2e8f0` (light slate)
- Accent: `#fbbf24` (gold)
- Danger: `#ef4444` (red)

**Typography:**
- Display: Playfair Display (serif, headlines)
- Body: DM Sans (sans-serif, content)
- Mono: DM Mono (code, labels)

**Animations:**
- Spring easing for interactive elements
- Parallax orbs on background
- Smooth transitions and micro-interactions

## ♿ Accessibility

- Keyboard navigation (Tab, Enter, Arrow keys)
- ARIA labels and roles for screen readers
- Focus indicators for keyboard users
- Color contrast compliant (WCAG AA)
- Semantic HTML structure

## 🐛 Troubleshooting

**Blank screen on load?**
- Check console for errors
- Ensure `.env` file exists with valid Supabase credentials
- Run `npm run dev` again

**Can't upload files?**
- Verify Supabase storage bucket is configured
- Check browser console for upload errors
- Ensure file sizes are within limits

**Admin login not working?**
- Verify `VITE_ADMIN_PASSWORD` in `.env`
- Check browser localStorage (`ADMIN_KEY` in console)
- Try incognito mode to test fresh login

## 📚 References

- [React Documentation](https://react.dev)
- [Vite Guide](https://vitejs.dev)
- [Supabase Docs](https://supabase.com/docs)
- [Grubler's Equation](https://en.wikipedia.org/wiki/Degrees_of_freedom_(mechanics))

## 📝 License

This project is part of NMIET's Theory of Machines curriculum.

## 🤝 Contributing

To contribute improvements:
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📧 Support

For issues or questions, please open an issue on GitHub.
