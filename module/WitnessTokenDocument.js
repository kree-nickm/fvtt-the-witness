/**
 * Extend the base TokenDocument.
 * @extends {TokenDocument}
 */
export class WitnessTokenDocument extends TokenDocument {
  
  /** @inheritDoc */
  _onCreate(data, options, userId) {
    if(this.getFlag("thewitness", "bar3") === undefined)
      this.setFlag("thewitness", "bar3", "fp");
    if(this.getFlag("thewitness", "bar4") === undefined)
      this.setFlag("thewitness", "bar4", "mp");
    super._onCreate(data, options, userId);
  }

  /* -------------------------------------------- */
  
  /** @inheritDoc */
  getBarAttribute(barName, {alternative}={}) {
    if(alternative === undefined)
    {
      if(barName == "bar1" || barName == "bar2")
        alternative = this[barName]?.attribute;
      else if(barName == "bar3" || barName == "bar4")
        alternative = this.getFlag("thewitness", barName);
    }
    
    let base = {
      type: "bar",
      attribute: alternative,
      editable: true,
    };
    if(alternative == "hp")
    {
      return Object.assign(base, {
        value: this.actor.actualHP,
        max: this.actor.actualMaxHP,
        maxmax: this.actor.system.hp.max,
      });
    }
    else if(alternative == "sp")
    {
      return Object.assign(base, {
        value: this.actor.actualSP,
        max: this.actor.actualMaxSP,
        maxmax: this.actor.system.phy.value,
      });
    }
    else if(alternative == "fp")
    {
      return Object.assign(base, {
        value: this.actor.actualFP,
        max: this.actor.actualMaxFP,
        maxmax: this.actor.system.mnt.value,
      });
    }
    else if(alternative == "mv")
    {
      return Object.assign(base, {
        value: this.actor.actualMV,
        max: this.actor.actualMaxMV,
        maxmax: this.actor.system.mob.value,
      });
    }
    else
      return super.getBarAttribute(barName, {alternative});
  }
}
