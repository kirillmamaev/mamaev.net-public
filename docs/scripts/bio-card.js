/**
 * Bio card web components by Kirill Mamaev - kirill@mamaev.net
 *
 * <bio-card> shows a person's profile: avatar, name, headline, location,
 * and About, Experience and Skills sections.
 *
 * Attributes (short, single values):
 *   name, headline, location, avatar (image URL), avatar-alt,
 *   email, linkedin (profile handle, or a full URL)
 *
 * Slots (rich or repeated content). A section only shows when its slot has content:
 *   about       - paragraphs (<p>)
 *   experience  - <bio-card-entry> elements
 *   skills      - <bio-card-entry> elements
 *
 * <bio-card-entry> is one line item in a section.
 * Attributes: heading (main line), detail (muted second line). Either can be left out.
 *
 * Theme: CSS custom properties on <bio-card> (--bio-card-*), see the :host rule.
 * The page loads the Karla and Young Serif fonts.
 *
 * License: MIT
 */

import { LitElement, html, css, nothing } from './vendor/lit-core-3.3.1.min.js';

const SECTIONS = [
  { slot: 'about', label: 'About' },
  { slot: 'experience', label: 'Experience' },
  { slot: 'skills', label: 'Skills' },
];

export class BioCard extends LitElement {
  static properties = {
    name: { type: String },
    headline: { type: String },
    location: { type: String },
    avatar: { type: String },
    avatarAlt: { type: String, attribute: 'avatar-alt' },
    email: { type: String },
    linkedin: { type: String },
    _avatarFailed: { state: true },
    _filledSlots: { state: true },
  };

  static styles = css`
    /*
     * Australian Bush theme (see DESIGN.md): sandstone card, leaf-shaped corners,
     * Young Serif name, Karla text, ochre eyebrows, blob-masked avatar.
     * Colours meet WCAG AA on the card background (contrast in brackets).
     */
    :host {
      --bio-card-background: #f3e9d9; /* sandstone tint */
      --bio-card-border: rgba(107, 79, 58, 0.16);
      --bio-card-text: #2f4a3a; /* deep gum (8.1:1) */
      --bio-card-text-muted: #6b4f3a; /* bark (6.2:1) */
      --bio-card-accent: #8e3f1f; /* ochre deep: eyebrows and links (6.1:1) */
      --bio-card-focus: #b5562c; /* ochre: focus rings */
      --bio-card-ornament: #5e7d6b; /* eucalyptus: decoration only */
      --bio-card-avatar-size: 88px;
      --bio-card-avatar-background: #e9d8be; /* sandstone */
      --bio-card-avatar-blob: #e3eadf; /* eucalyptus tint */
      --bio-card-avatar-border: #fbf7f0; /* warm white */
      --bio-card-radius: 36px 120px 36px 36px; /* leaf corner: big top-right */
      --bio-card-shadow: 0 1px 2px rgba(74, 53, 38, 0.06), 0 12px 28px -10px rgba(74, 53, 38, 0.22);
      --bio-card-font: 'Karla', system-ui, sans-serif;
      --bio-card-heading-font: 'Young Serif', Georgia, serif;

      /* Flex column so the card fills the host when the page stretches it to the tallest card */
      display: flex;
      flex-direction: column;
      container-type: inline-size;
      box-sizing: border-box;
      width: 100%;
      max-width: 464px;
      color: var(--bio-card-text);
      font-family: var(--bio-card-font);
    }

    article {
      position: relative;
      isolation: isolate;
      flex: 1;
      padding: 22px 18px 24px;
      background: var(--bio-card-background);
      border: 1px solid var(--bio-card-border);
      border-radius: var(--bio-card-radius);
      box-shadow: var(--bio-card-shadow);
    }

    /* Gum-leaf sprig in the bottom corner, behind the text */
    .ornament {
      position: absolute;
      right: 12px;
      bottom: 10px;
      z-index: -1;
      width: 48px;
      height: 48px;
      color: var(--bio-card-ornament);
      opacity: 0.22;
      pointer-events: none;
    }

    /* Same space on both sides of the avatar: card border to avatar, and avatar to text */
    header {
      --bio-card-header-inset: 20px;

      display: flex;
      gap: var(--bio-card-header-inset);
      align-items: center;
      margin-left: -18px;
      padding-left: var(--bio-card-header-inset);
      /* Keeps long lines clear of the big top-right corner */
      padding-right: 28px;
    }

    /* min-width: 0 lets the text column shrink, so long lines show an ellipsis */
    header > div {
      flex: 1;
      min-width: 0;
    }

    /* Blob-masked avatar with an offset tinted blob behind it */
    .avatar-frame {
      position: relative;
      flex: none;
      width: var(--bio-card-avatar-size);
      height: var(--bio-card-avatar-size);
    }

    .avatar-frame::before {
      content: '';
      position: absolute;
      inset: 0;
      transform: translate(6px, 5px);
      border-radius: 45% 55% 42% 58% / 55% 45% 58% 42%;
      background: var(--bio-card-avatar-blob);
    }

    .avatar {
      position: relative;
      box-sizing: border-box;
      width: 100%;
      height: 100%;
      border: 3px solid var(--bio-card-avatar-border);
      border-radius: 58% 42% 55% 45% / 45% 55% 45% 55%;
      background: var(--bio-card-avatar-background);
      object-fit: cover;
      animation: blob-morph 14s ease-in-out infinite alternate;
    }

    @keyframes blob-morph {
      to {
        border-radius: 46% 54% 44% 56% / 56% 44% 56% 44%;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .avatar {
        animation: none;
      }
    }

    .initials {
      display: grid;
      place-items: center;
      font-family: var(--bio-card-heading-font);
      font-size: calc(var(--bio-card-avatar-size) * 0.32);
      color: var(--bio-card-text-muted);
    }

    h2 {
      margin: 0 0 2px;
      font-family: var(--bio-card-heading-font);
      font-size: 21px;
      font-weight: 400;
      line-height: 1.4;
      letter-spacing: -0.01em;
    }

    /* Lines that must stay on one line and end with "..." when too long */
    h2,
    .location {
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }

    /* Always 2 lines tall: a short headline gets a blank line, a long one ends with "..." */
    .headline {
      --bio-card-headline-lines: 2;

      display: -webkit-box;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: var(--bio-card-headline-lines);
      overflow: hidden;
      min-height: calc(var(--bio-card-headline-lines) * 1lh);
      margin: 0 0 2px;
      font-size: 14.5px;
      font-weight: 500;
      line-height: 1.45;
    }

    .location {
      margin: 0;
      font-size: 13px;
      line-height: 1.5;
      color: var(--bio-card-text-muted);
    }

    .contact {
      display: flex;
      flex-wrap: wrap;
      gap: 0 6px;
      margin: 2px 0 0;
      font-size: 13px;
      font-weight: 600;
      line-height: 1.5;
      color: var(--bio-card-text-muted);
    }

    .contact a {
      color: var(--bio-card-accent);
      text-decoration: none;
    }

    .contact a:hover {
      text-decoration: underline;
      text-underline-offset: 2px;
    }

    .contact a:focus-visible {
      outline: 2px solid var(--bio-card-focus);
      outline-offset: 2px;
      border-radius: 2px;
    }

    section {
      margin-top: 20px;
    }

    section[hidden] {
      display: none;
    }

    /* Section titles are uppercase eyebrows in ochre */
    h3 {
      margin: 0 0 9px;
      font-size: 11px;
      font-weight: 800;
      line-height: 1.4;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      color: var(--bio-card-accent);
    }

    .section-body {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    /*
     * About: always a fixed number of lines tall, cut after that with "...".
     * Line clamping counts lines across all paragraphs. It ignores flex gap,
     * so paragraphs are spaced with a margin, and min-height includes one gap.
     */
    .section-body.about {
      --bio-card-about-lines: 10;

      display: -webkit-box;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: var(--bio-card-about-lines);
      overflow: hidden;
      min-height: calc(var(--bio-card-about-lines) * 1lh + 10px);
      font-size: 13px;
      line-height: 1.55;
    }

    ::slotted(p) {
      margin: 0;
      font-size: 13px;
      line-height: 1.55;
      color: var(--bio-card-text-muted);
    }

    ::slotted(p:not(:first-of-type)) {
      margin-top: 10px;
    }

    /*
     * Narrow cards (mobile screens): more room instead of cutting text.
     * Headline 3 lines, About 15 lines, location wraps onto 2 lines.
     */
    @container (max-width: 359px) {
      /* A smaller leaf corner, avatar and name, so the text keeps enough room */
      article {
        border-radius: 28px 80px 28px 28px;
      }

      /* Set on header, not :host: a container query can't style the container itself */
      header {
        --bio-card-avatar-size: 72px;
      }

      h2 {
        font-size: 18px;
      }

      .headline {
        --bio-card-headline-lines: 3;
      }

      .section-body.about {
        --bio-card-about-lines: 15;
      }

      .location {
        display: -webkit-box;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: 2;
        min-height: 2lh;
        white-space: normal;
      }
    }

    /* Very narrow cards (360px screens and below): long headlines need a 4th line */
    @container (max-width: 299px) {
      .headline {
        --bio-card-headline-lines: 4;
      }

      .location {
        -webkit-line-clamp: 3;
        min-height: 3lh;
      }
    }
  `;

  constructor() {
    super();
    this.name = '';
    this.headline = '';
    this.location = '';
    this.avatar = '';
    this.avatarAlt = '';
    this.email = '';
    this.linkedin = '';
    this._avatarFailed = false;
    this._filledSlots = new Set();
  }

  connectedCallback() {
    super.connectedCallback();
    this.#updateFilledSlots();
  }

  willUpdate(changed) {
    // Try a new avatar URL even if the previous one failed to load
    if (changed.has('avatar')) this._avatarFailed = false;
  }

  // Checks the light DOM so empty sections stay hidden from the first render
  #updateFilledSlots() {
    this._filledSlots = new Set(
      SECTIONS.map(({ slot }) => slot).filter((slot) => this.querySelector(`:scope > [slot="${slot}"]`)),
    );
  }

  get #initials() {
    return this.name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0].toUpperCase())
      .join('');
  }

  get #linkedinUrl() {
    if (/^https?:\/\//i.test(this.linkedin)) return this.linkedin;
    return `https://www.linkedin.com/in/${encodeURIComponent(this.linkedin)}`;
  }

  #renderContact() {
    const links = [];
    if (this.email) links.push(html`<a href="mailto:${this.email}">${this.email}</a>`);
    if (this.linkedin) {
      links.push(html`<a href=${this.#linkedinUrl} aria-label="${this.name} on LinkedIn">LinkedIn</a>`);
    }
    if (!links.length) return nothing;
    return html`<p class="contact">
      ${links.map((link, i) => html`${i ? html`<span aria-hidden="true">·</span>` : nothing}${link}`)}
    </p>`;
  }

  #renderAvatar() {
    if (this.avatar && !this._avatarFailed) {
      // Decorative by default: the name is right next to it
      return html`<span class="avatar-frame"
        ><img
          class="avatar"
          part="avatar"
          src=${this.avatar}
          alt=${this.avatarAlt}
          @error=${() => (this._avatarFailed = true)}
      /></span>`;
    }
    return html`<span class="avatar-frame" aria-hidden="true"
      ><span class="avatar initials" part="avatar">${this.#initials}</span></span
    >`;
  }

  render() {
    return html`
      <article part="card" aria-labelledby="name">
        <svg class="ornament" viewBox="0 0 72 72" aria-hidden="true" focusable="false">
          <path d="M10 66C24 52 38 34 64 8" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" />
          <path d="M34 40C22 30 22 16 30 8C38 18 40 30 34 40Z" fill="currentColor" />
          <path d="M46 26C46 14 54 6 66 4C64 16 58 24 46 26Z" fill="currentColor" />
          <path d="M24 52C12 50 6 42 4 32C16 32 24 40 24 52Z" fill="currentColor" />
          <circle cx="50" cy="40" r="5" fill="currentColor" />
          <circle cx="60" cy="34" r="4" fill="currentColor" />
        </svg>
        <header>
          ${this.#renderAvatar()}
          <div>
            <h2 id="name">${this.name}</h2>
            ${this.headline ? html`<p class="headline">${this.headline}</p>` : nothing}
            ${this.location ? html`<p class="location">${this.location}</p>` : nothing}
            ${this.#renderContact()}
          </div>
        </header>
        ${SECTIONS.map(
          ({ slot, label }) => html`
            <section ?hidden=${!this._filledSlots.has(slot)} aria-labelledby="${slot}-heading">
              <h3 id="${slot}-heading">${label}</h3>
              <div class="section-body ${slot}">
                <slot name=${slot} @slotchange=${() => this.#updateFilledSlots()}></slot>
              </div>
            </section>
          `,
        )}
      </article>
    `;
  }
}

export class BioCardEntry extends LitElement {
  static properties = {
    heading: { type: String },
    detail: { type: String },
  };

  static styles = css`
    :host {
      display: block;
      padding-left: 1px;
    }

    /* Each line stays on one line and ends with "..." when too long */
    p {
      margin: 0;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }

    /* Narrow cards (mobile screens): skills lines wrap instead of being cut.
       The query finds the <bio-card> container around this entry. */
    @container (max-width: 359px) {
      :host([slot='skills']) p {
        white-space: normal;
      }
    }

    .heading {
      font-size: 14px;
      font-weight: 500;
      line-height: 1.5;
      color: var(--bio-card-text, #2f4a3a);
    }

    .detail {
      font-size: 12.5px;
      line-height: 1.5;
      color: var(--bio-card-text-muted, #6b4f3a);
    }

    .heading + .detail {
      margin-top: 1px;
    }
  `;

  constructor() {
    super();
    this.heading = '';
    this.detail = '';
  }

  render() {
    return html`
      ${this.heading ? html`<p class="heading">${this.heading}</p>` : nothing}
      ${this.detail ? html`<p class="detail">${this.detail}</p>` : nothing}
    `;
  }
}

customElements.define('bio-card', BioCard);
customElements.define('bio-card-entry', BioCardEntry);
