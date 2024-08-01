export class WitnessRuler extends Ruler {
  
  static colorGreen = Color.from(0x00FF00);
  static colorYellow = Color.from(0xFFFF00);
  static colorRed = Color.from(0xFF0000);
  token;

  /* -------------------------------------------- */
  
  _computeDistance(gridSpaces)
  {
    super._computeDistance(gridSpaces);
    if(this.token?.actor)
    {
      let mvStep = this.token.combatant?.getFlag("thewitness", "mvStep") ?? this.token.actor.actualMV;
      if(this.totalDistance <= mvStep)
        this.color = WitnessRuler.colorGreen;
      else if(this.totalDistance <= mvStep*2)
        this.color = WitnessRuler.colorYellow;
      else
        this.color = WitnessRuler.colorRed;
    }
  }

  /* -------------------------------------------- */

  _getSegmentLabel(segment, totalDistance)
  {
    let label = super._getSegmentLabel(segment, totalDistance);
    if(this.token?.actor)
    {
      let mv = this.token.actor.actualMV;
      let mvStep = Math.min(mv, Math.ceil(this.token.actor.actualMaxMV/3));
      if(totalDistance > mvStep*2)
        label += ` (Too Far)`;
      else if(totalDistance > mvStep)
        label += ` (Sprinting)`;
    }
    return label;
  }

  /* -------------------------------------------- */

  clear()
  {
    super.clear();
    this.token = null;
  }
}
