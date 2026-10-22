# akhileshthapa.me

Personal site, hosted on GitHub Pages. Plain HTML/CSS/JS, **no build step, no dependencies**.

## Structure
```
index.html                      page shell + static text (hero, about) + SEO tags
assets/css/theme.css            design tokens + the reusable neo-brutalist components (.nb-*)
assets/css/site.css             page layout only
assets/js/data/content.js       ALL editable content: projects + contact links
assets/js/render.js             turns content.js into HTML (rarely needs edits)
assets/js/demos/<name>.js       one file per interactive demo
projects/<project-id>/          source files each project offers for download
CNAME, google…html              domain + Search Console verification: do not delete
```

## Add a project
1. Make a folder `projects/<project-id>/` for any downloadable files.
2. In `assets/js/data/content.js`, copy the project block to the **top** of `PROJECTS` and edit it.
   Fields: `id` (unique, lowercase, no spaces) · `title` · `status` · `color` · `stack[]` · `summary` · `notes[]` · `snippet{file,code}` · `links[{label,href,download?,color}]` · `demo` (optional).
3. Commit and push. Nothing else to touch.

## Add an interactive demo (optional)
Create `assets/js/demos/<name>.js` registering `window.DEMOS.<name> = function (root) { … }`
(copy `gravity.js`), add a `<script>` tag for it in `index.html` above `render.js`, then set `demo: "<name>"` in the project.

## Change the look
Edit the variables at the top of `theme.css` (colors, border width, shadow offset, fonts). Components: `.nb-btn`, `.nb-pill`,
`.nb-sticker`, `.nb-card`, `.nb-range`, `.nb-switch`, `.nb-kbd`, `.nb-code`; colors via `.is-coral|purple|teal|yellow|blue|orange|pink`.

## Preview locally
Open `index.html`, or run `python -m http.server` and visit http://localhost:8000.

## When this outgrows one page
Around 5+ projects, give each its own page under `projects/<id>/index.html` and keep `content.js` as the index.
