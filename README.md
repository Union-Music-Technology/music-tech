# Music Technology at Union College

Public website for Union College's Music Technology program. TARDIS (Technology, Acoustics, Research, Design and Instructional Studio) is the first full page; the program home page is a lighter shell that will grow into the full minor site.

## Structure

```
index.html                  Program home (minor overview, facilities, courses, contact)
tardis/index.html           TARDIS studio page
studio/index.html           Music Technology Studio (Taylor 122)
advanced-studio/index.html  Advanced Studio        (draft, not linked yet)
tech-booth/index.html       Tech Booth             (draft, not linked yet)
emerson/index.html          Emerson Auditorium     (draft, not linked yet)
data/site.json              Which spaces are published, equipment lists, portal link
assets/css/site.css         Shared tokens, header, footer, buttons (Union palette)
assets/css/tardis.css       TARDIS page styles
assets/css/space.css        Styles for the other space pages
assets/js/site.js           Copy-to-clipboard, lightbox, annotated photo
assets/js/site-data.js      Renders the facilities grid and equipment lists
assets/img/                 Web-sized photos (1000px and 2000px)
apps-script/                Members portal (Google Apps Script); see apps-script/README.md
```

Plain HTML and CSS with no build step. To preview locally, run `python3 -m http.server` in this folder and open http://localhost:8000 (the data file doesn't load from `file://`).

## Spaces and equipment: hidden until known

Everything that changes is in `data/site.json`:

- **Publishing a space.** A space shows on the home page only when `"published": true`. Draft pages exist and work, but nothing links to them and they carry `<meta name="robots" content="noindex">`. To publish one, set `published` to `true` and delete that meta tag from its page.
- **Equipment.** Each item has a `space`, `category`, `name`, `detail`, `qty`, and `status`. Only `"status": "confirmed"` items appear. Anything a work-study student hasn't checked in person stays `"unverified"` and hidden. A space page with no confirmed items hides its equipment section entirely.
- **Preview.** Add `?preview` to any URL (for example `/?preview` or `/emerson/?preview`) to see draft spaces and unconfirmed equipment, flagged as such.

The TARDIS page keeps its hand-built equipment layout. Its items are also in `site.json` so they can be imported into the portal inventory.

## Members portal

Private content (rules, reservations, problem reports, inventory editing, work-study hours, access management) lives in a Google Apps Script web app that requires a Union Google login, not on GitHub Pages. Everything in this repository is public, so nothing private goes here. It is deliberately not linked from any public page: share its URL directly with people who need it, and they still have to sign in with a Union account on the access list. Setup and the security model are in [apps-script/README.md](apps-script/README.md).

## Publishing with GitHub Pages

Settings > Pages > Source: Deploy from a branch > `main` / root. The site will be at
`https://union-music-technology.github.io/<repo-name>/`.

## Content sources

- TARDIS Documentation (Google Doc): purpose, rooms, policies, hours, equipment, steering committee
- Music Technology Studio Documentation, Emerson PA install, and Ensemble Audio/Video Recording docs: studio setup, Emerson system, concert workflow
- Music Tech Work-Study: Roles & Expectations: portal roles, handbook, hours and check-ins
- Music Tech and TARDIS Slideshow: course descriptions and program copy
- union.edu Music Technology and style guide pages: minor requirements, brand colors

Brand colors follow the Union College style guide (Union Garnet #762334, Garnet Dark #5A1222, Ramee Gray #636569, Stained Glass Gold #DEA821). Google Fonts stand in for the licensed brand faces: Zilla Slab (display), Albert Sans (body), IBM Plex Mono (labels).

Photos: Union College Communications and Marketing, 2025.
