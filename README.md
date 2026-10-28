# SPA Test Bench

A dependency-free single page app for testing Pendo guides against common SPA behaviors. Plain HTML/CSS/JS, so it deploys to GitHub Pages with no build step.

## Deploy to GitHub Pages

1. Create a repo and commit these files at the repo root (`index.html`, `404.html`, `app.js`, `styles.css`, `config.js`).
2. Edit `config.js` and set `pendoApiKey` (and `pendoCdn` if you are not on the US region).
3. Repo **Settings > Pages**: Source = *Deploy from a branch*, branch `main`, folder `/ (root)`.
4. Visit `https://<user>.github.io/<repo>/`.
5. In Pendo, add `https://<user>.github.io` to the app's allowed domains / install the app against this URL.

Using a user/org site (`<user>.github.io`) or a custom domain? Set `basePath: ''` in `config.js` and `pathSegmentsToKeep = 0` in `404.html`.

## Why `404.html` exists

GitHub Pages cannot rewrite `/repo/dashboard` to `index.html`, so a refresh or shared deep link would 404. `404.html` encodes the path into the query string and redirects to `index.html`, which restores the real URL with `history.replaceState`. This is a common SPA workaround, and it means a first hit on a deep link goes through one redirect. Worth knowing when you test guide behavior on direct visits.

## Run locally

```
npx serve -s .      # -s = SPA fallback to index.html
```

## Test matrix

| SPA behavior | Where | What to try in Pendo |
|---|---|---|
| Route change without page load | any nav link | Page rules for `/dashboard`, `/reports`; guide targeted by page |
| Parameterized URL | `/reports/42` | Page rule `//*/reports/*` |
| Query-string state | `/reports?status=open` | Page rule with `?status=open` |
| Late-rendered elements | `/dashboard` | Tooltip on `[data-pendo="export-btn"]`; change the delay in test controls |
| Late-added nav item | after visiting `/dashboard` | Badge/tooltip on `[data-pendo="nav-insights"]` |
| Unstable class names | everywhere (toggle on) | Compare a guide/feature anchored on a class selector vs `data-pendo` |
| Same URL, different views | `/settings` tabs, modal, wizard | Guide that should show only on the Billing tab, in the modal, or at wizard step 2 |
| Anchor destroyed and recreated | Home: "Destroy & re-render" | Does the guide survive the re-render? |
| Hash routing | `/legacy#/details` | Page rule using the hash |
| Delayed identity | test controls: identity delay, reload | Segment-targeted guides when metadata arrives late |
| Manual page signal | test controls: `pendo.pageLoad()` toggle | Does it change guide behavior on route change? |

## Selector tips

Every meaningful element has a stable `data-pendo="..."` attribute (and many have ids). Classes are intentionally randomized (`btn_x7k2a`), so a selector like `button.btn_x7k2a` breaks on the next render, which mimics CSS-in-JS and hashed class names. Note that custom attributes may need to be registered in Pendo's app settings before selectors using them will match.

Styling uses `data-ui` attributes, so randomizing classes never breaks the look of the app.
