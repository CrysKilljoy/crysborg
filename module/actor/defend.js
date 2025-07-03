import { addShowDicePromise, diceSound, showDice } from "../dice.js";
import { hitAutomation } from "../settings.js";
import { showRollResultCard } from "../utils.js";
import { calculateDRModifiers } from "../utils.js";

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

  const { drSources, totalModifier } = calculateDRModifiers(actor, defendDR, 'defense', 'agility');

  const dialogData = {
    defendDR,
    drSources,
    totalModifier,
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
          .on("change", onDefenseBaseDRChange.bind(actor));
        html.find("input[name='defensebasedr']").trigger("change");
      },
      close: () => resolve(null),
    }).render(true);
  });
};

async function unautomatedDefend(actor) {
  const armor = actor.equippedArmor();
  const drModifiers = [];
  
  // Gather DR sources
  const drSources = [
    { name: game.i18n.localize("MB.BaseDR"), value: 12 }  // Default DR
  ];

  // Add armor modifier if present
  if (armor) {
    const maxTier = parseInt(armor.system.tier.max);
    const defenseModifier = CONFIG.MB.armorTiers[maxTier].defenseModifier;
    if (defenseModifier) {
      drModifiers.push(
        `${armor.name}: ${game.i18n.localize("MB.DR")} +${defenseModifier}`
      );
      drSources.push({
        name: armor.name,
        value: defenseModifier
      });
    }
  }

  // Add encumbered modifier if present
  if (actor.isEncumbered()) {
    drModifiers.push(
      `${game.i18n.localize("MB.Encumbered")}: ${game.i18n.localize("MB.DR")} +2`
    );
    drSources.push({
      name: game.i18n.localize("MB.Encumbered"),
      value: 2
    });
  }

  // Get all carried items
  const carriedItems = actor.items.filter(i => i.system.carried);
  
  // Track which items have already contributed a modifier
  const itemsWithModifiers = new Set();
  
  // First pass: Add combat modifiers (these take priority)
  for (const item of carriedItems) {
    if (item.system.combatModifiers && item.system.combatModifiers.defense !== 0) {
      drSources.push({
        name: item.name,
        value: item.system.combatModifiers.defense
      });
      itemsWithModifiers.add(item.id);
    }
  }

  // Second pass: Add ability DR modifiers for items that don't have combat modifiers
  for (const item of carriedItems) {
    if (!itemsWithModifiers.has(item.id) && 
        item.system.drModifiers && 
        item.system.drModifiers.agility !== 0) {
      drSources.push({
        name: `${item.name} (${game.i18n.localize("MB.AbilityAgilityAbbrev")})`,
        value: item.system.drModifiers.agility
      });
    }
  }

  const defenseModifier = actor.getCombatModifier('defense');

  // Calculate total modifier
  const totalModifier = drSources.reduce((sum, source) => sum + source.value, 0);

  const defendRoll = new Roll("d20+@abilities.agility.value", actor.getRollData());
  await defendRoll.evaluate();
  await showDice(defendRoll);

  const d20Result = defendRoll.terms[0].results[0].result;
  const isFumble = d20Result === 1;
  const isCrit = d20Result === 20;

  const modifiedDR = defendDR + totalModifier;
  const items = [];
  let damageRoll = null;
  let armorRoll = null;
  let defendOutcome = null;
  let takeDamage = null;

  if (isCrit) {
    // critical success
    defendOutcome = game.i18n.localize("MB.DefendCritText");
  } else if (defendRoll.total >= modifiedDR) {
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
    if (armor) {
      damageReductionDie =
        CONFIG.MB.armorTiers[armor.system.tier.value].damageReductionDie;
      items.push(armor);
    }
    if (damageReductionDie) {
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
    defendFormula: `1d20 + ${game.i18n.localize("MB.AbilityAgilityAbbrev")}`,
    defendOutcome,
    defendRoll,
    items,
    takeDamage,
    drSources,
    defenseModifier
  };
  await renderDefendRollCard(actor, rollResult);
};

function onDefenseBaseDRChange(event) {
  const baseDR = parseInt(event.target.value) || 0;
  const { drSources, totalModifier } = calculateDRModifiers(this, baseDR, 'defense', 'agility');
  const modifiedDR = baseDR + totalModifier;

  // Update the modified DR field
  event.target.form.defensemodifieddr.value = modifiedDR;

  // Update the tooltip
  const tooltip = drSources.map(source => `${source.name}: ${source.value > 0 ? '+' : ''}${source.value}`).join('\n');
  event.target.form.defensemodifieddr.setAttribute('data-tooltip', `<div class='dr-sources-tooltip'>${tooltip}</div>`);

  // Update the modifier list
  const modifierList = event.target.form.querySelector('.dr-modifier');
  if (modifierList) {
    modifierList.innerHTML = `( ${drSources.map(source => `${source.name}: ${source.value > 0 ? '+' : ''}${source.value}`).join(', ')} )`;
  }
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

/**
 * Do the actual defend rolls and resolution.
 */
async function rollDefend(actor, defendDR, incomingAttack) {
  const rollData = actor.getRollData();
  const armor = actor.equippedArmor();
  const shield = actor.equippedShield();

  // Gather DR sources
  const drSources = [
    { name: game.i18n.localize("MB.BaseDR"), value: defendDR }
  ];

  // Add armor modifier if present
  if (armor) {
    const maxTier = parseInt(armor.system.tier.max);
    const defenseModifier = CONFIG.MB.armorTiers[maxTier].defenseModifier;
    if (defenseModifier) {
      drSources.push({
        name: armor.name,
        value: defenseModifier
      });
    }
  }

  // Add encumbered modifier if present
  if (actor.isEncumbered()) {
    drSources.push({
      name: game.i18n.localize("MB.Encumbered"),
      value: 2
    });
  }

  // Get all carried items
  const carriedItems = actor.items.filter(i => i.system.carried);
  
  // Track which items have already contributed a modifier
  const itemsWithModifiers = new Set();
  
  // First pass: Add combat modifiers (these take priority)
  for (const item of carriedItems) {
    if (item.system.combatModifiers && item.system.combatModifiers.defense !== 0) {
      drSources.push({
        name: item.name,
        value: item.system.combatModifiers.defense
      });
      itemsWithModifiers.add(item.id);
    }
  }

  // Second pass: Add ability DR modifiers for items that don't have combat modifiers
  for (const item of carriedItems) {
    if (!itemsWithModifiers.has(item.id) && 
        item.system.drModifiers && 
        item.system.drModifiers.agility !== 0) {
      drSources.push({
        name: `${item.name} (${game.i18n.localize("MB.AbilityAgilityAbbrev")})`,
        value: item.system.drModifiers.agility
      });
    }
  }

  // Calculate total modifier
  const totalModifier = drSources.reduce((sum, source) => {
    // Skip the base DR source when calculating modifiers
    if (source.name === game.i18n.localize("MB.BaseDR")) {
      return sum;
    }
    return sum + source.value;
  }, 0);
  const modifiedDR = defendDR + totalModifier;

  // roll 1: defend
  const defendRoll = new Roll("d20+@abilities.agility.value", rollData);
  await defendRoll.evaluate();
  await showDice(defendRoll);

  const d20Result = defendRoll.terms[0].results[0].result;
  const isFumble = d20Result === 1;
  const isCrit = d20Result === 20;

  const items = [];
  let damageRoll = null;
  let armorRoll = null;
  let defendOutcome = null;
  let takeDamage = null;

  if (isCrit) {
    // critical success
    defendOutcome = game.i18n.localize("MB.DefendCritText");
  } else if (defendRoll.total >= modifiedDR) {
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
    if (armor) {
      damageReductionDie =
        CONFIG.MB.armorTiers[armor.system.tier.value].damageReductionDie;
      items.push(armor);
    }
    if (shield) {
      damageReductionDie += "+1";
      items.push(shield);
    }
    if (damageReductionDie) {
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
    defendFormula: `1d20 + ${game.i18n.localize("MB.AbilityAgilityAbbrev")}`,
    defendOutcome,
    defendRoll,
    items,
    takeDamage,
    drSources,
    modifiedDR
  };
  await renderDefendRollCard(actor, rollResult);
}
