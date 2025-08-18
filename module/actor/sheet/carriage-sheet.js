import MBActorSheet from "./actor-sheet.js";
import { MB } from "../../config.js";
import { byName } from "../../utils.js";
import { testCustomAbility } from "../test-abilities.js";
import { trackCarryingCapacity } from "../../settings.js";
import { showDice } from "../../dice.js";

/**
 * @extends {ActorSheet}
 */
export class MBCarriageSheet extends MBActorSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["crysborg", "sheet", "actor", "carriage"],
      template: "systems/crysborg/templates/actor/carriage-sheet.hbs",
      width: 750,
      height: 690,
      tabs: [
        {
          navSelector: ".sheet-tabs",
          contentSelector: ".sheet-body",
          initial: "chase",
        },
      ],
      dragDrop: [{ dragSelector: ".item-list .item", dropSelector: null }],
    });
  }

  async getData() {
    const superData = await super.getData();
    superData.config = CONFIG.MB;
    const data = superData.data;

    data.system.orderedAbilities = [];
    const speed = data.system.abilities.speed;
    speed.label = game.i18n.localize("MB.AbilitySpeed");
    data.system.orderedAbilities.push(speed);

    const stability = data.system.abilities.stability;
    stability.label = game.i18n.localize("MB.AbilityStability");
    data.system.orderedAbilities.push(stability);

    data.system.carriageUpgrades = data.items
      .filter((i) => i.type === CONFIG.MB.itemTypes.carriageUpgrade)
      .sort(byName);

    data.system.class = data.items.find(
      (item) => item.type === CONFIG.MB.itemTypes.carriageClass
    );

    data.system.equipment = data.items
      .filter((item) => CONFIG.MB.itemEquipmentTypes.includes(item.type))
      .filter((item) => !item.system.hasContainer)
      .sort(byName);

    data.system.trackCarryingCapacity = trackCarryingCapacity();

    return superData;
  }

  activateListeners(html) {
    super.activateListeners(html);
    if (!this.options.editable) return;
    html.find(".speed-roll").on("click", this._onSpeedRoll.bind(this));
  }

  _onSpeedRoll(event) {
    event.preventDefault();
    testCustomAbility(this.actor, "speed");
  }

  async _onAttackRoll(event) {
    event.preventDefault();
    const button = $(event.currentTarget);
    const li = button.parents(".item");
    const itemId = li.data("itemId");
    const rollData = this.actor.getRollData();

    if (!itemId) {
      const formula = button.data("roll");
      if (!formula) return;
      const roll = new Roll(formula, rollData);
      await roll.evaluate();
      await showDice(roll);
      roll.toMessage({
        speaker: ChatMessage.getSpeaker({ actor: this.actor }),
        flavor: game.i18n.localize("MB.Attack"),
      });
      return;
    }

    const item = this.actor.items.get(itemId);
    if (!item) return;
    const mode = item.system.attack?.mode ?? "none";
    if (mode === "none") return;

    let formula;
    let flavor;
    if (mode === "custom") {
      formula = item.system.attack.formula;
      flavor = item.system.attack.chat || item.name;
    } else {
      formula = "d20+@abilities.speed.value";
      flavor = item.name;
    }

    if (formula) {
      const roll = new Roll(formula, rollData);
      await roll.evaluate();
      await showDice(roll);
      roll.toMessage({
        speaker: ChatMessage.getSpeaker({ actor: this.actor }),
        flavor,
      });
    } else if (flavor) {
      ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor: this.actor }),
        content: flavor,
      });
    }

    if (item.system.consumable) {
      const qty = Number(item.system.quantity || 0);
      await item.update({ "system.quantity": Math.max(qty - 1, 0) });
    }
  }
}

export default MBCarriageSheet;

