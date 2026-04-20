import {
  ContainerBuilder,
  ChatInputCommandInteraction,
  ButtonInteraction,
  MessageComponentInteraction,
  StringSelectMenuInteraction,
  Message,
  GuildMember,
  ChannelType,
} from 'discord.js';

// ─── Constants ────────────────────────────────────────────────────────────────

export declare const Colors: {
  Blurple:  number;
  Green:    number;
  Yellow:   number;
  Fuchsia:  number;
  Red:      number;
  White:    number;
  Black:    number;
  DarkGrey: number;
  Grey:     number;
  Orange:   number;
  Teal:     number;
  Navy:     number;
};

export declare const version: string;

// ─── Shared types ─────────────────────────────────────────────────────────────

export type ColorInput = number | string;
export type ButtonStyleInput =
  | 'Primary' | 'Secondary' | 'Success' | 'Danger' | 'Link'
  | 'Blurple' | 'Grey' | 'Gray' | 'Green' | 'Red'
  | 1 | 2 | 3 | 4 | 5;

export interface ButtonOptions {
  label: string;
  customId?: string;
  style?: ButtonStyleInput;
  emoji?: string;
  disabled?: boolean;
  url?: string;
}

export interface SeparatorOptions {
  divider?: boolean;
  spacing?: 'small' | 'large';
}

export interface SectionOptions {
  text: string;
  thumbnail?: string;
  thumbnailSpoiler?: boolean;
  thumbnailAlt?: string;
  button?: ButtonOptions;
}

export interface SelectOption {
  label: string;
  value: string;
  description?: string;
  emoji?: string;
  default?: boolean;
}

export interface MediaGalleryItem {
  url: string;
  description?: string;
  spoiler?: boolean;
}

export interface ReplyPayload {
  components: ContainerBuilder[];
  flags: number;
}

// ─── CV2Builder ───────────────────────────────────────────────────────────────

export declare class CV2Builder {
  readonly size: number;

  setColor(color: ColorInput): this;
  setSpoiler(value?: boolean): this;

  addText(content: string): this;
  addLines(...lines: string[]): this;
  addSeparator(opts?: SeparatorOptions): this;
  addSpacer(spacing?: 'small' | 'large'): this;
  addSection(opts: SectionOptions): this;
  addButtons(buttons: ButtonOptions[]): this;
  addButtonRows(buttons: ButtonOptions[]): this;
  addStringSelect(opts: {
    customId: string;
    placeholder?: string;
    minValues?: number;
    maxValues?: number;
    disabled?: boolean;
    options: SelectOption[];
  }): this;
  addUserSelect(opts: { customId: string; placeholder?: string; minValues?: number; maxValues?: number; disabled?: boolean }): this;
  addRoleSelect(opts: { customId: string; placeholder?: string; minValues?: number; maxValues?: number; disabled?: boolean }): this;
  addChannelSelect(opts: {
    customId: string;
    placeholder?: string;
    channelTypes?: ChannelType[];
    minValues?: number;
    maxValues?: number;
    disabled?: boolean;
  }): this;
  addMediaGallery(items: MediaGalleryItem[]): this;
  addFile(url: string, spoiler?: boolean): this;
  addRaw(component: any): this;

  build(): ContainerBuilder;
  toReply(extra?: Record<string, any>): ReplyPayload;
  toEphemeral(extra?: Record<string, any>): ReplyPayload;
  clone(): CV2Builder;
}

// ─── PaginatedCV2 ─────────────────────────────────────────────────────────────

export interface PaginatedCV2Options {
  items: any[];
  perPage?: number;
  render?: (items: any[], page: number, total: number) => CV2Builder;
  timeout?: number;
  userId?: string;
  color?: ColorInput;
  ephemeral?: boolean;
  showJump?: boolean;
  compact?: boolean;
  labels?: { first?: string; prev?: string; next?: string; last?: string; close?: string };
  emptyMessage?: string;
}

export declare class PaginatedCV2 {
  currentPage: number;
  readonly totalPages: number;
  readonly pageItems: any[];
  constructor(opts: PaginatedCV2Options);
  send(target: ChatInputCommandInteraction | Message): Promise<Message>;
}

// ─── ConfirmCV2 ───────────────────────────────────────────────────────────────

export interface ConfirmCV2Options {
  question: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmStyle?: ButtonStyleInput;
  cancelStyle?: ButtonStyleInput;
  timeout?: number;
  userId?: string;
  color?: ColorInput;
  ephemeral?: boolean;
  showTimeout?: boolean;
  confirmedText?: string;
  cancelledText?: string;
  timedOutText?: string;
}

export interface ConfirmResult {
  confirmed: boolean;
  interaction: ButtonInteraction | null;
}

export declare class ConfirmCV2 {
  constructor(opts: ConfirmCV2Options);
  ask(interaction: ChatInputCommandInteraction): Promise<ConfirmResult>;
}

// ─── FlowCV2 ─────────────────────────────────────────────────────────────────

export type FlowStepHandler = (
  interaction: ChatInputCommandInteraction | ButtonInteraction | MessageComponentInteraction,
  data: Record<string, any>,
  flow: FlowCV2
) => Promise<void>;

export interface FlowCV2Options {
  userId: string;
  timeout?: number;
  color?: ColorInput;
  ephemeral?: boolean;
  onError?: (err: Error, step: string, flow: FlowCV2) => Promise<void>;
  onComplete?: (data: Record<string, any>, flow: FlowCV2) => Promise<void>;
  onAbort?: (reason: string, flow: FlowCV2) => Promise<void>;
}

export declare class FlowCV2 {
  readonly currentStep: string;
  readonly currentIndex: number;
  readonly totalSteps: number;
  readonly progress: number;

  constructor(opts: FlowCV2Options);
  addStep(name: string, handler: FlowStepHandler): this;
  start(interaction: ChatInputCommandInteraction): Promise<Record<string, any>>;
  next(interaction: MessageComponentInteraction, stepData?: Record<string, any>): Promise<void>;
  goto(interaction: MessageComponentInteraction, stepName: string, stepData?: Record<string, any>): Promise<void>;
  back(interaction: MessageComponentInteraction): Promise<void>;
  finish(interaction: MessageComponentInteraction, finalData?: Record<string, any>): Promise<void>;
  abort(interaction: MessageComponentInteraction, reason?: string): Promise<void>;
  getData(): Record<string, any>;
  set(key: string, value: any): this;
  get(key: string): any;
  getId(): string;
  progressBar(width?: number): string;
}

// ─── MenuCV2 ─────────────────────────────────────────────────────────────────

export interface MenuCV2Options {
  userId: string;
  color?: ColorInput;
  ephemeral?: boolean;
  timeout?: number;
  data?: Record<string, any>;
}

export interface NavItem {
  label: string;
  view: string;
  style?: ButtonStyleInput;
  emoji?: string;
}

export declare class MenuCV2 {
  data: Record<string, any>;
  constructor(opts: MenuCV2Options);
  addView(name: string, renderer: (data: Record<string, any>) => CV2Builder): this;
  addNav(items: NavItem[]): this;
  send(target: ChatInputCommandInteraction | Message): Promise<Message>;
  update(interaction: MessageComponentInteraction, newData?: Record<string, any>): Promise<void>;
}

// ─── CollectorCV2 ────────────────────────────────────────────────────────────

export interface CollectorCV2Options {
  userId?: string;
  prefix?: string;
  timeout?: number;
  max?: number;
  filter?: (interaction: MessageComponentInteraction) => boolean;
}

export declare class CollectorCV2 {
  constructor(message: Message, opts?: CollectorCV2Options);
  on(customId: string, handler: (interaction: MessageComponentInteraction) => Promise<void>): this;
  awaitOne(prefix?: string): Promise<MessageComponentInteraction>;
  start(onEnd?: (collected: any, reason: string) => void): this;
  stop(reason?: string): void;
  readonly collected: Map<string, MessageComponentInteraction> | null;
}

// ─── Presets ─────────────────────────────────────────────────────────────────

export interface StatusPresetOptions {
  title?: string;
  description?: string;
  ephemeral?: boolean;
  color?: ColorInput;
  fields?: string[];
}

export interface ProfileOptions {
  name: string;
  avatar?: string;
  bio?: string;
  fields?: string[];
  buttons?: ButtonOptions[];
  ephemeral?: boolean;
  color?: ColorInput;
}

export interface ModActionOptions {
  action: 'ban' | 'kick' | 'mute' | 'warn' | 'unban' | 'unmute' | 'timeout' | 'deafen' | 'move';
  target: string;
  moderator: string;
  reason?: string;
  duration?: string;
  caseId?: string | number;
  notified?: boolean;
  ephemeral?: boolean;
}

export interface LeaderboardEntry {
  name: string;
  value: string | number;
  extra?: string;
}

export interface StatItem {
  key: string;
  value: string | number;
}

export interface HelpCategory {
  name: string;
  commands: string[];
  emoji?: string;
}

export declare const Presets: {
  success(message: string, opts?: StatusPresetOptions): ReplyPayload;
  error(message: string, opts?: StatusPresetOptions): ReplyPayload;
  warn(message: string, opts?: { title?: string; ephemeral?: boolean; color?: ColorInput }): ReplyPayload;
  info(message: string, opts?: { title?: string; ephemeral?: boolean; color?: ColorInput }): ReplyPayload;
  loading(message?: string, opts?: { color?: ColorInput; ephemeral?: boolean }): ReplyPayload;
  profile(opts: ProfileOptions): ReplyPayload;
  modAction(opts: ModActionOptions): ReplyPayload;
  leaderboard(opts: { title: string; entries: LeaderboardEntry[]; ephemeral?: boolean; color?: ColorInput }): ReplyPayload;
  stats(opts: { title: string; stats: StatItem[]; thumbnail?: string; ephemeral?: boolean; color?: ColorInput }): ReplyPayload;
  help(opts: { botName: string; prefix?: string; avatar?: string; categories: HelpCategory[]; ephemeral?: boolean; color?: ColorInput }): ReplyPayload;
  serverInfo(opts: { name: string; icon?: string; fields?: string[]; ephemeral?: boolean; color?: ColorInput }): ReplyPayload;
  announcement(opts: { title: string; body: string; footer?: string; ephemeral?: boolean; color?: ColorInput }): ReplyPayload;
  giveaway(opts: {
    prize: string; host: string; endsAt: string; winners?: number;
    requirements?: string[]; ended?: boolean; winnerList?: string[]; ephemeral?: boolean;
  }): ReplyPayload;
  ticketCreated(opts: { ticketId: string | number; category?: string; channel?: string; ephemeral?: boolean }): ReplyPayload;
};

// ─── Utils ───────────────────────────────────────────────────────────────────

export function chunkArray<T>(array: T[], size: number): T[][];
export function itemsToPages<T>(items: T[], opts?: { perPage?: number; format?: (item: T, index: number) => string }): string[][];
export function cv2Flags(opts?: { ephemeral?: boolean }): number;
export function safeReply(interaction: ChatInputCommandInteraction, payload: object, fetchReply?: boolean): Promise<Message | null>;
export function safeUpdate(interaction: MessageComponentInteraction, payload: object): Promise<Message | null>;
export function safeFollowUp(interaction: ChatInputCommandInteraction | MessageComponentInteraction, payload: object): Promise<Message | null>;
export function safeDefer(interaction: ChatInputCommandInteraction, opts?: { ephemeral?: boolean }): Promise<void>;
export function parseColor(color: ColorInput): number;
export function blendColors(c1: number, c2: number, t?: number): number;
export function truncate(text: string, max?: number): string;
export function uniqueId(prefix?: string): string;
export function field(key: string, value: any): string;
export function formatNumber(n: number): string;
export function timestamp(time: number | Date, style?: 't' | 'T' | 'd' | 'D' | 'f' | 'F' | 'R'): string;
export function pluralize(count: number, singular: string, plural?: string): string;
export function progressBar(value: number, max: number, width?: number, filled?: string, empty?: string): string;
export function formatDuration(ms: number): string;
export function parseDuration(str: string): number | null;
