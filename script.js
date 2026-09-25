const homeView = document.getElementById('homeView');
const panelView = document.getElementById('panelView');
const panelTitle = document.getElementById('panelTitle');
const panelContent = document.getElementById('panelContent');

let store = { flashAnzan:0, speedMath:0, letterCode:0, flashAlpha:0, elementQuiz:0, morseCode:0 };
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
}
refreshBadges();

function navigateToHome(){
  window.morseActive = false;
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

/* ================= FLASH ANZAN ================= */
window.anzanDigits = 2; window.anzanCount = 5; window.anzanSpeed = 800; window.anzanOp = 'add';
function renderFlashAnzanSetup(){
  panelTitle.innerText = '🧠 Flash Anzan';
  panelContent.innerHTML = `
    <div class="opt-group"><div class="opt-label">Digit size</div>
      ${chipRow('anzanDigits',[{v:1,label:'1 digit'},{v:2,label:'2 digit'},{v:3,label:'3 digit'}],anzanDigits,'flash-anzan')}</div>
    <div class="opt-group"><div class="opt-label">How many numbers</div>
      ${chipRow('anzanCount',[{v:3,label:'3'},{v:5,label:'5'},{v:7,label:'7'},{v:10,label:'10'}],anzanCount,'flash-anzan')}</div>
    <div class="opt-group"><div class="opt-label">Flash speed</div>
      ${chipRow('anzanSpeed',[{v:1200,label:'Slow'},{v:800,label:'Normal'},{v:500,label:'Fast'}],anzanSpeed,'flash-anzan')}</div>
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
function checkFlashAnzan(correct){
  const val = Number(document.getElementById('anzanAnswer').value);
  const ok = val === correct;
  if(ok){ store.flashAnzan = Math.max(store.flashAnzan, window.anzanCount); saveStore(); refreshBadges(); }
  panelContent.innerHTML = `
    <div class="result ${ok?'ok':'no'}">
      <h2>${ok?'🎉 Correct!':'❌ Answer: '+correct}</h2>
      <p>${ok?'Nice mental math.':'So close — try again.'}</p>
      <button class="primary-btn flash-anzan" onclick="startFlashAnzan()">${ok?'Next round':'Try again'}</button>
    </div>`;
}

/* ================= SPEED MATH ================= */
window.speedOp = 'mixed'; window.speedDiff = 'easy'; window.speedTimer = 0; window.speedStreak = 0;
function renderSpeedMathSetup(){
  window.speedStreak = 0;
  panelTitle.innerText = '⚡ Speed Math';
  panelContent.innerHTML = `
    <div class="opt-group"><div class="opt-label">Operation</div>
      ${chipRow('speedOp',[{v:'add',label:'+'},{v:'sub',label:'−'},{v:'mul',label:'×'},{v:'mixed',label:'Mixed'}],speedOp,'speed-math')}</div>
    <div class="opt-group"><div class="opt-label">Difficulty</div>
      ${chipRow('speedDiff',[{v:'easy',label:'Easy'},{v:'medium',label:'Medium'},{v:'hard',label:'Hard'}],speedDiff,'speed-math')}</div>
    <div class="opt-group"><div class="opt-label">Time per question</div>
      ${chipRow('speedTimer',[{v:0,label:'Off'},{v:10,label:'10s'},{v:5,label:'5s'}],speedTimer,'speed-math')}</div>
    <button class="primary-btn speed-math" onclick="startSpeedMath()">Start</button>
  `;
}
function startSpeedMath(){
  panelTitle.innerText = '⚡ Speed Math';
  clearInterval(window.speedTimerId);
  const cap = window.speedDiff==='easy'?20:window.speedDiff==='medium'?50:100;
  const ops = window.speedOp==='mixed' ? ['add','sub','mul'] : [window.speedOp];
  const op = ops[Math.floor(Math.random()*ops.length)];
  let a = Math.floor(Math.random()*cap)+1, b = Math.floor(Math.random()*cap)+1;
  let symbol='+', answer;
  if(op==='add'){ answer=a+b; symbol='+'; }
  if(op==='sub'){ if(b>a)[a,b]=[b,a]; answer=a-b; symbol='−'; }
  if(op==='mul'){ b = Math.floor(Math.random()*12)+1; answer=a*b; symbol='×'; }
  window.speedAnswer = answer;
  const timerHtml = window.speedTimer>0 ? `<div class="opt-label" id="speedTimerLabel">Time left: ${window.speedTimer}s</div>` : '';
  panelContent.innerHTML = `
    <div class="stage">${timerHtml}<div class="prompt">${a} ${symbol} ${b} = ?</div>
    <input class="field" id="speedAnswerInput" type="number" autofocus>
    <div><button class="primary-btn speed-math" onclick="checkSpeedMath()">Submit</button></div></div>`;
  if(window.speedTimer>0){
    let remaining = window.speedTimer;
    window.speedTimerId = setInterval(()=>{
      remaining--;
      const label = document.getElementById('speedTimerLabel');
      if(label) label.innerText = 'Time left: '+remaining+'s';
      if(remaining<=0){ clearInterval(window.speedTimerId); checkSpeedMath(); }
    },1000);
  }
}
function checkSpeedMath(){
  clearInterval(window.speedTimerId);
  const val = Number(document.getElementById('speedAnswerInput').value);
  const ok = val === window.speedAnswer;
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
window.letterLen = 5; window.letterDir = 'l2n'; window.letterStreak = 0;
function renderLetterCodeSetup(){
  window.letterStreak = 0;
  panelTitle.innerText = '🔤 Letter Coding';
  panelContent.innerHTML = `
    <div class="opt-group"><div class="opt-label">Word length</div>
      ${chipRow('letterLen',[{v:3,label:'3'},{v:4,label:'4'},{v:5,label:'5'},{v:6,label:'6'},{v:7,label:'7'}],letterLen,'letter-code')}</div>
    <div class="opt-group"><div class="opt-label">Direction</div>
      ${chipRow('letterDir',[{v:'l2n',label:'Letters → Numbers'},{v:'n2l',label:'Numbers → Letters'}],letterDir,'letter-code')}</div>
    <button class="primary-btn letter-code" onclick="startLetterCode()">Start</button>
  `;
}
function startLetterCode(){
  panelTitle.innerText = '🔤 Letter Coding';
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let word = '';
  for(let i=0;i<window.letterLen;i++) word += alphabet[Math.floor(Math.random()*alphabet.length)];
  window.letterWord = word;
  if(window.letterDir==='l2n'){
    panelContent.innerHTML = `
      <div class="stage">
        <div class="prompt">${word}</div>
        <p class="opt-label">Type the corresponding numbers · A = 1, B = 2 … Z = 26</p>
        <input class="field" id="letterAnswer" placeholder="e.g. 1 2 3" autofocus>
        <div><button class="primary-btn letter-code" onclick="checkLetterCode()">Submit</button></div>
      </div>`;
  } else {
    const numbers = [...word].map(l=>l.charCodeAt(0)-64);
    panelContent.innerHTML = `
      <div class="stage">
        <div class="prompt">${numbers.join(' ')}</div>
        <p class="opt-label">Type the corresponding letters · 1 = A, 2 = B … 26 = Z</p>
        <input class="field" id="letterAnswer" placeholder="e.g. A B C" autofocus>
        <div><button class="primary-btn letter-code" onclick="checkLetterCode()">Submit</button></div>
      </div>`;
  }
}
function checkLetterCode(){
  let ok, correctDisplay;
  if(window.letterDir==='l2n'){
    const input = document.getElementById('letterAnswer').value.trim().split(/\s+/).map(Number);
    const correct = [...window.letterWord].map(l=>l.charCodeAt(0)-64);
    ok = JSON.stringify(input) === JSON.stringify(correct);
    correctDisplay = correct.join(' ');
  } else {
    const input = document.getElementById('letterAnswer').value.trim().toUpperCase().replace(/\s+/g,'');
    ok = input === window.letterWord;
    correctDisplay = window.letterWord;
  }
  window.letterStreak = ok ? window.letterStreak+1 : 0;
  if(ok && window.letterStreak > (store.letterCode||0)){ store.letterCode = window.letterStreak; saveStore(); refreshBadges(); }
  panelContent.innerHTML = `
    <div class="result ${ok?'ok':'no'}">
      <h2>${ok?'🎉 Correct!':'❌ Try again'}</h2>
      <p>${ok?'Sharp conversion.':'Correct: '+correctDisplay}</p>
      <button class="primary-btn letter-code" onclick="startLetterCode()">Next word</button>
      <div class="streak">Current streak: <b>${window.letterStreak}</b></div>
    </div>`;
}

/* ================= FLASH LETTER SUM ================= */
window.falphaCount = 5; window.falphaSpeed = 800; window.falphaCase = 'upper';
function renderFlashAlphaSetup(){
  panelTitle.innerText = '🔠 Flash Letter Sum';
  panelContent.innerHTML = `
    <div class="opt-group"><div class="opt-label">How many letters</div>
      ${chipRow('falphaCount',[{v:3,label:'3'},{v:5,label:'5'},{v:7,label:'7'},{v:10,label:'10'}],falphaCount,'flash-alpha')}</div>
    <div class="opt-group"><div class="opt-label">Flash speed</div>
      ${chipRow('falphaSpeed',[{v:1200,label:'Slow'},{v:800,label:'Normal'},{v:500,label:'Fast'}],falphaSpeed,'flash-alpha')}</div>
    <div class="opt-group"><div class="opt-label">Letter case</div>
      ${chipRow('falphaCase',[{v:'upper',label:'UPPERCASE'},{v:'lower',label:'lowercase'}],falphaCase,'flash-alpha')}</div>
    <button class="primary-btn flash-alpha" onclick="startFlashAlpha()">Start</button>
  `;
}
function startFlashAlpha(){
  panelTitle.innerText = '🔠 Flash Letter Sum';
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const letters = Array.from({length:window.falphaCount}, ()=> alphabet[Math.floor(Math.random()*alphabet.length)]);
  window.falphaLetters = letters; window.falphaIndex = 0;
  panelContent.innerHTML = `
    <div class="stage"><div class="flash" id="falphaFlash">Ready?</div>
    <button class="primary-btn flash-alpha" onclick="showNextFlashAlphaLetter()">Begin</button></div>`;
}
function showNextFlashAlphaLetter(){
  if(window.falphaIndex >= window.falphaLetters.length){
    const answer = window.falphaLetters.reduce((sum,l)=> sum + (l.charCodeAt(0)-64), 0);
    panelContent.innerHTML = `
      <div class="stage"><p class="opt-label">What's the sum of the numeric values?</p>
      <input class="field" id="falphaAnswer" type="number" autofocus>
      <div><button class="primary-btn flash-alpha" onclick="checkFlashAlpha(${answer})">Submit</button></div></div>`;
    return;
  }
  const display = document.getElementById('falphaFlash');
  const letter = window.falphaLetters[window.falphaIndex];
  display.innerText = window.falphaCase==='lower' ? letter.toLowerCase() : letter;
  window.falphaIndex++;
  setTimeout(()=>{ if(display) display.innerText=''; setTimeout(showNextFlashAlphaLetter, window.falphaSpeed*0.4); }, window.falphaSpeed);
}
function checkFlashAlpha(correct){
  const val = Number(document.getElementById('falphaAnswer').value);
  const ok = val === correct;
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
function renderElementQuizSetup(){
  window.elementStreak = 0;
  panelTitle.innerText = '🧪 Element Quiz';
  panelContent.innerHTML = `
    <div class="opt-group"><div class="opt-label">Element range</div>
      ${chipRow('elementRange',[{v:20,label:'First 20'},{v:36,label:'First 36'},{v:54,label:'First 54'},{v:118,label:'All 118'}],elementRange,'element-quiz')}</div>
    <div class="opt-group"><div class="opt-label">What to guess</div>
      ${multiChipRow('elementFields',[{v:'number',label:'Atomic number'},{v:'weight',label:'Atomic weight'},{v:'name',label:'Element name'}],'element-quiz')}</div>
    <button class="primary-btn element-quiz" onclick="startElementQuiz()">Start</button>
  `;
}
function startElementQuiz(){
  panelTitle.innerText = '🧪 Element Quiz';
  const pool = PERIODIC.slice(0, window.elementRange);
  const el = pool[Math.floor(Math.random()*pool.length)];
  window.elementAnswer = el;
  const fields = window.elementFields;
  let inputs = '';
  if(fields.includes('number')) inputs += `<div class="field-label">Atomic number</div><input class="field" id="elNumber" type="number">`;
  if(fields.includes('weight')) inputs += `<div class="field-label">Atomic weight (nearest whole number)</div><input class="field" id="elWeight" type="number">`;
  if(fields.includes('name')) inputs += `<div class="field-label">Element name</div><input class="field" id="elName" type="text">`;
  panelContent.innerHTML = `
    <div class="stage"><div class="prompt" style="font-size:64px;">${el[1]}</div>
    ${inputs}
    <div><button class="primary-btn element-quiz" onclick="checkElementQuiz()">Submit</button></div></div>`;
}
function checkElementQuiz(){
  const el = window.elementAnswer;
  const fields = window.elementFields;
  let ok = true;
  if(fields.includes('number')) ok = ok && Number(document.getElementById('elNumber').value) === el[0];
  if(fields.includes('weight')) ok = ok && Number(document.getElementById('elWeight').value) === el[3];
  if(fields.includes('name')) ok = ok && document.getElementById('elName').value.trim().toLowerCase() === el[2].toLowerCase();
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
window.morseSet = 'letters'; window.morseThreshold = 300; window.morseStreak = 0; window.morseActive = false;
function renderMorseCodeSetup(){
  window.morseStreak = 0;
  panelTitle.innerText = '📡 Morse Code';
  panelContent.innerHTML = `
    <div class="opt-group"><div class="opt-label">Character set</div>
      ${chipRow('morseSet',[{v:'letters',label:'Letters'},{v:'numbers',label:'Numbers'},{v:'mixed',label:'Mixed'}],morseSet,'morse-code')}</div>
    <div class="opt-group"><div class="opt-label">Tap sensitivity</div>
      ${chipRow('morseThreshold',[{v:400,label:'Slow'},{v:300,label:'Normal'},{v:220,label:'Fast'}],morseThreshold,'morse-code')}</div>
    <p class="hint">Tap the spacebar quickly for a dot, hold it down for a dash.</p>
    <button class="primary-btn morse-code" onclick="startMorseCode()">Start</button>
  `;
}
function startMorseCode(){
  panelTitle.innerText = '📡 Morse Code';
  const pool = window.morseSet==='letters' ? 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')
    : window.morseSet==='numbers' ? '0123456789'.split('')
    : 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.split('');
  window.morseChar = pool[Math.floor(Math.random()*pool.length)];
  window.morseBuffer = '';
  window.morseActive = true;
  panelContent.innerHTML = `
    <div class="stage">
      <div class="prompt">${window.morseChar}</div>
      <p class="opt-label">Tap Space for a dot · hold Space for a dash</p>
      <div class="morse-buffer" id="morseDisplay">&nbsp;</div>
      <div>
        <button class="back-btn" type="button" onclick="clearMorseBuffer()">Clear</button>
        <button class="primary-btn morse-code" onclick="checkMorseCode()">Submit</button>
      </div>
    </div>`;
}
function updateMorseDisplay(){
  const d = document.getElementById('morseDisplay');
  if(d) d.innerText = window.morseBuffer || '\u00A0';
}
function clearMorseBuffer(){ window.morseBuffer=''; updateMorseDisplay(); }
function checkMorseCode(){
  window.morseActive = false;
  const correct = MORSE[window.morseChar];
  const ok = window.morseBuffer === correct;
  window.morseStreak = ok ? window.morseStreak+1 : 0;
  if(ok && window.morseStreak > (store.morseCode||0)){ store.morseCode = window.morseStreak; saveStore(); refreshBadges(); }
  panelContent.innerHTML = `
    <div class="result ${ok?'ok':'no'}">
      <h2>${ok?'🎉 Correct!':'❌ Not quite'}</h2>
      <p>${ok?'Perfect timing.':window.morseChar+' is '+correct+' — you sent '+(window.morseBuffer||'nothing')}</p>
      <button class="primary-btn morse-code" onclick="startMorseCode()">Next letter</button>
      <div class="streak">Current streak: <b>${window.morseStreak}</b></div>
    </div>`;
}
let morseKeyDownAt = 0;
document.addEventListener('keydown', (e)=>{
  if(window.morseActive && e.code==='Space'){
    e.preventDefault();
    if(!e.repeat) morseKeyDownAt = Date.now();
  }
});
document.addEventListener('keyup', (e)=>{
  if(window.morseActive && e.code==='Space'){
    e.preventDefault();
    const dur = Date.now() - morseKeyDownAt;
    window.morseBuffer += dur < window.morseThreshold ? '.' : '-';
    updateMorseDisplay();
  }
});
