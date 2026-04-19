import {
  ContainerBuilder,
  ChatInputCommandInteraction,
  ButtonInteraction,
  Message,
  MessageFlags,
} from 'discord.js';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ButtonStyleInput =
  | 'Primary' | 'Secondary' | 'Success' | 'Danger' | 'Link'
  | 'Blurple' | 'Grey' | 'Gray' | 'Green' | 'Red'
  | 1 | 2 | 3 | 4 | 5;

export type SpacingInput = 'small' | 'large';

export interface ButtonOptions {
  label: string;
  customId?: string;
  style?: ButtonStyleInput;
  emoji?: string;
  disabled?: boolean;
  url?: string;
}

export interface SectionOptions {
  text: string;
  thumbnail?: string;
  button?: ButtonOptions;
}

export interface SeparatorOptions {
  divider?: boolean;
  spacing?: SpacingInput;
}

export interface ReplyPayload {
  components: ContainerBuilder[];
  flags: number;
}

// ─── CV2Builder ───────────────────────────────────────────────────────────────

export class CV2Builder {
  setColor(color: number | string): this;
  setSpoiler(value?: boolean): this;
  addText(content: string): this;
  addSeparator(options?: SeparatorOptions): this;
  addSection(options: SectionOptions): this;
  addButtons(buttons: ButtonOptions[]): this;
  addRaw(component: any): this;
  build(): ContainerBuilder;
  toReply(extra?: Record<string, any>): ReplyPayload;
  toEphemeral(): ReplyPayload;
}

// ─── PaginatedCV2 ─────────────────────────────────────────────────────────────

export interface PaginatedCV2Options {
  pages: string[][];
  timeout?: number;
  userId?: string;
  color?: number | string;
  ephemeral?: boolean;
  buttons?: {
    first?: string;
    prev?: string;
    next?: string;
    last?: string;
    close?: string;
  };
}

export class PaginatedCV2 {
  currentPage: number;
  constructor(options: PaginatedCV2Options);
  send(target: ChatInputCommandInteraction | Message): Promise<Message>;
}

// ─── ConfirmCV2 ───────────────────────────────────────────────────────────────

export interface ConfirmCV2Options {
  question: string;
  confirmLabel?: string;
  cancelLabel?: string;
  timeout?: number;
  userId?: string;
  color?: number | string;
  ephemeral?: boolean;
}

export class ConfirmCV2 {
  constructor(options: ConfirmCV2Options);
  ask(interaction: ChatInputCommandInteraction): Promise<boolean>;
}

// ─── FlowCV2 ─────────────────────────────────────────────────────────────────

export type FlowStepHandler = (
  interaction: ChatInputCommandInteraction | ButtonInteraction,
  data: Record<string, any>,
  flow: FlowCV2
) => Promise<void>;

export interface FlowCV2Options {
  userId: string;
  timeout?: number;
  color?: number | string;
  ephemeral?: boolean;
}

export class FlowCV2 {
  constructor(options: FlowCV2Options);
  addStep(name: string, handler: FlowStepHandler): this;
  start(interaction: ChatInputCommandInteraction): Promise<Record<string, any>>;
  next(interaction: ButtonInteraction, stepData?: Record<string, any>): Promise<void>;
  abort(interaction: ButtonInteraction, reason?: string): Promise<void>;
  getData(): Record<string, any>;
  getId(): string;
}

// ─── Presets ─────────────────────────────────────────────────────────────────

export interface PresetOptions {
  ephemeral?: boolean;
  color?: number | string;
  title?: string;
}

export interface ProfileOptions {
  name: string;
  avatar?: string;
  fields?: string[];
  ephemeral?: boolean;
  color?: number | string;
}

export interface ModActionOptions {
  action: 'ban' | 'kick' | 'mute' | 'warn' | 'unban' | 'unmute';
  target: string;
  moderator: string;
  reason?: string;
  duration?: string;
  ephemeral?: boolean;
}

export interface LeaderboardEntry {
  rank?: number;
  name: string;
  value: string | number;
}

export interface LeaderboardOptions {
  title: string;
  entries: LeaderboardEntry[];
  ephemeral?: boolean;
  color?: number | string;
}

export declare const Presets: {
  success(message: string, options?: PresetOptions): ReplyPayload;
  error(message: string, options?: PresetOptions): ReplyPayload;
  warn(message: string, options?: { ephemeral?: boolean; color?: number | string }): ReplyPayload;
  info(message: string, options?: { ephemeral?: boolean; color?: number | string }): ReplyPayload;
  loading(message?: string, color?: number | string): ReplyPayload;
  profile(options: ProfileOptions): ReplyPayload;
  modAction(options: ModActionOptions): ReplyPayload;
  leaderboard(options: LeaderboardOptions): ReplyPayload;
};

// ─── Utils ───────────────────────────────────────────────────────────────────

export function chunkArray<T>(array: T[], size: number): T[][];
export function itemsToPages<T>(
  items: T[],
  options?: { perPage?: number; format?: (item: T, index: number) => string }
): string[][];
export function cv2Flags(options?: { ephemeral?: boolean }): number;
export function safeReply(interaction: ChatInputCommandInteraction, payload: object): Promise<any>;
export function safeUpdate(interaction: ButtonInteraction, payload: object): Promise<any>;
export function parseColor(color: string | number): number;
export function truncate(text: string, maxLength?: number): string;
export function uniqueId(prefix?: string): string;

export declare const version: string;
