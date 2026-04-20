'use strict';

const { MessageFlags } = require('discord.js');

// ─── Array helpers ────────────────────────────────────────────────────────────

/**
 * Chunk array into pages
 * @param {any[]} array
 * @param {number} size
 * @returns {any[][]}
 */
function chunkArray(array, size) {
  if (!Array.isArray(array)) throw new TypeError('chunkArray: array must be an array');
  if (size < 1) throw new RangeError('chunkArray: size must be >= 1');
  const out = [];
  for (let i = 0; i < array.length; i += size) out.push(array.slice(i, i + size));
  return out;
}

/**
 * Convert items to formatted page string arrays (ready for PaginatedCV2)
 * @param {any[]} items
 * @param {object} [opts]
 * @param {number} [opts.perPage=10]
 * @param {Function} [opts.format] - (item, index) => string
 * @returns {string[][]}
 */
function itemsToPages(items, { perPage = 10, format } = {}) {
  if (!Array.isArray(items)) throw new TypeError('itemsToPages: items must be an array');
  const fmt = format ?? ((item, i) => `**${i + 1}.** ${item}`);
  return chunkArray(items, perPage).map((chunk, pageIdx) =>
    chunk.map((item, i) => fmt(item, pageIdx * perPage + i))
  );
}

// ─── Flag helpers ─────────────────────────────────────────────────────────────

/**
 * Build IsComponentsV2 flags value
 * @param {object} [opts]
 * @param {boolean} [opts.ephemeral=false]
 * @returns {number}
 */
function cv2Flags({ ephemeral = false } = {}) {
  return ephemeral
    ? MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
    : MessageFlags.IsComponentsV2;
}

// ─── Safe interaction helpers ────────────────────────────────────────────────

/**
 * Safe interaction reply — handles deferred/replied/fresh states
 * @param {import('discord.js').ChatInputCommandInteraction} interaction
 * @param {object} payload
 * @param {boolean} [fetchReply=false]
 */
async function safeReply(interaction, payload, fetchReply = false) {
  try {
    if (interaction.deferred || interaction.replied) {
      return await interaction.editReply(payload);
    }
    return await interaction.reply({ ...payload, fetchReply });
  } catch (err) {
    if (err.code === 10062) return null; // Unknown interaction
    throw err;
  }
}

/**
 * Safe component interaction update
 * @param {import('discord.js').MessageComponentInteraction} interaction
 * @param {object} payload
 */
async function safeUpdate(interaction, payload) {
  try {
    if (!interaction.deferred && !interaction.replied) {
      return await interaction.update(payload);
    }
    return await interaction.editReply(payload);
  } catch (err) {
    if (err.code === 10062) return null;
    throw err;
  }
}

/**
 * Safe followUp
 */
async function safeFollowUp(interaction, payload) {
  try {
    return await interaction.followUp(payload);
  } catch (err) {
    if (err.code === 10062) return null;
    throw err;
  }
}

/**
 * Defer interaction safely
 */
async function safeDefer(interaction, { ephemeral = false } = {}) {
  try {
    if (!interaction.deferred && !interaction.replied) {
      await interaction.deferReply({ ephemeral });
    }
  } catch (err) {
    if (err.code !== 10062) throw err;
  }
}

// ─── Color helpers ────────────────────────────────────────────────────────────

/**
 * Parse color to integer
 * @param {string|number} color
 * @returns {number}
 */
function parseColor(color) {
  if (typeof color === 'number') return color;
  if (typeof color === 'string') return parseInt(color.replace('#', ''), 16);
  throw new TypeError(`parseColor: invalid color "${color}"`);
}

/**
 * Blend two hex colors
 * @param {number} c1 - Integer color
 * @param {number} c2 - Integer color
 * @param {number} [t=0.5] - 0.0 → 1.0
 * @returns {number}
 */
function blendColors(c1, c2, t = 0.5) {
  const r1 = (c1 >> 16) & 0xFF, g1 = (c1 >> 8) & 0xFF, b1 = c1 & 0xFF;
  const r2 = (c2 >> 16) & 0xFF, g2 = (c2 >> 8) & 0xFF, b2 = c2 & 0xFF;
  return (
    (Math.round(r1 + (r2 - r1) * t) << 16) |
    (Math.round(g1 + (g2 - g1) * t) << 8)  |
    Math.round(b1 + (b2 - b1) * t)
  );
}

// ─── String helpers ───────────────────────────────────────────────────────────

/**
 * Truncate text
 * @param {string} text
 * @param {number} [max=100]
 * @returns {string}
 */
function truncate(text, max = 100) {
  if (typeof text !== 'string') return String(text);
  return text.length <= max ? text : text.slice(0, max - 1) + '…';
}

/**
 * Generate a unique customId-safe identifier
 * @param {string} [prefix='cv2']
 * @returns {string}
 */
function uniqueId(prefix = 'cv2') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Bold a value for use in CV2 text fields
 * @param {string} key
 * @param {any} value
 */
function field(key, value) {
  return `**${key}:** ${value}`;
}

/**
 * Format a number with thousands separators
 * @param {number} n
 */
function formatNumber(n) {
  return n.toLocaleString('en-US');
}

/**
 * Relative Discord timestamp
 * @param {number|Date} time - Unix ms or Date
 * @param {'t'|'T'|'d'|'D'|'f'|'F'|'R'} [style='R']
 */
function timestamp(time, style = 'R') {
  const unix = time instanceof Date ? Math.floor(time.getTime() / 1000) : Math.floor(time / 1000);
  return `<t:${unix}:${style}>`;
}

/**
 * Pluralize a word
 * @param {number} count
 * @param {string} singular
 * @param {string} [plural]
 */
function pluralize(count, singular, plural) {
  return count === 1 ? singular : (plural ?? `${singular}s`);
}

/**
 * Build a simple progress bar string
 * @param {number} value - 0 to max
 * @param {number} max
 * @param {number} [width=10]
 * @param {string} [filled='█']
 * @param {string} [empty='░']
 */
function progressBar(value, max, width = 10, filled = '█', empty = '░') {
  const pct = Math.min(1, Math.max(0, value / max));
  const fill = Math.round(pct * width);
  return filled.repeat(fill) + empty.repeat(width - fill) + ` ${Math.round(pct * 100)}%`;
}

/**
 * Convert milliseconds to human-readable duration
 * @param {number} ms
 */
function formatDuration(ms) {
  const s = Math.floor(ms / 1000);
  if (s < 60)   return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m ${s % 60}s`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
  return `${Math.floor(s / 86400)}d ${Math.floor((s % 86400) / 3600)}h`;
}

/**
 * Parse a duration string to ms ('1h', '30m', '2d', '60s')
 * @param {string} str
 * @returns {number|null}
 */
function parseDuration(str) {
  const match = str.match(/^(\d+)\s*([smhd])$/i);
  if (!match) return null;
  const n = parseInt(match[1]);
  const map = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
  return n * (map[match[2].toLowerCase()] ?? 0);
}

module.exports = {
  // Array
  chunkArray,
  itemsToPages,
  // Flags
  cv2Flags,
  // Interaction
  safeReply,
  safeUpdate,
  safeFollowUp,
  safeDefer,
  // Color
  parseColor,
  blendColors,
  // String
  truncate,
  uniqueId,
  field,
  formatNumber,
  timestamp,
  pluralize,
  progressBar,
  formatDuration,
  parseDuration,
};
