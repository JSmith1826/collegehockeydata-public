const number=(v,d=2)=>Number.isFinite(v)?v.toFixed(d):'—';
const signed=v=>Number.isFinite(v)?(v>0?'+':'')+v.toFixed(2):'—';
export function advancedLines(sample,perspective) {
  if(!sample?.games)return ['No complete expected-goal sample','Goalie-present attempts only; empty nets excluded.',''];
  const coverage=`${sample.games} complete xG game${sample.games===1?'':'s'} · ${sample.attempts} attempts${sample.omitted?' · '+sample.omitted+' games omitted':''}`;
  return perspective==='faced'
    ? [`${number(sample.xg)} xGA  /  ${sample.goals} GA  /  ${signed(sample.gsax)} GSAx`,coverage,'Team goaltending · goalie present · all states']
    : [`${number(sample.xgPer100)} xG / 100 attempts`,coverage,'All states · goalie present · includes blocked attempts'];
}
export function advancedMarkup(sample,perspective) {
  const lines=advancedLines(sample,perspective);
  const title=perspective==='faced'?'Expected vs allowed':'Chance quality';
  const description=perspective==='faced'?'GSAx = expected goals against minus goals allowed, using the same complete game samples. Positive values mean fewer goals allowed than expected. This is a team total, not an individual goalie rating.':'Expected goals per 100 recorded attempts measures chance quality. Counts include blocked attempts. Games with incomplete xG are omitted from both numerator and denominator.';
  return `<section class="chd-advanced-card" aria-label="${title}"><h5>${title}</h5><strong>${lines[0]}</strong><p>${lines[1]}<br>${lines[2]}</p><details><summary>About this sample</summary><p>${description} Empty-net attempts are excluded. Named goalie statistics below remain official box-score totals.</p></details></section>`;
}
