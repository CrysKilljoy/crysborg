import MBActorSheet from "./actor-sheet.js";
import { byName } from "../../utils.js";

/**
 * @extends {ActorSheet}
 */
export class MBContainerSheet extends MBActorSheet {
  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["crysborg", "sheet", "actor", "container"],
      template: "systems/crysborg/templates/actor/container-sheet.hbs",
      width: 720,
      height: 680,
      tabs: [
        {
          navSelector: ".sheet-tabs",
          contentSelector: ".sheet-body",
          initial: "contents",
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
    this.actor.update({ "system.calculatesContainerSpace": true });
    data.system.containerSpace ??= this.actor.system.containerSpace;
    data.system.carryingWeight ??= this.actor.system.carryingWeight;
    data.system.carryingCapacity ??= this.actor.system.carryingCapacity;
    data.system.encumbered ??= this.actor.system.encumbered;
    this._prepareContainerItems(data);
    return superData;
  }

  /**
   * Organize and classify Items for Container sheets.
   *
   * @param {Object} actorData The actor to prepare.
   *
   * @return {undefined}
   */
  _prepareContainerItems(sheetData) {
    sheetData.system.equipment = sheetData.items
      .filter((item) => CONFIG.MB.itemEquipmentTypes.includes(item.type))
      .filter((item) => !item.hasContainer)
      .sort(byName);
    // Set canPlusMinus for container items
    sheetData.system.equipment.forEach(item => {
      item.system.canPlusMinus = CONFIG.MB.plusMinusItemTypes.includes(item.type);
    });
  }
}
