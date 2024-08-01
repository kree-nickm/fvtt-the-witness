export class WitnessCombat extends Combat {
  
  previous = {
    round: null,
    turn: null,
    tokenId: null,
    combatantId: null
  };

  /** @inheritdoc */
  static _handleRoundStart(combat, updateData, updateOptions=null) {
    let history = combat.getFlag("thewitness", "history") ?? [];
    let roundIndex = updateData.round - 1;
    if(roundIndex > history.length)
    {
      console.error(`Tried to initiate round ${updateData.round} when the next round should be ${history.length+1}`);
    }
    else if(roundIndex === history.length)
    {
      let previousData = {combatants:{}};
      for(let combatant of combat.turns)
      {
        let actor = combatant.actor;
        previousData.combatants[actor.id] = {
          remainingSP: actor.actualSP,
          remainingMV: actor.actualMV,
          remainingInteract: Object.values(actor.system.actions.interact).filter(act => act.available).length,
        };
        actor.onNewRound().then(r => combatant.onNewStep());
      }
      history.push(previousData);
      combat.setFlag("thewitness", "history", history);
      combat.setFlag("thewitness", "step", 1);
    }
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  async nextTurn() {
    console.warn("Combat.nextTurn() was called, but The Witness does not have turns.");
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  async previousTurn() {
    console.warn("Combat.previousTurn() was called, but The Witness does not have turns.");
  }
  
  /* -------------------------------------------- */

  /** @inheritdoc */
  async nextStep() {
    let step = this.getFlag("thewitness", "step") ?? 1;
    if(step < 3)
    {
      await this.setFlag("thewitness", "step", step + 1);
      for(let combatant of this.turns)
      {
        await combatant.onNewStep();
      }
    }
    else
      ui.notifications.warn("Already at step 3.", {console:false});
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  async previousStep() {
    let step = this.getFlag("thewitness", "step") ?? 1;
    if(step > 1)
      await this.setFlag("thewitness", "step", step - 1);
    else
      ui.notifications.warn("Already at step 1.", {console:false});
  }
  
}
