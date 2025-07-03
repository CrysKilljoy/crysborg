import { addShowDicePromise, diceSound, showDice } from "../dice.js";
import { hitAutomation, trackAmmo } from "../settings.js";
import { calculateDRModifiers } from "../utils.js";

/**
 * Attack!
 */
export async function attack(actor, itemId) {
  if (hitAutomation()) {
    return await automatedAttack(actor, itemId);
  }
  return await unautomatedAttack(actor, itemId);
};

async function automatedAttack(actor, itemId) {
  let attackDR = await actor.getFlag(
    CONFIG.MB.systemName,
    CONFIG.MB.flags.ATTACK_DR
  );
  if (!attackDR) {
    attackDR = 12; // default
  }
  const targetArmor = await actor.getFlag(
    CONFIG.MB.systemName,
    CONFIG.MB.flags.TARGET_ARMOR
  );

  const item = actor.items.get(itemId);
  const itemRollData = item.getRollData();
  const isRanged = itemRollData.weaponType === "ranged";
  const ability = isRanged ? "presence" : "strength";

  const { drSources, totalModifier } = calculateDRModifiers(actor, attackDR, 'attack', ability, item);

  const dialogData = {
    attackDR,
    config: CONFIG.crysborg,
    itemId,
    targetArmor,
    drSources,
    totalModifier
  };
  const html = await renderTemplate(
    "systems/crysborg/templates/dialog/attack-dialog.hbs",
    dialogData
  );
  return new Promise((resolve) => {
    new Dialog({
      title: game.i18n.localize("MB.Attack"),
      content: html,
      buttons: {
        roll: {
          icon: '<i class="fas fa-dice-d20"></i>',
          label: game.i18n.localize("MB.Roll"),
          callback: (html) => attackDialogCallback(actor, html),
        },
      },
      default: "roll",
      render: (html) => {
        html
          .find("input[name='attackdr']")
          .on("change", onAttackBaseDRChange.bind(actor));
        html.find("input[name='attackdr']").trigger("change");
      },
      close: () => resolve(null),
    }).render(true);
  });
};

function onAttackBaseDRChange(event) {
  const baseDR = parseInt(event.target.value) || 0;
  const itemId = event.target.form.itemid.value;
  const item = this.items.get(itemId);
  const itemRollData = item.getRollData();
  const isRanged = itemRollData.weaponType === "ranged";
  const ability = isRanged ? "presence" : "strength";

  const { drSources, totalModifier } = calculateDRModifiers(this, baseDR, 'attack', ability, item);
  const modifiedDR = baseDR + totalModifier;

  // Update the modified DR field
  event.target.form.attackmodifieddr.value = modifiedDR;

  // Update the tooltip
  const tooltip = drSources.map(source => `${source.name}: ${source.value > 0 ? '+' : ''}${source.value}`).join('\n');
  event.target.form.attackmodifieddr.setAttribute('data-tooltip', `<div class='dr-sources-tooltip'>${tooltip}</div>`);

  // Update the modifier list
  const modifierList = event.target.form.querySelector('.dr-modifier');
  if (modifierList) {
    modifierList.innerHTML = `( ${drSources.map(source => `${source.name}: ${source.value > 0 ? '+' : ''}${source.value}`).join(', ')} )`;
  }
}

async function unautomatedAttack(actor, itemId) {
  const item = actor.items.get(itemId);
  const itemRollData = item.getRollData();
  const actorRollData = actor.getRollData();
  const isRanged = itemRollData.weaponType === "ranged";
  const ability = isRanged ? "presence" : "strength";
  const attackModifier = actor.getCombatModifier('attack');
  const attackRoll = new Roll(`d20+@abilities.${ability}.value`, actorRollData);
  await attackRoll.evaluate();
  await showDice(attackRoll);

  const abilityAbbrevKey = isRanged
    ? "MB.AbilityPresenceAbbrev"
    : "MB.AbilityStrengthAbbrev";
  const weaponTypeKey = isRanged ? "MB.WeaponTypeRanged" : "MB.WeaponTypeMelee";
  await decrementWeaponAmmo(actor, item);

  const cardTitle = `${game.i18n.localize(weaponTypeKey)} ${game.i18n.localize(
    "MB.Attack"
  )}`;
  const attackFormula = `1d20 + ${game.i18n.localize(abilityAbbrevKey)}`;
  const rollResult = {
    actor,
    attackFormula,
    attackRoll,
    cardTitle,
    item,
    attackModifier
  };
  const html = await renderTemplate(
    "systems/crysborg/templates/chat/unautomated-attack-roll-card.hbs",
    rollResult
  );
  ChatMessage.create({
    content: html,
    sound: diceSound(),
    speaker: ChatMessage.getSpeaker({ actor }),
  });
};

/**
 * Callback from attack dialog.
 */
async function attackDialogCallback(actor, html) {
  const form = html[0].querySelector("form");
  const itemId = form.itemid.value;
  const attackDR = parseInt(form.attackdr.value);
  const targetArmor = form.targetarmor.value;
  if (!itemId || !attackDR) {
    // TODO: prevent form submit via required fields
    return;
  }
  await actor.setFlag(
    CONFIG.MB.systemName,
    CONFIG.MB.flags.ATTACK_DR,
    attackDR
  );
  await actor.setFlag(
    CONFIG.MB.systemName,
    CONFIG.MB.flags.TARGET_ARMOR,
    targetArmor
  );
  await rollAttack(actor, itemId, attackDR, targetArmor);
};

/**
 * Do the actual attack rolls and resolution.
 */
async function rollAttack(actor, itemId, attackDR, targetArmor) {
  const item = actor.items.get(itemId);
  const itemRollData = item.getRollData();
  const actorRollData = actor.getRollData();

  // Calculate DR modifiers
  const isRanged = itemRollData.weaponType === "ranged";
  const ability = isRanged ? "presence" : "strength";
  const { drSources, totalModifier } = calculateDRModifiers(actor, attackDR, 'attack', ability, item);
  const modifiedDR = attackDR + totalModifier;

  // roll 1: attack
  const attackRoll = new Roll(`d20+@abilities.${ability}.value`, actorRollData);
  await attackRoll.evaluate();
  await showDice(attackRoll);

  const d20Result = attackRoll.terms[0].results[0].result;
  const fumbleTarget = itemRollData.fumbleOn ?? 1;
  const critTarget = itemRollData.critOn ?? 20;
  const isFumble = d20Result <= fumbleTarget;
  const isCrit = d20Result >= critTarget;
  // nat 1 is always a miss, nat 20 is always a hit, otherwise check vs DR
  const isHit =
    attackRoll.total !== 1 &&
    (attackRoll.total === 20 || attackRoll.total >= modifiedDR);

  let attackOutcome = null;
  let damageRoll = null;
  let targetArmorRoll = null;
  let takeDamage = null;
  if (isHit) {
    // HIT!!!
    attackOutcome = game.i18n.localize(isCrit ? "MB.AttackCritText" : "MB.Hit");
    // roll 2: damage.
    // Use parentheses for critical 2x in case damage die something like 1d6+1
    const damageFormula = isCrit ? "(@damageDie) * 2" : "@damageDie";
    damageRoll = new Roll(damageFormula, itemRollData);
    await damageRoll.evaluate();
    const dicePromises = [];
    addShowDicePromise(dicePromises, damageRoll);
    let damage = damageRoll.total;
    // roll 3: target damage reduction
    if (targetArmor) {
      targetArmorRoll = new Roll(targetArmor, {});
      await targetArmorRoll.evaluate();
      addShowDicePromise(dicePromises, targetArmorRoll);
      damage = Math.max(damage - targetArmorRoll.total, 0);
    }
    if (dicePromises) {
      await Promise.all(dicePromises);
    }
    takeDamage = `${game.i18n.localize(
      "MB.Inflict"
    )} ${damage} ${game.i18n.localize("MB.Damage")}`;
  } else {
    // MISS!!!
    attackOutcome = game.i18n.localize(
      isFumble ? "MB.AttackFumbleText" : "MB.Miss"
    );
  }

  // TODO: decide keys in handlebars/template?
  const abilityAbbrevKey = isRanged
    ? "MB.AbilityPresenceAbbrev"
    : "MB.AbilityStrengthAbbrev";
  const weaponTypeKey = isRanged ? "MB.WeaponTypeRanged" : "MB.WeaponTypeMelee";
  const rollResult = {
    actor,
    attackDR,
    attackFormula: `1d20 + ${game.i18n.localize(abilityAbbrevKey)}`,
    attackRoll,
    attackOutcome,
    damageRoll,
    drSources,
    items: [item],
    modifiedDR,
    takeDamage,
    targetArmorRoll,
    weaponTypeKey,
  };
  await decrementWeaponAmmo(actor, item);
  await renderAttackRollCard(actor, rollResult);
};

async function decrementWeaponAmmo(actor, weapon) {
  if (weapon.system.usesAmmo && weapon.system.ammoId && trackAmmo()) {
    const ammo = actor.items.get(weapon.system.ammoId);
    if (ammo) {
      const attr = "system.quantity";
      const currQuantity = getProperty(ammo.data, attr);
      if (currQuantity > 1) {
        // decrement quantity by 1
        await ammo.update({ [attr]: currQuantity - 1 });
      } else {
        // quantity is now zero, so delete ammo item
        await actor.deleteEmbeddedDocuments("Item", [ammo.id]);
      }
    }
  }
};

/**
 * Show attack rolls/result in a chat roll card.
 */
async function renderAttackRollCard(actor, rollResult) {
  const html = await renderTemplate(
    "systems/crysborg/templates/chat/attack-roll-card.hbs",
    rollResult
  );
  ChatMessage.create({
    content: html,
    sound: diceSound(),
    speaker: ChatMessage.getSpeaker({ actor }),
  });
};
