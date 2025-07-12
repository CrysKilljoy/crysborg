import { showRollResult } from "../utils.js";
import { showDice } from "../dice.js";
import { showRollResultCard } from "../utils.js";

export async function rollOmens(actor) {
  const classItem = actor.items.filter((x) => x.type === "class").pop();
  if (!classItem) {
    return;
  }
  const roll = await showRollResult(
    actor,
    "@omenDie",
    classItem.getRollData(),
    `${game.i18n.localize("MB.Omens")}`,
    (roll) => ` ${game.i18n.localize("MB.Omens")}: ${Math.max(0, roll.total)}`
  );
  const newOmens = Math.max(0, roll.total);
  await actor.update({ ["system.omens"]: { max: newOmens, value: newOmens } });
};

export async function testOmens(actor) {
  const omensValue = actor.system.omens.value || 0;
  const omensRoll = new Roll(`1d20+${omensValue}`, actor.getRollData());
  await omensRoll.evaluate();
  await showDice(omensRoll);
  
  const cardTitle = `${game.i18n.localize("MB.Test")} ${game.i18n.localize("MB.Omens")}`;
  const displayFormula = `1d20 + ${omensValue}`;
  const data = {
    cardTitle,
    drModifiers: [],
    items: [],
    rollResults: [
      {
        rollTitle: displayFormula,
        roll: omensRoll,
        outcomeLines: [],
      },
    ],
  };
  await showRollResultCard(actor, data);
};
