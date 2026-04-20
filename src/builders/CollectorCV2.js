'use strict';

const { MessageFlags } = require('discord.js');

/**
 * CollectorCV2 — smart component interaction collector
 *
 * Wraps createMessageComponentCollector with:
 * - Auto-filter by user and/or customId prefix
 * - Promise-based API for single-response flows
 * - Multi-collect support with event emitter pattern
 * - Auto-disable on timeout
 */
class CollectorCV2 {
  /**
   * @param {import('discord.js').Message} message
   * @param {object} opts
   * @param {string} [opts.userId] - Restrict to user
   * @param {string} [opts.prefix] - CustomId prefix filter
   * @param {number} [opts.timeout=60000]
   * @param {number} [opts.max] - Max interactions before auto-stop
   * @param {Function} [opts.filter] - Extra filter fn (i) => bool
   */
  constructor(message, opts = {}) {
    if (!message) throw new TypeError('CollectorCV2: message is required');
    this._message  = message;
    this._userId   = opts.userId  ?? null;
    this._prefix   = opts.prefix  ?? null;
    this._timeout  = opts.timeout ?? 60_000;
    this._max      = opts.max     ?? undefined;
    this._extraFilter = opts.filter ?? null;
    this._handlers = new Map();
    this._collector = null;
  }

  /**
   * Register a handler for a specific customId (exact or prefix)
   * @param {string} customId
   * @param {Function} handler - async (interaction) => void
   */
  on(customId, handler) {
    this._handlers.set(customId, handler);
    return this;
  }

  /**
   * Wait for a single specific interaction
   * @param {string} [prefix] - customId must start with this
   * @returns {Promise<import('discord.js').MessageComponentInteraction>}
   */
  awaitOne(prefix) {
    return new Promise((resolve, reject) => {
      const filter = (i) => {
        const userOk = this._userId ? i.user.id === this._userId : true;
        const prefixOk = prefix ? i.customId.startsWith(prefix) : true;
        return userOk && prefixOk;
      };

      this._message.awaitMessageComponent({ filter, time: this._timeout })
        .then(resolve)
        .catch(reject);
    });
  }

  /**
   * Start the collector (event-based)
   * @param {Function} [onEnd] - (collected, reason) => void
   */
  start(onEnd) {
    const filter = (i) => {
      const userOk   = this._userId ? i.user.id === this._userId : true;
      const prefixOk = this._prefix ? i.customId.startsWith(this._prefix) : true;
      const extraOk  = this._extraFilter ? this._extraFilter(i) : true;
      return userOk && prefixOk && extraOk;
    };

    this._collector = this._message.createMessageComponentCollector({
      filter,
      time: this._timeout,
      max: this._max,
    });

    this._collector.on('collect', async (interaction) => {
      // Find best handler match (exact first, then prefix)
      let handler = this._handlers.get(interaction.customId);
      if (!handler) {
        for (const [key, fn] of this._handlers) {
          if (interaction.customId.startsWith(key)) { handler = fn; break; }
        }
      }
      if (handler) {
        try { await handler(interaction); }
        catch (err) { console.error('[CollectorCV2] Handler error:', err); }
      }
    });

    if (onEnd) {
      this._collector.on('end', onEnd);
    }

    return this;
  }

  /** Stop the collector */
  stop(reason = 'manual') {
    this._collector?.stop(reason);
  }

  /** Get collected interactions */
  get collected() {
    return this._collector?.collected ?? null;
  }
}

module.exports = CollectorCV2;
