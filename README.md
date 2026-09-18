# SiteSnap

Multi-site contractor daily fitout photo logger.

**Production:** https://sitesnap-447.netlify.app

## How to use

### Contractors
Open the unique upload link for your job site (`/u/<token>`). No login.
1. Confirm the site name
2. Take or choose photos
3. Optional short note
4. Upload

You cannot see other sites or past photos.

### Admin
1. Go to `/admin`
2. Enter the admin password (set in Netlify env `ADMIN_PASSWORD`)
3. Browse sites → date folders → photos
4. Create/rename sites and copy each site’s uploader link

## Demo sites (seeded on first boot)

| Site | Uploader path |
|------|----------------|
| Demo Mernda | `/u/mernda-928d4595a4868100d4a694d68971da38` |
| Demo Moe | `/u/moe-5904b37bf247e4f13eee42e020460d6a` |
| Demo Lansvale | `/u/lansvale-82728dcea797051eb416c6b251ba4fe6` |

## Env / security

```bash
netlify env:set ADMIN_PASSWORD "your-strong-password"
```

Optional: `SESSION_SECRET` for signing the admin session cookie (defaults to `ADMIN_PASSWORD`).

Storage: Netlify Blobs (`sitesnap` store). Photos under `siteId/YYYY-MM-DD/` using **Australia/Melbourne** calendar date.

## Stack

Vite + React + TypeScript, Netlify Functions, `@netlify/blobs`.
