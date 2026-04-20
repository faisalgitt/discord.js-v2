'use strict';

const CV2Builder = require('../builders/CV2Builder');
const { MessageFlags } = require('discord.js');
const { Colors } = require('../types/constants');

/**
 * Presets — production-ready CV2 response templates
 */
const Presets = {

  // ─── Status ─────────────────────────────────────────────────────────────────

  success(message, { title, description, ephemeral = false, color = Colors.Green, fields = [] } = {}) {
    const b = _base(color);
    if (title) b.addText(`### ✅ ${title}`).addSpacer();
    b.addText(message);
    if (description) { b.addSeparator({ divider: false }); b.addText(`-# ${description}`); }
    if (fields.length) { b.addSeparator(); b.addText(fields.join('\n')); }
    return _pay(b, ephemeral);
  },

  error(message, { title, description, ephemeral = true, color = Colors.Red, fields = [] } = {}) {
    const b = _base(color);
    if (title) b.addText(`### ❌ ${title}`).addSpacer();
    b.addText(message);
    if (description) { b.addSeparator({ divider: false }); b.addText(`-# ${description}`); }
    if (fields.length) { b.addSeparator(); b.addText(fields.join('\n')); }
    return _pay(b, ephemeral);
  },

  warn(message, { title, ephemeral = true, color = Colors.Yellow } = {}) {
    const b = _base(color);
    if (title) b.addText(`### ⚠️ ${title}`).addSpacer();
    b.addText(message);
    return _pay(b, ephemeral);
  },

  info(message, { title, ephemeral = false, color = Colors.Blurple } = {}) {
    const b = _base(color);
    if (title) b.addText(`### ℹ️ ${title}`).addSpacer();
    b.addText(message);
    return _pay(b, ephemeral);
  },

  loading(message = 'Please wait...', { color = Colors.Grey, ephemeral = false } = {}) {
    return _pay(_base(color).addText(`⏳ ${message}`), ephemeral);
  },

  // ─── User ────────────────────────────────────────────────────────────────────

  /**
   * User profile card
   * @param {object} opts
   * @param {string} opts.name
   * @param {string} [opts.avatar]
   * @param {string} [opts.bio]
   * @param {string[]} [opts.fields]
   * @param {object[]} [opts.buttons]
   * @param {boolean} [opts.ephemeral=false]
   * @param {number|string} [opts.color=Colors.Blurple]
   */
  profile({ name, avatar, bio, fields = [], buttons = [], ephemeral = false, color = Colors.Blurple } = {}) {
    if (!name) throw new TypeError('Presets.profile: name is required');
    const b = _base(color);
    b.addSection({ text: `### ${name}${bio ? `\n${bio}` : ''}`, thumbnail: avatar });
    if (fields.length) { b.addSeparator(); b.addText(fields.join('\n')); }
    if (buttons.length) { b.addSeparator(); b.addButtons(buttons.slice(0, 5)); }
    return _pay(b, ephemeral);
  },

  // ─── Moderation ──────────────────────────────────────────────────────────────

  /**
   * Moderation action card
   * @param {object} opts
   * @param {'ban'|'kick'|'mute'|'warn'|'unban'|'unmute'|'timeout'|'deafen'|'move'} opts.action
   * @param {string} opts.target
   * @param {string} opts.moderator
   * @param {string} [opts.reason]
   * @param {string} [opts.duration]
   * @param {string} [opts.caseId]
   * @param {boolean} [opts.notified] - Whether user was DM'd
   * @param {boolean} [opts.ephemeral=false]
   */
  modAction({ action, target, moderator, reason = 'No reason provided', duration, caseId, notified, ephemeral = false } = {}) {
    const configs = {
      ban:     { emoji: '🔨', label: 'Member Banned',    color: Colors.Red    },
      kick:    { emoji: '👢', label: 'Member Kicked',    color: Colors.Yellow },
      mute:    { emoji: '🔇', label: 'Member Muted',     color: Colors.Orange },
      timeout: { emoji: '⏱️', label: 'Member Timed Out', color: Colors.Orange },
      warn:    { emoji: '⚠️', label: 'Member Warned',    color: Colors.Yellow },
      unban:   { emoji: '✅', label: 'Member Unbanned',  color: Colors.Green  },
      unmute:  { emoji: '🔊', label: 'Member Unmuted',   color: Colors.Green  },
      deafen:  { emoji: '🔕', label: 'Member Deafened',  color: Colors.Yellow },
      move:    { emoji: '➡️', label: 'Member Moved',     color: Colors.Blurple},
    };
    const c = configs[action] ?? { emoji: '🛡️', label: action, color: Colors.Blurple };
    const b = _base(c.color);
    b.addText(`### ${c.emoji} ${c.label}`);
    b.addSeparator();

    const lines = [
      `**Target:** ${target}`,
      `**Moderator:** ${moderator}`,
      `**Reason:** ${reason}`,
    ];
    if (duration) lines.push(`**Duration:** ${duration}`);
    if (caseId)   lines.push(`**Case:** #${caseId}`);
    if (notified !== undefined) lines.push(`**Notified:** ${notified ? 'Yes ✅' : 'No ❌'}`);

    b.addText(lines.join('\n'));
    return _pay(b, ephemeral);
  },

  // ─── Data displays ───────────────────────────────────────────────────────────

  /**
   * Leaderboard
   * @param {object} opts
   * @param {string} opts.title
   * @param {Array<{name, value, extra?}>} opts.entries
   * @param {boolean} [opts.ephemeral=false]
   * @param {number|string} [opts.color=Colors.Yellow]
   */
  leaderboard({ title, entries = [], ephemeral = false, color = Colors.Yellow } = {}) {
    if (!title)         throw new TypeError('Presets.leaderboard: title is required');
    if (!entries.length) throw new TypeError('Presets.leaderboard: entries cannot be empty');

    const medals = ['🥇', '🥈', '🥉'];
    const b = _base(color);
    b.addText(`### 🏆 ${title}`);
    b.addSeparator();
    b.addText(entries.map((e, i) => {
      const pos = medals[i] ?? `\`${String(i + 1).padStart(2)}\``;
      return `${pos} **${e.name}** — ${e.value}${e.extra ? `  *${e.extra}*` : ''}`;
    }).join('\n'));
    return _pay(b, ephemeral);
  },

  /**
   * Stats card (key-value pairs displayed cleanly)
   * @param {object} opts
   * @param {string} opts.title
   * @param {Array<{key, value, inline?}>} opts.stats
   * @param {string} [opts.thumbnail]
   * @param {boolean} [opts.ephemeral=false]
   * @param {number|string} [opts.color=Colors.Blurple]
   */
  stats({ title, stats = [], thumbnail, ephemeral = false, color = Colors.Blurple } = {}) {
    if (!title) throw new TypeError('Presets.stats: title is required');
    const b = _base(color);
    const body = stats.map(s => `**${s.key}:** ${s.value}`).join('\n');
    if (thumbnail) {
      b.addSection({ text: `### ${title}\n${body}`, thumbnail });
    } else {
      b.addText(`### ${title}`).addSeparator().addText(body);
    }
    return _pay(b, ephemeral);
  },

  /**
   * Help command layout with categories
   * @param {object} opts
   * @param {string} opts.botName
   * @param {string} [opts.prefix]
   * @param {string} [opts.avatar]
   * @param {Array<{name, commands: string[], emoji?}>} opts.categories
   * @param {boolean} [opts.ephemeral=false]
   * @param {number|string} [opts.color=Colors.Blurple]
   */
  help({ botName, prefix, avatar, categories = [], ephemeral = false, color = Colors.Blurple } = {}) {
    if (!botName) throw new TypeError('Presets.help: botName is required');
    const b = _base(color);
    const intro = avatar
      ? `### ${botName}${prefix ? `\n-# Prefix: \`${prefix}\`` : ''}`
      : `### ${botName}${prefix ? ` · Prefix: \`${prefix}\`` : ''}`;

    if (avatar) {
      b.addSection({ text: intro, thumbnail: avatar });
    } else {
      b.addText(intro);
    }

    for (const cat of categories) {
      b.addSeparator();
      b.addText(`**${cat.emoji ?? '📁'} ${cat.name}**\n${cat.commands.map(c => `\`${c}\``).join('  ')}`);
    }
    return _pay(b, ephemeral);
  },

  /**
   * Server info card
   * @param {object} opts
   * @param {string} opts.name
   * @param {string} [opts.icon]
   * @param {string[]} opts.fields
   * @param {boolean} [opts.ephemeral=false]
   * @param {number|string} [opts.color=Colors.Blurple]
   */
  serverInfo({ name, icon, fields = [], ephemeral = false, color = Colors.Blurple } = {}) {
    if (!name) throw new TypeError('Presets.serverInfo: name is required');
    const b = _base(color);
    b.addSection({ text: `### 🏠 ${name}`, thumbnail: icon });
    if (fields.length) { b.addSeparator(); b.addText(fields.join('\n')); }
    return _pay(b, ephemeral);
  },

  /**
   * Announcement / important message
   * @param {object} opts
   * @param {string} opts.title
   * @param {string} opts.body
   * @param {string} [opts.footer]
   * @param {boolean} [opts.ephemeral=false]
   * @param {number|string} [opts.color=Colors.Fuchsia]
   */
  announcement({ title, body, footer, ephemeral = false, color = Colors.Fuchsia } = {}) {
    if (!title || !body) throw new TypeError('Presets.announcement: title and body are required');
    const b = _base(color);
    b.addText(`### 📢 ${title}`).addSeparator().addText(body);
    if (footer) { b.addSeparator({ divider: false }); b.addText(`-# ${footer}`); }
    return _pay(b, ephemeral);
  },

  /**
   * Giveaway card
   * @param {object} opts
   * @param {string} opts.prize
   * @param {string} opts.host
   * @param {string} opts.endsAt - e.g. '<t:TIMESTAMP:R>'
   * @param {number} opts.winners
   * @param {string[]} [opts.requirements]
   * @param {boolean} [opts.ended=false]
   * @param {string[]} [opts.winnerList]
   * @param {boolean} [opts.ephemeral=false]
   */
  giveaway({ prize, host, endsAt, winners = 1, requirements = [], ended = false, winnerList = [], ephemeral = false } = {}) {
    if (!prize || !host || !endsAt) throw new TypeError('Presets.giveaway: prize, host, endsAt required');
    const b = _base(ended ? Colors.Grey : Colors.Fuchsia);
    b.addText(`## 🎉 ${prize}`);
    b.addSeparator();
    const lines = [
      `**Host:** ${host}`,
      `**Winners:** ${winners}`,
      `**${ended ? 'Ended' : 'Ends'}:** ${endsAt}`,
    ];
    if (requirements.length) lines.push(`**Requirements:**\n${requirements.map(r => `• ${r}`).join('\n')}`);
    b.addText(lines.join('\n'));
    if (ended && winnerList.length) {
      b.addSeparator();
      b.addText(`🏆 **Winner${winnerList.length > 1 ? 's' : ''}:**\n${winnerList.join(', ')}`);
    }
    if (!ended) {
      b.addSeparator();
      b.addButtons([{ label: '🎉 Enter', customId: 'giveaway_enter', style: 'Primary' }]);
    }
    return _pay(b, ephemeral);
  },

  /**
   * Ticket created confirmation
   * @param {object} opts
   * @param {string} opts.ticketId
   * @param {string} [opts.category]
   * @param {string} [opts.channel]
   * @param {boolean} [opts.ephemeral=true]
   */
  ticketCreated({ ticketId, category, channel, ephemeral = true } = {}) {
    if (!ticketId) throw new TypeError('Presets.ticketCreated: ticketId is required');
    const b = _base(Colors.Green);
    b.addText('### 🎫 Ticket Created');
    b.addSeparator();
    const lines = [`**Ticket ID:** #${ticketId}`];
    if (category) lines.push(`**Category:** ${category}`);
    if (channel)  lines.push(`**Channel:** ${channel}`);
    b.addText(lines.join('\n'));
    return _pay(b, ephemeral);
  },

};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function _base(color) {
  const b = new CV2Builder();
  if (color) b.setColor(color);
  return b;
}

function _pay(builder, ephemeral) {
  return {
    components: [builder.build()],
    flags: ephemeral
      ? MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
      : MessageFlags.IsComponentsV2,
  };
}

module.exports = Presets;
