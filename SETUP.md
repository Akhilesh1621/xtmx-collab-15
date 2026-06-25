# XTMX COLLAB 15 — Setup Guide

This is a static GitHub Pages schedule with a Google Sheet backend. Anyone with the URL can view it. Editing is unlocked by a private password and backend writes are rejected without that password.

## Files

- `index.html` — GitHub Pages entry point
- `xtmx-collab-15-schedule.html` — same page kept under the original name
- `Code.gs` — Google Apps Script backend

## Part 1 — Google Sheet + Apps Script

1. Go to <https://sheets.new> and create a new Google Sheet.
2. Open **Extensions → Apps Script**.
3. Replace the default script with the contents of `Code.gs`.
4. Add the private edit password:
   - Apps Script left sidebar → **Project Settings**
   - Under **Script properties**, click **Add script property**
   - Property: `EDIT_PASSWORD`
   - Value: your private editor password
   - Click **Save script properties**
5. Save the Apps Script project.
6. In the function dropdown, choose `setupSheet`, then click **Run** and approve permissions.
7. Deploy the script:
   - **Deploy → New deployment**
   - Type: **Web app**
   - **Execute as:** Me
   - **Who has access:** Anyone
   - Click **Deploy**
8. Copy the Web app URL ending in `/exec`; this is your `GAS_URL`.

Every time you change `Code.gs`, publish it with **Deploy → Manage deployments → Edit → New version → Deploy**.

## Part 2 — Wire The Website

Open `index.html` and set:

```js
const CONFIG = {
  GAS_URL: 'https://script.google.com/macros/s/AKfy.../exec',
  ENV_LABEL: 'Production'
};
```

Push the updated `index.html` to GitHub. GitHub Pages redeploys automatically.

## Editing Flow

1. Open the live GitHub Pages URL.
2. Click **Editor login**.
3. Enter the edit password.
4. Click **Edit schedule**.
5. Edit a time, topic, or host, then click away.
6. The page saves to Google Sheets and records the change in the `Audit` tab.

## Troubleshooting

**Wrong password**
Confirm `EDIT_PASSWORD` in Apps Script → Project Settings → Script properties.

**Changes do not save**
Confirm `GAS_URL` is set in `index.html`, then redeploy GitHub Pages. Also confirm Apps Script was redeployed after updating `Code.gs`.

**Schedule not loading from Sheet**
Open the `GAS_URL` in a browser. It should return JSON. If it shows a Google sign-in page, redeploy the Apps Script Web App with **Who has access: Anyone**.
