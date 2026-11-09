'use strict';
fetch('/data-update-status.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('status unavailable');return r.json()}).then(data=>{
 const mount=document.getElementById('current-source-status');if(!mount)return;
 const title=document.createElement('h2');title.textContent='Current source coverage';mount.append(title);
 const intro=document.createElement('p');intro.textContent='Results, maps and advanced tables have separate samples. An incomplete source does not change the date of other validated data.';mount.append(intro);
 const table=document.createElement('table'),body=document.createElement('tbody');
 const names={results:'Official results',instat_maps:'InStat shot and net maps',instat_xg:'Linked xG',instat_team_tables:'Season team tables',instat_match_tables:'Game-level team tables',instat_goalie_tables:'Goalie tables',instat_skater_tables:'Skater tables'};
 for(const [key,label] of Object.entries(names)){const item=data.sources[key];if(!item)continue;const row=document.createElement('tr');
  for(const value of [label,item.status==='ready'?'Available':item.status==='retained'?'Retained':'Incomplete',item.through||item.checkedAt?.slice(0,10)||'No date',item.expectedGames!=null?`${item.acceptedGames} / ${item.expectedGames} games`:item.lastAttempt?.status==='failed'?'Last source check failed':'']){const cell=document.createElement('td');cell.textContent=value;row.append(cell)}body.append(row)}
 table.append(body);mount.append(table);
 const stamp=document.createElement('p');stamp.textContent='Release '+data.releaseId+' · prepared '+data.preparedAt;mount.append(stamp);
}).catch(()=>{const node=document.getElementById('current-source-status');if(node)node.textContent='Current source summary unavailable. Retained source notes remain below.'});
