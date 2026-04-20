'use strict';

const CV2Builder = require('./CV2Builder');
const { MessageFlags, ComponentType } = require('discord.js');
const { uniqueId } = require('../utils/index');

/**
 * PaginatedCV2 — advanced Components V2 paginator
 *
 * Features:
 * - Auto next/prev/first/last navigation
 * - Page jump (select menu on large datasets)
 * - Custom page renderer function
 * - Per-user access restriction
 * - Idle timeout with graceful disable
 * - Compact mode (fewer buttons)
 */
class PaginatedCV2 {
  /**
   * @param {object} opts
   * @param {any[]} opts.items - Raw items to paginate
   * @param {number} [opts.perPage=10] - Items per page
   * @param {Function} [opts.render] - (items: any[], page: number, total: number) => CV2Builder
   * @param {number} [opts.timeout=60000]
   * @param {string} [opts.userId] - Restrict to user
   * @param {number|string} [opts.color]
   * @param {boolean} [opts.ephemeral=false]
   * @param {boolean} [opts.showJump=true] - Show page-jump select on > 5 pages
   * @param {boolean} [opts.compact=false] - Only show prev/next buttons
   * @param {object} [opts.labels] - Custom button labels
   * @param {string} [opts.emptyMessage] - Message when items is empty
   */
  constructor(opts = {}) {
    if (!opts.items || !Array.isArray(opts.items)) {
      throw new TypeError('PaginatedCV2: items must be an array');
    }

    this.allItems = opts.items;
    this.perPage = opts.perPage ?? 10;
    this.render = opts.render ?? null;
    this.timeout = opts.timeout ?? 60_000;
    this.userId = opts.userId ?? null;
    this.color = opts.color ?? null;
    this.ephemeral = opts.ephemeral ?? false;
    this.showJump = opts.showJump ?? true;
    this.compact = opts.compact ?? false;
    this.emptyMessage = opts.emptyMessage ?? 'No items to display.';
    this.labels = {
      first: opts.labels?.first ?? '⏮',
      prev:  opts.labels?.prev  ?? '◀',
      next:  opts.labels?.next  ?? '▶',
      last:  opts.labels?.last  ?? '⏭',
      close: opts.labels?.close ?? '✖',
    };

    this.currentPage = 0;
    this._id = uniqueId('pgcv2');
    this._message = null;
  }

  /** Total pages */
  get totalPages() {
    return Math.max(1, Math.ceil(this.allItems.length / this.perPage));
  }

  /** Items on current page */
  get pageItems() {
    const start = this.currentPage * this.perPage;
    return this.allItems.slice(start, start + this.perPage);
  }

  /**
   * Send paginated response
   * @param {import('discord.js').ChatInputCommandInteraction | import('discord.js').Message} target
   * @returns {Promise<import('discord.js').Message>}
   */
  async send(target) {
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

    if (this.totalPages <= 1) return this._message;

    const collector = this._message.createMessageComponentCollector({
      filter: (i) => {
        const valid = i.customId.startsWith(this._id);
        const userOk = this.userId ? i.user.id === this.userId : true;
        return valid && userOk;
      },
      time: this.timeout,
    });

    collector.on('collect', async (interaction) => {
      const action = interaction.customId.replace(`${this._id}_`, '');

      if (action === 'close') {
        collector.stop('closed');
        await interaction.update(this._disabledPayload('Closed.'));
        return;
      }

      if (action.startsWith('jump_')) {
        this.currentPage = parseInt(action.replace('jump_', ''), 10);
      } else {
        switch (action) {
          case 'first': this.currentPage = 0; break;
          case 'prev':  this.currentPage = Math.max(0, this.currentPage - 1); break;
          case 'next':  this.currentPage = Math.min(this.totalPages - 1, this.currentPage + 1); break;
          case 'last':  this.currentPage = this.totalPages - 1; break;
        }
      }

      await interaction.update(this._buildPayload());
    });

    collector.on('end', async (_, reason) => {
      if (reason === 'closed') return;
      try {
        await this._message.edit(this._disabledPayload('Timed out.'));
      } catch (_) {}
    });

    return this._message;
  }

  // ─── Internal ─────────────────────────────────────────────────────────────────

  _buildPayload() {
    let builder;

    if (this.allItems.length === 0) {
      builder = new CV2Builder();
      if (this.color) builder.setColor(this.color);
      builder.addText(this.emptyMessage);
      return this._toPayload(builder);
    }

    if (this.render) {
      builder = this.render(this.pageItems, this.currentPage, this.totalPages);
      if (!(builder instanceof CV2Builder)) {
        throw new TypeError('PaginatedCV2: render() must return a CV2Builder instance');
      }
    } else {
      builder = new CV2Builder();
      if (this.color) builder.setColor(this.color);
      builder.addText(this.pageItems.join('\n'));
    }

    // Footer
    builder.addSeparator({ divider: true, spacing: 'small' });
    builder.addText(`-# Page **${this.currentPage + 1}** / **${this.totalPages}** · ${this.allItems.length} items`);

    // Nav buttons
    if (this.compact) {
      builder.addButtons([
        { label: this.labels.prev,  customId: `${this._id}_prev`,  style: 'Primary',   disabled: this.currentPage === 0 },
        { label: this.labels.next,  customId: `${this._id}_next`,  style: 'Primary',   disabled: this.currentPage === this.totalPages - 1 },
        { label: this.labels.close, customId: `${this._id}_close`, style: 'Danger' },
      ]);
    } else {
      builder.addButtons([
        { label: this.labels.first, customId: `${this._id}_first`, style: 'Secondary', disabled: this.currentPage === 0 },
        { label: this.labels.prev,  customId: `${this._id}_prev`,  style: 'Primary',   disabled: this.currentPage === 0 },
        { label: this.labels.next,  customId: `${this._id}_next`,  style: 'Primary',   disabled: this.currentPage === this.totalPages - 1 },
        { label: this.labels.last,  customId: `${this._id}_last`,  style: 'Secondary', disabled: this.currentPage === this.totalPages - 1 },
        { label: this.labels.close, customId: `${this._id}_close`, style: 'Danger' },
      ]);
    }

    // Jump select menu for > 5 pages
    if (this.showJump && this.totalPages > 5 && this.totalPages <= 25) {
      builder.addStringSelect({
        customId: `${this._id}_jump_select`,
        placeholder: `Jump to page...`,
        options: Array.from({ length: this.totalPages }, (_, i) => ({
          label: `Page ${i + 1}`,
          value: `${this._id}_jump_${i}`,
          default: i === this.currentPage,
        })),
      });
    }

    return this._toPayload(builder);
  }

  _toPayload(builder) {
    return {
      components: [builder.build()],
      flags: this.ephemeral
        ? MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
        : MessageFlags.IsComponentsV2,
    };
  }

  _disabledPayload(reason) {
    const b = new CV2Builder();
    if (this.color) b.setColor(this.color);
    b.addText(`-# ${reason}`);
    return this._toPayload(b);
  }
}

module.exports = PaginatedCV2;
