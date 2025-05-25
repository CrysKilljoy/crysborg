/**
 * crys borg module.
 */
import { MBActor } from "./actor/actor.js";
import { MBCharacterSheet } from "./actor/sheet/character-sheet.js";
import { MBContainerSheet } from "./actor/sheet/container-sheet.js";
import { MBCreatureSheet } from "./actor/sheet/creature-sheet.js";
import { MBFollowerSheet } from "./actor/sheet/follower-sheet.js";
import { MBMiseryTrackerSheet } from "./actor/sheet/misery-tracker-sheet.js";
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
import { TagManager } from "./utils/tag-manager.js";

Hooks.once("init", async function () {
  console.log("Initializing CRYS BORG system");
  game.crysborg = {
    TagManager, // Export TagManager for system-wide access
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
  // Register all actor sheets
  Actors.unregisterSheet("core", ActorSheet);
  Actors.registerSheet("crysborg", MBCharacterSheet, {
    types: ["character"],
    makeDefault: true,
  });
  Actors.registerSheet("crysborg", MBContainerSheet, {
    types: ["container"],
    makeDefault: true,
  });
  Actors.registerSheet("crysborg", MBCreatureSheet, {
    types: ["creature"],
    makeDefault: true,
  });
  Actors.registerSheet("crysborg", MBFollowerSheet, {
    types: ["follower"],
    makeDefault: true,
  });
  Actors.registerSheet("crysborg", MBMiseryTrackerSheet, {
    types: ["misery-tracker"],
    makeDefault: true,
  });

  // Register all item sheets
  Items.unregisterSheet("core", ItemSheet);
  Items.registerSheet("crysborg", MBItemSheet, { makeDefault: true });

  // Register journal sheet
  Journal.unregisterSheet("core", JournalSheet);
  Journal.registerSheet("crysborg", MBJournalSheet, { makeDefault: true });
}
