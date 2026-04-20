'use strict';

const CV2Builder = require('./CV2Builder');
const { MessageFlags } = require('discord.js');
const { uniqueId } = require('../utils/index');

/**
 * MenuCV2 — interactive multi-page menu/dashboard
 *
 * Build a persistent menu where each "page" is a named view.
 * Navigation via buttons. Each view is a function that returns a CV2Builder.
 *
 * @example
 * const menu = new MenuCV2({ userId: interaction.user.id, color: 0x5865F2 });
 * menu
 *   .addView('home', (data) => new CV2Builder().addText('### 🏠 Home').addText('Welcome!'))
 *   .addView('stats', (data) => new CV2Builder().addText('### 📊 Stats').addText(`XP: ${data.xp}`))
 *   .addNav([
 *     { label: '🏠 Home', view: 'home' },
 *     { label: '📊 Stats', view: 'stats' },
 *   ]);
 * await menu.send(interaction);
 */
class MenuCV2 {
  /**
   * @param {object} opts
   * @param {string} opts.userId
   * @param {number|string} [opts.color]
   * @param {boolean} [opts.ephemeral=false]
   * @param {number} [opts.timeout=120000]
   * @param {object} [opts.data] - Shared data passed to view renderers
   */
  constructor(opts = {}) {
    if (!opts.userId) throw new TypeError('MenuCV2: userId is required');
    this.userId   = opts.userId;
    this.color    = opts.color    ?? null;
    this.ephemeral = opts.ephemeral ?? false;
    this.timeout  = opts.timeout  ?? 120_000;
    this.data     = opts.data     ?? {};

    this._views     = new Map(); // name → renderer fn
    this._navItems  = [];
    this._current   = null;
    this._id        = uniqueId('menu');
    this._message   = null;
  }

  /**
   * Register a view
   * @param {string} name
   * @param {Function} renderer - (data: object) => CV2Builder
   */
  addView(name, renderer) {
    if (typeof renderer !== 'function') {
      throw new TypeError(`MenuCV2#addView "${name}": renderer must be a function`);
    }
    this._views.set(name, renderer);
    if (!this._current) this._current = name;
    return this;
  }

  /**
   * Set navigation buttons
   * @param {Array<{label, view, style?, emoji?}>} items
   */
  addNav(items = []) {
    if (!Array.isArray(items) || items.length === 0) {
      throw new TypeError('MenuCV2#addNav: items must be a non-empty array');
    }
    this._navItems = items;
    return this;
  }

  /**
   * Send the menu
   * @param {import('discord.js').ChatInputCommandInteraction | import('discord.js').Message} target
   */
  async send(target) {
    if (this._views.size === 0) throw new Error('MenuCV2: no views registered');

    const isInteraction = !!target.token;
    const payload = this._buildPayload();

    if (isInteraction) {
      if (target.deferred || target.replied) {
        this._message = await target.editReply({ ...payload, fetchReply: true });
      } else {
        this._message = await target.reply({ ...payload, fetchReply: true });
      }
    } else {
      this._message = await target.channel.send(payload);
    }

    const collector = this._message.createMessageComponentCollector({
      filter: (i) => i.customId.startsWith(this._id) && i.user.id === this.userId,
      time: this.timeout,
    });

    collector.on('collect', async (interaction) => {
      const view = interaction.customId.replace(`${this._id}_view_`, '');
      if (this._views.has(view)) {
        this._current = view;
        await interaction.update(this._buildPayload());
      }
    });

    collector.on('end', async () => {
      try {
        await this._message.edit(this._buildPayload(true));
      } catch (_) {}
    });

    return this._message;
  }

  /** Update shared data and refresh current view */
  async update(interaction, newData = {}) {
    Object.assign(this.data, newData);
    await interaction.update(this._buildPayload());
  }

  // ─── Internal ─────────────────────────────────────────────────────────────

  _buildPayload(disabled = false) {
    const renderer = this._views.get(this._current);
    const builder = renderer(this.data);
    if (!(builder instanceof CV2Builder)) {
      throw new TypeError('MenuCV2: view renderer must return a CV2Builder');
    }
    if (this.color && !builder._accentColor) builder.setColor(this.color);

    // Nav buttons
    if (this._navItems.length > 0) {
      builder.addSeparator();
      const navBtns = this._navItems.map(item => ({
        label: item.label,
        customId: `${this._id}_view_${item.view}`,
        style: item.view === this._current ? 'Primary' : (item.style ?? 'Secondary'),
        emoji: item.emoji,
        disabled: disabled || item.view === this._current,
      }));
      builder.addButtons(navBtns.slice(0, 5));
    }

    return {
      components: [builder.build()],
      flags: this.ephemeral
        ? MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
        : MessageFlags.IsComponentsV2,
    };
  }
}

module.exports = MenuCV2;
