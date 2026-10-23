import {selectPopulation,outcomeGroups,areaOutcomes} from './model.mjs?v=20261023-paired-study';

export function summaryConference(data,spec){
  return spec.team==='all'?(spec.state.conference==='all'?null:spec.state.conference):
    data.teams.find(team=>String(team.id)===spec.team)?.conference||null;
}

export function summaryReference(data,spec,mode){
  if(!['conference','national'].includes(mode))return null;
  const conference=mode==='conference'?summaryConference(data,spec):'all';
  if(!conference)return null;
  const label=mode==='national'?'National average':conference==='Independent'?'Independent programs average':`${conference} average`;
  const population=selectPopulation(data,{...spec.state,team:'all',conference,outcome:'all'},spec.perspective);
  return {label,population};
}

// Pool attempts, rather than averaging team percentages with unequal samples.
// Use all outcomes even when the map itself is filtered to one outcome.
export function compareSummary(subject,reference,zone=null){
  const counts=zone?areaOutcomes(subject,zone):subject.outcomes,referenceCounts=zone?areaOutcomes(reference,zone):reference.outcomes;
  const total=counts.reduce((a,b)=>a+b,0),referenceTotal=referenceCounts.reduce((a,b)=>a+b,0);
  const groups=outcomeGroups(counts),referenceGroups=outcomeGroups(referenceCounts);
  return {total,referenceTotal,rows:groups.map((group,i)=>{
    const share=total?100*group.count/total:null,referenceShare=referenceTotal?100*referenceGroups[i].count/referenceTotal:null;
    return {id:group.id,name:group.name,count:group.count,share,referenceCount:referenceGroups[i].count,referenceShare,
      difference:share===null||referenceShare===null?null:share-referenceShare};
  })};
}
