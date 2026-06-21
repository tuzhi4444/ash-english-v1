Page({
  data:{ url: '' },
  onLoad(options){
    const url = decodeURIComponent((options && options.url) || 'https://tuzhi4444.github.io/ash-english-v1/');
    this.setData({ url });
  }
});
