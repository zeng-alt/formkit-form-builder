# unocss-tw-animate-css [![npm version](https://img.shields.io/npm/v/unocss-tw-animate-css?color=red&logo=npm)](https://www.npmjs.com/package/unocss-tw-animate-css) [![npm downloads](https://img.shields.io/npm/dt/unocss-tw-animate-css?color=red&logo=npm)](https://www.npmjs.com/package/unocss-tw-animate-css) [![MIT license](https://img.shields.io/github/license/retronew/unocss-tw-animate-css)]() [![GitHub stars](https://img.shields.io/github/stars/retronew/unocss-tw-animate-css?color=blue)](https://github.com/retronew/unocss-tw-animate-css)

A collection of UnoCSS utilities for creating beautiful animations tailored for Tailwind CSS. This package includes ready-to-use animations and a set of utilities for creating custom animations.

---

This package serves as an animation preset for UnoCSS, leveraging a CSS-first approach to provide animation capabilities without relying on legacy JavaScript plugins.

## Table of Contents

- [Getting Started](#getting-started)
  - [Installation](#installation)
- [Usage](#usage)
  - [Enter/Exit Animations](#enterexit-animations)
    - [Base Classes](#base-classes)
    - [Transform Classes](#transform-classes)
  - [Ready-to-Use Animations](#ready-to-use-animations)
- [Examples](#examples)
- [Notes on Compatibility](#notes-on-compatibility)

## Getting Started

### Installation

1. Install the package with `pnpm`:

   ```sh
   pnpm install -D unocss-tw-animate-css
   ```

2. Add the preset to your UnoCSS configuration file (typically `uno.config.ts` or similar):

   ```javascript
   import { defineConfig } from 'unocss';
   import presetTwAnimate from 'unocss-tw-animate-css';

   export default defineConfig({
     presets: [
       presetTwAnimate(),
       // other presets...
     ],
     // other configurations...
   });
   ```

3. Start using the animations in your HTML:

   ```html
   <!-- Add an animated fade and zoom entrance -->
   <div class="animate-in fade-in zoom-in">...</div>

   <!-- Add an animated slide to top-left exit -->
   <div class="animate-out slide-out-to-top slide-out-to-left">...</div>

   <!-- And so much more! -->
   ```

## Usage

### Enter/Exit Animations

To define animations, use the following variables:

- `<io>`: Specify the type of animation. Use `in` for enter or `out` for exit animations.
- `<dir>`: Specify the direction of the slide. Possible values include `in-from-top`, `in-from-bottom`, `in-from-left`, `in-from-right`, `out-to-top`, `out-to-bottom`, etc.
- `*`: Specify a value to apply.

#### Base Classes

| Class                     | Description                                                                                                |
| ------------------------- | ---------------------------------------------------------------------------------------------------------- |
| [`animate-<io>`]         | Base class for enter/exit animations. This needs to be applied for animations to work.                   |

#### Transform Classes

| Class                         | Description                                                                                                                      |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| [`fade-<io>`]                | Fades the element in from or out to `opacity: 0`.                                                                                |
| [`zoom-<io>`]                | Zooms the element in from or out to `scale3D(0,0,0)`.                                                                            |
| [`slide-<dir>`]              | Slides the element in from or out to the specified direction.                                                                    |

### Ready-to-Use Animations

| Class                                  | Description                                                                                                                                                                                                                 |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`accordion-down`]                    | Accordion down animation. Requires content height to be set.                                                                                                                                             |
| [`accordion-up`]                      | Accordion up animation. Requires content height to be set.                                                                                                                                             |
| [`caret-blink`]                       | Blinking animation for caret/cursor.                                                                                                                                                                    |

By the way, if you don't use some of the above animations, they won't be included in the final CSS file due to Tailwind CSS's tree-shaking capabilities.

## Examples

**Basic usage:**

```html
<div class="animate-in fade-in slide-in-from-top duration-500">
  Fade in from 0% opacity,<br />
  slide from top,<br />
  with a 500ms duration.
</div>
```

**Advanced usage:**

```html
<div class="data-[state=show]:animate-in data-[state=hide]:animate-out fade-in slide-in-from-top duration-500" data-state="show">
  <p>
    If the element has the <code>data-state="show"</code> attribute,<br />
    fade in from 0% opacity,<br />
    slide from top,<br />
    with a 500ms duration.
  </p>
  <p>
    If the element has the <code>data-state="hide"</code> attribute,<br />
    fade out to 0% opacity,<br />
    slide to top,<br />
    with a 500ms duration.
  </p>
</div>
```

## Notes on Compatibility

> **NOTE:** This package may not be a 100% drop-in replacement for other animation libraries. If you notice any inconsistencies, feel free to contribute to this repository by opening a pull request.