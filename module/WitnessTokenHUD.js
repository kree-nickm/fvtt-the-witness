import { WitnessToken } from "./WitnessToken.js";

/**
 * Extend the base TokenHUD.
 * @extends {TokenHUD}
 */
export class WitnessTokenHUD extends TokenHUD {

  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "token-hud",
      classes: ["thewitness", "placeable-hud"],
      template: "systems/thewitness/templates/token-hud.html"
    });
  }

  /* -------------------------------------------- */

  /** @override */
  getData(options={}) {
    let data = super.getData(options);
    const bar3 = this.object.document.getBarAttribute("bar3");
    const bar4 = this.object.document.getBarAttribute("bar4");
    data = foundry.utils.mergeObject(data, {
      displayBar3: bar3 && (bar3.type !== "none"),
      bar3Data: bar3,
      displayBar4: bar4 && (bar4.type !== "none"),
      bar4Data: bar4,
      bar1Border: WitnessToken.barColors[data.bar1Data?.attribute] ?? "#ffffff",
      bar2Border: WitnessToken.barColors[data.bar2Data?.attribute] ?? "#ffffff",
      bar3Border: WitnessToken.barColors[bar3?.attribute] ?? "#ffffff",
      bar4Border: WitnessToken.barColors[bar4?.attribute] ?? "#ffffff",
    });
    return data;
  }
}
