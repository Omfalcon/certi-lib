# Workshop on Advanced LaTeX — Certificate Portal

A **fully serverless** certificate distribution platform for the **Workshop on Advanced LaTeX for Research Writing and Publication** (Dr. S. J. Chopra Centre for Learning, UPES), built with **Next.js + Supabase**, deployable on the **Vercel free tier**.

## Features

- 🎓 **Student portal** — Enter Name, Email, SAP ID to download personalized certificate PDF
- 🖊 **Great Vibes font** — Elegant cursive name overlay on the certificate
- 🔐 **Admin panel** — Upload participant Excel + certificate template
- 🛡 **Secure by default** — Rate limiting, input sanitization, RLS, constant-time password comparison
- ☁️ **100% serverless** — No paid infra, runs free on Vercel + Supabase

---

## Quick Start (Local Dev)

### 1. Clone & Install

```bash
cd cert-app
npm install
```

### 2. Set Up Supabase

1. Go to [supabase.com](https://supabase.com) → Create a new project
2. Go to **SQL Editor** → Run the contents of `supabase-schema.sql`
3. Go to **Settings → API** and copy:
   - Project URL
   - `anon` public key
   - `service_role` secret key

### 3. Configure Environment Variables

Edit `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Choose a strong password for admin panel
ADMIN_PASSWORD=YourStrongPassword123!
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Excel File Format

Your Excel (.xlsx) file must have these columns (case-insensitive):

| name | email | sapid |
|------|-------|-------|
| Priya Sharma | priya@upes.ac.in | 500123456 |
| Rahul Gupta | rahul@upes.ac.in | 500234567 |

---

## Admin Panel

Navigate to `/admin` and log in with your `ADMIN_PASSWORD`.

1. **Upload Excel** → Replaces all participant data
2. **Upload Template** → Stores certificate PNG in Supabase Storage  
3. **Clear All Data** → Requires double confirmation

---

## Deploy to Vercel

### 1. Push to GitHub

```bash
git add .
git commit -m "Initial commit"
git push origin main
```

### 2. Connect to Vercel

1. Go to [vercel.com](https://vercel.com) → New Project → Import your repo
2. Set **Root Directory** to `cert-app`
3. Add all environment variables from `.env.local` in the Vercel dashboard

### 3. Deploy!

Vercel will auto-deploy on every push to `main`.

---

## Security Features

| Feature | Implementation |
|---|---|
| Rate limiting | 10 req/min on verify, 5 req/5min on admin |
| Input sanitization | All inputs trimmed, max length enforced |
| Email validation | Regex + case-insensitive DB match |
| Admin auth | Constant-time password comparison |
| Database | Row Level Security (RLS) — no public access |
| HTTP headers | X-Frame-Options, nosniff, XSS protection |
| Service role key | Server-side only, never sent to browser |

---

## Project Structure

```
cert-app/
├── app/
│   ├── page.tsx                  # Student portal
│   ├── admin/page.tsx            # Admin panel
│   ├── api/
│   │   ├── verify/route.ts       # Participant verification
│   │   ├── upload-excel/route.ts # Excel ingestion
│   │   ├── upload-template/route.ts # Template storage
│   │   ├── admin-login/route.ts  # Admin auth + stats
│   │   └── clear-data/route.ts   # Data management
│   ├── globals.css               # Full design system
│   └── layout.tsx
├── lib/
│   ├── supabase.ts               # Public client
│   ├── supabaseAdmin.ts          # Admin client (server-only)
│   ├── generateCertificate.ts    # Client-side PDF generation
│   ├── rateLimiter.ts            # Rate limiting
│   └── validation.ts             # Input validation & security
├── public/
│   └── certificate-template.png # Local dev fallback
├── supabase-schema.sql           # Run this in Supabase SQL Editor
└── .env.local                    # Environment variables
```
