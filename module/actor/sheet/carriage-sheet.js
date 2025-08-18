import MBActorSheet from "./actor-sheet.js";
import { MB } from "../../config.js";
import { byName, showRollResultCard } from "../../utils.js";
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
    html.find(".stability-roll").on("click", this._onStabilityRoll.bind(this));
  }

  _onSpeedRoll(event) {
    event.preventDefault();
    testCustomAbility(this.actor, "speed");
  }

  async _onStabilityRoll(event) {
    event.preventDefault();
    const stability = this.actor.system.overloaded
      ? this.actor.system.abilities.stability.overloaded
      : this.actor.system.abilities.stability.value;
    const roll = new Roll("1d100");
    await roll.evaluate();
    await showDice(roll);
    const rollResults = [
      { rollTitle: "1d100", roll, outcomeLines: [] },
    ];
    if (roll.total < stability) {
      const follow = new Roll("1d4");
      await follow.evaluate();
      await showDice(follow);
      const outcomes = {
        1: game.i18n.localize("MB.StabilityBreak"),
        2: game.i18n.localize("MB.StabilityRollOver"),
        3: game.i18n.localize("MB.StabilityStuck"),
        4: game.i18n.localize("MB.StabilityItemLost"),
      };
      rollResults.push({
        rollTitle: "1d4",
        roll: follow,
        outcomeLines: [outcomes[follow.total]],
      });
    }
    await showRollResultCard(this.actor, {
      cardTitle: game.i18n.localize("MB.StabilityCheck"),
      rollResults,
    });
  }

  async _onAttackRoll(event) {
    event.preventDefault();
    const button = $(event.currentTarget);
    const li = button.parents(".item");
    const itemId = li.data("itemId");
    const rollData = this.actor.getRollData();

    if (!itemId) {
      const roll = new Roll("1d20", rollData);
      await roll.evaluate();
      await showDice(roll);
      const rollResults = [{ rollTitle: "1d20", roll, outcomeLines: [] }];
      const damageDie = this.actor.system.ram;
      if (damageDie) {
        const dmg = new Roll(damageDie);
        await dmg.evaluate();
        await showDice(dmg);
        rollResults.push({ rollTitle: damageDie, roll: dmg, outcomeLines: [] });
      }
      await showRollResultCard(this.actor, {
        cardTitle: game.i18n.localize("MB.Attack"),
        items: [{ name: game.i18n.localize("MB.Ram"), img: this.actor.img }],
        rollResults,
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

