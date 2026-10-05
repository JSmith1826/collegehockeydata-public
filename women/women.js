const list = document.getElementById('schedule-list');
const status = document.getElementById('schedule-status');

function gameCard(game) {
  const [date, away, home, awayScore, homeScore, time, conference, note] = game;
  const final = awayScore !== null && homeScore !== null;
  const article = document.createElement('article');
  article.className = 'schedule-game';
  const when = document.createElement('time');
  when.dateTime = date;
  when.textContent = new Date(`${date}T12:00:00`).toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric'});
  const teams = document.createElement('div');
  for (const [name, score] of [[away, awayScore], [home, homeScore]]) {
    const label = document.createElement('span'), value = document.createElement('b');
    label.textContent = name;
    value.textContent = final ? score : '';
    teams.append(label, value);
  }
  const details = document.createElement('p');
  details.textContent = `${final ? 'Final' : (time || 'Time TBA')} · ${conference || 'Non-Conference'}${note ? ` · ${note}` : ''}`;
  article.append(when, teams, details);
  return article;
}

fetch('./data/schedule_current.json').then(response => {
  if (!response.ok) throw new Error(`Schedule request failed: ${response.status}`);
  return response.json();
}).then(data => {
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
  const finals = data.games.filter(g => g[3] !== null && g[4] !== null).slice(-12).reverse();
  const upcoming = data.games.filter(g => g[0] >= today && g[3] === null).slice(0,24);
  const shown = [...finals, ...upcoming];
  status.textContent = `${finals.length} recent finals · ${upcoming.length} upcoming games`;
  list.replaceChildren(...shown.map(gameCard));
}).catch(error => {
  status.textContent = 'Schedule temporarily unavailable.';
  console.error(error);
});
