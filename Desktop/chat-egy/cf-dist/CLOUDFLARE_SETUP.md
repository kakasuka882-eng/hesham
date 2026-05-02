# Cloudflare Pages Setup

## 1) Create a Pages project
- Open Cloudflare Dashboard -> `Workers & Pages` -> `Create application` -> `Pages`.
- Create project name (example: `chat-egy`).
- Keep production branch as `main`.

## 2) Required GitHub secrets
Add these secrets in your GitHub repo:
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_PAGES_PROJECT`

`CLOUDFLARE_PAGES_PROJECT` must be the exact Pages project name.

## 3) API token permissions
Create token in Cloudflare with at least:
- `Account: Cloudflare Pages:Edit`
- Scope to your account.

## 4) DNS records
- Root domain:
  - `A` record: `@ -> 199.36.158.100` (already used for your current domain)
- WWW:
  - `CNAME` record: `www -> reels-ff877.web.app` (your current target)

If you fully move DNS to Cloudflare later, keep `www` pointing to your Pages/custom-domain target from Cloudflare instructions.

## 5) Daily auto publish
Workflow file:
- `.github/workflows/daily-topics.yml`

It does:
1. Generate daily topics.
2. Commit changes.
3. Build `cf-dist` via `tools/prepare-cloudflare-dist.mjs`.
4. Deploy `cf-dist` to Cloudflare Pages.

## 6) Notes
- `tools/prepare-cloudflare-dist.mjs` excludes sensitive files (`*.php`, `data/**`, `*.sqlite`, `*.zip`, etc.) so they are not published.
- `_redirects` enforces `www -> non-www`.
- `_headers` sets security and cache headers.
