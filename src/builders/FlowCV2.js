'use strict';

const CV2Builder = require('./CV2Builder');
const { MessageFlags, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');

/**
 * FlowCV2 — multi-step interaction flow manager
 * Manage setup wizards, onboarding, multi-step forms using CV2
 *
 * @example
 * const flow = new FlowCV2({ userId: interaction.user.id });
 * flow
 *   .addStep('welcome', async (i, data) => {
 *     // show welcome screen, return next step trigger
 *   })
 *   .addStep('config', async (i, data) => {
 *     // show config screen
 *   });
 * await flow.start(interaction);
 */
class FlowCV2 {
  /**
   * @param {object} options
   * @param {string} options.userId - User running the flow
   * @param {number} [options.timeout=300000] - Total flow timeout (5 min default)
   * @param {number|string} [options.color]
   * @param {boolean} [options.ephemeral=true]
   */
  constructor(options = {}) {
    if (!options.userId) throw new TypeError('FlowCV2: userId is required');

    this.userId = options.userId;
    this.timeout = options.timeout ?? 300_000;
    this.color = options.color ?? null;
    this.ephemeral = options.ephemeral ?? true;

    this._steps = new Map();
    this._stepOrder = [];
    this._data = {};
    this._currentStep = 0;
    this._id = `flow_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    this._interaction = null;
    this._message = null;
    this._resolve = null;
    this._reject = null;
    this._timer = null;
  }

  /**
   * Add a step to the flow
   * @param {string} name - Step name
   * @param {Function} handler - async (interaction, data, flow) => void
   */
  addStep(name, handler) {
    if (typeof handler !== 'function') throw new TypeError(`FlowCV2#addStep: handler for "${name}" must be a function`);
    this._steps.set(name, handler);
    this._stepOrder.push(name);
    return this;
  }

  /**
   * Start the flow
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   * @returns {Promise<object>} Collected data from all steps
   */
  async start(interaction) {
    this._interaction = interaction;

    return new Promise(async (resolve, reject) => {
      this._resolve = resolve;
      this._reject = reject;

      this._timer = setTimeout(() => {
        this._reject(new Error('FlowCV2: timed out'));
        this._sendTimedOut();
      }, this.timeout);

      await this._runStep(interaction, 0);
    });
  }

  /**
   * Advance to the next step (call from within a step handler)
   * @param {import('discord.js').ButtonInteraction} interaction
   * @param {object} [stepData] - Data collected in this step
   */
  async next(interaction, stepData = {}) {
    Object.assign(this._data, stepData);
    this._currentStep++;

    if (this._currentStep >= this._stepOrder.length) {
      clearTimeout(this._timer);
      this._resolve(this._data);
      return;
    }

    await this._runStep(interaction, this._currentStep);
  }

  /**
   * Abort the flow early
   * @param {import('discord.js').ButtonInteraction} interaction
   * @param {string} [reason='Cancelled']
   */
  async abort(interaction, reason = 'Cancelled') {
    clearTimeout(this._timer);
    const builder = this._baseBuilder().addText(`❌ ${reason}`);
    await this._update(interaction, builder);
    this._reject(new Error(`FlowCV2 aborted: ${reason}`));
  }

  /**
   * Get current collected data
   */
  getData() {
    return { ...this._data };
  }

  /**
   * Get the unique flow ID prefix (use for customId in buttons)
   */
  getId() {
    return this._id;
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  _baseBuilder() {
    const b = new CV2Builder();
    if (this.color) b.setColor(this.color);
    return b;
  }

  async _runStep(interaction, index) {
    const name = this._stepOrder[index];
    const handler = this._steps.get(name);
    try {
      await handler(interaction, this._data, this);
    } catch (err) {
      clearTimeout(this._timer);
      this._reject(err);
    }
  }

  async _update(interaction, builder) {
    const payload = {
      components: [builder.build()],
      flags: MessageFlags.IsComponentsV2,
    };
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply(payload);
    } else {
      await interaction.update(payload);
    }
  }

  async _sendTimedOut() {
    try {
      const builder = this._baseBuilder().addText('-# ⏱ This flow has timed out.');
      if (this._message) {
        await this._message.edit({
          components: [builder.build()],
          flags: MessageFlags.IsComponentsV2,
        });
      }
    } catch (_) {}
  }
}

module.exports = FlowCV2;
