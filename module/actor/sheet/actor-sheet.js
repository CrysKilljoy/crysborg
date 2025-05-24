import { attack } from "../attack.js";
import { defend } from "../defend.js";
import {
  rollIndividualInitiative,
  rollPartyInitiative,
} from "../initiative.js";
import { checkMorale } from "../morale.js";
import { checkReaction } from "../reaction.js";

/**
 * @extends {ActorSheet}
 */
export default class MBActorSheet extends ActorSheet {
  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    // Everything below here is only needed if the sheet is editable
    if (!this.options.editable) return;

    // Add Inventory Item
    html.find(".item-create").click(this._onItemCreate.bind(this));
    html.find(".feat-create").on("click", this._onFeatCreate.bind(this));

    // Add tags dropdown functionality
    const tagInput = html.find('input[name="flags.crysborg.tags"]');
    const tagWrapper = tagInput.parent();
    if (!tagWrapper.find('.tag-dropdown').length) {
      tagWrapper.append('<div class="tag-dropdown"></div>');
    }
    const tagDropdown = tagWrapper.find('.tag-dropdown');
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
      e.stopPropagation();
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
      tagInput.focus();
      updateDropdown(true);
    });

    // Hide dropdown only on blur and no dropdown interaction
    tagInput.on('blur', (e) => {
      // Give time for potential dropdown click to register
      setTimeout(() => {
        if (!tagDropdown.is(':hover')) {
          tagDropdown.hide();
        }
      }, 150);
    });

    // Hide dropdown on outside click
    $(document).on('mousedown.crysborgTagDropdown', (e) => {
      if (!$(e.target).closest('.tag-input-wrapper').length) {
        tagDropdown.hide();
      }
    });

    // Update Inventory Item
    html.find(".item-edit").click((ev) => {
      const li = $(ev.currentTarget).parents(".item");
      const item = this.actor.items.get(li.data("itemId"));
      item.sheet.render(true);
    });

    // Delete Inventory Item
    html.find(".item-delete").click(this._onItemDelete.bind(this));

    // Additional item/inventory buttons
    html.find(".item-qty-plus").click(this._onItemAddQuantity.bind(this));
    html.find(".item-qty-minus").click(this._onItemSubtractQuantity.bind(this));
    html
      .find(".item-toggle-equipped")
      .click(this._onToggleEquippedItem.bind(this));
    html
      .find(".item-toggle-carried")
      .click(this._onToggleCarriedItem.bind(this));

    // Violence-related buttons
    html
      .find(".party-initiative-button")
      .on("click", this._onPartyInitiativeRoll.bind(this));
    html
      .find(".individual-initiative-button")
      .on("click", this._onIndividualInitiativeRoll.bind(this));
    html.find(".attack-button").on("click", this._onAttackRoll.bind(this));
    html.find(".defend-button").on("click", this._onDefendRoll.bind(this));
    html.find(".tier-radio").click(this._onArmorTierRadio.bind(this));
    html.find("select.ammo-select").on("change", this._onAmmoSelect.bind(this));
    html.find("button.morale").on("click", this._onMoraleRoll.bind(this));
    html.find("button.reaction").on("click", this._onReactionRoll.bind(this));
  }

  /** @override */
  async getData() {
    const superData = await super.getData();
    
    // Ensure flags data is available to the template
    superData.flags = superData.data.flags || {};
    superData.flags.crysborg = superData.flags.crysborg || {};
    superData.flags.crysborg.tags = superData.flags.crysborg.tags || "";
    
    // Collect all unique tags from all actors and items
    const allTags = new Set();
    
    // World items and actors
    const allItems = game.items.contents;
    const allActors = game.actors.contents;
    [...allItems, ...allActors].forEach(doc => {
      const docTags = doc.getFlag("crysborg", "tags");
      if (docTags) {
        docTags.split(",")
          .map(tag => tag.trim())
          .filter(tag => tag.length > 0)
          .forEach(tag => allTags.add(tag));
      }
    });

    // Compendium items and actors
    for (const pack of game.packs.filter(p => p.documentName === "Item" || p.documentName === "Actor")) {
      let index = await pack.getIndex({fields: ["flags.crysborg.tags"]});
      for (const entry of index) {
        const docTags = entry.flags?.crysborg?.tags;
        if (docTags) {
          docTags.split(",")
            .map(tag => tag.trim())
            .filter(tag => tag.length > 0)
            .forEach(tag => allTags.add(tag));
        }
      }
    }
    this.availableTags = Array.from(allTags).sort();
    
    // Enrich HTML description
    if (superData.data.system.description) {
      superData.data.system.description = await TextEditor.enrichHTML(
        superData.data.system.description
      );
    }
    
    return superData;
  }

  /**
   * Handle creating a new Owned Item for the actor.
   *
   * @param {Event} event   The originating click event
   * @private
   */
  async _onItemCreate(event) {
    event.preventDefault();
    const template = "systems/crysborg/templates/dialog/add-item-dialog.hbs";
    const dialogData = {
      config: CONFIG.crysborg,
    };
    const html = await renderTemplate(template, dialogData);
    return new Promise((resolve) => {
      new Dialog({
        title: game.i18n.localize("MB.CreateNewItem"),
        content: html,
        buttons: {
          create: {
            icon: '<i class="fas fa-check"></i>',
            label: game.i18n.localize("MB.CreateNewItem"),
            callback: (html) =>
              resolve(_createItem(this.actor, html[0].querySelector("form"))),
          },
        },
        default: "create",
        close: () => resolve(null),
      }).render(true);
    });
  }

  _onFeatCreate(event) {
    event.preventDefault();
    const itemData = {
      name: "New feat",
      type: "feat",
      data: {},
    };
    this.actor.createEmbeddedDocuments("Item", [itemData]);
  }

  /**
   * Handle the deletion of item
   */
  async _onItemDelete(event) {
    event.preventDefault();
    const anchor = $(event.currentTarget);
    const li = anchor.parents(".item");
    const itemId = li.data("itemId");
    const item = this.actor.items.get(itemId);
    if (item.isContainer && item.hasItems) {
      Dialog.confirm({
        title: game.i18n.localize("MB.ItemDelete"),
        content: "<p>" + game.i18n.localize("MB.ItemDeleteMessage") + "</p>",
        yes: async () => {
          await this.actor.deleteEmbeddedDocuments("Item", [item.id]);
        },
        defaultYes: false,
      });
    } else {
      await this.actor.deleteEmbeddedDocuments("Item", [item.id]);
      li.slideUp(200, () => this.render(false));
    }
  }

  /**
   * Handle adding quantity of an Owned Item within the Actor
   */
  async _onItemAddQuantity(event) {
    event.preventDefault();
    const anchor = $(event.currentTarget);
    const li = anchor.parents(".item");
    const itemId = li.data("itemId");
    const item = this.actor.items.get(itemId);
    await item.incrementQuantity();
  }

  /**
   * Handle subtracting quantity of an Owned Item within the Actor
   */
  async _onItemSubtractQuantity(event) {
    event.preventDefault();
    const anchor = $(event.currentTarget);
    const li = anchor.parents(".item");
    const itemId = li.data("itemId");
    const item = this.actor.items.get(itemId);
    await item.decrementQuantity();
  }

  /**
   * Handle toggling the equipped state of an Owned Item within the Actor
   *
   * @param {Event} event   The triggering click event
   * @private
   */
  async _onToggleEquippedItem(event) {
    console.log("onToggle", event);
    event.preventDefault();
    const anchor = $(event.currentTarget);
    const li = anchor.parents(".item");
    const itemId = li.data("itemId");
    const item = this.actor.items.get(itemId);

    if (item.system.equipped) {
      await this.actor.unequipItem(item);
    } else {
      await this.actor.equipItem(item);
    }
  }

  /**
   * Handle toggling the carried state of an Owned Item within the Actor
   *
   * @param {Event} event   The triggering click event
   * @private
   */
  async _onToggleCarriedItem(event) {
    event.preventDefault();
    const anchor = $(event.currentTarget);
    const li = anchor.parents(".item");
    const itemId = li.data("itemId");
    const item = this.actor.items.get(itemId);
    await item.toggleCarried();
  }

  /**
   * Listen for roll buttons on items.
   *
   * @param {MouseEvent} event    The originating left click event
   */
  _onItemRoll(event) {
    event.preventDefault();
    const button = $(event.currentTarget);
    const r = new Roll(button.data("roll"), this.actor.getRollData());
    const li = button.parents(".item");
    const item = this.actor.items.get(li.data("itemId"));
    r.roll().toMessage({
      user: game.user.id,
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      flavor: `<h2>${item.name}</h2><h3>${button.text()}</h3>`,
    });
  }

  /**
   * Handle a click on the Party Initiative button.
   */
  async _onPartyInitiativeRoll(event) {
    event.preventDefault();
    rollPartyInitiative(this.actor);
  }

  /**
   * Handle a click on the Individual Initiative button.
   */
  async _onIndividualInitiativeRoll(event) {
    event.preventDefault();
    rollIndividualInitiative(this.actor);
  }

  /**
   * Handle a click on an item Attack button.
   */
  _onAttackRoll(event) {
    event.preventDefault();
    const button = $(event.currentTarget);
    const li = button.parents(".item");
    const itemId = li.data("itemId");
    attack(this.actor, itemId);
  }

  /**
   * Handle a click on the armor current tier radio buttons.
   */
  _onArmorTierRadio(event) {
    event.preventDefault();
    const input = $(event.currentTarget);
    const newTier = parseInt(input[0].value);
    const li = input.parents(".item");
    const item = this.actor.items.get(li.data("itemId"));
    return item.update({ ["system.tier.value"]: newTier });
  }

  /**
   * Handle a click on the Defend button.
   */
  async _onDefendRoll(event) {
    event.preventDefault();
    const sheetData = await this.getData();
    const armorItemId = sheetData.data.equippedArmor
      ? sheetData.data.equippedArmor.id
      : null;
    const shieldItemId = sheetData.data.equippedShield
      ? sheetData.data.equippedShield.id
      : null;
    defend(this.actor, armorItemId, shieldItemId);
  }

  _onInlineEdit(event) {
    event.preventDefault();
    const row = $(event.currentTarget).parents(".item");
    if (row) {
      const item = this.actor.items.get(row.data("itemId"));
      if (item) {
        const temp = event.currentTarget.dataset.mod;
        return item.update({ [temp]: event.currentTarget.value }, {});
      }
    }
  }

  /** @override */
  async _onDropItem(event, itemData) {
    const item = ((await super._onDropItem(event, itemData)) || []).pop();
    if (!item) return;

    const target = this._findDropTargetItem(event);
    const originalActor = game.actors.get(itemData.actorId);
    const originalItem = originalActor
      ? originalActor.items.get(itemData.data._id)
      : null;
    const isContainer = originalItem && originalItem.isContainer;

    await this._cleanDroppedItem(item);

    if (isContainer) {
      item.clearItems();
      const newItems = await this.actor.createEmbeddedDocuments(
        "Item",
        originalItem.itemsData
      );
      await this._addItemsToItemContainer(newItems, item);
    }

    if (originalItem) {
      await originalActor.deleteEmbeddedDocuments("Item", [originalItem.id]);
    }

    if (target) {
      await this._handleDropOnItemContainer(item, target);
    }
  }

  /** @override */
  async _onSortItem(event, itemData) {
    const item = this.actor.items.get(itemData._id);
    const target = this._findDropTargetItem(event);
    if (target) {
      await this._handleDropOnItemContainer(item, target);
    } else {
      await this._removeItemFromItemContainer(item);
    }
    await super._onSortItem(event, itemData);
  }

  _findDropTargetItem(event) {
    const dropIntoItem = $(event.srcElement).closest(".item");
    return dropIntoItem.length > 0
      ? this.actor.items.get(dropIntoItem.attr("data-item-id"))
      : null;
  }

  async _cleanDroppedItem(item) {
    if (item.system.equipped) {
      await item.unequip();
    }
    if (!item.system.carried) {
      await item.carry();
    }
  }

  async _handleDropOnItemContainer(item, target) {
    if (item.isContainerizable) {
      if (target.isContainer) {
        // dropping into a container
        await this._addItemsToItemContainer([item], target);
      } else if (target.hasContainer) {
        // dropping into an item in a container
        await this._addItemsToItemContainer([item], target.container);
      } else {
        // dropping into a normal item
        await this._removeItemFromItemContainer(item);
      }
    }
  }

  async _addItemsToItemContainer(items, container) {
    for (const item of items) {
      if (item.container && container.id !== item.container.id) {
        // transfert container
        await item.container.removeItem(item.id);
      }
      if (item.equipped) {
        // unequip the item
        await item.unequip();
      }
      await container.addItem(item.id);
    }
  }

  async _removeItemFromItemContainer(item) {
    if (item.container) {
      await item.container.removeItem(item.id);
    }
  }

  async _onAmmoSelect(event) {
    event.preventDefault();
    const select = $(event.currentTarget);
    const weapon = this.actor.items.get(select.data("itemId"));
    //const ammo = this.actor.items.get(select.val());
    if (weapon) {
      await weapon.update({ ["system.ammoId"]: select.val() });
    }
  }

  /**
   * Handle morale roll.
   */
  _onMoraleRoll(event) {
    event.preventDefault();
    checkMorale(this.actor);
  }

  /**
   * Handle reaction roll.
   */
  _onReactionRoll(event) {
    event.preventDefault();
    checkReaction(this.actor);
  }
}

/**
 * Create a new Owned Item for the given actor, based on the name/type from the form.
 */
const _createItem = async (actor, form) => {
  const itemData = {
    name: form.itemname.value,
    type: form.itemtype.value,
    data: {},
  };
  await actor.createEmbeddedDocuments("Item", [itemData]);
};
