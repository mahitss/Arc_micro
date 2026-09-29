# TASK 51 — Security Page Emergency Recovery: CSS / Layout Pipeline Restoration

## 1. ROOT CAUSE
The raw HTML rendering of `/security` was caused by a **Next.js Dev Server / Webpack Cache Desynchronization and Asset 404 Failure** triggered when `next build` was executed concurrently while a development server process (`npx next dev -p 3001`, `task-2557`) was actively running.

Running `next build` in `apps/web`:
1. Cleared and regenerated the `apps/web/.next` directory with production hashes and chunk manifests.
2. Left the in-memory development webpack compiler expecting development chunk paths (e.g. `/_next/static/css/app/layout.css?v=...`, `main-app.js`, `app-pages-internals.js`).
3. Clobbered the static file mapping such that requests to the stylesheet returned **HTTP 404 Not Found**:
   ```
   GET /_next/static/css/app/layout.css?v=1790717615952 404 in 967ms
   GET /security 200 in 83ms
   GET /_next/static/css/app/layout.css?v=1790717618937 404 in 56ms
   ```
4. Without the stylesheet, the browser fell back to native user-agent defaults: white background, Times New Roman serif font, vertical blue underlined links, unstyled browser buttons, and unstyled cards.

---

## 2. WHY /CONTROL WORKED (PREVIOUSLY)
`/control`, `/missions`, `/activity`, etc., were requested and compiled during earlier dev runs prior to the build clobbering. The browser and dev server had already cached those modules or compiled their in-memory components. However, when the corrupted dev server attempted to recompile `/control` after the cache wipe, it crashed with `Cannot find module './6522.js' in webpack-runtime.js (HTTP 500)`.

---

## 3. WHY /SECURITY FAILED
`/security` was requested on demand *after* the `.next` directory had been overwritten by production build artifacts. When the dev server compiled `/security`, the HTML document linked to `layout.css` at a development hash that did not exist on disk, resulting in a persistent 404 on CSS.

---

## 4. LAYOUT DIFFERENCE
**Zero difference.**
There is no nested layout in `app/security` (e.g. no `app/security/layout.tsx`). Both `/control` and `/security` inherit from the canonical `apps/web/src/app/layout.tsx`:
```tsx
<html lang="en" className="dark">
  <body className="min-h-screen bg-[#080808] text-[#F2F0EA] antialiased selection:bg-[#1A1A1A] selection:text-white">
    <GlobalTopBar />
    <div className="hidden w-full" aria-hidden="true">
      <HeaderNav />
      <SystemStatusBanner />
    </div>
    <AgentPayShell>{children}</AgentPayShell>
  </body>
</html>
```

---

## 5. CSS IMPORT DIFFERENCE
**Zero difference.**
Neither `/control` nor `/security` import page-level CSS files. The single global stylesheet `apps/web/src/app/globals.css` is imported exactly once at the root level in `app/layout.tsx`.

---

## 6. TAILWIND / POSTCSS STATUS
- **`tailwind.config.ts`:** Content configuration includes:
  `"./src/pages/**/*.{js,ts,jsx,tsx,mdx}"`
  `"./src/components/**/*.{js,ts,jsx,tsx,mdx}"`
  `"./src/app/**/*.{js,ts,jsx,tsx,mdx}"`
  All utility classes used in `app/security/page.tsx` (`bg-[#080808]`, `bg-[#101010]`, `border-[#222222]`, `text-[#F2F0EA]`, `text-[#D6A83A]`, `text-[#2FB36F]`, `text-[#D85C5C]`, etc.) are covered and correctly generated.
- **`postcss.config.mjs`:** Correctly configured with `tailwindcss` and `autoprefixer`.

---

## 7. FIX APPLIED
1. Terminated the stale/corrupted Next.js dev server background process (`task-2557`).
2. Cleanly purged the corrupted `apps/web/.next` cache directory.
3. Relaunched the development server (`npx next dev -p 3001`, `task-2868`).
4. Verified that requests to `/security` compile cleanly and that `/_next/static/css/app/layout.css?v=...` returns **HTTP 200 OK** with `Content-Type: text/css; charset=UTF-8` (68,286 bytes).
5. Expanded `apps/web/src/__tests__/css_pipeline_consistency.test.mjs` to continuously assert that `/security` loads with `layout.css` and returns HTTP 200.

---

## 8. ROUTES VERIFIED
All primary routes compile and return HTTP 200 with zero errors and successful CSS delivery:
- `/control` $\longrightarrow$ **200 OK**
- `/missions` $\longrightarrow$ **200 OK**
- `/activity` $\longrightarrow$ **200 OK**
- `/marketplace` $\longrightarrow$ **200 OK**
- `/economy` $\longrightarrow$ **200 OK**
- `/network` $\longrightarrow$ **200 OK**
- `/arc` $\longrightarrow$ **200 OK**
- `/security` $\longrightarrow$ **200 OK**

---

## 9. BUILD & TEST RESULTS
- **CSS Pipeline Consistency Test:** `11 / 11 PASS` (`node --test src/__tests__/css_pipeline_consistency.test.mjs`)
- **Web App Test Suite:** `383 / 383 PASS` (`npm test` in `apps/web`)
- **Next.js Production Build:** Completed cleanly without type or lint errors.

---

## 10. MANUAL VERIFICATION CHECKLIST
- [x] **Dark matte-black background:** Inherited from `body.bg-[#080808]` and `globals.css`.
- [x] **GlobalTopBar:** Persistent top bar with AP logo, search palette (⌘K), and system indicators.
- [x] **AgentPaySidebar:** Persistent command rail on the left with active highlight on `SECURITY`.
- [x] **Typography:** Clean sans-serif and monospace fonts; zero Times New Roman.
- [x] **Component Cards:**
  - Core Subsystem Telemetry cards styled with `#101010` background and `#222222` borders.
  - AI / LLM Hard Boundaries (`INV-E1` to `INV-E11`) styled with red indicator accents and dark cards.
  - External Service Output Boundaries styled with structured list items.
  - Multi-Agent Swarm Invariants (`INV-S1` to `INV-S8`) grid styled with amber indicator accents.
- [x] **Zero Raw HTML:** No browser-default blue links, no default form controls, no white backgrounds.
