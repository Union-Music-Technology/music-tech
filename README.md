# Music Technology at Union College

Public website for Union College's Music Technology program. TARDIS (Technology, Acoustics, Research, Design and Instructional Studio) is the first full page; the program home page is a lighter shell that will grow into the full minor site.

## Structure

```
index.html            Program home (minor overview, facilities, courses, contact)
tardis/index.html     TARDIS studio page
assets/css/site.css   Shared tokens, header, footer, buttons (Union palette)
assets/css/tardis.css TARDIS page styles
assets/js/site.js     Copy-to-clipboard for email addresses
assets/img/tardis/    Web-sized photos (1000px and 2000px)
```

Plain HTML and CSS with no build step. To add a page, copy `tardis/index.html` into a new folder, keep the header and footer, and add a link to the nav on every page.

## Publishing with GitHub Pages

Settings > Pages > Source: Deploy from a branch > `main` / root. The site will be at
`https://union-music-technology.github.io/<repo-name>/`.

## Content sources

- TARDIS Documentation (Google Doc): purpose, rooms, policies, hours, equipment, steering committee
- Music Tech and TARDIS Slideshow: course descriptions and program copy
- union.edu Music Technology and style guide pages: minor requirements, brand colors

Brand colors follow the Union College style guide (Union Garnet #762334, Garnet Dark #5A1222, Ramee Gray #636569, Stained Glass Gold #DEA821). Google Fonts stand in for the licensed brand faces: Zilla Slab (display), Albert Sans (body), IBM Plex Mono (labels).

Photos: Union College Communications and Marketing, 2025.
