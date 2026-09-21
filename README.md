# Studio website

Static site: plain HTML, one shared `styles.css`, a built `tailwind.css`, and a few small scripts. No framework.

## Run locally

Serve the folder over http (opening the files directly also works, but page transitions and the local Three.js copy need http):

    npx serve .        # or any static server, e.g. VS Code Live Server

## Change styles

`tailwind.css` is generated from the utility classes used in the HTML and JS files. After adding or changing Tailwind classes, rebuild it:

    npm install        # once
    npm run build:css

(`npm run watch:css` rebuilds on every save.) Hand-written styles live in `styles.css` and inside each page's `<style>` block.

## Before going live

1. **Replace the placeholders.** Search all files for `[YOUR STUDIO NAME]` and `[YOUR-DOMAIN]`. They appear in page titles, the navbar and footer, canonical and share tags, `sitemap.xml` and `robots.txt`.
2. **Connect the contact form.** Both forms (`index.html`, `contact.html`) post to the URL in their `data-endpoint` attribute. Create a form at a service such as Formspree, then set it, for example:
   `<form ... data-endpoint="https://formspree.io/f/xxxxxxxx">`.
   Until an endpoint is set the form tells the visitor it is not connected. It never pretends a message was sent. Details are at the top of `contact-form.js`.
3. **Check the share image.** `og-image.jpg` (1200x630) is used for link previews. Replace it with your own artwork if you like.

## What each script does

| File | Purpose |
| --- | --- |
| `page-transitions.js` | Direction-aware page transitions, with a fade fallback for browsers that lack View Transitions |
| `layers-3d.js` | The interactive 3D layer scenes (hero, architecture section). Uses `vendor/three.module.min.js`, falls back to the CDN |
| `tilt.js` | Tilt-on-hover for service and project cards |
| `contact-form.js` | Contact form validation and submission |
| `device-switcher.js` | Device preview buttons on the projects page |

All motion respects the visitor's "reduce motion" setting, and every 3D or motion feature falls back to the plain page if it cannot run.
