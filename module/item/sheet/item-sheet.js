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
    
    // Ensure flags data is available to the template
    superData.flags = superData.data.flags || {};
    superData.flags.crysborg = superData.flags.crysborg || {};
    superData.flags.crysborg.tags = superData.flags.crysborg.tags || "";
    
    // Collect all unique tags from all items in world and compendiums
    const allTags = new Set();
    // World items
    const allItems = game.items.contents;
    allItems.forEach(item => {
      const itemTags = item.getFlag("crysborg", "tags");
      if (itemTags) {
        itemTags.split(",")
          .map(tag => tag.trim())
          .filter(tag => tag.length > 0)
          .forEach(tag => allTags.add(tag));
      }
    });
    // Compendium items
    for (const pack of game.packs.filter(p => p.documentName === "Item")) {
      let index = await pack.getIndex({fields: ["flags.crysborg.tags"]});
      for (const entry of index) {
        const itemTags = entry.flags?.crysborg?.tags;
        if (itemTags) {
          itemTags.split(",")
            .map(tag => tag.trim())
            .filter(tag => tag.length > 0)
            .forEach(tag => allTags.add(tag));
        }
      }
    }
    this.availableTags = Array.from(allTags).sort();
    console.log("Collected availableTags:", this.availableTags); // DEBUG
    
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
    if (!this.options.editable) return;

    const tagInput = html.find('input[name="flags.crysborg.tags"]');
    const tagDropdown = html.find('.tag-dropdown');
    const availableTags = this.availableTags || [];

    // Helper to update dropdown
    const updateDropdown = (forceShowAll = false) => {
      const value = tagInput.val();
      const tags = value.split(',').map(t => t.trim()).filter(Boolean);
      let filtered;
      if (forceShowAll) {
        filtered = availableTags.filter(tag => !tags.includes(tag));
      } else {
        const last = value.lastIndexOf(',');
        const current = last >= 0 ? value.slice(last + 1).trim() : value.trim();
        filtered = availableTags.filter(tag =>
          tag.toLowerCase().includes(current.toLowerCase()) && !tags.includes(tag)
        );
      }
      if (filtered.length > 0 && tagInput.is(':focus')) {
        tagDropdown.html(filtered.map(tag => `<div class="tag-option" data-tag="${tag}">${tag}</div>`).join(''));
        tagDropdown.show();
      } else {
        tagDropdown.hide();
      }
    };

    // Always show all tags on focus
    tagInput.on('focus', () => updateDropdown(true));
    // Filter tags on input
    tagInput.on('input', () => updateDropdown(false));

    // Add tag on click
    tagDropdown.on('mousedown', '.tag-option', function(e) {
      e.preventDefault();
      const selected = $(this).data('tag');
      let value = tagInput.val();
      const last = value.lastIndexOf(',');
      if (last >= 0) {
        value = value.slice(0, last + 1) + ' ' + selected;
      } else {
        value = selected;
      }
      // Add trailing comma if not last
      value = value.replace(/(,\s*)?$/, ', ');
      tagInput.val(value);
      tagDropdown.hide();
      tagInput.focus();
      updateDropdown(true);
    });

    // Hide dropdown on blur (with timeout for click)
    tagInput.on('blur', () => setTimeout(() => tagDropdown.hide(), 150));
    // Hide dropdown on outside click
    $(document).on('mousedown.crysborgTagDropdown', (e) => {
      if (!$(e.target).closest('.tag-input-wrapper').length) tagDropdown.hide();
    });
  }

  getSelectedTags(value) {
    return value.split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0);
  }
}
