import { showDice } from "../dice.js";
import { showRollResultCard } from "../utils.js";

function getItemDRModifiers(actor, ability) {
  return actor.items
    .filter(item => 
      item.system.drModifiers && 
      item.system.drModifiers[ability] && 
      item.system.drModifiers[ability] !== 0
    )
    .map(item => ({
      source: item.name,
      value: item.system.drModifiers[ability]
    }));
}

async function testAbility(
  actor,
  ability,
  abilityKey,
  abilityAbbrevKey,
  drModifiers
) {
  drModifiers = drModifiers || [];
  
  // Add DR modifiers from items
  const itemModifiers = getItemDRModifiers(actor, ability);
  for (const mod of itemModifiers) {
    const sign = mod.value > 0 ? '+' : '';
    drModifiers.push(
      `${mod.source}: ${game.i18n.localize("MB.DR")} ${sign}${mod.value}`
    );
  }

  const abilityRoll = new Roll(
    `1d20+@abilities.${ability}.value`,
    actor.getRollData()
  );
  await abilityRoll.evaluate();
  await showDice(abilityRoll);
  const cardTitle = `${game.i18n.localize("MB.Test")} ${game.i18n.localize(
    abilityKey
  )}`;
  const displayFormula = `1d20 + ${game.i18n.localize(abilityAbbrevKey)}`;
  const data = {
    cardTitle,
    drModifiers,
    rollResults: [
      {
        rollTitle: displayFormula,
        roll: abilityRoll,
        outcomeLines: [],
      },
    ],
  };
  await showRollResultCard(actor, data);
};

export async function testStrength(actor) {
  const drModifiers = [];
  if (actor.isEncumbered()) {
    drModifiers.push(
      `${game.i18n.localize("MB.Encumbered")}: ${game.i18n.localize(
        "MB.DR"
      )} +2`
    );
  }
  await testAbility(
    actor,
    "strength",
    "MB.AbilityStrength",
    "MB.AbilityStrengthAbbrev",
    drModifiers
  );
};

export async function testAgility(actor) {
  const drModifiers = [];
  const armor = actor.equippedArmor();
  if (armor) {
    const armorTier = CONFIG.MB.armorTiers[armor.system.tier.max];
    if (armorTier.agilityModifier) {
      drModifiers.push(
        `${armor.name}: ${game.i18n.localize("MB.DR")} +${
          armorTier.agilityModifier
        }`
      );
    }
  }
  if (actor.isEncumbered()) {
    drModifiers.push(
      `${game.i18n.localize("MB.Encumbered")}: ${game.i18n.localize(
        "MB.DR"
      )} +2`
    );
  }
  await testAbility(
    actor,
    "agility",
    "MB.AbilityAgility",
    "MB.AbilityAgilityAbbrev",
    drModifiers
  );
};

export async function testPresence(actor) {
  await testAbility(
    actor,
    "presence",
    "MB.AbilityPresence",
    "MB.AbilityPresenceAbbrev",
    null
  );
};

export async function testToughness(actor) {
  await testAbility(
    actor,
    "toughness",
    "MB.AbilityToughness",
    "MB.AbilityToughnessAbbrev",
    null
  );
};

export async function testCustomAbility(actor, ability) {
  await testAbility(
    actor,
    ability,
    ability.charAt(0).toUpperCase() + ability.slice(1),
    ability.slice(0, 3).toUpperCase(),
    null
  );
};
