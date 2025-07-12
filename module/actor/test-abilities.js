import { showDice } from "../dice.js";
import { showRollResultCard } from "../utils.js";

function computeAbilityDrModifier(actor, ability) {
  let modifier = 0;
  const drModifiers = [];
  const items = [];
  for (const item of actor.items) {
    const active = item.system?.equipped ?? item.type === "feat";
    if (!active) continue;
    const val = parseInt(item.system?.drModifiers?.[ability] || 0);
    if (!val) continue;
    modifier += val;
    drModifiers.push(
      `${item.name}: ${game.i18n.localize("MB.DR")} ${val >= 0 ? "+" : ""}${val}`
    );
    items.push(item);
  }
  if (actor.isEncumbered() && ability === "strength") {
    modifier += 2;
    drModifiers.push(
      `${game.i18n.localize("MB.Encumbered")}: ${game.i18n.localize("MB.DR")} +2`
    );
  }
  if (actor.isEncumbered() && ability === "agility") {
    modifier += 2;
    drModifiers.push(
      `${game.i18n.localize("MB.Encumbered")}: ${game.i18n.localize("MB.DR")} +2`
    );
  }
  if (ability === "agility") {
    const armor = actor.equippedArmor();
    if (armor) {
      const armorTier = CONFIG.MB.armorTiers[armor.system.tier.max];
      if (armorTier.agilityModifier) {
        const val = armorTier.agilityModifier;
        modifier += val;
        drModifiers.push(
          `${armor.name}: ${game.i18n.localize("MB.DR")} +${val}`
        );
        items.push(armor);
      }
    }
  }
  return { modifier, drModifiers, items };
}

async function testAbility(
  actor,
  ability,
  abilityKey,
  abilityAbbrevKey,
  drData
) {
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
    drModifiers: drData.drModifiers,
    items: drData.items,
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
  const drData = computeAbilityDrModifier(actor, "strength");
  await testAbility(
    actor,
    "strength",
    "MB.AbilityStrength",
    "MB.AbilityStrengthAbbrev",
    drData
  );
};

export async function testAgility(actor) {
  const drData = computeAbilityDrModifier(actor, "agility");
  await testAbility(
    actor,
    "agility",
    "MB.AbilityAgility",
    "MB.AbilityAgilityAbbrev",
    drData
  );
};

export async function testPresence(actor) {
  const drData = computeAbilityDrModifier(actor, "presence");
  await testAbility(
    actor,
    "presence",
    "MB.AbilityPresence",
    "MB.AbilityPresenceAbbrev",
    drData
  );
};

export async function testToughness(actor) {
  const drData = computeAbilityDrModifier(actor, "toughness");
  await testAbility(
    actor,
    "toughness",
    "MB.AbilityToughness",
    "MB.AbilityToughnessAbbrev",
    drData
  );
};

export async function testCustomAbility(actor, ability) {
  const drData = computeAbilityDrModifier(actor, ability);
  await testAbility(
    actor,
    ability,
    ability.charAt(0).toUpperCase() + ability.slice(1),
    ability.slice(0, 3).toUpperCase(),
    drData
  );
};
