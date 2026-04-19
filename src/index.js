'use strict';

/**
 * discord.js-v2
 * Production-ready Components V2 utilities for Discord.js v14
 *
 * @author kopeekool
 * @license MIT
 */

const CV2Builder = require('./builders/CV2Builder');
const PaginatedCV2 = require('./builders/PaginatedCV2');
const ConfirmCV2 = require('./builders/ConfirmCV2');
const FlowCV2 = require('./builders/FlowCV2');
const Presets = require('./presets/index');
const utils = require('./utils/index');

module.exports = {
  // Core builder
  CV2Builder,

  // Interaction patterns
  PaginatedCV2,
  ConfirmCV2,
  FlowCV2,

  // Ready-made layouts
  Presets,

  // Utilities
  ...utils,

  // Version
  version: require('../package.json').version,
};
