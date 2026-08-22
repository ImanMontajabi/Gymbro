# Gymbro

Offline-first PWA workout tracker. Log sets, track progress, get AI feedback. RTL/Persian by default.

Live at [igymbro.com](https://igymbro.com).

## Features

- **Workout logging** — routines, exercises, and sets with drag-to-reorder (`dnd-kit`), inline editing, and localStorage draft persistence so in-progress input survives a backgrounded tab.
- **Auth** — email + password via Supabase Auth, RLS-scoped per user.
- **PWA** — installable on iOS/Android, offline-capable via service worker (`vite-plugin-pwa`), queued mutations sync when connectivity returns.
- **Theming** — four Catppuccin flavors (Latte, Frappé, Macchiato, Mocha) driven entirely by CSS custom properties, with the iOS Safari status bar color kept in sync on switch.
- **AI coach** — workout history sent to Gemini via a Supabase Edge Function, returns short, specific feedback rather than generic praise.
- **Progress charts** — per-exercise and aggregate max-weight trends via Recharts.
- **UI** — glassmorphic surfaces, tap-scale feedback, and animated transitions throughout; no component library.

## Tech Stack

| Layer      | Choice                                   |
| ---------- | ----------------------------------------- |
| Frontend   | React 19, Vite                            |
| Styling    | Tailwind CSS                              |
| Backend    | Supabase (Postgres, Auth, Edge Functions) |
| Charts     | Recharts                                  |
| Drag/drop  | dnd-kit                                   |
| AI         | Gemini API                                |

## Getting Started

### Prerequisites

- Node 20+
- A [Supabase](https://supabase.com) project

### Setup

```bash
git clone https://github.com/<your-username>/gymbro.git
cd gymbro
npm install
```

Create `.env.local`:

```bash
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Apply the schema — run `supabase/schema.sql` in the Supabase SQL Editor. It creates `routines`, `exercises`, and `sessions` tables with row-level security scoped to `auth.uid()`.

Run the dev server:

```bash
npm run dev
```

### AI Coach (optional)

The coach feature runs as a Supabase Edge Function and needs a Gemini API key set as a function secret:

```bash
supabase secrets set GEMINI_API_KEY=your-key
supabase functions deploy ai-coach
```

## License

MIT
