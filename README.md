# Distal Site Notes

This is a static site.
No framework. No build step.
Just HTML, CSS, JS.

## Where I edit things

- Main page content: `public/index.html`
- Home page layout tweaks: `assets/css/pages/home.css`
- Shared base rules: `assets/css/core/base.css`
- Shared component rules: `assets/css/core/components/*`
- JS behavior (theme, ASCII loaders, animation): `assets/js/main.js`

## How to run

Use any static server.

Example:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000/public/index.html`.

## How to add text

Edit `public/index.html`.
Each block is a `<section class="section">`.

Basic pattern:

```html
<section class="section" id="my-section" aria-labelledby="my-section-title">
  <h2 id="my-section-title">Section title</h2>
  <h3>Small title</h3>
  <p>Paragraph text.</p>
</section>
```

Use `h2` for section titles.
Use `h3` for smaller titles inside a section.
Use `p` for normal text.

## How to add pictures

Put image files in `assets/img/`.

Then in HTML:

```html
<figure class="c-picture">
  <img src="/assets/img/your-image.png" alt="Short description" />
</figure>
```

## How to add static ASCII diagrams

### Inline (small)

```html
<figure class="c-ascii-graph">
  <pre aria-label="My ASCII diagram"><code>
...ascii text...
  </code></pre>
</figure>
```

### From file (large)

Put text file in `assets/img/`, then:

```html
<figure class="c-ascii-graph c-ascii-graph-large">
  <pre data-ascii-src="/assets/img/output2.txt"><code>Loading...</code></pre>
</figure>
```

`main.js` loads the file and renders it into the `<pre>`.

## How to add ASCII animation

Frames live in `assets/animation/ascii/` as `frame_0001.txt`, etc.

```html
<pre
  class="c-ascii-anim"
  data-ascii-player
  data-frame-path="/assets/animation/ascii/"
  data-prefix="frame_"
  data-ext=".txt"
  data-pad="4"
  data-start="1"
  data-total="300"
  data-fps="30"
  data-preload="true"
><code>Loading...</code></pre>
```

## Useful layout classes

- `c-graph-grid`: 3 diagrams side by side
- `c-text-diagram`: text next to diagram
- `c-statement-image`: statement on left, image/diagram on right
- `c-cta-card`: CTA text + media block
- `c-cta-actions`: row of buttons

## Theme system

Theme CSS entry is:

```html
<link id="theme-css" rel="stylesheet" href="/assets/css/helios.css" />
```

Theme files are in `assets/css/themes/<theme>/`.
The dropdown changes this file at runtime.

## Quick checklist when adding content

1. Add section in `index.html`
2. Reuse existing `c-*` classes first
3. Put images in `assets/img/`
4. If needed, add small layout tweak in `home.css`
5. Hard refresh browser
