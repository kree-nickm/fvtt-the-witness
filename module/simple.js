// Import Modules
import { WitnessActor } from "./WitnessActor.js";
import { WitnessActorSheet } from "./WitnessActorSheet.js";
import { WitnessToken } from "./WitnessToken.js";
import { WitnessTokenDocument } from "./WitnessTokenDocument.js";
import { WitnessTokenConfig } from "./WitnessTokenConfig.js";
import { WitnessTokenHUD } from "./WitnessTokenHUD.js";
import { WitnessCombat } from "./WitnessCombat.js";
import { WitnessCombatTracker } from "./WitnessCombatTracker.js";
import { WitnessCombatTrackerConfig } from "./WitnessCombatTrackerConfig.js";
import { WitnessCombatant } from "./WitnessCombatant.js";
import { WitnessChatMessage } from "./WitnessChatMessage.js";
import { WitnessDie } from "./WitnessDie.js";
import { WitnessRuler } from "./WitnessRuler.js";

import { SimpleItem } from "./item.js";
import { SimpleItemSheet } from "./item-sheet.js";

/* -------------------------------------------- */
/*  Foundry VTT Initialization                  */
/* -------------------------------------------- */

/**
 * Init hook.
 */
Hooks.once("init", async function() {
  console.log(`Initializing The Witness System`);
  
  // Define basic config data
  CONFIG.time.roundTime = 3;
  CONFIG.time.turnTime = 0;

  // Define custom Document classes
  CONFIG.Actor.documentClass = WitnessActor;
  CONFIG.Token.objectClass = WitnessToken;
  CONFIG.Token.documentClass = WitnessTokenDocument;
  CONFIG.Token.prototypeSheetClass = WitnessTokenConfig;
  CONFIG.Combat.documentClass = WitnessCombat;
  CONFIG.ui.combat = WitnessCombatTracker;
  CONFIG.Combatant.documentClass = WitnessCombatant;
  CONFIG.Item.documentClass = SimpleItem;
  CONFIG.ChatMessage.documentClass = WitnessChatMessage;
  CONFIG.Canvas.rulerClass = WitnessRuler;
  
  CONFIG.Dice.terms.w = WitnessDie;
  CONFIG.Dice.types.push(WitnessDie);

  // Register sheet application classes
  Actors.unregisterSheet("core", ActorSheet);
  Actors.registerSheet("thewitness", WitnessActorSheet, { makeDefault: true });
  Items.unregisterSheet("core", ItemSheet);
  Items.registerSheet("thewitness", SimpleItemSheet, { makeDefault: true });
  DocumentSheetConfig.unregisterSheet(TokenDocument, "core", TokenConfig);
  DocumentSheetConfig.registerSheet(TokenDocument, "thewitness", WitnessTokenConfig, { makeDefault: true });
  //DocumentSheetConfig.unregisterSheet(Combatant, "core", CombatantConfig);
  //DocumentSheetConfig.registerSheet(Combatant, "thewitness", WitnessCombatantConfig, { makeDefault: true });
  
  //game.settings.unregisterMenu("core", Combat.CONFIG_SETTING);
  game.settings.registerMenu("thewitness", Combat.CONFIG_SETTING, {
    name: "SETTINGS.CombatConfigN",
    label: "SETTINGS.CombatConfigL",
    hint: "SETTINGS.CombatConfigH",
    icon: "fa-solid fa-swords",
    type: WitnessCombatTrackerConfig
  });

  Handlebars.registerHelper('ifeq', function(first, second, options) {return (first === second) ? options.fn(this) : options.inverse(this)});
  Handlebars.registerHelper('array', (...params) => params.slice(0, -1));
  Handlebars.registerHelper("lower", (str, options) => str.toLowerCase());
  Handlebars.registerHelper('fco', (value, fallback, options) => value ? value : fallback);
  Handlebars.registerHelper('nco', (value, fallback, options) => value ?? fallback);
  Handlebars.registerHelper('slugify', value => value.slugify({strict: true}));
  Handlebars.registerHelper("concat", (...params) => {
    let context = params.pop();
    return params.join(context.hash?.separator ?? "");
  });

  Handlebars.registerHelper('times', function(n, options) {
    n = parseInt(n);
    let data = Handlebars.createFrame(options.data);
    let accum = "";
    let start = options.hash?.start ?? 0;
    let num = n + start;
    for(let i=start; i<num; ++i)
    {
      data.index = i;
      data.first = (i === start);
      data.last = (i === num-1);
      accum += options.fn(this, {data});
    }
    return accum;
  });
  
  Handlebars.registerHelper('lookup', function(...params) {
    let options = params.pop();
    let base = params.shift();
    let obj = base;
    for(let prop of params)
    {
      if(obj === undefined)
      {
        if(!options.hash.ignoreUndefined) console.warn(`Helper 'lookup' attempted to get property '${prop}' on non-existent object: [base].${params.join('.')}; base:`, base);
        return obj;
      }
      obj = obj[prop];
    }
    return obj;
  });
  
  Handlebars.registerHelper('math', function(...params) {
    let options = params.pop();
    let method = params.shift();
    let operations = ["+","-","*","/","%"];
    params = params.map(term => typeof(Math[term]) == "number" ? Math[term] : operations.indexOf(term) > -1 ? term : parseFloat(term));
    if(typeof(Math[method]) == "function")
      return (Math[method])(...params);
    else
    {
      params.unshift(method);
      let total = params.reduce((result,term) => {
        if(typeof(term) == "number")
        {
          if(result.operation == "+")
            result.total = result.total + term;
          else if(result.operation == "-")
            result.total = result.total - term;
          else if(result.operation == "*")
            result.total = result.total * term;
          else if(result.operation == "/")
            result.total = result.total / term;
          else if(result.operation == "%")
            result.total = result.total % term;
          else
            result.total = term;
        }
        else
          result.operation = term;
        return result;
      }, {operation:null, total:NaN}).total;
      return total;
    }
  });
  
  // Preload template partials
  await loadTemplates([
    "systems/thewitness/templates/parts/token-resources.html",
    "systems/thewitness/templates/parts/roll-dice-select.html"
  ]);
});

Hooks.once("canvasInit", function() {
  canvas.hud.token = new WitnessTokenHUD();
});

/**
 * Handle the resetting of character resources at the top of a combat round.
 */
Hooks.on("combatStart", WitnessCombat._handleRoundStart);
Hooks.on("combatRound", WitnessCombat._handleRoundStart);
