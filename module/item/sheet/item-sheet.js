import { MB } from "../../config.js";
import { findWeaponTables } from "../../scvm/scvmfactory.js"; // Add this line

/*
 * @extends {ItemSheet}
 */
export class MBItemSheet extends ItemSheet {
  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["crysborg", "sheet", "item"],
      width: 600,
      height: 560,
      tabs: [
        {
          navSelector: ".sheet-tabs",
          contentSelector: ".sheet-body",
          initial: "description",
        },
      ],
    });
  }

  /** @override */
  get template() {
    const path = "systems/crysborg/templates/item";
    if (Object.keys(MB.itemTypeKeys).includes(this.item.type)) {
      // specific item-type sheet
      return `${path}/${this.item.type}-sheet.hbs`;
    } else {
      // generic item sheet
      return `${path}/item-sheet.hbs`;
    }
  }

  /** @override */
  async getData(options) {
    const superData = await super.getData(options);
    superData.config = CONFIG.MB;
    
    // Enrich HTML description
    superData.data.system.description = await TextEditor.enrichHTML(
      superData.data.system.description
    );
    
    // Handle scroll types
    if (superData.data.scrollType) {
      superData.data.localizedScrollType = game.i18n.localize(
        MB.scrollTypes[superData.data.scrollType]
      );
    }
    
    // Debug log to check data structure
    console.log("Super Data:", superData);
    console.log("Config:", CONFIG.MB);
    console.log("Weapon Tables:", CONFIG.MB.scvmFactory?.weaponTableUuids);
    
    try {
      // Load weapon tables and wait for them
      const weaponTables = await findWeaponTables();
      superData.weaponTables = weaponTables;
      console.log("Loaded weapon tables:", weaponTables); // Debug log
    } catch (error) {
      console.error("Error loading weapon tables:", error);
      superData.weaponTables = [];
    }
    
    return superData;
  }

  /**
   *  This is a small override to handle remembering the sheet's position.
   *  @override
   */
  setPosition(options = {}) {
    const position = super.setPosition(options);
    const sheetBody = this.element.find(".sheet-body");
    const bodyHeight = position.height - 192;
    sheetBody.css("height", bodyHeight);
    return position;
  }

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    // Everything below here is only needed if the sheet is editable
    if (!this.options.editable) return;

    // Roll handlers, click handlers, etc. would go here.
  }
}
