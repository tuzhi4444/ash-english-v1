(() => {
  const KEY = 'word_game_v2';
  const BACKUP_KEY = 'word_game_v2_backup';
  const LEGACY_KEYS = ['word_card_game_v1', 'word_game_v1'];
  const BASE_ROUND = 20;

  const $ = id => document.getElementById(id);
  const el = {
    score: $('score'), highScore: $('highScore'), streak: $('streak'), currentQ: $('currentQ'), totalQ: $('totalQ'), remain: $('remain'), modeInfo: $('modeInfo'),
    card: $('card'), prompt: $('prompt'), answer: $('answer'),
    flip: $('flip'), know: $('know'), blur: $('blur'), dont: $('dont'),
    gameView: $('gameView'), resultView: $('resultView'),
    rScore: $('rScore'), rHigh: $('rHigh'), rKnow: $('rKnow'), rBlur: $('rBlur'), rDont: $('rDont'), rStreak: $('rStreak'), rRuns: $('rRuns'), rNew: $('rNew'),
    restart: $('restart'), replayWrong: $('replayWrong'),
    modeCard: $('modeCard'), modeDictation: $('modeDictation'), modeSpelling: $('modeSpelling'), today50: $('today50'), continueBtn: $('continueBtn'), tomorrowBtn: $('tomorrowBtn'),
    statsBtn: $('statsBtn'), masteredMgrBtn: $('masteredMgrBtn'), wrongDrillBtn: $('wrongDrillBtn'),
    exportBtn: $('exportBtn'), importBtn: $('importBtn'), importFile: $('importFile'), customVocabBtn: $('customVocabBtn'), customVocabFile: $('customVocabFile'),
    tomorrowPanel: $('tomorrowPanel'), tomorrowNewCount: $('tomorrowNewCount'), tomorrowReviewCount: $('tomorrowReviewCount'), tomorrowNewList: $('tomorrowNewList'), tomorrowReviewList: $('tomorrowReviewList'),
    statsPanel: $('statsPanel'), statsRuns: $('statsRuns'), statsHigh: $('statsHigh'), statsMastered: $('statsMastered'), statsFav: $('statsFav'),
    masteredPanel: $('masteredPanel'), masteredList: $('masteredList'),
    speakEn: $('speakEn'), speakZh: $('speakZh'), favCurrent: $('favCurrent'), masterCurrent: $('masterCurrent'), autoSpeak: $('autoSpeak'),
    dictationBox: $('dictationBox'), dictInput: $('dictInput'), checkInput: $('checkInput'), dictResult: $('dictResult')
  };

  const store = load();
  let state = {};

  function normalizeStore(raw) {
    const d = {
      highScore: 0,
      totalRuns: 0,
      mastery: {},
      ebbinghaus: { cursor: 0, progress: {}, lastPlanDate: '', todayQueue: [] },
      favorites: {},
      mastered: {},
      customWords: []
    };
    const x = Object.assign({}, d, raw || {});
    x.ebbinghaus = Object.assign({}, d.ebbinghaus, x.ebbinghaus || {});
    x.ebbinghaus.progress = x.ebbinghaus.progress || {};
    x.ebbinghaus.todayQueue = x.ebbinghaus.todayQueue || [];
    x.favorites = x.favorites || {};
    x.mastered = x.mastered || {};
    x.mastery = x.mastery || {};
    x.customWords = Array.isArray(x.customWords) ? x.customWords : [];
    return x;
  }

  function load() {
    // 1) current key
    try {
      const cur = localStorage.getItem(KEY);
      if (cur) return normalizeStore(JSON.parse(cur));
    } catch {}

    // 2) backup key
    try {
      const b = localStorage.getItem(BACKUP_KEY);
      if (b) {
        const data = normalizeStore(JSON.parse(b));
        localStorage.setItem(KEY, JSON.stringify(data));
        return data;
      }
    } catch {}

    // 3) migrate legacy keys
    for (const lk of LEGACY_KEYS) {
      try {
        const v = localStorage.getItem(lk);
        if (v) {
          const data = normalizeStore(JSON.parse(v));
          localStorage.setItem(KEY, JSON.stringify(data));
          localStorage.setItem(BACKUP_KEY, JSON.stringify(data));
          return data;
        }
      } catch {}
    }

    return normalizeStore({});
  }
  function save() {
    const s = JSON.stringify(store);
    localStorage.setItem(KEY, s);
    localStorage.setItem(BACKUP_KEY, s);
  }

  function getWordList() {
    const base = Array.isArray(WORDS) ? WORDS : [];
    const custom = Array.isArray(store.customWords) ? store.customWords : [];
    if (!custom.length) return base;
    const map = new Map();
    for (const w of [...base, ...custom]) {
      if (!w || !w.en) continue;
      map.set(String(w.en).trim().toLowerCase(), { zh: String(w.zh || '').trim(), en: String(w.en).trim() });
    }
    return [...map.values()];
  }

  function persistProgress() {
    if (!state || !state.deck || !state.deck.length) return;
    store.resume = {
      date: todayStr(),
      mode: state.mode,
      deckEn: state.deck.map(w => w.en),
      idx: state.idx,
      score: state.score,
      streak: state.streak,
      maxStreak: state.maxStreak,
      know: state.know,
      blur: state.blur,
      dont: state.dont,
      wrongEns: [...state.wrongMap.keys()],
      autoSpeak: state.autoSpeak
    };
    save();
  }

  function hasResumeToday() {
    const r = store.resume;
    return Boolean(r && r.date === todayStr() && r.deckEn && r.deckEn.length);
  }

  function tryRestoreProgress(mode) {
    const r = store.resume;
    if (!r || r.date !== todayStr() || r.mode !== mode) return null;
    const dict = new Map(getWordList().map(w => [w.en, w]));
    const deck = (r.deckEn || []).map(en => dict.get(en)).filter(Boolean);
    if (!deck.length) return null;
    const wrongMap = new Map();
    (r.wrongEns || []).forEach(en => {
      const w = dict.get(en);
      if (w) wrongMap.set(en, w);
    });
    return {
      mode,
      pool: deck,
      deck,
      idx: Math.min(r.idx || 0, deck.length - 1),
      revealed: false,
      score: r.score || 0,
      streak: r.streak || 0,
      maxStreak: r.maxStreak || 0,
      know: r.know || 0,
      blur: r.blur || 0,
      dont: r.dont || 0,
      wrongMap,
      checkedInput: false,
      autoSpeak: Boolean(r.autoSpeak)
    };
  }

  const EBB_GAPS = [1, 2, 4, 7, 15]; // 简化版艾宾浩斯间隔
  const DAILY_NEW = 20;
  const DAILY_MAX = 120;

  function todayStr() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }
  function addDays(dateStr, n) {
    const d = new Date(dateStr + 'T00:00:00');
    d.setDate(d.getDate() + n);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }

  function getTomorrowPlan() {
    const tmr = addDays(todayStr(), 1);
    const e = store.ebbinghaus;

    const reviewIdx = [];
    for (let i = 0; i < getWordList().length; i++) {
      if (store.mastered && store.mastered[getWordList()[i].en]) continue;
      const p = e.progress[getWordList()[i].en];
      if (p && p.nextDue === tmr) reviewIdx.push(i);
    }

    // 估算明日新词：按当前 cursor 往后取 20
    const newIdx = [];
    let c = e.cursor || 0;
    while (newIdx.length < DAILY_NEW && c < getWordList().length) {
      if (!(store.mastered && store.mastered[getWordList()[c].en])) newIdx.push(c);
      c += 1;
    }

    return {
      review: reviewIdx.map(i => getWordList()[i]),
      fresh: newIdx.map(i => getWordList()[i])
    };
  }

  function renderWordCards(container, list, emptyText='无') {
    if (!container) return;
    if (!list.length) {
      container.innerHTML = `<div class="item"><div class="left"><div class="zh">${emptyText}</div></div></div>`;
      return;
    }
    container.innerHTML = list.map(w => {
      const on = isFav(w);
      return `<div class="item" data-en="${w.en}">
        <div class="left"><div class="zh">${w.zh}</div><div class="en">${w.en}</div></div>
        <button class="fav-btn ${on ? 'fav-on':''}" data-fav="${w.en}">${on ? '★':'☆'}</button>
      </div>`;
    }).join('');
  }

  function renderTomorrowPlan() {
    if (!el.tomorrowPanel) return;
    const p = getTomorrowPlan();
    el.tomorrowNewCount.textContent = p.fresh.length;
    el.tomorrowReviewCount.textContent = p.review.length;
    renderWordCards(el.tomorrowNewList, p.fresh.slice(0, 120), '明日无新词');
    renderWordCards(el.tomorrowReviewList, p.review.slice(0, 120), '明日无复习词');
  }

  function renderStats() {
    if (!el.statsPanel) return;
    const mastered = Object.keys(store.mastered || {}).length;
    const fav = Object.keys(store.favorites || {}).length;
    el.statsRuns.textContent = store.totalRuns || 0;
    el.statsHigh.textContent = store.highScore || 0;
    el.statsMastered.textContent = mastered;
    el.statsFav.textContent = fav;
  }

  function renderMasteredManager() {
    if (!el.masteredList) return;
    const ens = Object.keys(store.mastered || {});
    if (!ens.length) {
      el.masteredList.innerHTML = '<div class="item"><div class="left"><div class="zh">暂无已掌握词</div></div></div>';
      return;
    }
    const list = ens.map(en => getWordList().find(w => w.en === en)).filter(Boolean);
    el.masteredList.innerHTML = list.map(w =>
      `<div class="item" data-unmaster="${w.en}"><div class="left"><div class="zh">${w.zh}</div><div class="en">${w.en}</div></div><button class="fav-btn">取消</button></div>`
    ).join('');
  }

  function hidePanels() {
    if (el.tomorrowPanel) el.tomorrowPanel.style.display = 'none';
    if (el.statsPanel) el.statsPanel.style.display = 'none';
    if (el.masteredPanel) el.masteredPanel.style.display = 'none';
    el.tomorrowBtn?.classList.remove('on');
    el.statsBtn?.classList.remove('on');
    el.masteredMgrBtn?.classList.remove('on');
  }

  function buildEbbinghausQueue() {
    const t = todayStr();
    const e = store.ebbinghaus;

    if (e.lastPlanDate === t && e.todayQueue.length) {
      return e.todayQueue.map(idx => getWordList()[idx]).filter(Boolean);
    }

    const due = [];
    for (let i = 0; i < getWordList().length; i++) {
      const key = getWordList()[i].en;
      if (store.mastered && store.mastered[key]) continue; // 已掌握不再复习
      const p = e.progress[key];
      if (p && p.nextDue && p.nextDue <= t) due.push(i);
    }

    // 按词表顺序 due + new
    const queueIdx = due.slice(0, DAILY_MAX);
    const remain = DAILY_MAX - queueIdx.length;
    const allowNew = Math.min(DAILY_NEW, Math.max(0, remain));

    let addNew = 0;
    while (addNew < allowNew && e.cursor < getWordList().length) {
      const w = getWordList()[e.cursor];
      if (!(store.mastered && store.mastered[w.en])) {
        queueIdx.push(e.cursor);
        addNew += 1;
      }
      e.cursor += 1;
    }

    e.lastPlanDate = t;
    e.todayQueue = queueIdx;
    save();

    return queueIdx.map(i => getWordList()[i]).filter(Boolean);
  }

  function updateEbbinghausProgress(word, type) {
    const t = todayStr();
    const e = store.ebbinghaus;
    const key = word.en;
    const old = e.progress[key] || { stage: 0, learned: t, nextDue: t };

    let stage = old.stage;
    let nextDue = old.nextDue;

    if (type === 'know') {
      stage = Math.min(stage + 1, EBB_GAPS.length - 1);
      nextDue = addDays(t, EBB_GAPS[stage]);
    } else if (type === 'blur') {
      nextDue = addDays(t, 1);
    } else {
      stage = 0;
      nextDue = addDays(t, 1);
    }

    e.progress[key] = { stage, learned: old.learned || t, nextDue };
  }

  function updateAutoSpeakBtn() {
    el.autoSpeak.textContent = `自动发音：${state.autoSpeak ? '开' : '关'}`;
    el.autoSpeak.classList.toggle('on', state.autoSpeak);
  }

  function pickVoice(langPrefix) {
    const voices = window.speechSynthesis ? window.speechSynthesis.getVoices() : [];
    return voices.find(v => (v.lang || '').toLowerCase().startsWith(langPrefix.toLowerCase())) || voices[0];
  }

  function speak(text, lang='en-US') {
    if (!('speechSynthesis' in window) || !text) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang;
    const voice = lang.startsWith('zh') ? pickVoice('zh') : pickVoice('en');
    if (voice) u.voice = voice;
    u.rate = 0.95;
    window.speechSynthesis.speak(u);
  }

  function masteryOf(w) { return Math.max(0, Number(store.mastery[w.en] || 0)); }
  function setMastery(w, v) { store.mastery[w.en] = Math.max(0, Math.floor(v)); }
  function weight(w) { return Math.max(1, 6 - Math.min(5, masteryOf(w))); }

  function isFav(w) { return Boolean(store.favorites && store.favorites[w.en]); }
  function isMastered(w) { return Boolean(store.mastered && store.mastered[w.en]); }

  function toggleFav(w) {
    if (!store.favorites) store.favorites = {};
    if (store.favorites[w.en]) delete store.favorites[w.en];
    else store.favorites[w.en] = true;
    save();
    updateFavBtn();
  }

  function toggleMastered(w) {
    if (!store.mastered) store.mastered = {};
    if (store.mastered[w.en]) delete store.mastered[w.en];
    else store.mastered[w.en] = true;
    save();
    updateMasterBtn();
  }

  function updateFavBtn() {
    const w = state.deck?.[state.idx];
    if (!w || !el.favCurrent) return;
    const on = isFav(w);
    el.favCurrent.textContent = on ? '★ 已收藏' : '☆ 收藏当前词';
    el.favCurrent.classList.toggle('on', on);
  }

  function updateMasterBtn() {
    const w = state.deck?.[state.idx];
    if (!w || !el.masterCurrent) return;
    const on = isMastered(w);
    el.masterCurrent.textContent = on ? '✅ 已掌握(已排除)' : '✅ 标记已掌握';
    el.masterCurrent.classList.toggle('on', on);
  }

  function pickWeighted(pool) {
    let total = 0; for (const w of pool) total += weight(w);
    let r = Math.random() * total;
    for (const w of pool) { r -= weight(w); if (r <= 0) return w; }
    return pool[pool.length - 1];
  }

  // 按词表顺序出题（不随机）
  function buildDeck(pool, n) {
    return pool.slice(0, n);
  }

  function init(mode = 'card', pool = getWordList(), roundSize = BASE_ROUND) {
    const restored = tryRestoreProgress(mode);
    if (restored) {
      state = restored;
      state.spellGate = null;
    } else {
      state = {
        mode, pool, deck: buildDeck(pool, Math.min(roundSize, Math.max(1, pool.length))),
        idx: 0, revealed: false,
        score: 0, streak: 0, maxStreak: 0,
        know: 0, blur: 0, dont: 0,
        wrongMap: new Map(), checkedInput: false,
        autoSpeak: Boolean(store.autoSpeak),
        spellGate: null
      };
    }
    el.totalQ.textContent = state.deck.length;
    switchView('game');
    renderCurrent();
  }

  function renderCurrent() {
    const w = state.deck[state.idx];
    state.revealed = false;
    state.checkedInput = false;
    el.card.classList.remove('revealed');
    el.prompt.textContent = w.zh;
    el.answer.textContent = w.en;
    el.dictInput.value = '';
    el.dictResult.textContent = '';

    const left = state.deck.length - state.idx;
    el.currentQ.textContent = state.idx + 1;
    el.remain.textContent = `剩余 ${left} 题`;
    el.modeInfo.textContent = state.mode === 'dictation'
      ? '听写模式（艾宾浩斯计划）'
      : state.mode === 'spelling'
        ? '拼写模式（艾宾浩斯计划）'
        : '普通模式（艾宾浩斯计划）';
    el.score.textContent = state.score;
    el.highScore.textContent = store.highScore;
    el.streak.textContent = state.streak;

    if (state.spellGate) {
      el.dictationBox.classList.remove('hidden');
      el.flip.textContent = '请先完成拼写';
      el.checkInput.textContent = '提交拼写';
      el.dictResult.textContent = `需拼写通过才可继续（${state.spellGate === 'blur' ? '模糊' : '不认识'}）`;
    } else if (state.mode === 'dictation' || state.mode === 'spelling') {
      el.dictationBox.classList.remove('hidden');
      el.flip.textContent = state.mode === 'spelling' ? '拼写后自动翻卡' : '翻卡(可跳过输入)';
      el.checkInput.textContent = state.mode === 'spelling' ? '提交拼写' : '检查';
    } else {
      el.dictationBox.classList.add('hidden');
      el.flip.textContent = '翻卡';
    }
    updateAutoSpeakBtn();
    updateFavBtn();
    updateMasterBtn();
    if (el.continueBtn) {
      el.continueBtn.disabled = !hasResumeToday();
    }
    renderTomorrowPlan();

    lockJudge(true);
    el.flip.disabled = state.mode === 'spelling' || Boolean(state.spellGate);
    persistProgress();
  }

  function lockJudge(lock) {
    el.know.disabled = lock; el.blur.disabled = lock; el.dont.disabled = lock;
  }

  function reveal() {
    if (state.revealed) return;
    state.revealed = true;
    el.card.classList.add('revealed');
    el.flip.disabled = true;
    lockJudge(false);
    if (state.autoSpeak) {
      const w = state.deck[state.idx];
      speak(w.en, 'en-US');
    }
  }

  function startSpellGate(type) {
    state.spellGate = type;
    el.dictationBox.classList.remove('hidden');
    el.dictInput.value = '';
    el.dictInput.focus();
    el.checkInput.textContent = '提交拼写';
    el.dictResult.textContent = `需拼写通过才可继续（${type === 'blur' ? '模糊' : '不认识'}）`;
    lockJudge(true);
    el.flip.disabled = true;
    persistProgress();
  }

  function checkInput() {
    if (state.mode !== 'dictation' && state.mode !== 'spelling' && !state.spellGate) return;
    const w = state.deck[state.idx];
    const user = el.dictInput.value.trim().toLowerCase();
    const ans = String(w.en).trim().toLowerCase();
    if (!user) { el.dictResult.textContent = '先输入再检查'; return; }

    const ok = user === ans;
    if (ok) {
      el.dictResult.textContent = '✅ 拼写正确';
    } else {
      el.dictResult.textContent = `❌ 你的答案: ${user}（正确：${ans}）`;
    }

    state.checkedInput = true;

    // 模糊/不认识强制拼写通过闸门
    if (state.spellGate) {
      if (!ok) return;
      const gateType = state.spellGate;
      state.spellGate = null;
      // 闸门通过后执行原评分并进入下一题
      const m = masteryOf(w);
      if (gateType === 'blur') {
        state.score += 1; state.blur++; state.streak = 0; setMastery(w, m); state.wrongMap.set(w.en, w);
      } else {
        state.dont++; state.streak = 0; setMastery(w, m - 1); state.wrongMap.set(w.en, w);
      }
      updateEbbinghausProgress(w, gateType);
      save();
      next();
      return;
    }

    if (state.mode === 'spelling') {
      // 拼写模式：提交后自动判分并下一题
      reveal();
      setTimeout(() => judge(ok ? 'know' : 'dont'), 450);
      return;
    }

    // 听写模式：先翻卡，再手动三档评价
    reveal();
  }

  function judge(type) {
    const w = state.deck[state.idx];
    const m = masteryOf(w);

    // 新规则：选择“模糊/不认识”后，必须拼写通过才进入下一题
    if ((type === 'blur' || type === 'dont') && !state.spellGate && state.mode !== 'spelling') {
      startSpellGate(type);
      return;
    }

    if (type === 'know') {
      state.score += 2; state.know++; state.streak++; state.maxStreak = Math.max(state.maxStreak, state.streak); setMastery(w, m + 1);
    } else if (type === 'blur') {
      state.score += 1; state.blur++; state.streak = 0; setMastery(w, m); state.wrongMap.set(w.en, w);
    } else {
      state.dont++; state.streak = 0; setMastery(w, m - 1); state.wrongMap.set(w.en, w);
    }
    updateEbbinghausProgress(w, type);
    save();
    next();
  }

  function next() {
    state.idx++;
    if (state.idx >= state.deck.length) return finish();
    renderCurrent();
  }

  function finish() {
    store.totalRuns++;
    const isNew = state.score > store.highScore;
    if (isNew) store.highScore = state.score;
    delete store.resume;
    save();

    el.rScore.textContent = state.score;
    el.rHigh.textContent = store.highScore;
    el.rKnow.textContent = state.know;
    el.rBlur.textContent = state.blur;
    el.rDont.textContent = state.dont;
    el.rStreak.textContent = state.maxStreak;
    el.rRuns.textContent = store.totalRuns;
    el.rNew.textContent = isNew ? '是 ✅' : '否';
    el.replayWrong.disabled = state.wrongMap.size === 0;
    el.replayWrong.textContent = state.wrongMap.size ? `再练错题（${state.wrongMap.size}）` : '再练错题（无）';

    switchView('result');
  }

  function switchView(v) {
    if (v === 'game') {
      el.gameView.classList.add('active');
      el.resultView.classList.remove('active');
    } else {
      el.gameView.classList.remove('active');
      el.resultView.classList.add('active');
    }
  }

  function setModeButton(mode) {
    el.modeCard.classList.toggle('on', mode === 'card');
    el.modeDictation.classList.toggle('on', mode === 'dictation');
    el.modeSpelling.classList.toggle('on', mode === 'spelling');
  }

  // events
  el.flip.addEventListener('click', reveal);
  el.know.addEventListener('click', () => judge('know'));
  el.blur.addEventListener('click', () => judge('blur'));
  el.dont.addEventListener('click', () => judge('dont'));
  el.checkInput.addEventListener('click', checkInput);
  el.dictInput.addEventListener('keydown', e => { if (e.key === 'Enter') checkInput(); });

  el.modeCard.addEventListener('click', () => {
    setModeButton('card');
    const q = buildEbbinghausQueue();
    init('card', q, q.length);
    hidePanels();
  });
  el.modeDictation.addEventListener('click', () => {
    setModeButton('dictation');
    const q = buildEbbinghausQueue();
    init('dictation', q, q.length);
    hidePanels();
  });
  el.modeSpelling.addEventListener('click', () => {
    setModeButton('spelling');
    const q = buildEbbinghausQueue();
    init('spelling', q, q.length);
    hidePanels();
  });
  el.today50.addEventListener('click', () => {
    const q = buildEbbinghausQueue();
    init(state.mode || 'card', q, q.length);
    hidePanels();
  });
  el.continueBtn?.addEventListener('click', () => {
    const r = store.resume;
    if (!r) return;
    const q = buildEbbinghausQueue();
    init(r.mode || (state.mode || 'card'), q, q.length);
    hidePanels();
  });
  el.tomorrowBtn?.addEventListener('click', () => {
    const show = el.tomorrowPanel.style.display !== 'none';
    hidePanels();
    if (!show) {
      renderTomorrowPlan();
      el.tomorrowPanel.style.display = 'block';
      el.tomorrowBtn.classList.add('on');
    }
  });
  el.statsBtn?.addEventListener('click', () => {
    const show = el.statsPanel.style.display !== 'none';
    hidePanels();
    if (!show) {
      renderStats();
      el.statsPanel.style.display = 'block';
      el.statsBtn.classList.add('on');
    }
  });
  el.masteredMgrBtn?.addEventListener('click', () => {
    const show = el.masteredPanel.style.display !== 'none';
    hidePanels();
    if (!show) {
      renderMasteredManager();
      el.masteredPanel.style.display = 'block';
      el.masteredMgrBtn.classList.add('on');
    }
  });
  el.wrongDrillBtn?.addEventListener('click', () => {
    const q = [...state.wrongMap.values()];
    if (!q.length) return;
    hidePanels();
    init(state.mode || 'card', q, Math.min(q.length, BASE_ROUND));
  });

  function bindListClick(listEl) {
    listEl?.addEventListener('click', (e) => {
      const fav = e.target.closest('[data-fav]');
      if (fav) {
        const en = fav.getAttribute('data-fav');
        const w = getWordList().find(x => x.en === en);
        if (w) { toggleFav(w); renderTomorrowPlan(); }
        e.stopPropagation();
        return;
      }
      const item = e.target.closest('[data-en]');
      if (!item) return;
      const en = item.getAttribute('data-en');
      const w = getWordList().find(x => x.en === en);
      if (w) {
        // 点卡片发音：优先英文
        speak(w.en, 'en-US');
      }
    });
  }
  bindListClick(el.tomorrowNewList);
  bindListClick(el.tomorrowReviewList);

  el.masteredList?.addEventListener('click', (e) => {
    const item = e.target.closest('[data-unmaster]');
    if (!item) return;
    const en = item.getAttribute('data-unmaster');
    if (store.mastered && store.mastered[en]) {
      delete store.mastered[en];
      save();
      renderMasteredManager();
      renderStats();
    }
  });

  el.speakEn.addEventListener('click', () => {
    const w = state.deck[state.idx];
    speak(w?.en || '', 'en-US');
  });
  el.speakZh.addEventListener('click', () => {
    const w = state.deck[state.idx];
    speak(w?.zh || '', 'zh-CN');
  });
  el.favCurrent?.addEventListener('click', () => {
    const w = state.deck[state.idx];
    if (w) toggleFav(w);
  });
  el.masterCurrent?.addEventListener('click', () => {
    const w = state.deck[state.idx];
    if (!w) return;
    toggleMastered(w);
    // 若当前词刚被标记为已掌握，下一次计划将自动排除
  });
  el.autoSpeak.addEventListener('click', () => {
    state.autoSpeak = !state.autoSpeak;
    store.autoSpeak = state.autoSpeak;
    save();
    updateAutoSpeakBtn();
  });

  el.restart.addEventListener('click', () => {
    const q = buildEbbinghausQueue();
    init(state.mode || 'card', q, q.length);
  });
  el.replayWrong.addEventListener('click', () => {
    const pool = [...state.wrongMap.values()];
    if (!pool.length) return;
    init(state.mode || 'card', pool, Math.min(BASE_ROUND, pool.length));
  });

  window.addEventListener('keydown', e => {
    if (!el.gameView.classList.contains('active')) return;
    if (e.code === 'Space') { e.preventDefault(); reveal(); }
    if (e.key === '1' && !el.know.disabled) judge('know');
    if (e.key === '2' && !el.blur.disabled) judge('blur');
    if (e.key === '3' && !el.dont.disabled) judge('dont');
  });

  // 进度导出/导入（防丢档）
  el.exportBtn?.addEventListener('click', () => {
    const payload = {
      version: 3,
      exportedAt: new Date().toISOString(),
      data: store
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `word-progress-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  });

  el.importBtn?.addEventListener('click', () => el.importFile?.click());
  el.importFile?.addEventListener('change', async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const txt = await f.text();
      const obj = JSON.parse(txt);
      const data = normalizeStore(obj.data || obj);
      Object.assign(store, data);
      save();
      alert('导入成功，页面将刷新。');
      location.reload();
    } catch {
      alert('导入失败：文件格式不正确');
    }
  });

  function parseCustomWords(text, name='') {
    const rows = [];
    const isJson = name.toLowerCase().endsWith('.json') || text.trim().startsWith('[');
    if (isJson) {
      const arr = JSON.parse(text);
      if (!Array.isArray(arr)) throw new Error('JSON必须是数组');
      for (const x of arr) {
        const en = String(x.en || '').trim();
        const zh = String(x.zh || '').trim();
        if (en && zh) rows.push({ en, zh });
      }
      return rows;
    }
    for (const line of text.split(/\r?\n/)) {
      const s = line.trim();
      if (!s || s.startsWith('#')) continue;
      const parts = s.includes(',') ? s.split(',') : s.split(/\s+/);
      if (parts.length < 2) continue;
      const en = String(parts[0]).trim();
      const zh = String(parts.slice(1).join(' ')).trim();
      if (en && zh) rows.push({ en, zh });
    }
    return rows;
  }

  el.customVocabBtn?.addEventListener('click', () => el.customVocabFile?.click());
  el.customVocabFile?.addEventListener('change', async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const txt = await f.text();
      const items = parseCustomWords(txt, f.name);
      if (!items.length) { alert('未识别到有效词条。请使用 JSON 或 CSV/TXT（en,zh 每行一条）'); return; }
      store.customWords = items;
      store.ebbinghaus.lastPlanDate = '';
      store.ebbinghaus.todayQueue = [];
      save();
      alert(`自定义词库导入成功：${items.length}条，已自动并入学习。`);
      const q = buildEbbinghausQueue();
      init(state.mode || 'card', q, q.length);
    } catch {
      alert('自定义词库导入失败，请检查格式。');
    } finally {
      if (el.customVocabFile) el.customVocabFile.value = '';
    }
  });

  // start（默认进入今日艾宾浩斯计划）
  setModeButton('card');
  const todayQueue = buildEbbinghausQueue();
  init('card', todayQueue, todayQueue.length);
})();
