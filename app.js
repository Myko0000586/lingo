/* ============================================================
   LINGO — движок приложения
   ============================================================ */

/* ---------- Состояние и сохранение ---------- */
const MAX_HEARTS = 5;
const SRS_INTERVALS = [0, 1, 2, 4, 8, 16]; // дни до повторения по «коробкам»
const LEARNED_BOX = 5;                       // достиг этой коробки → «выучено»

const DEFAULT_STATE = {
  level: 'A2',
  activeTopics: ['home','hockey','school','food','travel','grammar'],
  dailyGoal: 30,            // XP в день
  reminderTime: '19:00',
  notify: false,
  hearts: MAX_HEARTS, lastHeartTs: 0,
  gems: 0, xp: 0, streak: 0, lastDay: null,
  todayXp: 0, todayDate: null,
  progress: {},             // lessonKey -> true
  vocab: {},                // wordId -> {box, due(день), reps, status, added}
  writing: [],              // история проверок письма
  apiUrl: '',               // адрес ИИ-сервера
};

let S = loadState();

function loadState(){
  try{
    const raw = localStorage.getItem('lingo2');
    if(raw) return Object.assign({}, DEFAULT_STATE, JSON.parse(raw));
  }catch(e){}
  return JSON.parse(JSON.stringify(DEFAULT_STATE));
}
function save(){ localStorage.setItem('lingo2', JSON.stringify(S)); }

/* ---------- Вспомогательное ---------- */
const $ = sel => document.querySelector(sel);
const today = () => Math.floor(Date.now() / 86400000); // номер дня
const todayStr = () => new Date().toDateString();
function shuffle(a){ for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }
function norm(s){ return (s||'').toLowerCase().replace(/[^a-z0-9 ]/g,'').replace(/\s+/g,' ').trim(); }
function esc(s){ return (s||'').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }

function speak(text){
  try{ speechSynthesis.cancel(); const u=new SpeechSynthesisUtterance(text); u.lang='en-US'; u.rate=0.9; speechSynthesis.speak(u);}catch(e){}
}
function toast(msg){ const t=$('#toast'); t.textContent=msg; t.classList.add('show'); clearTimeout(t._t); t._t=setTimeout(()=>t.classList.remove('show'),2200); }

/* ---------- Жизни (восстановление со временем) ---------- */
function regenHearts(){
  if(S.hearts >= MAX_HEARTS) return;
  const REGEN_MS = 30*60*1000; // 1 жизнь / 30 мин
  if(!S.lastHeartTs) S.lastHeartTs = Date.now();
  const gained = Math.floor((Date.now() - S.lastHeartTs) / REGEN_MS);
  if(gained > 0){
    S.hearts = Math.min(MAX_HEARTS, S.hearts + gained);
    S.lastHeartTs = S.hearts >= MAX_HEARTS ? 0 : S.lastHeartTs + gained*REGEN_MS;
  }
}

/* ---------- День / streak / дневная цель ---------- */
function rollDay(){
  const d = todayStr();
  if(S.todayDate !== d){ S.todayDate = d; S.todayXp = 0; }
}
function addXp(n){
  rollDay();
  S.xp += n; S.todayXp += n;
  if(S.todayXp >= S.dailyGoal) bumpStreakIfGoal();
}
function bumpStreakIfGoal(){
  const d = todayStr();
  if(S.lastDay === d) return;
  const yest = new Date(Date.now()-864e5).toDateString();
  S.streak = (S.lastDay===yest) ? S.streak+1 : 1;
  S.lastDay = d;
}

/* ============================================================
   КАРТОЧКИ / ИНТЕРВАЛЬНОЕ ПОВТОРЕНИЕ (SRS)
   ============================================================ */
function addWordsToDeck(ids){
  let added = 0;
  ids.forEach(id => {
    if(!VOCAB[id]) return;
    if(!S.vocab[id]){
      S.vocab[id] = {box:0, due:today(), reps:0, status:'learning', added:Date.now()};
      added++;
    }
  });
  if(added) toast('📒 +'+added+' слов в карточки');
}
function dueCards(){
  const t = today();
  return Object.keys(S.vocab).filter(id => VOCAB[id] && S.vocab[id].status==='learning' && S.vocab[id].due <= t);
}
function deckStats(){
  let learning=0, learned=0, due=0; const t=today();
  Object.keys(S.vocab).forEach(id=>{
    if(!VOCAB[id]) return;
    const v=S.vocab[id];
    if(v.status==='learned') learned++; else { learning++; if(v.due<=t) due++; }
  });
  return {learning, learned, due, total:learning+learned};
}
function gradeCard(id, ok){
  const v = S.vocab[id]; if(!v) return;
  v.reps++;
  if(ok){
    v.box = Math.min(LEARNED_BOX, v.box+1);
    if(v.box >= LEARNED_BOX){ v.status='learned'; v.due=today()+999; }
    else v.due = today() + SRS_INTERVALS[v.box];
  } else {
    v.box = Math.max(0, v.box-1);
    v.due = today(); // повторим сегодня же
  }
}

/* ============================================================
   НАВИГАЦИЯ ПО ВКЛАДКАМ
   ============================================================ */
const SCREENS = ['learn','cards','write','profile'];
function go(screen){
  SCREENS.forEach(s=>{
    $('#screen-'+s).classList.toggle('hidden', s!==screen);
    $('#tab-'+s).classList.toggle('active', s===screen);
  });
  window.scrollTo(0,0);
  if(screen==='learn') renderPath();
  if(screen==='cards') renderCards();
  if(screen==='write') renderWrite();
  if(screen==='profile') renderProfile();
  refreshHud();
}
function refreshHud(){
  regenHearts();
  $('#hud-streak').textContent = S.streak;
  $('#hud-gems').textContent = S.gems;
  $('#hud-hearts').textContent = S.hearts;
  save();
}

/* ============================================================
   ЭКРАН «УЧЁБА» — путь из юнитов
   ============================================================ */
function allUnits(){
  // объединяем темы и грамматику, фильтруем по активным темам
  const units = [];
  THEMES.forEach(t => { if(S.activeTopics.includes(t.topic)) units.push(t); });
  GRAMMAR.forEach(g => { if(S.activeTopics.includes('grammar')) units.push(g); });
  return units;
}
function lessonKey(ti, li){ return ti+'#'+li; }
function isDone(ti,li){ return !!S.progress[lessonKey(ti,li)]; }
function lessonUnlocked(units, ui, li){
  if(li===0){
    if(ui===0) return true;
    const prev = units[ui-1];
    return prev.lessons.every((_,l)=>S.progress[lessonKey(prev._ti, l)]);
  }
  return isDone(units[ui]._ti, li-1);
}

function renderPath(){
  const units = allUnits();
  // присваиваем стабильный индекс темы
  units.forEach((u,i)=>{ u._ti = THEMES.indexOf(u); if(u._ti<0) u._ti = 1000 + GRAMMAR.indexOf(u); });

  const wrap = $('#path'); wrap.innerHTML = '';
  if(!units.length){ wrap.innerHTML = '<p style="text-align:center;color:#999;margin-top:40px">Выбери темы в Профиле ⚙️</p>'; return; }

  units.forEach((unit, ui)=>{
    const tp = TOPICS[unit.topic];
    const head = document.createElement('div');
    head.className='unit-head'; head.style.background = tp.color; head.style.boxShadow='0 4px 0 rgba(0,0,0,.18)';
    head.innerHTML = `<h2>${tp.emoji} ${unit.title}</h2><p>${unit.lessons.length} ${unit.lessons.length===1?'урок':'уроков'}</p>`;
    wrap.appendChild(head);

    const lessons = document.createElement('div'); lessons.className='lessons';
    unit.lessons.forEach((les, li)=>{
      const done = isDone(unit._ti, li);
      const unlocked = lessonUnlocked(units, ui, li);
      const active = unlocked && !done;
      const row=document.createElement('div'); row.className='row';
      const node=document.createElement('div');
      node.className='node off-'+(li%8)+' '+(done?'done':active?'active':'locked');
      node.innerHTML = done ? '👑' : active ? (les.items[0].type==='info'?'📖':'⭐') : '🔒';
      if(active){ const p=document.createElement('div'); p.className='start-pop'; p.textContent='НАЧАТЬ'; node.appendChild(p); }
      if(unlocked) node.onclick=()=>startLesson(unit._ti, li);
      row.appendChild(node); lessons.appendChild(row);
    });
    wrap.appendChild(lessons);
  });
}

/* ============================================================
   УРОК
   ============================================================ */
let L = null;
function unitByTi(ti){ return ti<1000 ? THEMES[ti] : GRAMMAR[ti-1000]; }

function startLesson(ti, li){
  regenHearts();
  if(S.hearts<=0){ showOver(); return; }
  const unit = unitByTi(ti);
  L = {ti, li, unit, items:unit.lessons[li].items, words:unit.lessons[li].words||[], idx:0, correct:0, scored:0, hearts:S.hearts, answered:false};
  $('#screen-learn').classList.add('hidden');
  $('#tabbar').classList.add('hidden');
  $('#lesson').classList.remove('hidden');
  renderItem();
}
function quitLesson(){ if(confirm('Выйти из урока? Прогресс этого урока не сохранится.')) backFromLesson(); }
function backFromLesson(){
  $('#lesson').classList.add('hidden');
  $('#endScreen').classList.add('hidden');
  $('#overScreen').classList.add('hidden');
  $('#tabbar').classList.remove('hidden');
  go('learn');
}

function renderItem(){
  L.answered=false; L.selection=null;
  $('#lessonHearts').textContent = L.hearts;
  $('#lessonProgress').style.width = (L.idx/L.items.length*100)+'%';
  setFootCheck();
  const it = L.items[L.idx];
  const body = $('#lessonBody'); body.className='lesson-body';

  if(it.type==='info'){
    body.innerHTML = `<div class="info-card"><h2>📖 ${it.title}</h2><div class="info-text">${it.html}</div></div>`;
    $('#lessonFootArea').innerHTML = `<div class="lesson-foot"><button class="check-btn" onclick="nextItem()">Понятно</button></div>`;
    return;
  }
  if(it.type==='choice' || it.type==='listen'){
    const listen = it.type==='listen';
    body.innerHTML =
      `<div class="q-title">${listen?'Что ты услышал?':it.q}</div>`+
      (listen?`<div class="speak-row"><button class="speak-btn" onclick="speak('${it.a}')">🔊</button><span class="muted">Нажми, чтобы прослушать</span></div>`:'')+
      `<div class="choices" id="choices"></div>`;
    if(listen) speak(it.a);
    const box=$('#choices');
    const opts = shuffle([...new Set(it.options)]);
    opts.forEach((opt,i)=>{
      const b=document.createElement('button'); b.className='choice'; b.innerHTML=`<span class="num">${i+1}</span> ${esc(opt)}`;
      b.onclick=()=>{ document.querySelectorAll('#choices .choice').forEach(c=>c.classList.remove('sel')); b.classList.add('sel'); L.selection=opt; enableCheck(); if(!listen) speak(opt); };
      box.appendChild(b);
    });
  }
  else if(it.type==='build'){
    body.innerHTML = `<div class="q-title">${it.q}</div><div class="answer-area" id="answerArea"></div><div class="bank" id="bank"></div>`;
    L.built=[]; const bank=$('#bank');
    shuffle([...it.words]).forEach((w)=>{
      const t=document.createElement('button'); t.className='tile'; t.textContent=w;
      t.onclick=()=>{ if(t.classList.contains('used'))return; t.classList.add('used'); L.built.push({w,el:t}); speak(w); redrawAnswer(); };
      bank.appendChild(t);
    });
  }
  else if(it.type==='match'){
    L.matchSel=null; L.matchDone=0;
    body.innerHTML = `<div class="q-title">${it.q}</div><div class="match-grid"><div class="match-col" id="colL"></div><div class="match-col" id="colR"></div></div>`;
    const left = it.pairs.map((p,i)=>({txt:p[0],id:i,side:'L'}));
    const right= it.pairs.map((p,i)=>({txt:p[1],id:i,side:'R'}));
    fillCol('colL', shuffle(left)); fillCol('colR', shuffle(right));
    $('#lessonFootArea').innerHTML = `<div class="lesson-foot"><button class="check-btn" disabled>Соедини все пары</button></div>`;
  }
}
function fillCol(id, list){
  const col=$('#'+id);
  list.forEach(item=>{ const b=document.createElement('button'); b.className='match-btn'; b.textContent=item.txt; b.dataset.id=item.id; b.dataset.side=item.side; b.onclick=()=>matchClick(b); col.appendChild(b); });
}
function matchClick(b){
  const it=L.items[L.idx];
  if(b.classList.contains('done'))return;
  if(b.dataset.side==='R') speak(b.textContent);
  if(!L.matchSel){ clearSel(); b.classList.add('sel'); L.matchSel=b; return; }
  if(L.matchSel===b){ b.classList.remove('sel'); L.matchSel=null; return; }
  if(L.matchSel.dataset.side===b.dataset.side){ clearSel(); b.classList.add('sel'); L.matchSel=b; return; }
  if(L.matchSel.dataset.id===b.dataset.id){
    L.matchSel.classList.add('done'); b.classList.add('done'); L.matchSel=null; L.matchDone++;
    if(L.matchDone===it.pairs.length){ L.correct++; L.scored++; setTimeout(nextItem,300); }
  } else {
    const a=L.matchSel; a.classList.add('wrong'); b.classList.add('wrong'); L.matchSel=null; loseHeart();
    setTimeout(()=>{ a.classList.remove('wrong','sel'); b.classList.remove('wrong'); },480);
  }
}
function clearSel(){ document.querySelectorAll('.match-btn.sel').forEach(x=>x.classList.remove('sel')); }
function redrawAnswer(){
  const area=$('#answerArea'); area.innerHTML='';
  L.built.forEach((b,i)=>{ const t=document.createElement('button'); t.className='tile'; t.textContent=b.w; t.onclick=()=>{ b.el.classList.remove('used'); L.built.splice(i,1); redrawAnswer(); }; area.appendChild(t); });
  L.built.length?enableCheck():disableCheck();
}
function setFootCheck(){ $('#lessonFootArea').innerHTML = `<div class="lesson-foot"><button class="check-btn" id="checkBtn" onclick="checkAnswer()" disabled>Проверить</button></div>`; }
function enableCheck(){ const b=$('#checkBtn'); if(b) b.disabled=false; }
function disableCheck(){ const b=$('#checkBtn'); if(b) b.disabled=true; }

function checkAnswer(){
  if(L.answered) return;
  const it=L.items[L.idx]; let ok=false;
  if(it.type==='choice'||it.type==='listen') ok = norm(L.selection)===norm(it.a);
  else if(it.type==='build') ok = norm(L.built.map(b=>b.w).join(' '))===norm(it.a);
  L.answered=true; L.scored++;
  if(ok){ L.correct++; } else { loseHeart(); }
  showFeedback(ok, it);
}
function showFeedback(ok, it){
  if(it.type==='choice'||it.type==='listen'){
    document.querySelectorAll('#choices .choice').forEach(c=>{
      const txt=c.textContent.replace(/^\s*\d+\s*/,'').trim();
      if(norm(txt)===norm(it.a)) c.classList.add('correct');
      else if(c.classList.contains('sel')) c.classList.add('wrong');
    });
  }
  if(!ok){ $('#lessonBody').classList.add('shake'); setTimeout(()=>$('#lessonBody').classList.remove('shake'),420); }
  const fb=document.createElement('div'); fb.className='feedback '+(ok?'ok':'no');
  fb.innerHTML = ok ? `<h3>✅ Отлично!</h3><p>${esc(it.a)}</p>` : `<h3>❌ Правильный ответ:</h3><p>${esc(it.a)}</p>`;
  const cont=document.createElement('button'); cont.className='check-btn continue-btn '+(ok?'':'no'); cont.textContent='Продолжить';
  cont.onclick=()=>{ if(L.hearts<=0){ S.hearts=0; S.lastHeartTs=Date.now(); save(); showOver(); return;} nextItem(); };
  fb.appendChild(cont);
  $('#lessonFootArea').innerHTML=''; $('#lessonFootArea').appendChild(fb);
  if(ok) speak(it.a);
}
function loseHeart(){ L.hearts=Math.max(0,L.hearts-1); $('#lessonHearts').textContent=L.hearts; }
function nextItem(){ L.idx++; if(L.idx>=L.items.length){ finishLesson(); return; } renderItem(); }

function finishLesson(){
  $('#lessonProgress').style.width='100%';
  const acc = L.scored ? Math.round(L.correct/L.scored*100) : 100;
  const xp = 10 + L.correct*2;
  S.progress[lessonKey(L.ti,L.li)] = true;
  S.gems += 5;
  S.hearts = L.hearts; if(L.hearts<MAX_HEARTS && !S.lastHeartTs) S.lastHeartTs=Date.now();
  addXp(xp);
  if(L.words && L.words.length) addWordsToDeck(L.words);
  save();
  $('#endXp').textContent='+'+xp;
  $('#endAcc').textContent=acc+'%';
  $('#endWords').textContent = (L.words&&L.words.length)?('+'+L.words.length):'0';
  $('#lesson').classList.add('hidden');
  $('#endScreen').classList.remove('hidden');
}
function showOver(){ $('#lesson').classList.add('hidden'); $('#overScreen').classList.remove('hidden'); }

/* ============================================================
   ЭКРАН «КАРТОЧКИ»
   ============================================================ */
function renderCards(){
  const st=deckStats();
  $('#cardsStats').innerHTML =
    `<div class="stat-box"><div class="v">${st.due}</div><div class="l">К повторению</div></div>`+
    `<div class="stat-box"><div class="v">${st.learning}</div><div class="l">Учу</div></div>`+
    `<div class="stat-box green"><div class="v">${st.learned}</div><div class="l">Выучено</div></div>`;
  const area=$('#cardsArea');
  if(st.total===0){ area.innerHTML='<p class="muted center">Слова появятся здесь после прохождения уроков 📚</p>'; return; }
  if(st.due===0){ area.innerHTML='<div class="all-done">🎉<p>На сегодня всё повторено!</p><span class="muted">Возвращайся завтра или пройди новый урок.</span></div>'+wordListHtml(); return; }
  area.innerHTML = `<button class="big-cta" onclick="startReview()">▶︎ Повторить ${st.due} ${plural(st.due,'слово','слова','слов')}</button>`+wordListHtml();
}
function plural(n,a,b,c){ const m=n%100; if(m>=11&&m<=14)return c; const e=n%10; if(e===1)return a; if(e>=2&&e<=4)return b; return c; }
function wordListHtml(){
  const ids=Object.keys(S.vocab).filter(id=>VOCAB[id]);
  if(!ids.length) return '';
  ids.sort((a,b)=> S.vocab[a].status===S.vocab[b].status ? 0 : S.vocab[a].status==='learning'?-1:1);
  let h='<h3 class="sec">Мои слова</h3><div class="wordlist">';
  ids.forEach(id=>{ const v=S.vocab[id], w=VOCAB[id]; const pct=Math.round(v.box/LEARNED_BOX*100);
    h+=`<div class="wordrow"><div><b>${esc(w.en)}</b> — ${esc(w.ru)}</div>`+
       (v.status==='learned'?`<span class="badge green">✓ выучено</span>`:`<div class="mini-bar"><div style="width:${pct}%"></div></div>`)+`</div>`; });
  return h+'</div>';
}

let R=null;
function startReview(){
  const q=dueCards(); if(!q.length){ renderCards(); return; }
  R={queue:shuffle(q), idx:0, correct:0, total:0};
  $('#screen-cards').classList.add('hidden'); $('#tabbar').classList.add('hidden');
  $('#review').classList.remove('hidden');
  nextReview();
}
function nextReview(){
  if(R.idx>=R.queue.length){ endReview(); return; }
  const id=R.queue[R.idx]; const w=VOCAB[id];
  const fromEn = Math.random()<0.5;
  const prompt = fromEn ? w.en : w.ru;
  const answer = fromEn ? w.ru : w.en;
  // дистракторы
  const pool=Object.keys(VOCAB).filter(x=>x!==id);
  const distract=shuffle(pool).slice(0,3).map(x=> fromEn?VOCAB[x].ru:VOCAB[x].en);
  const options=shuffle([answer,...distract]);
  $('#reviewProgress').style.width=(R.idx/R.queue.length*100)+'%';
  const body=$('#reviewBody');
  body.innerHTML=
    `<div class="card-face">${fromEn?'🔊 ':''}${esc(prompt)}`+
    (fromEn?` <button class="speak-inline" onclick="speak('${w.en}')">▶︎</button>`:'')+`</div>`+
    `<div class="card-ex muted">${esc(w.ex)}</div>`+
    `<div class="choices" id="rChoices"></div>`;
  if(fromEn) speak(w.en);
  const box=$('#rChoices');
  options.forEach(opt=>{ const b=document.createElement('button'); b.className='choice'; b.textContent=opt;
    b.onclick=()=>answerReview(id,opt,answer,b,fromEn,w); box.appendChild(b); });
}
function answerReview(id,opt,answer,btn,fromEn,w){
  const ok=norm(opt)===norm(answer);
  R.total++; if(ok)R.correct++;
  gradeCard(id, ok);
  document.querySelectorAll('#rChoices .choice').forEach(c=>{ c.style.pointerEvents='none';
    if(norm(c.textContent)===norm(answer)) c.classList.add('correct'); else if(c===btn) c.classList.add('wrong'); });
  if(!fromEn) speak(w.en);
  save();
  setTimeout(()=>{ R.idx++; nextReview(); }, ok?600:1100);
}
function endReview(){
  $('#reviewProgress').style.width='100%';
  addXp(5);
  save();
  $('#review').classList.add('hidden'); $('#tabbar').classList.remove('hidden');
  toast(`Повторено ${R.total}, верно ${R.correct} ✅`);
  go('cards');
}
function quitReview(){ $('#review').classList.add('hidden'); $('#tabbar').classList.remove('hidden'); go('cards'); }

/* ============================================================
   ЭКРАН «ПИСЬМО» — ИИ-учитель
   ============================================================ */
let curPrompt=null;
function renderWrite(){
  const prompts=WRITING_PROMPTS.filter(p=>S.activeTopics.includes(p.topic) && (p.level===S.level||S.level==='B1'));
  const list=prompts.length?prompts:WRITING_PROMPTS;
  if(!curPrompt || !list.includes(curPrompt)) curPrompt=list[Math.floor(Math.random()*list.length)];
  const tp=TOPICS[curPrompt.topic];
  $('#screen-write').innerHTML = `
    <div class="write-card">
      <div class="write-top"><span class="badge" style="background:${tp.color}">${tp.emoji} ${tp.title} · ${curPrompt.level}</span>
        <button class="link-btn" onclick="newPrompt()">↻ другое задание</button></div>
      <div class="write-task">${esc(curPrompt.ru)}</div>
      ${curPrompt.hint?`<div class="muted small">💡 ${esc(curPrompt.hint)}</div>`:''}
      <textarea id="writeText" placeholder="Напиши свой ответ на английском..."></textarea>
      <button class="check-btn" id="writeBtn" onclick="checkWriting()">Проверить у учителя</button>
      <div id="writeResult"></div>
    </div>
    ${writeHistoryHtml()}`;
}
function newPrompt(){ curPrompt=null; renderWrite(); }
function writeHistoryHtml(){
  if(!S.writing.length) return '';
  let h='<h3 class="sec">История проверок</h3>';
  S.writing.slice(-5).reverse().forEach(w=>{
    h+=`<div class="hist"><div class="muted small">${esc(w.date)} · оценка ${w.score??'—'}/100</div><div class="hist-text">${esc(w.text)}</div></div>`;
  });
  return h;
}

async function checkWriting(){
  const text=$('#writeText').value.trim();
  if(text.length<3){ toast('Напиши хотя бы предложение ✍️'); return; }
  const btn=$('#writeBtn'); const res=$('#writeResult');
  if(!S.apiUrl){
    res.innerHTML = `<div class="feedback no" style="border-radius:14px;margin-top:14px">
      <h3>🔌 ИИ-учитель ещё не подключён</h3>
      <p>Чтобы проверять письмо с живыми комментариями, нужно настроить ИИ-сервер. Открой Профиль → «ИИ-учитель» и следуй инструкции. А пока — продолжай уроки и карточки!</p></div>`;
    return;
  }
  btn.disabled=true; btn.textContent='Учитель проверяет…';
  res.innerHTML='<div class="muted center" style="margin-top:14px">⏳ Проверяю…</div>';
  try{
    const r=await fetch(S.apiUrl,{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({text, task:curPrompt.ru, level:curPrompt.level})});
    if(!r.ok) throw new Error('HTTP '+r.status);
    const data=await r.json();
    renderWritingFeedback(data, text);
    S.writing.push({date:new Date().toLocaleDateString('ru-RU'), text, score:data.score, topic:curPrompt.topic});
    if(S.writing.length>50) S.writing=S.writing.slice(-50);
    addXp(8); save();
  }catch(e){
    res.innerHTML=`<div class="feedback no" style="border-radius:14px;margin-top:14px"><h3>Не получилось связаться с учителем</h3><p>${esc(e.message)}. Проверь адрес ИИ-сервера в Профиле.</p></div>`;
  }finally{ btn.disabled=false; btn.textContent='Проверить у учителя'; }
}
function renderWritingFeedback(d, original){
  const res=$('#writeResult');
  let mistakes='';
  if(Array.isArray(d.mistakes) && d.mistakes.length){
    mistakes='<h4>Разбор ошибок</h4><ul class="mistakes">'+d.mistakes.map(m=>
      `<li><span class="wrong-t">${esc(m.wrong||'')}</span> → <span class="right-t">${esc(m.right||'')}</span>${m.why?`<br><span class="muted small">${esc(m.why)}</span>`:''}</li>`).join('')+'</ul>';
  }
  res.innerHTML=`<div class="teacher-card">
    <div class="score-row"><div class="score-big">${d.score??'—'}<span>/100</span></div><div class="muted">${esc(d.summary||'')}</div></div>
    ${d.corrected?`<h4>Исправленный вариант</h4><div class="corrected">${esc(d.corrected)} <button class="speak-inline" onclick="speak(${JSON.stringify(d.corrected)})">▶︎</button></div>`:''}
    ${mistakes}
    ${d.encouragement?`<div class="encourage">💬 ${esc(d.encouragement)}</div>`:''}
  </div>`;
}

/* ============================================================
   ЭКРАН «ПРОФИЛЬ / НАСТРОЙКИ»
   ============================================================ */
function renderProfile(){
  const st=deckStats();
  const topicsHtml=Object.keys(TOPICS).map(k=>{
    const on=S.activeTopics.includes(k);
    return `<button class="chip ${on?'on':''}" onclick="toggleTopic('${k}')">${TOPICS[k].emoji} ${TOPICS[k].title}</button>`;
  }).join('');
  $('#screen-profile').innerHTML=`
    <div class="prof-stats">
      <div class="stat-box"><div class="v">🔥 ${S.streak}</div><div class="l">дней подряд</div></div>
      <div class="stat-box"><div class="v">⭐ ${S.xp}</div><div class="l">всего XP</div></div>
      <div class="stat-box green"><div class="v">${st.learned}</div><div class="l">слов выучено</div></div>
    </div>

    <h3 class="sec">Уровень</h3>
    <div class="seg">
      <button class="${S.level==='A2'?'on':''}" onclick="setLevel('A2')">A2</button>
      <button class="${S.level==='B1'?'on':''}" onclick="setLevel('B1')">B1</button>
    </div>

    <h3 class="sec">Темы для занятий</h3>
    <div class="chips">${topicsHtml}</div>

    <h3 class="sec">Дневная цель</h3>
    <div class="seg">
      ${[20,30,50].map(g=>`<button class="${S.dailyGoal===g?'on':''}" onclick="setGoal(${g})">${g} XP</button>`).join('')}
    </div>
    <p class="muted small">Сегодня: ${S.todayXp}/${S.dailyGoal} XP</p>

    <h3 class="sec">Напоминания</h3>
    <label class="row-line"><span>Напоминать заниматься</span>
      <input type="checkbox" id="notifToggle" ${S.notify?'checked':''} onchange="toggleNotify(this.checked)"></label>
    <label class="row-line"><span>Время</span>
      <input type="time" id="reminderTime" value="${S.reminderTime}" onchange="setReminder(this.value)"></label>
    <p class="muted small">⚠️ На iPhone уведомления приходят, только если приложение установлено на экран «Домой» и открывалось хотя бы раз за день.</p>

    <h3 class="sec">ИИ-учитель (проверка письма)</h3>
    <p class="muted small">Вставь адрес ИИ-сервера (мы настроим его вместе). Без него работают все функции, кроме проверки письма.</p>
    <input type="text" id="apiUrl" class="text-input" placeholder="https://...workers.dev" value="${esc(S.apiUrl)}">
    <button class="sec-btn" onclick="saveApiUrl()">Сохранить адрес</button>
    <button class="sec-btn ghost" onclick="testApi()">Проверить связь</button>

    <h3 class="sec">Прочее</h3>
    <button class="sec-btn danger" onclick="resetAll()">Сбросить весь прогресс</button>
    <p class="muted small center" style="margin-top:24px">Lingo · персональный учитель английского 💚</p>
  `;
}
function toggleTopic(k){
  const i=S.activeTopics.indexOf(k);
  if(i>=0){ if(S.activeTopics.length>1) S.activeTopics.splice(i,1); else { toast('Оставь хотя бы одну тему'); return; } }
  else S.activeTopics.push(k);
  save(); renderProfile();
}
function setLevel(l){ S.level=l; save(); renderProfile(); }
function setGoal(g){ S.dailyGoal=g; save(); renderProfile(); }
function setReminder(v){ S.reminderTime=v; save(); scheduleReminder(); }
function saveApiUrl(){ S.apiUrl=$('#apiUrl').value.trim(); save(); toast('Адрес сохранён ✅'); }
async function testApi(){
  if(!$('#apiUrl').value.trim()){ toast('Сначала вставь адрес'); return; }
  S.apiUrl=$('#apiUrl').value.trim(); save();
  toast('Проверяю связь…');
  try{
    const r=await fetch(S.apiUrl,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:'I goed to school.',task:'test',level:'A2'})});
    const d=await r.json();
    toast(d && d.score!=null ? '✅ Учитель отвечает!' : '⚠️ Ответ получен, но формат странный');
  }catch(e){ toast('❌ Нет связи: '+e.message); }
}
function resetAll(){ if(confirm('Точно сбросить ВЕСЬ прогресс (слова, уроки, историю)?')){ localStorage.removeItem('lingo2'); S=JSON.parse(JSON.stringify(DEFAULT_STATE)); save(); go('learn'); toast('Прогресс сброшен'); } }

/* ============================================================
   НАПОМИНАНИЯ
   ============================================================ */
async function toggleNotify(on){
  if(on){
    if(!('Notification' in window)){ toast('Уведомления не поддерживаются'); S.notify=false; renderProfile(); return; }
    const perm=await Notification.requestPermission();
    if(perm!=='granted'){ toast('Уведомления не разрешены'); S.notify=false; renderProfile(); return; }
    S.notify=true; toast('Напоминания включены 🔔'); scheduleReminder();
  } else { S.notify=false; }
  save();
}
let reminderTimer=null;
function scheduleReminder(){
  clearTimeout(reminderTimer);
  if(!S.notify) return;
  const [h,m]=S.reminderTime.split(':').map(Number);
  const now=new Date(); const target=new Date(); target.setHours(h,m,0,0);
  if(target<=now) target.setTime(target.getTime()+864e5);
  reminderTimer=setTimeout(()=>{
    rollDay();
    if(S.todayXp < S.dailyGoal && Notification.permission==='granted'){
      try{ new Notification('Lingo — пора заниматься! 🇬🇧', {body:'Повтори слова и пройди урок. Сохрани свой 🔥 streak!', icon:'icon-192.png'}); }catch(e){}
    }
    scheduleReminder();
  }, target-now);
}

/* ============================================================
   СТАРТ
   ============================================================ */
function init(){
  rollDay(); regenHearts();
  // если новый день и цель не достигнута — streak не сбрасываем сразу, но проверим разрыв
  go('learn');
  scheduleReminder();
  if('serviceWorker' in navigator){ window.addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{})); }
}
init();
