import { addShowDicePromise, diceSound, showDice } from "../dice.js";
import { hitAutomation } from "../settings.js";
import { showRollResultCard } from "../utils.js";

function computeDefendDrModifier(actor) {
  let modifier = 0;
  const drModifiers = [];
  const items = [];
  for (const item of actor.items) {
    const active = item.system?.equipped ?? item.type === "feat";
    if (!active) continue;
    const mods = item.system?.drModifiers || {};
    const candidates = [];
    if (mods.defense) candidates.push(parseInt(mods.defense));
    if (mods.agility) candidates.push(parseInt(mods.agility));
    if (candidates.length) {
      const value = candidates.reduce((a, b) => (Math.abs(b) > Math.abs(a) ? b : a));
      modifier += value;
      drModifiers.push(
        `${item.name}: ${game.i18n.localize("MB.DR")} ${value >= 0 ? "+" : ""}${value}`
      );
      items.push(item);
    }
  }
  const armor = actor.equippedArmor();
  if (armor) {
    const maxTier = parseInt(armor.system.tier.max);
    const defenseModifier = CONFIG.MB.armorTiers[maxTier].defenseModifier;
    if (defenseModifier) {
      modifier += defenseModifier;
      drModifiers.push(
        `${armor.name}: ${game.i18n.localize("MB.DR")} +${defenseModifier}`
      );
      items.push(armor);
    }
  }
  if (actor.isEncumbered()) {
    modifier += 2;
    drModifiers.push(
      `${game.i18n.localize("MB.Encumbered")}: ${game.i18n.localize("MB.DR")} +2`
    );
  }
  return { modifier, drModifiers, items };
}

/**
 * Defend!
 */
export async function defend(actor) {
  if (hitAutomation()) {
    return await automatedDefend(actor);
  }
  return await unautomatedDefend(actor);
};

async function automatedDefend(actor) {
  // look up any previous DR or incoming attack value
  let defendDR = await actor.getFlag(
    CONFIG.MB.systemName,
    CONFIG.MB.flags.DEFEND_DR
  );
  if (!defendDR) {
    defendDR = 12; // default
  }
  let incomingAttack = await actor.getFlag(
    CONFIG.MB.systemName,
    CONFIG.MB.flags.INCOMING_ATTACK
  );
  if (!incomingAttack) {
    incomingAttack = "1d4"; // default
  }

  const { modifier, drModifiers } = computeDefendDrModifier(actor);
  const modifiedDR = parseInt(defendDR) + modifier;

  const dialogData = {
    defendDR,
    modifiedDR,
    drModifiers,
    incomingAttack,
  };
  const html = await renderTemplate(
    "systems/crysborg/templates/dialog/defend-dialog.hbs",
    dialogData
  );

  return new Promise((resolve) => {
    new Dialog({
      title: game.i18n.localize("MB.Defend"),
      content: html,
      buttons: {
        roll: {
          icon: '<i class="fas fa-dice-d20"></i>',
          label: game.i18n.localize("MB.Roll"),
          callback: (html) => defendDialogCallback(actor, html),
        },
      },
      default: "roll",
      render: (html) => {
        html
          .find("input[name='defensebasedr']")
          .data("drModifier", modifier)
          .on("change", onDefenseBaseDRChange);
        html.find("input[name='defensebasedr']").trigger("change");
      },
      close: () => resolve(null),
    }).render(true);
  });
};

async function unautomatedDefend(actor) {
  const { drModifiers, items } = computeDefendDrModifier(actor);
  const defendRoll = new Roll(
    "d20+@abilities.agility.value",
    actor.getRollData()
  );
  await defendRoll.evaluate();
  await showDice(defendRoll);
  const data = {
    cardTitle: game.i18n.localize("MB.Defend"),
    drModifiers,
    items,
    rollResults: [
      {
        rollTitle: `1d20 + ${game.i18n.localize("MB.AbilityAgilityAbbrev")}`,
        roll: defendRoll,
        outcomeLines: [],
      },
    ],
  };
  await showRollResultCard(actor, data);
};

// use a regular function, since we're binding the actor to this
function onDefenseBaseDRChange(event) {
  event.preventDefault();
  const baseInput = $(event.currentTarget);
  const drModifier = parseInt(baseInput.data("drModifier")) || 0;
  const modifiedDr = parseInt(baseInput[0].value) + drModifier;
  const modifiedInput = baseInput
    .parent()
    .parent()
    .find("input[name='defensemodifieddr']");
  modifiedInput.val(modifiedDr.toString());
}

/**
 * Callback from defend dialog.
 */
async function defendDialogCallback(actor, html) {
  const form = html[0].querySelector("form");
  const baseDR = parseInt(form.defensebasedr.value);
  const modifiedDR = parseInt(form.defensemodifieddr.value);
  const incomingAttack = form.incomingattack.value;
  if (!baseDR || !modifiedDR || !incomingAttack) {
    // TODO: prevent dialog/form submission w/ required field(s)
    return;
  }
  await actor.setFlag(CONFIG.MB.systemName, CONFIG.MB.flags.DEFEND_DR, baseDR);
  await actor.setFlag(
    CONFIG.MB.systemName,
    CONFIG.MB.flags.INCOMING_ATTACK,
    incomingAttack
  );
  await rollDefend(actor, modifiedDR, incomingAttack);
};

/**
 * Do the actual defend rolls and resolution.
 */
async function rollDefend(actor, defendDR, incomingAttack) {
  const rollData = actor.getRollData();
  const isCarriage = actor.type === "carriage";
  const armor = isCarriage ? null : actor.equippedArmor();
  const shield = isCarriage ? null : actor.equippedShield();
  const { drModifiers, items: modItems } = computeDefendDrModifier(actor);

  // roll 1: defend
  const defendFormula = isCarriage ? "d20" : "d20+@abilities.agility.value";
  const defendRoll = new Roll(defendFormula, rollData);
  await defendRoll.evaluate();
  await showDice(defendRoll);

  const d20Result = defendRoll.terms[0].results[0].result;
  const isFumble = d20Result === 1;
  const isCrit = d20Result === 20;

  const items = [...modItems];
  let damageRoll = null;
  let armorRoll = null;
  let defendOutcome = null;
  let takeDamage = null;

  if (isCrit) {
    // critical success
    defendOutcome = game.i18n.localize("MB.DefendCritText");
  } else if (defendRoll.total >= defendDR) {
    // success
    defendOutcome = game.i18n.localize("MB.Dodge");
  } else {
    // failure
    if (isFumble) {
      defendOutcome = game.i18n.localize("MB.DefendFumbleText");
    } else {
      defendOutcome = game.i18n.localize("MB.YouAreHit");
    }

    // roll 2: incoming damage
    let damageFormula = incomingAttack;
    if (isFumble) {
      damageFormula += " * 2";
    }
    damageRoll = new Roll(damageFormula, {});
    await damageRoll.evaluate();
    const dicePromises = [];
    addShowDicePromise(dicePromises, damageRoll);
    let damage = damageRoll.total;

    // roll 3: damage reduction from equipped armor and shield
  let damageReductionDie = "";
  if (actor.type === "carriage") {
    damageReductionDie = actor.system.armor || "";
  } else {
    if (armor) {
      damageReductionDie =
        CONFIG.MB.armorTiers[armor.system.tier.value].damageReductionDie;
      if (!items.includes(armor)) items.push(armor);
    }
    if (shield) {
      damageReductionDie += "+1";
      if (!items.includes(shield)) items.push(shield);
    }
  }
    if (damageReductionDie && damageReductionDie !== "0") {
      armorRoll = new Roll("@die", { die: damageReductionDie });
      await armorRoll.evaluate();
      addShowDicePromise(dicePromises, armorRoll);
      damage = Math.max(damage - armorRoll.total, 0);
    }
    if (dicePromises) {
      await Promise.all(dicePromises);
    }
    takeDamage = `${game.i18n.localize(
      "MB.Take"
    )} ${damage} ${game.i18n.localize("MB.Damage")}`;
  }

  const rollResult = {
    actor: actor,
    armorRoll,
    damageRoll,
    defendDR,
    defendFormula: isCarriage
      ? "1d20"
      : `1d20 + ${game.i18n.localize("MB.AbilityAgilityAbbrev")}`,
    defendOutcome,
    defendRoll,
    drModifiers,
    items,
    takeDamage,
  };
  await renderDefendRollCard(actor, rollResult);
};

/**
 * Show attack rolls/result in a chat roll card.
 */
async function renderDefendRollCard(actor, rollResult) {
  const html = await renderTemplate(
    "systems/crysborg/templates/chat/defend-roll-card.hbs",
    rollResult
  );
  ChatMessage.create({
    content: html,
    sound: diceSound(),
    speaker: ChatMessage.getSpeaker({ actor }),
  });
};
