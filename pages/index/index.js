Page({
  data: {
    wordHighScore: 0,
    wordDayNumber: 1,
  },

  onLoad() {
    this._enableShareMenu();
  },

  onShow() {
    // 每次显示首页时刷新统计数据
    this._refreshStats();
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
    return {
      title: 'ASH英语：背单词',
      path: '/pages/index/index'
    };
  },

  onShareTimeline() {
    return {
      title: 'ASH英语：背单词',
      query: ''
    };
  },

  _refreshStats() {
    try {
      const wordStore = wx.getStorageSync('word_game_v2');
      const ws = wordStore ? (typeof wordStore === 'string' ? JSON.parse(wordStore) : wordStore) : {};
      const wordHighScore = ws.highScore || 0;

      const dayNum = wx.getStorageSync('ash_words_day_number');
      const wordDayNumber = (dayNum && Number(dayNum) >= 1) ? Number(dayNum) : 1;

      this.setData({ wordHighScore, wordDayNumber });
    } catch {}
  },

  goWords() {
    wx.switchTab({ url: '/pages/words/index' });
  },
});
