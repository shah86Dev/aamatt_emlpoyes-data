# A.A Matt Employee System

Employee application form, PDF + ID card generation, and a database, deployed as a
Next.js app.

## What's here

- **`/`** — the employee application form (matches the fields from the original
  Employment Form.xls), plus a **Records** tab listing everyone saved so far.
- On save: generates a sequential employee ID (`AAM-<year>-<seq>`, via a Postgres
  function), uploads the photo to Supabase Storage, saves the record to Postgres,
  and offers two PDF downloads — the filled application, and a two-sided,
  CR80-card-sized printable ID card.
- A simple shared-password gate (`middleware.js`) protects the whole site, since it
  holds personal data (CNIC, contact info, photos).

## One-time setup

The Supabase project, tables, and storage bucket are already created (see below for
the values). You only need to:

1. **Deploy to Vercel**
   - Import this repo at [vercel.com/new](https://vercel.com/new).
   - Framework preset: Next.js (auto-detected).
2. **Set environment variables** in the Vercel project (Settings → Environment
   Variables):

   | Name | Value |
   |---|---|
   | `SUPABASE_URL` | `https://sjpkhllwrpifyldjfwdv.supabase.co` |
   | `SUPABASE_ANON_KEY` | the anon key from Supabase → Project Settings → API |
   | `APP_PASSWORD` | any password you choose — this is what gates the whole site |

3. Redeploy (Vercel does this automatically after env vars are saved, or click
   "Redeploy").

That's it — open the deployed URL, enter the password, and start using it.

## Local development

```bash
npm install
cp .env.example .env.local   # fill in the values above
npm run dev
```

## Data

Everything lives in the `aa-matt-employee-system` Supabase project:
- Table `public.employees` — one row per application.
- Storage bucket `employee-photos` (private) — one photo per employee, served via
  short-lived signed URLs.

Both are already set up; there's nothing to migrate before first use.
