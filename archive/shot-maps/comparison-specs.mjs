export function comparisonSpecs(state,subjectName) {
  const perspectives=state.layout==='profile'?['taken','faced']:
    state.perspective==='taken-faced'?['taken','faced']:
    state.perspective==='faced-taken'?['faced','taken']:
    state.perspective==='faced'?['faced','faced']:['taken','taken'];
  return perspectives.map((perspective,i)=>{
    const second=state.layout==='compare'&&i===1,team=second?state.compareTeam:state.team;
    return {name:subjectName(team,second?'all':state.conference),team,perspective,
      label:perspective==='taken'?'Shots taken':'Shots faced',
      state:second?{...state,team,conference:'all'}:state};
  });
}
