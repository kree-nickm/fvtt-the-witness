import { WitnessRoll } from "./WitnessRoll.js";

export class WitnessChatMessage extends ChatMessage {
  async setFlags(flags)
  {
    //flags = foundry.utils.flattenObject(flags);
    //for(let key in flags)
    //  await this.setFlag("thewitness", key, flags[key]);
    await this.update({flags: {thewitness: flags}});
  }
  
  async getHTML()
  {
    let html = await super.getHTML();
    await this._addEventListeners(html);
    return html;
  }
  
  async _addEventListeners(html)
  {
    let msgType = this.getFlag("thewitness", "msgType");
    if(msgType == "rollRequest")
    {
      let actor = Actor.get(this.speaker.actor);
      if(actor)
      {
        html.find(".roll-notarget").click(actor.sheet._onUntargetedAbilityRoll.bind(actor.sheet, this));
        html.find(".roll-vstarget").click(actor.sheet._onTargetedAbilityRoll.bind(actor.sheet, this));
      }
    }
    else if(msgType == "finalizedRoll")
    {
      let rollData = this.getFlag("thewitness", "rollData");
      if(rollData)
      {
        let type = this.getFlag("thewitness", "type");
        let actor = Actor.get(this.speaker.actor);
        let roll = WitnessRoll.fromData(rollData);
        html.find(".roll-enhance-btn").click(async event => {
          event.stopPropagation();
          let resource = type=='physical' ? "fp" : type=='mental' ? "sp" : "";
          let actionGroup = actor.system.actions[type=='physical' ? "mental" : type=='mental' ? "interact" : ""];
          let pointsSpent = parseInt(html.find(".roll-enhance-spend").val());
          let action = html.find(".roll-enhance-action").val();
          if(pointsSpent && actionGroup[action] && await roll.enhance(pointsSpent, this))
          {
            actionGroup[action].available = false;
            await actor.update({
              system: {
                [resource]: {
                  value: actor.system[resource].value - pointsSpent
                },
                actions: {
                  [type=='physical' ? "mental" : type=='mental' ? "interact" : ""]: actionGroup
                }
              }
            });
          }
          else
          {
            ui.notifications.warn("Could not enhance roll.", {console:false});
          }
        });
        html.find(".roll-enhance").click(event => event.stopPropagation());
      }
    }
  }
}
