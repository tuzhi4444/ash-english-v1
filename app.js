const CLOUD_CONFIG = require('./utils/cloud-config.js');

App({
  onLaunch() {
    // 全局音频设置：忽略 iOS 静音开关
    wx.setInnerAudioOption({
      mixWithOther: false,
      obeyMuteSwitch: false,
    });

    if (!CLOUD_CONFIG.audioBaseUrl) {
      console.warn('未配置 audioBaseUrl，单词发音将回退到在线接口。');
    }
  }
});
