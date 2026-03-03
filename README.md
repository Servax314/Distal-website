# Distal Website

Static one-page website with theme switching and reusable content components.

## Stack

- HTML/CSS/JS only
- No framework
- No build step
- No CSS preprocessor

## Current Site Shape

Primary page: `public/index.html`

Section order:
1. Supported by
2. Big ASCII animation
3. Research
4. About
5. Careers
6. Contact

Navigation is in-page anchors (`#research`, `#about`, etc.).

## Project Structure

```txt
public/
  index.html
  careers.html
  about.html
  research.html
  contact.html

assets/
  css/
    core/
      base.css
      layout.css
      components.css
      components/
        nav.css
        ascii.css
        footer.css
    pages/
      home.css
    themes/
      <theme>/
        tokens.css
        override.css
    modern.css
    retro.css
    nord.css
    helios.css
    terminal.css
    academic.css
    brutalist.css
    noir.css

  js/
    main.js

  img/
    name_logo.png
    logo.png
    ethz-logo.png
    numenta-logo.png

  animation/
    ascii/
      frame_0001.txt ...
```

## CSS Layering

- `themes/*/tokens.css`: design tokens (colors, fonts, spacing)
- `core/base.css`: global element rules
- `core/layout.css`: container and section geometry
- `core/components.css` + `core/components/*`: reusable UI pieces
- `themes/*/override.css`: theme-specific overrides
- `pages/home.css`: one-page composition and section-specific layout

Each theme entrypoint imports these layers.

## HTML Contract

Keep this high-level structure:

```html
<body class="page page-home">
  <a class="skip-link" href="#content">Skip to content</a>

  <header class="site-header">...</header>

  <main id="content" class="container">
    <section id="..." class="section">...</section>
  </main>

  <footer class="site-footer">...</footer>
</body>
```

## Modular Class System

The site now supports reusable component/text classes for copy-paste content blocks.

### Component classes (`c-*`)

- `c-support-banner`: horizontal supporter strip container (label + logos).
- `c-logo-row`: inline row wrapper for logo groups.
- `c-logo-item`: per-logo image sizing hook in logo rows.
- `c-ascii-anim`: animated ASCII block (`<pre data-ascii-player>`).
- `c-ascii-graph`: static ASCII graph figure wrapper.
- `c-graph-grid`: responsive multi-column grid for multiple graph blocks.
- `c-picture`: generic image/media figure container (About visuals, etc.).
- `c-cta-card`: two-column call-to-action card shell (content + media).
- `c-cta-content`: text/action column inside a CTA card.
- `c-contact-line`: constrained-width contact paragraph/info line.

### Text semantics

Text styling now relies on semantic HTML elements directly:

- navigation links: `.nav-links a`
- section headings: `h2`
- subsection headings: `h3`
- paragraph copy: `p`

Use semantic tags (`h2`, `h3`, `p`, `figure`, `a`) and reserve `c-*` for reusable components.

## Accessibility + Semantics

- Use real headings for hierarchy (`h2` for top-level sections, `h3` for subsection titles)
- Prefer `aria-labelledby` when a visible heading exists
- Use `aria-label` for sections/controls without visible labels
- Keep section IDs stable so anchor nav keeps working

## ASCII System

Static graph:

```html
<figure class="c-ascii-graph">
  <pre><code>...</code></pre>
</figure>
```

Animation:

```html
<pre class="c-ascii-anim" data-ascii-player ...>
  <code>Loading...</code>
</pre>
```

`assets/js/main.js` auto-initializes all `[data-ascii-player]` elements, preloads frames, scales text to the box, and slows animation on hover.

## Theme Switching

Theme CSS is loaded through:

```html
<link id="theme-css" rel="stylesheet" href="/assets/css/helios.css" />
```

`main.js` supports:
- query-string override (`?theme=retro`)
- localStorage persistence
- dropdown selection (`#theme-select`)

## Editing Rules

- Header/footer/nav behavior should be changed in core component CSS (`core/components/*`)
- Section composition should be changed in `public/index.html`
- One-page layout tuning should be changed in `assets/css/pages/home.css`
- Keep new content modular by reusing `c-*` component classes
