// ===================== 单词学习游戏逻辑 =====================
// 由小程序 pages/words/index.js 移植而来，逻辑保持一致
// API 替换：wx.getStorageSync/setStorageSync -> lsGet/lsSet (app.js)
//           wx.showToast -> showToast (app.js)
//           wx.showModal -> showModal (app.js)
//           wx.vibrateShort -> vibrateShort (app.js)
//           wx.createInnerAudioContext -> <audio> 元素 + Web Speech 兜底
//           wx.switchTab/navigateTo -> 视图状态切换 (本文件内)

const WordsGame = (function () {
  const KEY = 'word_game_v2';
  const BACKUP_KEY = 'word_game_v2_backup';
  const MIGRATION_NOTICE_KEY = 'word_game_v2_migration_notice_v1';
  const LEGACY_KEYS = ['word_card_game_v1', 'word_game_v1'];
  const DAY_NUMBER_KEY = 'ash_words_day_number';
  const START_DATE_KEY = 'ash_words_start_date';
  const EBB_GAPS = [1, 2, 4, 7, 15];
  const DAILY_NEW = 20;
  const DAILY_MAX = 120;

  // ===================== 存储工具 =====================
  function wxGet(k) { return lsGet(k); }
  function wxSet(k, v) { lsSet(k, v); }

  function normalizeRecordKeys(record) {
    const out = {};
    const src = record || {};
    for (const key of Object.keys(src)) {
      const cleanKey = String(key || '').trim().toLowerCase();
      if (!cleanKey) continue;
      out[cleanKey] = src[key];
    }
    return out;
  }

  // ===================== store 工具 =====================
  function normalizeStore(raw) {
    const d = {
      highScore: 0, totalRuns: 0,
      mastery: {}, ebbinghaus: { cursor: 0, progress: {}, lastPlanDate: '', todayQueue: [] },
      favorites: {}, mastered: {}, learned: {}, customWords: [], autoSpeak: true
    };
    const x = Object.assign({}, d, raw || {});
    x.ebbinghaus = Object.assign({}, d.ebbinghaus, x.ebbinghaus || {});
    x.ebbinghaus.progress = normalizeRecordKeys(x.ebbinghaus.progress || {});
    x.ebbinghaus.todayQueue = x.ebbinghaus.todayQueue || [];
    x.favorites = normalizeRecordKeys(x.favorites || {});
    x.mastered = normalizeRecordKeys(x.mastered || {});
    x.learned = normalizeRecordKeys(x.learned || {});
    x.mastery = normalizeRecordKeys(x.mastery || {});
    x.customWords = Array.isArray(x.customWords) ? x.customWords : [];
    const migratedLearned = Object.assign({}, x.learned);
    let migratedCount = 0;
    const backfillLearned = (record) => {
      for (const key of Object.keys(record || {})) {
        if (migratedLearned[key]) continue;
        migratedLearned[key] = { firstSeen: todayStr() };
        migratedCount++;
      }
    };
    backfillLearned(x.favorites);
    backfillLearned(x.mastered);
    backfillLearned(x.mastery);
    backfillLearned(x.ebbinghaus.progress || {});
    x.learned = migratedLearned;
    x._migrationRecoveredCount = migratedCount;
    return x;
  }

  function loadStore() {
    try {
      const cur = wxGet(KEY);
      if (cur) return normalizeStore(typeof cur === 'string' ? JSON.parse(cur) : cur);
    } catch (e) {}
    try {
      const b = wxGet(BACKUP_KEY);
      if (b) {
        const data = normalizeStore(typeof b === 'string' ? JSON.parse(b) : b);
        wxSet(KEY, data);
        return data;
      }
    } catch (e) {}
    for (const legacyKey of LEGACY_KEYS) {
      try {
        const legacy = wxGet(legacyKey);
        if (legacy) {
          const data = normalizeStore(typeof legacy === 'string' ? JSON.parse(legacy) : legacy);
          wxSet(KEY, data);
          wxSet(BACKUP_KEY, data);
          return data;
        }
      } catch (e) {}
    }
    return normalizeStore({});
  }

  function saveStore(store) {
    wxSet(KEY, store);
    wxSet(BACKUP_KEY, store);
  }

  // ===================== 日期工具 =====================
  function getStartDate() {
    const saved = wxGet(START_DATE_KEY);
    if (saved && /^\d{4}-\d{2}-\d{2}$/.test(saved)) return new Date(saved + 'T00:00:00');
    const now = new Date();
    const ymd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    wxSet(START_DATE_KEY, ymd);
    return new Date(ymd + 'T00:00:00');
  }

  function getSelectedDayNumber() {
    const raw = wxGet(DAY_NUMBER_KEY);
    if (raw === null || raw === undefined) { wxSet(DAY_NUMBER_KEY, 1); return 1; }
    const n = Number(raw || 1);
    return Number.isInteger(n) && n >= 1 ? n : 1;
  }

  function effectiveTodayDate() {
    const dayNum = getSelectedDayNumber();
    const d = getStartDate();
    d.setDate(d.getDate() + dayNum - 1);
    return d;
  }

  function todayStr() {
    const d = effectiveTodayDate();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function addDays(dateStr, n) {
    const d = new Date(dateStr + 'T00:00:00');
    d.setDate(d.getDate() + n);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  // ===================== 词库 =====================
  function getWordList(store) {
    const base = Array.isArray(WORDS_DATA) ? WORDS_DATA : [];
    const custom = Array.isArray(store.customWords) ? store.customWords : [];
    if (!custom.length) return base;
    const map = new Map();
    for (const w of [...base, ...custom]) {
      if (!w || !w.en) continue;
      map.set(String(w.en).trim().toLowerCase(), { zh: String(w.zh || '').trim(), en: String(w.en).trim() });
    }
    return [...map.values()];
  }

  // ===================== 艾宾浩斯计划 =====================
  function buildFixedDayQueue(store, dayNum) {
    const words = getWordList(store);
    const start = (dayNum - 1) * DAILY_NEW;
    if (start >= words.length) return [];
    return words.slice(start, Math.min(start + DAILY_NEW, words.length));
  }

  function buildDayPlanQueue(store, dayNum) {
    const words = getWordList(store);
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
    const reviewDays = EBB_GAPS.map(g => dayNum - g).filter(d => d >= 1);
    for (const d of reviewDays) addDayChunk(d);
    addDayChunk(dayNum);
    return picked.slice(0, DAILY_MAX);
  }

  function updateEbbinghausProgress(store, word, type) {
    const t = todayStr();
    const e = store.ebbinghaus;
    const key = word.en;
    const old = e.progress[key] || { stage: 0, learned: t, nextDue: t };
    let stage = old.stage;
    let nextDue = old.nextDue;
    if (type === 'know') {
      stage = Math.min(stage + 1, EBB_GAPS.length - 1);
      nextDue = addDays(t, 1);
    } else {
      stage = 0;
      nextDue = addDays(t, 1);
    }
    e.progress[key] = { stage, learned: old.learned || t, nextDue };
  }

  // ===================== 状态 =====================
  let store = null;
  let state = null;
  let view = 'intro';
  let toolsExpanded = false;
  let dayNumber = 1;
  let highScore = 0;
  let autoSpeakFlag = true;
  let audioEl = null;
  let preloadAudioEl = null;
  let preloadWord = '';

  // ===================== DOM helpers =====================
  function $(id) { return document.getElementById(id); }
  function showSub(id) {
    const subs = ['words-intro', 'words-game', 'words-result', 'words-mastered', 'words-favorites',
      'words-learned', 'words-stats', 'words-tomorrow', 'words-wordpool', 'words-customwords'];
    subs.forEach(s => { $(s).style.display = (s === id) ? '' : 'none'; });
  }

  // ===================== 初始化 =====================
  function init() {
    store = loadStore();
    audioEl = null;
    preloadAudioEl = null;
    preloadWord = '';
    // 强制开启自动发音（旧存档可能保存了 false，在此覆盖）
    store.autoSpeak = true;
    saveStore(store);
    maybeShowMigrationNotice();
    dayNumber = getSelectedDayNumber();
    highScore = store.highScore || 0;
    autoSpeakFlag = true;
    renderIntro();
    showSub('words-intro');
    view = 'intro';
    bindStaticEvents();
  }

  function onShow() {
    // 每次切换到此页面刷新高分
    if (store) {
      highScore = store.highScore || 0;
      if (view === 'intro') renderIntro();
    }
  }

  function maybeShowMigrationNotice() {
    const recovered = Number(store && store._migrationRecoveredCount || 0);
    if (!recovered) return;
    if (wxGet(MIGRATION_NOTICE_KEY)) return;
    wxSet(MIGRATION_NOTICE_KEY, 1);
    showToast({ title: `已恢复${recovered}条历史学习记录`, duration: 2200 });
  }

  // ===================== intro 渲染 =====================
  function renderIntro() {
    $('intro-day-number').textContent = dayNumber;
    $('intro-day-number2').textContent = dayNumber;
    $('intro-high-score').textContent = highScore;
  }

  // ===================== 工具面板 =====================
  function toggleTools() {
    toolsExpanded = !toolsExpanded;
    $('g-tools-panel').style.display = toolsExpanded ? '' : 'none';
    $('g-tools-toggle').textContent = `⚙️ 工具 ${toolsExpanded ? '▲' : '▼'}`;
  }

  // ===================== 开始游戏 =====================
  function startGame(mode, pool, sourceLabel) {
    if (!pool) {
      const dayNum = getSelectedDayNumber();
      pool = buildDayPlanQueue(store, dayNum);
    }
    if (!pool.length) {
      showToast({ title: '今日词库为空，请调整学习天数', duration: 2500 });
      return;
    }
    const deck = pool.slice();
    state = {
      mode, pool, deck,
      sourceLabel: sourceLabel || '',
      idx: 0, revealed: false,
      score: 0, streak: 0, maxStreak: 0,
      know: 0, dont: 0,
      wrongMap: new Map(), checkedInput: false,
      autoSpeak: true,
      spellGate: null,
      phase2Active: false,
      phase2Deck: deck,
      phase2Idx: 0,
      phase2Round: 2,
      phase2WrongMap: new Map(),
      skipPhase2: false,
    };
    toolsExpanded = false;
    $('g-tools-panel').style.display = 'none';
    $('g-tools-toggle').textContent = '⚙️ 工具 ▼';
    showSub('words-game');
    view = 'game';
    renderCurrent();
  }

  function startCard() { startGame('card'); }
  function startDictation() { startGame('dictation'); }
  function startSpelling() { startGame('spelling'); }

  // ===================== 渲染当前题 =====================
  function renderCurrent() {
    const st = state;
    const w = st.phase2Active ? st.phase2Deck[st.phase2Idx] : st.deck[st.idx];
    if (!w) { finish(); return; }

    const wordObj = w;
    markLearned(w);

    st.revealed = false;
    st.checkedInput = false;
    st.waitingConfirm = false;

    const left = st.phase2Active ? (st.phase2Deck.length - st.phase2Idx) : (st.deck.length - st.idx);
    const curIdx = st.phase2Active ? st.phase2Idx : st.idx;

    let modeInfo = '';
    let phase2Info = '';
    if (st.phase2Active) {
      phase2Info = `第${st.phase2Round}遍拼写校验`;
      modeInfo = '错词自动进入下一遍';
    } else if (st.spellGate) {
      modeInfo = '拼写通过后才可继续';
    } else {
      const labels = { card: '普通翻卡模式', dictation: '听写模式', spelling: '拼写模式' };
      modeInfo = st.sourceLabel ? `${st.sourceLabel} · ${labels[st.mode] || ''}` : (labels[st.mode] || '');
    }

    const showInput = st.mode === 'dictation' || st.mode === 'spelling' || !!st.spellGate || st.phase2Active;
    let flipText = '翻卡';
    let flipDisabled = false;
    if (st.phase2Active) { flipText = `第${st.phase2Round}遍拼写`; flipDisabled = true; }
    else if (st.spellGate) { flipText = '请先完成拼写'; flipDisabled = true; }
    else if (st.mode === 'spelling') { flipText = '拼写后自动翻卡'; flipDisabled = true; }
    else if (st.mode === 'dictation') { flipText = '翻卡(可跳过)'; }

    const promptText = wordObj ? wordObj.zh : '';
    const answerText = wordObj ? wordObj.en : '';
    const ex = {
      pos: wordObj ? wordObj.pos : '',
      sentence: wordObj ? wordObj.example : '',
      sentenceZh: wordObj ? wordObj.exampleZh : ''
    };

    // ---- 写入 DOM ----
    $('g-prompt').textContent = promptText;
    $('g-answer').textContent = answerText;
    $('g-answer').style.display = 'none';
    $('g-answer-placeholder').style.display = '';
    $('g-wordcard').classList.remove('revealed');
    $('g-tipbox').style.display = 'none';
    $('g-tip-label').textContent = ex.pos ? `📝 例句（${ex.pos}）` : '📝 例句';
    $('g-tip-sentence').textContent = ex.sentence || '';
    $('g-tip-sentencezh').textContent = ex.sentenceZh || '';

    $('g-remain').textContent = left;
    $('g-progress').textContent = `${curIdx + 1}/${st.deck.length}`;
    $('g-modeinfo').textContent = phase2Info || modeInfo;
    $('g-score').textContent = st.score;
    $('g-streak').textContent = st.streak;
    $('g-high').textContent = store.highScore || 0;

    $('g-input').value = '';
    $('g-input').disabled = false;
    setInputResult('');
    $('g-spellbox').style.display = showInput ? '' : 'none';
    $('g-btn-confirm-wrong').style.display = 'none';

    $('g-btn-flip').textContent = flipText;
    $('g-btn-flip').disabled = flipDisabled;
    $('g-btn-know').disabled = true;
    $('g-btn-dont').disabled = true;
    $('g-btn-check').disabled = false;

    const isFav = !!(store.favorites && w && store.favorites[w.en]);
    const isMastered = !!(store.mastered && w && store.mastered[w.en]);
    $('g-btn-fav').textContent = isFav ? '★ 已收藏' : '☆ 收藏';
    $('g-btn-fav').classList.toggle('on', isFav);
    state.isMastered = isMastered;

    // 听写/拼写模式：自动发音
    if (st.autoSpeak && !st.phase2Active && !st.spellGate) {
      if (st.mode === 'dictation' || st.mode === 'spelling') {
        speak(answerText);
      }
    }

    // 预加载下一题
    const nextWord = getNextWord();
    if (nextWord) preload(nextWord.en);
  }

  function setInputResult(text, wrong) {
    const el = $('g-inputresult');
    if (!text) { el.style.display = 'none'; return; }
    el.style.display = '';
    el.textContent = text;
    el.classList.toggle('spell-result-wrong', !!wrong);
  }

  function getNextWord() {
    const st = state;
    if (!st) return null;
    if (st.phase2Active) {
      const nextIdx = st.phase2Idx + 1;
      return nextIdx < st.phase2Deck.length ? st.phase2Deck[nextIdx] : null;
    }
    const nextIdx = st.idx + 1;
    return nextIdx < st.deck.length ? st.deck[nextIdx] : null;
  }

  // ===================== 翻卡 =====================
  function onFlip() {
    const st = state;
    if (!st || st.revealed) return;
    if (st.phase2Active || st.spellGate || st.mode === 'spelling') return;
    st.revealed = true;
    const w = st.deck[st.idx];
    $('g-answer').style.display = '';
    $('g-answer-placeholder').style.display = 'none';
    $('g-wordcard').classList.add('revealed');
    if (w.example) $('g-tipbox').style.display = '';
    $('g-btn-flip').disabled = true;
    $('g-btn-know').disabled = false;
    $('g-btn-dont').disabled = false;
    if (st.autoSpeak) speak(w.en);
  }

  // ===================== 提交拼写 =====================
  function onCheckInput() {
    const st = state;
    if (!st) return;
    if (st.waitingConfirm) return;
    const w = st.phase2Active ? st.phase2Deck[st.phase2Idx] : st.deck[st.idx];
    const ans = String(w.en).trim().toLowerCase();
    const user = ($('g-input').value || '').trim().toLowerCase();
    if (!user) { setInputResult('先输入再提交'); return; }

    const ok = user === ans;
    st.checkedInput = true;

    if (st.phase2Active) {
      if (!ok) {
        st.phase2WrongMap.set(w.en, w);
        st.wrongMap.set(w.en, w);
        st.waitingConfirm = true;
        setInputResult(`❌ 正确答案：${w.en}`, true);
        $('g-btn-confirm-wrong').style.display = '';
        $('g-input').disabled = true;
        $('g-btn-check').disabled = true;
        return;
      }
      setInputResult('✅ 拼写正确', false);
      st.phase2Idx++;
      if (st.phase2Idx >= st.phase2Deck.length) {
        setTimeout(() => advancePhase2Round(), 600);
      } else {
        setTimeout(() => renderCurrent(), 600);
      }
      return;
    }

    // 拼写闸门
    if (st.spellGate) {
      if (!ok) {
        st.waitingConfirm = true;
        setInputResult(`❌ 正确答案：${w.en}`, true);
        $('g-btn-confirm-wrong').style.display = '';
        $('g-input').disabled = true;
        $('g-btn-check').disabled = true;
        return;
      }
      const gateType = st.spellGate;
      st.spellGate = null;
      const m = masteryOf(w);
      if (gateType === 'know') {
        st.score += 2; st.know++; st.streak++; st.maxStreak = Math.max(st.maxStreak, st.streak);
        setMastery(w, m + 1);
      } else {
        st.dont++; st.streak = 0; setMastery(w, m - 1); st.wrongMap.set(w.en, w);
      }
      updateEbbinghausProgress(store, w, gateType);
      saveStore(store);
      setInputResult('✅ 拼写正确', false);
      setTimeout(() => next(), 600);
      return;
    }

    // 拼写模式：自动判断
    if (st.mode === 'spelling') {
      if (!ok) {
        st.waitingConfirm = true;
        setInputResult(`❌ 正确答案：${w.en}`, true);
        $('g-btn-confirm-wrong').style.display = '';
        $('g-input').disabled = true;
        $('g-btn-check').disabled = true;
        return;
      }
      st.revealed = true;
      setInputResult('✅ 拼写正确', false);
      $('g-answer').style.display = '';
      $('g-answer-placeholder').style.display = 'none';
      $('g-wordcard').classList.add('revealed');
      setTimeout(() => judge('know'), 800);
      return;
    }

    // 听写模式：拼写错误时也等待确认
    if (!ok) {
      st.waitingConfirm = true;
      setInputResult(`❌ 正确答案：${w.en}`, true);
      $('g-btn-confirm-wrong').style.display = '';
      $('g-input').disabled = true;
      $('g-btn-check').disabled = true;
      return;
    }
    setInputResult('✅ 拼写正确', false);
    st.revealed = true;
    $('g-answer').style.display = '';
    $('g-answer-placeholder').style.display = 'none';
    $('g-wordcard').classList.add('revealed');
    if (w.example) $('g-tipbox').style.display = '';
    $('g-btn-flip').disabled = true;
    $('g-btn-know').disabled = false;
    $('g-btn-dont').disabled = false;
  }

  // ===================== 拼写错误后用户确认，跳入下一题 =====================
  function onConfirmWrong() {
    const st = state;
    if (!st || !st.waitingConfirm) return;
    st.waitingConfirm = false;
    $('g-btn-confirm-wrong').style.display = 'none';
    $('g-input').disabled = false;
    $('g-btn-check').disabled = false;

    if (st.phase2Active) {
      st.phase2Idx++;
      if (st.phase2Idx >= st.phase2Deck.length) {
        advancePhase2Round();
      } else {
        renderCurrent();
      }
      return;
    }

    if (st.spellGate) {
      const gateType = st.spellGate;
      st.spellGate = null;
      const w = st.deck[st.idx];
      const m = masteryOf(w);
      st.dont++; st.streak = 0; setMastery(w, m - 1); st.wrongMap.set(w.en, w);
      updateEbbinghausProgress(store, w, 'dont');
      saveStore(store);
      next();
      return;
    }

    if (st.mode === 'spelling') {
      judge('dont');
      return;
    }

    // 听写模式：错误确认后翻卡，让用户自己判断认识/不认识
    const w = st.deck[st.idx];
    st.revealed = true;
    $('g-answer').style.display = '';
    $('g-answer-placeholder').style.display = 'none';
    $('g-wordcard').classList.add('revealed');
    if (w && w.example) $('g-tipbox').style.display = '';
    $('g-btn-flip').disabled = true;
    $('g-btn-know').disabled = false;
    $('g-btn-dont').disabled = false;
  }

  // ===================== 认识 / 不认识 =====================
  function onKnow() { judge('know'); }
  function onDont() { judge('dont'); }

  function judge(type) {
    const st = state;
    const w = st.deck[st.idx];
    const m = masteryOf(w);

    if (type === 'dont' && !st.spellGate && st.mode !== 'spelling') {
      startSpellGate(type);
      return;
    }
    if (type === 'know') {
      st.score += 2; st.know++; st.streak++; st.maxStreak = Math.max(st.maxStreak, st.streak);
      setMastery(w, m + 1);
    } else {
      st.dont++; st.streak = 0; setMastery(w, m - 1); st.wrongMap.set(w.en, w);
    }
    updateEbbinghausProgress(store, w, type);
    saveStore(store);
    next();
  }

  function startSpellGate(type) {
    const st = state;
    st.spellGate = type;
    st.revealed = false;
    $('g-answer').style.display = 'none';
    $('g-answer-placeholder').style.display = '';
    $('g-wordcard').classList.remove('revealed');
    $('g-spellbox').style.display = '';
    $('g-input').value = '';
    $('g-input').disabled = false;
    setInputResult('需拼写通过才可继续');
    $('g-btn-flip').disabled = true;
    $('g-btn-know').disabled = true;
    $('g-btn-dont').disabled = true;
    $('g-btn-check').disabled = false;
    $('g-input').focus();
  }

  function next() {
    const st = state;
    if (st.skipPhase2) {
      st.idx++;
      if (st.idx >= st.deck.length) { finish(); return; }
      renderCurrent();
      return;
    }
    st.idx++;
    if (st.idx >= st.deck.length) {
      startSecondPass();
      return;
    }
    renderCurrent();
  }

  function startSecondPass() {
    const st = state;
    st.phase2Active = true;
    st.phase2Deck = st.deck.slice();
    st.phase2Idx = 0;
    st.phase2Round = 2;
    st.phase2WrongMap = new Map();
    showModal({
      title: '第一遍完成',
      content: '进入第二遍拼写校验：错误词会自动进入下一遍，直到0错误才完成今日任务。',
      showCancel: false,
      confirmText: '开始拼写',
      success: () => renderCurrent()
    });
  }

  function advancePhase2Round() {
    const st = state;
    const wrongList = [...st.phase2WrongMap.values()];
    if (!wrongList.length) { finish(); return; }
    st.phase2Round += 1;
    if (st.phase2Round >= 3) {
      for (let i = wrongList.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [wrongList[i], wrongList[j]] = [wrongList[j], wrongList[i]];
      }
    }
    st.phase2Deck = wrongList;
    st.phase2Idx = 0;
    st.phase2WrongMap = new Map();
    showModal({
      title: `进入第${st.phase2Round}遍`,
      content: `上一遍仍有 ${wrongList.length} 个错词${st.phase2Round >= 3 ? '，顺序已随机打乱' : ''}，继续拼写直到全对。`,
      showCancel: false,
      confirmText: '继续',
      success: () => renderCurrent()
    });
  }

  function finish() {
    const st = state;
    store.totalRuns = (store.totalRuns || 0) + 1;
    const isNew = st.score > (store.highScore || 0);
    if (isNew) store.highScore = st.score;
    delete store.resume;
    saveStore(store);

    $('r-title').textContent = isNew ? '🎉 新纪录！' : '✅ 完成今日任务';
    $('r-score').textContent = st.score;
    $('r-high').textContent = store.highScore;
    $('r-know').textContent = st.know;
    $('r-dont').textContent = st.dont;
    $('r-streak').textContent = st.maxStreak;
    $('r-runs').textContent = store.totalRuns;
    $('r-btn-replaywrong').style.display = st.wrongMap.size > 0 ? '' : 'none';
    showSub('words-result');
    view = 'result';
  }

  // ===================== 结算操作 =====================
  function onRestart() {
    const st = state;
    const dayNum = getSelectedDayNumber();
    const pool = buildDayPlanQueue(store, dayNum);
    startGame(st ? st.mode : 'card', pool);
  }

  function onReplayWrong() {
    const st = state;
    if (!st || !st.wrongMap.size) return;
    const pool = [...st.wrongMap.values()];
    startGame(st.mode, pool, '错词重练');
  }

  // ===================== 已掌握管理 =====================
  function onShowMastered() {
    const list = pickWordsByEns(Object.keys(store.mastered || {}));
    renderMasteredList(list);
    showSub('words-mastered');
    view = 'mastered';
  }

  function renderMasteredList(list) {
    $('mastered-count').textContent = list.length;
    $('mastered-empty').style.display = list.length ? 'none' : '';
    const container = $('mastered-list');
    container.innerHTML = '';
    list.forEach(item => {
      const row = document.createElement('div');
      row.className = 'word-list-item';
      row.innerHTML = `<div class="wli-left"><div class="wli-zh">${escapeHtml(item.zh)}</div><div class="wli-en">${escapeHtml(item.en)}</div></div><button class="wli-btn">取消</button>`;
      row.querySelector('.wli-btn').addEventListener('click', () => onUnmaster(item.en));
      container.appendChild(row);
    });
  }

  function onUnmaster(en) {
    if (store.mastered && store.mastered[en]) {
      delete store.mastered[en];
      saveStore(store);
      onShowMastered();
    }
  }

  function onShowFavorites() {
    const list = pickWordsByEns(Object.keys(store.favorites || {}));
    renderFavoritesList(list);
    showSub('words-favorites');
    view = 'favorites';
  }

  function renderFavoritesList(list) {
    $('favorites-count').textContent = list.length;
    $('favorites-empty').style.display = list.length ? 'none' : '';
    $('favorites-drill-btn').style.display = list.length ? '' : 'none';
    const container = $('favorites-list');
    container.innerHTML = '';
    list.forEach(item => {
      const row = document.createElement('div');
      row.className = 'word-list-item';
      row.innerHTML = `<div class="wli-left"><div class="wli-zh">${escapeHtml(item.zh)}</div><div class="wli-en">${escapeHtml(item.en)}</div></div><button class="wli-btn">取消</button>`;
      row.querySelector('.wli-btn').addEventListener('click', () => onUnfavorite(item.en));
      container.appendChild(row);
    });
  }

  function onUnfavorite(en) {
    if (store.favorites && store.favorites[en]) {
      delete store.favorites[en];
      saveStore(store);
      onShowFavorites();
    }
  }

  function onShowLearned() {
    const list = pickLearnedWords();
    $('learned-count').textContent = list.length;
    $('learned-empty').style.display = list.length ? 'none' : '';
    const container = $('learned-list');
    container.innerHTML = '';
    list.forEach(item => {
      const row = document.createElement('div');
      row.className = 'word-list-item';
      row.innerHTML = `<div class="wli-left"><div class="wli-zh">${escapeHtml(item.zh)}</div><div class="wli-en">${escapeHtml(item.en)}</div></div>`;
      container.appendChild(row);
    });
    showSub('words-learned');
    view = 'learned';
  }

  function onFavoriteDrill() {
    const pool = pickWordsByEns(Object.keys(store.favorites || {}));
    if (!pool.length) {
      showToast({ title: '暂无收藏单词' });
      return;
    }
    showToast({ title: `开始练${pool.length}个收藏词`, duration: 1200 });
    startGame('card', pool, '收藏单词重练');
  }

  // ===================== 明日计划 =====================
  function onShowTomorrow() {
    const dayNum = getSelectedDayNumber();
    const tmrDay = dayNum + 1;
    const fresh = buildFixedDayQueue(store, tmrDay);
    const full = buildDayPlanQueue(store, tmrDay);
    const freshSet = new Set(fresh.map(w => w.en));
    const review = full.filter(w => !freshSet.has(w.en));

    const newList = fresh.slice(0, 60);
    const reviewList = review.slice(0, 60);

    $('tomorrow-new-count').textContent = fresh.length;
    $('tomorrow-review-count').textContent = review.length;
    renderSimpleWordList('tomorrow-new-list', newList);
    renderSimpleWordList('tomorrow-review-list', reviewList);

    showSub('words-tomorrow');
    view = 'tomorrow';
  }

  function renderSimpleWordList(containerId, list) {
    const container = $(containerId);
    container.innerHTML = '';
    list.forEach(item => {
      const row = document.createElement('div');
      row.className = 'word-list-item';
      row.innerHTML = `<div class="wli-zh">${escapeHtml(item.zh)}</div><div class="wli-en">${escapeHtml(item.en)}</div>`;
      container.appendChild(row);
    });
  }

  // ===================== 学习统计 =====================
  function onShowStats() {
    $('stats-runs').textContent = store.totalRuns || 0;
    $('stats-high').textContent = store.highScore || 0;
    $('stats-mastered').textContent = Object.keys(store.mastered || {}).length;
    $('stats-fav').textContent = Object.keys(store.favorites || {}).length;
    $('stats-learned').textContent = Object.keys(store.learned || {}).length;
    $('stats-day').textContent = dayNumber;
    showSub('words-stats');
    view = 'stats';
  }

  // ===================== 词库管理 =====================
  let wordPoolSearch = '';
  let wordPoolFilter = 'all';

  function onShowWordPool() {
    wordPoolSearch = '';
    wordPoolFilter = 'all';
    $('wordpool-search').value = '';
    setWordPoolFilterUI('all');
    filterWordPool();
    showSub('words-wordpool');
    view = 'wordpool';
  }

  function setWordPoolFilterUI(filter) {
    ['all', 'active', 'deleted'].forEach(f => {
      $(`wpt-${f}`).classList.toggle('active', f === filter);
    });
  }

  function filterWordPool() {
    const words = getWordList(store);
    const mastered = store.mastered || {};
    const search = (wordPoolSearch || '').trim().toLowerCase();
    const filter = wordPoolFilter;

    let filtered = words;
    if (filter === 'deleted') {
      filtered = words.filter(w => !!(mastered[w.en]));
    } else if (filter === 'active') {
      filtered = words.filter(w => !(mastered[w.en]));
    }

    if (search) {
      filtered = filtered.filter(w =>
        w.en.toLowerCase().includes(search) || w.zh.includes(search)
      );
    }

    let deleted = 0;
    const list = filtered.map(w => {
      const d = !!(mastered[w.en]);
      if (d) deleted++;
      return Object.assign({}, w, { _deleted: d });
    });

    $('wordpool-total').textContent = words.length;
    $('wordpool-active-count').textContent = words.length - Object.keys(mastered).length;
    $('wordpool-empty').style.display = list.length ? 'none' : '';

    const container = $('wordpool-list');
    container.innerHTML = '';
    list.forEach(item => {
      const row = document.createElement('div');
      row.className = 'word-list-item';
      const btnClass = item._deleted ? 'wli-btn wli-btn-restore' : 'wli-btn';
      const btnText = item._deleted ? '恢复' : '删除';
      row.innerHTML = `<div class="wli-left"><div class="wli-zh">${escapeHtml(item.zh)}</div><div class="wli-en">${escapeHtml(item.en)}</div></div><button class="${btnClass}">${btnText}</button>`;
      row.querySelector('button').addEventListener('click', () => onToggleWordDelete(item.en));
      container.appendChild(row);
    });
  }

  function onToggleWordDelete(en) {
    if (!store.mastered) store.mastered = {};
    if (store.mastered[en]) {
      delete store.mastered[en];
    } else {
      store.mastered[en] = true;
    }
    saveStore(store);
    filterWordPool();
  }

  // ===================== 自定义单词表 =====================
  function onShowCustomWords() {
    $('custom-en').value = '';
    $('custom-zh').value = '';
    $('custom-batch').value = '';
    $('custom-btn-add').disabled = true;
    $('custom-btn-import').disabled = true;
    renderCustomWordsList();
    showSub('words-customwords');
    view = 'customWords';
  }

  function renderCustomWordsList() {
    const list = (store.customWords || []).slice();
    $('custom-count').textContent = list.length;
    $('custom-empty').style.display = list.length ? 'none' : '';
    const container = $('custom-list');
    container.innerHTML = '';
    list.forEach(item => {
      const row = document.createElement('div');
      row.className = 'word-list-item';
      row.innerHTML = `<div class="wli-left"><div class="wli-zh">${escapeHtml(item.zh)}</div><div class="wli-en">${escapeHtml(item.en)}<span class="wli-custom-tag">自定义</span></div></div><button class="wli-btn">删除</button>`;
      row.querySelector('.wli-btn').addEventListener('click', () => onRemoveCustomWord(item.en));
      container.appendChild(row);
    });
  }

  function onAddCustomWord() {
    const en = ($('custom-en').value || '').trim();
    const zh = ($('custom-zh').value || '').trim();
    if (!en || !zh) {
      showToast({ title: '请输入英文和中文' });
      return;
    }
    if (!store.customWords) store.customWords = [];
    const existing = store.customWords.find(w => w.en.toLowerCase() === en.toLowerCase());
    if (existing) {
      existing.zh = zh;
    } else {
      store.customWords.push({ en, zh });
    }
    saveStore(store);
    $('custom-en').value = '';
    $('custom-zh').value = '';
    $('custom-btn-add').disabled = true;
    renderCustomWordsList();
    showToast({ title: existing ? '已更新' : '已添加' });
  }

  function onImportCustomWords() {
    const text = ($('custom-batch').value || '').trim();
    if (!text) return;
    if (!store.customWords) store.customWords = [];
    const lines = text.split(/[\n\r]+/).filter(Boolean);
    let added = 0;
    const existingMap = new Map(store.customWords.map(w => [w.en.toLowerCase(), w]));
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      let en = '', zh = '';
      const tabParts = trimmed.split(/\t+/);
      if (tabParts.length >= 2) {
        en = tabParts[0].trim();
        zh = tabParts.slice(1).join(' ').trim();
      } else {
        const spaceIdx = trimmed.search(/[\s一-鿿]/);
        if (spaceIdx > 0) {
          en = trimmed.substring(0, spaceIdx).trim();
          zh = trimmed.substring(spaceIdx).trim();
        } else {
          continue;
        }
      }
      if (!en || !zh) continue;
      const existing = existingMap.get(en.toLowerCase());
      if (existing) {
        existing.zh = zh;
      } else {
        const w = { en, zh };
        store.customWords.push(w);
        existingMap.set(en.toLowerCase(), w);
        added++;
      }
    }
    saveStore(store);
    $('custom-batch').value = '';
    $('custom-btn-import').disabled = true;
    renderCustomWordsList();
    showToast({ title: `导入了 ${added} 个新词` });
  }

  function onRemoveCustomWord(en) {
    if (!store.customWords) store.customWords = [];
    store.customWords = store.customWords.filter(w => w.en !== en);
    saveStore(store);
    renderCustomWordsList();
    showToast({ title: '已删除' });
  }

  // ===================== 返回 =====================
  function onBackToGame() { showSub('words-game'); view = 'game'; renderCurrent(); }
  function onBackToIntro() { showSub('words-intro'); view = 'intro'; renderIntro(); }

  // ===================== 收藏 / 删除 =====================
  function onToggleFav() {
    const st = state;
    if (!st) return;
    const w = st.phase2Active ? st.phase2Deck[st.phase2Idx] : st.deck[st.idx];
    if (!w) return;
    if (!store.favorites) store.favorites = {};
    if (store.favorites[w.en]) delete store.favorites[w.en];
    else store.favorites[w.en] = true;
    saveStore(store);
    const isFav = !!(store.favorites[w.en]);
    $('g-btn-fav').textContent = isFav ? '★ 已收藏' : '☆ 收藏';
    $('g-btn-fav').classList.toggle('on', isFav);
  }

  function onDeleteWord() {
    const st = state;
    if (!st) return;
    const w = st.phase2Active ? st.phase2Deck[st.phase2Idx] : st.deck[st.idx];
    if (!w) return;
    if (!store.mastered) store.mastered = {};
    store.mastered[w.en] = true;
    saveStore(store);

    st.dont++;
    st.streak = 0;
    st.wrongMap.set(w.en, w);
    updateEbbinghausProgress(store, w, 'dont');
    $('g-score').textContent = st.score;
    $('g-streak').textContent = st.streak;
    showToast({ title: `已删除「${w.en}」`, duration: 1000 });
    setTimeout(() => { next(); }, 400);
  }

  // ===================== 自动发音 =====================
  function onToggleAutoSpeak() {
    const st = state;
    const val = !autoSpeakFlag;
    if (st) st.autoSpeak = val;
    store.autoSpeak = val;
    autoSpeakFlag = val;
    saveStore(store);
    $('g-tool-autospeak').textContent = `🔊 自动发音：${val ? '开' : '关'}`;
    $('g-tool-autospeak').classList.toggle('on', val);
  }

  // ===================== 发音 =====================
  // 小程序使用云端音频 CDN + 百度 TTS 兜底；网页端无对应云配置，
  // 使用浏览器内置 Web Speech API (speechSynthesis) 作为发音方案。
  function speak(text) {
    if (!text) return;
    try {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(String(text).trim());
        utter.lang = 'en-US';
        window.speechSynthesis.speak(utter);
      }
    } catch (e) {}
  }

  function preload(text) {
    // Web Speech API 无需手动预加载音频资源，此处保留占位以与原逻辑结构一致
    preloadWord = text;
  }

  function onSpeakWord() {
    const st = state;
    if (!st) return;
    const w = st.phase2Active ? st.phase2Deck[st.phase2Idx] : st.deck[st.idx];
    if (!w) return;
    speak(w.en);
  }

  // ===================== 选择学习天数 =====================
  function onSelectDay() {
    const cur = getSelectedDayNumber();
    showModal({
      title: '选择学习第几天',
      content: `当前：第${cur}天\n规则：每天20个新词+艾宾浩斯复习\n请在确认后的对话框输入天数`,
      showCancel: true,
      confirmText: '去输入',
      success: (res) => {
        if (!res.confirm) return;
        promptDayInput();
      }
    });
  }

  function promptDayInput() {
    showModal({
      title: '输入天数',
      editable: true,
      placeholderText: '如：1、2、3',
      success: (res) => {
        if (!res.confirm) return;
        const v = String(res.content || '').trim();
        const n = Number(v);
        if (!Number.isInteger(n) || n < 1) {
          showToast({ title: '请输入正整数，如1/2/3' });
          return;
        }
        wxSet(DAY_NUMBER_KEY, n);
        dayNumber = n;
        renderIntro();
        showToast({ title: `已切换到第${n}天` });
        setTimeout(() => startGame('card'), 1000);
      }
    });
  }

  // ===================== 工具按钮（错词重练）=====================
  function onWrongDrill() {
    const st = state;
    if (!st || !st.wrongMap.size) {
      showToast({ title: '暂无错词' });
      return;
    }
    const pool = [...st.wrongMap.values()];
    startGame(st.mode || 'card', pool, '错词重练');
  }

  // ===================== 工具函数 =====================
  function pickWordsByEns(ens) {
    const wordList = getWordList(store);
    const map = new Map(wordList.map(w => [String(w.en || '').trim().toLowerCase(), w]));
    return ens.map(en => map.get(String(en || '').trim().toLowerCase())).filter(Boolean);
  }

  function pickLearnedWords() {
    const wordList = getWordList(store);
    const learned = store.learned || {};
    const indexed = wordList
      .map((w, idx) => {
        const key = String(w.en || '').trim().toLowerCase();
        const meta = learned[key];
        if (!meta) return null;
        const stamp = meta.lastSeen || meta.firstSeen || '';
        const ts = stamp ? new Date(`${stamp}T00:00:00`).getTime() : 0;
        return { idx, ts, word: w };
      })
      .filter(Boolean);

    indexed.sort((a, b) => {
      if (b.ts !== a.ts) return b.ts - a.ts;
      return a.idx - b.idx;
    });

    return indexed.map(item => item.word);
  }

  function markLearned(w) {
    if (!w || !w.en) return;
    if (!store.learned) store.learned = {};
    const key = String(w.en).trim().toLowerCase();
    const today = todayStr();
    const old = store.learned[key] || {};
    store.learned[key] = {
      firstSeen: old.firstSeen || today,
      lastSeen: today
    };
    saveStore(store);
  }

  function masteryOf(w) { return Math.max(0, Number((store.mastery || {})[w.en] || 0)); }
  function setMastery(w, v) { if (!store.mastery) store.mastery = {}; store.mastery[w.en] = Math.max(0, Math.floor(v)); }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  // ===================== 事件绑定 =====================
  let eventsBound = false;
  function bindStaticEvents() {
    if (eventsBound) return;
    eventsBound = true;

    // intro
    $('btn-start-card').addEventListener('click', startCard);
    $('btn-start-dictation').addEventListener('click', startDictation);
    $('btn-start-spelling').addEventListener('click', startSpelling);
    $('btn-back-home').addEventListener('click', () => { if (typeof showHomeView === 'function') showHomeView(); });

    $('tool-select-day').addEventListener('click', onSelectDay);
    $('tool-show-stats').addEventListener('click', onShowStats);
    $('tool-show-learned').addEventListener('click', onShowLearned);
    $('tool-show-favorites').addEventListener('click', onShowFavorites);
    $('tool-favorite-drill').addEventListener('click', onFavoriteDrill);
    $('tool-wrong-drill').addEventListener('click', onWrongDrill);
    $('tool-show-tomorrow').addEventListener('click', onShowTomorrow);
    $('tool-show-mastered').addEventListener('click', onShowMastered);
    $('tool-show-wordpool').addEventListener('click', onShowWordPool);
    $('tool-show-customwords').addEventListener('click', onShowCustomWords);

    // game
    $('g-input').addEventListener('keydown', (e) => { if (e.key === 'Enter') onCheckInput(); });
    $('g-btn-check').addEventListener('click', onCheckInput);
    $('g-btn-confirm-wrong').addEventListener('click', onConfirmWrong);
    $('g-btn-flip').addEventListener('click', onFlip);
    $('g-btn-know').addEventListener('click', onKnow);
    $('g-btn-dont').addEventListener('click', onDont);
    $('g-btn-fav').addEventListener('click', onToggleFav);
    $('g-btn-delete').addEventListener('click', onDeleteWord);
    $('g-btn-speak').addEventListener('click', onSpeakWord);
    $('g-tools-toggle').addEventListener('click', toggleTools);

    $('g-tool-stats').addEventListener('click', onShowStats);
    $('g-tool-learned').addEventListener('click', onShowLearned);
    $('g-tool-favorites').addEventListener('click', onShowFavorites);
    $('g-tool-favoritedrill').addEventListener('click', onFavoriteDrill);
    $('g-tool-wrongdrill').addEventListener('click', onWrongDrill);
    $('g-tool-tomorrow').addEventListener('click', onShowTomorrow);
    $('g-tool-mastered').addEventListener('click', onShowMastered);
    $('g-tool-selectday').addEventListener('click', onSelectDay);
    $('g-tool-autospeak').addEventListener('click', onToggleAutoSpeak);

    // result
    $('r-btn-restart').addEventListener('click', onRestart);
    $('r-btn-replaywrong').addEventListener('click', onReplayWrong);
    $('r-btn-backintro').addEventListener('click', onBackToIntro);

    // list pages back buttons
    document.querySelectorAll('.back-btn[data-back="intro"]').forEach(el => {
      el.addEventListener('click', onBackToIntro);
    });

    $('favorites-drill-btn').addEventListener('click', onFavoriteDrill);

    // wordpool
    $('wordpool-search').addEventListener('input', (e) => {
      wordPoolSearch = e.target.value;
      filterWordPool();
    });
    $('wpt-all').addEventListener('click', () => { wordPoolFilter = 'all'; setWordPoolFilterUI('all'); filterWordPool(); });
    $('wpt-active').addEventListener('click', () => { wordPoolFilter = 'active'; setWordPoolFilterUI('active'); filterWordPool(); });
    $('wpt-deleted').addEventListener('click', () => { wordPoolFilter = 'deleted'; setWordPoolFilterUI('deleted'); filterWordPool(); });

    // custom words
    $('custom-en').addEventListener('input', updateCustomAddButtonState);
    $('custom-zh').addEventListener('input', updateCustomAddButtonState);
    $('custom-batch').addEventListener('input', () => {
      $('custom-btn-import').disabled = !($('custom-batch').value || '').trim();
    });
    $('custom-btn-add').addEventListener('click', onAddCustomWord);
    $('custom-btn-import').addEventListener('click', onImportCustomWords);
  }

  function updateCustomAddButtonState() {
    const en = $('custom-en').value;
    const zh = $('custom-zh').value;
    $('custom-btn-add').disabled = !(en && zh);
  }

  return {
    init,
    onShow,
  };
})();

document.addEventListener('DOMContentLoaded', () => {
  WordsGame.init();
});
