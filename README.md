# LBC4SMC.com — Barrera Castañón for SMC Board

Campaign website for the November 2026 Santa Monica College Board of Trustees election.

## Quick Deploy to Vercel (5 minutes)

### Step 1: Buy the domain
- Go to [Namecheap](https://namecheap.com), [Google Domains](https://domains.google), or [Cloudflare Registrar](https://dash.cloudflare.com)
- Purchase **lbc4smc.com**
- Cost: ~$10-12/year

### Step 2: Deploy to Vercel
1. Go to [vercel.com](https://vercel.com) and sign up (free tier is fine)
2. Install Vercel CLI: `npm i -g vercel`
3. In this folder, run: `vercel`
4. Follow the prompts (defaults are fine)
5. Your site is now live at a `.vercel.app` URL

### Step 3: Connect your domain
1. In Vercel dashboard → your project → Settings → Domains
2. Add `lbc4smc.com` and `www.lbc4smc.com`
3. Vercel will give you DNS records to add at your registrar
4. Update your domain's nameservers or add the records
5. SSL certificate is automatic — HTTPS just works

### Alternative: Drag & Drop Deploy
1. Go to [vercel.com/new](https://vercel.com/new)
2. Choose "Upload" 
3. Drag this entire folder
4. Done

### Alternative: Netlify
1. Go to [app.netlify.com/drop](https://app.netlify.com/drop)
2. Drag this entire folder onto the page
3. Site is live instantly
4. Add custom domain in Site settings → Domain management

## Files

```
lbc4smc/
├── index.html      ← The entire campaign site (single file, zero dependencies)
├── vercel.json     ← Vercel deployment config with security headers
└── README.md       ← This file
```

## What's Built

- **Hero** — Origin story hook + key stats
- **My Story** — Timeline from 1992 to present
- **Priorities** — 6 data-backed policy positions (expandable)
- **My Record** — CivicLens preview (placeholder for Q&A system)
- **Community** — All roles, affiliations, career highlights, education
- **Español** — Placeholder for culturally native Spanish content
- **Get Involved** — Volunteer, endorse, contact
- **Footer** — Links, campaign disclaimer

## What's Next

1. **CivicLens integration** — Wire up the SMC board meeting scraper + public Seth Q&A
2. **Spanish content** — Full /español section (not translated — culturally native)
3. **Campaign photography** — Headshot, event photos
4. **Donate/volunteer forms** — Once campaign paperwork is filed
5. **Trustee scorecards** — Voting record visualizations

## Legal Separation

This site is **completely separate** from:
- EmpathySystem.ai (Lived Experience Inc.)
- Any Lived Experience Inc. infrastructure
- Any shared deployment or billing

Campaign site billing must go through a campaign account once paperwork is filed.

## Cost

- Vercel hosting: **$0/month** (free tier)
- Domain: **~$12/year**
- No database yet (static site)
- Total: **~$1/month**
