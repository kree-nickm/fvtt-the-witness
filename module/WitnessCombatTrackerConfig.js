export class WitnessCombatTrackerConfig extends CombatTrackerConfig {

  /** @inheritdoc */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["thewitness", "sheet", "combat-sheet"],
      template: "systems/thewitness/templates/combat-config.html",
    });
  }

  /* -------------------------------------------- */

  /** @override */
  async getData(options={}) {
    let data = await super.getData(options);
    data.useSteps = this.object?.viewed?.getFlag("thewitness", "useSteps") ?? true;
    return data;
  }

  /* -------------------------------------------- */
  
  async _onSubmit(event, options) {
    let data = await super._onSubmit(event, options);
    await this.object?.viewed?.setFlag("thewitness", "useSteps", data.useSteps);
    return data;
  }
  
}
