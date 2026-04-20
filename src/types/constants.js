'use strict';

/**
 * Component type numbers for CV2 routing
 */
const ComponentTypes = {
  ActionRow: 1,
  TextDisplay: 10,
  Separator: 14,
  Section: 9,
  MediaGallery: 12,
  File: 13,
  Label: 18,
  RadioGroup: 21,
  CheckboxGroup: 22,
};

/**
 * Map component type → ContainerBuilder add method
 */
const ContainerAddMethodMap = {
  [ComponentTypes.ActionRow]: 'addActionRowComponents',
  [ComponentTypes.TextDisplay]: 'addTextDisplayComponents',
  [ComponentTypes.Separator]: 'addSeparatorComponents',
  [ComponentTypes.Section]: 'addSectionComponents',
  [ComponentTypes.MediaGallery]: 'addMediaGalleryComponents',
  [ComponentTypes.File]: 'addFileComponents',
};

/**
 * Color palette — named presets
 */
const Colors = {
  Blurple:    0x5865F2,
  Green:      0x57F287,
  Yellow:     0xFEE75C,
  Fuchsia:    0xEB459E,
  Red:        0xED4245,
  White:      0xFFFFFF,
  Black:      0x23272A,
  DarkGrey:   0x2C2F33,
  Grey:       0x99AAB5,
  Orange:     0xFF7F50,
  Teal:       0x1ABC9C,
  Navy:       0x34495E,
};

module.exports = { ComponentTypes, ContainerAddMethodMap, Colors };
