import MBActorSheet from "./actor-sheet.js";
import { byName } from "../../utils.js";

/**
 * @extends {ActorSheet}
 */
export class MBFollowerSheet extends MBActorSheet {
  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["crysborg", "sheet", "actor", "follower"],
      template: "systems/crysborg/templates/actor/follower-sheet.hbs",
      width: 720,
      height: 690,
      tabs: [
        {
          navSelector: ".sheet-tabs",
          contentSelector: ".sheet-body",
          initial: "description",
        },
      ],
      dragDrop: [{ dragSelector: ".item-list .item", dropSelector: null }],
    });
  }

  /** @override */
  async getData() {
    const superData = await super.getData();
    const data = superData.data;
    data.config = CONFIG.MB;
    this._prepareFollowerItems(data);
    return superData;
  }

  /**
   * Organize and classify Items for Follower sheets.
   *
   * @param {Object} actorData The actor to prepare.
   *
   * @return {undefined}
   */
  _prepareFollowerItems(sheetData) {
    sheetData.system.equipment = sheetData.items
      .filter((item) => CONFIG.MB.itemEquipmentTypes.includes(item.type))
      .filter((item) => !item.system.hasContainer)
      .sort(byName);

    // Get all equipped armor pieces
    sheetData.system.equippedArmors = sheetData.items
      .filter((item) => item.type === CONFIG.MB.itemTypes.armor)
      .filter((item) => item.system.equipped)
      .sort((a, b) => {
        // Sort by tier value (highest damage reduction first)
        const tierA = a.system.tier?.value || 0;
        const tierB = b.system.tier?.value || 0;
        if (tierB !== tierA) {
          return tierB - tierA; // Higher tier first
        }
        // If tiers are equal, sort by name
        return a.name.localeCompare(b.name);
      });
    
    // Maintain backward compatibility - first equipped armor
    sheetData.system.equippedArmor = sheetData.system.equippedArmors.length > 0 
      ? sheetData.system.equippedArmors[0] 
      : undefined;

    sheetData.system.equippedShield = sheetData.items
      .filter((item) => item.type === CONFIG.MB.itemTypes.shield)
      .find((item) => item.system.equipped);

    sheetData.system.equippedWeapons = sheetData.items
      .filter((item) => item.type === CONFIG.MB.itemTypes.weapon)
      .filter((item) => item.system.equipped)
      .sort(byName);

    sheetData.system.ammo = sheetData.items
      .filter((item) => item.type === CONFIG.MB.itemTypes.ammo)
      .sort(byName);
  }
}
