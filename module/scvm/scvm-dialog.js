import {
  setLastScvmfactorySelection,
  getLastScvmfactorySelection,
} from "../settings.js";
import { createScvm, findAllowedClasses, scvmifyActor } from "./scvmfactory.js";
import { sample } from "../utils.js";

export async function showScvmDialog(actor) {
  const lastScvmfactorySelection = getLastScvmfactorySelection();
  const allowedClasses = await findAllowedClasses();
  const classData = allowedClasses
    .map((c) => {
      console.log(`Class Data: ${c.name}, UUID: ${c.uuid}, System Source: ${c.systemSource}`); // Debug statement
      return {
        name: c.name,
        uuid: c.uuid,
        systemSource: c.systemSource, // Include systemSource
        checked:
          lastScvmfactorySelection.length > 0
            ? lastScvmfactorySelection.includes(c.uuid)
            : true,
      };
    })
    .sort((a, b) => (a.name > b.name ? 1 : -1));
  console.log(classData); // Log the classData array to verify the structure
  const dialog = new ScvmDialog();
  dialog.actor = actor;
  dialog.classes = classData;
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
    options.width = 420;
    options.height = "auto";
    return options;
  }

  /** @override */
  getData(options = {}) {
    return foundry.utils.mergeObject(super.getData(options), {
      classes: this.classes,
      forActor: this.actor !== undefined && this.actor !== null,
    });
  }
}
