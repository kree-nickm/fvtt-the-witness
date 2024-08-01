/**
 * Extend the base Actor document to include some of the base data that actors in this system should have
 * @extends {Actor}
 */
export class WitnessActor extends Actor {
  
  static _abilityList = {
    combat: {
      name: "Combat",
      defaultCap: 5,
      defaultBonus: 0,
    },
    
    featOfStrength: {
      name: "Feat of Strength",
      defaultCap: 5,
      defaultBonus: 0,
      
    },
    
    breachSecurity: {
      name: "Breach Security",
      defaultCap: 5,
      defaultBonus: 0,
    },
    
    firstAid: {
      name: "First Aid",
      defaultCap: 5,
      defaultBonus: 0,
    },
    
    investigation: {
      name: "Investigation",
      defaultCap: 5,
      defaultBonus: 0,
    },
  };
  
  /* -------------------------------------------- */
  get actualMaxHP() { return Math.min(this.system.hp.max); }
  get actualHP() { return Math.min(this.system.hp.value, this.actualMaxHP); }
  get actualHPDMG() { return this.actualMaxHP - this.actualHP; }
  get actualDMG() { return this.actualHPDMG; }
  
  get actualMaxSP() { return Math.min(this.actualMaxSPfromSheet, this.actualMaxSPfromHPDMG, this.actualMaxSPfromSD); }
  get actualMaxSPfromSheet() { return Math.min(this.system.phy.value, this.system.sp.max); }
  get actualMaxSPfromHPDMG() { return Math.max(1, this.system.phy.value - 2*this.actualHPDMG); }
  get actualMaxSPfromSD() { return Math.floor(this.system.phy.value / (2*this.system.sleepRatio.deprivation)); }
  get actualSP() { return Math.min(this.system.sp.value, this.actualMaxSP); }
  get actualSPDMG() { return this.system.phy.value - this.actualMaxSPfromSheet; }
  
  get actualMaxFP() { return Math.min(this.actualMaxFPfromSheet, this.actualMaxFPfromSD); }
  get actualMaxFPfromSheet() { return Math.min(this.system.mnt.value, this.system.fp.max); }
  get actualMaxFPfromSD() { return Math.floor(this.system.mnt.value / (2*this.system.sleepRatio.deprivation)); }
  get actualFP() { return Math.min(this.system.fp.value, this.actualMaxFP); }
  get actualFPDMG() { return this.system.mnt.value - this.actualMaxFPfromSheet; }
  
  get actualMaxMV() { return Math.min(this.actualMaxMVfromSheet); }
  get actualMaxMVfromSheet() { return Math.min(this.system.mob.value, this.system.mv.max); }
  get actualMV() { return Math.min(this.system.mv.value, this.actualMaxMV); }
  get actualMVDMG() { return this.system.mob.value - Math.min(this.system.mv.max, this.system.mob.value); }
  
  /* -------------------------------------------- */
  
  /** @inheritdoc */
  prepareBaseData() {
    super.prepareBaseData();
    if(!this.system.abilities)
      this.system.abilities = {};
    for(let abl in this.constructor._abilityList)
    {
      if(!this.system.abilities[abl])
        this.system.abilities[abl] = {};
      if(!this.system.abilities[abl].name) this.system.abilities[abl].name = this.constructor._abilityList[abl].name ?? abl;
      if(!this.system.abilities[abl].cap) this.system.abilities[abl].cap = {value:this.constructor._abilityList[abl].defaultCap ?? 0, mod:0};
      if(!this.system.abilities[abl].bonus) this.system.abilities[abl].bonus = {value:this.constructor._abilityList[abl].defaultBonus ?? 0, mod:0};
      if(!this.system.abilities[abl].skill) this.system.abilities[abl].skill = {value:0, mod:0};
    }
  }
  
  /* -------------------------------------------- */
  
  async onNewRound()
  {
    let update = {
      system: {
        sp: {value: this.actualMaxSP},
        fp: {value: this.actualMaxFP},
        mv: {value: this.actualMaxMV},
        actions: {
          interact: {},
          mental: {},
        },
      },
    };
    for(let key of Object.keys(this.system.actions.interact))
      update.system.actions.interact[key] = {available: true};
    for(let key of Object.keys(this.system.actions.mental))
      update.system.actions.mental[key] = {available: true};
    let result = await this.update(update);
    return result;
  }
  
  /* -------------------------------------------- */
  
  /** @inheritdoc */
  _onUpdate(data, options, userId) {
    super._onUpdate(data, options, userId);
    let combatant = game.combat?.getCombatantByActor(this);
    if(combatant)
    {
      combatant.updateResource();
      ui.combat.render();
    }
  }
}
