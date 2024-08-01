/**
 * Extend the base Token class to implement additional system-specific logic.
 * @extends {Token}
 */
export class WitnessToken extends Token {
  
  static barColors = {
    hp: "#ff4444",
    sp: "#00ff00",
    fp: "#88aaff",
    mp: "#ff99ff",
    mv: "#ffccaa",
  };
  
  /** @override */
  _onUpdate(data, options, userId) {
    super._onUpdate(data, options, userId);
    if(("flags" in data) && ("thewitness" in data.flags) && (("bar3" in data.flags.thewitness) || ("bar4" in data.flags.thewitness)))
      this.renderFlags.set({refreshBars: true});
  }
  
  /* -------------------------------------------- */
  
  /** @override */
  async _draw() {
    await super._draw();
    this.removeChild(this.bars);
    this.bars = this.addChild(new PIXI.Container());
    this.bars.bar1 = this.bars.addChild(new PIXI.Text("a", {
      //fontFamily : 'Arial',
      dropShadow: true,
      dropShadowBlur: 5,
      dropShadowDistance: 0,
      fontSize: 60,
      fill: 0xffffff,
      padding: 5,
    }));
    this.bars.bar2 = this.bars.addChild(new PIXI.Text("b", {
      //fontFamily : 'Arial',
      dropShadow: true,
      dropShadowBlur: 5,
      dropShadowDistance: 0,
      fontSize: 60,
      fill: 0xffffff,
      padding: 5,
    }));
    this.bars.bar3 = this.bars.addChild(new PIXI.Text("c", {
      //fontFamily : 'Arial',
      dropShadow: true,
      dropShadowBlur: 5,
      dropShadowDistance: 0,
      fontSize: 60,
      fill: 0xffffff,
      padding: 5,
    }));
    this.bars.bar4 = this.bars.addChild(new PIXI.Text("d", {
      //fontFamily : 'Arial',
      dropShadow: true,
      dropShadowBlur: 5,
      dropShadowDistance: 0,
      fontSize: 60,
      fill: 0xffffff,
      padding: 5,
    }));
  }
  
  /* -------------------------------------------- */
  
  drawBars() {
    if ( !this.actor || (this.document.displayBars === CONST.TOKEN_DISPLAY_MODES.NONE) ) return;
    ["bar1", "bar2", "bar3", "bar4"].forEach((b, i) => {
      const bar = this.bars[b];
      const attr = this.document.getBarAttribute(b);
      if ( !attr || (attr.type !== "bar") || (attr.max === 0)  ) return bar.visible = false;
      this._drawBar(i, bar, attr);
      bar.visible = true;
    });
  }
  
  /* -------------------------------------------- */
  
  _drawBar(number, bar, data) {
    bar.scale = {x: 1, y: 1};
    let val = Number(data.value);
    bar.text = val;
    bar.style.fill = WitnessToken.barColors[data?.attribute] ?? 0xffffff;
    
    let widthScale = (this.w/2) / bar.width;
    let heightScale = (this.h/4) / bar.height;
    let scale = Math.min(widthScale, heightScale);
    bar.scale = {x: scale, y: scale};
    
    // Set position
    let posX = number%2 === 0 ? 0 : this.w - bar.width;
    let posY = Math.floor(number/2) === 0 ? 0 : this.h - bar.height;
    bar.position.set(posX, posY);
  }

  /* -------------------------------------------- */

  /** @override */
  _onDragLeftStart(event) {
    if(Ruler.canMeasure) return false;
    super._onDragLeftStart(event);
    canvas.controls.ruler.clear();
    canvas.controls.ruler.token = this;
    canvas.controls.ruler._addWaypoint({x: this.document.x, y: this.document.y});
  }

  /* -------------------------------------------- */

  /** @override */
  _onDragLeftDrop(event) {
    if(Ruler.canMeasure) return false;
    
    let destination = event.interactionData.destination;
    let clones = event.interactionData.clones || [];
    for(let c of clones)
      if(c._original == this)
        destination = {x: c.document.x, y: c.document.y};
    if(!event.shiftKey && (canvas.grid.type !== CONST.GRID_TYPES.GRIDLESS))
    {
      let isTiny = (this.document.width < 1) && (this.document.height < 1);
      let interval = canvas.grid.isHex ? 1 : isTiny ? 2 : 1;
      destination = canvas.grid.getSnappedPosition(destination.x, destination.y, interval, {token: this});
    }
    canvas.controls.ruler.measure(destination, {gridSpaces: !event.shiftKey});
    let distance = canvas.controls.ruler.totalDistance;
    
    super._onDragLeftDrop(event)?.then(updates => {
      for(let u of updates)
      {
        if(u.inCombat)
        {
          let mvCost = Math.min(distance, Math.ceil(u.actor.actualMaxMV/3));
          let spCost = 0;
          if(mvCost < distance)
          {
            spCost = 1 + u.actor.actualMVDMG;
          }
          u.actor.update({
            system: {
              mv: {value: Math.max(0, u.actor.actualMV-mvCost)},
              sp: {value: Math.max(0, u.actor.actualSP-spCost)},
            },
          });
          if(u.combatant.combat.getFlag("thewitness", "useSteps") ?? true)
          {
            let mvStep = u.combatant.getFlag("thewitness", "mvStep");
            u.combatant.setFlag("thewitness", "mvStep", mvStep ? mvStep-mvCost : 0);
          }
        }
      }
    });
    canvas.controls.ruler._endMeasurement();
  }

  /* -------------------------------------------- */

  /** @override */
  _onDragLeftMove(event) {
    if(Ruler.canMeasure) return false;
    super._onDragLeftMove(event);
    
    let destination = event.interactionData.destination;
    let clones = event.interactionData.clones || [];
    for(let c of clones)
      if(c._original == this)
        destination = {x: c.document.x, y: c.document.y};
    if(!event.shiftKey && (canvas.grid.type !== CONST.GRID_TYPES.GRIDLESS))
    {
      let isTiny = (this.document.width < 1) && (this.document.height < 1);
      let interval = canvas.grid.isHex ? 1 : isTiny ? 2 : 1;
      destination = canvas.grid.getSnappedPosition(destination.x, destination.y, interval, {token: this});
    }
    if(!event.interactionData._measureTime || Date.now() - event.interactionData._measureTime > 50)
    {
      canvas.controls.ruler.measure(destination, {gridSpaces: !event.shiftKey});
      event.interactionData._measureTime = Date.now();
    }
  }

  /* -------------------------------------------- */

  /** @override */
  _onDragLeftCancel(event) {
    if(Ruler.canMeasure) return false;
    super._onDragLeftCancel(event);
    canvas.controls.ruler._endMeasurement();
  }
}
