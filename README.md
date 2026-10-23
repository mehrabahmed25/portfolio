# Mehrab Uddin Ahmed — Portfolio

Personal research portfolio. Static site on GitHub Pages, content served live from Supabase.

- **Site:** https://mehrabahmed25.github.io/portfolio/
- **Admin:** https://mehrabahmed25.github.io/portfolio/admin.html

## How it works

| Part | Where |
| --- | --- |
| Pages (HTML/CSS/JS) | this repo → GitHub Pages (branch `main`, root) |
| Content, photos, CV, messages | Supabase project **mehrab-portfolio** (`supnyjegnynhasoovhgq`, Mumbai) |
| Backup copy of content | `data/content.json`, refreshed by `.github/workflows/keep-alive.yml` |

This Supabase project is completely separate from the BPC Club Performance project —
different database, keys, users and storage.

## Editing content

Sign in at `/admin.html`. Every change is live as soon as you save — no commits or redeploys.

- **Profile** — name, headline, intro, research interests, photo, CV PDF, links
- **Publications / Projects / Experience / Education / Skills / Photos** — add, edit, hide, reorder, delete
- **Messages** — contact-form submissions
- **Account** — change password

Publication highlights written as `95.9% | Accuracy` show as large figures.

## Security

- Row Level Security on every table: the public can only read visible content and send messages.
- Only the user listed in `public.admins` can edit content, upload files or read messages.
- The key in `assets/js/config.js` is the public *anon* key — it is meant to be in the browser.
  Never put the `service_role` key in this repo.

## Keep-alive

Free Supabase projects pause after 7 days without activity. The workflow runs every Monday and
Thursday, reads the public content (keeping the project active) and commits `data/content.json`
if anything changed. If Supabase is ever unreachable, the site renders from that file.
