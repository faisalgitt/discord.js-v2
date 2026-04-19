'use strict';

const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SectionBuilder,
  ThumbnailBuilder,
  ButtonBuilder,
  ActionRowBuilder,
  ComponentType,
  ButtonStyle,
  SeparatorSpacingSize,
} = require('discord.js');

/**
 * CV2Builder — fluent, chainable Components V2 container builder
 * The core utility of discord.js-v2
 */
class CV2Builder {
  constructor() {
    this._container = new ContainerBuilder();
    this._components = [];
    this._accentColor = null;
    this._spoiler = false;
  }

  /**
   * Set accent color on the container
   * @param {number|string} color - Hex color or integer
   */
  setColor(color) {
    if (typeof color === 'string') {
      color = parseInt(color.replace('#', ''), 16);
    }
    this._accentColor = color;
    return this;
  }

  /**
   * Set spoiler on the container
   */
  setSpoiler(value = true) {
    this._spoiler = value;
    return this;
  }

  /**
   * Add a text display component
   * @param {string} content - Markdown content
   */
  addText(content) {
    if (!content || typeof content !== 'string') throw new TypeError('CV2Builder#addText: content must be a non-empty string');
    this._components.push(new TextDisplayBuilder().setContent(content));
    return this;
  }

  /**
   * Add a separator
   * @param {object} options
   * @param {boolean} [options.divider=true]
   * @param {'small'|'large'} [options.spacing='small']
   */
  addSeparator({ divider = true, spacing = 'small' } = {}) {
    const sep = new SeparatorBuilder()
      .setDivider(divider)
      .setSpacing(spacing === 'large' ? SeparatorSpacingSize.Large : SeparatorSpacingSize.Small);
    this._components.push(sep);
    return this;
  }

  /**
   * Add a section with optional thumbnail
   * @param {object} options
   * @param {string} options.text - Section text content
   * @param {string} [options.thumbnail] - Thumbnail image URL
   * @param {object} [options.button] - Optional accessory button { label, customId, style, emoji }
   */
  addSection({ text, thumbnail, button } = {}) {
    if (!text) throw new TypeError('CV2Builder#addSection: text is required');

    const section = new SectionBuilder()
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(text));

    if (thumbnail) {
      section.setThumbnailAccessory(new ThumbnailBuilder().setURL(thumbnail));
    } else if (button) {
      const btn = new ButtonBuilder()
        .setLabel(button.label || 'Click')
        .setCustomId(button.customId || 'cv2_section_btn')
        .setStyle(this._resolveButtonStyle(button.style));
      if (button.emoji) btn.setEmoji(button.emoji);
      section.setButtonAccessory(btn);
    }

    this._components.push(section);
    return this;
  }

  /**
   * Add a row of buttons (max 5)
   * @param {Array<{label, customId, style, emoji, disabled, url}>} buttons
   */
  addButtons(buttons = []) {
    if (!Array.isArray(buttons) || buttons.length === 0) throw new TypeError('CV2Builder#addButtons: buttons must be a non-empty array');
    if (buttons.length > 5) throw new RangeError('CV2Builder#addButtons: max 5 buttons per row');

    const row = new ActionRowBuilder();
    for (const btn of buttons) {
      const b = new ButtonBuilder()
        .setLabel(btn.label || 'Button')
        .setStyle(this._resolveButtonStyle(btn.style));

      if (btn.style === 'Link' || btn.style === 5) {
        b.setURL(btn.url || 'https://discord.com');
      } else {
        b.setCustomId(btn.customId || `cv2_btn_${Math.random().toString(36).slice(2, 8)}`);
      }

      if (btn.emoji) b.setEmoji(btn.emoji);
      if (btn.disabled) b.setDisabled(true);

      row.addComponents(b);
    }

    this._components.push(row);
    return this;
  }

  /**
   * Add raw discord.js component (TextDisplayBuilder, SectionBuilder, etc.)
   * @param {object} component
   */
  addRaw(component) {
    this._components.push(component);
    return this;
  }

  /**
   * Build and return the ContainerBuilder
   * @returns {ContainerBuilder}
   */
  build() {
    if (this._components.length === 0) throw new Error('CV2Builder#build: no components added');

    for (const comp of this._components) {
      this._addToContainer(comp);
    }

    if (this._accentColor !== null) {
      this._container.setAccentColor(this._accentColor);
    }

    if (this._spoiler) {
      this._container.setSpoiler(true);
    }

    return this._container;
  }

  /**
   * Route component to correct typed add method on ContainerBuilder
   * @param {object} comp
   */
  _addToContainer(comp) {
    const type = comp?.data?.type;
    switch (type) {
      case 10: // TextDisplay
        this._container.addTextDisplayComponents(comp);
        break;
      case 14: // Separator
        this._container.addSeparatorComponents(comp);
        break;
      case 9:  // Section
        this._container.addSectionComponents(comp);
        break;
      case 1:  // ActionRow
        this._container.addActionRowComponents(comp);
        break;
      case 12: // MediaGallery
        this._container.addMediaGalleryComponents(comp);
        break;
      case 13: // File
        this._container.addFileComponents(comp);
        break;
      default:
        // Fallback: try all typed methods
        try { this._container.addTextDisplayComponents(comp); } catch (_) {
          try { this._container.addSectionComponents(comp); } catch (_) {
            try { this._container.addSeparatorComponents(comp); } catch (_) {
              try { this._container.addActionRowComponents(comp); } catch (e) {
                throw new Error(`CV2Builder#build: unsupported component type ${type}: ${e.message}`);
              }
            }
          }
        }
    }
  }

  /**
   * Build and return as a ready reply/send options object
   * @param {object} [extra] - Extra options to merge (ephemeral, etc.)
   * @returns {{ components: ContainerBuilder[], flags: number }}
   */
  toReply(extra = {}) {
    const { MessageFlags } = require('discord.js');
    return {
      components: [this.build()],
      flags: MessageFlags.IsComponentsV2,
      ...extra,
    };
  }

  /**
   * Build ephemeral reply
   */
  toEphemeral() {
    const { MessageFlags } = require('discord.js');
    return {
      components: [this.build()],
      flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
    };
  }

  // ─── Internal ────────────────────────────────────────────────────────────────

  _resolveButtonStyle(style) {
    const { ButtonStyle } = require('discord.js');
    if (typeof style === 'number') return style;
    const map = {
      Primary: ButtonStyle.Primary,
      Secondary: ButtonStyle.Secondary,
      Success: ButtonStyle.Success,
      Danger: ButtonStyle.Danger,
      Link: ButtonStyle.Link,
      Blurple: ButtonStyle.Primary,
      Grey: ButtonStyle.Secondary,
      Gray: ButtonStyle.Secondary,
      Green: ButtonStyle.Success,
      Red: ButtonStyle.Danger,
    };
    return map[style] ?? ButtonStyle.Secondary;
  }
}

module.exports = CV2Builder;
