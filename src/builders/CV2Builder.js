'use strict';

const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SectionBuilder,
  ThumbnailBuilder,
  ButtonBuilder,
  ActionRowBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  FileBuilder,
  ButtonStyle,
  SeparatorSpacingSize,
  MessageFlags,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  UserSelectMenuBuilder,
  RoleSelectMenuBuilder,
  ChannelSelectMenuBuilder,
  MentionableSelectMenuBuilder,
  ChannelType,
} = require('discord.js');

const { ComponentTypes, ContainerAddMethodMap } = require('../types/constants');

/**
 * CV2Builder — fully-featured fluent Components V2 container builder
 *
 * Supports: text, separators, sections, buttons, select menus,
 * media galleries, files, and raw components. Full color + spoiler support.
 */
class CV2Builder {
  constructor() {
    this._container = new ContainerBuilder();
    this._components = [];
    this._accentColor = null;
    this._spoiler = false;
    this._id = `cv2_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  }

  // ─── Color & Spoiler ─────────────────────────────────────────────────────────

  /**
   * Set accent color
   * @param {number|string} color - Integer or '#RRGGBB'
   */
  setColor(color) {
    this._accentColor = typeof color === 'string'
      ? parseInt(color.replace('#', ''), 16)
      : color;
    return this;
  }

  /** Enable spoiler on container */
  setSpoiler(value = true) {
    this._spoiler = value;
    return this;
  }

  // ─── Text ─────────────────────────────────────────────────────────────────────

  /**
   * Add a text display block (supports full Discord markdown)
   * @param {string} content
   */
  addText(content) {
    if (!content || typeof content !== 'string') {
      throw new TypeError('CV2Builder#addText: content must be a non-empty string');
    }
    this._components.push(new TextDisplayBuilder().setContent(content));
    return this;
  }

  /**
   * Add multiple text blocks at once
   * @param {...string} lines
   */
  addLines(...lines) {
    for (const line of lines) this.addText(line);
    return this;
  }

  // ─── Separator ───────────────────────────────────────────────────────────────

  /**
   * Add a separator
   * @param {object} [opts]
   * @param {boolean} [opts.divider=true]
   * @param {'small'|'large'} [opts.spacing='small']
   */
  addSeparator({ divider = true, spacing = 'small' } = {}) {
    this._components.push(
      new SeparatorBuilder()
        .setDivider(divider)
        .setSpacing(spacing === 'large' ? SeparatorSpacingSize.Large : SeparatorSpacingSize.Small)
    );
    return this;
  }

  /** Spacer (separator without divider line) */
  addSpacer(spacing = 'small') {
    return this.addSeparator({ divider: false, spacing });
  }

  // ─── Section ─────────────────────────────────────────────────────────────────

  /**
   * Add a section with optional thumbnail or button accessory
   * @param {object} opts
   * @param {string} opts.text
   * @param {string} [opts.thumbnail] - Image URL for thumbnail accessory
   * @param {boolean} [opts.thumbnailSpoiler]
   * @param {string} [opts.thumbnailAlt]
   * @param {object} [opts.button] - { label, customId, style, emoji, url, disabled }
   */
  addSection({ text, thumbnail, thumbnailSpoiler, thumbnailAlt, button } = {}) {
    if (!text) throw new TypeError('CV2Builder#addSection: text is required');

    const section = new SectionBuilder()
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(text));

    if (thumbnail) {
      const t = new ThumbnailBuilder().setURL(thumbnail);
      if (thumbnailSpoiler) t.setSpoiler(true);
      if (thumbnailAlt) t.setDescription(thumbnailAlt);
      section.setThumbnailAccessory(t);
    } else if (button) {
      section.setButtonAccessory(this._buildButton(button));
    }

    this._components.push(section);
    return this;
  }

  // ─── Buttons ─────────────────────────────────────────────────────────────────

  /**
   * Add an action row of buttons (max 5)
   * @param {Array<{label, customId, style, emoji, disabled, url}>} buttons
   */
  addButtons(buttons = []) {
    if (!Array.isArray(buttons) || buttons.length === 0) {
      throw new TypeError('CV2Builder#addButtons: buttons must be a non-empty array');
    }
    if (buttons.length > 5) {
      throw new RangeError('CV2Builder#addButtons: max 5 buttons per row');
    }
    const row = new ActionRowBuilder();
    row.addComponents(...buttons.map(b => this._buildButton(b)));
    this._components.push(row);
    return this;
  }

  /**
   * Add multiple button rows (auto-splits into rows of 5)
   * @param {Array<object>} buttons
   */
  addButtonRows(buttons = []) {
    if (!Array.isArray(buttons) || buttons.length === 0) {
      throw new TypeError('CV2Builder#addButtonRows: buttons must be a non-empty array');
    }
    for (let i = 0; i < buttons.length; i += 5) {
      this.addButtons(buttons.slice(i, i + 5));
    }
    return this;
  }

  // ─── Select Menus ─────────────────────────────────────────────────────────────

  /**
   * Add a string select menu
   * @param {object} opts
   * @param {string} opts.customId
   * @param {string} [opts.placeholder]
   * @param {number} [opts.minValues=1]
   * @param {number} [opts.maxValues=1]
   * @param {boolean} [opts.disabled]
   * @param {Array<{label, value, description?, emoji?, default?}>} opts.options
   */
  addStringSelect({ customId, placeholder, minValues = 1, maxValues = 1, disabled, options = [] } = {}) {
    if (!customId) throw new TypeError('CV2Builder#addStringSelect: customId is required');
    if (!options.length) throw new TypeError('CV2Builder#addStringSelect: options cannot be empty');

    const menu = new StringSelectMenuBuilder()
      .setCustomId(customId)
      .setMinValues(minValues)
      .setMaxValues(maxValues)
      .addOptions(options.map(o => {
        const opt = new StringSelectMenuOptionBuilder()
          .setLabel(o.label)
          .setValue(o.value);
        if (o.description) opt.setDescription(o.description);
        if (o.emoji) opt.setEmoji(o.emoji);
        if (o.default) opt.setDefault(true);
        return opt;
      }));

    if (placeholder) menu.setPlaceholder(placeholder);
    if (disabled) menu.setDisabled(true);

    this._components.push(new ActionRowBuilder().addComponents(menu));
    return this;
  }

  /**
   * Add a user select menu
   * @param {object} opts
   * @param {string} opts.customId
   * @param {string} [opts.placeholder]
   * @param {number} [opts.minValues]
   * @param {number} [opts.maxValues]
   * @param {boolean} [opts.disabled]
   */
  addUserSelect({ customId, placeholder, minValues = 1, maxValues = 1, disabled } = {}) {
    if (!customId) throw new TypeError('CV2Builder#addUserSelect: customId is required');
    const menu = new UserSelectMenuBuilder().setCustomId(customId).setMinValues(minValues).setMaxValues(maxValues);
    if (placeholder) menu.setPlaceholder(placeholder);
    if (disabled) menu.setDisabled(true);
    this._components.push(new ActionRowBuilder().addComponents(menu));
    return this;
  }

  /**
   * Add a role select menu
   */
  addRoleSelect({ customId, placeholder, minValues = 1, maxValues = 1, disabled } = {}) {
    if (!customId) throw new TypeError('CV2Builder#addRoleSelect: customId is required');
    const menu = new RoleSelectMenuBuilder().setCustomId(customId).setMinValues(minValues).setMaxValues(maxValues);
    if (placeholder) menu.setPlaceholder(placeholder);
    if (disabled) menu.setDisabled(true);
    this._components.push(new ActionRowBuilder().addComponents(menu));
    return this;
  }

  /**
   * Add a channel select menu
   */
  addChannelSelect({ customId, placeholder, channelTypes, minValues = 1, maxValues = 1, disabled } = {}) {
    if (!customId) throw new TypeError('CV2Builder#addChannelSelect: customId is required');
    const menu = new ChannelSelectMenuBuilder().setCustomId(customId).setMinValues(minValues).setMaxValues(maxValues);
    if (placeholder) menu.setPlaceholder(placeholder);
    if (channelTypes) menu.addChannelTypes(...channelTypes);
    if (disabled) menu.setDisabled(true);
    this._components.push(new ActionRowBuilder().addComponents(menu));
    return this;
  }

  // ─── Media ────────────────────────────────────────────────────────────────────

  /**
   * Add a media gallery (1-10 images)
   * @param {Array<{url, description?, spoiler?}>} items
   */
  addMediaGallery(items = []) {
    if (!Array.isArray(items) || items.length === 0) {
      throw new TypeError('CV2Builder#addMediaGallery: items must be a non-empty array');
    }
    if (items.length > 10) throw new RangeError('CV2Builder#addMediaGallery: max 10 items');

    const gallery = new MediaGalleryBuilder();
    gallery.addItems(...items.map(item => {
      const i = new MediaGalleryItemBuilder().setURL(item.url);
      if (item.description) i.setDescription(item.description);
      if (item.spoiler) i.setSpoiler(true);
      return i;
    }));

    this._components.push(gallery);
    return this;
  }

  /**
   * Add a file component
   * @param {string} url - Attachment URL (e.g. 'attachment://file.pdf')
   * @param {boolean} [spoiler]
   */
  addFile(url, spoiler = false) {
    if (!url) throw new TypeError('CV2Builder#addFile: url is required');
    const f = new FileBuilder().setURL(url);
    if (spoiler) f.setSpoiler(true);
    this._components.push(f);
    return this;
  }

  // ─── Raw ────────────────────────────────────────────────────────────────────

  /** Add a raw discord.js component directly */
  addRaw(component) {
    if (!component) throw new TypeError('CV2Builder#addRaw: component is required');
    this._components.push(component);
    return this;
  }

  // ─── Build ────────────────────────────────────────────────────────────────────

  /**
   * Build and return the ContainerBuilder
   * @returns {ContainerBuilder}
   */
  build() {
    if (this._components.length === 0) {
      throw new Error('CV2Builder#build: cannot build an empty container');
    }

    for (const comp of this._components) {
      this._addToContainer(comp);
    }

    if (this._accentColor !== null) this._container.setAccentColor(this._accentColor);
    if (this._spoiler) this._container.setSpoiler(true);

    return this._container;
  }

  /**
   * Build into a reply/send options object (IsComponentsV2 flag set)
   * @param {object} [extra] - Extra properties to spread
   */
  toReply(extra = {}) {
    return {
      components: [this.build()],
      flags: MessageFlags.IsComponentsV2,
      ...extra,
    };
  }

  /** Build ephemeral reply payload */
  toEphemeral(extra = {}) {
    return {
      components: [this.build()],
      flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
      ...extra,
    };
  }

  /**
   * Clone this builder (create a fresh copy with same config)
   * @returns {CV2Builder}
   */
  clone() {
    const c = new CV2Builder();
    c._components = [...this._components];
    c._accentColor = this._accentColor;
    c._spoiler = this._spoiler;
    return c;
  }

  /** Get component count */
  get size() {
    return this._components.length;
  }

  // ─── Internal ─────────────────────────────────────────────────────────────────

  _addToContainer(comp) {
    const type = comp?.data?.type;
    const method = ContainerAddMethodMap[type];
    if (method) {
      this._container[method](comp);
    } else {
      // Fallback: try all methods
      const methods = ['addTextDisplayComponents','addSectionComponents','addSeparatorComponents',
        'addActionRowComponents','addMediaGalleryComponents','addFileComponents'];
      let added = false;
      for (const m of methods) {
        try { this._container[m](comp); added = true; break; } catch (_) {}
      }
      if (!added) throw new Error(`CV2Builder: unsupported component type ${type}`);
    }
  }

  _buildButton({ label, customId, style, emoji, disabled, url } = {}) {
    const btn = new ButtonBuilder()
      .setLabel(label || 'Button')
      .setStyle(this._resolveStyle(style));

    const resolvedStyle = this._resolveStyle(style);
    if (resolvedStyle === ButtonStyle.Link) {
      btn.setURL(url || 'https://discord.com');
    } else {
      btn.setCustomId(customId || `cv2_btn_${Math.random().toString(36).slice(2, 8)}`);
    }

    if (emoji) btn.setEmoji(emoji);
    if (disabled) btn.setDisabled(true);
    return btn;
  }

  _resolveStyle(style) {
    if (typeof style === 'number') return style;
    const map = {
      Primary: ButtonStyle.Primary, Blurple: ButtonStyle.Primary,
      Secondary: ButtonStyle.Secondary, Grey: ButtonStyle.Secondary, Gray: ButtonStyle.Secondary,
      Success: ButtonStyle.Success, Green: ButtonStyle.Success,
      Danger: ButtonStyle.Danger, Red: ButtonStyle.Danger,
      Link: ButtonStyle.Link,
    };
    return map[style] ?? ButtonStyle.Secondary;
  }
}

module.exports = CV2Builder;
