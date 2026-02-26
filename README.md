# Website Architecture

This website is intentionally built as a static, HTML/CSS system allowing for theme swapping.

There is:
- No framework
- No build system
- No JS dependency (unless explicitly added later)
- No CSS preprocessor

### Folder Structure

```
assets/css/
  core/
    base.css
    layout.css
    components.css
    pages/
      home.css
      research.css

  themes/
    modern/
      tokens.css
      overrides.css
    retro/
      tokens.css
      overrides.css

  main.css      # default theme entrypoint
  retro.css     # retro theme entrypoint
```

-------------------------------------------------------------------------------

### CSS architecture

The CSS is layered intentionally.

#### Theme Tokens (Design Variables)

Location:
```themes/<theme>/tokens.css```

Defines:
- Colors (--bg, --fg, --accent, --border)
- Typography (--font-body, --font-mono)
- Spacing (--pad-x, --pad-y)
- Layout constraints (--maxw)
- Radius, focus styles, etc.

This file contains design knobs only.
No component rules should live here.


-------------------------------------------------------------------------------

#### Core Base

Location:
core/base.css

Defines:
- Global resets
- Body typography
- Default heading styles
- Link defaults
- Focus styles

This layer establishes global behavior and accessibility.

It should reference theme variables, not hardcoded colors.

Example:

```css
body {
  font-family: var(--font-body);
  background: var(--bg);
  color: var(--fg);
}
```

-------------------------------------------------------------------------------

#### Core Layout

Location:
core/layout.css

Defines:
- .container
- .section
- Responsive spacing
- Page width constraints

This layer controls geometry and spacing.
It does not define aesthetic styling.


-------------------------------------------------------------------------------

#### Core Components

Location:
core/components.css

Defines reusable building blocks:

- .site-header
- .nav
- .nav-links
- .site-footer
- .list
- .ascii
- Other reusable patterns

Structure lives here.
Decoration should rely on theme variables.


-------------------------------------------------------------------------------

#### Page-Specific Styles

Location:
core/pages/*.css

Used for page-level exceptions:

- .page-home .page-lede
- .page-research .paper-list

These should be minimal and scoped using body classes.


-------------------------------------------------------------------------------

#### Theme Overrides

Location:
```themes/<theme>/overrides.css```

Optional.

Used when a theme needs stylistic changes such as:
- Always-underlined links
- Dashed borders
- Section separators
- Terminal-style ASCII

Overrides should not redefine layout logic.


-------------------------------------------------------------------------------

#### Entry Points

Each theme has a root-level entry file.

Example:

main.css (modern default)
```css
@import url("./themes/modern/tokens.css");
@import url("./core/base.css");
@import url("./core/layout.css");
@import url("./core/components.css");
@import url("./themes/modern/overrides.css");
@import url("./core/pages/home.css");
```

retro.css
```css
@import url("./themes/retro/tokens.css");
@import url("./core/base.css");
@import url("./core/layout.css");
@import url("./core/components.css");
@import url("./themes/retro/overrides.css");
@import url("./core/pages/home.css");
```

Switch themes in HTML by changing:

```<link rel="stylesheet" href="/assets/css/main.css" />```

to:

```<link rel="stylesheet" href="/assets/css/retro.css" />```

No markup changes required.


-------------------------------------------------------------------------------

### HTML Structure Contract

All pages must follow this structure:
```html
<body class="page page-<name>">

  <a class="skip-link" href="#content">Skip to content</a>

  <header class="site-header">...</header>

  <main id="content" class="container">
    <header class="page-head">
      <h1 class="page-title">...</h1>
      <p class="page-lede">...</p>
    </header>

    <section class="section">...</section>
  </main>

  <footer class="site-footer">...</footer>

</body>
```

Do not rename structural classes.
They are part of the CSS contract.


-------------------------------------------------------------------------------

### ASCII art system

ASCII blocks use:
```html
<figure class="ascii">
  <pre><code>...</code></pre>
  <figcaption>Optional caption</figcaption>
</figure>
```

Headers may use:
```html
<pre class="ascii ascii-header" aria-hidden="true">...</pre>
```
ASCII styling is defined in components.css and can be themed.


-------------------------------------------------------------------------------

### When to Modify What

Modify:

- tokens.css → change theme 
- overrides.css → override other css files for a theme
- base.css → improve readability or accessibility
- layout.css → adjust spacing or page width
- components.css → add reusable UI elements
- pages/*.css → tweak individual pages

Avoid mixing responsibilities across layers.
