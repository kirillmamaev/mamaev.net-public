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
    :host {
      --site-header-color: #25272c;
      --site-header-background: #ffffff;
      --site-header-font-size: clamp(2rem, 6vw, 3rem);

      display: block;
      position: sticky;
      top: 0;
      z-index: 1;
      background-color: var(--site-header-background);
    }

    h1 {
      margin: 0;
      padding: 16px 16px 8px;
      color: var(--site-header-color);
      font-family: 'Comfortaa', sans-serif;
      font-size: var(--site-header-font-size);
      font-weight: 700;
      line-height: 1.2;
      text-align: center;
    }
  `;

  constructor() {
    super();
    this.heading = '';
  }

  render() {
    return html`
      <header>
        <h1>${this.heading}</h1>
      </header>
    `;
  }
}

customElements.define('site-header', SiteHeader);
