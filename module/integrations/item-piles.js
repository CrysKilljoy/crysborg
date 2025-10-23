const MODULE_ID = "crysborg";

function buildIntegrationConfig() {
  return {
    VERSION: "1.0.0",
    ACTOR_CLASS_TYPE: "container",
    ITEM_PRICE_ATTRIBUTE: "system.price",
    ITEM_QUANTITY_ATTRIBUTE: "system.quantity",
    ITEM_FILTERS: [
      {
        path: "type",
        filters: "class,feat,carriage-class"
      }
    ],
    ITEM_SIMILARITIES: ["name", "type"],
    CURRENCIES: [
      {
        type: "attribute",
        name: "MB.CurrencySilver",
        img: "icons/svg/coins.svg",
        abbreviation: "{#}s",
        data: {
          path: "system.silver"
        },
        primary: true,
        exchangeRate: 1
      }
    ],
    CURRENCY_DECIMAL_DIGITS: 1
  };
}

export function registerItemPilesIntegration() {
  if (!game.modules.get("item-piles")?.active) {
    return;
  }

  const applyIntegration = () => {
    const api = game.itempiles?.API;
    if (!api?.addSystemIntegration) {
      console.warn(
        `${MODULE_ID} | Item Piles API not ready when attempting to register system integration.`
      );
      return;
    }

    api.addSystemIntegration(buildIntegrationConfig());
  };

  if (game.itempiles?.API?.addSystemIntegration) {
    applyIntegration();
    return;
  }

  Hooks.once("item-piles-ready", applyIntegration);
}

