# MediOrder Pro

Multi-tenant pharma distribution SaaS. Distributors manage medicine catalogs and receive orders. Pharmacies place orders via a public portal — no login required.

## Architecture

```
Browser (Next.js)
    │  HTTPS — calls only /api/* routes
    ▼
Next.js API Routes  ← credentials live here (server-side only)
    │  Service Role Key (never reaches browser)
    ▼
Supabase (Postgres + Auth) Right
```

**The browser never holds database credentials.** The Supabase `service_role` key exists only in environment variables on the server. The browser only holds a session cookie.

---

## Local Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create Supabase project

1. Go to [supabase.com](https://supabase.com) → New project
2. Copy your **Project URL** and **service_role secret key** from Settings → API

### 3. Configure environment

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Never commit `.env.local`.** It's in `.gitignore`.

### 4. Run the database schema

Open Supabase → SQL Editor → paste the contents of `sql/schema.sql` → Run.

### 5. Start dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Deployment (Cloudflare Pages)

### Option A: Cloudflare Pages (recommended)

1. Push your repo to GitHub (make sure `.env.local` is in `.gitignore`)
2. Cloudflare Pages → Create project → Connect GitHub repo
3. Build settings:
   - **Framework**: Next.js
   - **Build command**: `npm run build`
   - **Output directory**: `.next`
4. Add environment variables in Cloudflare Pages dashboard (same as `.env.local`)
5. Set `NEXT_PUBLIC_APP_URL` to your production domain

### Option B: Vercel

```bash
npx vercel
```

Add the same environment variables in the Vercel dashboard.

---

## Adding Supabase Auth Email Templates

In Supabase → Auth → Email Templates, set the redirect URL to:

```
https://your-domain.com/login
```

---

## Project Structure

```
pages/
  api/
    auth/signup.ts       ← POST /api/auth/signup
    auth/me.ts           ← GET /api/auth/me
    profile/index.ts     ← GET/PATCH /api/profile
    medicines/index.ts   ← GET/POST /api/medicines
    medicines/[id].ts    ← PATCH/DELETE /api/medicines/:id
    medicines/import.ts  ← POST /api/medicines/import
    orders/index.ts      ← GET/POST /api/orders
    orders/[id].ts       ← GET/PATCH /api/orders/:id
    portal/[slug].ts     ← GET /api/portal/:slug (public)
  dashboard.tsx
  catalog.tsx
  orders.tsx
  settings.tsx
  portal/[slug].tsx      ← public pharmacy portal
  login.tsx
  signup.tsx
  onboarding.tsx

lib/
  supabase/
    server.ts            ← admin client (service_role, server-only)
    client.ts            ← browser client (anon key, session management only)
    types.ts             ← TypeScript database types
  api.ts                 ← typed fetch helpers (browser → /api/*)
  auth.ts                ← server-side auth helpers
  format.ts              ← number/date formatters

sql/
  schema.sql             ← run once in Supabase

styles/
  globals.css            ← design system, CSS variables
  *.module.css           ← component styles
```

---

## Security Model

| Layer | What's there | Where it runs |
|-------|-------------|---------------|
| `SUPABASE_SERVICE_ROLE_KEY` | Full DB access, bypasses RLS | Server only (`/api/*`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | No privileges beyond RLS | Browser (session cookie management only) |
| Row Level Security | Every table locked per `auth.uid()` | Supabase (database) |
| Middleware | Route protection, redirect unauthed users | Edge (Cloudflare) |
| API ownership checks | Verify dist_id before every write | Server (`/api/*`) |
| Order price validation | Server re-fetches prices — never trusts client | Server (`/api/orders`) |

The pharmacy portal places orders without auth. The API validates:
- `dist_id` exists and is onboarded
- All `medicine_id` values belong to that distributor
- Prices are re-fetched from DB — client-sent prices are ignored
