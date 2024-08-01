export class WitnessDie extends Die {
  
  static sortRollResults = (a,b) => a.result==1&&!a.enhanced||b.result==1&&!b.enhanced ? a.result-b.result : b.result-a.result;
  
  _evaluateModifiers() {
    let sortedResults = this.results.filter(result => !result.rerolled).sort(WitnessDie.sortRollResults);
    for(let r in sortedResults)
    {
      if(sortedResults[r].result == 1 && !sortedResults[r].enhanced)
      {
        sortedResults[r].active = true;
        sortedResults[r].canReroll = false;
        sortedResults[r].count = 0;
        sortedResults[r].discarded = false;
        sortedResults[r].failure = true;
        sortedResults[r].success = false;
      }
      else if(r < this.options.keep)
      {
        sortedResults[r].active = true;
        sortedResults[r].canReroll = !sortedResults[r].enhanced && sortedResults[r].result < this.options.successMargin;
        sortedResults[r].count = sortedResults[r].result >= this.options.successMargin ? 1 : 0;
        sortedResults[r].discarded = false;
        sortedResults[r].failure = false;
        sortedResults[r].success = sortedResults[r].result >= this.options.successMargin;
      }
      else
      {
        sortedResults[r].active = false;
        sortedResults[r].canReroll = false;
        sortedResults[r].count = 0;
        sortedResults[r].discarded = true;
        sortedResults[r].failure = false;
        sortedResults[r].success = false;
      }
    }
  }
}
