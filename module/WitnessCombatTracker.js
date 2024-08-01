import { WitnessCombatTrackerConfig } from "./WitnessCombatTrackerConfig.js";

/**
 * The sidebar directory which organizes and displays world-level Combat documents.
 */
export class WitnessCombatTracker extends CombatTracker {
  constructor(options) {
    super(options);
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      template: "systems/thewitness/templates/combat-tracker.html",
      title: "SIMPLE.CombatTracker",
    });
  }

  /* -------------------------------------------- */
  /*  Methods                                     */
  /* -------------------------------------------- */

  /** @inheritdoc */
  async getData(options) {
    let data = await super.getData(options);
    for(let turn of data.turns)
    {
      turn.css = [
        turn.hidden ? "hidden" : "",
        turn.defeated ? "defeated" : ""
      ].join(" ").trim();
    }
    if(data.combat)
    {
      data.combat.useSteps = this.viewed?.getFlag("thewitness", "useSteps") ?? true;
      if(data.combat.useSteps)
        data.combat.step = this.viewed?.getFlag("thewitness", "step") ?? 1;
    }
    return data;
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  activateListeners(html) {
    super.activateListeners(html);
    html.find(".thewitness-combat-settings").click(ev => {
      ev.preventDefault();
      new WitnessCombatTrackerConfig(this).render(true);
    });
  }

  /* -------------------------------------------- */

  /**
   * Handle a Combatant control toggle
   * @private
   * @param {Event} event   The originating mousedown event
   */
  async _onCombatantControl(event) {
    event.preventDefault();
    event.stopPropagation();
    const btn = event.currentTarget;
    const li = btn.closest(".combatant");
    const combat = this.viewed;
    const c = combat.combatants.get(li.dataset.combatantId);

    // Switch control action
    switch (btn.dataset.control) {

      // Toggle combatant visibility
      case "toggleHidden":
        return c.update({hidden: !c.hidden});

      // Toggle combatant defeated flag
      case "toggleDefeated":
        return this._onToggleDefeatedStatus(c);

      // Actively ping the Combatant
      case "pingCombatant":
        return this._onPingCombatant(c);
    }
  }

  /* -------------------------------------------- */

  /**
   * Get the Combatant entry context options
   * @returns {object[]}   The Combatant entry context options
   * @private
   */
  _getEntryContextOptions() {
    return [
      {
        name: "COMBAT.CombatantUpdate",
        icon: '<i class="fas fa-edit"></i>',
        callback: this._onConfigureCombatant.bind(this)
      },
      {
        name: "COMBAT.CombatantRemove",
        icon: '<i class="fas fa-trash"></i>',
        callback: li => {
          const combatant = this.viewed.combatants.get(li.data("combatant-id"));
          if ( combatant ) return combatant.delete();
        }
      }
    ];
  }

  /* -------------------------------------------- */

  /**
   * Display a dialog which prompts the user to enter a new initiative value for a Combatant
   * @param {jQuery} li
   * @private
   */
  _onConfigureCombatant(li) {
    const combatant = this.viewed.combatants.get(li.data("combatant-id"));
    new CombatantConfig(combatant, {
      top: Math.min(li[0].offsetTop, window.innerHeight - 350),
      left: window.innerWidth - 720,
      width: 400
    }).render(true);
  }
}
