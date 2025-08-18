import { trackCarryingCapacity } from "../settings.js";
import HPZeroDialog from "./sheet/hp-zero-dialog.js";
import { rollTotal } from "../utils.js";

/**
 * @extends {Actor}
 */
export class MBActor extends Actor {
  /** @override */
  async _preUpdate(changed, options, user) {
    await super._preUpdate(changed, options, user);
    
    // Check if HP is being set to 0 or below - only for character actors
    if (changed.system?.hp?.value <= 0 && this.type === "character") {
      await HPZeroDialog.create(this);
    }
  }

  /** @override */
  static async create(data, options = {}) {
    data.prototypeToken = data.prototypeToken || {};
    let defaults = {};
    if (data.type === "character") {
      defaults = {
        actorLink: true,
        disposition: 1,
        vision: true,
      };
    } else if (data.type === "container") {
      data.system = { calculatesContainerSpace: true };
      defaults = {
        actorLink: false,
        disposition: 0,
        vision: false,
      };
    } else if (data.type === "creature") {
      defaults = {
        actorLink: false,
        disposition: -1,
        vision: false,
      };
    } else if (data.type === "follower") {
      defaults = {
        actorLink: true,
        disposition: 1,
        vision: true,
      };
    } else if (data.type === "misery-tracker") {
      data.img = "systems/crysborg/tokens/misc/misery-tracker.webp";
      defaults = {
        actorLink: false,
        disposition: 0,
        vision: false,
        texture: {
          src: data.img,
          scaleX: 3,
          scaleY: 3,
        },
      };
    }
    foundry.utils.mergeObject(data.prototypeToken, defaults, { overwrite: false });
    return super.create(data, options);
  }

  /** @override */
  _onCreate(data, options, userId) {
    if (data.type === "character") {
      // give Characters a default class
      this._addDefaultClass();
    }
    super._onCreate(data, options, userId);
  }

  async _addDefaultClass() {
    if (game.packs) {
      const hasAClass = this.items.filter((i) => i.type === "class").length > 0;
      if (!hasAClass) {
        const pack = game.packs.get("crysborg.class-classless-adventurer");
        if (!pack) {
          console.error(
            "Could not find compendium crysborg.class-classless-adventurer"
          );
          return;
        }
        const index = await pack.getIndex();
        const entry = index.find((e) => e.name === "Adventurer");
        if (!entry) {
          console.error("Could not find Adventurer class in compendium.");
          return;
        }
        const entity = await pack.getDocument(entry._id);
        if (!entity) {
          console.error("Could not get document for Adventurer class.");
          return;
        }
        await this.createEmbeddedDocuments("Item", [duplicate(entity.data)]);
      }
    }
  }

  /** @override */
  prepareDerivedData() {
    super.prepareDerivedData();
    // Prepare item data if not already done
    this.items.forEach(item => {
      if (typeof item.prepareActorItemDerivedData === "function") {
        item.prepareActorItemDerivedData(this);
      }
    });
    // Store calculated values centrally
    this.system.carryingCapacity = this.normalCarryingCapacity();
    this.system.carryingWeight = this.carryingWeight();
    this.system.encumbered = this.isEncumbered();
    if (this.system?.calculatesContainerSpace) {
      this.system.containerSpace = this.containerSpace();
    }
    if (this.type === "carriage") {
      // Ensure ability and structure fields exist
      this.system.abilities ??= {};
      this.system.abilities.speed ??= { value: 0 };
      this.system.abilities.stability ??= { value: 100 };
      if (this.system.abilities.stability.value == null) {
        this.system.abilities.stability.value = 100;
      }
      this.system.hp ??= { max: 0, value: 0 };
      this.system.ram = this.system.ram || "0";
      this.system.armor = this.system.armor || "0";
      this.system.cargo = Number(this.system.cargo) || 0;

      // Start from base values to avoid cumulative modifiers
      let speed = Number(this.system.abilities.speed.value) || 0;
      let stability = Number(this.system.abilities.stability.value) || 0;
      let ram = this.system.ram;
      let armor = this.system.armor;
      let cargo = this.system.cargo;
      let structureMax = Number(this.system.hp.max) || 0;
      let structureVal = Number(this.system.hp.value) || 0;

      for (const item of this.items.filter((i) => i.type === CONFIG.MB.itemTypes.carriageUpgrade && i.system.equipped)) {
        speed += item.system.speed || 0;
        stability += item.system.stability || 0;
        if (item.system.ram) {
          if (ram === "0") {
            ram = item.system.ram;
          } else {
            ram = `${ram}+${item.system.ram}`;
          }
        }
        if (item.system.armor) {
          if (armor === "0") {
            armor = item.system.armor;
          } else {
            armor = `${armor}+${item.system.armor}`;
          }
        }
        cargo += item.system.cargo || 0;
        if (item.system.structure) {
          structureMax += item.system.structure;
          structureVal += item.system.structure;
        }
      }

      for (const id of this.system.draft || []) {
        const follower = game.actors?.get(id);
        if (follower) {
          speed += Number(follower.system?.carriageSpeed || 0);
        }
      }

      this.system.abilities.speed.value = speed;
      this.system.abilities.stability.value = stability;
      this.system.ram = ram;
      this.system.armor = armor;
      this.system.cargo = cargo;
      this.system.carryingCapacity = cargo;
      this.system.hp.max = structureMax;
      this.system.hp.value = Math.min(structureVal, structureMax);

      const overloaded = this.carryingWeight() > cargo;
      this.system.overloaded = overloaded;
      if (overloaded) {
        this.system.abilities.stability.overloaded = Math.floor(stability / 2);
      } else {
        delete this.system.abilities.stability.overloaded;
      }
    }
  }

  /** @override */
  _onCreateEmbeddedDocuments(embeddedName, documents, result, options, userId) {
    if (documents[0].type === CONFIG.MB.itemTypes.class) {
      this._deleteEarlierItems(CONFIG.MB.itemTypes.class);
    }
    if (documents[0].type === CONFIG.MB.itemTypes.carriageClass) {
      this._deleteEarlierItems(CONFIG.MB.itemTypes.carriageClass);
      this._applyCarriageClass(documents[0]);
    }
    super._onCreateEmbeddedDocuments(
      embeddedName,
      documents,
      result,
      options,
      userId
    );
  }

  _onDeleteEmbeddedDocuments(embeddedName, documents, result, options, userId) {
    for (const document of documents) {
      if (document.isContainer) {
        this.deleteEmbeddedDocuments("Item", document.items);
      }
      if (document.hasContainer) {
        document.container.removeItem(document.id);
      }
    }

    super._onDeleteEmbeddedDocuments(
      embeddedName,
      documents,
      result,
      options,
      userId
    );
  }

  async _deleteEarlierItems(itemType) {
    const itemsOfType = this.items.filter((i) => i.type === itemType);
    itemsOfType.pop(); // don't delete the last one
    const deletions = itemsOfType.map((i) => i.id);
    // not awaiting this async call, just fire it off
    this.deleteEmbeddedDocuments("Item", deletions);
  }

  async _applyCarriageClass(item) {
    const speed = await rollTotal(item.system.speed || "0");
    const ram = item.system.ram || "0";
    const structure = await rollTotal(item.system.structure || "0");
    const stability = await rollTotal(item.system.stability || "100");
    const armor = item.system.armor || "0";
    const cargo = Number(item.system.cargo) || 0;
    const classDescription = item.system.description || "";
    const newDescription = [this.system.description, classDescription]
      .filter((d) => d)
      .join("\n");
    await this.update({
      "system.abilities.speed.value": speed,
      "system.ram": ram,
      "system.hp.max": structure,
      "system.hp.value": structure,
      "system.abilities.stability.value": stability,
      "system.armor": armor,
      "system.cargo": cargo,
      "system.description": newDescription,
    });
  }

  _firstEquipped(itemType) {
    for (const item of this.items) {
      if (item.type === itemType && item.system.equipped) {
        return item;
      }
    }
    return undefined;
  }
  equippedArmor() {
    // Find all equipped armor pieces and return the one with highest tier value
    const equippedArmors = this.items.filter(item => 
      item.type === "armor" && item.system.equipped
    );
    
    if (equippedArmors.length === 0) {
      return undefined;
    }
    
    // Sort by tier value (highest first), then by name
    equippedArmors.sort((a, b) => {
      const tierA = a.system.tier?.value || 0;
      const tierB = b.system.tier?.value || 0;
      if (tierB !== tierA) {
        return tierB - tierA; // Higher tier first
      }
      // If tiers are equal, sort by name
      return a.name.localeCompare(b.name);
    });
    
    return equippedArmors[0];
  }

  equippedShield() {
    return this._firstEquipped("shield");
  }
  async equipItem(item) {
    // Only unequip other shields when equipping a shield (allow multiple armor pieces)
    if (item.type === CONFIG.MB.itemTypes.shield) {
      for (const otherItem of this.items) {
        if (otherItem.type === item.type) {
          await otherItem.unequip();
        }
      }
    }
    await item.equip();
  }

  async unequipItem(item) {
    await item.unequip();
  }

  normalCarryingCapacity() {
    if (this.type === "carriage") {
      return Number(this.system.cargo) || 0;
    }
    return (this.system.abilities?.strength?.value ?? 0) + 8;
  }

  maxCarryingCapacity() {
    return 2 * this.normalCarryingCapacity();
  }

  carryingWeight() {
    return this.items
      .filter((item) => item.isEquipment && item.carried && !item.hasContainer)
      .reduce((weight, item) => weight + item.totalCarryWeight, 0);
  }

  isEncumbered() {
    if (!trackCarryingCapacity()) {
      return false;
    }
    return this.carryingWeight() > this.normalCarryingCapacity();
  }

  containerSpace() {
    return this.items
      .filter((item) => item.isEquipment && !item.hasContainer)
      .reduce((containerSpace, item) => containerSpace + item.totalSpace, 0);
  }


  /**
   * Returns all registered ActorSheet types from all modules and the system.
   */
  static getAllActorSheetTypes() {
    const types = new Set();
    for (const namespace in Actors._sheets) {
      for (const sheet of Actors._sheets[namespace]) {
        if (sheet.options?.types) {
          sheet.options.types.forEach(type => types.add(type));
        }
      }
    }
    return Array.from(types);
  }
}

/**
 * Gibt alle aktuell registrierten Actor-Typen zurück (dynamisch, inkl. Module).
 */
export function getAvailableActorTypes() {
  const types = new Set();
  // Foundry v10+: Actors.sheetClasses, v9: Actors._sheets
  const sheetClasses = Actors.sheetClasses ? Array.from(Actors.sheetClasses.values()).flat() : (Actors._sheets ? Object.values(Actors._sheets).flat() : []);
  for (const sheet of sheetClasses) {
    if (sheet.options?.types) {
      for (const t of sheet.options.types) types.add(t);
    }
  }
  return Array.from(types);
}
