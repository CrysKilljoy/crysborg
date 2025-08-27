import { showRollResult } from "../utils.js";
import { drawFromTable } from "../packutils.js";

export async function useFeat(actor, itemId) {
  const item = actor.items.get(itemId);
  if (!item || !item.system.rollLabel) {
    return;
  }

  if (item.system.rollMacro) {
    let executed = false;
    if (item.system.rollMacro.includes(",")) {
      // assume it's a CSV string for {pack},{document name}
      const [packName, docName] = item.system.rollMacro.split(",");
      const pack = game.packs.get(packName);
      if (pack) {
        const content = await pack.getDocuments();
        const doc = content.find((i) => i.name === docName);
        if (doc instanceof Macro) {
          doc.execute();
          executed = true;
        } else if (doc instanceof RollTable) {
          await doc.draw({ displayChat: true });
          executed = true;
        }
      }
      if (!executed) {
        const draw = await drawFromTable(packName, docName, null, true);
        if (!draw) {
          console.log(`Could not find macro or table ${docName} in pack ${packName}.`);
        }
      }
    } else {
      // assume it's the name of a macro in the current world/game
      const macro = game.macros.find((m) => m.name === item.system.rollMacro);
      if (macro) {
        macro.execute();
        executed = true;
      }
      if (!executed) {
        const table = game.tables.getName(item.system.rollMacro);
        if (table) {
          await table.draw({ displayChat: true });
        } else {
          console.log(`Could not find macro or table ${item.system.rollMacro}.`);
        }
      }
    }
  } else if (item.system.rollFormula) {
    // roll formula
    await showRollResult(
      actor,
      item.system.rollFormula,
      actor.getRollData(),
      item.system.rollLabel,
      () => ``
    );
  }
};
