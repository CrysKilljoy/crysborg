import { MB } from "../../config.js";
import { findWeaponTables } from "../../scvm/scvmfactory.js";
import { TagManager } from "../../utils/tag-manager.js";

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
    return `systems/crysborg/templates/item/${this.item.type}-sheet.hbs`;
  }

  /** @override */
  async getData(options) {
    const superData = await super.getData(options);
    const itemData = superData.data;

    // Add the item's type to item as a lower-case string
    superData.lowercaseType = itemData.type.toLowerCase();
    superData.config = CONFIG.MB;
    superData.weaponTypes = MB.weaponTypes;
    superData.scrollTypes = MB.scrollTypes;
    superData.ammoTypes = MB.ammoTypes;
    superData.handed = MB.handed;

    // Initialize flags if needed
    superData.flags = superData.data.flags || {};
    superData.flags.crysborg = superData.flags.crysborg || {};
    superData.flags.crysborg.tags = superData.flags.crysborg.tags || "";

    // Get available tags
    this.availableTags = await TagManager.getAllTags();

    // Enrich HTML description
    if (itemData.system?.description) {
      itemData.system.description = await TextEditor.enrichHTML(
        itemData.system.description,
        { async: true }
      );
    }

    return superData;
  }

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    if (!this.options.editable) return;

    // Add weapon tables
    if (this.item.type === "class") {
      findWeaponTables().then((tables) => {
        const weaponTableSelect = html.find(".weapon-table");
        weaponTableSelect.empty();
        weaponTableSelect.append('<option value="">None</option>');
        tables.forEach((t) => {
          weaponTableSelect.append(
            `<option value="${t.uuid}" ${
              this.item.system.weaponTable === t.uuid ? "selected" : ""
            }>${t.name}</option>`
          );
        });
      });
    }

    // Initialize tag input
    TagManager.initializeTagInput(html, 'input[name="flags.crysborg.tags"]', this.availableTags);
  }
}
