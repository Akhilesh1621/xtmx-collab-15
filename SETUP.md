# XTMX COLLAB 15 — Setup Guide

This is a static HTML schedule with a Google Sheet as the database and Microsoft sign-in plus an edit password for editing. Public viewers see live data; only allow-listed accounts with the password can edit.

**Stack**

- **GitHub Pages** — serves the HTML (free, public viewer URL)
- **Google Sheet + Apps Script Web App** — read/write API for the schedule
- **Microsoft Entra ID + MSAL.js** — popup sign-in for editors
- **Allow-list of emails + edit password** in Apps Script — gates write access

Two files in this folder:

- `xtmx-collab-15-schedule.html` — the page
- `Code.gs` — the Apps Script backend

You'll do four things, in this order: **Sheet → Azure → GitHub → wire up CONFIG**. Plan ~30 minutes for first-time setup.

---

## Part 1 — Google Sheet + Apps Script (the database)

1. Go to <https://sheets.new> to create a new Google Sheet. Name it something like **"XTMX COLLAB Schedule"**.
2. **Extensions → Apps Script**. A new tab opens.
3. Delete the placeholder `function myFunction() { ... }` content.
4. Open `Code.gs` from this folder, copy the entire file, paste it into the Apps Script editor.
5. Near the top, find `ALLOWED_EMAILS` and replace the placeholder with **your real Microsoft work email** (and any teammates who should edit). Case doesn't matter.
   ```js
   const ALLOWED_EMAILS = [
     'akhilesh@xtransmatrix.com',
     'someone.else@xtransmatrix.com'
   ];
   ```
6. Add the private edit password:
    - Apps Script left sidebar → **Project Settings**
    - Under **Script properties**, click **Add script property**
    - Property: `EDIT_PASSWORD`
    - Value: your private edit password
    - Click **Save script properties**
7. Save (**Ctrl+S** / **⌘S**). When prompted, give the project a name like "XTMX Schedule API."
8. **Seed the sheet:** in the function dropdown (top toolbar), pick `setupSheet` → click **Run**. Google will ask for permissions — review and **Allow**. After a few seconds your Sheet will have a **Schedule** tab with all 8 days of COLLAB 15 prefilled.
9. **Deploy as Web App:** click **Deploy → New deployment**.
    - Click the gear icon → **Web app**
    - Description: `v1`
    - **Execute as:** *Me*
    - **Who has access:** *Anyone*
    - Click **Deploy**, then **Authorize access** if prompted, choose your account, and proceed past the "unverified" warning (this is your own script).
    - Copy the **Web app URL** that ends with `/exec`. This is your `GAS_URL`. Save it somewhere.

> ⚠️ Every time you change `Code.gs`, you must **Deploy → Manage deployments → Edit → New version → Deploy** to publish the change. The URL stays the same.

---

## Part 2 — Microsoft Entra ID (Azure AD) app registration

This is what makes the "Sign in with Microsoft" popup work.

1. Go to <https://portal.azure.com> and sign in with the Microsoft account that owns the directory (your xTransMatrix work account if your org uses Microsoft 365).
2. Search the top bar for **Microsoft Entra ID** (formerly Azure Active Directory) → open it.
3. Left menu → **App registrations** → **New registration**.
4. Fill in:
    - **Name:** `XTMX Schedule`
    - **Supported account types:** *Accounts in this organizational directory only* (single tenant) — best for an internal team. Pick *multitenant* only if external Microsoft accounts also need to edit.
    - **Redirect URI:** select **Single-page application (SPA)** from the dropdown, and enter the GitHub Pages URL you'll use — e.g.
      ```
      https://<your-github-username>.github.io/<repo-name>/
      ```
      You can come back and update this once you have the actual URL. For testing locally you can also add `http://localhost:8000/`.
5. Click **Register**.
6. On the overview page, copy:
    - **Application (client) ID** → this is your `MSAL_CLIENT_ID`
    - **Directory (tenant) ID** → this is your `MSAL_TENANT` (paste the GUID for single-tenant, or leave `'common'` for multitenant)
7. Left menu → **API permissions**. The default `User.Read` (Microsoft Graph, delegated) is already there — that's all the app needs. No admin consent required.

---

## Part 3 — GitHub Pages (hosting)

1. Create a new GitHub repo (e.g. `xtmx-collab-15`). Set it to **Public** (Pages requires this unless you have a paid plan).
2. Open `xtmx-collab-15-schedule.html` in any editor. Near the top of the `<script>` block you'll find:
    ```js
    const CONFIG = {
      GAS_URL: '',
      MSAL_CLIENT_ID: '',
      MSAL_TENANT: 'common',
      ENV_LABEL: ''
    };
    ```
    Fill these in with the values from Parts 1 & 2:
    ```js
    const CONFIG = {
      GAS_URL: 'https://script.google.com/macros/s/AKfyc.../exec',
      MSAL_CLIENT_ID: '1234abcd-...-...',
      MSAL_TENANT: 'your-tenant-id-or-common',
      ENV_LABEL: 'Production'
    };
    ```
3. **Rename the file to `index.html`** so GitHub Pages serves it at the repo root by default.
4. Upload `index.html` to the repo (via the GitHub web UI: **Add file → Upload files → drag the file → Commit**).
5. **Enable Pages:** repo **Settings → Pages**. Under "Source," select **Deploy from a branch → main → / (root)** → **Save**.
6. Wait ~1–2 minutes. Your URL appears at the top of the Pages settings, like:
    ```
    https://<your-username>.github.io/xtmx-collab-15/
    ```
7. **Back to Azure** → your app registration → **Authentication** → confirm the Redirect URI matches this exact URL (with the trailing slash). Update if needed and save.

---

## Part 4 — Test the full loop

1. Open the GitHub Pages URL.
2. You should see the schedule with a yellow info banner only if `CONFIG` is still empty. If everything's wired, the banner should be gone and the schedule loads from your Sheet.
3. Click **"Sign in to edit"** → Microsoft popup → choose your work account.
4. After sign-in you should see your name + **Password required** badge. Click **Edit schedule**, then enter the edit password.
5. After the password is accepted you should see your name + **Editor** badge.
6. Edit a time, topic, or host name → click outside the field → you'll see **"Saving…"** then **"Saved to Sheet"**.
7. Open the Google Sheet directly — you should see the change.
8. Open the URL in an Incognito window — you should see the change (read-only, no sign-in option needed).
9. **Audit log:** the Sheet auto-creates an `Audit` tab tracking every edit (who, when, what changed).

---

## How to update later

- **Change topics / hosts / times:** sign in on the live URL and edit inline. Or edit the Google Sheet directly — both work.
- **Add or remove a day, or change a day's metadata (gif/date/etc):** edit the Sheet directly. The page picks up the new shape on next load.
- **Add a new editor:** Apps Script editor → update `ALLOWED_EMAILS` → **Deploy → Manage deployments → Edit → New version → Deploy**.
- **Change the edit password:** Apps Script → Project Settings → Script properties → update `EDIT_PASSWORD`. No HTML change is needed.
- **Code changes (HTML/CSS/JS):** push the new `index.html` to GitHub. Pages redeploys automatically in ~60 seconds.

---

## Troubleshooting

**"Showing cached data" banner doesn't go away**
The page can't reach the Apps Script. Confirm `GAS_URL` ends with `/exec`. Open it in a new tab — you should see JSON like `{"ok":true,"days":[...]}`. If you see a Google login page instead, the deployment isn't public — redeploy with *Who has access: Anyone*.

**Sign-in popup says "AADSTS50011: redirect URI does not match"**
The URL in the browser doesn't match what's registered in Azure. Copy the URL exactly (including trailing slash) into Azure → Authentication → Redirect URIs.

**Signed in but "Not authorized to edit"**
The email Microsoft returns isn't in `ALLOWED_EMAILS`. Check the email in the warning banner, add it to the list in `Code.gs`, redeploy.

**Signed in but "Wrong password"**
Update or confirm the `EDIT_PASSWORD` value in Apps Script → Project Settings → Script properties.

**Edits don't appear for other people**
They need to hit **Refresh** on the page (the button on the right) — the page caches data per-session. Alternatively, ask them to reload the tab.

**Apps Script "Authorization required" error**
You're running `setupSheet` for the first time. Click *Review permissions* → choose your account → *Advanced* → *Go to (project name) (unsafe)* → *Allow*. (This is a one-time prompt because the script isn't published to Google.)
