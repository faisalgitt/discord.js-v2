'use strict';

const CV2Builder = require('./CV2Builder');
const { MessageFlags } = require('discord.js');
const { uniqueId } = require('../utils/index');

/**
 * ConfirmCV2 — advanced confirmation dialog
 *
 * Features:
 * - Confirm / Cancel / Custom buttons
 * - Optional countdown display
 * - Restrict to interaction user or custom userId
 * - Returns result + the button interaction for followups
 */
class ConfirmCV2 {
  /**
   * @param {object} opts
   * @param {string} opts.question - The prompt text
   * @param {string} [opts.confirmLabel='✅ Confirm']
   * @param {string} [opts.cancelLabel='❌ Cancel']
   * @param {string} [opts.confirmStyle='Success']
   * @param {string} [opts.cancelStyle='Danger']
   * @param {number} [opts.timeout=30000]
   * @param {string} [opts.userId]
   * @param {number|string} [opts.color]
   * @param {boolean} [opts.ephemeral=true]
   * @param {boolean} [opts.showTimeout=false] - Show timeout seconds in footer
   * @param {string} [opts.confirmedText='✅ Confirmed.']
   * @param {string} [opts.cancelledText='❌ Cancelled.']
   * @param {string} [opts.timedOutText='-# ⏱ Confirmation timed out.']
   */
  constructor(opts = {}) {
    if (!opts.question) throw new TypeError('ConfirmCV2: question is required');

    this.question = opts.question;
    this.confirmLabel = opts.confirmLabel ?? '✅ Confirm';
    this.cancelLabel  = opts.cancelLabel  ?? '❌ Cancel';
    this.confirmStyle = opts.confirmStyle ?? 'Success';
    this.cancelStyle  = opts.cancelStyle  ?? 'Danger';
    this.timeout      = opts.timeout      ?? 30_000;
    this.userId       = opts.userId       ?? null;
    this.color        = opts.color        ?? null;
    this.ephemeral    = opts.ephemeral    ?? true;
    this.showTimeout  = opts.showTimeout  ?? false;

    this.confirmedText = opts.confirmedText ?? '✅ Confirmed.';
    this.cancelledText = opts.cancelledText ?? '❌ Cancelled.';
    this.timedOutText  = opts.timedOutText  ?? '-# ⏱ Confirmation timed out.';

    this._id = uniqueId('conf');
  }

  /**
   * Ask the confirmation question
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   * @returns {Promise<{ confirmed: boolean, interaction: import('discord.js').ButtonInteraction | null }>}
   */
  async ask(interaction) {
    const restrictTo = this.userId ?? interaction.user.id;
    const payload = this._buildPayload();

    let message;
    if (interaction.deferred || interaction.replied) {
      message = await interaction.editReply({ ...payload, fetchReply: true });
    } else {
      message = await interaction.reply({ ...payload, fetchReply: true });
    }

    return new Promise((resolve) => {
      const collector = message.createMessageComponentCollector({
        filter: (i) => i.customId.startsWith(this._id) && i.user.id === restrictTo,
        time: this.timeout,
        max: 1,
      });

      collector.on('collect', async (i) => {
        const confirmed = i.customId.endsWith('_yes');
        const responseText = confirmed ? this.confirmedText : this.cancelledText;
        const b = this._resultBuilder(responseText);
        await i.update({ components: [b.build()], flags: MessageFlags.IsComponentsV2 });
        resolve({ confirmed, interaction: i });
      });

      collector.on('end', async (collected) => {
        if (collected.size === 0) {
          try {
            const b = this._resultBuilder(this.timedOutText);
            await message.edit({ components: [b.build()], flags: MessageFlags.IsComponentsV2 });
          } catch (_) {}
          resolve({ confirmed: false, interaction: null });
        }
      });
    });
  }

  // ─── Internal ─────────────────────────────────────────────────────────────────

  _buildPayload() {
    const b = new CV2Builder();
    if (this.color) b.setColor(this.color);
    b.addText(this.question);
    if (this.showTimeout) {
      b.addSeparator({ divider: false });
      b.addText(`-# Expires in ${Math.round(this.timeout / 1000)}s`);
    }
    b.addSeparator();
    b.addButtons([
      { label: this.confirmLabel, customId: `${this._id}_yes`, style: this.confirmStyle },
      { label: this.cancelLabel,  customId: `${this._id}_no`,  style: this.cancelStyle  },
    ]);
    return {
      components: [b.build()],
      flags: this.ephemeral
        ? MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
        : MessageFlags.IsComponentsV2,
    };
  }

  _resultBuilder(text) {
    const b = new CV2Builder();
    if (this.color) b.setColor(this.color);
    b.addText(text);
    return b;
  }
}

module.exports = ConfirmCV2;
