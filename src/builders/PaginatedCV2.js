'use strict';

const CV2Builder = require('./CV2Builder');
const { ButtonStyle, MessageFlags } = require('discord.js');

/**
 * PaginatedCV2 — paginated Components V2 handler
 * Splits content into pages and handles button interactions automatically
 */
class PaginatedCV2 {
  /**
   * @param {object} options
   * @param {string[][]} options.pages - Array of pages; each page is array of text blocks
   * @param {number} [options.timeout=60000] - Collector timeout in ms
   * @param {string} [options.userId] - Restrict to specific user (optional)
   * @param {number|string} [options.color] - Accent color
   * @param {boolean} [options.ephemeral=false]
   * @param {object} [options.buttons] - Custom button labels { first, prev, next, last, close }
   */
  constructor(options = {}) {
    if (!options.pages || !Array.isArray(options.pages) || options.pages.length === 0) {
      throw new TypeError('PaginatedCV2: pages must be a non-empty array');
    }

    this.pages = options.pages;
    this.timeout = options.timeout ?? 60_000;
    this.userId = options.userId ?? null;
    this.color = options.color ?? null;
    this.ephemeral = options.ephemeral ?? false;
    this.currentPage = 0;

    this.btnLabels = {
      first: options.buttons?.first ?? '⏮',
      prev: options.buttons?.prev ?? '◀',
      next: options.buttons?.next ?? '▶',
      last: options.buttons?.last ?? '⏭',
      close: options.buttons?.close ?? '✖',
    };

    this._id = `pgcv2_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  }

  /**
   * Send paginated response
   * @param {import('discord.js').ChatInputCommandInteraction | import('discord.js').Message} target
   */
  async send(target) {
    const isInteraction = typeof target.reply === 'function' && target.token !== undefined;
    const payload = this._buildPayload();

    let message;
    if (isInteraction) {
      if (target.deferred || target.replied) {
        message = await target.editReply(payload);
      } else {
        message = await target.reply({ ...payload, fetchReply: true });
      }
    } else {
      message = await target.channel.send(payload);
    }

    if (this.pages.length <= 1) return message;

    const collector = message.createMessageComponentCollector({
      filter: (i) => {
        const validId = i.customId.startsWith(this._id);
        const validUser = this.userId ? i.user.id === this.userId : true;
        return validId && validUser;
      },
      time: this.timeout,
    });

    collector.on('collect', async (interaction) => {
      const action = interaction.customId.replace(`${this._id}_`, '');

      switch (action) {
        case 'first': this.currentPage = 0; break;
        case 'prev': this.currentPage = Math.max(0, this.currentPage - 1); break;
        case 'next': this.currentPage = Math.min(this.pages.length - 1, this.currentPage + 1); break;
        case 'last': this.currentPage = this.pages.length - 1; break;
        case 'close':
          collector.stop('closed');
          await interaction.update(this._buildDisabledPayload('Closed.'));
          return;
      }

      await interaction.update(this._buildPayload());
    });

    collector.on('end', async (_, reason) => {
      if (reason === 'closed') return;
      try {
        await message.edit(this._buildDisabledPayload('Timed out.'));
      } catch (_) {}
    });

    return message;
  }

  // ─── Internal ────────────────────────────────────────────────────────────────

  _buildPayload() {
    const page = this.pages[this.currentPage];
    const builder = new CV2Builder();

    if (this.color) builder.setColor(this.color);

    // Add page content
    if (Array.isArray(page)) {
      for (const block of page) {
        builder.addText(block);
        builder.addSeparator({ divider: false });
      }
    } else {
      builder.addText(String(page));
    }

    // Page indicator
    builder.addSeparator();
    builder.addText(`-# Page ${this.currentPage + 1} / ${this.pages.length}`);

    // Navigation buttons
    if (this.pages.length > 1) {
      builder.addButtons([
        {
          label: this.btnLabels.first,
          customId: `${this._id}_first`,
          style: 'Secondary',
          disabled: this.currentPage === 0,
        },
        {
          label: this.btnLabels.prev,
          customId: `${this._id}_prev`,
          style: 'Primary',
          disabled: this.currentPage === 0,
        },
        {
          label: this.btnLabels.next,
          customId: `${this._id}_next`,
          style: 'Primary',
          disabled: this.currentPage === this.pages.length - 1,
        },
        {
          label: this.btnLabels.last,
          customId: `${this._id}_last`,
          style: 'Secondary',
          disabled: this.currentPage === this.pages.length - 1,
        },
        {
          label: this.btnLabels.close,
          customId: `${this._id}_close`,
          style: 'Danger',
        },
      ]);
    }

    return {
      components: [builder.build()],
      flags: this.ephemeral
        ? MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
        : MessageFlags.IsComponentsV2,
    };
  }

  _buildDisabledPayload(reason) {
    const builder = new CV2Builder();
    if (this.color) builder.setColor(this.color);
    builder.addText(`-# ${reason}`);
    return {
      components: [builder.build()],
      flags: MessageFlags.IsComponentsV2,
    };
  }
}

module.exports = PaginatedCV2;
