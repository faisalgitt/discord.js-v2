# discord.js-v2

> Advanced production-ready **Components V2** toolkit for Discord.js v14.

[![npm](https://img.shields.io/npm/v/discord.js-v2?color=5865F2&style=flat-square)](https://npmjs.com/package/discord.js-v2)
[![license](https://img.shields.io/npm/l/discord.js-v2?style=flat-square)](LICENSE)
[![discord.js](https://img.shields.io/badge/discord.js-v14-5865F2?style=flat-square)](https://discord.js.org)
[![tests](https://img.shields.io/badge/tests-113%20passing-57F287?style=flat-square)](#)

---

## What's included

| Export | Description |
|---|---|
| `CV2Builder` | Fluent container builder — text, sections, buttons, selects, media, files |
| `PaginatedCV2` | Auto-pagination with nav buttons, page jump, custom renderers |
| `ConfirmCV2` | Confirm/cancel dialog — returns `{ confirmed, interaction }` |
| `FlowCV2` | Multi-step flows with goto, back, state, progress, hooks |
| `MenuCV2` | Multi-view interactive menus / dashboards |
| `CollectorCV2` | Smart component collector with promise & event modes |
| `Presets` | 15+ ready-made layouts (modAction, leaderboard, giveaway, help, etc.) |
| `Colors` | Named color constants |
| Utils | 15 helper functions (formatDuration, progressBar, timestamp, etc.) |

---

## Install

```bash
npm install discord.js-v2
```

**Requires:** Node.js ≥ 18, discord.js ^14.0.0

---

## Quick start

```js
const { CV2Builder, Presets } = require('discord.js-v2');

// Fluent builder
await interaction.reply(
  new CV2Builder()
    .setColor(0x5865F2)
    .addText('### 👋 Hello!')
    .addSeparator()
    .addSection({ text: '**Status:** Online', thumbnail: client.user.displayAvatarURL() })
    .addButtons([
      { label: 'GitHub', style: 'Link', url: 'https://github.com' },
      { label: 'Support', style: 'Primary', customId: 'open_ticket' },
    ])
    .toReply()
);

// One-liner preset
await interaction.reply(Presets.success('Command executed!'));
```

---

## CV2Builder

The core class. Every method returns `this` for chaining.

```js
const { CV2Builder } = require('discord.js-v2');

new CV2Builder()
  .setColor('#5865F2')        // Accent color (hex string or integer)
  .setSpoiler()               // Wrap container in spoiler
  .addText('### Title')       // Text display (full markdown)
  .addLines('Line 1', 'Line 2', 'Line 3') // Add multiple texts at once
  .addSeparator()             // Separator with divider line
  .addSpacer()                // Separator without divider
  .addSection({               // Section with thumbnail
    text: '**Name:** Alice\n**Role:** Admin',
    thumbnail: 'https://example.com/avatar.png',
    thumbnailAlt: 'Alice avatar',
  })
  .addSection({               // Section with button accessory
    text: '**View Profile**',
    button: { label: 'Open', customId: 'open_profile', style: 'Primary' },
  })
  .addButtons([               // Button row (max 5 per row)
    { label: '✅ Confirm', customId: 'confirm', style: 'Success' },
    { label: '❌ Cancel',  customId: 'cancel',  style: 'Danger'  },
    { label: 'Docs', style: 'Link', url: 'https://docs.example.com' },
  ])
  .addButtonRows(bigButtonArray)  // Auto-splits into rows of 5
  .addStringSelect({          // String select menu
    customId: 'category',
    placeholder: 'Choose a category...',
    options: [
      { label: 'General', value: 'general', emoji: '💬' },
      { label: 'Support', value: 'support', emoji: '🛟', description: 'Get help' },
    ],
  })
  .addUserSelect({ customId: 'pick_user', placeholder: 'Pick a user' })
  .addRoleSelect({ customId: 'pick_role', placeholder: 'Pick a role' })
  .addChannelSelect({ customId: 'pick_channel', placeholder: 'Pick a channel' })
  .addMediaGallery([          // Image gallery (1-10 images)
    { url: 'https://example.com/img1.png', description: 'Screenshot 1' },
    { url: 'https://example.com/img2.png', spoiler: true },
  ])
  .addFile('attachment://report.pdf')  // File attachment display
  .addRaw(anyDjsComponent)    // Raw discord.js component
  .clone()                    // Clone builder (independent copy)
  .build()                    // → ContainerBuilder
  .toReply()                  // → { components, flags }
  .toEphemeral()              // → { components, flags: ephemeral }
```

---

## PaginatedCV2

Paginate any array with automatic nav buttons, page-jump select, and custom rendering.

```js
const { PaginatedCV2 } = require('discord.js-v2');

// Basic usage — auto-formats items as text
await new PaginatedCV2({
  items: members.map(m => `• ${m.user.tag}`),
  perPage: 10,
  userId: interaction.user.id,
  color: 0x5865F2,
}).send(interaction);

// Custom renderer — full control over page layout
await new PaginatedCV2({
  items: warningList,
  perPage: 5,
  userId: interaction.user.id,
  color: 0xED4245,
  render(items, page, total) {
    const b = new CV2Builder().setColor(0xED4245);
    b.addText(`### ⚠️ Warnings — Page ${page + 1}/${total}`);
    b.addSeparator();
    for (const warn of items) {
      b.addSection({
        text: `**#${warn.id}** — ${warn.reason}\n-# by ${warn.moderator} · ${warn.date}`,
      });
    }
    return b;
  },
  compact: false,       // true → only prev/next/close
  showJump: true,       // show page-jump select on > 5 pages
  timeout: 60_000,
}).send(interaction);
```

---

## ConfirmCV2

One-call confirmation dialog. Returns `{ confirmed: boolean, interaction }`.

```js
const { ConfirmCV2, Presets } = require('discord.js-v2');

const { confirmed, interaction: btnInt } = await new ConfirmCV2({
  question: '⚠️ Ban **@User**?\nThis action cannot be undone.',
  confirmLabel: '🔨 Ban',
  cancelLabel: '❌ Cancel',
  confirmStyle: 'Danger',
  userId: interaction.user.id,
  color: 0xED4245,
  showTimeout: true,
  timeout: 15_000,
}).ask(interaction);

if (confirmed) {
  await member.ban({ reason });
  await btnInt.followUp(Presets.success(`**@User** was banned.`));
} else {
  await btnInt.followUp(Presets.info('Cancelled.', { ephemeral: true }));
}
```

---

## FlowCV2

Multi-step interactive flows — setup wizards, onboarding, multi-question forms.

```js
const { FlowCV2, CV2Builder, Presets } = require('discord.js-v2');

const flow = new FlowCV2({
  userId: interaction.user.id,
  color: 0x5865F2,
  onError: async (err, step, flow) => {
    console.error(`[Flow] Error in step "${step}":`, err);
  },
  onComplete: async (data, flow) => {
    console.log('Flow finished:', data);
  },
});

flow
  .addStep('welcome', async (i, data, flow) => {
    await i.reply(
      new CV2Builder()
        .setColor(0x5865F2)
        .addText(`### 👋 Welcome!\n${flow.progressBar()}\nLet's set up your server.`)
        .addButtons([
          { label: 'Continue →', customId: `${flow.getId()}_next`, style: 'Primary' },
          { label: 'Cancel',     customId: `${flow.getId()}_abort`, style: 'Secondary' },
        ])
        .toReply({ fetchReply: true })
    );

    const btn = await i.fetchReply()
      .then(msg => msg.awaitMessageComponent({ filter: b => b.user.id === i.user.id, time: 60_000 }));

    if (btn.customId.endsWith('_abort')) return flow.abort(btn);
    await flow.next(btn, { started: true });
  })

  .addStep('choose_prefix', async (i, data, flow) => {
    await i.update(
      new CV2Builder()
        .setColor(0x5865F2)
        .addText(`### ⚙️ Choose Prefix\n${flow.progressBar()}\nPick a command prefix.`)
        .addStringSelect({
          customId: `${flow.getId()}_prefix_select`,
          placeholder: 'Select prefix...',
          options: [
            { label: '!', value: '!', emoji: '❗' },
            { label: '?', value: '?', emoji: '❓' },
            { label: '$', value: '$', emoji: '💲' },
          ],
        })
        .toReply({ fetchReply: true })
    );

    const sel = await i.fetchReply()
      .then(msg => msg.awaitMessageComponent({ filter: s => s.user.id === flow.userId, time: 60_000 }));

    await flow.next(sel, { prefix: sel.values[0] });
  })

  .addStep('done', async (i, data, flow) => {
    await flow.finish(i);
    await i.update(Presets.success(`✅ Setup complete! Prefix set to \`${data.prefix}\``));
  });

try {
  const result = await flow.start(interaction);
  // result = { started: true, prefix: '!' }
} catch (err) {
  if (err.message.includes('aborted')) return;
  console.error(err);
}
```

### FlowCV2 methods

| Method | Description |
|---|---|
| `.addStep(name, fn)` | Register a named step |
| `.start(interaction)` | Start the flow, returns Promise of collected data |
| `.next(i, data?)` | Advance to next step |
| `.goto(i, name, data?)` | Jump to a specific step by name |
| `.back(i)` | Go back to previous step |
| `.finish(i, data?)` | End flow successfully |
| `.abort(i, reason?)` | Abort flow (rejects the Promise) |
| `.set(key, val)` | Store a value |
| `.get(key)` | Read a stored value |
| `.getData()` | Get copy of all collected data |
| `.getId()` | Get unique ID prefix for customIds |
| `.progressBar(width?)` | Get `████░░░░ 2/4` string |
| `.currentStep` | Current step name |
| `.totalSteps` | Total step count |
| `.progress` | 0.0 → 1.0 |

---

## MenuCV2

Multi-view interactive menus / dashboard panels.

```js
const { MenuCV2, CV2Builder } = require('discord.js-v2');

const menu = new MenuCV2({
  userId: interaction.user.id,
  color: 0x5865F2,
  data: { xp: 1500, level: 10, warnings: 2 },
});

menu
  .addView('home', (data) =>
    new CV2Builder()
      .setColor(0x5865F2)
      .addText(`### 🏠 Home`)
      .addSeparator()
      .addText(`Welcome back! You are level **${data.level}**.`)
  )
  .addView('stats', (data) =>
    new CV2Builder()
      .setColor(0x57F287)
      .addText(`### 📊 Stats`)
      .addSeparator()
      .addText([
        `**XP:** ${data.xp}`,
        `**Level:** ${data.level}`,
        `**Warnings:** ${data.warnings}`,
      ].join('\n'))
  )
  .addView('settings', (data) =>
    new CV2Builder()
      .setColor(0xFEE75C)
      .addText(`### ⚙️ Settings`)
  )
  .addNav([
    { label: '🏠 Home',     view: 'home' },
    { label: '📊 Stats',    view: 'stats' },
    { label: '⚙️ Settings', view: 'settings' },
  ]);

await menu.send(interaction);
```

---

## CollectorCV2

Smart component interaction collector — event-based or promise-based.

```js
const { CollectorCV2 } = require('discord.js-v2');

// Event-based (multiple interactions)
const collector = new CollectorCV2(message, {
  userId: interaction.user.id,
  prefix: 'panel_',
  timeout: 60_000,
});

collector
  .on('panel_ban',  async (i) => { /* handle ban button */ })
  .on('panel_kick', async (i) => { /* handle kick button */ })
  .on('panel_',     async (i) => { /* fallback: any panel_ button */ })
  .start((collected, reason) => {
    console.log(`Collector ended: ${reason}, ${collected.size} interactions`);
  });

// Promise-based (wait for single interaction)
const btn = await new CollectorCV2(message, { userId: interaction.user.id })
  .awaitOne('confirm_');
```

---

## Presets

```js
const { Presets, Colors } = require('discord.js-v2');

// Status
Presets.success('Done!', { title: 'Success', fields: ['**Items:** 3'] })
Presets.error('Missing permissions.', { ephemeral: true })
Presets.warn('Rate limit approaching!')
Presets.info('Scheduled maintenance at 3AM.')
Presets.loading('Fetching data...')

// User
Presets.profile({
  name: member.displayName,
  avatar: member.displayAvatarURL(),
  bio: 'Bot developer',
  fields: [`**ID:** ${member.id}`, `**Joined:** <t:${joinedTimestamp}:R>`],
  buttons: [{ label: 'DM', customId: 'dm_user', style: 'Secondary' }],
})

// Moderation
Presets.modAction({
  action: 'ban',          // ban | kick | mute | warn | unban | unmute | timeout | deafen | move
  target: `<@${userId}>`,
  moderator: `<@${modId}>`,
  reason: 'Spamming',
  duration: 'Permanent',
  caseId: 42,
  notified: true,
})

// Data
Presets.leaderboard({
  title: 'Top Members',
  entries: [
    { name: 'Alice', value: '1,500 XP', extra: 'Level 15' },
    { name: 'Bob',   value: '1,200 XP' },
  ],
})

Presets.stats({
  title: 'Server Stats',
  thumbnail: guild.iconURL(),
  stats: [
    { key: 'Members',  value: guild.memberCount },
    { key: 'Channels', value: guild.channels.cache.size },
    { key: 'Roles',    value: guild.roles.cache.size },
  ],
})

Presets.help({
  botName: 'MyBot',
  prefix: '!',
  avatar: client.user.displayAvatarURL(),
  categories: [
    { name: 'Moderation', emoji: '🛡️', commands: ['ban', 'kick', 'mute', 'warn'] },
    { name: 'Utility',    emoji: '🔧', commands: ['userinfo', 'serverinfo', 'ping'] },
  ],
})

// Giveaway
Presets.giveaway({
  prize: '1 Month Discord Nitro',
  host: `<@${hostId}>`,
  endsAt: `<t:${endTimestamp}:R>`,
  winners: 1,
  requirements: ['Be in server for 7+ days', 'Minimum level 5'],
})

Presets.announcement({ title: 'v2.0 Released!', body: 'Check out the new features!', footer: 'Posted by Admin' })
Presets.ticketCreated({ ticketId: '042', category: 'Support', channel: '#ticket-042' })
Presets.serverInfo({ name: guild.name, icon: guild.iconURL(), fields: [...] })
```

---

## Utils

```js
const {
  chunkArray, itemsToPages,
  cv2Flags, safeReply, safeUpdate, safeFollowUp, safeDefer,
  parseColor, blendColors,
  truncate, uniqueId, field, formatNumber,
  timestamp, pluralize, progressBar, formatDuration, parseDuration,
} = require('discord.js-v2');

chunkArray([1,2,3,4,5], 2)             // → [[1,2],[3,4],[5]]
itemsToPages(users, { perPage: 10 })    // → string[][] for PaginatedCV2

cv2Flags()                              // → MessageFlags.IsComponentsV2
cv2Flags({ ephemeral: true })           // → IsComponentsV2 | Ephemeral

safeReply(interaction, payload)         // handles deferred/replied/fresh
safeUpdate(componentInteraction, payload)
safeFollowUp(interaction, payload)
safeDefer(interaction, { ephemeral: true })

parseColor('#5865F2')                   // → 5793010
blendColors(0xFF0000, 0x0000FF, 0.5)   // → blended color int

truncate('Very long text...', 50)       // → 'Very long te…'
uniqueId('btn')                         // → 'btn_1713440000_abc123'
field('Level', 99)                      // → '**Level:** 99'
formatNumber(1500000)                   // → '1,500,000'
timestamp(Date.now())                   // → '<t:1713440000:R>'
timestamp(new Date(), 'F')             // → '<t:...:F>'
pluralize(1, 'item')                    // → 'item'
pluralize(5, 'item')                    // → 'items'
pluralize(2, 'child', 'children')       // → 'children'
progressBar(7, 10)                      // → '███████░░░ 70%'
formatDuration(90000)                   // → '1m 30s'
formatDuration(3600000)                 // → '1h 0m'
parseDuration('30s')                    // → 30000
parseDuration('2h')                     // → 7200000
parseDuration('invalid')               // → null
```

---

## Colors

```js
const { Colors } = require('discord.js-v2');

Colors.Blurple   // 0x5865F2
Colors.Green     // 0x57F287
Colors.Yellow    // 0xFEE75C
Colors.Red       // 0xED4245
Colors.Fuchsia   // 0xEB459E
Colors.Grey      // 0x99AAB5
Colors.Orange    // 0xFF7F50
Colors.Teal      // 0x1ABC9C
// ...and more
```

---

## TypeScript

Full TypeScript declarations included:

```ts
import {
  CV2Builder, PaginatedCV2, ConfirmCV2, FlowCV2, MenuCV2, CollectorCV2,
  Presets, Colors,
  type ButtonOptions, type ReplyPayload, type ColorInput,
} from 'discord.js-v2';
```

---

## License

MIT © [KopeeKool](https://github.com/faisalgitt)
