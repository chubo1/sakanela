# Sakanela

Static multi-page site for a spatial design studio. **Vite**, **SCSS (7-1)**, and **Vanilla JS** (ES modules). No UI framework.

## Pages

| File           | Route                                          |
| -------------- | ---------------------------------------------- |
| `index.html`   | Home                                           |
| `about.html`   | About                                          |
| `contact.html` | Contact (client-side validation + submit stub) |

Header and footer markup is duplicated **byte-for-byte** across pages so it can be extracted into includes later. Active nav state is applied in JS from `location.pathname`.

## Scripts

```bash
npm install
npm run dev       # Vite dev server, HMR
npm run build     # production build → dist/
npm run preview   # serve dist/
npm run lint      # ESLint (airbnb-base)
npm run format    # Prettier
```

Requires Node 18.18+.

## Architecture

### Styles — 7-1

`src/styles/main.scss` is the only stylesheet entry. It `@use`s:

- `abstracts/` — tokens, `rem()`, `color()`, `fluid-type()`, `respond-to()`
- `base/` — reset, type, shared `@keyframes`
- `layout/` — container, header, footer
- `components/` — button, card, nav, form, modal
- `pages/` — home / about / contact
- `themes/` — `prefers-color-scheme: dark` token overrides
- `vendors/` — third-party CSS hooks (empty on purpose)

Sass modules (`@use` / `@forward`) only. Abstracts are forwarded from `abstracts/_index.scss`; partials that need tokens import `@use '../abstracts' as *`.

### Scripts

- `src/scripts/main.js` — global entry: SCSS, navigation, native parallax, reveal-on-scroll
- `src/scripts/pages/*.js` — imported **only** from the matching HTML file
- `src/scripts/core/` — `$` / `$$`, debounce / throttle / `on()`, IntersectionObserver factory
- `src/data/content.js` — site config, form endpoint, validation copy

### Parallax

Native only: `transform` + `requestAnimationFrame` + IntersectionObserver. Mark a layer with `data-parallax` and optional `data-parallax-speed`. No GSAP / simple-parallax-js — add one later in `vendors/` if layered scenes outgrow this.

Reveal-on-scroll uses `data-animate` (and optional `data-animate-delay="1|2|3"`). Both features no-op under `prefers-reduced-motion`.

### Contact form

`src/scripts/modules/formValidation.js` reads `data-validate` rules (`required`, `email`, `min:n`), shows inline errors, then calls `submitToEndpoint()`.

Set `site.formEndpoint` in `src/data/content.js` to a real URL when a backend exists. An empty string keeps the success stub (and the thank-you modal).

## Assets

- `public/` — copied as-is (`favicon.svg`, OG image)
- `src/assets/images/` — hashed by Vite when referenced from HTML/CSS/JS
- `src/assets/icons/` — raw SVGs for inline/`<use>`
- `src/assets/fonts/` — drop `.woff2` files here and register `@font-face` in `_typography.scss`

## Tooling

- Vite MPA via `build.rollupOptions.input`
- Dart Sass (`sass`, not `node-sass`)
- ESLint 8 + `eslint-config-airbnb-base` + Prettier (`.eslintrc.cjs`)
- `.editorconfig`

## Extracting header / footer later

When you add HTML includes (Vite plugin, SSI, or a tiny build step), copy the shared blocks from any page — they are identical. Keep `data-header`, `data-nav`, `data-nav-toggle`, and `data-nav-link` so `navigation.js` keeps working.
