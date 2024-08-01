import { WitnessToken } from "./WitnessToken.js";
import { WitnessRoll } from "./WitnessRoll.js";
import { WitnessChatMessage } from "./WitnessChatMessage.js";

/**
 * Extend the basic ActorSheet to handle the rolling process when abilities are clicked
 * @extends {ActorSheet}
 */
export class WitnessActorSheet extends ActorSheet {
  
  /** @inheritdoc */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["thewitness", "sheet", "actor"],
      template: "systems/thewitness/templates/actor-sheet.html",
      width: 625,
      height: 760,
      tabs: [{navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "statistics"}],
      scrollY: [".statistics", ".biography", ".items"],
      dragDrop: [{dragSelector: ".item-list .item", dropSelector: null}]
    });
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  async getData(options) {
    const context = await super.getData(options);
    context.biographyHTML = await TextEditor.enrichHTML(context.data.system.biography, {
      secrets: this.document.isOwner,
      async: true
    });
    for(let actualStat of ["HP","SP","FP","MV","MaxHP","MaxSP","MaxFP","MaxMV","HPDMG","SPDMG","FPDMG","MVDMG"])
      context.data[`actual${actualStat}`] = this.document[`actual${actualStat}`];
    return context;
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  activateListeners(html) {
    super.activateListeners(html);

    // Everything below here is only needed if the sheet is editable
    if ( !this.isEditable ) return;

    // System buttons
    html.find(".btn-newround").click(event => {
      event.preventDefault();
      this.actor.onNewRound();
    });

    // Ability Controls
    html.find(".ability .rollable").click(this._onAbilityRoll.bind(this));
    
    // Item Controls
    html.find(".item-control").click(this._onItemControl.bind(this));
    html.find(".items .rollable").on("click", this._onItemRoll.bind(this));
  }

  /* -------------------------------------------- */

  /**
   * Listen for roll buttons on abilities.
   * @param {MouseEvent} event    The originating left click event
   */
  async _onAbilityRoll(event) {
    // Fetch references to the UI elements.
    let button = $(event.currentTarget);
    let abl = button.data("property");
    let ability = this.actor.constructor._abilityList[abl];
    let type = button.data("type");
    let resource = type=='physical' ? "sp" : type=='mental' ? "fp" : "";
    let actionGroup = this.actor.system.actions[type=='physical' ? "interact" : type=='mental' ? "mental" : ""];
    
    // Check for invalid data.
    if(!ability || !resource)
      return ui.notifications.error(`That button corresponds to an invalid ability: ${abl} (${type})`, {console:true});
    
    // Collect actor data.
    let cap = this.actor.system.abilities[abl].cap.value + this.actor.system.abilities[abl].cap.mod;
    let bonus = this.actor.system.abilities[abl].bonus.value + this.actor.system.abilities[abl].bonus.mod;
    let skill = this.actor.system.abilities[abl].skill.value + this.actor.system.abilities[abl].skill.mod;
    let actions;
    for(let a of Object.keys(actionGroup))
    {
      if(actionGroup[a].available)
      {
        if(!actions) actions = {};
        actions[a] = actionGroup[a].name + (type=='physical'?" (minor)":"");
      }
    }
    //let actionsArray = Object.keys(actionGroup).filter(a => actionGroup[a].available).map(a => Object.assign({id:a}, actionGroup[a]));
    
    // Check if the ability can be used.
    if(!cap)
      return ui.notifications.warn(`${this.actor.name} has a cap of zero for ${ability.name} and thus cannot use that ability.`, {console:false});
    if(!this.actor.system[resource]?.value)
      return ui.notifications.warn(`${this.actor.name} does not have enough ${resource.toUpperCase()} to use the ${ability.name} (${type}) ability.`, {console:false});
    if(!actions)
      return ui.notifications.warn(`${this.actor.name} does not have any remaining actions to use the ${ability.name} (${type}) ability.`, {console:false});
    
    // Append action combinations for major actions.
    let keys = Object.keys(actions);
    for(let i=0; i<keys.length; i++)
      for(let k=i+1; k<keys.length; k++)
        actions[`${i},${k}`] = `${actionGroup[i].name} + ${actionGroup[k].name}` + (type=='physical'?" (major)":"");
    
    // Calculate dice spenditure.
    let bonusUsable = bonus < cap ? bonus : cap - 1;
    let canSpend = Math.min(this.actor.system[resource].value, 2*cap - bonusUsable);
    
    // Check if we're targeting anything.
    let target = game.user.targets.toObject().filter(t => t instanceof WitnessToken);
    let targetData;
    if(target.length)
    {
      targetData = {
        name: target[0].actor.name,
        defense: target[0].actor.system.defense.value + target[0].actor.system.defense.mod,
        toughness: target[0].actor.system.toughness.value + target[0].actor.system.toughness.mod,
        evasion: (target[0].actor.system.abilities.combat?.cap.value??0) + (target[0].actor.system.abilities.combat?.cap.mod??0),
      };
    }
    
    // Build content of dialog.
    let notices = [];
    if(bonusUsable < bonus)
      notices.push(`${this.actor.name} cannot use all of their bonus dice on the ${ability.name} ability, because their cap is too low.`);
    
    let content = await renderTemplate("systems/thewitness/templates/roll-dialog-01-start.html", {
      character: this.actor.name,
      ability,
      type,
      dice: {
        bonusUsable,
        canSpend,
        stamina: this.actor.system.sp.value,
        focus: this.actor.system.fp.value,
        bonus,
        cap,
        skill,
      },
      actions,
      notices,
      targetData,
    });
    
    // Show dialog.
    let dlg = new Dialog({
      content,
      title: `Ability Roll Request`,
      buttons: {
        one: {
          icon: '<i class="fa-solid fa-dice"></i>',
          label: "Request Ability Roll",
          callback: this._onAbilityRollRequest.bind(this, {abl, type}),
        },
        two: {
          icon: '<i class="fas fa-times"></i>',
          label: "Cancel",
        }
      },
      default: "two",
      render: html => {
        // Event handler for selecting dice to roll.
        $(html).find("input.die").change(event => {
          let dice = $(html).find("input.die");
          
          // Make dice selection contiguous.
          if(event.target.checked)
          {
            for(let i=0; i<dice.length; i++)
            {
              if(dice[i] == event.target)
                break;
              dice[i].checked = true;
            }
          }
          else
          {
            for(let i=dice.length-1; i>=0; i--)
            {
              if(dice[i] == event.target)
                break;
              dice[i].checked = false;
            }
          }
          
          // Count selected dice.
          let diceChecked = $(html).find("input.die:checked").length;
          if(diceChecked > cap)
            $(html).find(".roll-overexert").show();
          else
            $(html).find(".roll-overexert").hide();
          $(html).find(".dice-count").html(diceChecked);
          
          // Make sure popup resizes if content has changed.
          dlg.position.height = "auto";
          dlg.setPosition(dlg.position);
        });
        
        // Set initial value for dice count.
        $(html).find(".dice-count").html($(html).find("input.die:checked").length);
      },
    });
    return dlg.render(true);
  }

  /* -------------------------------------------- */

  /**
   * Listen for submission of the ability roll dialog initiated by: _onAbilityRoll()
   * @param {String} abl    Key of the ability within the actor's ability list.
   * @param {jQuery} html    jQuery object containing the HTML of the submitted dialog.
   * @param {MouseEvent} event    The originating left click event
   * @private
   */
  async _onAbilityRollRequest(flags, html, event) {
    // Collect data.
    let ability = this.actor.constructor._abilityList[flags.abl];
    let resource = flags.type=='physical' ? "sp" : flags.type=='mental' ? "fp" : "";
    let actionGroup = this.actor.system.actions[flags.type=='physical' ? "interact" : flags.type=='mental' ? "mental" : ""];
    
    // Get form inputs.
    flags.dice = html.find("input.die:checked").length;
    flags.pointsSpent = html.find("input.die.spent:checked").length;
    flags.actions = html.find("select[name='action']").val().split(",");
    flags.msgType = "rollRequest";
    
    // Create the message.
    let actionsNames = flags.actions.map(a => actionGroup[a]?.name??"!INVALID!").join(" + ");
    let postedQueueMsg = await WitnessChatMessage.create({
      user: game.user.id,
      speaker: WitnessChatMessage.getSpeaker({ actor: this.actor }),
      content: `<h3>Ability Roll Request</h3>${ability.name} (${flags.type}) ability roll with ${flags.dice} dice, spending ${flags.pointsSpent} ${resource.toUpperCase()} and action(s): ${actionsNames}<div class="flexrow roll-request"><button class="roll-notarget">Straight Roll</button><button class="roll-vstarget">vs Target</button></div>`
    }, {rollMode: game.settings.get("core", "rollMode")});
    await postedQueueMsg.setFlags(flags);
  }

  /* -------------------------------------------- */

  /**
   * Handle click events for untargeted rolls on messages initiated by: _onAbilityRoll() -> _onAbilityRollRequest()
   * @param {MouseEvent} event    The originating left click event
   * @private
   */
  async _onUntargetedAbilityRoll(postedQueueMsg, event) {
    // Collect data.
    let abl = postedQueueMsg.getFlag("thewitness", "abl");
    let type = postedQueueMsg.getFlag("thewitness", "type");
    let ability = this.actor.constructor._abilityList[abl];
    let skill = this.actor.system.abilities[abl].skill.value + this.actor.system.abilities[abl].skill.mod;
    
    if(game.user.isGM)
    {
      let finalizeDlg = new Dialog({
        content: await renderTemplate("systems/thewitness/templates/roll-dialog-02b-targeted.html", {
          character: this.actor.name,
          ability,
          type,
          skill,
        }),
        title: `Finalize Roll`,
        buttons: {
          roll: {
            icon: '<i class="fa-solid fa-dice"></i>',
            label: "Roll",
            callback: this._onUntargetedAbilityRollFinalize.bind(this, postedQueueMsg)
          },
          cancel: {
            icon: '<i class="fas fa-times"></i>',
            label: "Cancel",
          }
        },
        default: "cancel"
      });
      finalizeDlg.render(true);
    }
    else
      ui.notifications.warn("Only the GM can fulfill untargeted roll requests.", {console:false});
  }

  /* -------------------------------------------- */

  /**
   * Listen for submission of the untargeted ability roll finalization dialog initiated by: _onAbilityRoll() -> _onAbilityRollRequest() -> _onUntargetedAbilityRoll()
   * @param {jQuery} html    jQuery object containing the HTML of the submitted dialog.
   * @param {MouseEvent} event    The originating left click event
   * @private
   */
  async _onUntargetedAbilityRollFinalize(postedQueueMsg, html, event) {
    // Collect data.
    let abl = postedQueueMsg.getFlag("thewitness", "abl");
    let type = postedQueueMsg.getFlag("thewitness", "type");
    let dice = postedQueueMsg.getFlag("thewitness", "dice");
    let pointsSpent = postedQueueMsg.getFlag("thewitness", "pointsSpent");
    let actions = postedQueueMsg.getFlag("thewitness", "actions");
    let ability = this.actor.constructor._abilityList[abl];
    let resource = type=='physical' ? "sp" : type=='mental' ? "fp" : "";
    let actionGroup = this.actor.system.actions[type=='physical' ? "interact" : type=='mental' ? "mental" : ""];
    let otherActionGroup = this.actor.system.actions[type=='physical' ? "mental" : type=='mental' ? "interact" : ""];
    let cap = this.actor.system.abilities[abl].cap.value + this.actor.system.abilities[abl].cap.mod;
    let bonus = this.actor.system.abilities[abl].bonus.value + this.actor.system.abilities[abl].bonus.mod;
    let skill = this.actor.system.abilities[abl].skill.value + this.actor.system.abilities[abl].skill.mod;
    let canEnhance = Object.values(this.actor.system.actions[type=='physical' ? "mental" : type=='mental' ? "interact" : ""]??[]).filter(act => act.available).length > 0;
    
    // Get form inputs.
    let flags = {};
    flags.difficulty = html.find("input[name='difficulty']").val();
    flags.tedium = html.find("input[name='tedium']").val();
    flags.msgType = "finalizedRoll";
    
    let adjustedDifficulty = flags.difficulty - skill;
    let roll = new WitnessRoll(`${dice}d12cf=1cs>=${adjustedDifficulty}k${cap}`, this.actor.getRollData(), {rollParams: {
      canEnhance,
      ability,
      type,
      dice,
      pointsSpent,
      cap,
      skill,
      difficulty: flags.difficulty,
      tedium: flags.tedium,
      otherResourceAmount: this.actor.system[type=='physical' ? "fp" : type=='mental' ? "sp" : ""]?.value,
      otherActions: Object.keys(otherActionGroup).filter(a => otherActionGroup[a].available).map(a => ({key: a, name: otherActionGroup[a].name})),
    }});
    await postedQueueMsg.update({content: await roll.render()});
    flags.rollData = roll.toJSON();
    await postedQueueMsg.setFlags(flags);
    
    for(let a of actions)
      actionGroup[a].available = false;
    await this.actor.update({
      system: {
        [resource]: {
          value: this.actor.system[resource].value - pointsSpent
        },
        actions: {
          [type=='physical' ? "interact" : type=='mental' ? "mental" : ""]: actionGroup
        }
      }
    });
  }

  /* -------------------------------------------- */

  /**
   * Handle click events for targeted rolls on messages initiated by: _onAbilityRoll() -> _onAbilityRollRequest()
   * @param {MouseEvent} event    The originating left click event
   * @private
   */
  async _onTargetedAbilityRoll(postedQueueMsg, event) {
    // Collect data.
    let abl = postedQueueMsg.getFlag("thewitness", "abl");
    let type = postedQueueMsg.getFlag("thewitness", "type");
    let ability = this.actor.constructor._abilityList[abl];
    let skill = this.actor.system.abilities[abl].skill.value + this.actor.system.abilities[abl].skill.mod;
    
    let dice = postedQueueMsg.getFlag("thewitness", "dice");
    let pointsSpent = postedQueueMsg.getFlag("thewitness", "pointsSpent");
    let targets = game.user.targets.size ? game.user.targets.toObject() : canvas.scene.tokens.filter(t => t.object.controlled).map(t => t.object);
    
    if(targets.length)
    {
      let valid = targets.filter(t => t.isOwner);
      if(valid.length === targets.length)
      {
        let tObj = [];
        for(let token of valid)
        {
          tObj.push({
            actorId: token.actor.uuid,
            img: token.document.texture.src,
            character: token.actor.name,
            defense: token.actor.system.defense.value + token.actor.system.defense.mod,
            toughness: token.actor.system.toughness.value + token.actor.system.toughness.mod,
            dice: {
              bonusUsable: 0,
              canSpend: Math.min((token.actor.system.abilities.combat?.cap.value??0) + (token.actor.system.abilities.combat?.cap.mod??0), token.actor.system.sp.value),
              canSpendZero: true,
              stamina: token.actor.system.sp.value,
              focus: token.actor.system.fp.value,
              bonus: token.actor.system.abilities.combat.bonus.value + token.actor.system.abilities.combat.bonus.mod,
              cap: token.actor.system.abilities.combat.cap.value + token.actor.system.abilities.combat.cap.mod,
              skill: token.actor.system.abilities.combat.skill.value + token.actor.system.abilities.combat.skill.mod,
            },
          });
        }
        let finalizeDlg = new Dialog({
          content: await renderTemplate("systems/thewitness/templates/roll-dialog-02b-targeted.html", {
            character: this.actor.name,
            ability,
            type,
            skill,
            targets: tObj,
          }),
          title: `Finalize Roll`,
          buttons: {
            roll: {
              icon: '<i class="fa-solid fa-dice"></i>',
              label: "Roll",
              callback: this._onTargetedAbilityRollFinalize.bind(this, postedQueueMsg)
            },
            cancel: {
              icon: '<i class="fas fa-times"></i>',
              label: "Cancel",
            }
          },
          default: "cancel",
          render: html => {
            // Event handler for selecting dice to roll.
            html.find(".roll-target").each((idx,element) => {
              element = $(element);
              element.find("input.die").change(event => {
                let dice = element.find("input.die");
                
                // Make dice selection contiguous.
                if(event.target.checked)
                {
                  for(let i=0; i<dice.length; i++)
                  {
                    if(dice[i] == event.target)
                      break;
                    dice[i].checked = true;
                  }
                }
                else
                {
                  for(let i=dice.length-1; i>=0; i--)
                  {
                    if(dice[i] == event.target)
                      break;
                    dice[i].checked = false;
                  }
                }
                
                // Count selected dice.
                let diceChecked = element.find("input.die:checked").length;
                /*if(diceChecked > cap)
                  element.find(".roll-overexert").show();
                else
                  element.find(".roll-overexert").hide();*/
                element.find(".dice-count").html(diceChecked);
                
                // Make sure popup resizes if content has changed.
                finalizeDlg.position.height = "auto";
                finalizeDlg.setPosition(finalizeDlg.position);
              });
              
              // Set initial value for dice count.
              element.find(".dice-count").html(element.find("input.die:checked").length);
            });
          },
        });
        finalizeDlg.render(true);
      }
      else
        ui.notifications.warn("You must own all of the targeted tokens.", {console:false});
    }
    else
      ui.notifications.warn("You must first target or select at least one token for this ability roll.", {console:false});
  }

  /* -------------------------------------------- */

  /**
   * Listen for submission of the targeted ability roll finalization dialog initiated by: _onAbilityRoll() -> _onAbilityRollRequest() -> _onTargetedAbilityRoll()
   * @param {jQuery} html    jQuery object containing the HTML of the submitted dialog.
   * @param {MouseEvent} event    The originating left click event
   * @private
   */
  async _onTargetedAbilityRollFinalize(postedQueueMsg, html, event) {
    // Collect data.
    let abl = postedQueueMsg.getFlag("thewitness", "abl");
    let type = postedQueueMsg.getFlag("thewitness", "type");
    let dice = postedQueueMsg.getFlag("thewitness", "dice");
    let pointsSpent = postedQueueMsg.getFlag("thewitness", "pointsSpent");
    let actions = postedQueueMsg.getFlag("thewitness", "actions");
    let ability = this.actor.constructor._abilityList[abl];
    let resource = type=='physical' ? "sp" : type=='mental' ? "fp" : "";
    let actionGroup = this.actor.system.actions[type=='physical' ? "interact" : type=='mental' ? "mental" : ""];
    let otherActionGroup = this.actor.system.actions[type=='physical' ? "mental" : type=='mental' ? "interact" : ""];
    let cap = this.actor.system.abilities[abl].cap.value + this.actor.system.abilities[abl].cap.mod;
    let bonus = this.actor.system.abilities[abl].bonus.value + this.actor.system.abilities[abl].bonus.mod;
    let skill = this.actor.system.abilities[abl].skill.value + this.actor.system.abilities[abl].skill.mod;
    let canEnhance = Object.values(this.actor.system.actions[type=='physical' ? "mental" : type=='mental' ? "interact" : ""]??[]).filter(act => act.available).length > 0;
    
    // Resolve UUIDs to actors.
    let promises = [];
    html.find(".roll-target").each((id, elem) => {
      let jqElem = $(elem);
      promises.push(fromUuid(jqElem.data("actor")).then(actor => ({
          actor: actor,
          dice: jqElem.find("input.die:checked").length,
          pointsSpent: jqElem.find("input.die.spent:checked").length,
      })));
    });
    
    // Roll against the targets.
    await Promise.all(promises).then(async (targets) => {
      //for(let target of targets)
      let target = targets[0];
      {
        // Get form inputs.
        let flags = {};
        flags.difficulty = target.actor.system.defense.value + target.actor.system.defense.mod;
        flags.tedium = target.actor.system.toughness.value + target.actor.system.toughness.mod;
        flags.msgType = "finalizedRoll";
        
        let adjustedDifficulty = flags.difficulty - skill;
        let finalDice = dice - target.dice;
        let roll = new WitnessRoll(`${finalDice}d12cf=1cs>=${adjustedDifficulty}k${cap}`, this.actor.getRollData(), {rollParams: {
          canEnhance,
          ability,
          type,
          dice,
          pointsSpent,
          cap,
          skill,
          difficulty: flags.difficulty,
          tedium: flags.tedium,
          otherResourceAmount: this.actor.system[type=='physical' ? "fp" : type=='mental' ? "sp" : ""]?.value,
          otherActions: Object.keys(otherActionGroup).filter(a => otherActionGroup[a].available).map(a => ({key: a, name: otherActionGroup[a].name})),
          target: target.actor.name,
          evasion: target.dice,
        }});
        await postedQueueMsg.update({content: await roll.render()});
        flags.rollData = roll.toJSON();
        await postedQueueMsg.setFlags(flags);
        
        target.actor.update({system:{sp:{value: target.actor.system.sp.value-target.pointsSpent}}});
      }
    });
    
    for(let a of actions)
      actionGroup[a].available = false;
    await this.actor.update({
      system: {
        [resource]: {
          value: this.actor.system[resource].value - pointsSpent
        },
        actions: {
          [type=='physical' ? "interact" : type=='mental' ? "mental" : ""]: actionGroup
        }
      }
    });
  }

  /* -------------------------------------------- */

  /**
   * Handle click events for Item control buttons within the Actor Sheet.
   * @param event
   * @private
   */
  _onItemControl(event) {
    event.preventDefault();

    // Obtain event data
    const button = event.currentTarget;
    const li = button.closest(".item");
    const item = this.actor.items.get(li?.dataset.itemId);

    // Handle different actions
    switch ( button.dataset.action ) {
      case "create":
        const cls = getDocumentClass("Item");
        return cls.create({name: game.i18n.localize("SIMPLE.ItemNew"), type: "item"}, {parent: this.actor});
      case "edit":
        return item.sheet.render(true);
      case "delete":
        return item.delete();
    }
  }

  /* -------------------------------------------- */

  /**
   * Listen for roll buttons on items.
   * @param {MouseEvent} event    The originating left click event
   */
  _onItemRoll(event) {
    let button = $(event.currentTarget);
    const li = button.parents(".item");
    const item = this.actor.items.get(li.data("itemId"));
    let r = new Roll(button.data('roll'), this.actor.getRollData());
    return r.toMessage({
      user: game.user.id,
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      flavor: `<h2>${item.name}</h2><h3>${button.text()}</h3>`
    });
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  _getSubmitData(updateData) {
    let formData = super._getSubmitData(updateData);
    
    let sdRatio = formData['system.sleepRatio.awake'] / formData['system.sleepRatio.asleep'];
    let sdLevel = Math.round(this.document.system.sleepRatio.deprivation);
    let i = 0; // Just to prevent infinite looping.
    while(i < 1000)
    {
      i++;
      let max = (20 + 10*sdLevel) / 6;
      let min = (18 + 10*(sdLevel-1)) / 6;
      if(sdRatio >= max)
        sdLevel++;
      else if(sdRatio <= min)
        sdLevel--;
      else
        break;
    }
    formData['system.sleepRatio.deprivation'] = sdLevel;
    
    return formData;
  }
}
