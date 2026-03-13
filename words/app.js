(() => {
  const KEY = 'word_game_v2';
  const BACKUP_KEY = 'word_game_v2_backup';
  const DAY_NUMBER_KEY = 'ash_words_day_number';
  const START_DATE_KEY = 'ash_words_start_date';
  const LEGACY_KEYS = ['word_card_game_v1', 'word_game_v1'];
  const BASE_ROUND = 20;

  const $ = id => document.getElementById(id);
  const el = {
    score: $('score'), highScore: $('highScore'), streak: $('streak'), currentQ: $('currentQ'), totalQ: $('totalQ'), remain: $('remain'), modeInfo: $('modeInfo'),
    card: $('card'), prompt: $('prompt'), answer: $('answer'),
    flip: $('flip'), know: $('know'), dont: $('dont'),
    gameView: $('gameView'), resultView: $('resultView'),
    rScore: $('rScore'), rHigh: $('rHigh'), rKnow: $('rKnow'), rBlur: $('rBlur'), rDont: $('rDont'), rStreak: $('rStreak'), rRuns: $('rRuns'), rNew: $('rNew'),
    restart: $('restart'), replayWrong: $('replayWrong'),
    modeCard: $('modeCard'), modeDictation: $('modeDictation'), modeSpelling: $('modeSpelling'), today50: $('today50'), continueBtn: $('continueBtn'), tomorrowBtn: $('tomorrowBtn'),
    statsBtn: $('statsBtn'), masteredMgrBtn: $('masteredMgrBtn'), wrongDrillBtn: $('wrongDrillBtn'),
    exportBtn: $('exportBtn'), importBtn: $('importBtn'), importFile: $('importFile'), customVocabBtn: $('customVocabBtn'), customVocabFile: $('customVocabFile'), selectDayBtn: $('selectDayBtn'), dailyReviewBtn: $('dailyReviewBtn'),
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

      dont: r.dont || 0,
      wrongMap,
      checkedInput: false,
      autoSpeak: Boolean(r.autoSpeak)
    };
  }

  const EBB_GAPS = [1, 2, 4, 7, 15]; // 简化版艾宾浩斯间隔
  const DAILY_NEW = 20;
  const DAILY_MAX = 120;

  function buildFixedDayQueue(dayNum) {
    const words = getWordList();
    const start = (dayNum - 1) * DAILY_NEW;
    if (start >= words.length) return [];
    return words.slice(start, Math.min(start + DAILY_NEW, words.length));
  }

  function buildDayPlanQueue(dayNum) {
    const words = getWordList();
    const picked = [];
    const seen = new Set();

    const addDayChunk = (d) => {
      const start = (d - 1) * DAILY_NEW;
      const end = Math.min(start + DAILY_NEW, words.length);
      for (let i = start; i < end; i++) {
        const w = words[i];
        if (!w) continue;
        if (store.mastered && store.mastered[w.en]) continue;
        if (seen.has(w.en)) continue;
        seen.add(w.en);
        picked.push(w);
      }
    };

    // 先复习，再新学：按艾宾浩斯间隔回看前几天
    const reviewDays = EBB_GAPS.map(g => dayNum - g).filter(d => d >= 1);
    for (const d of reviewDays) addDayChunk(d);

    // 当天新词
    addDayChunk(dayNum);

    return picked.slice(0, DAILY_MAX);
  }

  function getStartDate() {
    const saved = localStorage.getItem(START_DATE_KEY);
    if (saved && /^\d{4}-\d{2}-\d{2}$/.test(saved)) return new Date(saved + 'T00:00:00');
    const now = new Date();
    const ymd = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
    localStorage.setItem(START_DATE_KEY, ymd);
    return new Date(ymd + 'T00:00:00');
  }

  function getSelectedDayNumber() {
    const n = Number(localStorage.getItem(DAY_NUMBER_KEY) || 0);
    return Number.isInteger(n) && n >= 1 ? n : 0;
  }

  function effectiveTodayDate() {
    const dayNum = getSelectedDayNumber();
    if (dayNum >= 1) {
      const d = getStartDate();
      d.setDate(d.getDate() + dayNum - 1);
      return d;
    }
    return new Date();
  }
  function todayStr() {
    const d = effectiveTodayDate();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }
  function addDays(dateStr, n) {
    const d = new Date(dateStr + 'T00:00:00');
    d.setDate(d.getDate() + n);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }

  function getTomorrowPlan() {
    const selectedDay = getSelectedDayNumber();
    if (selectedDay >= 1) {
      const tomorrowDay = selectedDay + 1;
      const fresh = buildFixedDayQueue(tomorrowDay);
      const full = buildDayPlanQueue(tomorrowDay);
      const freshSet = new Set(fresh.map(w => w.en));
      const review = full.filter(w => !freshSet.has(w.en));
      return { review, fresh };
    }

    const tmr = addDays(todayStr(), 1);
    const e = store.ebbinghaus;
    const words = getWordList();

    const reviewIdx = [];
    for (let i = 0; i < words.length; i++) {
      if (store.mastered && store.mastered[words[i].en]) continue;
      const p = e.progress[words[i].en];
      if (p && p.nextDue === tmr) reviewIdx.push(i);
    }

    const newIdx = [];
    let c = e.cursor || 0;
    while (newIdx.length < DAILY_NEW && c < words.length) {
      if (!(store.mastered && store.mastered[words[c].en])) newIdx.push(c);
      c += 1;
    }

    return {
      review: reviewIdx.map(i => words[i]),
      fresh: newIdx.map(i => words[i])
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

  function getCurrentDayNumber() {
    const e = store.ebbinghaus;
    if (!e.cursor || e.cursor === 0) return 1;
    return Math.floor(e.cursor / DAILY_NEW) + 1;
  }

  function buildEbbinghausQueue() {
    const words = getWordList();
    // 强制从第1天开始，确保词库顺序正确
    localStorage.removeItem('ash_words_day_number');
    const selectedDay = getSelectedDayNumber();

    // 选择"第N天"时：按艾宾浩斯计划（复习前几天 + 当天新词）
    if (selectedDay >= 1) {
      const planQueue = buildDayPlanQueue(selectedDay);
      const fresh = buildFixedDayQueue(selectedDay);
      store.ebbinghaus.todayFreshEns = fresh.map(w => w.en);
      return planQueue;
    }

    // 默认：按词库顺序第N天（每天20词）
    const currentDay = getCurrentDayNumber();
    const planQueue = buildDayPlanQueue(currentDay);
    const fresh = buildFixedDayQueue(currentDay);
    store.ebbinghaus.todayFreshEns = fresh.map(w => w.en);
    return planQueue;
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

  function init(mode = 'card', pool = getWordList(), roundSize = BASE_ROUND, options = {}) {
    const deck = buildDeck(pool, Math.min(roundSize, Math.max(1, pool.length)));
    state = {
      mode, pool, deck,
      idx: 0, revealed: false,
      score: 0, streak: 0, maxStreak: 0,
      know: 0, dont: 0,
      wrongMap: new Map(), checkedInput: false,
      autoSpeak: Boolean(store.autoSpeak),
      spellGate: null,
      phase2Active: false,
      phase2Deck: deck,
      phase2Idx: 0,
      phase2Round: 2,
      phase2WrongMap: new Map(),
      planLabel: options.planLabel || ''
    };
    el.totalQ.textContent = state.deck.length;
    switchView('game');
    renderCurrent();
  }

  function renderCurrent() {
    const w = state.phase2Active ? state.phase2Deck[state.phase2Idx] : state.deck[state.idx];
    if (!w) return finish();
    state.revealed = false;
    state.checkedInput = false;
    el.card.classList.remove('revealed');
    el.prompt.textContent = w.zh;
    el.answer.textContent = w.en;
    el.answer.style.display = '';
    el.dictInput.value = '';
    el.dictResult.textContent = '';

    const left = state.phase2Active ? (state.phase2Deck.length - state.phase2Idx) : (state.deck.length - state.idx);
    el.currentQ.textContent = (state.phase2Active ? state.phase2Idx : state.idx) + 1;
    el.remain.textContent = `剩余 ${left} 题`;
    const baseModeText = state.planLabel || (state.mode === 'dictation'
      ? '听写模式（艾宾浩斯计划）'
      : state.mode === 'spelling'
        ? '拼写模式（艾宾浩斯计划）'
        : '普通模式（艾宾浩斯计划）');
    el.modeInfo.textContent = state.phase2Active ? `第${state.phase2Round}遍拼写校验（错题自动进入下一遍）` : baseModeText;
    el.score.textContent = state.score;
    el.highScore.textContent = store.highScore;
    el.streak.textContent = state.streak;

    if (state.phase2Active) {
      el.dictationBox.classList.remove('hidden');
      el.flip.textContent = `第${state.phase2Round}遍拼写中`;
      el.checkInput.textContent = '提交拼写';
      el.dictResult.textContent = '本轮拼写错误会进入下一遍错题拼写';
      el.flip.disabled = true;
      lockJudge(true);
    } else if (state.spellGate) {
      el.dictationBox.classList.remove('hidden');
      el.flip.textContent = '请先完成拼写';
      el.checkInput.textContent = '提交拼写';
      el.dictResult.textContent = `需拼写通过才可继续`;
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

    if (!state.phase2Active) {
      lockJudge(true);
      el.flip.disabled = state.mode === 'spelling' || Boolean(state.spellGate);
    }
    persistProgress();
  }

  function lockJudge(lock) {
    el.know.disabled = lock; el.dont.disabled = lock;
  }

  function reveal() {
    if (state.revealed) return;
    state.revealed = true;
    el.answer.style.display = '';
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
    state.revealed = false;
    el.card.classList.remove('revealed');
    el.answer.style.display = 'none';
    el.dictationBox.classList.remove('hidden');
    el.dictInput.value = '';
    const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || '');
    if (!isMobile) el.dictInput.focus();
    el.checkInput.textContent = '提交拼写';
    el.dictResult.textContent = `需拼写通过才可继续`;
    lockJudge(true);
    el.flip.disabled = true;
    persistProgress();
  }

  function checkInput() {
    if (state.mode !== 'dictation' && state.mode !== 'spelling' && !state.spellGate && !state.phase2Active) return;
    const w = state.phase2Active ? state.phase2Deck[state.phase2Idx] : state.deck[state.idx];
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

    // 第二遍及之后：错误词自动进入下一遍，直到一整遍0错误
    if (state.phase2Active) {
      if (!ok) {
        state.phase2WrongMap.set(w.en, w);
        state.wrongMap.set(w.en, w);
      }
      state.phase2Idx++;
      if (state.phase2Idx >= state.phase2Deck.length) {
        advancePhase2Round();
      } else {
        renderCurrent();
      }
      return;
    }

    // 模糊/不认识强制拼写通过闸门
    if (state.spellGate) {
      if (!ok) return;
      const gateType = state.spellGate;
      state.spellGate = null;
      // 闸门通过后执行原评分并进入下一题
      const m = masteryOf(w);
      if (gateType === 'know') {
        state.score += 2; state.know++; state.streak++; state.maxStreak = Math.max(state.maxStreak, state.streak); setMastery(w, m + 1);
      } else {
        state.dont++; state.streak = 0; setMastery(w, m - 1); state.wrongMap.set(w.en, w);
      }
      updateEbbinghausProgress(w, gateType);
      save();
      next();
      return;
    }

    if (state.mode === 'spelling') {
      setTimeout(() => judge(ok ? 'know' : 'dont'), 450);
      return;
    }

    reveal();
  }

  function judge(type) {
    const w = state.deck[state.idx];
    const m = masteryOf(w);

    // 第一遍：选择"模糊/不认识"后，必须拼写通过才进入下一题
    if (type === 'dont' && !state.spellGate && state.mode !== 'spelling') {
      startSpellGate(type);
      return;
    }

    if (type === 'know') {
      state.score += 2; state.know++; state.streak++; state.maxStreak = Math.max(state.maxStreak, state.streak); setMastery(w, m + 1);
    } else {
      state.dont++; state.streak = 0; setMastery(w, m - 1); state.wrongMap.set(w.en, w);
    }
    updateEbbinghausProgress(w, type);
    save();
    next();
  }

  function advancePhase2Round() {
    const wrongList = [...state.phase2WrongMap.values()];
    if (!wrongList.length) {
      return finish();
    }
    state.phase2Round += 1;
    state.phase2Deck = wrongList;
    state.phase2Idx = 0;
    state.phase2WrongMap = new Map();
    alert(`第${state.phase2Round - 1}遍完成，仍有${wrongList.length}个错词，进入第${state.phase2Round}遍拼写。`);
    renderCurrent();
  }

  function startSecondPass() {
    state.phase2Active = true;
    state.phase2Deck = state.deck.slice();
    state.phase2Idx = 0;
    state.phase2Round = 2;
    state.phase2WrongMap = new Map();
    alert('第一遍已完成，进入第二遍拼写校验：错误词会自动进入下一遍，直到0错误才完成今日任务。');
    renderCurrent();
  }

  function next() {
    state.idx++;
    if (state.idx >= state.deck.length) return startSecondPass();
    renderCurrent();
  }

  function finish() {
    store.totalRuns++;
    const isNew = state.score > store.highScore;
    if (isNew) store.highScore = state.score;
    delete store.resume;
    save();

    alert('✅ 今天的学习任务已完成！');

    el.rScore.textContent = state.score;
    el.rHigh.textContent = store.highScore;
    el.rKnow.textContent = state.know;

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
    el.modeCard?.classList.toggle('on', mode === 'card');
    el.modeDictation?.classList.toggle('on', mode === 'dictation');
    el.modeSpelling?.classList.toggle('on', mode === 'spelling');
  }

  // events
  el.flip.addEventListener('click', reveal);
  el.know.addEventListener('click', () => judge('know'));
  el.dont.addEventListener('click', () => judge('dont'));
  el.checkInput.addEventListener('click', checkInput);
  el.dictInput.addEventListener('keydown', e => { if (e.key === 'Enter') checkInput(); });

  el.modeCard?.addEventListener('click', () => {
    setModeButton('card');
    const q = buildEbbinghausQueue();
    init('card', q, q.length);
    hidePanels();
  });
  el.modeDictation?.addEventListener('click', () => {
    setModeButton('dictation');
    const q = buildEbbinghausQueue();
    init('dictation', q, q.length);
    hidePanels();
  });
  el.modeSpelling?.addEventListener('click', () => {
    setModeButton('spelling');
    const q = buildEbbinghausQueue();
    init('spelling', q, q.length);
    hidePanels();
  });
  el.today50?.addEventListener('click', () => {
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
    const w = state.phase2Active ? state.phase2Deck[state.phase2Idx] : state.deck[state.idx];
    speak(w?.en || '', 'en-US');
  });
  el.speakZh?.addEventListener('click', () => {
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
  el.selectDayBtn?.addEventListener('click', () => {
    const cur = localStorage.getItem(DAY_NUMBER_KEY) || '1';
    const v = prompt('输入学习第几天（1/2/3/4/5...）\n规则：当天=前序复习(1/2/4/7/15天) + 当天20个新词\n例：第5天新词=81-100词，并复习第4/3/1天内容\n留空=恢复今天', cur) || '';
    if (!v.trim()) {
      localStorage.removeItem(DAY_NUMBER_KEY);
      alert('已恢复为今天学习进度。');
      location.reload();
      return;
    }
    const n = Number(v.trim());
    if (!Number.isInteger(n) || n < 1) { alert('请输入正整数天数，如 1、2、3'); return; }
    localStorage.setItem(DAY_NUMBER_KEY, String(n));
    alert(`已切换到第${n}天，页面将刷新。`);
    location.reload();
  });

  el.dailyReviewBtn?.addEventListener('click', () => {
    const maxDay = Math.max(1, Math.ceil(getWordList().length / DAILY_NEW));
    const v = prompt(`输入要复习第几天（1-${maxDay}）\n将按艾宾浩斯：复习(1/2/4/7/15天) + 当天新词20`, '1') || '';
    const n = Number(v.trim());
    if (!Number.isInteger(n) || n < 1 || n > maxDay) {
      alert(`请输入 1 到 ${maxDay} 的整数`);
      return;
    }
    const q = buildDayPlanQueue(n);
    const fresh = buildFixedDayQueue(n);
    if (!q.length) {
      alert('该天暂无可复习单词');
      return;
    }
    localStorage.removeItem(DAY_NUMBER_KEY);
    setModeButton('card');
    hidePanels();
    init('card', q, q.length, { planLabel: `单日复习：第${n}天（复习+新词${fresh.length}）` });
  });
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
