const homeView = document.getElementById('homeView');
const panelView = document.getElementById('panelView');
const panelTitle = document.getElementById('panelTitle');
const panelContent = document.getElementById('panelContent');

let store = { flashAnzan:0, speedMath:0, letterCode:0, flashAlpha:0, elementQuiz:0, morseCode:0, angleTable:0, pythTriples:0 };
try{
  const saved = localStorage.getItem('brainstudio-scores');
  if(saved) store = Object.assign(store, JSON.parse(saved));
}catch(e){}
function saveStore(){ try{ localStorage.setItem('brainstudio-scores', JSON.stringify(store)); }catch(e){} }
function refreshBadges(){
  document.getElementById('score-flashAnzan').innerText = store.flashAnzan || '--';
  document.getElementById('score-speedMath').innerText = store.speedMath || 0;
  document.getElementById('score-letterCode').innerText = store.letterCode || 0;
  document.getElementById('score-flashAlpha').innerText = store.flashAlpha || '--';
  document.getElementById('score-elementQuiz').innerText = store.elementQuiz || 0;
  document.getElementById('score-morseCode').innerText = store.morseCode || 0;
  document.getElementById('score-angleTable').innerText = store.angleTable || 0;
  document.getElementById('score-pythTriples').innerText = store.pythTriples || 0;

  // ---- Extend badges: surface each game's best timed-session accuracy as a tooltip ----
  const accHints = {
    speedMath:'speedMathBestAccuracy', letterCode:'letterCodeBestAccuracy',
    flashAlpha:'flashAlphaBestAccuracy', elementQuiz:'elementQuizBestAccuracy', morseCode:'morseCodeBestAccuracy',
    angleTable:'angleTableBestAccuracy', pythTriples:'pythTriplesBestAccuracy'
  };
  Object.keys(accHints).forEach(key=>{
    const el = document.getElementById('score-'+key);
    const acc = store[accHints[key]];
    if(el && acc!=null) el.title = 'Best session accuracy: '+acc+'%';
  });
}
refreshBadges();

function navigateToHome(){
  window.morseActive = false;
  endSession();
  panelView.classList.add('hidden');
  homeView.style.display = 'grid';
}
function openGameSetup(type){
  homeView.style.display = 'none';
  panelView.classList.remove('hidden');
  if(type==='flashAnzan') renderFlashAnzanSetup();
  if(type==='speedMath') renderSpeedMathSetup();
  if(type==='letterCode') renderLetterCodeSetup();
  if(type==='flashAlpha') renderFlashAlphaSetup();
  if(type==='elementQuiz') renderElementQuizSetup();
  if(type==='morseCode') renderMorseCodeSetup();
  if(type==='angleTable') renderAngleTableSetup();
  if(type==='pythTriples') renderPythTriplesSetup();
}

/* ---- shared chip helpers ---- */
function chipRow(name, opts, active, cls){
  return `<div class="chips">${opts.map(o=>`<button type="button" class="chip ${cls}${o.v===active?' active':''}" onclick="setOpt('${name}','${o.v}',this)">${o.label}</button>`).join('')}</div>`;
}
function setOpt(name, val, el){
  window[name] = isNaN(val) ? val : Number(val);
  el.parentElement.querySelectorAll('.chip').forEach(c=>c.classList.remove('active'));
  el.classList.add('active');
}
function multiChipRow(name, opts, cls){
  const active = window[name] || [];
  return `<div class="chips">${opts.map(o=>`<button type="button" class="chip ${cls}${active.includes(o.v)?' active':''}" onclick="toggleOpt('${name}','${o.v}',this)">${o.label}</button>`).join('')}</div>`;
}
function toggleOpt(name, val, el){
  let arr = window[name] || [];
  if(arr.includes(val)){
    if(arr.length>1){ arr = arr.filter(v=>v!==val); el.classList.remove('active'); }
  } else {
    arr = [...arr, val]; el.classList.add('active');
  }
  window[name] = arr;
}
// Shared "time limit" chip row (0 = Off). Reused by Flash Letter Sum, Letter Coding,
// Morse Code, Element Quiz and Speed Math so every game presents the same control.
function timeLimitChipRow(name, durationsInSeconds, active, cls){
  const labels = {0:'Off',60:'1 min',120:'2 min',180:'3 min'};
  const opts = durationsInSeconds.map(d=>({v:d, label:labels[d] || (d+'s')}));
  return chipRow(name, opts, active, cls);
}
// Shared numeric chip row for ranges like word length / item counts (e.g. 1..10).
function numberChipRow(name, min, max, active, cls){
  const opts = [];
  for(let i=min;i<=max;i++) opts.push({v:i, label:String(i)});
  return chipRow(name, opts, active, cls);
}

/* ================= SESSION ENGINE (shared continuous-timed-mode system) =================
   Any game with a "time limit" option other than Off uses this. It runs a countdown,
   silently logs every question/answer, tracks streaks & accuracy, and hands off to the
   shared Session Summary screen when time runs out. */
window.session = null;

function startSession(gameKey, seconds, onTimeout){
  window.session = {
    gameKey, seconds, remaining: seconds,
    correct: 0, wrong: 0, streak: 0, bestStreak: 0,
    log: [], timerId: null
  };
  window.session.timerId = setInterval(()=>{
    if(!window.session) return;
    window.session.remaining--;
    const label = document.getElementById('sessionTimerLabel');
    if(label) label.innerText = 'Time left: '+window.session.remaining+'s';
    if(window.session.remaining<=0){
      clearInterval(window.session.timerId);
      onTimeout();
    }
  },1000);
}
function endSession(){
  if(window.session && window.session.timerId) clearInterval(window.session.timerId);
  window.session = null;
}
// Logs one answered question against the active session and updates streak/accuracy tallies.
function sessionRecordAnswer(prompt, userAnswer, correctAnswer, ok){
  const s = window.session;
  if(!s) return;
  const userDisplay = (userAnswer===''||userAnswer==null||Number.isNaN(userAnswer)) ? '(blank)' : userAnswer;
  s.log.push({prompt, userAnswer:userDisplay, correctAnswer, ok});
  if(ok){ s.correct++; s.streak++; if(s.streak>s.bestStreak) s.bestStreak = s.streak; }
  else { s.wrong++; s.streak = 0; }
}
// Countdown label shown at the top of the play area whenever a timed session is running.
function sessionTimerHtml(){
  if(!window.session) return '';
  return `<div class="opt-label session-timer" id="sessionTimerLabel">Time left: ${window.session.remaining}s</div>`;
}
// Brief 200ms visual feedback (border flash) on an element, used instead of a full result screen.
function flashFeedback(el, ok){
  if(!el) return;
  const cls = ok ? 'flash-ok' : 'flash-no';
  el.classList.add(cls);
  setTimeout(()=>el.classList.remove(cls), 200);
}
// Persists new bests for a game's timed sessions, keeping the legacy `store[gameKey]` badge in sync.
function saveSessionBests(gameKey, bestStreak, accuracy){
  const streakKey = gameKey+'BestStreak', accKey = gameKey+'BestAccuracy';
  if(bestStreak > (store[streakKey]||0)) store[streakKey] = bestStreak;
  if(accuracy > (store[accKey]||0)) store[accKey] = accuracy;
  if(bestStreak > (store[gameKey]||0)) store[gameKey] = bestStreak;
  saveStore(); refreshBadges();
}
// Shared end-of-session screen: totals, accuracy, streaks, and a full per-question log.
// replayFnName is the name (string) of the game's start function, e.g. "startSpeedMath".
function showSessionSummary(cls, title, replayFnName){
  const s = window.session;
  if(!s){ navigateToHome(); return; }
  const total = s.correct + s.wrong;
  const acc = total ? Math.round((s.correct/total)*100) : 0;
  saveSessionBests(s.gameKey, s.bestStreak, acc);
  const rows = s.log.map((q,i)=>`
    <div class="summary-row ${q.ok?'ok':'no'}">
      <span class="summary-q">Q${i+1}: ${q.prompt}</span>
      <span class="summary-a">${q.userAnswer} → ${q.correctAnswer} ${q.ok?'✓':'✗'}</span>
    </div>`).join('');
  panelTitle.innerText = title;
  panelContent.innerHTML = `
    <div class="summary ${cls}">
      <h2>Session Summary</h2>
      <div class="summary-stats">
        <div><b>${total}</b><span>Attempted</span></div>
        <div><b>${s.correct}</b><span>Correct</span></div>
        <div><b>${s.wrong}</b><span>Wrong</span></div>
        <div><b>${acc}%</b><span>Accuracy</span></div>
        <div><b>${s.streak}</b><span>Streak</span></div>
        <div><b>${s.bestStreak}</b><span>Best streak</span></div>
      </div>
      <div class="summary-list">${rows || '<p class="hint">No questions answered.</p>'}</div>
      <div>
        <button class="primary-btn ${cls}" onclick="${replayFnName}()">Play again</button>
        <button class="back-btn" onclick="navigateToHome()">Back to menu</button>
      </div>
    </div>`;
  endSession();
}

/* ================= FLASH ANZAN ================= */
window.anzanDigits = 2; window.anzanCount = 7; window.anzanSpeed = 2000; window.anzanOp = 'add';
function renderFlashAnzanSetup(){
  panelTitle.innerText = '🧠 Flash Anzan';
  panelContent.innerHTML = `
    <div class="opt-group"><div class="opt-label">Digit size</div>
      ${chipRow('anzanDigits',[{v:1,label:'1 digit'},{v:2,label:'2 digit'},{v:3,label:'3 digit'}],anzanDigits,'flash-anzan')}</div>
    <div class="opt-group"><div class="opt-label">How many numbers</div>
      ${numberChipRow('anzanCount',1,10,anzanCount,'flash-anzan')}
      <input class="field" type="number" id="anzanCountCustom" min="11" max="20" placeholder="11-20"
        style="width:100px;padding:8px;font-size:14px;margin-top:8px;"
        oninput="if(this.value){window.anzanCount=Math.min(20,Math.max(11,Number(this.value)));this.closest('.opt-group').querySelectorAll('.chip').forEach(c=>c.classList.remove('active'));}">
    </div>
    <div class="opt-group"><div class="opt-label">Flash speed (milliseconds)</div>
      <input class="field" type="number" id="anzanSpeedInput" value="${window.anzanSpeed}" min="100" max="5000" step="50" oninput="window.anzanSpeed = Number(this.value)" style="width: 140px; padding: 10px; font-size: 16px;">
    </div>
    <div class="opt-group"><div class="opt-label">Operation</div>
      ${chipRow('anzanOp',[{v:'add',label:'Addition only'},{v:'mixed',label:'Addition & subtraction'}],anzanOp,'flash-anzan')}</div>
    <button class="primary-btn flash-anzan" onclick="startFlashAnzan()">Start</button>
  `;
}
function startFlashAnzan(){
  panelTitle.innerText = '🧠 Flash Anzan';
  const range = window.anzanDigits===1?[1,9]:window.anzanDigits===2?[10,99]:[100,999];
  const numbers = [];
  for(let i=0;i<window.anzanCount;i++){
    let n = Math.floor(Math.random()*(range[1]-range[0]+1))+range[0];
    if(window.anzanOp==='mixed' && i>0 && Math.random()<0.5) n = -n;
    numbers.push(n);
  }
  window.anzanNumbers = numbers; window.anzanIndex = 0;
  panelContent.innerHTML = `
    <div class="stage"><div class="flash" id="anzanFlash">Ready?</div>
    <button class="primary-btn flash-anzan" onclick="showNextAnzanNumber()">Begin</button></div>`;
}
function showNextAnzanNumber(){
  if(window.anzanIndex >= window.anzanNumbers.length){
    const answer = window.anzanNumbers.reduce((a,b)=>a+b,0);
    panelContent.innerHTML = `
      <div class="stage"><p class="opt-label">What was the total?</p>
      <input class="field" id="anzanAnswer" type="number" autofocus>
      <div><button class="primary-btn flash-anzan" onclick="checkFlashAnzan(${answer})">Submit</button></div></div>`;
    return;
  }
  const display = document.getElementById('anzanFlash');
  const n = window.anzanNumbers[window.anzanIndex];
  display.innerText = (window.anzanOp==='mixed' && n>=0 ? '+' : '') + n;
  window.anzanIndex++;
  setTimeout(()=>{ if(display) display.innerText=''; setTimeout(showNextAnzanNumber, window.anzanSpeed*0.4); }, window.anzanSpeed);
}
// Flash Anzan has no timed session — instead every round ends with a small round summary
// listing all the flashed numbers alongside the correct total.
function checkFlashAnzan(correct){
  const val = Number(document.getElementById('anzanAnswer').value);
  const ok = val === correct;
  if(ok){ store.flashAnzan = Math.max(store.flashAnzan, window.anzanCount); saveStore(); refreshBadges(); }
  const numbersStr = window.anzanNumbers.map(n => (window.anzanOp==='mixed' && n>=0 ? '+'+n : n)).join('  ');
  panelContent.innerHTML = `
    <div class="result ${ok?'ok':'no'}">
      <h2>${ok?'🎉 Correct!':'❌ Answer: '+correct}</h2>
      <p>${ok?'Nice mental math.':'So close — try again.'}</p>
      <div class="summary-list" style="margin:16px 0;">
        <div class="summary-row"><span class="summary-q">Numbers flashed</span><span class="summary-a">${numbersStr}</span></div>
        <div class="summary-row ${ok?'ok':'no'}"><span class="summary-q">Your answer</span><span class="summary-a">${val} → ${correct} ${ok?'✓':'✗'}</span></div>
      </div>
      <button class="primary-btn flash-anzan" onclick="startFlashAnzan()">${ok?'Next round':'Try again'}</button>
    </div>`;
}

/* ================= SPEED MATH ================= */
// speedTimeLimit is a session length in seconds (0 = Off), replacing the old per-question countdown.
window.speedOp = 'mixed'; window.speedDiff = 'easy'; window.speedTimeLimit = 60; window.speedStreak = 0;
function renderSpeedMathSetup(){
  window.speedStreak = 0;
  panelTitle.innerText = '⚡ Speed Math';
  panelContent.innerHTML = `
    <div class="opt-group"><div class="opt-label">Operation</div>
      ${chipRow('speedOp',[{v:'add',label:'+'},{v:'sub',label:'−'},{v:'mul',label:'×'},{v:'mixed',label:'Mixed'}],speedOp,'speed-math')}</div>
    <div class="opt-group"><div class="opt-label">Difficulty</div>
      ${chipRow('speedDiff',[{v:'easy',label:'Easy'},{v:'medium',label:'Medium'},{v:'hard',label:'Hard'}],speedDiff,'speed-math')}</div>
    <div class="opt-group"><div class="opt-label">Time limit</div>
      ${timeLimitChipRow('speedTimeLimit',[0,60,120],speedTimeLimit,'speed-math')}</div>
    <button class="primary-btn speed-math" onclick="startSpeedMath()">Start</button>
  `;
}
function genSpeedQuestion(){
  const cap = window.speedDiff==='easy'?20:window.speedDiff==='medium'?50:100;
  const ops = window.speedOp==='mixed' ? ['add','sub','mul'] : [window.speedOp];
  const op = ops[Math.floor(Math.random()*ops.length)];
  let a = Math.floor(Math.random()*cap)+1, b = Math.floor(Math.random()*cap)+1;
  let symbol='+', answer;
  if(op==='add'){ answer=a+b; symbol='+'; }
  if(op==='sub'){ if(b>a)[a,b]=[b,a]; answer=a-b; symbol='−'; }
  if(op==='mul'){ b = Math.floor(Math.random()*12)+1; answer=a*b; symbol='×'; }
  return { prompt: `${a} ${symbol} ${b} = ?`, answer };
}
function startSpeedMath(){
  panelTitle.innerText = '⚡ Speed Math';
  if(window.speedTimeLimit>0 && !window.session){
    startSession('speedMath', window.speedTimeLimit, ()=> showSessionSummary('speed-math','⚡ Speed Math','startSpeedMath'));
  }
  renderSpeedMathQuestion();
}
function renderSpeedMathQuestion(){
  const q = genSpeedQuestion();
  window.speedAnswer = q.answer; window.speedPrompt = q.prompt;
  panelContent.innerHTML = `
    <div class="stage">${sessionTimerHtml()}<div class="prompt">${q.prompt}</div>
    <input class="field" id="speedAnswerInput" type="number" autofocus>
    <div><button class="primary-btn speed-math" onclick="checkSpeedMath()">Submit</button></div></div>`;
}
function checkSpeedMath(){
  const inputEl = document.getElementById('speedAnswerInput');
  const val = Number(inputEl.value);
  const ok = val === window.speedAnswer;

  if(window.session){
    // Timed mode: log the answer, flash the border, then auto-advance — no result screen.
    sessionRecordAnswer(window.speedPrompt, val, window.speedAnswer, ok);
    flashFeedback(inputEl, ok);
    setTimeout(()=>{ if(window.session) renderSpeedMathQuestion(); }, 200);
    return;
  }

  window.speedStreak = ok ? window.speedStreak+1 : 0;
  if(ok && window.speedStreak > (store.speedMath||0)){ store.speedMath = window.speedStreak; saveStore(); refreshBadges(); }
  panelContent.innerHTML = `
    <div class="result ${ok?'ok':'no'}">
      <h2>${ok?'🎉 Correct!':'❌ Wrong'}</h2>
      <p>${ok?'Streak going strong.':'Correct answer: '+window.speedAnswer}</p>
      <button class="primary-btn speed-math" onclick="startSpeedMath()">Next question</button>
      <div class="streak">Current streak: <b>${window.speedStreak}</b></div>
    </div>`;
}

/* ================= LETTER CODING ================= */
// letterSet restricts which letters get used; letterTimeLimit (seconds, 0 = Off) drives timed mode.
window.letterLen = 1; window.letterDir = 'l2n'; window.letterStreak = 0;
window.letterSet = 'all'; window.letterTimeLimit = 0;
const LETTER_SETS = { ai:'ABCDEFGHI', jr:'JKLMNOPQR', sz:'STUVWXYZ', all:'ABCDEFGHIJKLMNOPQRSTUVWXYZ' };

function renderLetterCodeSetup(){
  window.letterStreak = 0;
  panelTitle.innerText = '🔤 Letter Coding';
  panelContent.innerHTML = `
    <div class="opt-group"><div class="opt-label">Letter set</div>
      ${chipRow('letterSet',[{v:'ai',label:'A–I'},{v:'jr',label:'J–R'},{v:'sz',label:'S–Z'},{v:'all',label:'All letters'}],letterSet,'letter-code')}</div>
    <div class="opt-group"><div class="opt-label">Word length</div>
      ${numberChipRow('letterLen',1,10,letterLen,'letter-code')}</div>
    <div class="opt-group"><div class="opt-label">Direction</div>
      ${chipRow('letterDir',[{v:'l2n',label:'Letters → Numbers'},{v:'n2l',label:'Numbers → Letters'}],letterDir,'letter-code')}</div>
    <div class="opt-group"><div class="opt-label">Time limit</div>
      ${timeLimitChipRow('letterTimeLimit',[0,60,120],letterTimeLimit,'letter-code')}</div>
    <button class="primary-btn letter-code" onclick="startLetterCode()">Start</button>
  `;
}
function startLetterCode(){
  panelTitle.innerText = '🔤 Letter Coding';
  if(window.letterTimeLimit>0 && !window.session){
    startSession('letterCode', window.letterTimeLimit, ()=> showSessionSummary('letter-code','🔤 Letter Coding','startLetterCode'));
  }
  const alphabet = LETTER_SETS[window.letterSet] || LETTER_SETS.all;
  let word = '';
  for(let i=0;i<window.letterLen;i++) word += alphabet[Math.floor(Math.random()*alphabet.length)];
  window.letterWord = word;
  const timerHtml = sessionTimerHtml();
  if(window.letterDir==='l2n'){
    panelContent.innerHTML = `
      <div class="stage">${timerHtml}
        <div class="prompt">${word}</div>
        <p class="opt-label">Type the corresponding numbers · A = 1, B = 2 … Z = 26</p>
        <input class="field" id="letterAnswer" placeholder="e.g. 1 2 3" autofocus>
        <div><button class="primary-btn letter-code" onclick="checkLetterCode()">Submit</button></div>
      </div>`;
  } else {
    const numbers = [...word].map(l=>l.charCodeAt(0)-64);
    window.letterPromptNumbers = numbers;
    panelContent.innerHTML = `
      <div class="stage">${timerHtml}
        <div class="prompt">${numbers.join(' ')}</div>
        <p class="opt-label">Type the corresponding letters · 1 = A, 2 = B … 26 = Z</p>
        <input class="field" id="letterAnswer" placeholder="e.g. A B C" autofocus>
        <div><button class="primary-btn letter-code" onclick="checkLetterCode()">Submit</button></div>
      </div>`;
  }
}
function checkLetterCode(){
  const inputEl = document.getElementById('letterAnswer');
  const rawInput = inputEl.value;
  let ok, correctDisplay, userDisplay, prompt;
  if(window.letterDir==='l2n'){
    const input = rawInput.trim().split(/\s+/).map(Number);
    const correct = [...window.letterWord].map(l=>l.charCodeAt(0)-64);
    ok = JSON.stringify(input) === JSON.stringify(correct);
    correctDisplay = correct.join(' ');
    userDisplay = rawInput.trim() || '(blank)';
    prompt = window.letterWord;
  } else {
    const input = rawInput.trim().toUpperCase().replace(/\s+/g,'');
    ok = input === window.letterWord;
    correctDisplay = window.letterWord;
    userDisplay = input || '(blank)';
    prompt = window.letterPromptNumbers.join(' ');
  }

  if(window.session){
    sessionRecordAnswer(prompt, userDisplay, correctDisplay, ok);
    flashFeedback(inputEl, ok);
    setTimeout(()=>{ if(window.session) startLetterCode(); }, 200);
    return;
  }

  window.letterStreak = ok ? window.letterStreak+1 : 0;
  if(ok && window.letterStreak > (store.letterCode||0)){ store.letterCode = window.letterStreak; saveStore(); refreshBadges(); }
  // Off mode: on a wrong answer show both the correct answer and what the user typed.
  panelContent.innerHTML = `
    <div class="result ${ok?'ok':'no'}">
      <h2>${ok?'🎉 Correct!':'❌ Try again'}</h2>
      <p>${ok?'Sharp conversion.':'Correct: '+correctDisplay+' — you typed: '+userDisplay}</p>
      <button class="primary-btn letter-code" onclick="startLetterCode()">Next word</button>
      <div class="streak">Current streak: <b>${window.letterStreak}</b></div>
    </div>`;
}

/* ================= FLASH LETTER SUM ================= */
window.falphaCount = 5; window.falphaSpeed = 2500; window.falphaCase = 'upper'; window.falphaTimeLimit = 0;
function renderFlashAlphaSetup(){
  panelTitle.innerText = '🔠 Flash Letter Sum';
  panelContent.innerHTML = `
    <div class="opt-group"><div class="opt-label">How many letters</div>
      ${numberChipRow('falphaCount',1,10,falphaCount,'flash-alpha')}
      <input class="field" type="number" id="falphaCountCustom" min="11" max="20" placeholder="11-20"
        style="width:100px;padding:8px;font-size:14px;margin-top:8px;"
        oninput="if(this.value){window.falphaCount=Math.min(20,Math.max(11,Number(this.value)));this.closest('.opt-group').querySelectorAll('.chip').forEach(c=>c.classList.remove('active'));}">
    </div>
    <div class="opt-group"><div class="opt-label">Flash speed</div>
      ${chipRow('falphaSpeed',[{v:1200,label:'Slow'},{v:2500,label:'Normal'},{v:500,label:'Fast'}],falphaSpeed,'flash-alpha')}
      <input class="field" type="number" id="falphaSpeedCustom" min="100" max="5000" step="50" placeholder="Custom ms" value="${window.falphaSpeed}"
        style="width:140px;padding:8px;font-size:14px;margin-top:8px;"
        oninput="window.falphaSpeed = Number(this.value); this.closest('.opt-group').querySelectorAll('.chip').forEach(c=>c.classList.remove('active'));">
    </div>
    <div class="opt-group"><div class="opt-label">Letter case</div>
      ${chipRow('falphaCase',[{v:'upper',label:'UPPERCASE'},{v:'lower',label:'lowercase'}],falphaCase,'flash-alpha')}</div>
    <div class="opt-group"><div class="opt-label">Time limit</div>
      ${timeLimitChipRow('falphaTimeLimit',[0,60,120],falphaTimeLimit,'flash-alpha')}</div>
    <button class="primary-btn flash-alpha" onclick="startFlashAlpha()">Start</button>
  `;
}
function startFlashAlpha(){
  panelTitle.innerText = '🔠 Flash Letter Sum';
  if(window.falphaTimeLimit>0 && !window.session){
    startSession('flashAlpha', window.falphaTimeLimit, ()=> showSessionSummary('flash-alpha','🔠 Flash Letter Sum','startFlashAlpha'));
  }
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const letters = Array.from({length:window.falphaCount}, ()=> alphabet[Math.floor(Math.random()*alphabet.length)]);
  window.falphaLetters = letters; window.falphaIndex = 0;
  panelContent.innerHTML = `
    <div class="stage">${sessionTimerHtml()}<div class="flash" id="falphaFlash">Ready?</div>
    <button class="primary-btn flash-alpha" onclick="showNextFlashAlphaLetter()">Begin</button></div>`;
}
function showNextFlashAlphaLetter(){
  if(window.falphaIndex >= window.falphaLetters.length){
    const answer = window.falphaLetters.reduce((sum,l)=> sum + (l.charCodeAt(0)-64), 0);
    window.falphaAnswerCorrect = answer;
    panelContent.innerHTML = `
      <div class="stage">${sessionTimerHtml()}<p class="opt-label">What's the sum of the numeric values?</p>
      <input class="field" id="falphaAnswer" type="number" autofocus>
      <div><button class="primary-btn flash-alpha" onclick="checkFlashAlpha()">Submit</button></div></div>`;
    return;
  }
  const display = document.getElementById('falphaFlash');
  const letter = window.falphaLetters[window.falphaIndex];
  display.innerText = window.falphaCase==='lower' ? letter.toLowerCase() : letter;
  window.falphaIndex++;
  setTimeout(()=>{ if(display) display.innerText=''; setTimeout(showNextFlashAlphaLetter, window.falphaSpeed*0.4); }, window.falphaSpeed);
}
function checkFlashAlpha(){
  const correct = window.falphaAnswerCorrect;
  const inputEl = document.getElementById('falphaAnswer');
  const val = Number(inputEl.value);
  const ok = val === correct;

  if(window.session){
    sessionRecordAnswer(window.falphaLetters.join(''), val, correct, ok);
    flashFeedback(inputEl, ok);
    setTimeout(()=>{ if(window.session) startFlashAlpha(); }, 200);
    return;
  }

  if(ok){ store.flashAlpha = Math.max(store.flashAlpha, window.falphaCount); saveStore(); refreshBadges(); }
  panelContent.innerHTML = `
    <div class="result ${ok?'ok':'no'}">
      <h2>${ok?'🎉 Correct!':'❌ Answer: '+correct}</h2>
      <p>${ok?'Sharp eyes and sharp math.':'Letters + numbers is tricky — try again.'}</p>
      <button class="primary-btn flash-alpha" onclick="startFlashAlpha()">${ok?'Next round':'Try again'}</button>
    </div>`;
}

/* ================= ELEMENT QUIZ ================= */
const PERIODIC = [
[1,'H','Hydrogen',1],[2,'He','Helium',4],[3,'Li','Lithium',7],[4,'Be','Beryllium',9],[5,'B','Boron',11],
[6,'C','Carbon',12],[7,'N','Nitrogen',14],[8,'O','Oxygen',16],[9,'F','Fluorine',19],[10,'Ne','Neon',20],
[11,'Na','Sodium',23],[12,'Mg','Magnesium',24],[13,'Al','Aluminium',27],[14,'Si','Silicon',28],[15,'P','Phosphorus',31],
[16,'S','Sulfur',32],[17,'Cl','Chlorine',35],[18,'Ar','Argon',40],[19,'K','Potassium',39],[20,'Ca','Calcium',40],
[21,'Sc','Scandium',45],[22,'Ti','Titanium',48],[23,'V','Vanadium',51],[24,'Cr','Chromium',52],[25,'Mn','Manganese',55],
[26,'Fe','Iron',56],[27,'Co','Cobalt',59],[28,'Ni','Nickel',59],[29,'Cu','Copper',64],[30,'Zn','Zinc',65],
[31,'Ga','Gallium',70],[32,'Ge','Germanium',73],[33,'As','Arsenic',75],[34,'Se','Selenium',79],[35,'Br','Bromine',80],
[36,'Kr','Krypton',84],[37,'Rb','Rubidium',85],[38,'Sr','Strontium',88],[39,'Y','Yttrium',89],[40,'Zr','Zirconium',91],
[41,'Nb','Niobium',93],[42,'Mo','Molybdenum',96],[43,'Tc','Technetium',98],[44,'Ru','Ruthenium',101],[45,'Rh','Rhodium',103],
[46,'Pd','Palladium',106],[47,'Ag','Silver',108],[48,'Cd','Cadmium',112],[49,'In','Indium',115],[50,'Sn','Tin',119],
[51,'Sb','Antimony',122],[52,'Te','Tellurium',128],[53,'I','Iodine',127],[54,'Xe','Xenon',131],[55,'Cs','Caesium',133],
[56,'Ba','Barium',137],[57,'La','Lanthanum',139],[58,'Ce','Cerium',140],[59,'Pr','Praseodymium',141],[60,'Nd','Neodymium',144],
[61,'Pm','Promethium',145],[62,'Sm','Samarium',150],[63,'Eu','Europium',152],[64,'Gd','Gadolinium',157],[65,'Tb','Terbium',159],
[66,'Dy','Dysprosium',163],[67,'Ho','Holmium',165],[68,'Er','Erbium',167],[69,'Tm','Thulium',169],[70,'Yb','Ytterbium',173],
[71,'Lu','Lutetium',175],[72,'Hf','Hafnium',178],[73,'Ta','Tantalum',181],[74,'W','Tungsten',184],[75,'Re','Rhenium',186],
[76,'Os','Osmium',190],[77,'Ir','Iridium',192],[78,'Pt','Platinum',195],[79,'Au','Gold',197],[80,'Hg','Mercury',201],
[81,'Tl','Thallium',204],[82,'Pb','Lead',207],[83,'Bi','Bismuth',209],[84,'Po','Polonium',209],[85,'At','Astatine',210],
[86,'Rn','Radon',222],[87,'Fr','Francium',223],[88,'Ra','Radium',226],[89,'Ac','Actinium',227],[90,'Th','Thorium',232],
[91,'Pa','Protactinium',231],[92,'U','Uranium',238],[93,'Np','Neptunium',237],[94,'Pu','Plutonium',244],[95,'Am','Americium',243],
[96,'Cm','Curium',247],[97,'Bk','Berkelium',247],[98,'Cf','Californium',251],[99,'Es','Einsteinium',252],[100,'Fm','Fermium',257],
[101,'Md','Mendelevium',258],[102,'No','Nobelium',259],[103,'Lr','Lawrencium',266],[104,'Rf','Rutherfordium',267],[105,'Db','Dubnium',268],
[106,'Sg','Seaborgium',269],[107,'Bh','Bohrium',270],[108,'Hs','Hassium',269],[109,'Mt','Meitnerium',278],[110,'Ds','Darmstadtium',281],
[111,'Rg','Roentgenium',282],[112,'Cn','Copernicium',285],[113,'Nh','Nihonium',286],[114,'Fl','Flerovium',289],[115,'Mc','Moscovium',290],
[116,'Lv','Livermorium',293],[117,'Ts','Tennessine',294],[118,'Og','Oganesson',294]
];
window.elementRange = 36; window.elementFields = ['number','weight','name']; window.elementStreak = 0;
window.elementTimeLimit = 0;
function renderElementQuizSetup(){
  window.elementStreak = 0;
  panelTitle.innerText = '🧪 Element Quiz';
  panelContent.innerHTML = `
    <div class="opt-group"><div class="opt-label">Element range</div>
      ${chipRow('elementRange',[{v:20,label:'First 20'},{v:36,label:'First 36'},{v:54,label:'First 54'},{v:118,label:'All 118'}],elementRange,'element-quiz')}</div>
    <div class="opt-group"><div class="opt-label">What to guess</div>
      ${multiChipRow('elementFields',[{v:'number',label:'Atomic number'},{v:'weight',label:'Atomic weight'},{v:'name',label:'Element name'}],'element-quiz')}</div>
    <div class="opt-group"><div class="opt-label">Time limit</div>
      ${timeLimitChipRow('elementTimeLimit',[0,60,120],elementTimeLimit,'element-quiz')}</div>
    <button class="primary-btn element-quiz" onclick="startElementQuiz()">Start</button>
  `;
}
function startElementQuiz(){
  panelTitle.innerText = '🧪 Element Quiz';
  if(window.elementTimeLimit>0 && !window.session){
    startSession('elementQuiz', window.elementTimeLimit, ()=> showSessionSummary('element-quiz','🧪 Element Quiz','startElementQuiz'));
  }
  const pool = PERIODIC.slice(0, window.elementRange);
  const el = pool[Math.floor(Math.random()*pool.length)];
  window.elementAnswer = el;
  const fields = window.elementFields;
  let inputs = '';
  if(fields.includes('number')) inputs += `<div class="field-label">Atomic number</div><input class="field" id="elNumber" type="number">`;
  if(fields.includes('weight')) inputs += `<div class="field-label">Atomic weight (nearest whole number)</div><input class="field" id="elWeight" type="number">`;
  if(fields.includes('name')) inputs += `<div class="field-label">Element name</div><input class="field" id="elName" type="text">`;
  panelContent.innerHTML = `
    <div class="stage">${sessionTimerHtml()}<div class="prompt" style="font-size:64px;">${el[1]}</div>
    ${inputs}
    <div><button class="primary-btn element-quiz" onclick="checkElementQuiz()">Submit</button></div></div>`;
}
function checkElementQuiz(){
  const el = window.elementAnswer;
  const fields = window.elementFields;
  const numberEl = document.getElementById('elNumber');
  const weightEl = document.getElementById('elWeight');
  const nameEl = document.getElementById('elName');
  let ok = true;
  if(fields.includes('number')) ok = ok && Number(numberEl.value) === el[0];
  if(fields.includes('weight')) ok = ok && Number(weightEl.value) === el[3];
  if(fields.includes('name')) ok = ok && nameEl.value.trim().toLowerCase() === el[2].toLowerCase();

  if(window.session){
    const correctDisplay = `#${el[0]} ${el[2]}, weight ${el[3]}`;
    const userDisplay = [
      numberEl ? '#'+(numberEl.value||'?') : null,
      weightEl ? (weightEl.value||'?')+' wt' : null,
      nameEl ? (nameEl.value||'?') : null
    ].filter(Boolean).join(', ') || '(blank)';
    sessionRecordAnswer(el[1], userDisplay, correctDisplay, ok);
    [numberEl, weightEl, nameEl].forEach(f=> f && flashFeedback(f, ok));
    setTimeout(()=>{ if(window.session) startElementQuiz(); }, 200);
    return;
  }

  window.elementStreak = ok ? window.elementStreak+1 : 0;
  if(ok && window.elementStreak > (store.elementQuiz||0)){ store.elementQuiz = window.elementStreak; saveStore(); refreshBadges(); }
  panelContent.innerHTML = `
    <div class="result ${ok?'ok':'no'}">
      <h2>${ok?'🎉 Correct!':'❌ Not quite'}</h2>
      <p>${ok?'Elemental mastery.':'Answer — #'+el[0]+' '+el[2]+', weight '+el[3]}</p>
      <button class="primary-btn element-quiz" onclick="startElementQuiz()">Next element</button>
      <div class="streak">Current streak: <b>${window.elementStreak}</b></div>
    </div>`;
}

/* ================= MORSE CODE ================= */
const MORSE = {A:'.-',B:'-...',C:'-.-.',D:'-..',E:'.',F:'..-.',G:'--.',H:'....',I:'..',J:'.---',K:'-.-',L:'.-..',
M:'--',N:'-.',O:'---',P:'.--.',Q:'--.-',R:'.-.',S:'...',T:'-',U:'..-',V:'...-',W:'.--',X:'-..-',Y:'-.--',Z:'--..',
'0':'-----','1':'.----','2':'..---','3':'...--','4':'....-','5':'.....','6':'-....','7':'--...','8':'---..','9':'----.'};
// New required character-set groupings, plus the legacy numbers/mixed sets kept alongside them.
const MORSE_SETS = {
  easy: 'TEIMANSOH'.split(''),
  medium: 'SOHDGKRUW'.split(''),
  hard: 'BFJLCPQVXYZ'.split(''),
  all: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''),
  numbers: '0123456789'.split(''),
  mixed: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.split('')
};
window.morseSet = 'all'; window.morseMode = 'normal'; window.morseThreshold = 300; window.morseStreak = 0; window.morseActive = false;
window.morseTimeLimit = 60;
let morseInputAt = 0; // Tracks when a tap/hold starts

function renderMorseCodeSetup(){
  window.morseStreak = 0;
  panelTitle.innerText = '📡 Morse Code';
  panelContent.innerHTML = `
   <div class="opt-group"><div class="opt-label">Mode</div>
      ${chipRow('morseMode',[{v:'normal',label:'Normal (A → ·—)'},{v:'reverse',label:'Reverse (·— → A)'}],morseMode,'morse-code')}</div>
    <div class="opt-group"><div class="opt-label">Character set</div>
      ${chipRow('morseSet',[{v:'easy',label:'Easy letters'},{v:'medium',label:'Medium letters'},{v:'hard',label:'Hard letters'},{v:'all',label:'All letters'},{v:'numbers',label:'Numbers'},{v:'mixed',label:'Mixed'}],morseSet,'morse-code')}</div>
    <div class="opt-group"><div class="opt-label">Tap sensitivity</div>
      ${chipRow('morseThreshold',[{v:400,label:'Slow'},{v:300,label:'Normal'},{v:220,label:'Fast'}],morseThreshold,'morse-code')}</div>
    <div class="opt-group"><div class="opt-label">Time limit</div>
      ${timeLimitChipRow('morseTimeLimit',[0,60,120,180],morseTimeLimit,'morse-code')}</div>
    <p class="hint">Tap quickly for a dot, hold down for a dash.</p>
    <button class="primary-btn morse-code" onclick="startMorseCode()">Start</button>
  `;
}

function startMorseCode(){
  panelTitle.innerText = '📡 Morse Code';
  if(window.morseTimeLimit>0 && !window.session){
    startSession('morseCode', window.morseTimeLimit, ()=>{ window.morseActive=false; showSessionSummary('morse-code','📡 Morse Code','startMorseCode'); });
  }
  const pool = MORSE_SETS[window.morseSet] || MORSE_SETS.all;
  window.morseChar = pool[Math.floor(Math.random()*pool.length)];
  const timerHtml = sessionTimerHtml();

  if(window.morseMode === 'reverse'){
    window.morseActive = false; // Disable touch/spacebar listening
    const codeDisplay = MORSE[window.morseChar];
    panelContent.innerHTML = `
      <div class="stage">${timerHtml}
        <div class="prompt" style="letter-spacing: 8px;">${codeDisplay}</div>
        <p class="opt-label">Type the matching character</p>
        <input class="field" id="morseReverseInput" type="text" maxlength="1" autofocus style="text-transform: uppercase; width: 80px; text-align: center; font-size: 28px;">
        <div>
          <button class="primary-btn morse-code" onclick="checkMorseCode()">Submit</button>
        </div>
      </div>`;
    // Timed reverse mode: always re-focus the input on each new question.
    const inp = document.getElementById('morseReverseInput');
    if(inp) inp.focus();
  } else {
    window.morseBuffer = '';
    window.morseActive = true;
    morseInputAt = 0;
    panelContent.innerHTML = `
      <div class="stage">${timerHtml}
        <div class="prompt">${window.morseChar}</div>
        <p class="opt-label">Tap Spacebar or use the pad below</p>
        
        <div class="morse-tap-pad" 
             onpointerdown="triggerMorseDown(event); this.classList.add('active')" 
             onpointerup="triggerMorseUp(event); this.classList.remove('active')" 
             onpointerleave="triggerMorseUp(event); this.classList.remove('active')"
             onpointercancel="triggerMorseUp(event); this.classList.remove('active')"
             oncontextmenu="return false;">
          TAP / HOLD HERE
        </div>

        <div class="morse-buffer" id="morseDisplay">&nbsp;</div>
        <div>
          <button class="back-btn" type="button" onclick="clearMorseBuffer()">Clear</button>
          <button class="primary-btn morse-code" onclick="checkMorseCode()">Submit</button>
        </div>
      </div>`;
  }
}

function updateMorseDisplay(){
  const d = document.getElementById('morseDisplay');
  if(d) d.innerText = window.morseBuffer || '\u00A0';
}
function clearMorseBuffer(){ window.morseBuffer=''; updateMorseDisplay(); }
function checkMorseCode(){
  window.morseActive = false;
  let ok = false, message = '', userDisplay, correctDisplay, prompt;

  if(window.morseMode === 'reverse'){
    const inputEl = document.getElementById('morseReverseInput');
    const inputVal = (inputEl.value || '').trim().toUpperCase();
    ok = inputVal === window.morseChar;
    userDisplay = inputVal || '(blank)'; correctDisplay = window.morseChar; prompt = MORSE[window.morseChar];
    message = ok ? 'Perfect decoding.' : MORSE[window.morseChar] + ' is ' + window.morseChar + ' — you typed ' + (inputVal || 'nothing');

    if(window.session){
      sessionRecordAnswer(prompt, userDisplay, correctDisplay, ok);
      flashFeedback(inputEl, ok);
      setTimeout(()=>{ if(window.session) startMorseCode(); }, 200);
      return;
    }
  } else {
    const correct = MORSE[window.morseChar];
    ok = window.morseBuffer === correct;
    userDisplay = window.morseBuffer || '(blank)'; correctDisplay = correct; prompt = window.morseChar;
    message = ok ? 'Perfect timing.' : window.morseChar + ' is ' + correct + ' — you sent ' + (window.morseBuffer || 'nothing');

    if(window.session){
      sessionRecordAnswer(prompt, userDisplay, correctDisplay, ok);
      flashFeedback(document.getElementById('morseDisplay'), ok);
      setTimeout(()=>{ if(window.session) startMorseCode(); }, 200);
      return;
    }
  }

  window.morseStreak = ok ? window.morseStreak + 1 : 0;
  if(ok && window.morseStreak > (store.morseCode || 0)){ 
    store.morseCode = window.morseStreak; 
    saveStore(); 
    refreshBadges(); 
  }

  panelContent.innerHTML = `
    <div class="result ${ok ? 'ok' : 'no'}">
      <h2>${ok ? '🎉 Correct!' : '❌ Not quite'}</h2>
      <p>${message}</p>
      <button class="primary-btn morse-code" onclick="startMorseCode()">Next round</button>
      <div class="streak">Current streak: <b>${window.morseStreak}</b></div>
    </div>`;
}

// Unified input handlers for Touch & Keyboard
function triggerMorseDown(e) {
  if(e && e.type !== 'keydown') e.preventDefault();
  if(!window.morseActive) return;
  if(morseInputAt === 0) morseInputAt = Date.now();
}

function triggerMorseUp(e) {
  if(e && e.type !== 'keyup') e.preventDefault();
  if(!window.morseActive || morseInputAt === 0) return;
  const dur = Date.now() - morseInputAt;
  window.morseBuffer += dur < window.morseThreshold ? '.' : '-';
  updateMorseDisplay();
  morseInputAt = 0; // Reset for next tap
}

document.addEventListener('keydown', (e)=>{
  if(window.morseActive && e.code==='Space'){
    e.preventDefault();
    if(!e.repeat) triggerMorseDown(e);
  }
});
document.addEventListener('keyup', (e)=>{
  if(window.morseActive && e.code==='Space'){
    e.preventDefault();
    triggerMorseUp(e);
  }
});

/* ================= ANGLE TABLE ================= */
// Standard trig values at 0°, 30°, 45°, 60°, 90° for sin, cos, tan, cosec, sec, cot.
// Values are stored as canonical strings ('1/2', '√3/2', '∞' for undefined, etc.) so they
// can be shown directly and compared against a normalized version of what the user types.
const ANGLE_TABLE = {
  sin:   {0:'0',   30:'1/2',  45:'1/√2', 60:'√3/2', 90:'1'},
  cos:   {0:'1',   30:'√3/2', 45:'1/√2', 60:'1/2',  90:'0'},
  tan:   {0:'0',   30:'1/√3', 45:'1',    60:'√3',   90:'∞'},
  cosec: {0:'∞',   30:'2',    45:'√2',   60:'2/√3', 90:'1'},
  sec:   {0:'1',   30:'2/√3', 45:'√2',   60:'2',    90:'∞'},
  cot:   {0:'∞',   30:'√3',   45:'1',    60:'1/√3', 90:'0'}
};

// Turns free-typed answers like "sqrt(3)/2", "0.5", or "1/root2" into the same canonical
// tokens used in ANGLE_TABLE, so e.g. typing "1/2" for sin30 is accepted.
function normalizeTrigAnswer(str){
  if(str==null) return '';
  let s = str.trim().toLowerCase().replace(/\s+/g,'');
  if(['undefined','infinity','inf','na','n/a','∞'].includes(s)) return '∞';
  s = s.replace(/root/g,'sqrt');
  s = s.replace(/sqrt\(?3\)?/g,'√3');
  s = s.replace(/sqrt\(?2\)?/g,'√2');
  const decimalMap = {
    '0':'0','1':'1','0.5':'1/2','.5':'1/2',
    '0.87':'√3/2','0.866':'√3/2','0.8660':'√3/2','0.866025':'√3/2',
    '0.71':'1/√2','0.707':'1/√2','0.7071':'1/√2','0.707107':'1/√2',
    '1.73':'√3','1.732':'√3','1.7321':'√3',
    '0.58':'1/√3','0.577':'1/√3','0.5774':'1/√3',
    '1.41':'√2','1.414':'√2','1.4142':'√2',
    '1.15':'2/√3','1.155':'2/√3','1.1547':'2/√3'
  };
  if(decimalMap[s]) s = decimalMap[s];
  return s;
}
// Parses a "function + angle" answer like "sin30", "Sin 30°" or "csc45" for reverse mode.
function parseFuncAngle(str){
  if(!str) return null;
  let s = str.trim().toLowerCase().replace(/\s+/g,'').replace(/°/g,'').replace(/csc/,'cosec');
  const m = s.match(/^(sin|cos|tan|cosec|sec|cot)(\d+)$/);
  if(!m || !ANGLE_TABLE[m[1]] || !(m[2] in ANGLE_TABLE[m[1]])) return null;
  return { func:m[1], angle:Number(m[2]) };
}

window.angleFuncs = ['sin','cos','tan','cosec','sec','cot'];
window.angleAngles = ['0','30','45','60','90'];
window.angleMode = 'normal'; // 'normal' = function -> value, 'reverse' = value -> function
window.angleStreak = 0;
window.angleTimeLimit = 0;

function renderAngleTableSetup(){
  window.angleStreak = 0;
  panelTitle.innerText = '📐 Angle Table';
  panelContent.innerHTML = `
    <div class="opt-group"><div class="opt-label">Mode</div>
      ${chipRow('angleMode',[{v:'normal',label:'Function → Value'},{v:'reverse',label:'Value → Function'}],angleMode,'angle-table')}</div>
    <div class="opt-group"><div class="opt-label">Functions</div>
      ${multiChipRow('angleFuncs',[{v:'sin',label:'sin'},{v:'cos',label:'cos'},{v:'tan',label:'tan'},{v:'cosec',label:'cosec'},{v:'sec',label:'sec'},{v:'cot',label:'cot'}],'angle-table')}</div>
    <div class="opt-group"><div class="opt-label">Angles</div>
      ${multiChipRow('angleAngles',[{v:'0',label:'0°'},{v:'30',label:'30°'},{v:'45',label:'45°'},{v:'60',label:'60°'},{v:'90',label:'90°'}],'angle-table')}</div>
    <div class="opt-group"><div class="opt-label">Time limit</div>
      ${timeLimitChipRow('angleTimeLimit',[0,60,120],angleTimeLimit,'angle-table')}</div>
    <p class="hint">e.g. type <b>1/2</b> for sin30, or type <b>sin30</b> / <b>cos60</b> when shown 1/2.</p>
    <button class="primary-btn angle-table" onclick="startAngleTable()">Start</button>
  `;
}
function startAngleTable(){
  panelTitle.innerText = '📐 Angle Table';
  if(window.angleTimeLimit>0 && !window.session){
    startSession('angleTable', window.angleTimeLimit, ()=> showSessionSummary('angle-table','📐 Angle Table','startAngleTable'));
  }
  const funcs = window.angleFuncs.length ? window.angleFuncs : ['sin'];
  const angles = window.angleAngles.length ? window.angleAngles : ['0'];
  const func = funcs[Math.floor(Math.random()*funcs.length)];
  const angle = Number(angles[Math.floor(Math.random()*angles.length)]);
  window.angleFunc = func; window.angleAngle = angle; window.angleValue = ANGLE_TABLE[func][angle];
  const timerHtml = sessionTimerHtml();

  if(window.angleMode === 'reverse'){
    // Value -> Function: show the value, ask for any matching "func+angle" pair (e.g. sin30).
    panelContent.innerHTML = `
      <div class="stage">${timerHtml}
        <div class="prompt">${window.angleValue}</div>
        <p class="opt-label">Type a matching function & angle, e.g. sin30 or cos60</p>
        <input class="field" id="angleAnswer" placeholder="e.g. sin30" autofocus>
        <div><button class="primary-btn angle-table" onclick="checkAngleTable()">Submit</button></div>
      </div>`;
  } else {
    // Function -> Value: show e.g. "sin 30°", ask for the value as a fraction.
    panelContent.innerHTML = `
      <div class="stage">${timerHtml}
        <div class="prompt">${func} ${angle}°</div>
        <p class="opt-label">Type the value, e.g. 1/2 or √3/2</p>
        <input class="field" id="angleAnswer" placeholder="e.g. 1/2" autofocus>
        <div><button class="primary-btn angle-table" onclick="checkAngleTable()">Submit</button></div>
      </div>`;
  }
}
function checkAngleTable(){
  const inputEl = document.getElementById('angleAnswer');
  const raw = inputEl.value;
  let ok, correctDisplay, userDisplay, prompt;

  if(window.angleMode === 'reverse'){
    const parsed = parseFuncAngle(raw);
    ok = !!parsed && ANGLE_TABLE[parsed.func][parsed.angle] === window.angleValue;
    correctDisplay = `${window.angleFunc}${window.angleAngle}`;
    userDisplay = raw.trim() || '(blank)';
    prompt = window.angleValue;
  } else {
    ok = normalizeTrigAnswer(raw) === window.angleValue;
    correctDisplay = window.angleValue;
    userDisplay = raw.trim() || '(blank)';
    prompt = `${window.angleFunc} ${window.angleAngle}°`;
  }

  if(window.session){
    sessionRecordAnswer(prompt, userDisplay, correctDisplay, ok);
    flashFeedback(inputEl, ok);
    setTimeout(()=>{ if(window.session) startAngleTable(); }, 200);
    return;
  }

  window.angleStreak = ok ? window.angleStreak+1 : 0;
  if(ok && window.angleStreak > (store.angleTable||0)){ store.angleTable = window.angleStreak; saveStore(); refreshBadges(); }
  panelContent.innerHTML = `
    <div class="result ${ok?'ok':'no'}">
      <h2>${ok?'🎉 Correct!':'❌ Not quite'}</h2>
      <p>${ok ? 'Trig mastery.' : 'Correct: '+correctDisplay+' — you typed: '+userDisplay+(window.angleMode==='reverse' ? ' (any function+angle equal to '+window.angleValue+' works)' : '')}</p>
      <button class="primary-btn angle-table" onclick="startAngleTable()">Next question</button>
      <div class="streak">Current streak: <b>${window.angleStreak}</b></div>
    </div>`;
}

/* ================= PYTHAGOREAN TRIPLES ================= */
// Curated triples (a, b, c) with a² + b² = c², grouped by difficulty. Higher difficulties
// add larger / less-common triples on top of the easy set. Default difficulty is Easy.
const PYTH_TRIPLES = {
  easy:   [[3,4,5],[6,8,10],[5,12,13],[9,12,15],[30,40,50],[33,44,55],[15,20,25]],
  medium: [[3,4,5],[6,8,10],[5,12,13],[9,12,15],[8,15,17],[7,24,25],[10,24,26],[20,21,29],[12,16,20],[12,35,37]],
  hard:   [[3,4,5],[5,12,13],[8,15,17],[7,24,25],[9,40,41],[11,60,61],[12,35,37],[24,70,74],[14,48,50],
           [15,36,39],[16,30,34],[18,24,30],[20,21,29],[28,45,53],[33,56,65],[48,55,73],[10,24,26]]
};
window.pythDifficulty = 'easy'; window.pythTimeLimit = 0; window.pythStreak = 0;

function renderPythTriplesSetup(){
  window.pythStreak = 0;
  panelTitle.innerText = '🔺 Pythagorean Triples';
  panelContent.innerHTML = `
    <div class="opt-group"><div class="opt-label">Difficulty</div>
      ${chipRow('pythDifficulty',[{v:'easy',label:'Easy'},{v:'medium',label:'Medium'},{v:'hard',label:'Hard'}],pythDifficulty,'pyth-triples')}</div>
    <div class="opt-group"><div class="opt-label">Time limit</div>
      ${timeLimitChipRow('pythTimeLimit',[0,60,120],pythTimeLimit,'pyth-triples')}</div>
    <p class="hint">Given two sides of a right triangle, find the third — a & b are the legs, c is the hypotenuse (a² + b² = c²).</p>
    <button class="primary-btn pyth-triples" onclick="startPythTriples()">Start</button>
  `;
}
function startPythTriples(){
  panelTitle.innerText = '🔺 Pythagorean Triples';
  if(window.pythTimeLimit>0 && !window.session){
    startSession('pythTriples', window.pythTimeLimit, ()=> showSessionSummary('pyth-triples','🔺 Pythagorean Triples','startPythTriples'));
  }
  const pool = PYTH_TRIPLES[window.pythDifficulty] || PYTH_TRIPLES.easy;
  const triple = pool[Math.floor(Math.random()*pool.length)];
  const hideIndex = Math.floor(Math.random()*3); // 0=a, 1=b, 2=c (hypotenuse)
  window.pythTriple = triple; window.pythHideIndex = hideIndex;
  const labels = ['a','b','c'];
  const display = triple.map((v,i)=> i===hideIndex ? `${labels[i]} = ?` : `${labels[i]} = ${v}`).join(',  ');
  panelContent.innerHTML = `
    <div class="stage">${sessionTimerHtml()}
      <div class="prompt" style="font-size:32px;">${display}</div>
      <p class="opt-label">a & b are the legs, c is the hypotenuse</p>
      <input class="field" id="pythAnswer" type="number" autofocus>
      <div><button class="primary-btn pyth-triples" onclick="checkPythTriples()">Submit</button></div>
    </div>`;
}
function checkPythTriples(){
  const inputEl = document.getElementById('pythAnswer');
  const val = Number(inputEl.value);
  const correct = window.pythTriple[window.pythHideIndex];
  const ok = val === correct;
  const labels = ['a','b','c'];
  const prompt = window.pythTriple.map((v,i)=> i===window.pythHideIndex ? labels[i]+'=?' : labels[i]+'='+v).join(', ');

  if(window.session){
    sessionRecordAnswer(prompt, val, correct, ok);
    flashFeedback(inputEl, ok);
    setTimeout(()=>{ if(window.session) startPythTriples(); }, 200);
    return;
  }

  window.pythStreak = ok ? window.pythStreak+1 : 0;
  if(ok && window.pythStreak > (store.pythTriples||0)){ store.pythTriples = window.pythStreak; saveStore(); refreshBadges(); }
  panelContent.innerHTML = `
    <div class="result ${ok?'ok':'no'}">
      <h2>${ok?'🎉 Correct!':'❌ Answer: '+correct}</h2>
      <p>${ok ? 'Right-triangle mastery.' : 'The full triple is '+window.pythTriple.join('-')+'.'}</p>
      <button class="primary-btn pyth-triples" onclick="startPythTriples()">Next question</button>
      <div class="streak">Current streak: <b>${window.pythStreak}</b></div>
    </div>`;
}
