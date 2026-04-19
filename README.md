# discord.js-v2

> Production-ready **Components V2** utilities for Discord.js v14 bots.

[![npm](https://img.shields.io/npm/v/discord.js-v2?color=5865F2)](https://npmjs.com/package/discord.js-v2)
[![license](https://img.shields.io/npm/l/discord.js-v2)](LICENSE)
[![discord.js](https://img.shields.io/badge/discord.js-v14-5865F2)](https://discord.js.org)

---

## Why?

Discord's Components V2 API is powerful but verbose. `discord.js-v2` gives you:

- **`CV2Builder`** — Fluent, chainable container builder
- **`PaginatedCV2`** — Auto-pagination with nav buttons
- **`ConfirmCV2`** — Confirm/cancel dialogs
- **`FlowCV2`** — Multi-step interaction flows (wizards, onboarding)
- **`Presets`** — Ready-made layouts (success, error, modAction, profile, leaderboard)
- **Utils** — chunkArray, itemsToPages, safeReply, safeUpdate, and more

---

## Install

```bash
npm install discord.js-v2
```

**Requires:** Node.js ≥ 18, discord.js ^14.0.0

---

## Quick Start

```js
const { CV2Builder, Presets } = require('discord.js-v2');

// Simple response
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  // Using CV2Builder
  const payload = new CV2Builder()
    .setColor('#5865F2')
    .addText('### Hello World!')
    .addSeparator()
    .addText('Welcome to my bot.')
    .addButtons([
      { label: 'GitHub', style: 'Link', url: 'https://github.com' },
      { label: 'Click Me', style: 'Primary', customId: 'my_button' },
    ])
    .toReply();

  await interaction.reply(payload);

  // Or use a preset
  await interaction.reply(Presets.success('Command ran successfully!'));
});
```

---

## CV2Builder

The core builder — fluent API for building `ContainerBuilder` objects.

```js
const { CV2Builder } = require('discord.js-v2');

const payload = new CV2Builder()
  .setColor(0x5865F2)           // accent color
  .addText('### Title')         // markdown text
  .addSeparator()               // horizontal separator
  .addSection({                 // section with thumbnail
    text: '**Name:** KopeeKool\n**Role:** Admin',
    thumbnail: 'https://example.com/avatar.png',
  })
  .addButtons([                 // action row of buttons (max 5)
    { label: 'Confirm', customId: 'confirm', style: 'Success' },
    { label: 'Cancel',  customId: 'cancel',  style: 'Danger'  },
  ])
  .toReply();                   // → { components, flags }

await interaction.reply(payload);

// Ephemeral
await interaction.reply(new CV2Builder().addText('Only you see this').toEphemeral());
```

### Methods

| Method | Description |
|---|---|
| `.setColor(color)` | Set accent color (hex string or integer) |
| `.setSpoiler(bool)` | Wrap in spoiler |
| `.addText(content)` | Add text display (supports markdown) |
| `.addSeparator(opts)` | Add separator. `opts: { divider, spacing }` |
| `.addSection(opts)` | Add section. `opts: { text, thumbnail?, button? }` |
| `.addButtons(buttons)` | Add action row (max 5 buttons) |
| `.addRaw(component)` | Add raw discord.js component |
| `.build()` | Returns `ContainerBuilder` |
| `.toReply(extra?)` | Returns reply payload object |
| `.toEphemeral()` | Returns ephemeral reply payload |

---

## PaginatedCV2

Auto-paginated containers with navigation buttons.

```js
const { PaginatedCV2, itemsToPages } = require('discord.js-v2');

const items = members.map((m, i) => `**${i+1}.** ${m.user.tag}`);
const pages = itemsToPages(items, { perPage: 10 });

const paginator = new PaginatedCV2({
  pages,
  userId: interaction.user.id, // restrict controls to command user
  color: 0x5865F2,
  timeout: 60_000,
});

await paginator.send(interaction);
```

### Options

| Option | Type | Default | Description |
|---|---|---|---|
| `pages` | `string[][]` | required | Array of pages (each page = array of text blocks) |
| `userId` | `string` | — | Restrict controls to this user |
| `color` | `number\|string` | — | Accent color |
| `timeout` | `number` | `60000` | Collector timeout in ms |
| `ephemeral` | `boolean` | `false` | Ephemeral response |
| `buttons` | `object` | — | Custom button labels `{ first, prev, next, last, close }` |

---

## ConfirmCV2

Confirmation dialogs with auto-handled buttons.

```js
const { ConfirmCV2 } = require('discord.js-v2');

const confirm = new ConfirmCV2({
  question: '⚠️ Are you sure you want to **delete** this server?',
  userId: interaction.user.id,
  color: 0xED4245,
});

const confirmed = await confirm.ask(interaction);

if (confirmed) {
  await interaction.followUp(Presets.success('Deleted!'));
} else {
  await interaction.followUp(Presets.info('Cancelled.'));
}
```

---

## FlowCV2

Multi-step interaction flows (wizards, setup, onboarding).

```js
const { FlowCV2, CV2Builder } = require('discord.js-v2');

const flow = new FlowCV2({
  userId: interaction.user.id,
  color: 0x5865F2,
});

flow
  .addStep('welcome', async (i, data, flow) => {
    const payload = new CV2Builder()
      .setColor(0x5865F2)
      .addText('### 👋 Welcome!\nLet\'s set up your profile.')
      .addButtons([
        { label: 'Continue →', customId: `${flow.getId()}_next`, style: 'Primary' },
        { label: 'Cancel', customId: `${flow.getId()}_cancel`, style: 'Secondary' },
      ])
      .toReply({ fetchReply: true });

    const msg = await i.reply(payload);

    // Wait for button click
    const btn = await msg.awaitMessageComponent({ time: 60_000 });
    if (btn.customId.endsWith('_cancel')) return flow.abort(btn, 'Setup cancelled.');
    await flow.next(btn, { started: true });
  })
  .addStep('config', async (i, data, flow) => {
    // ... next step
    await flow.next(i, { setting: 'value' });
  });

try {
  const result = await flow.start(interaction);
  console.log('Flow completed:', result);
} catch (err) {
  console.log('Flow aborted:', err.message);
}
```

---

## Presets

Ready-made response layouts.

```js
const { Presets } = require('discord.js-v2');

// Success
await interaction.reply(Presets.success('User banned successfully!'));
await interaction.reply(Presets.success('Done!', { title: 'Ban', color: 0x57F287 }));

// Error (ephemeral by default)
await interaction.reply(Presets.error('Missing permissions.'));

// Warning / Info
await interaction.reply(Presets.warn('This action cannot be undone!'));
await interaction.reply(Presets.info('Bot is in maintenance mode.'));

// Loading
await interaction.reply(Presets.loading('Fetching data...'));

// Mod action card
await interaction.reply(Presets.modAction({
  action: 'ban',
  target: `<@${targetUser.id}>`,
  moderator: `<@${interaction.user.id}>`,
  reason: 'Spamming',
  duration: 'Permanent',
}));

// User profile
await interaction.reply(Presets.profile({
  name: interaction.user.username,
  avatar: interaction.user.displayAvatarURL(),
  fields: [
    `**ID:** ${interaction.user.id}`,
    `**Joined:** <t:${Math.floor(interaction.member.joinedTimestamp / 1000)}:R>`,
  ],
}));

// Leaderboard
await interaction.reply(Presets.leaderboard({
  title: 'Top Members',
  entries: [
    { name: 'Alice', value: '1,500 XP' },
    { name: 'Bob',   value: '1,200 XP' },
    { name: 'Carol', value: '900 XP' },
  ],
}));
```

---

## Utils

```js
const { chunkArray, itemsToPages, safeReply, safeUpdate, parseColor, truncate, uniqueId } = require('discord.js-v2');

// Split array into chunks
chunkArray([1,2,3,4,5], 2); // → [[1,2],[3,4],[5]]

// Convert items array to pages (for PaginatedCV2)
itemsToPages(users, { perPage: 10, format: (u, i) => `**${i+1}.** ${u.tag}` });

// Safe interaction reply (handles deferred/replied states)
await safeReply(interaction, payload);

// Safe component update
await safeUpdate(buttonInteraction, payload);

// Parse color
parseColor('#5865F2'); // → 5793010

// Truncate
truncate('Very long text...', 20);

// Unique ID for customIds
uniqueId('btn'); // → 'btn_1713440000000_ab3x7f'
```

---

## TypeScript

Full TypeScript support included:

```ts
import { CV2Builder, PaginatedCV2, Presets, type ButtonOptions } from 'discord.js-v2';
```

---

## License

MIT © [KopeeKool](https://github.com/faisalgitt)
