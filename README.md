# Tafolli Glass — Website

A static, multilingual one-page site for **Tafolli Glass sh.p.k.** (formerly
*Fabrika e Xhamave "Teuta"*), a glass factory in Sopijë, Suharekë, Kosovo.

No build step, no framework, no server code. Open `index.html` and it runs.

---

## Quick start

```bash
# any static server works
python3 -m http.server 8000
# → http://localhost:8000
```

Deploy by copying the whole folder to any static host (GitHub Pages, Netlify,
Vercel, cPanel, Hostinger …).

---

## What to edit

### 1. Contact details → `assets/js/config.js`

Everything the site says about phone numbers, address, e-mail, opening hours
and social links comes from this one file. Change it there and it updates in
the header, the contact cards, the footer, the WhatsApp links, the map and the
Google structured data at once.

```js
phonePrimary: "+383 44 602 211",
email:        "info@tafolliglass.net",
whatsapp:     "38344602211",
```

`autoDetectLanguage: false` means every visitor lands on Albanian. Set it to
`true` to open the site in the visitor's own browser language when that is
Albanian, English, German or French.

### 2. Texts → `assets/js/i18n.js`

Four complete translations: `sq` (Albanian, the main language), `en`, `de`,
`fr`. All four carry the **same set of keys** — if you add a key to one,
add it to all four, otherwise that language falls back to Albanian.

In the HTML, text is bound with `data-i18n="key"`. For attributes, add
`data-i18n-attr="placeholder"` (or `content`, …).

### 3. Images → `assets/img/`

| File | Used for |
|---|---|
| `logo-tafolli-glass-white.png` | Logo on dark backgrounds (header, footer) |
| `logo-tafolli-glass-dark.png` | Logo for light backgrounds / print |
| `mark-white.png`, `mark-dark.png` | Logo mark alone |
| `favicon-*.png`, `apple-touch-icon.png` | Browser and phone icons |
| `og-image.jpg` | Preview card when the link is shared |
| `social-2…5.jpg` | Gallery |

The logo files are derived from the original brand asset produced by AXE Media.

### 4. Technical numbers → `assets/js/glass3d.js`

The spec table under the 3D model reads from the `SPECS` object near the top of
the glazing section:

```js
const SPECS = {
  3: { ug: "0,5", rw: "42–47", g: "0,50", th: "44", w: "30" },  // triple
  2: { ug: "1,0", rw: "32–37", g: "0,62", th: "24", w: "20" }   // double
};
```

These are **typical values for standard build-ups**, and the site labels them
as such. Replace them with the figures from your own supplier's data sheets
before publishing.

---

## The 3D section

`assets/js/glass3d.js` renders two WebGL scenes with
[three.js](https://threejs.org/) (vendored at `assets/vendor/three.module.min.js`,
MIT licence — no CDN, no tracking):

1. **Hero** — sheets of refractive glass drifting through light.
2. **Termopani 3D** — an interactive triple-glazed unit. Drag to rotate;
   switch between double and triple glazing, pull the layers apart, and show
   how heat is reflected back by the Low-E coating or how each pane damps the
   sound wave. Clicking a layer in the list highlights it in the model.

Both scenes:

* stop rendering when scrolled out of view or when the tab is hidden,
* cap the pixel ratio at 1.75,
* fall back gracefully when WebGL is unavailable (the page stays complete,
  only the canvas is skipped),
* respect `prefers-reduced-motion`.

---

## Structure

```
index.html                  markup + SVG icon sprite
assets/css/style.css        design tokens, layout, animation
assets/js/config.js         ← company data (edit this first)
assets/js/i18n.js           ← all texts, 4 languages
assets/js/app.js            i18n engine, nav, reveal, form, JSON-LD
assets/js/glass3d.js        the two WebGL scenes
assets/vendor/three.module.min.js
assets/img/                 logo, icons, gallery
robots.txt, sitemap.xml
```

---

## Hosting on GitHub Pages

The repository root *is* the site, so Pages can serve it directly with no
build step and no workflow:

**Settings → Pages → Source: "Deploy from a branch" → Branch `main`, folder
`/ (root)` → Save.**

After a minute the site is live at
`https://kastriottafolli.github.io/Tafolli-KS/`. Every push to `main`
republishes it.

`.nojekyll` tells GitHub to serve the files as they are instead of running
them through Jekyll.

### Adding the custom domain later

Type the domain into the same Settings → Pages screen — GitHub commits the
`CNAME` file for you. Then, at the registrar of the domain, add:

| Type | Name | Value |
|---|---|---|
| `CNAME` | `www` | `kastriottafolli.github.io` |

For the bare domain as well, add four `A` records on `@` pointing at
`185.199.108.153`, `185.199.109.153`, `185.199.110.153` and
`185.199.111.153`.

Until DNS resolves, the `*.github.io` URL redirects to the custom domain and
will look broken — so only set the domain once the records are in place. Then
tick **Enforce HTTPS**.

---

## Hosting on DreamHost

The repository root is the site. Two files support an Apache host:

* `.htaccess` — forces `https://` and the `www` host (matching the canonical
  URL), gzips the text assets, and sets cache headers. The vendored three.js
  file is ~670 KB raw and about 170 KB gzipped, so the compression block is the
  biggest single win on first load.
* `deploy-dreamhost.sh` — one `rsync` over SSH. Fill in the shell user, the
  server hostname and the web directory at the top, then run it after each
  change.

Steps the first time:

1. In the DreamHost panel, add the domain under **Websites → Add Website**
   (fully hosted), which creates the web directory.
2. Point the domain's nameservers (or its `A` record) at DreamHost.
3. Turn on the free Let's Encrypt certificate for the domain.
4. Run `./deploy-dreamhost.sh`, or upload the files through the panel's file
   manager.

To serve the bare domain instead of `www`, swap the two redirect rules in
`.htaccess` and change `<link rel="canonical">` and `og:url` in `index.html`
to match.

---

## The contact form

The site is static, so there is no server to receive a form post. The form
builds a message and offers two ways to send it:

* **Dërgo kërkesën** opens the visitor's mail client addressed to `SITE.email`.
* **Shkruaj në WhatsApp** opens WhatsApp with the same message prefilled.

If you would rather receive submissions by HTTP, point the form at a service
such as Formspree or Web3Forms: give `<form id="quoteForm">` an `action` and
`method="POST"` and remove the `e.preventDefault()` in `initForm()` in
`assets/js/app.js`.

---

## Before going live

- [ ] Confirm the phone numbers and opening hours.
- [ ] Check the warranty wording in the texts matches what the company offers.
- [ ] Replace the indicative Ug / Rw / g values with supplier figures.
- [ ] Add the Instagram link in `config.js` if there is one.
