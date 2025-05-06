import {
  setLastScvmfactorySelection,
  getLastScvmfactorySelection,
} from "../settings.js";
import { createScvm, findAllowedClasses, scvmifyActor } from "./scvmfactory.js";
import { sample } from "../utils.js";

export async function showScvmDialog(actor) {
  const lastScvmfactorySelection = getLastScvmfactorySelection();
  const allowedClasses = await findAllowedClasses();
  
  // Group classes by source and sort alphabetically within each group
  const groupedClasses = allowedClasses.reduce((acc, c) => {
    const source = c.systemSource || "Unknown";
    if (!acc[source]) {
      acc[source] = [];
    }
    acc[source].push({
      name: c.name,
      uuid: c.uuid,
      title: game.i18n.localize(`MB.${c.name.replace(/\s+/g, '')}Descr`),
      checked: lastScvmfactorySelection.length > 0
        ? lastScvmfactorySelection.includes(c.uuid)
        : true
    });
    return acc;
  }, {});

  // Sort classes alphabetically within each source
  Object.values(groupedClasses).forEach(classes => {
    classes.sort((a, b) => a.name.localeCompare(b.name));
  });

  // Custom sort order for sources
  const customOrder = ["Mörk Borg", "Mörk Borg: Cult", "Mörk Borg: Addon"];
  const sortedSources = Object.entries(groupedClasses).sort((a, b) => {
    const aIndex = customOrder.indexOf(a[0]);
    const bIndex = customOrder.indexOf(b[0]);
    if (aIndex === -1 && bIndex === -1) {
      return a[0].localeCompare(b[0]);
    }
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    return aIndex - bIndex;
  });

  const dialog = new ScvmDialog();
  dialog.actor = actor;
  dialog.sortedSources = sortedSources;
  dialog.render(true);
}

export default class ScvmDialog extends Application {
  /** @override */
  static get defaultOptions() {
    const options = super.defaultOptions;
    options.id = "scvm-dialog";
    options.classes = ["crysborg"];
    options.title = game.i18n.localize("MB.TheScvmfactory");
    options.template = "systems/crysborg/templates/dialog/scvm-dialog.hbs";
    options.width = 800;
    options.height = 600;
    options.resizable = true;
    return options;
  }

  /** @override */
  getData(options = {}) {
    return foundry.utils.mergeObject(super.getData(options), {
      sortedSources: this.sortedSources,
      forActor: this.actor !== undefined && this.actor !== null,
    });
  }

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);
    html.find(".toggle-all").click(this._onToggleAll.bind(this));
    html.find(".toggle-none").click(this._onToggleNone.bind(this));
    html.find(".cancel-button").click(this._onCancel.bind(this));
    html.find(".scvm-button").click(this._onScvm.bind(this));

    // Remove any data-tooltip attributes and ensure title attributes
    html.find('.class-name').each((i, el) => {
      const $el = $(el);
      if ($el.data('tooltip')) {
        $el.attr('title', $el.data('tooltip'));
        $el.removeAttr('data-tooltip');
      }
    });
  }

  _onToggleAll(event) {
    event.preventDefault();
    const form = $(event.currentTarget).parents(".scvm-dialog")[0];
    $(form).find(".class-checkbox").prop("checked", true);
  }

  _onToggleNone(event) {
    event.preventDefault();
    const form = $(event.currentTarget).parents(".scvm-dialog")[0];
    $(form).find(".class-checkbox").prop("checked", false);
  }

  _onCancel(event) {
    event.preventDefault();
    this.close();
  }

  async _onScvm(event) {
    event.preventDefault();
    const form = $(event.currentTarget).parents(".scvm-dialog")[0];
    const selectedUuids = [];
    $(form)
      .find("input:checked")
      .each(function () {
        selectedUuids.push($(this).attr("name"));
      });

    if (selectedUuids.length === 0) {
      // nothing selected, so bail
      return;
    }
    setLastScvmfactorySelection(selectedUuids);
    const uuid = sample(selectedUuids);
    const clazz = await fromUuid(uuid);
    if (!clazz) {
      // couldn't find class item, so bail
      const err = `No class item ${uuid} found`;
      console.error(err);
      ui.notifications.error(err);
      return;
    }

    try {
      if (this.actor) {
        await scvmifyActor(this.actor, clazz);
      } else {
        await createScvm(clazz);
      }
    } catch (err) {
      console.error(err);
      ui.notifications.error(
        `Error creating ${clazz.name}. Check console for error log.`
      );
    }

    this.close();
  }
}
