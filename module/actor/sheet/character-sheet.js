import MBActorSheet from "./actor-sheet.js";
import { MB } from "../../config.js";
import RestDialog from "./rest-dialog.js";
import { trackAmmo, trackCarryingCapacity, useBrokenButton } from "../../settings.js";
import { showScvmDialog } from "../../scvm/scvm-dialog.js";
import { byName } from "../../utils.js";
import { rollBroken, rollDeathCheck, rollDropCheck } from "../broken.js";
import { getBetter } from "../get-better.js";
import { useFeat } from "../feats.js";
import {
  testAgility,
  testCustomAbility,
  testPresence,
  testStrength,
  testToughness,
} from "../test-abilities.js";
import { rollOmens, testOmens } from "../omens.js";
import { wieldPower } from "../powers.js";
import { upperCaseFirst } from "../../utils.js";

/**
 * @extends {ActorSheet}
 */
export class MBCharacterSheet extends MBActorSheet {
  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["crysborg", "sheet", "actor", "character"],
      template: "systems/crysborg/templates/actor/character-sheet.hbs",
      width: 750,
      height: 690,
      tabs: [
        {
          navSelector: ".sheet-tabs",
          contentSelector: ".sheet-body",
          initial: "violence",
        },
      ],
      dragDrop: [{ dragSelector: ".item-list .item", dropSelector: null }],
    });
  }

  /** @override */
  async getData() {
    const superData = await super.getData();
    superData.config = CONFIG.MB;
    const data = superData.data;

    // Debug logs
    console.log("Character data:", data);
    console.log("Class data:", data.system.class);

    // Ability Scores
    data.system.orderedAbilities = [];
    for (const abilityName of MB.abilitySheetOrder) {
      const ability = data.system.abilities[abilityName];
      const translationKey = `MB.Ability${upperCaseFirst(abilityName)}`;
      ability.label = game.i18n.localize(translationKey);
      data.system.orderedAbilities.push(ability);
    }

    // Add settings to data
    data.system.trackCarryingCapacity = trackCarryingCapacity();
    data.system.trackAmmo = trackAmmo();
    data.system.useBrokenButton = useBrokenButton();
    
    // Get additional abilities from settings
    let additionalAbilities = [];
    const additionalAbilitiesCsv = game.settings.get(
      "crysborg",
      "additionalAbilities"
    );
    if (additionalAbilitiesCsv) {
      additionalAbilities = additionalAbilitiesCsv.split(",").map((key) => ({
        key: key.toLowerCase(),
        value: 0,
        label: key.substring(0, 3)
      }));
    }

    // Allow modules to add their own abilities
    const moduleAbilities = [];
    Hooks.callAll("crysborg.getModuleAbilities", this.actor, moduleAbilities);

    // Add all abilities to ordered list
    data.system.orderedAbilities = [
      ...data.system.orderedAbilities,
      ...additionalAbilities,
      ...moduleAbilities
    ];

    console.log("Final abilities:", data.system.orderedAbilities);

    // Prepare other data
    this._prepareCharacterItems(data);
    
    return superData;
  }

  /**
   * Organize and classify Items for Character sheets.
   *
   * @param {Object} sheetData The sheet data to prepare.
   * @return {undefined}
   */
  _prepareCharacterItems(sheetData) {
    sheetData.system.feats = sheetData.items
      .filter((item) => item.type === CONFIG.MB.itemTypes.feat)
      .sort(byName);

    sheetData.system.class = sheetData.items.find(
      (item) => item.type === CONFIG.MB.itemTypes.class
    );

    sheetData.system.scrolls = sheetData.items
      .filter((item) => item.type === CONFIG.MB.itemTypes.scroll)
      .sort(byName);

    sheetData.system.equipment = sheetData.items
      .filter((item) => CONFIG.MB.itemEquipmentTypes.includes(item.type))
      .filter((item) => !item.system.hasContainer)
      .sort(byName);

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

    // Set the highest armor tier for template logic
    sheetData.system.highestArmorTier = sheetData.system.equippedArmors.length > 0
      ? sheetData.system.equippedArmors[0].system.tier.value
      : 0;

    // Keep equippedArmor for backward compatibility (first equipped armor)
    sheetData.system.equippedArmor = sheetData.system.equippedArmors.length > 0 
      ? sheetData.system.equippedArmors[0] 
      : null;

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

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    // Everything below here is only needed if the sheet is editable
    if (!this.options.editable) return;

    // Add event listeners for death and drop check buttons
    html
      .find(".death-check-button")
      .on("click", this._onDeathCheckRoll.bind(this));
    html
      .find(".drop-check-button")
      .on("click", this._onDropCheckRoll.bind(this));
    html
      .find(".broken-button")
      .on("click", this._onBroken.bind(this));

    // sheet header
    html
      .find(".ability-label.rollable.strength")
      .on("click", this._onStrengthRoll.bind(this));
    html
      .find(".ability-label.rollable.agility")
      .on("click", this._onAgilityRoll.bind(this));
    html
      .find(".ability-label.rollable.presence")
      .on("click", this._onPresenceRoll.bind(this));
    html
      .find(".ability-label.rollable.toughness")
      .on("click", this._onToughnessRoll.bind(this));
    html
      .find(".ability-label.rollable.custom")
      .on("click", this._onCustomAbilityRoll.bind(this));

    html.find(".reroll-button").click(this._onReroll.bind(this));
    html
      .find(".omens-label.rollable")
      .on("click", this._onOmensRoll.bind(this));
    html
      .find("button.omens-increment")
      .on("click", this._onOmensIncrement.bind(this));
    html
      .find("button.omens-decrement")
      .on("click", this._onOmensDecrement.bind(this));
    html.find(".get-better-button").on("click", this._onGetBetter.bind(this));
    html.find(".rest-button").on("click", this._onRest.bind(this));
    // powers tab
    html.find(".feat-button").on("click", this._onFeatRoll.bind(this));
    html
      .find(".wield-power-button")
      .on("click", this._onWieldPowerRoll.bind(this));

    // Save scroll position before actions that re-render
    const saveScroll = () => {
      const tab = this.element.find('.equipment-tab')[0];
      this._equipmentScrollTop = tab ? tab.scrollTop : 0;
    };
    html.find('.item-qty-plus, .item-qty-minus, .item-toggle-equipped').on('click', saveScroll);
  }

  /** @override */
  async render(force=false, options={}) {
    const prevScroll = this._equipmentScrollTop;
    await super.render(force, options);
    if (prevScroll !== undefined) {
      requestAnimationFrame(() => {
        const tab = this.element.find('.equipment-tab')[0];
        if (tab) tab.scrollTop = prevScroll;
      });
    }
  }

  _onDeathCheckRoll(event) {
    event.preventDefault();
    rollDeathCheck(this.actor);
  }

  _onDropCheckRoll(event) {
    event.preventDefault();
    rollDropCheck(this.actor);
  }

  _onStrengthRoll(event) {
    event.preventDefault();
    testStrength(this.actor);
  }

  _onAgilityRoll(event) {
    event.preventDefault();
    testAgility(this.actor);
  }

  _onPresenceRoll(event) {
    event.preventDefault();
    testPresence(this.actor);
  }

  _onToughnessRoll(event) {
    event.preventDefault();
    testToughness(this.actor);
  }

  _onCustomAbilityRoll(event) {
    event.preventDefault();
    const customAbility = event.currentTarget.className.split(" ")[3];
    testCustomAbility(this.actor, customAbility);
  }

  _onOmensRoll(event) {
    event.preventDefault();
    testOmens(this.actor);
  }

  _onOmensIncrement(event) {
    event.preventDefault();
    console.log("Increment button clicked");
    const currentValue = this.actor.system.omens.value || 0;
    const maxValue = this.actor.system.omens.max || 0;
    // Only limit to max if max is greater than 0 and less than current + 1
    const newValue = maxValue > 0 ? Math.min(currentValue + 1, maxValue) : currentValue + 1;
    console.log(`Increment: ${currentValue} + 1 = ${newValue} (max: ${maxValue})`);
    this.actor.update({ "system.omens.value": newValue });
    // Force the input field to update
    $(event.target).siblings('input[name="system.omens.value"]').val(newValue);
  }

  _onOmensDecrement(event) {
    event.preventDefault();
    console.log("Decrement button clicked");
    const currentValue = this.actor.system.omens.value || 0;
    const newValue = Math.max(currentValue - 1, 0);
    console.log(`Decrement: ${currentValue} - 1 = ${newValue}`);
    this.actor.update({ "system.omens.value": newValue });
    // Force the input field to update
    $(event.target).siblings('input[name="system.omens.value"]').val(newValue);
  }

  _onBroken(event) {
    event.preventDefault();
    rollBroken(this.actor);
  }

  _onRest(event) {
    event.preventDefault();
    const restDialog = new RestDialog(this.actor);
    restDialog.render(true);
  }

  _onGetBetter(event) {
    event.preventDefault();
    // confirm before doing get better
    const d = new Dialog({
      title: game.i18n.localize("MB.GetBetter"),
      content:
        "<p>&nbsp;<p>The game master decides when a character should be improved.<p>It can be after completing a scenario, killing mighty foes, or bringing home treasure.<p>&nbsp;",
      buttons: {
        cancel: {
          label: game.i18n.localize("MB.Cancel"),
        },
        getbetter: {
          icon: '<i class="fas fa-check"></i>',
          label: game.i18n.localize("MB.GetBetter"),
          callback: () => getBetter(this.actor),
        },
      },
      default: "cancel",
    });
    d.render(true);
  }

  _onReroll(event) {
    event.preventDefault();
    showScvmDialog(this.actor);
  }

  _onFeatRoll(event) {
    event.preventDefault();
    const button = $(event.currentTarget);
    const li = button.parents(".item");
    const itemId = li.data("itemId");
    useFeat(this.actor, itemId);
  }

  _onWieldPowerRoll(event) {
    event.preventDefault();
    wieldPower(this.actor);
  }
}
