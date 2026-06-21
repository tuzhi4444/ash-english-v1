// ===================== 通用工具：storage / toast / modal / 视图切换 =====================
// 替代小程序 wx.* API 的浏览器实现

function lsGet(k) {
  try {
    const v = localStorage.getItem(k);
    if (v === null || v === undefined) return null;
    try { return JSON.parse(v); } catch (e) { return v; }
  } catch (e) { return null; }
}
function lsSet(k, v) {
  try {
    const toStore = (typeof v === 'string') ? v : JSON.stringify(v);
    localStorage.setItem(k, toStore);
  } catch (e) {}
}
function lsRemove(k) {
  try { localStorage.removeItem(k); } catch (e) {}
}

// 替代 wx.vibrateShort
function vibrateShort() {
  try { if (navigator.vibrate) navigator.vibrate(30); } catch (e) {}
}

// 替代 wx.showToast
let _toastTimer = null;
function showToast(opts) {
  opts = opts || {};
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = opts.title || '';
  el.style.display = 'block';
  if (_toastTimer) clearTimeout(_toastTimer);
  const duration = opts.duration || 1500;
  _toastTimer = setTimeout(() => { el.style.display = 'none'; }, duration);
}

// 替代 wx.showModal —— 简易模态框，支持 editable（输入框）模式
function showModal(opts) {
  opts = opts || {};
  const overlay = document.getElementById('modal-overlay');
  const titleEl = document.getElementById('modal-title');
  const contentEl = document.getElementById('modal-content');
  const inputEl = document.getElementById('modal-input');
  const cancelBtn = document.getElementById('modal-btn-cancel');
  const confirmBtn = document.getElementById('modal-btn-confirm');

  titleEl.textContent = opts.title || '';
  contentEl.textContent = opts.content || '';
  contentEl.style.display = opts.content ? 'block' : 'none';

  const editable = !!opts.editable;
  inputEl.style.display = editable ? 'block' : 'none';
  inputEl.value = '';
  inputEl.placeholder = opts.placeholderText || '';

  cancelBtn.style.display = (opts.showCancel === false) ? 'none' : 'block';
  confirmBtn.textContent = opts.confirmText || '确认';

  overlay.style.display = 'flex';
  if (editable) setTimeout(() => inputEl.focus(), 50);

  function close() {
    overlay.style.display = 'none';
    cancelBtn.onclick = null;
    confirmBtn.onclick = null;
  }

  cancelBtn.onclick = () => {
    close();
    if (typeof opts.success === 'function') opts.success({ confirm: false, cancel: true, content: '' });
  };
  confirmBtn.onclick = () => {
    const content = editable ? inputEl.value : '';
    close();
    if (typeof opts.success === 'function') opts.success({ confirm: true, cancel: false, content });
  };
}

// ===================== 顶层视图切换：首页 <-> 单词学习 =====================
function showHomeView() {
  document.getElementById('view-home').style.display = '';
  document.getElementById('view-words').style.display = 'none';
  refreshHomeStats();
}

function showWordsView() {
  document.getElementById('view-home').style.display = 'none';
  document.getElementById('view-words').style.display = '';
  if (typeof WordsGame !== 'undefined' && WordsGame.onShow) {
    WordsGame.onShow();
  }
}

function refreshHomeStats() {
  try {
    const wordStore = lsGet('word_game_v2');
    const ws = wordStore ? (typeof wordStore === 'string' ? JSON.parse(wordStore) : wordStore) : {};
    const wordHighScore = ws.highScore || 0;

    const dayNum = lsGet('ash_words_day_number');
    const wordDayNumber = (dayNum && Number(dayNum) >= 1) ? Number(dayNum) : 1;

    document.getElementById('home-high-score').textContent = wordHighScore;
    document.getElementById('home-day-number').textContent = wordDayNumber;
  } catch (e) {}
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btn-go-words').addEventListener('click', () => {
    showWordsView();
  });
  refreshHomeStats();
});
