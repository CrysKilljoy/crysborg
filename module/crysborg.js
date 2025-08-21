/**
 * crys borg module.
 */
import { MBActor } from "./actor/actor.js";
import { MBCharacterSheet } from "./actor/sheet/character-sheet.js";
import { MBContainerSheet } from "./actor/sheet/container-sheet.js";
import { MBCreatureSheet } from "./actor/sheet/creature-sheet.js";
import { MBFollowerSheet } from "./actor/sheet/follower-sheet.js";
import { MBMiseryTrackerSheet } from "./actor/sheet/misery-tracker-sheet.js";
import { MBCarriageSheet } from "./actor/sheet/carriage-sheet.js";
import { registerCombat } from "./combat.js";
import { MB } from "./config.js";
import { enrichTextEditors } from "./enricher.js";
import { registerFonts } from "./fonts.js";
import { configureHandlebars } from "./handlebars.js";
import { registerHooks } from "./hooks.js";
import { MBItem } from "./item/item.js";
import { MBItemSheet } from "./item/sheet/item-sheet.js";
import { MBJournalSheet } from "./journal/journal-sheet.js";
import { registerMacros } from "./macros.js";
import { registerSystemSettings } from "./settings.js";
import { dumpUuids } from "./exporter.js";
import { drawFromTable } from "./packutils.js";
// import { TagManager } from "./utils/tag-manager.js";

Hooks.once("init", async function () {
  console.log("Initializing CRYS BORG system");
  game.crysborg = {
    // TagManager, // Export TagManager for system-wide access
  };
  CONFIG.MB = MB;
  registerSystemSettings();
  registerDocumentClasses();
  registerSheets();
  enrichTextEditors();
  configureHandlebars();
  registerCombat();
  registerMacros();
  registerHooks();
  registerFonts();

  game.exporter = {
    dumpUuids,
    drawFromTable,
  };
});

function registerDocumentClasses() {
  CONFIG.Actor.documentClass = MBActor;
  CONFIG.Item.documentClass = MBItem;
}

function registerSheets() {
  console.log("📦 registerSheets() wurde aufgerufen");

  // Register all actor sheets
  Actors.unregisterSheet("core", ActorSheet);

  console.log("MBCharacterSheet:", MBCharacterSheet);
  Actors.registerSheet("crysborg", MBCharacterSheet, {
    types: ["character"],
    label: "Character Sheet",
    makeDefault: true,
  });

  console.log("MBContainerSheet:", MBContainerSheet);
  Actors.registerSheet("crysborg", MBContainerSheet, {
    types: ["container"],
    label: "Container Sheet",
    makeDefault: true,
  });

  console.log("MBCreatureSheet:", MBCreatureSheet);
  Actors.registerSheet("crysborg", MBCreatureSheet, {
    types: ["creature"],
    label: "Creature Sheet",
    makeDefault: true,
  });

  console.log("MBFollowerSheet:", MBFollowerSheet);
  Actors.registerSheet("crysborg", MBFollowerSheet, {
    types: ["follower"],
    label: "Follower Sheet",
    makeDefault: true,
  });

  console.log("MBCarriageSheet:", MBCarriageSheet);
  Actors.registerSheet("crysborg", MBCarriageSheet, {
    types: ["carriage"],
    label: "Carriage Sheet",
    makeDefault: true,
  });

  console.log("MBMiseryTrackerSheet:", MBMiseryTrackerSheet);
  Actors.registerSheet("crysborg", MBMiseryTrackerSheet, {
    types: ["misery-tracker"],
    label: "Misery Tracker Sheet",
    makeDefault: true,
  });

  // Register all item sheets
  Items.unregisterSheet("core", ItemSheet);
  Items.registerSheet("crysborg", MBItemSheet, { makeDefault: true });

  // Register journal sheet
  Journal.unregisterSheet("core", JournalSheet);
  Journal.registerSheet("crysborg", MBJournalSheet, { makeDefault: true });
}

Hooks.once("ready", () => {
  console.log("✅ CONFIG.Actor.sheetClasses Map:");
  Object.entries(CONFIG.Actor.sheetClasses).forEach(([type, sheets]) => {
    // sheets ist meist eine Map (Foundry V10+)
    if (sheets instanceof Map) {
      sheets.forEach((sheet, id) => {
        console.log(`• Type: ${type}, id: ${id}, label: "${sheet.label}", default: ${sheet.default}`);
      });
    } else if (Array.isArray(sheets)) {
      sheets.forEach(sheet => {
        console.log(`• Type: ${type}, id: ${sheet.id}, label: "${sheet.label}", default: ${sheet.default}`);
      });
    } else if (typeof sheets === "object") {
      Object.entries(sheets).forEach(([id, sheet]) => {
        console.log(`• Type: ${type}, id: ${id}, label: "${sheet.label}", default: ${sheet.default}`);
      });
    } else {
      console.log(`• Type: ${type}, sheets:`, sheets);
    }
  });
});