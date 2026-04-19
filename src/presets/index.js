'use strict';

const CV2Builder = require('../builders/CV2Builder');
const { MessageFlags } = require('discord.js');

/**
 * Presets — ready-made CV2 response templates
 * Quick helpers for common bot response patterns
 */
const Presets = {

  /**
   * Success message
   * @param {string} message
   * @param {object} [options]
   * @param {string} [options.title]
   * @param {boolean} [options.ephemeral=false]
   * @param {number|string} [options.color=0x57F287]
   */
  success(message, { title, ephemeral = false, color = 0x57F287 } = {}) {
    const b = new CV2Builder().setColor(color);
    if (title) b.addText(`### ✅ ${title}`).addSeparator({ divider: false });
    b.addText(message);
    return _toPayload(b, ephemeral);
  },

  /**
   * Error message
   * @param {string} message
   * @param {object} [options]
   * @param {string} [options.title]
   * @param {boolean} [options.ephemeral=true]
   * @param {number|string} [options.color=0xED4245]
   */
  error(message, { title, ephemeral = true, color = 0xED4245 } = {}) {
    const b = new CV2Builder().setColor(color);
    if (title) b.addText(`### ❌ ${title}`).addSeparator({ divider: false });
    b.addText(message);
    return _toPayload(b, ephemeral);
  },

  /**
   * Warning message
   * @param {string} message
   * @param {object} [options]
   * @param {boolean} [options.ephemeral=true]
   * @param {number|string} [options.color=0xFEE75C]
   */
  warn(message, { ephemeral = true, color = 0xFEE75C } = {}) {
    const b = new CV2Builder().setColor(color).addText(`⚠️ ${message}`);
    return _toPayload(b, ephemeral);
  },

  /**
   * Info message
   * @param {string} message
   * @param {object} [options]
   * @param {boolean} [options.ephemeral=false]
   * @param {number|string} [options.color=0x5865F2]
   */
  info(message, { ephemeral = false, color = 0x5865F2 } = {}) {
    const b = new CV2Builder().setColor(color).addText(`ℹ️ ${message}`);
    return _toPayload(b, ephemeral);
  },

  /**
   * Loading/processing state
   * @param {string} [message='Please wait...']
   * @param {number|string} [color=0x99AAB5]
   */
  loading(message = 'Please wait...', color = 0x99AAB5) {
    const b = new CV2Builder().setColor(color).addText(`⏳ ${message}`);
    return _toPayload(b, false);
  },

  /**
   * User profile card
   * @param {object} options
   * @param {string} options.name
   * @param {string} options.avatar
   * @param {string[]} options.fields - ['**Label**: Value', ...]
   * @param {boolean} [options.ephemeral=false]
   * @param {number|string} [options.color=0x5865F2]
   */
  profile({ name, avatar, fields = [], ephemeral = false, color = 0x5865F2 } = {}) {
    if (!name) throw new TypeError('Presets.profile: name is required');
    const b = new CV2Builder().setColor(color);
    b.addSection({
      text: `### ${name}`,
      thumbnail: avatar,
    });
    if (fields.length > 0) {
      b.addSeparator();
      b.addText(fields.join('\n'));
    }
    return _toPayload(b, ephemeral);
  },

  /**
   * Moderation action card
   * @param {object} options
   * @param {'ban'|'kick'|'mute'|'warn'|'unban'|'unmute'} options.action
   * @param {string} options.target - Target user mention or name
   * @param {string} options.moderator - Moderator mention or name
   * @param {string} [options.reason='No reason provided']
   * @param {string} [options.duration] - For mutes
   * @param {boolean} [options.ephemeral=false]
   */
  modAction({ action, target, moderator, reason = 'No reason provided', duration, ephemeral = false } = {}) {
    const config = {
      ban: { emoji: '🔨', label: 'Banned', color: 0xED4245 },
      kick: { emoji: '👢', label: 'Kicked', color: 0xFEE75C },
      mute: { emoji: '🔇', label: 'Muted', color: 0xFF7F50 },
      warn: { emoji: '⚠️', label: 'Warned', color: 0xFEE75C },
      unban: { emoji: '✅', label: 'Unbanned', color: 0x57F287 },
      unmute: { emoji: '🔊', label: 'Unmuted', color: 0x57F287 },
    };

    const c = config[action] ?? { emoji: '🛡️', label: action, color: 0x5865F2 };
    const b = new CV2Builder().setColor(c.color);

    b.addText(`### ${c.emoji} ${c.label}`);
    b.addSeparator();
    b.addText([
      `**Target:** ${target}`,
      `**Moderator:** ${moderator}`,
      `**Reason:** ${reason}`,
      duration ? `**Duration:** ${duration}` : null,
    ].filter(Boolean).join('\n'));

    return _toPayload(b, ephemeral);
  },

  /**
   * Leaderboard
   * @param {object} options
   * @param {string} options.title
   * @param {Array<{rank: number, name: string, value: string|number}>} options.entries
   * @param {boolean} [options.ephemeral=false]
   * @param {number|string} [options.color=0xF1C40F]
   */
  leaderboard({ title, entries = [], ephemeral = false, color = 0xF1C40F } = {}) {
    if (!title) throw new TypeError('Presets.leaderboard: title is required');
    if (!entries.length) throw new TypeError('Presets.leaderboard: entries cannot be empty');

    const medals = ['🥇', '🥈', '🥉'];
    const b = new CV2Builder().setColor(color);
    b.addText(`### 🏆 ${title}`);
    b.addSeparator();

    const lines = entries.map((e, i) => {
      const medal = medals[i] ?? `**${e.rank ?? i + 1}.**`;
      return `${medal} ${e.name} — ${e.value}`;
    });

    b.addText(lines.join('\n'));
    return _toPayload(b, ephemeral);
  },

};

// ─── Internal ──────────────────────────────────────────────────────────────────

function _toPayload(builder, ephemeral) {
  return {
    components: [builder.build()],
    flags: ephemeral
      ? MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
      : MessageFlags.IsComponentsV2,
  };
}

module.exports = Presets;
