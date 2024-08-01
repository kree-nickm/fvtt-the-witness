/**
 * Extend the base TokenConfig to add two more bars.
 * @extends {TokenConfig}
 */
export class WitnessTokenConfig extends TokenConfig {
  
  /** @inheritdoc */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      template: "systems/thewitness/templates/token-config.html"
    });
  }
  
  /* -------------------------------------------- */
  
  /** @inheritdoc */
  async getData(options) {
    const data = await super.getData(options);
    const doc = this.preview ?? this.document;
    data.bar3 = doc.getBarAttribute?.("bar3");
    data.bar4 = doc.getBarAttribute?.("bar4");
    return data;
  }
  
  /* -------------------------------------------- */
  
  /** @inheritDoc */
  _getSubmitData(updateData={}) {
    const formData = super._getSubmitData(updateData);
    formData["flags.thewitness.bar3"] = formData["bar3.attribute"] || null;
    formData["flags.thewitness.bar4"] = formData["bar4.attribute"] || null;
    return formData;
  }
}
