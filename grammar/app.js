const KEY='ash_grammar_v1';
const BACKUP_KEY='ash_grammar_v1_backup';
const DAY_NUMBER_KEY='ash_grammar_day_number';
const START_DATE_KEY='ash_grammar_start_date';
const TARGET_CORRECT=50;
const DICTATION_COUNT=10;

const DICTATION_BANK=[
  {topic:'一般现在时',zh:'去（第三人称单数）',en:'goes'},
  {topic:'一般现在时',zh:'喜欢（第三人称单数）',en:'likes'},
  {topic:'现在进行时',zh:'正在读',en:'reading'},
  {topic:'现在进行时',zh:'正在看（电视）',en:'watching'},
  {topic:'一般过去时',zh:'去（过去式）',en:'went'},
  {topic:'一般过去时',zh:'看（过去式）',en:'watched'},
  {topic:'现在完成时',zh:'完成（过去分词）',en:'finished'},
  {topic:'be动词',zh:'是（I 对应）',en:'am'},
  {topic:'be动词',zh:'是（they 对应）',en:'are'},
  {topic:'一般将来时',zh:'将会',en:'will'},
  {topic:'连词',zh:'因为',en:'because'},
  {topic:'连词',zh:'所以',en:'so'},
  {topic:'形容词',zh:'更高的',en:'taller'},
  {topic:'形容词',zh:'最高的',en:'tallest'},
  {topic:'副词',zh:'快速地',en:'quickly'}
];

const TOPIC_ORDER=[...new Set(QUESTION_BANK.map(q=>q.topic))];

const TOPIC_EXPLAIN={
  '名词冠词':{
    rule:'可数名词单数通常要有冠词；首次提及常用a/an，特指或上文提过用the。',
    ex:['I saw a dog in the park. The dog was very cute.','An apple a day keeps the doctor away.']
  },
  '代词':{
    rule:'主语位置用主格(I/he/they)；动词或介词后用宾格(me/him/them)；名词前用物主代词(my/his/their)。',
    ex:['She gave me a pen.','This is my book, and that is his.']
  },
  '介词':{
    rule:'时间点用at，日期/星期用on，月份年份用in；地点in(内部)、on(表面)、at(点位)。',
    ex:['I get up at 7:00.','We have class on Monday.','She was born in 2010.']
  },
  'be动词':{
    rule:'I-am；you/we/they-are；he/she/it-is。否定在be后加not，疑问把be提前。',
    ex:['I am a student.','They are not busy.','Is he your teacher?']
  },
  'there be':{
    rule:'there be 表“某地有某物”，就近一致：后接单数/不可数用is，复数用are。',
    ex:['There is a book on the desk.','There are two books on the desk.']
  },
  '一般现在时':{
    rule:'表示习惯、事实。三单主语动词加s/es；否定疑问借助do/does。',
    ex:['He goes to school every day.','She does not like milk.','Does he play football?']
  },
  '现在进行时':{
    rule:'be + doing，表示“正在发生”的动作。',
    ex:['I am reading now.','They are playing basketball.','Is she watching TV?']
  },
  '一般将来时':{
    rule:'will + 动词原形 或 be going to + 动词原形，表示将来计划/预测。',
    ex:['I will call you tonight.','She is going to visit Beijing.']
  },
  '一般过去时':{
    rule:'过去时间发生的动作，用过去式；did后用动词原形。',
    ex:['I went to school yesterday.','Did you watch TV last night?']
  },
  '现在完成时':{
    rule:'have/has + 过去分词，强调过去动作对现在的影响或经历。',
    ex:['I have finished my homework.','Have you ever been to Shanghai?']
  },
  '形容词':{
    rule:'形容词修饰名词；两者比较用比较级，三者以上用最高级。',
    ex:['Tom is taller than Jim.','This is the tallest building here.']
  },
  '副词':{
    rule:'副词修饰动词/形容词/副词；常见ly形式。',
    ex:['She runs quickly.','He speaks very clearly.']
  },
  '连词':{
    rule:'and并列，but转折，because原因，so结果。',
    ex:['I was tired, so I slept early.','I stayed home because it rained.']
  },
  '句型':{
    rule:'先判句型再判断成分：主系表、主谓、主谓宾、双宾、宾补。',
    ex:['She is a nurse.（主系表）','He likes music.（主谓宾）']
  },
  '语气':{
    rule:'陈述句陈述事实；疑问句提问；祈使句多为动词原形开头；感叹句常用What/How。',
    ex:['Open the door, please.（祈使）','What a nice day!（感叹）']
  }
};

const state=load();
const meta=document.getElementById('meta');
const view=document.getElementById('view');
const quickGrammarBtn=document.getElementById('quickGrammar');
const selectDayBtn=document.getElementById('selectDayBtn');
if(quickGrammarBtn){ quickGrammarBtn.addEventListener('click', openGrammarPanel); }
if(selectDayBtn){
  selectDayBtn.addEventListener('click', ()=>{
    const cur = localStorage.getItem(DAY_NUMBER_KEY) || '1';
    const v = prompt('输入学习第几天（1/2/3/4/5...），留空=恢复今天', cur) || '';
    if(!v.trim()){
      localStorage.removeItem(DAY_NUMBER_KEY);
      alert('已恢复为今天学习进度。');
      location.reload();
      return;
    }
    const n=Number(v.trim());
    if(!Number.isInteger(n) || n<1){ alert('请输入正整数天数，如 1、2、3'); return; }
    localStorage.setItem(DAY_NUMBER_KEY, String(n));
    alert(`已切换到第${n}天，页面将刷新。`);
    location.reload();
  });
}

function buildExplainHtml(topic){
  const d=lessonExplain(topic);
  return `<div class='card'>
    <h3>${topic}</h3>
    <p><b>详细讲解：</b>${d.rule}</p>
    <p><b>例句1：</b>${d.ex[0]||''}</p>
    <p><b>例句2：</b>${d.ex[1]||''}</p>
  </div>`;
}

function openGrammarPanel(){
  // 按用户要求：语法讲解直接显示71课通俗详解（替代旧内容）
  openLessonGuide();
}

function closeGrammarPanel(){
  if(currentQ()) render(); else showIntro();
}

let LESSON_GUIDE_CACHE=null;

async function loadLessonGuide(){
  if(LESSON_GUIDE_CACHE) return LESSON_GUIDE_CACHE;
  let txt = (typeof window!=='undefined' && window.LESSON_GUIDE_MD) ? window.LESSON_GUIDE_MD : '';
  if(!txt){
    const url='71章节通俗版-逐课.md?v=1';
    txt=await fetch(url).then(r=>r.text());
  }
  const sections=[];
  const regex=/^(?:##\s*)?Lesson\s*(\d+)\s+(.+)$/gm;
  let m, indices=[];
  while((m=regex.exec(txt))!==null){
    indices.push({num:Number(m[1]),title:m[2].trim(),idx:m.index,headLen:m[0].length});
  }
  for(let i=0;i<indices.length;i++){
    const cur=indices[i];
    const next=indices[i+1];
    const start=cur.idx+cur.headLen;
    const end=next?next.idx:txt.length;
    const body=txt.slice(start,end).trim();
    sections.push({num:cur.num,title:cur.title,body});
  }
  LESSON_GUIDE_CACHE=sections;
  return sections;
}

function formatGuideBody(body){
  return body
    .replace(/\n- /g,'<br>• ')
    .replace(/^-/,'•')
    .replace(/\n/g,'<br>');
}

async function openLessonGuide(){
  try{
    const lessons=await loadLessonGuide();
    if(!lessons.length){
      view.innerHTML=`<div class='card'><h3>通俗详解</h3><p>未找到逐课讲解内容。</p></div><button class='next' onclick='closeGrammarPanel()'>返回做题</button>`;
      return;
    }

    const options=lessons.map(x=>`<option value='${x.num}'>Lesson ${x.num} ${x.title}</option>`).join('');
    view.innerHTML=`
      <div class='card'>
        <h3>语法讲解（逐课通俗版）</h3>
        <p>每课含：概念解释 / 比喻 / 人话 / 核心句型 / 英语避坑</p>
        <select id='lessonPick' style='width:100%;padding:8px;margin:8px 0;'>${options}</select>
        <div id='lessonGuideBox' style='text-align:left;line-height:1.7;'></div>
      </div>
      <div class='row'>
        <button id='prevLesson'>上一课</button>
        <button id='nextLesson'>下一课</button>
      </div>
      <button class='next' onclick='closeGrammarPanel()'>返回做题</button>
    `;

    const pick=document.getElementById('lessonPick');
    const box=document.getElementById('lessonGuideBox');
    const prevBtn=document.getElementById('prevLesson');
    const nextBtn=document.getElementById('nextLesson');

    const renderOne=(num)=>{
      const i=lessons.findIndex(x=>x.num===Number(num));
      const item=lessons[i<0?0:i];
      pick.value=String(item.num);
      box.innerHTML=`<h4>Lesson ${item.num} ${item.title}</h4><div>${formatGuideBody(item.body)}</div>`;
      prevBtn.disabled=item.num<=1;
      nextBtn.disabled=item.num>=lessons.length;
    };

    pick.addEventListener('change',()=>renderOne(Number(pick.value)));
    prevBtn.addEventListener('click',()=>renderOne(Math.max(1,Number(pick.value)-1)));
    nextBtn.addEventListener('click',()=>renderOne(Math.min(lessons.length,Number(pick.value)+1)));

    renderOne(1);
  }catch(e){
    view.innerHTML=`<div class='card'><h3>通俗详解</h3><p>加载失败：${String(e)}</p></div><button class='next' onclick='closeGrammarPanel()'>返回做题</button>`;
  }
}

function getStartDate(){
  const saved=localStorage.getItem(START_DATE_KEY);
  if(saved && /^\d{4}-\d{2}-\d{2}$/.test(saved)) return new Date(saved+'T00:00:00');
  const now=new Date();
  const ymd=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
  localStorage.setItem(START_DATE_KEY, ymd);
  return new Date(ymd+'T00:00:00');
}
function effectiveDate(){
  const n=Number(localStorage.getItem(DAY_NUMBER_KEY)||0);
  if(n>=1){
    const d=getStartDate();
    d.setDate(d.getDate()+n-1);
    return d;
  }
  return new Date();
}
function today(){
  const d=effectiveDate();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function dayNum(){return Math.floor(effectiveDate().getTime()/86400000)}
function shuffle(arr){const a=[...arr];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a}
function save(){const s=JSON.stringify(state);localStorage.setItem(KEY,s);localStorage.setItem(BACKUP_KEY,s)}

function load(){
  const base={day:'',mode:'learn',queue:[],done:0,attempts:0,score:0,wrongTopics:{},wrongRules:{},history:[],round:1,nextRoundQueue:[],schedule:{startDay:dayNum(),todayTopics:[],reviewMode:false}};
  try{return Object.assign(base,JSON.parse(localStorage.getItem(KEY)||localStorage.getItem(BACKUP_KEY)||'{}'));}
  catch{return base;}
}

function getRecentAccuracy(){
  const h=(state.history||[]).slice(-3);
  if(!h.length) return 75;
  const vals=h.map(x=>x.attempts?Math.round((TARGET_CORRECT/x.attempts)*100):75);
  return Math.round(vals.reduce((a,b)=>a+b,0)/vals.length);
}

function getEbbinghausReviewTopics(offset){
  // 艾宾浩斯间隔：1/2/4/7/15天
  const intervals=[1,2,4,7,15];
  const out=[];
  for(const gap of intervals){
    const idx=offset-gap;
    if(idx<0) continue;
    out.push(...pickNewTopicsByIndex(idx));
  }
  return [...new Set(out)];
}

function buildTopicPlanForToday(){
  const dn=dayNum();
  const offset = dn - (state.schedule.startDay || dn);
  const cycleDay = ((offset % 4) + 4) % 4; // 0,1,2 新学；3 复习

  if(cycleDay===3){
    // 第4天：复习前3天 + 艾宾浩斯回顾点
    const t1 = pickNewTopicsByIndex(offset-3);
    const t2 = pickNewTopicsByIndex(offset-2);
    const t3 = pickNewTopicsByIndex(offset-1);
    const base=[...new Set([...t1,...t2,...t3])];
    const eb=getEbbinghausReviewTopics(offset).filter(x=>!base.includes(x));
    const topics=[...base,...eb].slice(0,12);
    return {reviewMode:true, topics, newTopics:[], reviewTopics:topics};
  }

  const newTopics = pickNewTopicsByIndex(offset);
  const reviewTopics = getEbbinghausReviewTopics(offset).filter(x=>!newTopics.includes(x)).slice(0,6);
  const topics=[...newTopics,...reviewTopics];
  return {reviewMode:false, topics, newTopics, reviewTopics};
}

function pickNewTopicsByIndex(offset){
  // 每个新学日固定3个知识点，按顺序滚动
  const dayIdx = Math.floor(Math.max(offset,0) / 1); // 每天推进
  const start = (dayIdx * 3) % TOPIC_ORDER.length;
  return [TOPIC_ORDER[start], TOPIC_ORDER[(start+1)%TOPIC_ORDER.length], TOPIC_ORDER[(start+2)%TOPIC_ORDER.length]];
}

function pickChoiceFromTopics(topics, count){
  const pool=shuffle(QUESTION_BANK.filter(q=>topics.includes(q.topic)));
  const out=[]; const seen=new Set();
  for(const item of pool){
    if(seen.has(item.q)) continue;
    out.push({...item,type:'choice',_id:Math.random().toString(36).slice(2)});
    seen.add(item.q);
    if(out.length>=count) break;
  }
  return out;
}

function buildDailyQueue(topics, newTopics=[], reviewTopics=[]){
  const choiceTarget = TARGET_CORRECT - DICTATION_COUNT;

  const primaryTopics = newTopics.length ? newTopics : topics.slice(0,3);
  const spacedTopics = reviewTopics.length ? reviewTopics : topics.filter(t=>!primaryTopics.includes(t));

  const acc=getRecentAccuracy();
  let primaryChoiceTarget = spacedTopics.length ? 26 : choiceTarget;
  if(spacedTopics.length){
    if(acc<70) primaryChoiceTarget = 18;      // 低准确率：多复习
    else if(acc>85) primaryChoiceTarget = 30; // 高准确率：多新题
  }
  const reviewChoiceTarget = choiceTarget - primaryChoiceTarget;

  let choices=[
    ...pickChoiceFromTopics(primaryTopics, primaryChoiceTarget),
    ...pickChoiceFromTopics(spacedTopics, reviewChoiceTarget)
  ];

  if(choices.length<choiceTarget){
    const fallback=shuffle(QUESTION_BANK);
    let i=0;
    while(choices.length<choiceTarget && fallback.length){
      const item=fallback[i%fallback.length];
      choices.push({...item,type:'choice',_id:Math.random().toString(36).slice(2)});
      i++;
    }
  }

  // 10道中文->英文拼写：新学6 + 复习4（有复习点时）
  const dictPrimaryTarget = spacedTopics.length ? 6 : DICTATION_COUNT;
  const dictReviewTarget = DICTATION_COUNT - dictPrimaryTarget;
  const dict=[];

  const dictPrimary=shuffle(DICTATION_BANK.filter(x=>primaryTopics.includes(x.topic)));
  const dictReview=shuffle(DICTATION_BANK.filter(x=>spacedTopics.includes(x.topic)));

  for(const d of dictPrimary){
    dict.push({type:'dictation',topic:d.topic,q:`根据中文写英文：${d.zh}`,en:d.en,_id:Math.random().toString(36).slice(2)});
    if(dict.length>=dictPrimaryTarget) break;
  }
  for(const d of dictReview){
    dict.push({type:'dictation',topic:d.topic,q:`根据中文写英文：${d.zh}`,en:d.en,_id:Math.random().toString(36).slice(2)});
    if(dict.length>=DICTATION_COUNT) break;
  }
  while(dict.length<DICTATION_COUNT){
    const d = DICTATION_BANK[dict.length % DICTATION_COUNT] || DICTATION_BANK[0];
    dict.push({type:'dictation',topic:d.topic,q:`根据中文写英文：${d.zh}`,en:d.en,_id:Math.random().toString(36).slice(2)});
  }

  return shuffle([...choices.slice(0,choiceTarget),...dict]).slice(0,TARGET_CORRECT);
}

function ensureSession(){
  const t=today();
  if(state.day!==t){
    state.day=t;state.done=0;state.attempts=0;state.score=0;state.wrongTopics={};state.wrongRules={};state.round=1;state.nextRoundQueue=[];

    const plan=buildTopicPlanForToday();
    state.schedule.todayTopics=(plan.newTopics&&plan.newTopics.length)?plan.newTopics:plan.topics.slice(0,3);
    state.schedule.reviewTopics=plan.reviewTopics||[];
    state.schedule.allTopics=plan.topics;
    state.schedule.reviewMode=plan.reviewMode;
    state.mode=plan.reviewMode?'review':'learn';

    state.queue=buildDailyQueue(plan.topics, plan.newTopics||[], plan.reviewTopics||[]);
    save();
  }
}

function lessonExplain(topic){
  const base = `本节聚焦：${topic}。学习顺序建议为“先概念—再规则—后例句—再对比易错点—最后做题巩固”。`;
  const t = String(topic);
  if(t.includes('名词')) return {rule:`${base} 重点理解可数/不可数、单复数变化、名词在句子中作主语/宾语/表语的常见位置。注意集合名词与复合名词的用法差异。`,ex:['The students are in the classroom.','Water is important for life.']};
  if(t.includes('冠词')) return {rule:`${base} 重点区分 a/an/the 与零冠词：首次提及常用a/an，再次提及或特指用the；抽象、泛指复数和部分固定搭配常用零冠词。`,ex:['I saw a cat. The cat was under the chair.','She goes to school by bus.']};
  if(t.includes('代词')) return {rule:`${base} 主格作主语，宾格作宾语，形容词性物主代词后接名词，名词性物主代词单独使用。做题时先判断“空格在句中充当什么成分”。`,ex:['She gave me her book.','This pen is mine.']};
  if(t.includes('介词')) return {rule:`${base} 时间介词先看“点/日/月年”：at/on/in；地点介词先看“点位/表面/内部”：at/on/in；再结合固定搭配整体记忆。`,ex:['We meet at 7:30 on Monday in May.','The picture is on the wall and the cat is in the box.']};
  if(t.includes('be 动词')||t.includes('be动词')) return {rule:`${base} 核心是主谓一致：I-am，you/we/they-are，he/she/it-is。否定在be后加not，疑问将be提前。`,ex:['They are not busy today.','Is he your classmate?']};
  if(t.includes('there be')) return {rule:`${base} there be 表示“某地有某物”，遵循就近一致；陈述、否定、疑问句型都要会。并与have/has（某人有）区分。`,ex:['There is a book on the desk.','Are there any apples in the bag?']};
  if(t.includes('一般现在时')) return {rule:`${base} 表习惯、事实、规律。三单主语动词加-s/-es；否定和疑问借助do/does。常见时间标志：always, usually, every day。`,ex:['He goes to school every day.','Does she like music?']};
  if(t.includes('现在进行时')) return {rule:`${base} 结构是 be + doing，表示此刻正在发生。常见标志：now, look, listen。注意动词-ing拼写变化。`,ex:['They are playing basketball now.','Look! The baby is sleeping.']};
  if(t.includes('一般将来时')) return {rule:`${base} 常用 will + 动词原形 / be going to + 动词原形。前者偏临时决定或判断，后者偏计划安排。`,ex:['I will call you tonight.','She is going to visit Lisbon next week.']};
  if(t.includes('一般过去时')) return {rule:`${base} 表过去发生并结束的动作。规则动词-ed，不规则动词单独记；含did的否定/疑问后接动词原形。`,ex:['I went there yesterday.','Did you watch the game last night?']};
  if(t.includes('现在完成时')) return {rule:`${base} 结构 have/has + 过去分词，强调过去动作对现在的影响或经历。常见词：already, yet, ever, never, since, for。`,ex:['I have finished my homework.','Have you ever been to Porto?']};
  if(t.includes('形容词')) return {rule:`${base} 形容词修饰名词或作表语；比较级用于两者比较，最高级用于三者及以上。注意规则变化与不规则变化。`,ex:['This book is more interesting than that one.','She is the tallest in her class.']};
  if(t.includes('副词')) return {rule:`${base} 副词主要修饰动词/形容词/副词，常见-ly形式。先判断被修饰对象，再选词性。`,ex:['He speaks English clearly.','She runs very quickly.']};
  if(t.includes('连词')) return {rule:`${base} 并列连词连接并列成分，从属连词引导从句。做题先判逻辑关系：并列、转折、因果、条件。`,ex:['I was tired, so I went to bed early.','I stayed home because it rained.']};
  if(t.includes('句子类型')||t.includes('句型')||t.includes('语气')) return {rule:`${base} 先识别句子功能（陈述/疑问/祈使/感叹），再分析结构（主系表、主谓、主谓宾、双宾、宾补）。`,ex:['Open the window, please.','What a wonderful day it is!']};
  return {rule:`${base} 建议先掌握定义与基本结构，再通过正反例对比易错点，最后用20题形成稳定记忆。`,ex:['Please read the sentence carefully.','Try to explain why each option is right or wrong.']};
}

function renderIntroTopics(){
  return state.schedule.todayTopics.slice(0,3).map((topic,idx)=>{
    const d=lessonExplain(topic);
    return `<div class='card'>
      <h3>语法重点 ${idx+1}：${topic}</h3>
      <p><b>详细讲解：</b>${d.rule}</p>
      <p><b>例句1：</b>${d.ex[0]||''}</p>
      <p><b>例句2：</b>${d.ex[1]||''}</p>
    </div>`;
  }).join('');
}

function showIntro(){
  // 按用户要求：语法首页直接展示完整语法讲解内容
  openLessonGuide();
}

function startWrongDrill(){
  const topTopics=Object.entries(state.wrongTopics||{}).sort((a,b)=>b[1]-a[1]).slice(0,3).map(x=>x[0]);
  if(!topTopics.length) return;
  state.mode='review';
  state.queue=buildDailyQueue(topTopics, [], topTopics).slice(0,30);
  state.done=0; state.attempts=0; state.score=0;
  render();
}

function startSession(){ render(); }
function currentQ(){ return state.queue[0]; }

function render(){
  const item=currentQ(); if(!item){ finish(); return; }
  const accuracy=state.attempts?Math.round((state.done/state.attempts)*100):100;
  meta.textContent=`${state.mode==='review'?'复习模式':'学习模式'} · 第${state.round||1}遍 · 已正确 ${state.done}/${TARGET_CORRECT} · 尝试 ${state.attempts} · 当前正确率 ${accuracy}%`;

  if(item.type==='dictation'){
    view.innerHTML=`<div class='card'>
      <h3>${item.q}</h3>
      <input id='spellInput' class='spell' placeholder='请输入英文单词或短语' autocomplete='off' />
      <button class='next' onclick='submitSpell()'>提交</button>
    </div>`;
    const input=document.getElementById('spellInput');
    input.focus();
    input.addEventListener('keydown',e=>{if(e.key==='Enter')submitSpell();});
    return;
  }

  view.innerHTML=`<div class='card'>
    <h3>${item.q}</h3>
    <div id='opts'></div>
  </div>`;
  const opts=document.getElementById('opts');
  item.a.forEach((t,i)=>{const b=document.createElement('button');b.className='opt';b.textContent=t;b.onclick=()=>judge(i);opts.appendChild(b);});
}

function replacementSameTopic(topic, excludeQ){
  const pool=QUESTION_BANK.filter(q=>q.topic===topic && q.q!==excludeQ);
  const src=pool.length?pool:QUESTION_BANK;
  const pick=src[Math.floor(Math.random()*src.length)];
  return {...pick,type:'choice',_id:Math.random().toString(36).slice(2)};
}

function submitSpell(){
  const item=currentQ();
  if(!item || item.type!=='dictation') return;
  const input=(document.getElementById('spellInput')?.value||'').trim().toLowerCase();
  const ok = input === String(item.en).toLowerCase();
  judge(ok ? item.ok : -1, ok, input);
}

function judge(i, forceOk=null, userInput=''){
  const item=currentQ();
  const ok=forceOk===null ? (i===item.ok) : forceOk;
  state.attempts++;
  state.queue.shift();

  const explain = item.rule || (item.type==='dictation' ? '拼写题需与标准答案完全一致（忽略大小写）。' : '先判断句型和语法点，再排除干扰项。');
  if(ok){
    state.done++;
    state.score+=2;
  }else{
    state.wrongTopics[item.topic]=(state.wrongTopics[item.topic]||0)+1;
    state.wrongRules[explain]=(state.wrongRules[explain]||0)+1;
    state.nextRoundQueue.push(item);
  }

  const rightAns = item.type==='dictation' ? item.en : item.a[item.ok];
  const wrongTip = item.type==='dictation' && userInput ? `，你写的是：${userInput}` : '';
  view.innerHTML+=`<div class='card ${ok?'ok':'bad'}'>${ok?'✅ 正确':'❌ 错误，已加入同类重做'}${wrongTip}，答案：${rightAns}${ok?'':`<br/><b>错因解释：</b>${explain}`}</div><button class='next' onclick='nextQ()'>下一题</button>`;
  save();
}

function dedupByQuestion(list){
  const m=new Map();
  for(const x of list){ if(x&&x.q&&!m.has(x.q)) m.set(x.q,x); }
  return [...m.values()];
}

function advanceRoundOrFinish(){
  if(state.queue.length>0) return render();

  const wrongNext = dedupByQuestion(state.nextRoundQueue||[]);
  if(wrongNext.length>0){
    state.round = (state.round||1) + 1;
    state.queue = shuffle(wrongNext);
    state.nextRoundQueue = [];
    save();
    view.innerHTML=`<div class='card bad'>
      <h3>进入第${state.round}遍</h3>
      <p>上一遍有 ${wrongNext.length} 道错题，已自动加入本遍继续作答。</p>
      <button class='next' onclick='render()'>继续</button>
    </div>`;
    return;
  }

  finish();
}

function nextQ(){
  if(state.done>0 && state.done%10===0 && state.queue.length>0){
    const accuracy=Math.round((state.done/state.attempts)*100);
    view.innerHTML=`<div class='card'>
      <h3>📌 阶段小结</h3>
      <p>第${state.round||1}遍 · 已正确：${state.done}/${TARGET_CORRECT}</p>
      <p>当前正确率：${accuracy}%</p>
      <button class='next' onclick='render()'>继续</button>
    </div>`;
    return;
  }
  advanceRoundOrFinish();
}

function finish(){
  const weak=Object.entries(state.wrongTopics).sort((a,b)=>b[1]-a[1]).slice(0,5);
  const weakRules=Object.entries(state.wrongRules||{}).sort((a,b)=>b[1]-a[1]).slice(0,3);
  state.history.push({day:state.day,mode:state.mode,score:state.score,attempts:state.attempts,weak,weakRules,topics:state.schedule.todayTopics});
  view.innerHTML=`<div class='card ok'>
    <h2>✅ 今日完成任务</h2>
    <p>完成遍数：第${state.round||1}遍结束（本遍0错误）</p>
    <p>累计答对：${state.done}/${TARGET_CORRECT}</p>
    <p>总尝试：${state.attempts}</p>
    <p>得分：${state.score}</p>
    <p><b>薄弱知识点：</b>${weak.length?weak.map(x=>`${x[0]}(${x[1]})`).join('、'):'无'}</p>
    <p><b>高频错因：</b>${weakRules.length?weakRules.map(x=>`${x[0]}(${x[1]})`).join('；'):'无'}</p>
    <button class='next' onclick='restartToday()'>再做一轮</button>
  </div>`;
  save();
}

function restartToday(){
  state.done=0; state.attempts=0; state.score=0; state.wrongTopics={}; state.wrongRules={}; state.round=1; state.nextRoundQueue=[];
  state.queue=buildDailyQueue(
    state.schedule.allTopics || state.schedule.todayTopics,
    state.schedule.todayTopics || [],
    state.schedule.reviewTopics || []
  );
  save(); showIntro();
}

window.startSession=startSession;
window.nextQ=nextQ;
window.restartToday=restartToday;
window.render=render;
window.submitSpell=submitSpell;
window.openGrammarPanel=openGrammarPanel;
window.closeGrammarPanel=closeGrammarPanel;
window.startWrongDrill=startWrongDrill;

ensureSession();
showIntro();