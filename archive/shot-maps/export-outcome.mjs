// The map's selected population must be readable without the interactive controls.
const outcomes={
  all:{title:'ALL SHOT ATTEMPTS',label:'All attempts',definition:'Goals + saved shots + misses + blocks'},
  onnet:{title:'ON-NET SHOTS',label:'On-net shots',definition:'Goals + saved shots'},
  goal:{title:'GOALS',label:'Goals',definition:'Recorded goals only'},
  saved:{title:'SAVED SHOTS',label:'Saved shots',definition:'Shots saved by the goalie; goals excluded'},
  missed:{title:'MISSED ATTEMPTS',label:'Missed attempts',definition:'Recorded misses, including posts where grouped by the source'},
  blocked:{title:'BLOCKED ATTEMPTS',label:'Blocked attempts',definition:'Recorded blocked attempts only'},
};
export function exportOutcome(outcome){
  if(!Object.hasOwn(outcomes,outcome))throw new Error('Unknown exported shot outcome');
  return {...outcomes[outcome]};
}

const perspectives={
  taken:{title:'SHOTS TAKEN',definition:'OFFENSE · attempts made',color:'#18453b'},
  faced:{title:'SHOTS FACED',definition:'DEFENSE · opponent attempts',color:'#70462f'},
};
export function exportPerspective(perspective){
  if(!Object.hasOwn(perspectives,perspective))throw new Error('Unknown exported shot perspective');
  return {...perspectives[perspective]};
}
