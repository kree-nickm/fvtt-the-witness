export class WitnessCombatant extends Combatant {
  
  /** @inheritdoc */
  updateResource() {
    if ( !this.actor || !this.combat ) return this.resource = null;
    return this.resource = {
      sp: this.actor.actualSP,
      fp: this.actor.actualFP,
      mv: this.actor.actualMV,
      mvStep: this.getFlag("thewitness", "mvStep"),
      interact: Object.values(this.actor.system.actions.interact).filter(act => act.available).length,
      mental: Object.values(this.actor.system.actions.mental).filter(act => act.available).length,
    };
  }
  
  /* -------------------------------------------- */
  
  async onNewStep()
  {
    if(this.actor)
      await this.setFlag("thewitness", "mvStep", Math.min(this.actor.actualMV, Math.ceil(this.actor.actualMaxMV/3)));
  }
}
