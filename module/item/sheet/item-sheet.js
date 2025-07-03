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

    html.find('.collapsible-header').click(ev => {
      const header = ev.currentTarget;
      const content = header.nextElementSibling;
      const icon = header.querySelector('i');
    
      const collapsed = content.classList.toggle('hidden');
      header.dataset.collapsed = collapsed; // speichern im Dataset
    
      icon.classList.toggle('fa-chevron-down', !collapsed);
      icon.classList.toggle('fa-chevron-right', collapsed);
    });
    
    // Nach dem Rendern: vorherige Zustände wiederherstellen
    html.find('.collapsible-header').each((_, header) => {
      const content = header.nextElementSibling;
      const icon = header.querySelector('i');
      const collapsed = header.dataset.collapsed === "true";
    
      content.classList.toggle('hidden', collapsed);
      icon.classList.toggle('fa-chevron-down', !collapsed);
      icon.classList.toggle('fa-chevron-right', collapsed);
    });
    

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
