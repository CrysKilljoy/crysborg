import { findClasses } from "../scvm/scvmfactory.js";
import { isScvmClassAllowed, setAllowedScvmClasses } from "../settings.js";

Handlebars.registerHelper('ifEquals', function(arg1, arg2, options) {
  return (arg1 == arg2) ? options.fn(this) : options.inverse(this);
});

export class AllowedScvmClassesDialog extends FormApplication {
  constructor() {
    super();
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "allowed-scvm-classes-dialog",
      title: game.i18n.localize("MB.AllowedScvmClassesEdit"),
      template:
        "systems/crysborg/templates/dialog/allowed-scvm-classes-dialog.hbs",
      classes: ["form", "crysborg"],
      popOut: true,
      width: 420,
    });
  }

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);
    html.find(".toggle-source").click((event) => this._onToggleSource(event, true));
    html.find(".toggle-none").click((event) => this._onToggleSource(event, false));
    html.find(".toggle-all-global").click((event) => this._onToggleAllGlobal(event, true));
    html.find(".toggle-none-global").click((event) => this._onToggleAllGlobal(event, false));
    html.find(".cancel-button").click((event) => this._onCancel(event));
    html.find(".ok-button").click((event) => this._onOk(event));
  }

  async getData(options = {}) {
    const classes = await this._getClassData();
    const groupedClasses = classes.reduce((acc, clazz) => {
      if (!acc[clazz.systemSource]) {
        acc[clazz.systemSource] = [];
      }
      acc[clazz.systemSource].push(clazz);
      return acc;
    }, {});

    // Convert groupedClasses to an array of [source, classes] pairs
    const sortedSources = Object.entries(groupedClasses).sort((a, b) => b[1].length - a[1].length);

    return foundry.utils.mergeObject(super.getData(options), {
      sortedSources,
    });
  }

  async _getClassData() {
    const classes = await findClasses();
    return classes.map((clazz) => {
      return {
        name: clazz.name,
        uuid: clazz.uuid,
        systemSource: clazz.systemSource || "Unknown", // Provide a default value if systemSource is undefined
        checked: isScvmClassAllowed(clazz.uuid),
      };
    });
  }

  _onToggleSource(event, check) {
    event.preventDefault();
    const sourceIndex = $(event.currentTarget).data("source-index");
    const checkboxes = $(`#source-section-${sourceIndex} .class-checkbox`);
    checkboxes.prop("checked", check);
  }

  _onToggleAllGlobal(event, check) {
    event.preventDefault();
    const checkboxes = this.element.find(".class-checkbox");
    checkboxes.prop("checked", check);
  }

  _onToggleAll(event) {
    event.preventDefault();
    const checkboxes = this.element.find(".class-checkbox");
    checkboxes.prop("checked", true);
  }

  _onToggleNone(event) {
    event.preventDefault();
    const checkboxes = this.element.find(".class-checkbox");
    checkboxes.prop("checked", false);
  }

  _onCancel(event) {
    event.preventDefault();
    this.close();
  }

  _onOk(event) {
    event.preventDefault();
    // Handle form submission logic here
    this.close();
  }

  /** @override */
  async _updateObject(event, formData) {
    setAllowedScvmClasses(formData);
  }
}
