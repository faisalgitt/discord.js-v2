'use strict';

/**
 * discord.js-v2 v2.0.0
 * Advanced production-ready Components V2 toolkit for Discord.js v14
 *
 * @author kopeekool
 * @license MIT
 * @see https://github.com/faisalgitt/discord.js-v2
 */

const CV2Builder     = require('./builders/CV2Builder');
const PaginatedCV2   = require('./builders/PaginatedCV2');
const ConfirmCV2     = require('./builders/ConfirmCV2');
const FlowCV2        = require('./builders/FlowCV2');
const MenuCV2        = require('./builders/MenuCV2');
const CollectorCV2   = require('./builders/CollectorCV2');
const Presets        = require('./presets/index');
const utils          = require('./utils/index');
const { Colors }     = require('./types/constants');

module.exports = {
  // ─── Core builder ─────────────────────────────────────────────────────────
  CV2Builder,

  // ─── Interaction patterns ─────────────────────────────────────────────────
  PaginatedCV2,
  ConfirmCV2,
  FlowCV2,
  MenuCV2,
  CollectorCV2,

  // ─── Presets ──────────────────────────────────────────────────────────────
  Presets,

  // ─── Constants ────────────────────────────────────────────────────────────
  Colors,

  // ─── Utils (spread for named imports) ─────────────────────────────────────
  ...utils,

  // ─── Version ──────────────────────────────────────────────────────────────
  version: require('../package.json').version,
};
