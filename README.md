# XTMX COLLAB 15 — Training Schedule

> Animated, live-editable pre-induction training timetable for xTransMatrix COLLAB 15 (Jun 29 – Jul 10, 2026).  
> Built as a **single-file static web app** hosted on GitHub Pages, backed by **Google Sheets** as a database, and gated by **Microsoft Entra ID** for editor access.

---

## What it is

A fully animated training schedule for the XTMX COLLAB 15 pre-induction programme. It covers **9 working days across two weeks**, with every session, break, host, and knowledge check laid out on a day-by-day interactive timeline.

Anyone with the URL can view it. Only people on the editor allow-list can sign in and edit it inline — changes write directly to a Google Sheet and are visible to all viewers on next refresh.

---

## Live features

| Feature | Detail |
|---|---|
| 📅 **9-day timetable** | Jun 29 – Jul 10, 2026, Mon–Fri across 2 weeks |
| 🎞 **Animated GIF banners** | One unique Giphy per day, fade-in on tab switch |
| 🌙☀️ **Light / Dark mode** | Toggle button (bottom-right), persists in `localStorage`, respects system preference on first load |
| ✏️ **Inline editing** | Click any time, topic, or host to edit when signed in as an editor |
| 💾 **Google Sheets backend** | All edits write to a live Google Sheet; public viewers see live data on refresh |
| 🔐 **Microsoft sign-in** | MSAL.js popup — editors sign in with their Microsoft work account |
| 👥 **Editor allow-list** | Only emails in `ALLOWED_EMAILS` (Apps Script) can write; everyone else is read-only |
| 📋 **Audit log** | Every edit is logged (who, when, what) to a separate `Audit` tab in the Sheet |
| 📱 **Mobile responsive** | Three-tier layout: desktop / tablet (≤768px) / mobile (≤560px) |
| 🏷 **Category colour coding** | Session · Milestone · Knowledge Check · Lunch · Break — each with distinct colour, node, and tag |

---

## Project files

```
xtmx-collab-15-schedule.html   ← rename to index.html → push to GitHub Pages
Code.gs                        ← paste into Google Apps Script editor
SETUP.md                       ← step-by-step wiring guide (Google → Azure → GitHub)
README.md                      ← this file
```

---

## Tech stack

```
Frontend        Single-file HTML/CSS/JS (no framework, no build step)
Fonts           Space Grotesk · Inter · JetBrains Mono (Google Fonts)
Auth            MSAL.js 3.10 (Microsoft Authentication Library) via CDN
Backend         Google Apps Script Web App (deployed as public HTTPS endpoint)
Database        Google Sheets (two tabs: Schedule · Audit)
Hosting         GitHub Pages (static, free)
```

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│               GitHub Pages (static)                  │
│                  index.html                          │
│                                                      │
│  ┌──────────────┐      ┌────────────────────────┐   │
│  │  Public view │      │  Editor flow           │   │
│  │  (no login)  │      │  1. Click "Sign in"    │   │
│  │              │      │  2. MS popup (MSAL)    │   │
│  │  Fetches     │      │  3. Token sent to GAS  │   │
│  │  schedule    │      │  4. GAS verifies via   │   │
│  │  from Sheet  │      │     Microsoft Graph    │   │
│  │  on load     │      │  5. Email checked vs   │   │
│  └──────┬───────┘      │     ALLOWED_EMAILS     │   │
│         │              │  6. Write unlocked     │   │
└─────────┼──────────────┼────────────────────────┘   
          │              │                             
          ▼              ▼                             
┌─────────────────────────────────────────────────────┐
│         Google Apps Script Web App (/exec)           │
│                                                      │
│  GET  ?action=load          → return all schedule    │
│  GET  ?action=whoami&token  → verify MS token        │
│  POST {action:update,...}   → write one cell         │
└─────────────────────────┬───────────────────────────┘
                          │
                          ▼
          ┌───────────────────────────┐
          │       Google Sheet        │
          │                           │
          │  Tab: Schedule            │
          │  Tab: Audit               │
          └───────────────────────────┘
```

---

## Schedule overview

| Day | Date | Day of week | Theme |
|-----|------|-------------|-------|
| 1 | Jun 29 | Monday | Onboarding · HR · XTMX Intro |
| 2 | Jun 30 | Tuesday | Listening · HIPAA Basics · Platform · Security |
| 3 | Jul 1 | Wednesday | Team Building · Engagement · Operations |
| 4 | Jul 2 | Thursday | Time Mgmt · HIPAA Part 1 · Final Test Part 1 |
| 5 | Jul 3 | Friday | Quality · Annotation · KRAs · Week 1 Wrap |
| — | Jul 4–6 | Sat–Mon | *(buffer / weekend)* |
| 6 | Jul 7 | Tuesday | US Health Insurance · Infinitus Intro |
| 7 | Jul 8 | Wednesday | Health Insurance Access · HIPAA Violations · Behaviour |
| 8 | Jul 9 | Thursday | Escalations · Feedback · Stress Mgmt · Knowsy Contest |
| 9 | Jul 10 | Friday | Live Shadowing · Final Cert Test · **Graduation** 🎓 |

---

## Session categories

| Colour | Category | Used for |
|--------|----------|---------|
| 🟣 Indigo | Session | Core training content |
| 🟦 Teal | Milestone | Team events, fun activities, graduation |
| 🟡 Amber | Lunch | Meal breaks |
| 🟪 Purple | Check | Tests, knowledge checks, jeopardy |
| ⬛ Slate | Break | Short rest breaks |

---

## Code walkthrough

### `xtmx-collab-15-schedule.html`

The entire frontend is one self-contained file (~149 KB including the embedded logo and fallback schedule data).

**Structure:**

```
<head>
  CSS variables (dark + light theme)
  Typography (Space Grotesk / Inter / JetBrains Mono)
  MSAL.js CDN script

<body>
  .ambient          ← animated gradient blobs (background depth)
  header            ← brand lockup, title, meta chips, control bar
  nav.nav           ← sticky day tabs + progress bar
  section#panel     ← rendered day schedule (changes on tab click)
  footer            ← legend + branding
  button.theme-btn  ← fixed bottom-right light/dark toggle

<script>
  ORIGINAL_DAYS[]   ← embedded fallback schedule (9 days)
  CONFIG{}          ← GAS_URL, MSAL_CLIENT_ID, MSAL_TENANT, ENV_LABEL
  DAYS[]            ← working copy (hydrated from Sheet on load)
  
  ── helpers ──────────────────────
  to24(t)           time string → minutes since midnight
  dur(s,e)          compute human duration ("1h 15m")
  initials(name)    "Anupam / Banish" → "AB"
  spanLabel(d)      "8 sessions · 10:00 AM – 4:45 PM"
  
  ── render ───────────────────────
  render(d, di)     build timeline HTML for one day
                    each time/topic/host wrapped in .editable span
  select(i)         switch active day tab + re-render
  
  ── Google Sheets API ────────────
  fetchSchedule()   GET /exec?action=load → hydrate DAYS[]
  saveEdit(di,ri,f,v)  POST update → write one cell to Sheet
  
  ── Microsoft auth (MSAL) ────────
  initMsal()        create PublicClientApplication
  signIn()          loginPopup → get account
  signOut()         logoutPopup → clear state
  getToken()        acquireTokenSilent (falls back to popup)
  refreshAuthState()  verify token via GAS whoami → set isAuthorized
  updateAuthUI()    show/hide editBtn, userPill, signInBtn
  
  ── editor ───────────────────────
  applyEditMode()   toggle contentEditable on all .editable spans
  panel.input       debounced save (700ms) on every keystroke
  panel.keydown     Enter → blur (commit edit)
  
  ── theme ────────────────────────
  applyTheme(t)     body.classList toggle 'light', save to localStorage
  themeBtn.click    toggle dark ↔ light
  
  ── boot ─────────────────────────
  boot()            render fallback → fetchSchedule → initMsal → updateUI
```

**CSS design tokens (dark / light):**

```css
/* Dark (default) */
--canvas:    #0D1320    /* page background */
--surface:   #151E30    /* card background */
--surface-2: #1B2740    /* hover / skeleton */
--line:      #2A3650    /* borders */
--ink:       #EAEEF7    /* primary text */
--ink-mid:   #A9B4CC    /* secondary text */
--ink-dim:   #717E9C    /* muted text */
--brand-1:   #FF9A52    /* coral accent */
--brand-2:   #FFC074    /* warm gold */

/* Light (body.light) */
--canvas:    #F4F6FB
--surface:   #FFFFFF
--ink:       #1A2035
--brand-1:   #E07A2F
```

---

### `Code.gs` (Google Apps Script)

Deployed as a public HTTPS Web App. Acts as a serverless API between the HTML and the Google Sheet.

**Functions:**

| Function | Type | Description |
|----------|------|-------------|
| `doGet(e)` | Entry | Routes `load` and `whoami` GET requests |
| `doPost(e)` | Entry | Routes `update` POST requests |
| `verifyToken_(token)` | Auth | Calls Microsoft Graph `/v1.0/me` with bearer token; returns user object or null |
| `userEmail_(user)` | Auth | Extracts `mail` or `userPrincipalName` from Graph response |
| `isAllowed_(user)` | Auth | Checks email against `ALLOWED_EMAILS` array |
| `handleWhoami_(token)` | Handler | Verify token + return `{authorized, email, name}` |
| `loadDays()` | Read | Reads all Sheet rows → returns structured days array |
| `handleUpdate_(body)` | Write | Verify token → find row → write cell → audit |
| `audit_(user,...)` | Log | Appends row to `Audit` tab |
| `jsonOut(obj)` | Util | Wraps object as JSON `ContentService` response |
| `setupSheet()` | Setup | One-time: creates + seeds `Schedule` tab with all 9 days |

**Sheet schema (`Schedule` tab):**

```
day_n | day_name | date | gif | join | flag | idx | start | end | topic | host | category | description
```

- `day_n` — day number (1–9)
- `idx` — row index within the day (0-based), used to identify which cell to update
- `category` — `session | milestone | lunch | break | check`

**Security model:**

```
Public (no auth)  → GET ?action=load       → read-only JSON of schedule
Signed in, not on list → GET ?action=whoami → {authorized: false}
Signed in, on list    → GET ?action=whoami → {authorized: true}
                       → POST action=update  → writes to Sheet + audit log
```

Every write verifies the Microsoft token live against Graph — no session state, no cookies, no secret stored in the HTML.

---

## Quick-start (after cloning)

### Step 1 — Google Sheet

1. `sheets.new` → name it **XTMX COLLAB Schedule**
2. **Extensions → Apps Script** → paste `Code.gs`
3. Set your email in `ALLOWED_EMAILS`
4. Run `setupSheet()` (first time, approve permissions)
5. **Deploy → New deployment → Web app → Execute as Me → Anyone → Deploy**
6. Copy the `/exec` URL → this is `GAS_URL`

### Step 2 — Azure Entra ID

1. `portal.azure.com` → **Microsoft Entra ID → App registrations → New registration**
2. Name: `XTMX Schedule` · Type: Single-page application (SPA)
3. Redirect URI: `https://<you>.github.io/<repo>/`
4. Copy **Application (client) ID** → `MSAL_CLIENT_ID`
5. Copy **Directory (tenant) ID** → `MSAL_TENANT`

### Step 3 — Wire up & deploy

Open `xtmx-collab-15-schedule.html`, fill in `CONFIG`:

```js
const CONFIG = {
  GAS_URL:       'https://script.google.com/macros/s/AKfy.../exec',
  MSAL_CLIENT_ID:'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
  MSAL_TENANT:   'your-tenant-id',
  ENV_LABEL:     'Production'
};
```

Rename to `index.html` → push to GitHub repo → enable **Settings → Pages → main / root**.

---

## Editing flow (once live)

```
1. Open the GitHub Pages URL
2. Click "Sign in to edit" → Microsoft popup → sign in with work account
3. Account verified → "Editor" badge appears
4. Click "Edit schedule"
5. Click any time, topic, or host → type your change → click away
6. "Saving…" → "Saved to Sheet" pill flashes
7. Anyone who refreshes the page sees the update
```

---

## Updating the schedule data

### Minor edits (times, topics, hosts)
→ Sign in on the live URL → edit inline. Done.

### Structural changes (add sessions, change day dates)
→ Edit the Google Sheet directly (`Schedule` tab). The page re-reads on refresh.

### Add a new editor
→ Apps Script → add email to `ALLOWED_EMAILS` → **Deploy → Manage deployments → New version → Deploy**.

### Full reseed from new Excel
→ Update `setupSheet()` seed data in `Code.gs` → run `setupSheet()` (clears + reseeds Schedule tab, Audit tab untouched).

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Schedule not loading from Sheet | Open `GAS_URL` in browser — should return `{"ok":true,"days":[...]}`. If it shows a login page, re-deploy with *Who has access: Anyone* |
| "Redirect URI mismatch" on sign-in | Copy the exact browser URL (including trailing slash) into Azure → Authentication → Redirect URIs |
| Signed in but "View only" | Email returned by Microsoft not in `ALLOWED_EMAILS`. Copy it from the warning banner, add to `Code.gs`, redeploy |
| Edits not visible to others | They need to click **Refresh** on the page, or reload the tab |
| Apps Script "Authorization required" | First-run prompt — click *Review permissions → Advanced → Go to (unsafe) → Allow* |
| Light/Dark toggle not visible | Check browser isn't blocking `localStorage`. Toggle is fixed bottom-right, orange pill in dark mode |

---

## Browser support

Chrome 90+, Safari 15+, Firefox 90+, Edge 90+. Requires JavaScript enabled.  
MSAL.js requires a proper HTTPS origin for the auth popup — `file://` won't work; use a local server or host it.

---

## Fonts & assets

- **Space Grotesk** — headings (Google Fonts, SIL Open Font License)
- **Inter** — body (Google Fonts, SIL Open Font License)
- **JetBrains Mono** — code/mono labels (Google Fonts, SIL Open Font License)
- **GIFs** — sourced from Giphy (streamed at runtime, not embedded)
- **XTMX logo** — embedded as base64 PNG in the HTML file

---

## Project credits

Built for **xTransMatrix (XTMX)** COLLAB 15 pre-induction onboarding programme.  
Designed and developed by **Akhilesh** (Head of Operations & Chief Design Officer, XTMX / Cydratech).  
Iterated through **Claude (Anthropic)** across multiple sessions.

---

*Last updated: Jun 2026 · COLLAB 15 · Jun 29 – Jul 10, 2026*
