import { MB } from "../config.js";
import { drawFromTable, documentFromPack } from "../packutils.js";

export async function rollBroken() {
  if (MB.brokenPack && MB.brokenTable) {
    await drawFromTable(MB.brokenPack, MB.brokenTable, null, true);
  }
}

export async function rollDeathCheck(actor) {
  if (MB.deathCheckPack && MB.deathCheckTable) {
    // Create and evaluate roll first
    const roll = new Roll("1d20 + @abilities.toughness.value", actor.getRollData());
    await roll.evaluate({async: true});
    // Pass the evaluated roll to drawFromTable
    const table = await documentFromPack(MB.deathCheckPack, MB.deathCheckTable);
    if (!table) return;
    await table.draw({roll, displayChat: true}); 
  }
}

export async function rollDropCheck(actor) {
  if (MB.dropCheckPack && MB.dropCheckTable) {
    // Create and evaluate roll first
    const roll = new Roll("1d20 + @abilities.toughness.value", actor.getRollData());
    await roll.evaluate({async: true});
    // Pass the evaluated roll to drawFromTable
    const table = await documentFromPack(MB.dropCheckPack, MB.dropCheckTable);
    if (!table) return;
    await table.draw({roll, displayChat: true});
  }
}
