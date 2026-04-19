'use strict';

const { MessageFlags } = require('discord.js');

/**
 * Chunk an array into pages
 * @param {any[]} array
 * @param {number} size
 * @returns {any[][]}
 */
function chunkArray(array, size) {
  if (!Array.isArray(array)) throw new TypeError('chunkArray: array must be an array');
  if (size < 1) throw new RangeError('chunkArray: size must be >= 1');
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/**
 * Convert items to formatted page strings
 * @param {any[]} items
 * @param {object} options
 * @param {number} [options.perPage=10]
 * @param {Function} [options.format] - (item, index) => string
 * @returns {string[][]}
 */
function itemsToPages(items, { perPage = 10, format } = {}) {
  const formatter = format ?? ((item, i) => `**${i + 1}.** ${item}`);
  const chunked = chunkArray(items, perPage);
  return chunked.map((chunk, pageIndex) =>
    chunk.map((item, i) => formatter(item, pageIndex * perPage + i))
  );
}

/**
 * Build a CV2 flags value
 * @param {object} options
 * @param {boolean} [options.ephemeral=false]
 * @returns {number}
 */
function cv2Flags({ ephemeral = false } = {}) {
  return ephemeral
    ? MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
    : MessageFlags.IsComponentsV2;
}

/**
 * Safe interaction reply/editReply
 * Handles deferred, replied, and fresh states automatically
 * @param {import('discord.js').ChatInputCommandInteraction} interaction
 * @param {object} payload
 */
async function safeReply(interaction, payload) {
  try {
    if (interaction.deferred || interaction.replied) {
      return await interaction.editReply(payload);
    }
    return await interaction.reply(payload);
  } catch (err) {
    if (err.code === 10062) return; // Unknown interaction
    throw err;
  }
}

/**
 * Safe component interaction update
 * @param {import('discord.js').ButtonInteraction} interaction
 * @param {object} payload
 */
async function safeUpdate(interaction, payload) {
  try {
    if (!interaction.deferred && !interaction.replied) {
      return await interaction.update(payload);
    }
    return await interaction.editReply(payload);
  } catch (err) {
    if (err.code === 10062) return;
    throw err;
  }
}

/**
 * Parse color input to integer
 * @param {string|number} color - '#RRGGBB' or integer
 * @returns {number}
 */
function parseColor(color) {
  if (typeof color === 'number') return color;
  if (typeof color === 'string') {
    return parseInt(color.replace('#', ''), 16);
  }
  throw new TypeError(`parseColor: invalid color "${color}"`);
}

/**
 * Truncate text to a maximum length with ellipsis
 * @param {string} text
 * @param {number} [maxLength=100]
 * @returns {string}
 */
function truncate(text, maxLength = 100) {
  if (typeof text !== 'string') return String(text);
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 1) + '…';
}

/**
 * Generate a unique custom ID with optional prefix
 * @param {string} [prefix='cv2']
 * @returns {string}
 */
function uniqueId(prefix = 'cv2') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

module.exports = {
  chunkArray,
  itemsToPages,
  cv2Flags,
  safeReply,
  safeUpdate,
  parseColor,
  truncate,
  uniqueId,
};
