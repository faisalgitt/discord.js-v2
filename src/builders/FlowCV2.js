'use strict';

const CV2Builder = require('./CV2Builder');
const { MessageFlags } = require('discord.js');
const { uniqueId } = require('../utils/index');

/**
 * FlowCV2 — advanced multi-step interaction flow manager
 *
 * Features:
 * - Named steps with conditional routing (goto)
 * - Persistent data store across steps
 * - Global before/after hooks
 * - Flow timeout with cleanup
 * - Step history / back navigation
 * - Error boundary per step
 */
class FlowCV2 {
  /**
   * @param {object} opts
   * @param {string} opts.userId
   * @param {number} [opts.timeout=300000]
   * @param {number|string} [opts.color]
   * @param {boolean} [opts.ephemeral=true]
   * @param {Function} [opts.onError] - (err, step, flow) => void
   * @param {Function} [opts.onComplete] - (data, flow) => void
   * @param {Function} [opts.onAbort] - (reason, flow) => void
   */
  constructor(opts = {}) {
    if (!opts.userId) throw new TypeError('FlowCV2: userId is required');

    this.userId   = opts.userId;
    this.timeout  = opts.timeout  ?? 300_000;
    this.color    = opts.color    ?? null;
    this.ephemeral = opts.ephemeral ?? true;
    this.onError    = opts.onError    ?? null;
    this.onComplete = opts.onComplete ?? null;
    this.onAbort    = opts.onAbort    ?? null;

    this._steps    = new Map(); // name → handler
    this._order    = [];
    this._data     = {};
    this._history  = [];
    this._current  = 0;
    this._id       = uniqueId('flow');
    this._timer    = null;
    this._resolve  = null;
    this._reject   = null;
    this._started  = false;
  }

  // ─── API ───────────────────────────────────────────────────────────────────

  /**
   * Register a step
   * @param {string} name
   * @param {Function} handler - async (i, data, flow) => void
   */
  addStep(name, handler) {
    if (typeof handler !== 'function') {
      throw new TypeError(`FlowCV2#addStep "${name}": handler must be a function`);
    }
    if (this._steps.has(name)) {
      throw new Error(`FlowCV2#addStep: step "${name}" already registered`);
    }
    this._steps.set(name, handler);
    this._order.push(name);
    return this;
  }

  /**
   * Start the flow
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   * @returns {Promise<object>} collected data
   */
  async start(interaction) {
    if (this._started) throw new Error('FlowCV2: already started');
    this._started = true;
    this._current = 0;

    return new Promise(async (resolve, reject) => {
      this._resolve = resolve;
      this._reject = reject;

      this._timer = setTimeout(async () => {
        this._reject(new Error('FlowCV2: timed out'));
        if (this.onAbort) await this.onAbort('timeout', this);
        await this._sendTimedOut(interaction).catch(() => {});
      }, this.timeout);

      await this._runStep(interaction, 0);
    });
  }

  /**
   * Advance to the next step (auto)
   */
  async next(interaction, stepData = {}) {
    Object.assign(this._data, stepData);
    this._history.push(this._current);
    this._current++;

    if (this._current >= this._order.length) {
      return this._finish(interaction);
    }

    await this._runStep(interaction, this._current);
  }

  /**
   * Jump to a specific named step
   */
  async goto(interaction, stepName, stepData = {}) {
    const idx = this._order.indexOf(stepName);
    if (idx === -1) throw new Error(`FlowCV2#goto: step "${stepName}" not found`);
    Object.assign(this._data, stepData);
    this._history.push(this._current);
    this._current = idx;
    await this._runStep(interaction, idx);
  }

  /**
   * Go back to the previous step
   */
  async back(interaction) {
    if (this._history.length === 0) return;
    this._current = this._history.pop();
    await this._runStep(interaction, this._current);
  }

  /**
   * Finish the flow manually
   */
  async finish(interaction, finalData = {}) {
    Object.assign(this._data, finalData);
    await this._finish(interaction);
  }

  /**
   * Abort the flow
   */
  async abort(interaction, reason = 'Cancelled') {
    clearTimeout(this._timer);
    const b = this._base().addText(`❌ ${reason}`);
    await this._update(interaction, b);
    if (this.onAbort) await this.onAbort(reason, this);
    this._reject(new Error(`FlowCV2 aborted: ${reason}`));
  }

  // ─── Data helpers ─────────────────────────────────────────────────────────

  /** Get a copy of collected data */
  getData() { return { ...this._data }; }

  /** Set a value in data store */
  set(key, value) { this._data[key] = value; return this; }

  /** Get a value from data store */
  get(key) { return this._data[key]; }

  /** Unique ID prefix for customIds */
  getId() { return this._id; }

  /** Current step name */
  get currentStep() { return this._order[this._current]; }

  /** Current step index */
  get currentIndex() { return this._current; }

  /** Total steps */
  get totalSteps() { return this._order.length; }

  /** Step progress (0.0 → 1.0) */
  get progress() { return this._order.length > 0 ? this._current / this._order.length : 0; }

  /**
   * Build a progress bar text
   * @param {number} [width=10]
   */
  progressBar(width = 10) {
    const filled = Math.round(this.progress * width);
    return '█'.repeat(filled) + '░'.repeat(width - filled) +
      ` ${this._current}/${this._order.length}`;
  }

  // ─── Utility builders ─────────────────────────────────────────────────────

  /** Create a base CV2Builder with flow color applied */
  _base() {
    const b = new CV2Builder();
    if (this.color) b.setColor(this.color);
    return b;
  }

  async _update(interaction, builder) {
    const payload = {
      components: [builder.build()],
      flags: this.ephemeral
        ? MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
        : MessageFlags.IsComponentsV2,
    };
    try {
      if (interaction.isButton?.() || interaction.isStringSelectMenu?.()) {
        if (!interaction.deferred && !interaction.replied) {
          await interaction.update(payload);
        } else {
          await interaction.editReply(payload);
        }
      } else {
        if (interaction.deferred || interaction.replied) {
          await interaction.editReply(payload);
        } else {
          await interaction.reply(payload);
        }
      }
    } catch (err) {
      if (err.code !== 10062) throw err;
    }
  }

  async _runStep(interaction, index) {
    const name = this._order[index];
    const handler = this._steps.get(name);
    try {
      await handler(interaction, this._data, this);
    } catch (err) {
      if (this.onError) {
        await this.onError(err, name, this);
      } else {
        clearTimeout(this._timer);
        this._reject(err);
      }
    }
  }

  async _finish(interaction) {
    clearTimeout(this._timer);
    if (this.onComplete) await this.onComplete(this._data, this);
    this._resolve(this._data);
  }

  async _sendTimedOut(interaction) {
    const b = this._base().addText('-# ⏱ This flow has timed out.');
    await this._update(interaction, b).catch(() => {});
  }
}

module.exports = FlowCV2;
