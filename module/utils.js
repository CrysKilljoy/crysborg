import { diceSound, showDice } from "./dice.js";

export const byName = (a, b) =>
  a.name > b.name ? 1 : b.name > a.name ? -1 : 0;

// https://stackoverflow.com/questions/2450954/how-to-randomize-shuffle-a-javascript-array
export function shuffle(array) {
  let currentIndex = array.length,
    randomIndex;
  // While there remain elements to shuffle.
  while (currentIndex != 0) {
    // Pick a remaining element.
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    // And swap it with the current element.
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex],
      array[currentIndex],
    ];
  }
  return array;
};

export function sample(array) {
  if (!array) {
    return;
  }
  return array[Math.floor(Math.random() * array.length)];
};

export function d20Formula(modifier) {
  return rollFormula("d20", modifier);
};

export function rollFormula(roll, modifier) {
  if (modifier < 0) {
    return `${roll}-${-modifier}`;
  } else if (modifier > 0) {
    return `${roll}+${modifier}`;
  } else {
    return roll;
  }
};

export async function evalRoll(formula) {
  return await new Roll(formula).evaluate();
};

export async function rollTotal(formula, rollData={}) {
  const roll = new Roll(formula, rollData);
  await roll.evaluate();
  return roll.total;
};

export function rollTotalSync(formula, rollData={}) {
  return new Roll(formula, rollData).evaluateSync().total;
};

export async function showRollResult(
  actor,
  dieRoll,
  rollData,
  cardTitle,
  outcomeTextFn,
  rollFormula = null
) {
  const roll = new Roll(dieRoll, rollData);
  await roll.evaluate();
  await showDice(roll);
  const data = {
    cardTitle,
    rollResults: [
      {
        rollTitle: rollFormula ?? roll.formula,
        roll,
        outcomeLines: [outcomeTextFn(roll)],
      },
    ],
  };
  await showRollResultCard(actor, data);
  return roll;
};

export async function showRollResultCard(actor, data) {
  const html = await renderTemplate(
    "systems/crysborg/templates/chat/roll-result-card.hbs",
    data
  );
  ChatMessage.create({
    content: html,
    sound: diceSound(),
    speaker: ChatMessage.getSpeaker({ actor }),
  });
};

export function upperCaseFirst(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
};

export function lowerCaseFirst(str) {
  return str.charAt(0).toLowerCase() + str.slice(1);
};

/**
 * Calculate DR modifiers for an actor
 * @param {Actor} actor - The actor to calculate modifiers for
 * @param {string} baseDR - The base DR value
 * @param {string} type - The type of DR ('attack' or 'defense')
 * @param {string} [ability] - The ability to use for ability-based modifiers (optional)
 * @param {Item} [item] - The item being used (optional, for attack/defense)
 * @returns {Object} Object containing drSources and totalModifier
 */
export function calculateDRModifiers(actor, baseDR, type, ability = null, item = null) {
  // Gather DR sources
  const drSources = [
    { name: game.i18n.localize("MB.BaseDR"), value: baseDR }
  ];

  // Add armor modifier if present and type is defense
  if (type === 'defense') {
    const armor = actor.equippedArmor();
    if (armor) {
      const maxTier = parseInt(armor.system.tier.max);
      const defenseModifier = CONFIG.MB.armorTiers[maxTier].defenseModifier;
      if (defenseModifier && defenseModifier !== 0) {
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
  }

  // Get all carried items
  const carriedItems = actor.items.filter(i => i.system.carried && (!item || i.id !== item.id));
  
  // Track which items have already contributed a modifier
  const itemsWithModifiers = new Set();

  // Helper function to add a modifier to sources
  const addModifier = (item, modifier, isAbility = false) => {
    if (modifier !== undefined && modifier !== 0 && modifier !== null) {
      const name = isAbility 
        ? `${item.name} (${game.i18n.localize(`MB.Ability${ability.charAt(0).toUpperCase() + ability.slice(1)}Abbrev`)})`
        : item.name;
      drSources.push({
        name,
        value: Number(modifier)
      });
      itemsWithModifiers.add(item.id);
    }
  };
  
  // First pass: Add combat modifiers (these take priority)
  for (const carriedItem of carriedItems) {
    if (carriedItem.system.combatModifiers) {
      addModifier(carriedItem, carriedItem.system.combatModifiers[type]);
    }
  }

  // Second pass: Add ability DR modifiers for items that don't have combat modifiers
  if (ability) {
    // Add the main item's modifiers
    if (item) {
      // First try combat modifier
      if (item.system.combatModifiers) {
        addModifier(item, item.system.combatModifiers[type]);
      }
      // If no combat modifier, try ability modifier
      if (!itemsWithModifiers.has(item.id) && item.system.drModifiers) {
        addModifier(item, item.system.drModifiers[ability], true);
      }
    }

    // Add other items' ability modifiers
    for (const carriedItem of carriedItems) {
      if (!itemsWithModifiers.has(carriedItem.id) && carriedItem.system.drModifiers) {
        addModifier(carriedItem, carriedItem.system.drModifiers[ability], true);
      }
    }
  }

  // Filter out any sources with no modifiers
  const filteredSources = drSources.filter(source => {
    // Always keep the base DR
    if (source.name === game.i18n.localize("MB.BaseDR")) {
      return true;
    }
    // Only keep sources with non-zero values
    return source.value !== undefined && source.value !== 0 && source.value !== null;
  });

  // Calculate total modifier (excluding base DR)
  const totalModifier = filteredSources.reduce((sum, source) => {
    // Skip the base DR source when calculating modifiers
    if (source.name === game.i18n.localize("MB.BaseDR")) {
      return sum;
    }
    return sum + source.value;
  }, 0);

  return {
    drSources: filteredSources,
    totalModifier
  };
}
