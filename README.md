# XTMX COLLAB 15 — Training Schedule

Animated pre-induction training timetable for xTransMatrix COLLAB 15, hosted on GitHub Pages.

## Access Model

- Anyone with the URL can view the schedule.
- Editing is unlocked with a private editor password.
- The password is not stored in the public HTML.
- Google Apps Script checks the password before writing changes to Google Sheets.

## Files

- `index.html` — live GitHub Pages page
- `xtmx-collab-15-schedule.html` — original named copy of the same page
- `Code.gs` — Google Apps Script backend
- `SETUP.md` — setup instructions

## Stack

- GitHub Pages for hosting
- Single-file HTML/CSS/JS frontend
- Google Sheets as the schedule database
- Google Apps Script as the read/write API
- Apps Script script property `EDIT_PASSWORD` for edit protection

## Live URL

[https://akhilesh1621.github.io/xtmx-collab-15/](https://akhilesh1621.github.io/xtmx-collab-15/)

## Editing Flow

1. Open the live URL.
2. Click **Editor login**.
3. Enter the edit password.
4. Click **Edit schedule**.
5. Edit a time, topic, or host.
6. Changes save to Google Sheets when `GAS_URL` is configured.

## Backend Setup

In Apps Script:

1. Paste `Code.gs`.
2. Set script property `EDIT_PASSWORD` to the private editor password.
3. Run `setupSheet`.
4. Deploy as a Web App with access set to **Anyone**.
5. Put the `/exec` URL into `CONFIG.GAS_URL` in `index.html`.

See `SETUP.md` for the full setup flow.
