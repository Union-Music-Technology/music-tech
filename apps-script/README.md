# Music Tech Members portal (Google Apps Script)

The members-only part of the site: TARDIS rules, reservations on the TARDIS Google Calendars, problem reports, the equipment inventory, work-study hours and check-ins, announcements, and access management.

It runs as a Google Apps Script web app inside Union's Google Workspace. Google handles sign-in, and a Google Sheet holds every list, including who has access.

## How the security works

| Layer | What protects it |
|---|---|
| Sign-in | The web app is deployed with **Who has access: Anyone within Union College**. Google requires a Union login before any code runs. No passwords are stored anywhere. |
| Roles | The **Access** tab maps each email to `user`, `workstudy`, or `admin`. Every server call re-checks the role (`Auth.gs`); the browser only decides what to display. The owner email in `Config.gs` is always admin. |
| Data | The spreadsheet is **not shared with anyone**. The script runs as the owner ("Execute as: Me"), so people can only do what the portal's functions allow. Students never get edit access to the sheet: anyone who can edit a bound sheet can edit its script. |
| Input | Every field is type-checked, length-capped, and limited to known values (`Data.gs`). Text starting with `= + - @` gets an apostrophe so Sheets can't run it as a formula. |
| Output | The page builds everything with `textContent`, never `innerHTML`, so text from the sheet can't inject code. It can't be embedded in other sites (clickjacking). |
| Abuse | One server entry point (`api`) with an allow-list of actions, a script lock for writes, and a per-account rate limit. |
| Accountability | Every change is written to the **Audit** tab with who, when, and what. |
| Revocation | Untick **Active**, or set **expires**. Access ends within a minute. |

**This folder is public on GitHub.** Never put passwords, door codes, student names, or schedules in these files. Keep them in Drive docs and link them from the **Links** tab with audience `workstudy`.

## Roles

| | user | workstudy | admin |
|---|:-:|:-:|:-:|
| Read rules, announcements, links | ✓ | ✓ | ✓ |
| Reserve TARDIS (needs `tardis` in **spaces**) | ✓ | ✓ | ✓ |
| Report a problem, see their own reports | ✓ | ✓ | ✓ |
| View confirmed equipment | ✓ | ✓ | ✓ |
| Edit equipment, see unconfirmed items | | ✓ | ✓ |
| Approve or decline bookings, update problems | | ✓ | ✓ |
| Log hours and weekly check-ins, see the handbook and team | | ✓ | ✓ |
| Post announcements | | ✓ | ✓ (and pin) |
| Delete equipment, see everyone's hours | | | ✓ |
| Manage access, see the activity log | | | ✓ |

Work-study students and admins aren't held to the weekly booking cap.

## Setup (about 15 minutes, signed in as chandlec@union.edu)

1. **Create the sheet.** In Google Drive (the Union account), create a spreadsheet named *Music Tech Portal*. Don't share it.
2. **Add the code.** In the sheet, open **Extensions › Apps Script**. For each file in this folder, make a file with the same name and paste in its contents: script files (`.gs`) with **+ › Script**, HTML files with **+ › HTML** (leave off the `.html`). Open **Project Settings**, tick **Show "appsscript.json"**, and replace that file's contents with `appsscript.json`.
3. **Run setup.** Reload the sheet. A **Music Tech** menu appears. Choose **Set up or repair tabs** and approve the permissions prompt. This creates every tab.
4. **Fill in Settings.** In the **Settings** tab, paste the two TARDIS calendar ids (Google Calendar › the calendar's settings › *Integrate calendar* › Calendar ID), and leave `reservations_mode` at `request` to start.
5. **Import equipment (optional).** Once the public site is live, choose **Music Tech › Import equipment from the public site** to copy `data/site.json` into the **Equipment** tab.
6. **Deploy.** In Apps Script choose **Deploy › New deployment › Web app**, with *Execute as:* **Me** and *Who has access:* **Anyone within Union College**. Copy the `/exec` URL.
7. **Share the link directly.** The public site never links to the portal. Send the `/exec` URL to work-study students and approved users (or post it in the TARDIS entry space) and have them bookmark it.
8. **Add people.** In the portal's **Access** tab, or straight in the sheet: one row per person with email, name, role, spaces (`tardis`, or `*` for all), and **Active** ticked.

After code changes, use **Deploy › Manage deployments › Edit › Version: New version** so the URL stays the same.

If step 6 doesn't offer "Anyone within Union College", or the URL shows an access error, Union's Workspace admins may restrict Apps Script web apps. Ask ITS to allow it for your account.

### Optional: live equipment on the public site

The public pages read equipment from `data/site.json` by default. To have them show the portal's inventory as soon as work-study students confirm items:

1. Make a **second** deployment of the same project with *Who has access:* **Anyone**.
2. Put `<that URL>?feed=equipment` in `equipmentFeed` in `data/site.json`.

That deployment only returns confirmed items marked public, with name, category, detail, and quantity: no notes, locations, or people. Anyone who opens its URL without `?feed=` sees the "no access" page, because sign-in roles are still checked.

## Reservations

- `request` mode: each booking waits in the **Queue** for a work-study student or admin to approve. Approving creates the calendar event and invites the requester.
- `auto` mode: sessions within the rules are booked immediately. Sessions with more musicians than `supervision_threshold` still go to the queue.
- `off`: the Reserve tab explains that portal booking is off.

Every request is checked against open hours, the 4-hour weekly cap, booking length, notice, how far ahead it is, and conflicts with both the calendar and other pending requests.

## Files

| File | Purpose |
|---|---|
| `Config.gs` | Owner, spaces, calendars, tab layouts, default settings |
| `Auth.gs` | Who is signed in, roles, rate limiting |
| `Data.gs` | Sheet reads and writes, validation, locking, audit log |
| `Api.gs` | The `api()` entry point and every action except bookings |
| `Reservations.gs` | Booking rules and Google Calendar |
| `Code.gs` | `doGet`, page templates, public equipment feed |
| `Setup.gs` | Menu, `setup()`, `seedEquipment()` (owner only) |
| `Index.html`, `App.html`, `Styles.html` | The portal page |
| `Rules.html`, `Handbook.html` | TARDIS policies and work-study procedures |
| `Denied.html` | Shown to anyone not on the access list |
