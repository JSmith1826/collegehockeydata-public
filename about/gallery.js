/* Buildless, manual slideshow: works on loopback and when index.html is opened directly. */
(() => {
  const site = 'https://collegehockeydata.com/';
  const charts = [
    {id:'age',title:'Age & experience',context:'2024 Frozen Four',description:'How much experience does a team bring to the tournament? This early comparison put class years and average age side by side.',alt:'Stacked class-year bars and average ages for Boston College, Michigan, Boston University, and Denver in the 2024 Frozen Four.',study:'explorers/age-experience/'},
    {id:'lines',title:'Line by line',context:'2024 Frozen Four',description:'A roster looks different when you break it into forward lines and defensive pairs. These small charts compare goals, shots, penalty minutes, and plus/minus across the lineup.',alt:'Twelve grouped bar charts comparing goals, shots, penalty minutes, and plus/minus for forward lines and defensive pairs at the 2024 Frozen Four.'},
    {id:'penalties',title:'Time in the box',context:'2024 Frozen Four',description:'Penalty totals only tell part of the story. This plot follows how often each team and its opponents had players in the box as a game unfolded.',alt:'Four time-series charts showing penalty-box occupancy over a game for the 2024 Frozen Four teams.'},
    {id:'special-teams',title:'Special teams',context:'2024 Frozen Four',description:'Power-play success and penalty killing belong in the same picture. An early scatterplot placed the tournament teams in that wider comparison.',alt:'Scatterplot of power-play and penalty-kill percentages with the four 2024 Frozen Four teams highlighted.',study:'explorers/team-stats/?metric=special'},
    {id:'control',title:'Beyond the final score',context:'Top 20 teams by Pairwise ranking · historical snapshot',description:'How much of the game does a team actually spend ahead, tied, or behind? This saved Game Balance plot is an early version of a question you can now explore in Game Control.',alt:'A tall horizontal bar chart splitting game time into leading, trailing, and tied states for the top 20 teams by Pairwise ranking.',study:'explorers/game-control/'},
    {id:'attempts',title:'A season of shot attempts',context:'NCHC · historical snapshot',description:'Cumulative charts made it possible to follow a season rather than one final total. These panels separate goals, saves, misses, and blocks as the games add up.',alt:'Four stacked cumulative shot-attempt charts for NCHC teams, including goals, saved shots, missed shots, and blocked shots.',study:'explorers/team-stats/?metric=shots'},
    {id:'on-net',title:'Shots reaching the net',context:'NCHC · historical snapshot',description:'A related view focuses on shots on goal, separating goals from saved shots and showing how each team’s season accumulated.',alt:'Four cumulative shots-on-goal panels for NCHC teams, splitting saved shots and goals.',study:'explorers/team-stats/?metric=shots'},
    {id:'women-matchups',title:'Across the women’s conferences',context:'2024–25 D1 women’s hockey',description:'A matrix turns interconference results into a picture of who played whom and who won. Women’s hockey was part of the earlier chart work, too.',alt:'A women’s conference matchup matrix labeled 2024–25, showing interconference wins and nonconference records.',study:'explorers/conference-matchups/?competition=women'},
    {id:'goals',title:'Scoring & preventing goals',context:'Games through March 22, 2026',description:'Put goals scored and goals allowed on two axes and patterns become easier to see. This is one of the comparisons that grew into the Team Stat Explorer.',alt:'Scatterplot of average goals scored versus average goals allowed per game, using team logos and descriptive quadrant labels.',study:'explorers/team-stats/?metric=goals'},
    {id:'finishing',title:'Placement vs. finishing',context:'Games through March 22, 2026',description:'Getting an attempt on net and turning a shot on goal into a goal are different parts of the same problem. This plot compares those two rates.',alt:'Scatterplot comparing shooting percentage and the percentage of shot attempts that reach the net, with team logos as points.',study:'explorers/team-stats/?metric=shots'},
    {id:'five-on-three',title:'The 5-on-3 picture',context:'Games through March 22, 2026',description:'Some questions live in the unusual moments. This comparison looks at the time teams spent with a two-player advantage and a two-player disadvantage.',alt:'Scatterplot of total time spent up and down two players in 5-on-3 situations, labeled with team logos.'},
    {id:'shot-leaders',title:'Who shoots most often?',context:'Games through March 22, 2026',description:'A player leaderboard puts shooting volume on a per-60-minute basis. It is another example of using a chart to look beyond a raw season total.',alt:'A color-coded table of the top 30 skaters by shots per 60 minutes, with player, team, and supporting statistics.'},
    {id:'blocks',title:'Blocking at both ends',context:'Manchester Regional · historical snapshot',description:'How many attempts does a team block, and how many of its own are blocked? This regional comparison placed both sides of that exchange in one chart.',alt:'A scatterplot for the Manchester Regional teams comparing defensive blocks with offensive attempts blocked by opponents.',study:'shot-maps/'},
    {id:'faceoffs',title:'What follows a faceoff?',context:'Goals within 10 seconds · historical snapshot',description:'A faceoff win is a starting point. This chart asks how often teams scored or conceded soon after the draw.',alt:'A scatterplot comparing goals scored and allowed within ten seconds of faceoffs for four tournament teams.'},
    {id:'big-ten',title:'A season against the last',context:'Big Ten · 2024–25 season vs. 2025–26 year to date',description:'Is a team ahead of its previous pace? Comparing points percentages made that question visible before it became another filter in an interactive study.',alt:'A Big Ten scatterplot comparing the 2024–25 full-season points percentage with the 2025–26 year-to-date points percentage.',study:'explorers/conference-race/'}
  ];
  const get = id => document.getElementById(id);
  const region = document.querySelector('.gallery');
  const strip = get('thumbnails');
  let current = 0;
  const buttons = charts.map((chart, index) => {
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'thumbnail';
    button.setAttribute('aria-label', `Show chart ${index+1}: ${chart.title}`);
    button.setAttribute('aria-pressed', String(index === 0));
    const image = document.createElement('img');
    image.src = `./assets/thumbs/${chart.id}.webp`; image.alt = ''; image.loading = 'lazy';
    image.width = 64; image.height = 65;
    const number = document.createElement('span'); number.textContent = String(index+1).padStart(2,'0');
    button.append(image,number); button.addEventListener('click', () => show(index));
    strip.append(button); return button;
  });
  function show(index) {
    current = (index + charts.length) % charts.length;
    const chart = charts[current];
    get('slide-title').textContent = chart.title;
    get('slide-context').textContent = chart.context;
    get('slide-description').textContent = chart.description;
    get('slide-count').textContent = `${String(current+1).padStart(2,'0')} OF ${charts.length}`;
    const original = `./assets/originals/${chart.id}.png`;
    get('original-link').href = original;
    get('image-link').href = original;
    get('image-link').setAttribute('aria-label', `Open ${chart.title} original in a new tab`);
    const image = get('slide-image');
    // Drop the initial portrait ratio: each original retains its own proportions.
    image.removeAttribute('width'); image.removeAttribute('height');
    image.src = `./assets/${chart.id}.webp`; image.alt = chart.alt;
    get('study-link').hidden = !chart.study;
    if(chart.study) get('study-link').href = site + chart.study;
    buttons.forEach((button, i) => button.setAttribute('aria-pressed', String(i === current)));
    // Scroll only the horizontal thumbnail strip; leave the reader's page position alone.
    const button = buttons[current];
    const left = button.offsetLeft - strip.offsetLeft;
    if(left < strip.scrollLeft) strip.scrollLeft = left;
    else if(left + button.offsetWidth > strip.scrollLeft + strip.clientWidth)
      strip.scrollLeft = left + button.offsetWidth - strip.clientWidth;
    get('slide-position').textContent = `Chart ${current+1} of ${charts.length}: ${chart.title}`;
  }
  get('previous-slide').addEventListener('click', () => show(current-1));
  get('next-slide').addEventListener('click', () => show(current+1));
  region.addEventListener('keydown', event => {
    if(event.altKey || event.ctrlKey || event.metaKey) return;
    if(event.key === 'ArrowRight') { event.preventDefault(); show(current+1); }
    if(event.key === 'ArrowLeft') { event.preventDefault(); show(current-1); }
  });
})();
