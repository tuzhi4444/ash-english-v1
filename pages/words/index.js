// ===================== 词库 =====================
// words.js 太大无法直接 require（小程序支持），用相对路径
const WORDS_DATA = require('../../words/words.js');
const CLOUD_CONFIG = require('../../utils/cloud-config.js');

const KEY = 'word_game_v2';
const BACKUP_KEY = 'word_game_v2_backup';
const MIGRATION_NOTICE_KEY = 'word_game_v2_migration_notice_v1';
const LEGACY_KEYS = ['word_card_game_v1', 'word_game_v1'];
const DAY_NUMBER_KEY = 'ash_words_day_number';
const START_DATE_KEY = 'ash_words_start_date';
const BASE_ROUND = 20;
const EBB_GAPS = [1, 2, 4, 7, 15];
const DAILY_NEW = 20;
const DAILY_MAX = 120;

// ===================== 存储工具 =====================
function wxGet(k) {
  try { return wx.getStorageSync(k); } catch { return null; }
}
function wxSet(k, v) {
  try { wx.setStorageSync(k, v); } catch {}
}
function wxRemove(k) {
  try { wx.removeStorageSync(k); } catch {}
}

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
  } catch {}
  try {
    const b = wxGet(BACKUP_KEY);
    if (b) {
      const data = normalizeStore(typeof b === 'string' ? JSON.parse(b) : b);
      wxSet(KEY, data);
      return data;
    }
  } catch {}
  for (const legacyKey of LEGACY_KEYS) {
    try {
      const legacy = wxGet(legacyKey);
      if (legacy) {
        const data = normalizeStore(typeof legacy === 'string' ? JSON.parse(legacy) : legacy);
        wxSet(KEY, data);
        wxSet(BACKUP_KEY, data);
        return data;
      }
    } catch {}
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
  const ymd = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
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
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
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

// ===================== Page =====================
Page({
  data: {
    // 视图状态：'intro' | 'game' | 'result' | 'mastered' | 'favorites' | 'learned' | 'stats' | 'tomorrow' | 'wordpool' | 'customWords'
    view: 'intro',
    // 当前单词卡
    prompt: '',
    answer: '',
    examplePos: '',
    exampleSentence: '',
    exampleSentenceZh: '',
    revealed: false,
    // 模式：card / dictation / spelling
    mode: 'card',
    // 输入框
    inputVal: '',
    inputResult: '',
    showInput: false,
    flipDisabled: false,
    knowDisabled: true,
    dontDisabled: true,
    checkDisabled: false,
    // 进度
    remain: 0,
    total: 0,
    currentIdx: 0,
    modeInfo: '',
    phase2Info: '',
    // 分数统计
    score: 0,
    streak: 0,
    highScore: 0,
    // 结算
    rScore: 0, rHigh: 0, rKnow: 0, rDont: 0, rStreak: 0, rRuns: 0, rIsNew: false,
    wrongCount: 0,
    // 已掌握列表
    masteredList: [],
    favoriteList: [],
    learnedList: [],
    // 明日计划
    tomorrowNew: [], tomorrowReview: [],
    tomorrowNewCount: 0, tomorrowReviewCount: 0,
    // 收藏/掌握按钮状态
    isFav: false, isMastered: false,
    autoSpeak: true,
    // 今天第几天
    dayNumber: 1,
    // 工具面板展开
    toolsExpanded: false,
    // 学习统计
    statsRuns: 0, statsHigh: 0, statsMastered: 0, statsFav: 0, statsLearned: 0,
    // 拼写闸门提示
    spellGateActive: false,
    // 拼写错误后等待用户点击确认才跳下一题
    waitingConfirm: false,
    // 词库管理
    wordPoolTotal: 0, wordPoolDeleted: 0,
    wordPoolList: [], wordPoolSearch: '', wordPoolFilter: 'all',
    // 自定义单词表
    customWordsList: [],
    customEn: '', customZh: '', customBatch: '',
  },

  _store: null,
  _state: null,
  _audioCtx: null,      // 当前播放的音频上下文
  _preloadCtx: null,    // 预加载下一题的音频上下文
  _preloadWord: '',     // 当前预加载的单词，避免重复预加载
  _preloadSources: null,

  onLoad() {
    this._store = loadStore();
    this._audioCtx = null;
    this._preloadCtx = null;
    this._preloadWord = '';
    this._preloadSources = null;
    this._enableShareMenu();
    // 强制开启自动发音（旧存档可能保存了 false，在此覆盖）
    this._store.autoSpeak = true;
    saveStore(this._store);
    this._maybeShowMigrationNotice();
    const dayNumber = getSelectedDayNumber();
    this.setData({ dayNumber, highScore: this._store.highScore || 0, autoSpeak: true });
    this._startGame('card');
  },

  _maybeShowMigrationNotice() {
    const recovered = Number(this._store && this._store._migrationRecoveredCount || 0);
    if (!recovered) return;
    if (wxGet(MIGRATION_NOTICE_KEY)) return;
    wxSet(MIGRATION_NOTICE_KEY, 1);
    wx.showToast({
      title: `已恢复${recovered}条历史学习记录`,
      icon: 'none',
      duration: 2200
    });
  },

  _enableShareMenu() {
    try {
      wx.showShareMenu({
        menus: ['shareAppMessage', 'shareTimeline']
      });
    } catch (e) {
      try { wx.showShareMenu(); } catch (_) {}
    }
  },

  onShareAppMessage() {
    const dayNumber = this.data.dayNumber || getSelectedDayNumber();
    return {
      title: `ASH英语单词学习｜第${dayNumber}天计划`,
      path: '/pages/index/index?from=share-words'
    };
  },

  onShareTimeline() {
    const dayNumber = this.data.dayNumber || getSelectedDayNumber();
    return {
      title: `ASH英语单词学习｜第${dayNumber}天计划`,
      query: 'from=share-words'
    };
  },

  onUnload() {
    if (this._audioCtx) {
      try { this._audioCtx.stop(); this._audioCtx.destroy(); } catch (e) {}
      this._audioCtx = null;
    }
    if (this._preloadCtx) {
      try { this._preloadCtx.destroy(); } catch (e) {}
      this._preloadCtx = null;
    }
    this._preloadSources = null;
  },

  onShow() {
    // 每次切换到此页面刷新高分
    if (this._store) {
      this.setData({ highScore: this._store.highScore || 0 });
    }
  },

  // ========== 工具面板 ==========
  toggleTools() {
    this.setData({ toolsExpanded: !this.data.toolsExpanded });
  },

  // ========== 开始游戏 ==========
  _startGame(mode, pool, sourceLabel) {
    const store = this._store;
    if (!pool) {
      const dayNum = getSelectedDayNumber();
      pool = buildDayPlanQueue(store, dayNum);
    }
    if (!pool.length) {
      wx.showToast({ title: '今日词库为空，请调整学习天数', icon: 'none', duration: 2500 });
      return;
    }
    const deck = pool.slice();
    this._state = {
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
    };
    this.setData({ view: 'game', mode, score: 0, streak: 0, highScore: store.highScore || 0 });
    this._renderCurrent();
  },

  startCard() { this._startGame('card'); this.setData({ toolsExpanded: false }); },
  startDictation() { this._startGame('dictation'); this.setData({ toolsExpanded: false }); },
  startSpelling() { this._startGame('spelling'); this.setData({ toolsExpanded: false }); },

  // ========== 渲染当前题 ==========
  _renderCurrent() {
    const st = this._state;
    const store = this._store;
    const w = st.phase2Active ? st.phase2Deck[st.phase2Idx] : st.deck[st.idx];
    if (!w) { this._finish(); return; }

    const wordObj = w;
    this._markLearned(w);

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

    // 拼写相关状态
    const showInput = st.mode === 'dictation' || st.mode === 'spelling' || !!st.spellGate || st.phase2Active;
    let flipText = '翻卡';
    let flipDisabled = false;
    if (st.phase2Active) { flipText = `第${st.phase2Round}遍拼写`; flipDisabled = true; }
    else if (st.spellGate) { flipText = '请先完成拼写'; flipDisabled = true; }
    else if (st.mode === 'spelling') { flipText = '拼写后自动翻卡'; flipDisabled = true; }
    else if (st.mode === 'dictation') { flipText = '翻卡(可跳过)'; }

    const promptText = wordObj ? wordObj.zh : '';
    const answerText = wordObj ? wordObj.en : '';
    // 直接使用单词对象中的例句数据
    const ex = {
      pos: wordObj ? wordObj.pos : '',
      sentence: wordObj ? wordObj.example : '',
      sentenceZh: wordObj ? wordObj.exampleZh : ''
    };
    const zhHint = '';

    this.setData({
      prompt: promptText,
      answer: answerText,
      examplePos: ex.pos || '',
      exampleSentence: ex.sentence || '',
      exampleSentenceZh: ex.sentenceZh || '',
      revealed: false,
      remain: left,
      total: st.deck.length,
      currentIdx: curIdx + 1,
      modeInfo,
      phase2Info,
      score: st.score,
      streak: st.streak,
      highScore: store.highScore || 0,
      inputVal: '',
      inputResult: '',
      showInput,
      flipText,
      flipDisabled,
      knowDisabled: true,
      dontDisabled: true,
      spellGateActive: !!st.spellGate,
      waitingConfirm: false,
      isFav: !!(store.favorites && w && store.favorites[w.en]),
      isMastered: !!(store.mastered && w && store.mastered[w.en]),
      autoSpeak: !!st.autoSpeak,
    });

    // 听写/拼写模式：自动发音
    if (st.autoSpeak && !st.phase2Active && !st.spellGate) {
      if (st.mode === 'dictation' || st.mode === 'spelling') {
        this._speak(answerText);
      }
    }

    // 预加载下一题
    const nextWord = this._getNextWord();
    if (nextWord) this._preload(nextWord.en);
  },

  // ========== 获取下一题单词（用于预加载）==========
  _getNextWord() {
    const st = this._state;
    if (!st) return null;
    if (st.phase2Active) {
      const nextIdx = st.phase2Idx + 1;
      return nextIdx < st.phase2Deck.length ? st.phase2Deck[nextIdx] : null;
    }
    const nextIdx = st.idx + 1;
    return nextIdx < st.deck.length ? st.deck[nextIdx] : null;
  },

  // ========== 翻卡 ==========
  onFlip() {
    const st = this._state;
    if (!st || st.revealed) return;
    if (st.phase2Active || st.spellGate || st.mode === 'spelling') return;
    st.revealed = true;
    const w = st.deck[st.idx];
    this.setData({ revealed: true, flipDisabled: true, knowDisabled: false, dontDisabled: false });
    // 翻卡时发音（此时已有用户交互，音频可正常播放）
    if (st.autoSpeak) this._speak(w.en);
  },

  // ========== 输入框变化 ==========
  onInput(e) {
    this._state && (this._state._inputVal = e.detail.value);
    this.setData({ inputVal: e.detail.value });
  },

  // ========== 提交拼写 ==========
  onCheckInput() {
    const st = this._state;
    if (!st) return;
    if (st.waitingConfirm) return;
    const w = st.phase2Active ? st.phase2Deck[st.phase2Idx] : st.deck[st.idx];
    const ans = String(w.en).trim().toLowerCase();
    const user = (this.data.inputVal || '').trim().toLowerCase();
    if (!user) { this.setData({ inputResult: '先输入再提交' }); return; }

    const ok = user === ans;
    st.checkedInput = true;

    if (st.phase2Active) {
      if (!ok) {
        st.phase2WrongMap.set(w.en, w);
        st.wrongMap.set(w.en, w);
        // 错误：显示正确答案，等待用户确认
        st.waitingConfirm = true;
        this.setData({ inputResult: `❌ 正确答案：${w.en}`, waitingConfirm: true });
        return;
      }
      // 正确：直接推进
      this.setData({ inputResult: '✅ 拼写正确', waitingConfirm: false });
      st.phase2Idx++;
      if (st.phase2Idx >= st.phase2Deck.length) {
        setTimeout(() => this._advancePhase2Round(), 600);
      } else {
        setTimeout(() => this._renderCurrent(), 600);
      }
      return;
    }

    // 拼写闸门
    if (st.spellGate) {
      if (!ok) {
        // 闸门错误：显示正确答案，等待确认
        st.waitingConfirm = true;
        this.setData({ inputResult: `❌ 正确答案：${w.en}`, waitingConfirm: true });
        return;
      }
      const gateType = st.spellGate;
      st.spellGate = null;
      const m = this._masteryOf(w);
      if (gateType === 'know') {
        st.score += 2; st.know++; st.streak++; st.maxStreak = Math.max(st.maxStreak, st.streak);
        this._setMastery(w, m + 1);
      } else {
        st.dont++; st.streak = 0; this._setMastery(w, m - 1); st.wrongMap.set(w.en, w);
      }
      updateEbbinghausProgress(this._store, w, gateType);
      saveStore(this._store);
      this.setData({ inputResult: '✅ 拼写正确', waitingConfirm: false });
      setTimeout(() => this._next(), 600);
      return;
    }

    // 拼写模式：自动判断
    if (st.mode === 'spelling') {
      if (!ok) {
        // 错误：显示正确答案，等待确认
        st.waitingConfirm = true;
        this.setData({ inputResult: `❌ 正确答案：${w.en}`, waitingConfirm: true });
        return;
      }
      // 拼对后翻卡，显示词形拆解作为奖励信息
      st.revealed = true;
      this.setData({ inputResult: '✅ 拼写正确', waitingConfirm: false, revealed: true });
      setTimeout(() => this._judge('know'), 800);
      return;
    }

    // 听写模式：拼写错误时也等待确认
    if (!ok) {
      st.waitingConfirm = true;
      this.setData({ inputResult: `❌ 正确答案：${w.en}`, waitingConfirm: true });
      return;
    }
    this.setData({ inputResult: '✅ 拼写正确', waitingConfirm: false });
    // 听写模式拼写正确：显示结果后翻卡
    st.revealed = true;
    this.setData({ revealed: true, flipDisabled: true, knowDisabled: false, dontDisabled: false });
  },

  // ========== 拼写错误后用户确认，跳入下一题 ==========
  onConfirmWrong() {
    const st = this._state;
    if (!st || !st.waitingConfirm) return;
    st.waitingConfirm = false;
    this.setData({ waitingConfirm: false });

    // 第二遍及之后
    if (st.phase2Active) {
      st.phase2Idx++;
      if (st.phase2Idx >= st.phase2Deck.length) {
        this._advancePhase2Round();
      } else {
        this._renderCurrent();
      }
      return;
    }

    // 拼写闸门：闸门模式下错误确认后，按"dont"计入并跳下一题
    if (st.spellGate) {
      const gateType = st.spellGate;
      st.spellGate = null;
      const w = st.deck[st.idx];
      const m = this._masteryOf(w);
      st.dont++; st.streak = 0; this._setMastery(w, m - 1); st.wrongMap.set(w.en, w);
      updateEbbinghausProgress(this._store, w, 'dont');
      saveStore(this._store);
      this._next();
      return;
    }

    // 拼写模式：错误确认后按 dont 计入
    if (st.mode === 'spelling') {
      this._judge('dont');
      return;
    }

    // 听写模式：错误确认后翻卡，让用户自己判断认识/不认识
    st.revealed = true;
    this.setData({ revealed: true, flipDisabled: true, knowDisabled: false, dontDisabled: false });
  },

  // ========== 认识 / 不认识 ==========
  onKnow() { this._judge('know'); },
  onDont() { this._judge('dont'); },

  _judge(type) {
    const st = this._state;
    const w = st.deck[st.idx];
    const m = this._masteryOf(w);

    if (type === 'dont' && !st.spellGate && st.mode !== 'spelling') {
      this._startSpellGate(type);
      return;
    }
    if (type === 'know') {
      st.score += 2; st.know++; st.streak++; st.maxStreak = Math.max(st.maxStreak, st.streak);
      this._setMastery(w, m + 1);
    } else {
      st.dont++; st.streak = 0; this._setMastery(w, m - 1); st.wrongMap.set(w.en, w);
    }
    updateEbbinghausProgress(this._store, w, type);
    saveStore(this._store);
    this._next();
  },

  _startSpellGate(type) {
    const st = this._state;
    st.spellGate = type;
    st.revealed = false;
    this.setData({
      revealed: false, showInput: true, inputVal: '', inputResult: '需拼写通过才可继续',
      flipDisabled: true, knowDisabled: true, dontDisabled: true, spellGateActive: true
    });
  },

  _next() {
    const st = this._state;
    // 句子听写模式不需要第二遍拼写校验
    if (st.skipPhase2) {
      st.idx++;
      if (st.idx >= st.deck.length) { this._finish(); return; }
      this._renderCurrent();
      return;
    }
    st.idx++;
    if (st.idx >= st.deck.length) {
      this._startSecondPass();
      return;
    }
    this._renderCurrent();
  },

  _startSecondPass() {
    const st = this._state;
    st.phase2Active = true;
    st.phase2Deck = st.deck.slice();
    st.phase2Idx = 0;
    st.phase2Round = 2;
    st.phase2WrongMap = new Map();
    wx.showModal({
      title: '第一遍完成',
      content: '进入第二遍拼写校验：错误词会自动进入下一遍，直到0错误才完成今日任务。',
      showCancel: false,
      confirmText: '开始拼写',
      success: () => this._renderCurrent()
    });
  },

  _advancePhase2Round() {
    const st = this._state;
    const wrongList = [...st.phase2WrongMap.values()];
    if (!wrongList.length) { this._finish(); return; }
    st.phase2Round += 1;
    // 第三遍起随机打乱顺序，避免靠位置记忆
    if (st.phase2Round >= 3) {
      for (let i = wrongList.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [wrongList[i], wrongList[j]] = [wrongList[j], wrongList[i]];
      }
    }
    st.phase2Deck = wrongList;
    st.phase2Idx = 0;
    st.phase2WrongMap = new Map();
    wx.showModal({
      title: `进入第${st.phase2Round}遍`,
      content: `上一遍仍有 ${wrongList.length} 个错词${st.phase2Round >= 3 ? '，顺序已随机打乱' : ''}，继续拼写直到全对。`,
      showCancel: false,
      confirmText: '继续',
      success: () => this._renderCurrent()
    });
  },

  _finish() {
    const st = this._state;
    const store = this._store;
    store.totalRuns = (store.totalRuns || 0) + 1;
    const isNew = st.score > (store.highScore || 0);
    if (isNew) store.highScore = st.score;
    delete store.resume;
    saveStore(store);
    this.setData({
      view: 'result',
      rScore: st.score, rHigh: store.highScore,
      rKnow: st.know, rDont: st.dont,
      rStreak: st.maxStreak, rRuns: store.totalRuns,
      rIsNew: isNew, wrongCount: st.wrongMap.size
    });
  },

  // ========== 结算操作 ==========
  onRestart() {
    const st = this._state;
    const store = this._store;
    const dayNum = getSelectedDayNumber();
    const pool = buildDayPlanQueue(store, dayNum);
    this._startGame(st ? st.mode : 'card', pool);
  },

  onReplayWrong() {
    const st = this._state;
    if (!st || !st.wrongMap.size) return;
    const pool = [...st.wrongMap.values()];
    this._startGame(st.mode, pool, '错词重练');
  },

  // ========== 已掌握管理 ==========
  onShowMastered() {
    const store = this._store;
    const list = this._pickWordsByEns(Object.keys(store.mastered || {}));
    this.setData({ masteredList: list, view: 'mastered', toolsExpanded: false });
  },

  onUnmaster(e) {
    const en = e.currentTarget.dataset.en;
    const store = this._store;
    if (store.mastered && store.mastered[en]) {
      delete store.mastered[en];
      saveStore(store);
      this.onShowMastered();
    }
  },

  onShowFavorites() {
    const store = this._store;
    const list = this._pickWordsByEns(Object.keys(store.favorites || {}));
    this.setData({ favoriteList: list, view: 'favorites', toolsExpanded: false });
  },

  onUnfavorite(e) {
    const en = e.currentTarget.dataset.en;
    const store = this._store;
    if (store.favorites && store.favorites[en]) {
      delete store.favorites[en];
      saveStore(store);
      this.onShowFavorites();
    }
  },

  onShowLearned() {
    const store = this._store;
    const list = this._pickLearnedWords();
    this.setData({ learnedList: list, view: 'learned', toolsExpanded: false });
  },

  onFavoriteDrill() {
    const store = this._store;
    const pool = this._pickWordsByEns(Object.keys(store.favorites || {}));
    if (!pool.length) {
      wx.showToast({ title: '暂无收藏单词', icon: 'none' });
      return;
    }
    wx.showToast({ title: `开始练${pool.length}个收藏词`, icon: 'none', duration: 1200 });
    this._startGame('card', pool, '收藏单词重练');
    this.setData({ toolsExpanded: false });
  },

  // ========== 明日计划 ==========
  onShowTomorrow() {
    const store = this._store;
    const dayNum = getSelectedDayNumber();
    const tmrDay = dayNum + 1;
    const fresh = buildFixedDayQueue(store, tmrDay);
    const full = buildDayPlanQueue(store, tmrDay);
    const freshSet = new Set(fresh.map(w => w.en));
    const review = full.filter(w => !freshSet.has(w.en));
    this.setData({
      tomorrowNew: fresh.slice(0, 60),
      tomorrowReview: review.slice(0, 60),
      tomorrowNewCount: fresh.length,
      tomorrowReviewCount: review.length,
      view: 'tomorrow',
      toolsExpanded: false
    });
  },

  // ========== 学习统计 ==========
  onShowStats() {
    const store = this._store;
    this.setData({
      statsRuns: store.totalRuns || 0,
      statsHigh: store.highScore || 0,
      statsMastered: Object.keys(store.mastered || {}).length,
      statsFav: Object.keys(store.favorites || {}).length,
      statsLearned: Object.keys(store.learned || {}).length,
      view: 'stats',
      toolsExpanded: false
    });
  },

  // ========== 词库管理（删除已会单词）==========
  onShowWordPool() {
    const store = this._store;
    const words = getWordList(store);
    const mastered = store.mastered || {};
    let deleted = 0;
    const list = words.map(w => {
      const d = !!(mastered[w.en]);
      if (d) deleted++;
      return { ...w, _deleted: d };
    });
    this.setData({
      wordPoolTotal: words.length,
      wordPoolDeleted: deleted,
      wordPoolList: list,
      wordPoolSearch: '',
      wordPoolFilter: 'all',
      wordPoolHasSelected: false,
      view: 'wordpool',
      toolsExpanded: false
    });
  },

  onWordPoolSearch(e) {
    this.setData({ wordPoolSearch: e.detail.value });
    this._filterWordPool();
  },

  onWordPoolFilter(e) {
    this.setData({ wordPoolFilter: e.currentTarget.dataset.filter });
    this._filterWordPool();
  },

  _filterWordPool() {
    const store = this._store;
    const words = getWordList(store);
    const mastered = store.mastered || {};
    const search = (this.data.wordPoolSearch || '').trim().toLowerCase();
    const filter = this.data.wordPoolFilter;

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
      return { ...w, _deleted: d };
    });

    this.setData({
      wordPoolList: list,
      wordPoolDeleted: filter === 'deleted' ? list.length : (filter === 'active' ? 0 : undefined)
    });
  },

  onToggleWordDelete(e) {
    // checkbox 在微信小程序中需要手动处理
    const en = e.currentTarget.dataset.en;
    const store = this._store;
    if (!store.mastered) store.mastered = {};
    if (store.mastered[en]) {
      delete store.mastered[en];
    } else {
      store.mastered[en] = true;
    }
    saveStore(store);
    this._filterWordPool();
  },

  // ========== 自定义单词表 ==========
  onShowCustomWords() {
    const store = this._store;
    const list = (store.customWords || []).slice();
    this.setData({
      customWordsList: list,
      customEn: '',
      customZh: '',
      customBatch: '',
      view: 'customWords',
      toolsExpanded: false
    });
  },

  onCustomEnInput(e) { this.setData({ customEn: e.detail.value }); },
  onCustomZhInput(e) { this.setData({ customZh: e.detail.value }); },
  onCustomBatchInput(e) { this.setData({ customBatch: e.detail.value }); },

  onAddCustomWord() {
    const en = (this.data.customEn || '').trim();
    const zh = (this.data.customZh || '').trim();
    if (!en || !zh) {
      wx.showToast({ title: '请输入英文和中文', icon: 'none' });
      return;
    }
    const store = this._store;
    if (!store.customWords) store.customWords = [];
    // 检查是否已存在
    const existing = store.customWords.find(w => w.en.toLowerCase() === en.toLowerCase());
    if (existing) {
      existing.zh = zh; // 更新释义
    } else {
      store.customWords.push({ en, zh });
    }
    saveStore(store);
    this.setData({
      customEn: '', customZh: '',
      customWordsList: store.customWords.slice()
    });
    wx.showToast({ title: existing ? '已更新' : '已添加', icon: 'success' });
  },

  onImportCustomWords() {
    const text = (this.data.customBatch || '').trim();
    if (!text) return;
    const store = this._store;
    if (!store.customWords) store.customWords = [];
    const lines = text.split(/[\n\r]+/).filter(Boolean);
    let added = 0;
    const existingMap = new Map(store.customWords.map(w => [w.en.toLowerCase(), w]));
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      // 尝试多种分隔符：空格、tab、中文分割
      let en = '', zh = '';
      // 先按 tabs 分
      const tabParts = trimmed.split(/\t+/);
      if (tabParts.length >= 2) {
        en = tabParts[0].trim();
        zh = tabParts.slice(1).join(' ').trim();
      } else {
        // 按第一个空格或中文之后分割
        const spaceIdx = trimmed.search(/[\s\u4e00-\u9fff]/);
        if (spaceIdx > 0) {
          en = trimmed.substring(0, spaceIdx).trim();
          zh = trimmed.substring(spaceIdx).trim();
        } else {
          continue; // 无法解析的跳过
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
    this.setData({
      customBatch: '',
      customWordsList: store.customWords.slice()
    });
    wx.showToast({ title: `导入了 ${added} 个新词`, icon: 'success' });
  },

  onRemoveCustomWord(e) {
    const en = e.currentTarget.dataset.en;
    const store = this._store;
    if (!store.customWords) store.customWords = [];
    store.customWords = store.customWords.filter(w => w.en !== en);
    saveStore(store);
    this.setData({ customWordsList: store.customWords.slice() });
    wx.showToast({ title: '已删除', icon: 'success' });
  },

  // ========== 返回 ==========
  onBackToGame() { this.setData({ view: 'game' }); this._renderCurrent(); },
  onBackToIntro() { this.setData({ view: 'intro' }); },

  // ========== 收藏 / 删除 ==========
  onToggleFav() {
    const st = this._state;
    const store = this._store;
    if (!st) return;
    const w = st.phase2Active ? st.phase2Deck[st.phase2Idx] : st.deck[st.idx];
    if (!w) return;
    if (!store.favorites) store.favorites = {};
    if (store.favorites[w.en]) delete store.favorites[w.en];
    else store.favorites[w.en] = true;
    saveStore(store);
    this.setData({ isFav: !!(store.favorites[w.en]) });
  },

  onDeleteWord() {
    const st = this._state;
    const store = this._store;
    if (!st) return;
    const w = st.phase2Active ? st.phase2Deck[st.phase2Idx] : st.deck[st.idx];
    if (!w) return;
    if (!store.mastered) store.mastered = {};
    store.mastered[w.en] = true;
    saveStore(store);

    // 直接标记不认识 + 跳过拼写闸门跳到下一题
    st.dont++;
    st.streak = 0;
    st.wrongMap.set(w.en, w);
    updateEbbinghausProgress(store, w, 'dont');
    this.setData({ isMastered: true, score: st.score, streak: st.streak });
    wx.showToast({ title: `已删除「${w.en}」`, icon: 'success', duration: 1000 });
    setTimeout(() => { this._next(); }, 400);
  },

  // ========== 自动发音 ==========
  onToggleAutoSpeak() {
    const st = this._state;
    const store = this._store;
    const val = !this.data.autoSpeak;
    if (st) st.autoSpeak = val;
    store.autoSpeak = val;
    saveStore(store);
    this.setData({ autoSpeak: val });
  },

  async _getAudioSources(word) {
    const cleanWord = String(word || '').trim();
    if (!cleanWord) return [];
    const sources = [];
    const base = String(CLOUD_CONFIG.audioBaseUrl || '').replace(/\/+$/, '');
    if (base) {
      sources.push(`${base}/${encodeURIComponent(cleanWord)}.mp3`);
    }
    if (CLOUD_CONFIG.fallbackToBaidu !== false) {
      sources.push(`https://fanyi.baidu.com/gettts?lan=uk&text=${encodeURIComponent(cleanWord)}&spd=3`);
    }
    return sources;
  },

  // ========== 发音：Vercel CDN 优先，百度 TTS 兜底 ==========
  async _speak(text) {
    if (!text) return;
    const word = String(text).trim();
    const sources = await this._getAudioSources(word);
    if (!sources.length) return;
    try {
      if (this._audioCtx) {
        try { this._audioCtx.stop(); this._audioCtx.destroy(); } catch (e) {}
        this._audioCtx = null;
      }
      const ctx = wx.createInnerAudioContext();
      ctx.obeyMuteSwitch = false;
      ctx.volume = 1;
      ctx.src = sources[0];
      ctx.onCanplay(() => {
        try { ctx.play(); } catch (e) {}
      });
      ctx.onError(() => {
        if (sources.length > 1) {
          ctx.src = sources[1];
        } else {
          wx.showToast({ title: '发音加载失败', icon: 'none', duration: 1500 });
        }
      });
      this._audioCtx = ctx;
    } catch (e) {}
  },

  // ========== 预加载 ==========
  async _preload(text) {
    if (!text) return;
    const word = String(text).trim();
    if (this._preloadWord === word && this._preloadCtx) return;
    const sources = await this._getAudioSources(word);
    if (!sources.length) return;
    try {
      if (this._preloadCtx) {
        try { this._preloadCtx.destroy(); } catch (e) {}
        this._preloadCtx = null;
      }
      const ctx = wx.createInnerAudioContext();
      ctx.obeyMuteSwitch = false;
      ctx.volume = 1;
      ctx.src = sources[0];
      this._preloadCtx = ctx;
      this._preloadWord = word;
    } catch (e) {}
  },

  onSpeakWord() {
    const st = this._state;
    if (!st) return;
    const w = st.phase2Active ? st.phase2Deck[st.phase2Idx] : st.deck[st.idx];
    if (!w) return;
    this._speak(w.en);
  },

  // ========== 选择学习天数 ==========
  onSelectDay() {
    const cur = getSelectedDayNumber();
    wx.showModal({
      title: '选择学习第几天',
      content: `当前：第${cur}天\n规则：每天20个新词+艾宾浩斯复习\n请在确认后的对话框输入天数`,
      showCancel: true,
      confirmText: '去输入',
      success: (res) => {
        if (!res.confirm) return;
        // 小程序无原生 prompt，用 input 弹窗模拟
        this._promptDayInput();
      }
    });
  },

  _promptDayInput() {
    // 小程序通过跳转到专用输入页或使用 picker，这里用连续 showModal 简化
    wx.showModal({
      title: '输入天数',
      editable: true,
      placeholderText: '如：1、2、3',
      success: (res) => {
        if (!res.confirm) return;
        const v = String(res.content || '').trim();
        const n = Number(v);
        if (!Number.isInteger(n) || n < 1) {
          wx.showToast({ title: '请输入正整数，如1/2/3', icon: 'none' });
          return;
        }
        wxSet(DAY_NUMBER_KEY, n);
        this.setData({ dayNumber: n });
        wx.showToast({ title: `已切换到第${n}天`, icon: 'success' });
        setTimeout(() => this._startGame('card'), 1000);
      }
    });
  },

  // ========== 工具按钮（错词重练）==========
  onWrongDrill() {
    const st = this._state;
    if (!st || !st.wrongMap.size) {
      wx.showToast({ title: '暂无错词', icon: 'none' });
      return;
    }
    const pool = [...st.wrongMap.values()];
    this._startGame(st.mode || 'card', pool, '错词重练');
    this.setData({ toolsExpanded: false });
  },

  // ========== 工具函数 ==========
  _pickWordsByEns(ens) {
    const store = this._store;
    const wordList = getWordList(store);
    const map = new Map(wordList.map(w => [String(w.en || '').trim().toLowerCase(), w]));
    return ens.map(en => map.get(String(en || '').trim().toLowerCase())).filter(Boolean);
  },

  _pickLearnedWords() {
    const store = this._store;
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
  },

  _markLearned(w) {
    if (!w || !w.en) return;
    const store = this._store;
    if (!store.learned) store.learned = {};
    const key = String(w.en).trim().toLowerCase();
    const today = todayStr();
    const old = store.learned[key] || {};
    store.learned[key] = {
      firstSeen: old.firstSeen || today,
      lastSeen: today
    };
    saveStore(store);
  },

  _masteryOf(w) { return Math.max(0, Number((this._store.mastery || {})[w.en] || 0)); },
  _setMastery(w, v) { if (!this._store.mastery) this._store.mastery = {}; this._store.mastery[w.en] = Math.max(0, Math.floor(v)); },
});
