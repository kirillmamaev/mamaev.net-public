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
    :host {
      --bio-card-background: #f3f6f9;
      --bio-card-border: #d9dee4;
      --bio-card-text: #1f2328;
      --bio-card-text-muted: #5f6368;
      --bio-card-avatar-background: #ece5d8;
      --bio-card-avatar-size: 80px;
      --bio-card-avatar-border: #dde2e8;
      --bio-card-shadow: 0 1px 3px rgba(16, 24, 40, 0.06), 0 6px 16px rgba(16, 24, 40, 0.08);
      --bio-card-link: #0a58ca;

      /* Flex column so the card fills the host when the page stretches it to the tallest card */
      display: flex;
      flex-direction: column;
      container-type: inline-size;
      box-sizing: border-box;
      width: 100%;
      max-width: 464px;
      color: var(--bio-card-text);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    }

    article {
      flex: 1;
      padding: 20px 18px 22px;
      background: var(--bio-card-background);
      border: 1px solid var(--bio-card-border);
      border-radius: 8px;
      box-shadow: var(--bio-card-shadow);
    }

    /* Same space on both sides of the avatar: card border to avatar, and avatar to text */
    header {
      --bio-card-header-inset: 20px;

      display: flex;
      gap: var(--bio-card-header-inset);
      align-items: center;
      margin-left: -18px;
      padding-left: var(--bio-card-header-inset);
    }

    /* min-width: 0 lets the text column shrink, so long lines show an ellipsis */
    header > div {
      flex: 1;
      min-width: 0;
    }

    .avatar {
      flex: none;
      width: var(--bio-card-avatar-size);
      height: var(--bio-card-avatar-size);
      border: 4px solid var(--bio-card-avatar-border);
      border-radius: 50%;
      background: var(--bio-card-avatar-background);
      object-fit: cover;
    }

    .initials {
      display: grid;
      place-items: center;
      font-size: calc(var(--bio-card-avatar-size) * 0.34);
      font-weight: 600;
      color: #6b5d45;
    }

    h2 {
      margin: 0 0 4px;
      font-size: 16px;
      font-weight: 600;
      line-height: 1.4;
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
      font-size: 14px;
      line-height: 1.45;
    }



    .location {
      margin: 0;
      font-size: 12.5px;
      line-height: 1.5;
      color: var(--bio-card-text-muted);
    }

    .contact {
      display: flex;
      flex-wrap: wrap;
      gap: 0 6px;
      margin: 2px 0 0;
      font-size: 12.5px;
      line-height: 1.5;
      color: var(--bio-card-text-muted);
    }

    .contact a {
      color: var(--bio-card-link);
      text-decoration: none;
    }

    .contact a:hover {
      text-decoration: underline;
    }

    .contact a:focus-visible {
      outline: 2px solid var(--bio-card-link);
      outline-offset: 2px;
      border-radius: 2px;
    }

    section {
      margin-top: 20px;
    }

    section[hidden] {
      display: none;
    }

    h3 {
      margin: 0 0 8px;
      font-size: 14.5px;
      font-weight: 600;
    }

    .section-body {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    /*
     * About: always 8 lines tall, cut after 8 lines with "...".
     * Line clamping counts lines across all paragraphs. It ignores flex gap,
     * so paragraphs are spaced with a margin, and min-height includes one gap.
     */
    .section-body.about {
      --bio-card-about-lines: 8;

      display: -webkit-box;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: var(--bio-card-about-lines);
      overflow: hidden;
      min-height: calc(var(--bio-card-about-lines) * 1lh + 10px);
      font-size: 12.25px;
      line-height: 1.5;
    }

    ::slotted(p) {
      margin: 0;
      font-size: 12.25px;
      line-height: 1.5;
      color: var(--bio-card-text-muted);
    }

    ::slotted(p:not(:first-of-type)) {
      margin-top: 10px;
    }

    /*
     * Narrow cards (mobile screens): more room instead of cutting text.
     * Headline 3 lines, About 14 lines, location wraps onto 2 lines.
     */
    @container (max-width: 359px) {
      .headline {
        --bio-card-headline-lines: 3;
      }

      .section-body.about {
        --bio-card-about-lines: 14;
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
      return html`<img
        class="avatar"
        part="avatar"
        src=${this.avatar}
        alt=${this.avatarAlt}
        @error=${() => (this._avatarFailed = true)}
      />`;
    }
    return html`<div class="avatar initials" part="avatar" aria-hidden="true">${this.#initials}</div>`;
  }

  render() {
    return html`
      <article part="card" aria-labelledby="name">
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
      line-height: 1.5;
      color: var(--bio-card-text, #1f2328);
    }

    .detail {
      font-size: 12.5px;
      line-height: 1.5;
      color: var(--bio-card-text-muted, #5f6368);
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
