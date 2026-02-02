/* app.js - toàn bộ game client-side (no server)
   - Sinh N cầu thủ (mặc định 17k) khi bấm regen / lần đầu mở
   - Cho phép mua cầu thủ, lưu đội, set tactics, start match vs AI Hard
   - AI & engine mô phỏng simplified nhưng tuned để "hard"
*/

(() => {
  // DOM
  const marketEl = document.getElementById('market');
  const searchInput = document.getElementById('searchInput');
  const prevPageBtn = document.getElementById('prevPage');
  const nextPageBtn = document.getElementById('nextPage');
  const pageInfo = document.getElementById('pageInfo');
  const playerCountInput = document.getElementById('playerCount');
  const regenBtn = document.getElementById('regenPlayers');
  const saveTeamBtn = document.getElementById('saveTeamBtn');
  const startMatchBtn = document.getElementById('startMatchBtn');
  const ensure11Btn = document.getElementById('ensure11');
  const createBtn = document.getElementById('createBtn');
  const playerNameInput = document.getElementById('playerName');
  const teamNameInput = document.getElementById('teamName');
  const teamColorInput = document.getElementById('teamColor');
  const lineupPreview = document.getElementById('lineupPreview');
  const eventsEl = document.getElementById('events');
  const scoreboardEl = document.getElementById('scoreboard');
  const minuteEl = document.getElementById('minute');

  const canvas = document.getElementById('field');
  const ctx = canvas.getContext('2d');

  // State
  let allPlayers = []; // generated players
  let marketPage = 0;
  const PAGE_SIZE = 30;
  let myTeam = { name: 'My Team', color: '#ff6f00', lineup: [], tactics: {pressing:50,width:50,tempo:50,passing:50,defensiveLine:50}, managerAI:false };
  let cpuTeam = null;
  let match = null;
  let animInterval = null;

  // UTIL: random & generator
  function randInt(a,b){ return Math.floor(a + Math.random()*(b-a+1)); }
  function pickWeighted(arr,key='weight'){ const total = arr.reduce((s,x)=>s+(x[key]||0),0); let r=Math.random()*total; for(const it of arr){ r -= (it[key]||0); if (r<=0) return it;} return arr[arr.length-1];}
  function clamp(v,a,b){ return Math.max(a, Math.min(b, v)); }

  const positions = [
    { code: 'GK', weight: 0.07 },
    { code: 'CB', weight: 0.18 },
    { code: 'LB', weight: 0.10 },
    { code: 'RB', weight: 0.10 },
    { code: 'CM', weight: 0.18 },
    { code: 'DM', weight: 0.08 },
    { code: 'LM', weight: 0.06 },
    { code: 'RM', weight: 0.06 },
    { code: 'CAM', weight: 0.05 },
    { code: 'ST', weight: 0.12 }
  ];
  const eras = [
    { name: 'Pre-1950', start:1880, end:1949, weight:0.05},
    { name: '1950-1979', start:1950, end:1979, weight:0.12},
    { name: '1980-1999', start:1980, end:1999, weight:0.18},
    { name: '2000-2009', start:2000, end:2009, weight:0.20},
    { name: '2010-2019', start:2010, end:2019, weight:0.25},
    { name: '2020-2025', start:2020, end:2025, weight:0.20}
  ];
  const firstNames = ['John','James','Robert','Michael','William','David','Richard','Thomas','Charles','Daniel','Luis','Carlos','Marco','Andrea','Sergio','Pedro','Hugo','Alex','Nico','Leo','Victor','Jose','Juan','Paulo','Ivan','Ole','Hans','Jean','Franco'];
  const lastNames = ['Smith','Johnson','Brown','Taylor','Anderson','Martinez','Garcia','Lopez','Rossi','Silva','Muller','Schmidt','Moreau','Dubois','Costa','Fernandez','Nakamura','Kim','Ivanov','Popov'];

  function genName(i){
    const fn = firstNames[randInt(0, firstNames.length-1)];
    const ln = lastNames[randInt(0, lastNames.length-1)];
    if (Math.random()<0.08) return `${fn} ${ln} Jr.`;
    return `${fn} ${ln}`;
  }

  function createPlayer(idx){
    const era = pickWeighted(eras);
    const birth = randInt(era.start, era.end - 18);
    const pos = pickWeighted(positions).code;
    let atk=50, def=50, pas=50, shoot=50, speed=50, stamina=50, positioning=50, gk=10;
    const base = randInt(45,88);
    if (Math.random() < 0.01) { /* superstar */ }
    if (pos==='GK'){
      gk = clamp(60 + randInt(-10,30),20,99);
      atk = randInt(10,30); def = randInt(40,70); pas = randInt(40,70); shoot = randInt(10,40);
      speed = randInt(30,65); stamina = randInt(50,90); positioning = randInt(50,90);
    } else if (pos==='CB'){
      def = clamp(base + randInt(0,10),30,99); positioning = clamp(def + randInt(-6,6),30,99); atk = randInt(30,70);
      pas = randInt(40,75); speed = randInt(45,80); shoot = randInt(30,70); stamina = randInt(60,95);
    } else if (pos==='LB' || pos==='RB'){
      speed = randInt(60,95); def = randInt(60,90); pas = randInt(50,85); atk = randInt(50,85); stamina = randInt(65,95);
      positioning = randInt(50,85); shoot = randInt(40,80);
    } else if (pos==='ST'){
      atk = clamp(base + randInt(0,10),40,99); shoot = clamp(atk + randInt(-6,10),30,99); speed = randInt(60,98); pas = randInt(50,85);
      def = randInt(20,60); stamina = randInt(60,95); positioning = randInt(55,95);
    } else {
      pas = clamp(base + randInt(-6,8),40,99); positioning = clamp(pas + randInt(-8,8),40,99);
      atk = randInt(50,85); def = randInt(40,85); shoot = randInt(50,85); speed = randInt(45,90); stamina = randInt(60,95);
    }
    const rating = Math.round((atk*0.22 + def*0.18 + pas*0.18 + shoot*0.18 + speed*0.12 + positioning*0.12));
    const eraMultiplier = (era.name==='Pre-1950')?0.2: (era.name==='1950-1979'?0.5: (era.name==='1980-1999'?0.7: (era.name==='2000-2009'?0.9: (era.name==='2010-2019'?1.1:1.2)))));
    let price = Math.round(Math.max(20000, (rating * 100000) * eraMultiplier * (1 + (Math.random()-0.5)*0.2)));
    if (rating > 90) price = Math.round(price * 1.5 + 20000000);
    const name = genName(idx);
    const nation = ['England','Spain','Italy','France','Brazil','Argentina','Portugal','Netherlands','Germany','Belgium'][randInt(0,9)];
    return { id: `${name.toLowerCase().replace(/[^a-z0-9]+/g,'_')}_${idx}`, name, pos, era: era.name, birthYear: birth, nation, price, atk, def, pas, shoot, speed, stamina: Math.round(stamina), positioning, gk, rating };
  }

  // Generate players N (may be large)
  function generatePlayers(N = 17000){
    allPlayers = [];
    const t0 = performance.now();
    for (let i=0;i<N;i++){
      allPlayers.push(createPlayer(i));
    }
    const t1 = performance.now();
    log(`Đã sinh ${N} cầu thủ (t=${Math.round(t1-t0)}ms)`);
    marketPage = 0;
    renderMarket();
  }

  // MARKET UI
  function renderMarket(){
    const q = searchInput.value.trim().toLowerCase();
    const filtered = q ? allPlayers.filter(p => p.name.toLowerCase().includes(q) || p.pos.toLowerCase() === q) : allPlayers;
    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    marketPage = clamp(marketPage, 0, totalPages-1);
    const slice = filtered.slice(marketPage*PAGE_SIZE, (marketPage+1)*PAGE_SIZE);
    marketEl.innerHTML = '';
    slice.forEach(p => {
      const card = document.createElement('div');
      card.className = 'player-card';
      card.innerHTML = `<div>
        <strong>${p.name}</strong>
        <div class="meta">${p.pos} — ${p.nation} — ${p.era} — Rating:${p.rating}</div>
        <div class="meta">Giá: ${p.price.toLocaleString()}</div>
      </div>
      <div>
        <button data-id="${p.id}">Mua</button>
      </div>`;
      const btn = card.querySelector('button');
      btn.onclick = () => {
        if (myTeam.lineup.length >= 18) { alert('Ghế dự bị đầy (18)'); return; }
        // add copy (stats)
        myTeam.lineup.push(Object.assign({}, p, { x: 120 + myTeam.lineup.length*6 % 600, y: 120 + (myTeam.lineup.length%5)*70 }));
        renderLineupPreview();
      };
      marketEl.appendChild(card);
    });
    pageInfo.innerText = `Trang ${marketPage+1}/${totalPages} (Tổng: ${filtered.length})`;
  }

  // LINEUP preview
  function renderLineupPreview(){
    lineupPreview.innerHTML = `<strong>${myTeam.name}</strong> (${myTeam.lineup.length} players)<br/>` +
      myTeam.lineup.slice(0,11).map((p,i)=>`${i+1}. ${p.name} (${p.pos})`).join('<br/>');
    document.getElementById('teamName').value = myTeam.name;
    document.getElementById('teamColor').value = myTeam.color;
  }

  // Ensure 11 players
  function ensure11(){
    while (myTeam.lineup.length < 11){
      const idx = Math.floor(Math.random()*allPlayers.length);
      myTeam.lineup.push(Object.assign({}, allPlayers[idx], { x:120 + myTeam.lineup.length*10, y:120 + (myTeam.lineup.length%5)*70 }));
    }
    renderLineupPreview();
    log('Đã đảm bảo 11 cầu thủ (tự sinh thêm nếu thiếu).');
  }

  // Save team
  function saveTeam(){
    myTeam.name = (teamNameInput.value.trim() || myTeam.name);
    myTeam.color = teamColorInput.value;
    myTeam.tactics = {
      pressing: parseInt(document.getElementById('t_pressing').value),
      width: parseInt(document.getElementById('t_width').value),
      tempo: parseInt(document.getElementById('t_tempo').value),
      passing: parseInt(document.getElementById('t_passing').value),
      defensiveLine: parseInt(document.getElementById('t_defline').value)
    };
    renderLineupPreview();
    log('Đã lưu đội và chiến thuật.');
  }

  // Match creation: CPU team generated from remaining players (hard AI)
  function createMatch(){
    ensure11();
    // clone my team to avoid mutation
    const playerSide = JSON.parse(JSON.stringify(myTeam));
    playerSide.managerAI = false;

    // create CPU team with similar size but stronger tuning depending on difficulty
    cpuTeam = { name: 'CPU Opponent', color: '#1976d2', lineup: [], tactics: {pressing:65,width:50,tempo:55,passing:55,defensiveLine:50}, managerAI:true, aiLevel:'hard' };
    // pick 11 strong players from pool (prefer high rating)
    const pool = allPlayers.slice().sort((a,b)=>b.rating-a.rating);
    let added = 0, idx = 0;
    while (added < 11 && idx < pool.length){
      const p = Object.assign({}, pool[idx++]);
      // place positions broadly
      p.x = 680 - added*10; p.y = 80 + (added%5)*80;
      p.stamina = 100;
      cpuTeam.lineup.push(p);
      added++;
    }

    match = {
      time: 0,
      scoreA: 0,
      scoreB: 0,
      sideA: playerSide, // left
      sideB: cpuTeam,    // right
      ball: { x:400, y:280, vx:0, vy:0, poss:null },
      events: [],
      state:'running',
      duration: 90
    };
    // start loop
    startMatchLoop();
  }

  // LOG
  function log(txt){
    const d = document.createElement('div');
    d.textContent = `[${new Date().toLocaleTimeString()}] ${txt}`;
    eventsEl.prepend(d);
  }

  // AI & sim logic (client-side)
  function findNearestToBall(match){
    const all = [];
    match.sideA.lineup.forEach(p=>all.push({p,side:'A'}));
    match.sideB.lineup.forEach(p=>all.push({p,side:'B'}));
    let best=null, bestD=1e9;
    for(const it of all){ const d = Math.hypot(it.p.x - match.ball.x, it.p.y - match.ball.y); if (d<bestD){bestD=d;best=it;} }
    return { nearest: best?best.p:null, side: best?best.side:null, dist: bestD };
  }

  function possessionChance(player, teamTactics, oppTactics){
    const base = (player.speed*0.4 + player.positioning*0.3 + player.stamina*0.3)/100;
    const pressFactor = 1 - (oppTactics.pressing - teamTactics.pressing)/200;
    return clamp(base * pressFactor, 0.05, 0.95);
  }

  function advancedStep(match){
    // possession acquisition
    const nearest = findNearestToBall(match);
    if (!match.ball.poss){
      if (nearest.nearest && nearest.dist < 18){
        const side = nearest.side === 'A' ? match.sideA : match.sideB;
        const opp = nearest.side === 'A' ? match.sideB : match.sideA;
        if (Math.random() < possessionChance(nearest.nearest, side.tactics, opp.tactics)){
          match.ball.poss = { side: nearest.side, playerId: nearest.nearest.id };
          match.events.push({ t: Math.floor(match.time), type:'possession', by: nearest.nearest.name, side: nearest.side });
        }
      }
    } else {
      const possSide = match.ball.poss.side;
      const possTeam = possSide==='A' ? match.sideA : match.sideB;
      const oppTeam = possSide==='A' ? match.sideB : match.sideA;
      const player = possTeam.lineup.find(p=>p.id === match.ball.poss.playerId);
      if (!player){ match.ball.poss = null; return; }

      // stamina drain
      player.stamina = clamp(player.stamina - 0.3 - (100-player.stamina)*0.002, 0, 100);

      const goalX = (possSide==='A') ? 880 : 20;
      const toGoalDist = Math.abs(goalX - player.x);

      const shootBase = (player.shoot*0.6 + player.atk*0.3 + player.positioning*0.1)/100;
      const shootModifier = (1 - (toGoalDist/900)) * 1.8;
      const shootProb = clamp(shootBase * shootModifier * (1 + (possTeam.tactics.tempo-50)/200), 0, 0.6);

      const passStyle = possTeam.tactics.passing;
      const passBase = (player.pas*0.6 + player.atk*0.2 + player.positioning*0.2)/100;
      const passProb = clamp(passBase * (0.3 + passStyle/100) * (1 + (possTeam.tactics.width-50)/200), 0, 0.9);

      const dribbleProb = clamp(0.2 + (player.speed-50)/200 + (player.atk-50)/300, 0, 0.4);

      const rnd = Math.random();
      if (rnd < shootProb){
        match.events.push({ t: Math.floor(match.time), type:'shot', by: player.name, side: possSide });
        const goalkeeper = oppTeam.lineup[0] || { gk:50, name:'GK' };
        const shootingPower = player.shoot * (0.6 + player.stamina/200);
        const saveChance = clamp((goalkeeper.gk*0.7 + goalkeeper.positioning*0.2 + (100-goalkeeper.stamina)*0.1)/150, 0.05, 0.9);
        const distFactor = clamp(1 - (toGoalDist/900), 0.05, 1);
        const goalProb = clamp(shootingPower/180 * distFactor * (1 + (player.positioning-50)/200), 0.01, 0.5);
        if (Math.random() < goalProb * (1 - saveChance)){
          if (possSide==='A') match.scoreA++; else match.scoreB++;
          match.events.push({ t: Math.floor(match.time), type:'goal', by: player.name, side: possSide });
          match.ball = { x:450, y:280, vx:0, vy:0, poss:null };
        } else {
          if (Math.random() < 0.5){
            const oppNearest = oppTeam.lineup[Math.floor(Math.random()*oppTeam.lineup.length)];
            match.ball.poss = { side: (possSide==='A'?'B':'A'), playerId: oppNearest.id };
            match.events.push({ t: Math.floor(match.time), type:'save', by: goalkeeper.name, side: (possSide==='A'?'B':'A') });
          } else {
            match.ball.poss = null;
          }
        }
        player.stamina = clamp(player.stamina - 2,0,100);
      } else if (rnd < shootProb + passProb){
        const teammates = possTeam.lineup.filter(p=>p.id !== player.id);
        const weighted = teammates.map(tp=>{
          const forwardness = possSide==='A' ? tp.x : (900 - tp.x);
          const weight = 1 + (forwardness/900) + (tp.pas - 50)/200 + (possTeam.tactics.width-50)/200;
          return { tp, weight };
        });
        const sumW = weighted.reduce((s,w)=>s+w.weight,0);
        let pick = Math.random()*sumW; let chosen = weighted[0].tp;
        for(const w of weighted){ pick -= w.weight; if (pick <=0){ chosen = w.tp; break; } }
        const passDist = Math.hypot(player.x - chosen.x, player.y - chosen.y);
        const passAccuracy = clamp((player.pas*0.6 + chosen.positioning*0.3 + player.stamina*0.1)/100 - passDist/1000, 0.05, 0.98);
        match.events.push({ t: Math.floor(match.time), type:'pass', from: player.name, to: chosen.name, side: possSide });
        if (Math.random() < passAccuracy){
          match.ball.poss = { side: possSide, playerId: chosen.id };
          match.ball.x = chosen.x + (Math.random()-0.5)*10;
          match.ball.y = chosen.y + (Math.random()-0.5)*10;
        } else {
          const oppNearest = oppTeam.lineup.reduce((best,p)=>{ const d = Math.hypot(p.x - (player.x+chosen.x)/2, p.y - (player.y+chosen.y)/2); return (!best || d<best.d) ? {p,d} : best; }, null);
          if (oppNearest && Math.random() < 0.6){
            match.ball.poss = { side: (possSide==='A'?'B':'A'), playerId: oppNearest.p.id };
            match.events.push({ t: Math.floor(match.time), type:'intercept', by: oppNearest.p.name, side: (possSide==='A'?'B':'A') });
          } else match.ball.poss = null;
        }
        player.stamina = clamp(player.stamina - 0.6,0,100);
      } else {
        const forward = (possSide==='A') ? 6 + (player.speed-50)/20 : -6 - (player.speed-50)/20;
        player.x = clamp(player.x + forward, 20, 880);
        player.y = clamp(player.y + (Math.random()-0.5)*10, 20, 540);
        match.ball.x = player.x + (Math.random()-0.5)*6;
        match.ball.y = player.y + (Math.random()-0.5)*6;
        player.stamina = clamp(player.stamina - 0.8,0,100);
        const oppClose = oppTeam.lineup.some(p => Math.hypot(p.x-player.x, p.y-player.y) < 20 && Math.random() < (0.05 + (100-player.stamina)/300));
        if (oppClose){
          const winner = oppTeam.lineup.reduce((best,p)=>{ const d = Math.hypot(p.x-player.x, p.y-player.y); return (!best || d<best.d) ? {p,d} : best; }, null);
          if (winner && Math.random() < 0.5){
            match.ball.poss = { side: (possSide==='A'?'B':'A'), playerId: winner.p.id };
            match.events.push({ t: Math.floor(match.time), type:'tackle', by: winner.p.name, side: (possSide==='A'?'B':'A') });
          }
        }
      }
    }

    // small passive recovery
    [...match.sideA.lineup, ...match.sideB.lineup].forEach(p=>{
      if (!match.ball.poss || (match.ball.poss && match.ball.poss.playerId !== p.id)){
        p.stamina = clamp(p.stamina + 0.02, 0, 100);
      }
    });

    if (!match.ball.poss){
      match.ball.x += match.ball.vx; match.ball.y += match.ball.vy;
      match.ball.vx *= 0.94; match.ball.vy *= 0.94;
      match.ball.x = clamp(match.ball.x, 10, 890); match.ball.y = clamp(match.ball.y, 10, 550);
    } else {
      const side = match.ball.poss.side === 'A' ? match.sideA : match.sideB;
      const poss = side.lineup.find(p=>p.id === match.ball.poss.playerId);
      if (poss){
        match.ball.x = poss.x + (Math.random()-0.5)*4;
        match.ball.y = poss.y + (Math.random()-0.5)*4;
        match.ball.vx = 0; match.ball.vy = 0;
      }
    }

    // manager AI substitutions/tactic shifts (simple)
    [ {side:'A',team:match.sideA}, {side:'B',team:match.sideB} ].forEach(s=>{
      const team = s.team;
      if (!team.managerAI) return;
      if ((s.side==='A' ? match.scoreA < match.scoreB : match.scoreB < match.scoreA) && match.time > 30){
        team.tactics.tempo = clamp(team.tactics.tempo + 4, 30, 95);
        team.tactics.pressing = clamp(team.tactics.pressing + 5, 30, 95);
      }
      if ((s.side==='A' ? match.scoreA > match.scoreB : match.scoreB > match.scoreA) && match.time > 60){
        team.tactics.tempo = clamp(team.tactics.tempo - 6, 20, 90);
        team.tactics.defensiveLine = clamp(team.tactics.defensiveLine - 8, 10, 90);
      }
      team.subs = team.subs || 0;
      for (let i=0;i<team.lineup.length;i++){
        const p = team.lineup[i];
        if (p.stamina < 18 && team.subs < 3){
          const newP = Object.assign({}, p);
          newP.id = newP.id + '_sub' + team.subs;
          newP.name = newP.name + '_sub';
          newP.stamina = 100;
          newP.atk = clamp(newP.atk + randInt(-3,6), 30, 99);
          team.lineup[i] = newP;
          team.subs++;
          match.events.push({ t: Math.floor(match.time), type:'sub', out: p.name, in: newP.name, side: s.side });
        }
      }
    });
  }

  // MATCH LOOP
  let tickCount = 0;
  function startMatchLoop(){
    if (!match) return;
    clearInterval(animInterval);
    tickCount = 0;
    const ticksPerMinute = 10;
    animInterval = setInterval(()=>{
      tickCount++;
      if (tickCount % ticksPerMinute === 0) match.time += 1;
      // run several AI steps to simulate pace (tweak for difficulty)
      advancedStep(match);
      // update UI
      scoreboardEl.innerText = `${match.scoreA} - ${match.scoreB}`;
      minuteEl.innerText = `${Math.floor(match.time)}'`;
      // draw
      drawMatch();
      // feed events to log (show recent)
      if (match.events && match.events.length){
        const ev = match.events[match.events.length-1];
        if (ev.type === 'goal') log(`Bàn thắng: ${ev.by} bên ${ev.side} (${Math.floor(ev.t)}')`);
        else if (ev.type === 'shot') log(`Sút: ${ev.by} (${ev.side})`);
        else if (ev.type === 'pass') log(`Chuyền: ${ev.from} → ${ev.to} (${ev.side})`);
        else if (ev.type === 'intercept') log(`Cắt bóng: ${ev.by} (${ev.side})`);
        else if (ev.type === 'save') log(`Cứu thua: ${ev.by} (${ev.side})`);
        else if (ev.type === 'sub') log(`Thay người: ${ev.out} → ${ev.in} (${ev.side})`);
        else if (ev.type === 'tackle') log(`Tackle: ${ev.by} (${ev.side})`);
      }
      if (match.time >= match.duration){
        clearInterval(animInterval);
        log(`Trận kết thúc: ${match.scoreA} - ${match.scoreB}`);
      }
    }, 180); // tick every 180ms -> ~18s full match (fast demo)
  }

  // DRAW
  let limbPhase = 0;
  function drawMatch(){
    limbPhase += 0.12;
    ctx.clearRect(0,0,canvas.width,canvas.height);
    // grass
    const g = ctx.createLinearGradient(0,0,0,canvas.height);
    g.addColorStop(0,'#2e7d32'); g.addColorStop(1,'#145a32');
    ctx.fillStyle = g; ctx.fillRect(0,0,canvas.width,canvas.height);
    // center line
    ctx.strokeStyle = '#aee6b4'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(canvas.width/2,0); ctx.lineTo(canvas.width/2,canvas.height); ctx.stroke();

    if (!match) return;
    const drawPlayer = (p, color) => {
      const x = p.x, y = p.y;
      // shadow
      ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.beginPath(); ctx.ellipse(x, y+14, 14, 6, 0, 0, Math.PI*2); ctx.fill();
      // legs (simple)
      ctx.strokeStyle = '#222'; ctx.lineWidth = 3; ctx.beginPath();
      ctx.moveTo(x-6, y+8); ctx.lineTo(x-6 + Math.sin(limbPhase + (p.id.length%5))*4, y+24);
      ctx.moveTo(x+6, y+8); ctx.lineTo(x+6 - Math.sin(limbPhase + (p.id.length%6))*4, y+24); ctx.stroke();
      // body
      ctx.fillStyle = color; ctx.beginPath(); ctx.ellipse(x, y, 10, 12, 0, 0, Math.PI*2); ctx.fill();
      // head
      ctx.fillStyle = '#f5d6b4'; ctx.beginPath(); ctx.arc(x, y-14, 6, 0, Math.PI*2); ctx.fill();
      // number text
      ctx.fillStyle = '#fff'; ctx.font = '9px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText((p.name||'').split(' ')[0].slice(0,2).toUpperCase(), x, y+2);
      // stamina bar
      if (p.stamina !== undefined){
        ctx.fillStyle = '#333'; ctx.fillRect(x-12, y+18, 24, 4);
        ctx.fillStyle = p.stamina > 50 ? '#00c853' : (p.stamina > 20 ? '#ffab00' : '#d50000');
        ctx.fillRect(x-12, y+18, 24 * (p.stamina/100), 4);
      }
    };

    match.sideA.lineup.forEach(p=>drawPlayer(p, match.sideA.color || '#ff6f00'));
    match.sideB.lineup.forEach(p=>drawPlayer(p, match.sideB.color || '#1976d2'));

    // ball
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(match.ball.x, match.ball.y, 6, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = '#00000022'; ctx.lineWidth = 1; ctx.stroke();
  }

  // EVENTS & UI wiring
  searchInput.addEventListener('input', ()=>{ marketPage = 0; renderMarket(); });
  prevPageBtn.addEventListener('click', ()=>{ marketPage = Math.max(0, marketPage-1); renderMarket(); });
  nextPageBtn.addEventListener('click', ()=>{ marketPage = marketPage+1; renderMarket(); });
  regenBtn.addEventListener('click', ()=>{ const n = parseInt(playerCountInput.value) || 17000; generatePlayers(n); });
  saveTeamBtn.addEventListener('click', saveTeam);
  ensure11Btn.addEventListener('click', ()=>{ ensure11(); });
  createBtn.addEventListener('click', ()=>{ const name = playerNameInput.value.trim() || 'Player'; log(`Chào ${name}! Tạo đội sẵn sàng.`); });
  startMatchBtn.addEventListener('click', ()=>{ createMatch(); });

  // init: generate players (default)
  window.addEventListener('load', ()=>{
    const n = parseInt(playerCountInput.value) || 17000;
    // small delay so UI paints first
    setTimeout(()=> generatePlayers(n), 50);
  });

  // Expose some helpers for debugging
  window._fc2d = { regenerate: () => generatePlayers(parseInt(playerCountInput.value) || 17000), getPlayers: () => allPlayers };

})();
