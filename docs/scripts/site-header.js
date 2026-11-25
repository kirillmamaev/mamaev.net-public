/**
 * Site header web component by Kirill Mamaev - kirill@mamaev.net
 *
 * <site-header heading="mamaev.net"> shows the site title as an <h1>,
 * centred horizontally and stuck to the top of the page while it scrolls.
 *
 * Attributes:
 *   heading - the title text
 *
 * The page loads the Comfortaa font (fonts must be registered by the document,
 * not inside a shadow root). Without it, the title falls back to sans-serif.
 *
 * CSS custom properties:
 *   --site-header-color, --site-header-background, --site-header-font-size
 *
 * License: MIT
 */

import { LitElement, html, css } from './vendor/lit-core-3.3.1.min.js';

export class SiteHeader extends LitElement {
  static properties = {
    heading: { type: String },
  };

  static styles = css`
    /* The host is sticky, not the <h1>: sticky only works within the parent's box */
    /*
     * Australian Bush theme (see DESIGN.md): deep gum heading, slightly tightened and
     * balanced, with a gum-leaf sprig. The font stays Comfortaa.
     */
    :host {
      --site-header-color: #2f4a3a; /* deep gum (9.1:1 on warm white) */
      --site-header-ornament: #5e7d6b; /* eucalyptus: decoration only */
      --site-header-background: #fbf7f0; /* warm white */
      --site-header-font-size: clamp(2rem, 6vw, 3rem);

      display: block;
      position: sticky;
      top: 0;
      z-index: 1;
      /* Fades into the page at the bottom, so the sun glow has no hard edge */
      background: linear-gradient(to bottom, var(--site-header-background) 60%, transparent);
    }

    h1 {
      margin: 0;
      padding: 16px 16px 8px;
      color: var(--site-header-color);
      font-family: 'Comfortaa', sans-serif;
      font-size: var(--site-header-font-size);
      font-weight: 700;
      line-height: 1.2;
      letter-spacing: -0.01em;
      text-align: center;
      text-wrap: balance;
    }

    /* Leaf-and-gumnut sprig after the title */
    .sprig {
      width: 0.62em;
      height: 0.62em;
      margin-left: 0.12em;
      color: var(--site-header-ornament);
      /* Raised with relative positioning, which doesn't grow the line box */
      position: relative;
      top: -0.24em;
      vertical-align: middle;
    }
  `;

  constructor() {
    super();
    this.heading = '';
  }

  render() {
    return html`
      <header>
        <h1>
          ${this.heading}<svg class="sprig" viewBox="0 0 32 32" aria-hidden="true" focusable="false">
            <path d="M4 30C10 22 16 15 28 4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
            <path d="M15 18C9 13 9 6 13 2C17 7 18 13 15 18Z" fill="currentColor" />
            <path d="M21 11C21 5 25 2 31 1C30 7 27 10 21 11Z" fill="currentColor" />
            <circle cx="22" cy="19" r="2.6" fill="currentColor" />
          </svg>
        </h1>
      </header>
    `;
  }
}

customElements.define('site-header', SiteHeader);
