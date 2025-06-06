import { trackCarryingCapacity } from "../settings.js";
import HPZeroDialog from "./sheet/hp-zero-dialog.js";

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

    this.items.forEach((item) => item.prepareActorItemDerivedData(this));

    if (this.type === "character") {
      this.system.carryingWeight = this.carryingWeight();
      this.system.carryingCapacity = this.normalCarryingCapacity();
      this.system.encumbered = this.isEncumbered();
    }

    if (this.type === "container") {
      this.system.containerSpace = this.containerSpace();
    }
  }

  /** @override */
  _onCreateEmbeddedDocuments(embeddedName, documents, result, options, userId) {
    if (documents[0].type === CONFIG.MB.itemTypes.class) {
      this._deleteEarlierItems(CONFIG.MB.itemTypes.class);
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
    return this.system.abilities.strength.value + 8;
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
}
