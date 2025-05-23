import { rollDeathCheck, rollDropCheck, rollBroken } from "../broken.js";
import { useBrokenButton } from "../../settings.js";

function getRandomHPZeroMessage() {
  const totalMessages = 10;
  const messageIndex = Math.floor(Math.random() * totalMessages) + 1;
  return game.i18n.localize(`MB.HPZeroMessage${messageIndex}`);
}

export default class HPZeroDialog extends Dialog {
  static async create(actor) {
    const useBroken = useBrokenButton();
    const content = `<p>${getRandomHPZeroMessage()}</p>`;
    
    const buttons = useBroken ? {
      broken: {
        icon: '<i class="fas fa-skull"></i>',
        label: game.i18n.localize("MB.Broken"),
        callback: () => rollBroken(actor)
      }
    } : {
      death: {
        icon: '<i class="fas fa-skull"></i>',
        label: game.i18n.localize("MB.DeathCheck"),
        callback: () => rollDeathCheck(actor)
      },
      drop: {
        icon: '<i class="fas fa-person-falling"></i>',
        label: game.i18n.localize("MB.DropCheck"),
        callback: () => rollDropCheck(actor)
      }
    };

    const dialog = new Dialog({
      title: game.i18n.localize("MB.HPZeroTitle"),
      content,
      buttons,
      default: useBroken ? "broken" : "death"
    });
    
    return dialog.render(true);
  }
}