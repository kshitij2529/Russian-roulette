import { ItemDefinition, ItemType } from "../types";

export const ITEM_DEFINITIONS: Record<ItemType, ItemDefinition> = {
  magnifying_glass: {
    type: "magnifying_glass",
    name: "Magnifying Glass",
    category: "information",
    description: "Inspect the current shell inside the shotgun chamber. Only you see whether it is LIVE or BLANK.",
    shortDesc: "Peek at current shell",
    iconName: "Search",
    requiresTarget: false,
  },
  burner_phone: {
    type: "burner_phone",
    name: "Burner Phone",
    category: "information",
    description: "An encrypted dealer line whispers the status of a random upcoming shell in the chamber (e.g. 3rd shell is LIVE).",
    shortDesc: "Reveal future shell",
    iconName: "PhoneCall",
    requiresTarget: false,
  },
  cigarettes: {
    type: "cigarettes",
    name: "Cigarettes",
    category: "survival",
    description: "Soothe your frayed nerves and recover +1 Health charge (up to the maximum of 4 charges).",
    shortDesc: "+1 Health Charge",
    iconName: "Cigarette",
    requiresTarget: false,
  },
  beer: {
    type: "beer",
    name: "Beer Can",
    category: "utility",
    description: "Down a cold brew and rack the pump action, safely ejecting the current shell onto the floor without firing.",
    shortDesc: "Eject current shell",
    iconName: "Beer",
    requiresTarget: false,
  },
  handsaw: {
    type: "handsaw",
    name: "Hand Saw",
    category: "offensive",
    description: "Saw off the shotgun barrel! The next shot deals 2 DAMAGE if it is a LIVE shell (resets after shot).",
    shortDesc: "Next Live = 2x DMG",
    iconName: "Scissors",
    requiresTarget: false,
  },
  handcuffs: {
    type: "handcuffs",
    name: "Handcuffs",
    category: "control",
    description: "Lock rusty handcuffs on a target player. That player is forced to skip their next turn.",
    shortDesc: "Skip target's turn",
    iconName: "Lock",
    requiresTarget: true,
  },
  inverter: {
    type: "inverter",
    name: "Inverter",
    category: "tactical",
    description: "Electromagnetic polarity shifter: flips the current chamber shell (Live becomes Blank, Blank becomes Live).",
    shortDesc: "Flip shell polarity",
    iconName: "Zap",
    requiresTarget: false,
  },
};

export const ALL_ITEM_TYPES: ItemType[] = [
  "magnifying_glass",
  "burner_phone",
  "cigarettes",
  "beer",
  "handsaw",
  "handcuffs",
  "inverter",
];

export const INFO_ITEMS: ItemType[] = ["magnifying_glass", "burner_phone"];
export const SURVIVAL_ITEMS: ItemType[] = ["cigarettes"];
export const GENERAL_ITEMS: ItemType[] = [
  "magnifying_glass",
  "burner_phone",
  "cigarettes",
  "beer",
  "handsaw",
  "handcuffs",
  "inverter",
];
