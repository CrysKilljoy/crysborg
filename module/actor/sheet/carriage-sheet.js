import MBActorSheet from "./actor-sheet.js";
import { byName, showRollResultCard } from "../../utils.js";
import { testCustomAbility } from "../test-abilities.js";
import { trackAmmo, trackCarryingCapacity } from "../../settings.js";
import { showDice } from "../../dice.js";
import { attack } from "../attack.js";
import { defend } from "../defend.js";

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
          initial: "cargo",
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
      .filter(
        (i) =>
          i.type === CONFIG.MB.itemTypes.carriageUpgrade && i.system.equipped
      )
      .sort(byName);

    data.system.class = data.items.find(
      (item) => item.type === CONFIG.MB.itemTypes.carriageClass
    );

    data.system.equipment = data.items
      .filter((item) => CONFIG.MB.itemEquipmentTypes.includes(item.type))
      .filter((item) => !item.system.hasContainer)
      .filter(
        (item) =>
          item.type !== CONFIG.MB.itemTypes.carriageUpgrade || !item.system.equipped
      )
      .sort(byName);

    data.system.ammo = data.items
      .filter((item) => item.type === CONFIG.MB.itemTypes.ammo)
      .sort(byName);
    data.system.trackAmmo = trackAmmo();

    data.system.draftActors = [];
    const draftIds = (this.actor.system.draft || []).slice(0, 2);
    for (const id of draftIds) {
      const follower = game.actors?.get(id);
      if (follower) data.system.draftActors.push(follower);
    }

    data.system.trackCarryingCapacity = trackCarryingCapacity();

    const ramSources = this.actor.system.ramSources || [];
    data.system.ramTooltip = [
      `${game.i18n.localize("MB.Ram")}: ${this.actor.system.ram}`,
      ...ramSources.map((s) => `${s.label}: ${s.value}`),
    ].join("\n");

    const armorSources = this.actor.system.armorSources || [];
    data.system.armorTooltip = [
      `${game.i18n.localize("MB.Armor")}: ${this.actor.system.armor}`,
      ...armorSources.map((s) => `${s.label}: ${s.value}`),
    ].join("\n");

    const speedSources = this.actor.system.speedSources || [];
    data.system.speedTooltip = [
      `${game.i18n.localize("MB.AbilitySpeed")}: ${this.actor.system.abilities.speed.value}`,
      ...speedSources.map((s) => `${s.label}: ${s.value}`),
    ].join("\n");

    return superData;
  }

  activateListeners(html) {
    super.activateListeners(html);
    if (!this.options.editable) return;
    html.find(".speed-roll").on("click", this._onSpeedRoll.bind(this));
    html.find(".stability-roll").on("click", this._onStabilityRoll.bind(this));
    html.find(".ram-roll").on("click", this._onRamRoll.bind(this));
    html.find(".armor-roll").on("click", this._onDefendRoll.bind(this));

    const speedInput = html.find(".speed-value");
    speedInput.on("focus", (ev) => {
      // Show base so editing matches other abilities (base editing)
      ev.currentTarget.value = this.actor.system.abilities.speed.base ?? 0;
    });
    speedInput.on("blur", (ev) => {
      const input = ev.currentTarget;
      // Allow form application to update the value before showing derived again
      setTimeout(() => {
        input.value = this.actor.system.abilities.speed.value;
      }, 0);
    });

    const stabilityInput = html.find(".stability-value");
    stabilityInput.on("focus", (ev) => {
      ev.currentTarget.value = this.actor.system.abilities.stability.value;
    });
    stabilityInput.on("blur", (ev) => {
      const input = ev.currentTarget;
      // Allow form application to update the value before showing overloaded again
      setTimeout(() => {
        input.value = this.actor.system.overloaded
          ? this.actor.system.abilities.stability.overloaded
          : this.actor.system.abilities.stability.value;
      }, 0);
    });

    html
      .find("button.structure-increment")
      .on("click", this._onStructureIncrement.bind(this));
    html
      .find("button.structure-decrement")
      .on("click", this._onStructureDecrement.bind(this));

    html.find(".draft-open").on("click", this._onOpenDraftActor.bind(this));
    html.find(".draft-remove").on("click", this._onRemoveDraftActor.bind(this));
  }

  _onStructureIncrement(event) {
    event.preventDefault();
    const current = this.actor.system.hp.value || 0;
    const max = this.actor.system.hp.max || 0;
    const newVal = Math.min(current + 1, max);
    this.actor.update({ "system.hp.value": newVal });
    $(event.target)
      .closest(".structure-input-group")
      .find('input[name="system.hp.value"]')
      .val(newVal);
  }

  _onStructureDecrement(event) {
    event.preventDefault();
    const current = this.actor.system.hp.value || 0;
    const newVal = Math.max(current - 1, 0);
    this.actor.update({ "system.hp.value": newVal });
    $(event.target)
      .closest(".structure-input-group")
      .find('input[name="system.hp.value"]')
      .val(newVal);
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
      rollResults[0].outcomeLines.push(
        game.i18n.localize("MB.StabilitySuccess")
      );
    } else {
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

  async _onRamRoll(event) {
    event.preventDefault();
    const tempItem = new CONFIG.Item.documentClass(
      {
        _id: foundry.utils.randomID(),
        name: game.i18n.localize("MB.Ram"),
        type: "weapon",
        system: { damageDie: this.actor.system.ram || "0", weaponType: "melee" },
      },
      { parent: this.actor }
    );
    await attack(this.actor, tempItem);
  }

  async _onAttackRoll(event) {
    event.preventDefault();
    const button = $(event.currentTarget);
    const li = button.parents(".item");
    const itemId = li.data("itemId");
    let tempItem;

    if (!itemId) {
      tempItem = new CONFIG.Item.documentClass(
        {
          _id: foundry.utils.randomID(),
          name: game.i18n.localize("MB.Ram"),
          type: "weapon",
          system: { damageDie: this.actor.system.ram || "0", weaponType: "melee" },
        },
        { parent: this.actor }
      );
    } else {
      const item = this.actor.items.get(itemId);
      if (!item) return;
      const mode = item.system.attack?.mode ?? "none";
      if (mode === "none") return;
      if (mode === "attack") {
        tempItem = new CONFIG.Item.documentClass(
          {
            _id: foundry.utils.randomID(),
            name: item.name,
            type: "weapon",
            system: {
              damageDie: item.system.attack.formula || "0",
              weaponType: "melee",
              usesAmmo: item.system.usesAmmo,
              ammoId: item.system.ammoId,
            },
          },
          { parent: this.actor }
        );
      } else if (mode === "custom") {
        const formula = item.system.attack.formula;
        const flavor = item.system.attack.chat || item.name;
        if (formula) {
          const roll = new Roll(formula, this.actor.getRollData());
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
        return;
      }
      if (item.system.consumable) {
        const qty = Number(item.system.quantity || 0);
        await item.update({ "system.quantity": Math.max(qty - 1, 0) });
      }
    }

    if (tempItem) {
      await attack(this.actor, tempItem);
    }
  }

  async _onDefendRoll(event) {
    event.preventDefault();
    await defend(this.actor);
  }

  _onOpenDraftActor(event) {
    event.preventDefault();
    const li = $(event.currentTarget).parents(".item");
    const draftActorId = li.data("draftActorId");
    const draftActor = game.actors?.get(draftActorId);
    draftActor?.sheet?.render(true);
  }

  async _onRemoveDraftActor(event) {
    event.preventDefault();
    const li = $(event.currentTarget).parents(".item");
    const draftActorId = li.data("draftActorId");
    const draftActor = game.actors?.get(draftActorId);
    if (!draftActor) return;

    const confirmed = await Dialog.confirm({
      title: game.i18n.localize("MB.ReleaseDraftTitle"),
      content: game.i18n.format("MB.ReleaseDraftContent", { name: draftActor.name }),
      yes: () => true,
      no: () => false,
      defaultYes: false,
    });
    if (!confirmed) return;

    const draft = Array.from(this.actor.system.draft || []).filter(
      (id) => id !== draftActorId
    );
    await this.actor.update({ "system.draft": draft });
  }

  async _onDrop(event) {
    const data = TextEditor.getDragEventData(event);
    if (data.type === "Actor") {
      const droppedActor = await fromUuid(data.uuid);
      const eligibleTypes = new Set(["character", "creature", "follower", "container"]);
      if (
        droppedActor &&
        eligibleTypes.has(droppedActor.type) &&
        droppedActor.id !== this.actor.id
      ) {
        const draft = Array.from(this.actor.system.draft || []);
        if (draft.length >= 2) {
          ui.notifications.warn(game.i18n.localize("MB.DraftFull"));
          return false;
        }
        if (!draft.includes(droppedActor.id)) draft.push(droppedActor.id);
        return this.actor.update({ "system.draft": draft });
      }
    }
    return super._onDrop(event);
  }
}

export default MBCarriageSheet;

