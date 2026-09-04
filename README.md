# 🎓 Workshop on Advanced LaTeX — Certificate Portal

> **Dr. S. J. Chopra Centre for Learning · UPES**  
> *Workshop on Advanced LaTeX for Research Writing and Publication*  
> *“Write Better. Publish Smarter. Impact Greater.”*

[![Next.js](https://img.shields.io/badge/Next.js-14%20(App%20Router)-black?style=flat&logo=next.js)](https://nextjs.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Database%20%26%20Storage-3ECF8E?style=flat&logo=supabase)](https://supabase.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![pdf-lib](https://img.shields.io/badge/pdf--lib-Client--Side%20PDF%20Engine-red?style=flat)](https://pdf-lib.js.org/)
[![Vercel](https://img.shields.io/badge/Vercel-Serverless%20Free%20Tier-white?style=flat&logo=vercel)](https://vercel.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A high-performance, **100% serverless certificate generation and distribution web application** built for the **Dr. S. J. Chopra Centre for Learning, UPES**. Engineered for zero operational cost, running completely on **Vercel's free tier** and **Supabase's free tier**.

---

## 📑 Table of Contents

- [Key Features](#-key-features)
- [Architecture & Tech Stack](#-architecture--tech-stack)
- [Project Directory Structure](#-project-directory-structure)
- [Prerequisites](#-prerequisites)
- [Step-by-Step Local Setup](#-step-by-step-local-setup)
  - [1. Clone the Repository](#1-clone-the-repository)
  - [2. Install Dependencies](#2-install-dependencies)
  - [3. Configure Supabase Database & Storage](#3-configure-supabase-database--storage)
  - [4. Set Up Environment Variables](#4-set-up-environment-variables)
  - [5. Run the Local Development Server](#5-run-the-local-development-server)
- [Excel Participant File Specification](#-excel-participant-file-specification)
- [Admin Console Guide](#-admin-console-guide)
- [Student Verification & Download Flow](#-student-verification--download-flow)
- [Vercel Deployment Guide](#-vercel-deployment-guide)
- [Security Features](#-security-features)
- [Troubleshooting & FAQs](#-troubleshooting--faqs)
- [Contact & Support](#-contact--support)

---

## ✨ Key Features

- 🎯 **Strict 3-Point Participant Verification**: Students enter **Full Name**, **Registered Email**, and **SAP ID**. The server validates all three fields case-insensitively before granting certificate access.
- ⚡ **Zero-Server-Load Client-Side PDF Generation**: Uses `pdf-lib` + `@pdf-lib/fontkit` entirely in the user's browser. Serverless functions never generate or stream heavy PDFs, ensuring lightning speed and preventing timeout issues on free serverless tiers.
- 🖋️ **Elegant Calligraphy Typography**: Personalizes certificates using the **Great Vibes** script font, stored locally as a TrueType asset (`.ttf`) to eliminate CORS errors and external CDN dependencies.
- 📐 **Dynamic Text Auto-Scaling & Vertical Centering**: Automatically calculates exact glyph bounds, centering participant names horizontally and vertically within the certificate gap, and automatically scales font sizes down for unusually long names.
- 📊 **Comprehensive Admin Control Panel**:
  - Secure password gate with constant-time string comparison.
  - One-click Excel/CSV bulk import (`.xlsx`, `.xls`, `.csv`) with auto-column matching.
  - Real-time dashboard analytics (Total Participants, Template status, Last Upload timestamp).
  - Certificate template manager (PNG/JPEG upload directly to Supabase Storage).
  - Double-confirmed data wipe utility.
- 🛡️ **Hardened Security**:
  - Built-in in-memory rate limiting (10 requests/min on verification; 5 requests/5 min on admin login).
  - Row Level Security (RLS) enabled on all database tables.
  - Server-side `service_role` secrets isolated from client bundles.
  - Strict input sanitization and XSS prevention headers.

---

## 🛠️ Architecture & Tech Stack

| Component | Technology | Purpose |
| :--- | :--- | :--- |
| **Framework** | [Next.js 14](https://nextjs.org/) (App Router) | Static site generation (SSG) & serverless API routes |
| **Language** | [TypeScript](https://www.typescriptlang.org/) | Type safety across API contracts and PDF calculations |
| **Database** | [Supabase](https://supabase.com/) (PostgreSQL) | Managed relational database with RLS and Audit Logs |
| **Storage** | [Supabase Storage](https://supabase.com/docs/guides/storage) | CDN-backed bucket for certificate templates |
| **PDF Engine** | [`pdf-lib`](https://pdf-lib.js.org/) + [`@pdf-lib/fontkit`](https://github.com/hopding/fontkit) | In-browser vector PDF rendering and custom font embedding |
| **Spreadsheet Parser** | [`xlsx` (SheetJS)](https://sheetjs.com/) | High-speed server-side Excel/CSV parsing |
| **Styling** | Vanilla CSS Tokens + CSS Glassmorphism | Custom design system matching the royal violet & gold theme |
| **Hosting** | [Vercel](https://vercel.com/) | Edge deployment and serverless route execution |

---

## 📂 Project Directory Structure

```
cert-app/
├── app/
│   ├── admin/
│   │   └── page.tsx              # Admin dashboard with auth, stats, file uploaders
│   ├── api/
│   │   ├── admin-login/route.ts  # Admin password validation & dashboard statistics
│   │   ├── clear-data/route.ts   # Secure endpoint to wipe participant data
│   │   ├── upload-excel/route.ts # SheetJS Excel parser & Supabase database sync
│   │   ├── upload-template/route.ts # Uploads certificate PNG to Supabase Storage
│   │   └── verify/route.ts       # 3-point participant match & audit logger
│   ├── globals.css               # Workshop violet/gold design system & animations
│   ├── layout.tsx                # Root layout, Google Inter font, SEO meta tags
│   └── page.tsx                  # Public Student certificate retrieval portal
├── lib/
│   ├── generateCertificate.ts    # Client-side pdf-lib canvas rendering & fontkit loader
│   ├── rateLimiter.ts            # Sliding-window in-memory IP rate limiter
│   ├── supabase.ts               # Public Supabase client (anon key)
│   ├── supabaseAdmin.ts          # Lazy server-side Supabase client (service role)
│   └── validation.ts             # Input sanitizers, email regex, timing-safe auth
├── public/
│   ├── certificate-template.png  # Base template fallback
│   └── fonts/
│       └── GreatVibes-Regular.ttf # Local TrueType calligraphy font
├── sample-data/
│   ├── dummy_participants.csv    # Ready-to-use sample CSV dataset
│   └── dummy_participants.xlsx   # Ready-to-use sample Excel spreadsheet
├── .env.example                  # Environment variable reference template
├── .gitignore                    # Ensures secrets (.env*) are never committed
├── next.config.js                # Security headers and Supabase storage domain config
├── package.json                  # Dependencies & scripts
├── supabase-schema.sql           # Database schema, RLS policies, audit table & bucket
└── README.md                     # Documentation
```

---

## 📋 Prerequisites

Before running the application, ensure you have:
1. **Node.js**: Version `18.17.0` or later (Node 20+ recommended).
2. **Package Manager**: `npm` (comes with Node.js) or `pnpm` / `yarn`.
3. **Supabase Account**: A free account at [supabase.com](https://supabase.com).
4. **Git**: Installed on your system.

---

## 🚀 Step-by-Step Local Setup

### 1. Clone the Repository

```bash
git clone https://github.com/Omfalcon/certi-lib.git
cd certi-lib
```

> If you cloned the repository where `cert-app` is the root folder, navigate inside:
> ```bash
> cd cert-app
> ```

---

### 2. Install Dependencies

```bash
npm install
```

---

### 3. Configure Supabase Database & Storage

1. Log into your **[Supabase Dashboard](https://supabase.com/dashboard)** and click **New Project**.
2. Set a **Project Name** (e.g. `latex-certificate-portal`) and a secure database password.
3. Once your project is created, click on the **SQL Editor** icon (`>_`) in the left sidebar.
4. Click **New Query**, open [`supabase-schema.sql`](file:///c:/Users/hp/PycharmProjects/certificate%20lib/cert-app/supabase-schema.sql) from this repository, copy its entire content, and paste it into the editor.
5. Click **Run** (Ctrl + Enter).
   * You will see the message: `Success. No rows returned`.
   * This successfully creates the `participants` table, `audit_log` table, indexes, RLS policies, and the public `certificates` storage bucket!
6. Verify the setup:
   - Click **Table Editor** (grid icon) to see the `participants` and `audit_log` tables.
   - Click **Storage** (bucket icon) to see the `certificates` bucket.

---

### 4. Set Up Environment Variables

1. In your Supabase Dashboard, click the **Settings ⚙️ (Project Settings)** icon at the bottom of the left sidebar.
2. Click **API** under Configuration.
3. Note down the following three credentials:
   - **Project URL** (e.g. `https://xyzproject.supabase.co`)
   - **Project API keys** &rarr; **`anon` `public`** key
   - **Project API keys** &rarr; **`service_role` `secret`** key *(click Reveal)*
4. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
5. Open `.env.local` in your editor and enter your real credentials:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...your-service-role-secret-key

# Admin Panel Password (choose any secure password)
ADMIN_PASSWORD=YourStrongAdminPassword123!
```

> ⚠️ **IMPORTANT**: Never commit `.env.local` to GitHub. The `SUPABASE_SERVICE_ROLE_KEY` has full administrative privileges over your database.

---

### 5. Run the Local Development Server

```bash
npm run dev
```

Open your browser and visit:
- **Student Portal**: [http://localhost:3000](http://localhost:3000)
- **Admin Console**: [http://localhost:3000/admin](http://localhost:3000/admin)

---

## 📊 Excel Participant File Specification

When uploading participant data through the Admin Console, use an Excel spreadsheet (`.xlsx`, `.xls`) or CSV (`.csv`).

### Column Requirements (Case-Insensitive):

| Column Name | Accepted Header Variants | Description | Example |
| :--- | :--- | :--- | :--- |
| **Full Name** | `name`, `Name`, `NAME`, `full_name`, `Full Name` | Participant's exact printed name | `Om Agarwal` |
| **Email Address** | `email`, `Email`, `EMAIL`, `email_address` | Registered email for verification | `om.agarwal@example.com` |
| **SAP ID** | `sapid`, `sap_id`, `SAPID`, `SAP ID`, `sap` | University ID (treated as string) | `500098765` |

### Sample Dataset:
You can find pre-formatted sample datasets ready to test inside the repository:
- [`sample-data/dummy_participants.xlsx`](file:///c:/Users/hp/PycharmProjects/certificate%20lib/cert-app/sample-data/dummy_participants.xlsx)
- [`sample-data/dummy_participants.csv`](file:///c:/Users/hp/PycharmProjects/certificate%20lib/cert-app/sample-data/dummy_participants.csv)

---

## 🔐 Admin Console Guide

Access the admin dashboard at **`/admin`**.

1. **Authentication**: Enter the `ADMIN_PASSWORD` configured in your `.env.local`.
2. **Upload Participants**:
   - Drag & drop your Excel file (`.xlsx`) or CSV.
   - Click **Upload & Sync Participants**. The system will parse the rows and atomically sync the database.
3. **Upload Certificate Template**:
   - Drag & drop a PNG/JPEG certificate template.
   - Click **Upload Template**. It will be saved into the public `certificates` Supabase Storage bucket.
4. **Real-Time Analytics**:
   - Monitor total active registered participants.
   - View template readiness status (`✓ Ready`).
   - Track last upload timestamp.
5. **Clear Data**:
   - Wipe all participant records and reset the system with a single two-step confirmed action.

---

## 🎓 Student Verification & Download Flow

1. The participant visits the root URL (`/`).
2. They enter:
   - **Full Name** (e.g. `Om Agarwal`)
   - **Email Address** (e.g. `om.agarwal@example.com`)
   - **SAP ID** (e.g. `500098765`)
3. The system calls `/api/verify`:
   - Checks rate limit for the client's IP.
   - Queries Supabase using case-insensitive sanitized matching.
   - Logs an entry in the `audit_log` table upon success.
4. When verified, the student is presented with a **Download Certificate (PDF)** button.
5. Clicking download triggers `generateAndDownloadCertificate`:
   - Embeds the template image onto an A4 landscape canvas.
   - Embeds the local **Great Vibes** font.
   - Measures and centers the name at **`y = 45.5%`** (271 pt from bottom).
   - Dynamically scales down font size if the name exceeds 75% of page width.
   - Triggers direct browser download as `LaTeX-Workshop-Certificate-[Name].pdf`.

---

## ☁️ Vercel Deployment Guide

Deploying this app to Vercel is free and takes under 2 minutes:

### Step 1: Push Repository to GitHub
Ensure all your latest changes are pushed:
```bash
git add .
git commit -m "feat: complete certificate portal"
git push origin main
```

### Step 2: Import into Vercel
1. Log into your [Vercel Dashboard](https://vercel.com).
2. Click **Add New...** &rarr; **Project**.
3. Import your **`certi-lib`** GitHub repository.
4. If your project files are in the root directory, leave **Root Directory** as `./`. If they are in a subfolder, set it to `cert-app`.

### Step 3: Configure Environment Variables
Under the **Environment Variables** section in Vercel, add the 4 variables from your `.env.local`:

| Name | Example Value |
| :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://vntqlhkvtxsmcwlyeehz.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `sb_publishable_...` |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGciOi...` *(Secret)* |
| `ADMIN_PASSWORD` | `YourStrongAdminPassword` |

### Step 4: Deploy
Click **Deploy**. Vercel will build your static pages and serverless API functions automatically!

---

## 🛡️ Security Features

- **Row Level Security (RLS)**: Public anon users have 0 direct table modification privileges. All database insertions and updates are exclusively handled via server-side API endpoints using the `service_role` key.
- **Timing-Attack Resilient Authentication**: Admin password comparison uses `crypto.timingSafeEqual` with SHA-256 digested buffers to prevent execution-timing analysis attacks.
- **Sliding-Window Rate Limiting**:
  - `/api/verify`: 10 requests per minute per IP.
  - `/api/admin-login`: 5 failed attempts per 5 minutes per IP.
- **Input Sanitization**: All strings are trimmed, HTML characters escaped, and lengths capped at 150 characters to prevent injection attacks.
- **HTTP Security Headers**: Enforced via `next.config.js`:
  - `X-Frame-Options: DENY` (prevents clickjacking)
  - `X-Content-Type-Options: nosniff` (prevents MIME sniffing)
  - `Referrer-Policy: strict-origin-when-cross-origin`

---

## ❓ Troubleshooting & FAQs

### Q1: During Excel upload, I get `500 Internal Server Error (Invalid API key)`
> **Cause**: The `SUPABASE_SERVICE_ROLE_KEY` in your `.env.local` or Vercel environment variables is missing or set to the placeholder text.  
> **Fix**: Go to **Supabase Dashboard &rarr; Settings ⚙️ &rarr; API &rarr; Project API keys**, reveal the **`service_role`** key, and paste it into `.env.local`.

### Q2: Certificate download gives `Failed to load certificate font`
> **Cause**: An external CDN URL was blocked or timed out.  
> **Fix**: In this repository, `GreatVibes-Regular.ttf` is hosted locally inside `/public/fonts/GreatVibes-Regular.ttf`. Ensure this file exists in your repo.

### Q3: In Supabase SQL Editor, running the schema gives `Success. No rows returned`
> **Cause**: This is the expected, correct response in PostgreSQL for DDL statements (`CREATE TABLE`, `CREATE POLICY`, etc.). It means all tables were created with 0 errors!

---

## 📞 Contact & Support

For questions, permissions, or academic event inquiries:
- **Organization**: Dr. S. J. Chopra Centre for Learning, UPES
- **Email**: [librarian@ddn.upes.ac.in](mailto:librarian@ddn.upes.ac.in)
- **Campus**: Bidholi Campus, Dehradun, Uttarakhand, India

---

Developed with ❤️ for **UPES Academic Workshops**. Distributed under the MIT License.
