'use strict';

const CV2Builder = require('./CV2Builder');
const { MessageFlags } = require('discord.js');

/**
 * ConfirmCV2 — Components V2 confirmation dialog
 * Ask user to confirm/cancel an action with a clean CV2 UI
 */
class ConfirmCV2 {
  /**
   * @param {object} options
   * @param {string} options.question - The confirmation prompt text
   * @param {string} [options.confirmLabel='✅ Confirm']
   * @param {string} [options.cancelLabel='❌ Cancel']
   * @param {number} [options.timeout=30000]
   * @param {string} [options.userId] - Restrict to specific user
   * @param {number|string} [options.color]
   * @param {boolean} [options.ephemeral=true]
   */
  constructor(options = {}) {
    if (!options.question) throw new TypeError('ConfirmCV2: question is required');

    this.question = options.question;
    this.confirmLabel = options.confirmLabel ?? '✅ Confirm';
    this.cancelLabel = options.cancelLabel ?? '❌ Cancel';
    this.timeout = options.timeout ?? 30_000;
    this.userId = options.userId ?? null;
    this.color = options.color ?? null;
    this.ephemeral = options.ephemeral ?? true;

    this._id = `confirm_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  }

  /**
   * Send confirmation and wait for response
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   * @returns {Promise<boolean>} true = confirmed, false = cancelled/timed out
   */
  async ask(interaction) {
    const builder = new CV2Builder();
    if (this.color) builder.setColor(this.color);

    builder
      .addText(this.question)
      .addSeparator()
      .addButtons([
        { label: this.confirmLabel, customId: `${this._id}_yes`, style: 'Success' },
        { label: this.cancelLabel, customId: `${this._id}_no`, style: 'Danger' },
      ]);

    const payload = {
      components: [builder.build()],
      flags: this.ephemeral
        ? MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
        : MessageFlags.IsComponentsV2,
      fetchReply: true,
    };

    let message;
    if (interaction.deferred || interaction.replied) {
      message = await interaction.editReply(payload);
    } else {
      message = await interaction.reply(payload);
    }

    return new Promise((resolve) => {
      const collector = message.createMessageComponentCollector({
        filter: (i) => {
          const validId = i.customId.startsWith(this._id);
          const validUser = this.userId ? i.user.id === this.userId : i.user.id === interaction.user.id;
          return validId && validUser;
        },
        time: this.timeout,
        max: 1,
      });

      collector.on('collect', async (i) => {
        const confirmed = i.customId.endsWith('_yes');
        const responseBuilder = new CV2Builder();
        if (this.color) responseBuilder.setColor(this.color);
        responseBuilder.addText(confirmed ? '✅ Confirmed.' : '❌ Cancelled.');

        await i.update({
          components: [responseBuilder.build()],
          flags: MessageFlags.IsComponentsV2,
        });

        resolve(confirmed);
      });

      collector.on('end', (collected) => {
        if (collected.size === 0) resolve(false);
      });
    });
  }
}

module.exports = ConfirmCV2;
