import { MBActor } from "../actor/actor.js";
import { MB } from "../config.js";
import { MBItem } from "../item/item.js";
import { rollTotal, shuffle } from "../utils.js";
import {
  documentFromPack,
  documentFromResult,
  documentsFromDraw,
  drawDocumentsFromTableUuid,
  drawFromTableUuid,
  drawTextFromTableUuid,
} from "../packutils.js";
import { getAllowedScvmClasses } from "../settings.js";

export async function createScvm(clazz) {
  try {
    const scvm = await rollScvmForClass(clazz);
    
    // Get weapon table UUID from class
    const weaponTableUuid = clazz.system.weaponTable;
    if (weaponTableUuid) {
      try {
        // Get the weapon table
        const weaponTable = await fromUuid(weaponTableUuid);
        
        if (weaponTable && weaponTable.name === "Standard Weapons") {
          // Use weaponTableDie for standard weapons
          const weaponDie = clazz.system.weaponTableDie || "1d10";
          const draw = await drawFromTableUuid(weaponTableUuid, weaponDie);
          scvm.startingWeapons = await documentsFromDraw(draw) || [];
        } else {
          // Direct draw for other weapon tables
          const weaponResults = await drawDocumentsFromTableUuid(weaponTableUuid);
          scvm.startingWeapons = weaponResults || [];
        }
        console.log("Rolled starting weapons:", scvm.startingWeapons);
      } catch (error) {
        console.error(`Error rolling on weapon table: ${error}`);
        scvm.startingWeapons = [];
      }
    } else {
      console.warn("No weapon table UUID found for class");
      scvm.startingWeapons = [];
    }

    await createActorWithScvm(scvm);
  } catch (error) {
    console.error(`Error creating scvm: ${error}`);
    ui.notifications.error(`Error creating scvm: ${error.message}`);
  }
}

export async function createScvmFromClassUuid(classUuid) {
  const clazz = await fromUuid(classUuid);
  if (!clazz) {
    // couldn't find class item, so bail
    const err = `No class item found with UUID ${standardclassUuid}`;
    console.error(err);
    ui.notifications.error(err);
    return;
  }
  await createScvm(clazz);
};

export async function scvmifyActor(actor, clazz) {
  const scvm = await rollScvmForClass(clazz);
  await updateActorWithScvm(actor, scvm);
};

function isScvmClassAllowed(uuid) {
  const allowedScvmClasses = getAllowedScvmClasses();
  return allowedScvmClasses[uuid] !== false;
}

export async function findWeaponTables() {
  const weaponTables = [];
  
  if (!MB || !MB.scvmFactory || !MB.scvmFactory.weaponTableUuids) {
    throw new TypeError("Cannot read properties of undefined (reading 'weaponTableUuids')");
  }

  for (const uuid of MB.scvmFactory.weaponTableUuids) {
    const table = await fromUuid(uuid);
    if (table) {
      weaponTables.push({
        uuid: uuid,
        name: table.name || "Unknown"
      });
    } else {
      console.log(`Weapon table not found for UUID: ${uuid}`);
    }
  }

  return weaponTables;
}

export async function findClasses() {
  const classes = [];
  const weaponTables = await findWeaponTables();
  
  if (!MB || !MB.scvmFactory || !MB.scvmFactory.standardclassUuids) {
    throw new TypeError("Cannot read properties of undefined (reading 'standardclassUuids')");
  }

  for (const uuid of MB.scvmFactory.standardclassUuids) {
    const clazz = await fromUuid(uuid);
    if (clazz && clazz.type == MB.itemTypes.class) {
      const systemSource = clazz.system.systemSource || "Unknown";
      const weaponTable = weaponTables.find(t => t.uuid === clazz.system.weaponTable) || { name: "Unknown" };
      
      console.log(`Class found: ${clazz.name}, UUID: ${clazz.uuid}, System Source: ${systemSource}, Weapon Table: ${weaponTable.name}`);
      
      classes.push({
        name: clazz.name,
        uuid: clazz.uuid,
        systemSource: systemSource,
        weaponTable: weaponTable.name,
        checked: isScvmClassAllowed(clazz.uuid),
      });
    } else {
      console.log(`Class not found or incorrect type for UUID: ${uuid}`);
    }
  }

  return classes;
};

export async function findAllowedClasses() {
  const classes = await findClasses();
  const allowedScvmClasses = getAllowedScvmClasses();
  const filtered = classes.filter((c) => {
    return !(c.uuid in allowedScvmClasses) || allowedScvmClasses[c.uuid];
  });
  return filtered;
};

async function startingFoodAndWater() {
  const docs = [];
  // everybody gets food and water
  if (MB.scvmFactory.foodItem) {
    const food = await fromUuid(MB.scvmFactory.foodItem);
    if (food) {
      const foodTotal = rollTotal("1d4");
      food.system.quantity = foodTotal;
      docs.push(food);
    }
  }
  if (MB.scvmFactory.waterItem) {
    const water = await fromUuid(MB.scvmFactory.waterItem);
    if (water) {
      docs.push(water);
    }
  }
  return docs;
};

async function startingEquipment(clazz) {
  const docs = [];
  const isGoblinGonzo = clazz.system.systemSource === "Goblin Gonzo";
  const isKrampus = clazz.system.systemSource === "Gruss vom Krampus";
  
  // Equipment Table 1
  if (MB.scvmFactory.startingEquipmentTable1Uuids) {
    const tableUuid = isKrampus
      ? MB.scvmFactory.startingEquipmentTable1Uuids[2]
      : isGoblinGonzo
      ? MB.scvmFactory.startingEquipmentTable1Uuids[1]
      : MB.scvmFactory.startingEquipmentTable1Uuids[0];

  console.log(`Equipment Table 1 UUID: ${tableUuid}`);
  const eq1 = await drawDocumentsFromTableUuid(tableUuid);
  console.log("Equipment Table 1 Results:", eq1);
  docs.push(...eq1);
  }

  // Equipment Table 2
  if (MB.scvmFactory.startingEquipmentTable2Uuids) {
    const tableUuid = isKrampus
      ? MB.scvmFactory.startingEquipmentTable2Uuids[2]
      : isGoblinGonzo
      ? MB.scvmFactory.startingEquipmentTable2Uuids[1]
      : MB.scvmFactory.startingEquipmentTable2Uuids[0];

  console.log(`Equipment Table 2 UUID: ${tableUuid}`);
  const eq1 = await drawDocumentsFromTableUuid(tableUuid);
  console.log("Equipment Table 2 Results:", eq1);
  docs.push(...eq1);
  }

  // Equipment Table 3
  if (MB.scvmFactory.startingEquipmentTable3Uuids) {
    const tableUuid = isKrampus
      ? MB.scvmFactory.startingEquipmentTable3Uuids[2]
      : isGoblinGonzo
      ? MB.scvmFactory.startingEquipmentTable3Uuids[1]
      : MB.scvmFactory.startingEquipmentTable3Uuids[0];

  console.log(`Equipment Table 3 UUID: ${tableUuid}`);
  const eq1 = await drawDocumentsFromTableUuid(tableUuid);
  console.log("Equipment Table 3 Results:", eq1);
  docs.push(...eq1);
  }

  console.log("Total Equipment Results:", docs);
  return docs;
};

async function startingWeapons(clazz) {
  const docs = [];
  const weaponTableUuid = clazz.system.weaponTable;
  
  if (weaponTableUuid) {
    try {
      // Get the weapon table
      const weaponTable = await fromUuid(weaponTableUuid);
      console.log("Weapon table found:", weaponTable.name);
      console.log("WeaponTableDie setting:", clazz.system.weaponTableDie);
      
      if (weaponTable.name === "Standard Weapons") {
        // Stricter check for weaponTableDie
        if (clazz.system.weaponTableDie && clazz.system.weaponTableDie.trim() !== '') {
          console.log("Rolling with die:", clazz.system.weaponTableDie);
          const draw = await drawFromTableUuid(weaponTableUuid, clazz.system.weaponTableDie);
          const weapons = await documentsFromDraw(draw);
          docs.push(...weapons);
        } else {
          console.warn("Skipping roll - No weaponTableDie set for Standard Weapons table");
        }
      } else {
        // Direct draw for other weapon tables
        const weaponResults = await drawDocumentsFromTableUuid(weaponTableUuid);
        docs.push(...weaponResults);
      }
      
      console.log("Added starting weapons:", docs);
    } catch (error) {
      console.error(`Error rolling on weapon table: ${error}`);
    }
  } else {
    console.warn("No weapon table UUID found for class");
  }
  
  return docs;
};

async function startingArmor(clazz, rolledScroll) {
  const docs = [];
  if (MB.scvmFactory.startingArmorTable && clazz.system.armorTableDie) {
    let armorDie = clazz.system.armorTableDie;
    if (rolledScroll) {
      // TODO: this check for "is it a higher die roll" assumes a d4 armor table
      // and doesn't handle not having a leading 1 in the string
      if (armorDie === "1d3" || armorDie === "1d4") {
        armorDie = MB.scvmFactory.armorDieIfRolledScroll;
      }
    }
    const draw = await drawFromTableUuid(
      MB.scvmFactory.startingArmorTable,
      armorDie
    );
    const armor = await documentsFromDraw(draw);
    docs.push(...armor);
  }
  return docs;
};

async function startingClassItems(clazz) {
  const docs = [];
  if (clazz.system.startingItems) {
    const lines = clazz.system.startingItems.split("\n");
    for (const line of lines) {
      const [packName, itemName] = line.split(",");
      const item = await documentFromPack(packName, itemName);
      docs.push(item);
    }
  }
  return docs;
};

async function startingDescriptionLines(clazz) {
  // start accumulating character description, starting with the class description
  const descriptionLines = [];
  descriptionLines.push(clazz.system.description);
  descriptionLines.push("<p>&nbsp;</p>");

  let descriptionLine = "";
  if (MB.scvmFactory.terribleTraitsTable) {
    const terribleTrait1 = await drawTextFromTableUuid(
      MB.scvmFactory.terribleTraitsTable
    );
    const terribleTrait2 = await drawTextFromTableUuid(
      MB.scvmFactory.terribleTraitsTable
    );
    // BrokenBodies and BadHabits end with a period, but TerribleTraits don't.
    descriptionLine += `${terribleTrait1} and ${terribleTrait2
      .charAt(0)
      .toLowerCase()}${terribleTrait2.slice(1)}.`;
  }
  if (MB.scvmFactory.brokenBodiesTable) {
    const brokenBody = await drawTextFromTableUuid(
      MB.scvmFactory.brokenBodiesTable
    );
    descriptionLine += ` ${brokenBody}`;
  }
  if (MB.scvmFactory.badHabitsTable) {
    const badHabit = await drawTextFromTableUuid(MB.scvmFactory.badHabitsTable);
    descriptionLine += ` ${badHabit}`;
  }
  if (MB.scvmFactory.personalityQuirksTable) {
    const personalityQuirks = await drawTextFromTableUuid(MB.scvmFactory.personalityQuirksTable);
    descriptionLine += ` ${personalityQuirks}`;
  }
  if (descriptionLine) {
    descriptionLines.push(descriptionLine);
    descriptionLines.push("<p>&nbsp;</p>");
  }
  return descriptionLines;
};

async function startingRollItemsAndDescriptionLines(clazz) {
  // class-specific starting rolls
  const rollItems = [];
  const rollDescriptionLines = [];
  if (clazz.system.startingRolls) {
    const lines = clazz.system.startingRolls.split("\n");
    for (const line of lines) {
      const [packName, tableName, rolls] = line.split(",");
      // assume 1 roll unless otherwise specified in the csv
      const numRolls = rolls ? parseInt(rolls) : 1;
      const pack = game.packs.get(packName);
      if (pack) {
        const content = await pack.getDocuments();
        const table = content.find((i) => i.name === tableName);
        if (table) {
          const results = await compendiumTableDrawMany(table, numRolls);
          for (const result of results) {
            // draw result type
            if (result.type === CONST.TABLE_RESULT_TYPES.TEXT) {
              // text
              rollDescriptionLines.push(`<p>${table.name}: ${result.text}</p>`);
            } else if (result.type === CONST.TABLE_RESULT_TYPES.DOCUMENT) {
              // entity
              // TODO: what do we want to do here?
            } else if (result.type === CONST.TABLE_RESULT_TYPES.COMPENDIUM) {
              // compendium
              const doc = await documentFromResult(result);
              rollItems.push(doc);
            }
          }
        } else {
          console.log(`Could not find RollTable ${tableName}`);
        }
      } else {
        console.log(`Could not find compendium ${packName}`);
      }
    }
  }
  return {
    rollDescriptionLines,
    rollItems,
  };
};

async function rollScvmForClass(clazz) {
  // Choose name table based on class
  const nameTableUuid = clazz.uuid === "Compendium.crysborg.crys-borg-items.Item.wLJV0VJT5I234obT"
    ? "Compendium.crysborg.crys-borg-tables.RollTable.FHTj5AnGdOoqD1fZ"  // Pale One names
    : MB.scvmFactory.namesTable;  // Standard names
    
  // Get all name results from a single draw
  const draw = await drawFromTableUuid(nameTableUuid);
  const nameResults = await Promise.all(
    draw.results.map(async (r) => r.text)
  );
  const name = nameResults.length > 0 ? nameResults.join(" ") : "Unnamed";
  
  const silver = await rollTotal(clazz.system.startingSilver);
  const omens = await rollTotal(clazz.system.omenDie);
  const baseHp = await rollTotal(clazz.system.startingHitPoints);
  const basePowerUses = await rollTotal("1d4");

  let abilityRollFormulas;
  if (clazz.name === "Adventurer") {
    // special handling for classless
    abilityRollFormulas = shuffle(["3d6", "3d6", "4d6kh3", "4d6kh3"]);
  } else {
    abilityRollFormulas = [
      clazz.system.startingStrength,
      clazz.system.startingAgility,
      clazz.system.startingPresence,
      clazz.system.startingToughness,
    ];
  }
  const strength = await abilityRoll(abilityRollFormulas[0]);
  const agility = await abilityRoll(abilityRollFormulas[1]);
  const presence = await abilityRoll(abilityRollFormulas[2]);
  const toughness = await abilityRoll(abilityRollFormulas[3]);
  const hitPoints = Math.max(1, baseHp + toughness);
  const powerUses = Math.max(0, basePowerUses + presence);
  const allDocs = [clazz];

  const foodAndWater = await startingFoodAndWater();
  allDocs.push(...foodAndWater);

  const equipment = await startingEquipment(clazz);
  allDocs.push(...equipment);
  const rolledScroll = allDocs.filter((i) => i?.type === "scroll").length > 0;

  const weapons = await startingWeapons(clazz, rolledScroll);
  allDocs.push(...weapons);

  const armor = await startingArmor(clazz, rolledScroll);
  allDocs.push(...armor);

  const classItems = await startingClassItems(clazz);
  allDocs.push(...classItems);

  // start accumulating character description
  const descriptionLines = await startingDescriptionLines(clazz);

  const { rollDescriptionLines, rollItems } =
    await startingRollItemsAndDescriptionLines(clazz);
  descriptionLines.push(...rollDescriptionLines);
  allDocs.push(...rollItems);

  const items = allDocs.filter((e) => e instanceof MBItem);
  const itemData = items.map((i) => simpleData(i));
  const actors = allDocs.filter((e) => e instanceof MBActor);
  const actorData = actors.map((e) => simpleData(e));

  return {
    actorImg: clazz.img,
    actors: actorData,
    agility,
    description: descriptionLines.join(""),
    hitPoints,
    items: itemData,
    name,
    omens,
    powerUses,
    presence,
    silver,
    strength,
    tokenImg: clazz.img,
    toughness,
  };
};

function simpleData(item) {
  return {
    img: item.img,
    name: item.name,    
    system: item.system,
    type: item.type,
  };
};

function scvmToActorData(s) {
  return {
    name: s.name,
    system: {
      abilities: {
        strength: { value: s.strength },
        agility: { value: s.agility },
        presence: { value: s.presence },
        toughness: { value: s.toughness },
      },
      description: s.description,
      hp: {
        max: s.hitPoints,
        value: s.hitPoints,
      },
      omens: {
        max: s.omens,
        value: s.omens,
      },
      powerUses: {
        max: s.powerUses,
        value: s.powerUses,
      },
      silver: s.silver,
    },
    img: s.actorImg,
    items: s.items,
    flags: {},
    prototypeToken: {
      name: s.name,
      texture: {
        src: s.actorImg,
      },
    },
    type: "character",
  };
};

async function createActorWithScvm(s) {
  const data = scvmToActorData(s);
  // use MBActor.create() so we get default disposition, actor link, vision, etc
  const actor = await MBActor.create(data);
  actor.sheet.render(true);

  // create any npcs (containers, followers, creatures, etc)
  const firstName = actor.name.split(" ")[0];
  for (const npcData of s.actors) {
    npcData.name = `${firstName}'s ${npcData.name}`;
    const npc = await MBActor.create(npcData);
    npc.sheet.render(true);
  }
};

async function updateActorWithScvm(actor, s) {
  const data = scvmToActorData(s);
  // Explicitly nuke all items before updating.
  // Before Foundry 0.8.x, actor.update() used to overwrite items,
  // but now doesn't. Maybe because we're passing items: [item.data]?
  // Dunno.
  await actor.deleteEmbeddedDocuments("Item", [], { deleteAll: true });
  await actor.update(data);
  // update any actor tokens in the scene, too
  for (const token of actor.getActiveTokens()) {
    await token.document.update({
      name: actor.name,
      texture: {
        src: actor.prototypeToken.texture.src,
      },
    });
  }

  // create any npcs (followers, creatures, etc)
  for (const actorData of s.actors) {
    if (game.user.can("ACTOR_CREATE")) {
      const actor = await MBActor.create(actorData);
      actor.sheet.render(true);
    } else {
      ui.notifications.info(
        `Ask the GM to create an actor for you: ${actorData.name}`,
        { permanent: true }
      );
    }
  }
};

async function abilityRoll(formula) {
  const total = await rollTotal(formula);
  return abilityBonus(total);
}

function abilityBonus(rollTotal) {
  if (rollTotal <= 4) {
    return -3;
  } else if (rollTotal <= 6) {
    return -2;
  } else if (rollTotal <= 8) {
    return -1;
  } else if (rollTotal <= 12) {
    return 0;
  } else if (rollTotal <= 14) {
    return 1;
  } else if (rollTotal <= 16) {
    return 2;
  } else {
    // 17 - 20+
    return 3;
  }
};

/** Workaround for compendium RollTables not honoring replacement=false */
async function  compendiumTableDrawMany(rollTable, numDesired) {
  const rollTotals = [];
  let results = [];
  while (rollTotals.length < numDesired) {
    const tableDraw = await rollTable.draw({ displayChat: false });
    if (rollTotals.includes(tableDraw.roll.total)) {
      // already rolled this, so roll again
      continue;
    }
    rollTotals.push(tableDraw.roll.total);
    results = results.concat(tableDraw.results);
  }
  return results;
};
