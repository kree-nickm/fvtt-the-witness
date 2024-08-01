import { WitnessDie } from "./WitnessDie.js";

export class WitnessRoll extends Roll {
  constructor(formula, data, options) {
    super(formula, data, options);
    this.terms = this.terms.map(term => new WitnessDie(term));
    for(let term of this.terms)
    {
      term.options.keep = options.rollParams.cap;
      term.options.successMargin = options.rollParams.difficulty - options.rollParams.skill;
    }
  }
  
  static CHAT_TEMPLATE = "systems/thewitness/templates/roll-message.html";
  
  async enhance(rerolls, message) {
    if(!this.options.rollParams.canEnhance)
    {
      return false;
    }
    this.options.rollParams.canEnhance = false;
    let rerollable = this.terms[0].results.filter(r => r.canReroll).sort(WitnessDie.sortRollResults).reverse();
    if(!rerollable.length)
    {
      return false;
    }
    rerolls = Math.min(rerolls, rerollable.length);
    if(!rerolls)
    {
      return false;
    }
    
    for(let i=0; i<rerolls; i++)
    {
      let roll = this.terms[0].roll();
      rerollable[i].rerolled = true;
      roll.enhanced = true;
    }
    this.terms[0]._evaluateModifiers();
    this._total = this._evaluateTotal();
    await message?.update({content: await this.render()});
    return true;
  }
  
  async render({flavor, template=this.constructor.CHAT_TEMPLATE, isPrivate=false}={}) {
    if ( !this._evaluated ) await this.evaluate({async: true});
    const chatData = {
      // Basic
      formula: isPrivate ? "???" : this._formula,
      flavor: isPrivate ? null : flavor,
      user: game.user.id,
      tooltip: isPrivate ? "" : await this.getTooltip(),
      total: isPrivate ? "?" : Math.round(this.total * 100) / 100,
      
      // The Witness data
      ability: isPrivate ? "Private" : this.options.rollParams.ability,
      type: isPrivate ? "?" : this.options.rollParams.type,
      dice: isPrivate ? "?" : this.options.rollParams.dice,
      cap: isPrivate ? "?" : this.options.rollParams.cap,
      difficulty: isPrivate ? "?" : this.options.rollParams.difficulty,
      tedium: isPrivate ? "?" : this.options.rollParams.tedium,
      crits: isPrivate ? "" : (this.total >= this.options.rollParams.tedium*2 ? " ("+ (Math.floor(this.total/this.options.rollParams.tedium)-1) +" crits)" : ""),
      totalClasses: isPrivate ? "" : (this.total < this.options.rollParams.tedium ? "fail" : this.total >= this.options.rollParams.tedium*2 ? "crit" : "") + (this.total < this.terms[0].results.filter(r => r.failure).length ? " fumble" : ""),
      
      // Enhancement
      canEnhance: this.options.rollParams.canEnhance && this.options.rollParams.otherActions.length ? Math.min(this.terms[0]?.results?.filter(r => r.canReroll).length, this.options.rollParams.otherResourceAmount, this.options.rollParams.cap) : 0,
      actions: this.options.rollParams.otherActions,
      
      // Targeted roll
      target: isPrivate ? "?" : this.options.rollParams.target,
      evasion: isPrivate ? "?" : this.options.rollParams.evasion,
    };
    return renderTemplate(template, chatData);
  }
}
