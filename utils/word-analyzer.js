// ===================== 智能词形分析引擎 =====================
// 将单词拆成词根/词缀/组成部分，生成有意义的学习提示

// 前缀（prefix）：改词义方向
const PREFIXES = [
  { part: 'anti', meaning: '反对/抗', en: 'against' },
  { part: 'auto', meaning: '自己/自动', en: 'self' },
  { part: 'bi', meaning: '两/双', en: 'two' },
  { part: 'co', meaning: '共同', en: 'together' },
  { part: 'col', meaning: '共同', en: 'together' },  // com 变体
  { part: 'com', meaning: '共同/一起', en: 'together' },
  { part: 'con', meaning: '共同/一起', en: 'together' },
  { part: 'contra', meaning: '反对/相反', en: 'against' },
  { part: 'counter', meaning: '反对/相反', en: 'against' },
  { part: 'de', meaning: '去除/向下/相反', en: 'remove/down' },
  { part: 'dis', meaning: '不/相反', en: 'not/opposite' },
  { part: 'en', meaning: '使/进入', en: 'make/into' },
  { part: 'ex', meaning: '向外/前任', en: 'out/former' },
  { part: 'extra', meaning: '额外/超出', en: 'beyond' },
  { part: 'fore', meaning: '前/预先', en: 'before' },
  { part: 'il', meaning: '不/非', en: 'not' },  // in 变体
  { part: 'im', meaning: '不/向内', en: 'not/into' },
  { part: 'in', meaning: '不/向内', en: 'not/into' },
  { part: 'inter', meaning: '在……之间/互相', en: 'between' },
  { part: 'ir', meaning: '不/非', en: 'not' },
  { part: 'mal', meaning: '坏/错误', en: 'bad/wrong' },
  { part: 'micro', meaning: '微/小', en: 'small' },
  { part: 'mid', meaning: '中间', en: 'middle' },
  { part: 'mini', meaning: '小/迷你', en: 'small' },
  { part: 'mis', meaning: '错误/坏', en: 'wrong/bad' },
  { part: 'mono', meaning: '单/一', en: 'one/single' },
  { part: 'multi', meaning: '多', en: 'many' },
  { part: 'non', meaning: '非/不', en: 'not' },
  { part: 'out', meaning: '超过/向外', en: 'out/beyond' },
  { part: 'over', meaning: '过度/在上方', en: 'too much/above' },
  { part: 'poly', meaning: '多', en: 'many' },
  { part: 'post', meaning: '后/之后', en: 'after' },
  { part: 'pre', meaning: '前/预先', en: 'before' },
  { part: 'pro', meaning: '向前/支持', en: 'forward/for' },
  { part: 're', meaning: '再次/返回', en: 'again/back' },
  { part: 'semi', meaning: '半', en: 'half' },
  { part: 'sub', meaning: '下面的/次', en: 'under' },
  { part: 'super', meaning: '超级/上方', en: 'above/beyond' },
  { part: 'tele', meaning: '远/远程', en: 'far' },
  { part: 'trans', meaning: '跨越/转变', en: 'across' },
  { part: 'tri', meaning: '三', en: 'three' },
  { part: 'un', meaning: '不/非', en: 'not' },
  { part: 'under', meaning: '在下/不足', en: 'under/not enough' },
  { part: 'uni', meaning: '单一/统一', en: 'one' },
  { part: 'up', meaning: '向上', en: 'up' },
];

// 词根（root）：承载核心义
const ROOTS = [
  { part: 'act', meaning: '行动/做', en: 'do/drive' },
  { part: 'ag', meaning: '做/行动', en: 'do/act' },
  { part: 'agri', meaning: '田地/农业', en: 'field' },
  { part: 'alter', meaning: '其他/改变', en: 'other/change' },
  { part: 'am', meaning: '爱', en: 'love' },
  { part: 'ambul', meaning: '走/行走', en: 'walk' },
  { part: 'anim', meaning: '生命/气息', en: 'life/spirit' },
  { part: 'ann', meaning: '年', en: 'year' },
  { part: 'aqua', meaning: '水', en: 'water' },
  { part: 'aster', meaning: '星星', en: 'star' },
  { part: 'aud', meaning: '听', en: 'hear' },
  { part: 'bene', meaning: '好/善', en: 'good/well' },
  { part: 'bio', meaning: '生命', en: 'life' },
  { part: 'cap', meaning: '头/取', en: 'head/take' },
  { part: 'cardi', meaning: '心脏', en: 'heart' },
  { part: 'cede', meaning: '走/让步', en: 'go/yield' },
  { part: 'cent', meaning: '百', en: 'hundred' },
  { part: 'chron', meaning: '时间', en: 'time' },
  { part: 'cide', meaning: '杀', en: 'kill' },
  { part: 'circ', meaning: '圆/环', en: 'ring/circle' },
  { part: 'claim', meaning: '喊/声称', en: 'shout/declare' },
  { part: 'clar', meaning: '清楚', en: 'clear' },
  { part: 'cogn', meaning: '知道/认识', en: 'know' },
  { part: 'corp', meaning: '身体', en: 'body' },
  { part: 'cred', meaning: '相信/信用', en: 'believe/trust' },
  { part: 'cur', meaning: '跑/流', en: 'run/flow' },
  { part: 'cycl', meaning: '圆/循环', en: 'circle/cycle' },
  { part: 'dem', meaning: '人民', en: 'people' },
  { part: 'dent', meaning: '牙齿', en: 'tooth' },
  { part: 'dict', meaning: '说', en: 'say/speak' },
  { part: 'don', meaning: '给予', en: 'give' },
  { part: 'duc', meaning: '引导/拉', en: 'lead/pull' },
  { part: 'dur', meaning: '持久', en: 'last/hard' },
  { part: 'ego', meaning: '我/自我', en: 'I/self' },
  { part: 'equ', meaning: '平等', en: 'equal' },
  { part: 'fac', meaning: '做/制造', en: 'do/make' },
  { part: 'fend', meaning: '打击/防御', en: 'strike/defend' },
  { part: 'fer', meaning: '带来/承载', en: 'bring/carry' },
  { part: 'fess', meaning: '说/承认', en: 'speak/confess' },
  { part: 'fin', meaning: '结束/界限', en: 'end/limit' },
  { part: 'flect', meaning: '弯曲', en: 'bend' },
  { part: 'form', meaning: '形状/形成', en: 'shape/form' },
  { part: 'fort', meaning: '强/力量', en: 'strong' },
  { part: 'fract', meaning: '打破/碎', en: 'break' },
  { part: 'fus', meaning: '流/倾倒', en: 'pour/melt' },
  { part: 'gen', meaning: '出生/产生', en: 'birth/produce' },
  { part: 'geo', meaning: '地球/土地', en: 'earth' },
  { part: 'grad', meaning: '步/级', en: 'step/grade' },
  { part: 'graph', meaning: '写/画', en: 'write/draw' },
  { part: 'grat', meaning: '感激/高兴', en: 'pleasing' },
  { part: 'habit', meaning: '居住/习惯', en: 'dwell/habit' },
  { part: 'her', meaning: '粘/继承', en: 'stick/inherit' },
  { part: 'hydr', meaning: '水', en: 'water' },
  { part: 'ject', meaning: '投/扔', en: 'throw' },
  { part: 'jud', meaning: '判断/法律', en: 'judge/law' },
  { part: 'junct', meaning: '连接', en: 'join' },
  { part: 'jur', meaning: '法律/发誓', en: 'law/swear' },
  { part: 'lect', meaning: '选择/收集', en: 'choose/gather' },
  { part: 'leg', meaning: '法律', en: 'law' },
  { part: 'liber', meaning: '自由', en: 'free' },
  { part: 'lingu', meaning: '语言', en: 'language/tongue' },
  { part: 'loc', meaning: '地方/位置', en: 'place' },
  { part: 'log', meaning: '说/语言/学', en: 'speech/study' },
  { part: 'luc', meaning: '光/亮', en: 'light' },
  { part: 'magn', meaning: '大/伟大', en: 'great/large' },
  { part: 'man', meaning: '手', en: 'hand' },
  { part: 'mand', meaning: '命令/委托', en: 'order/entrust' },
  { part: 'mar', meaning: '海', en: 'sea' },
  { part: 'medi', meaning: '中间', en: 'middle' },
  { part: 'memor', meaning: '记忆', en: 'remember' },
  { part: 'ment', meaning: '心/思考', en: 'mind/think' },
  { part: 'migr', meaning: '迁移', en: 'move/migrate' },
  { part: 'min', meaning: '小/突出', en: 'small/project' },
  { part: 'miss', meaning: '送/发射', en: 'send' },
  { part: 'mob', meaning: '移动', en: 'move' },
  { part: 'mort', meaning: '死亡', en: 'death' },
  { part: 'nat', meaning: '出生/天生', en: 'born' },
  { part: 'nect', meaning: '连接', en: 'connect' },
  { part: 'neg', meaning: '否定/无', en: 'deny/none' },
  { part: 'nomin', meaning: '名字', en: 'name' },
  { part: 'nov', meaning: '新', en: 'new' },
  { part: 'numer', meaning: '数字', en: 'number' },
  { part: 'oper', meaning: '工作/操作', en: 'work' },
  { part: 'opt', meaning: '选择/视力', en: 'choose/sight' },
  { part: 'ord', meaning: '秩序/顺序', en: 'order' },
  { part: 'paci', meaning: '和平', en: 'peace' },
  { part: 'part', meaning: '部分/分开', en: 'part/divide' },
  { part: 'pass', meaning: '走/通过', en: 'go through' },
  { part: 'path', meaning: '感受/疾病', en: 'feeling/suffering' },
  { part: 'ped', meaning: '脚/儿童', en: 'foot/child' },
  { part: 'pend', meaning: '悬挂/支付', en: 'hang/pay' },
  { part: 'pet', meaning: '追求/寻求', en: 'seek/strive' },
  { part: 'phil', meaning: '爱', en: 'love' },
  { part: 'phon', meaning: '声音', en: 'sound/voice' },
  { part: 'photo', meaning: '光', en: 'light' },
  { part: 'pict', meaning: '画/描绘', en: 'paint' },
  { part: 'plac', meaning: '使高兴/放置', en: 'please/place' },
  { part: 'plen', meaning: '满/填充', en: 'full/fill' },
  { part: 'plic', meaning: '折叠/叠', en: 'fold' },
  { part: 'plor', meaning: '哭喊/流出', en: 'cry/flow' },
  { part: 'pon', meaning: '放置', en: 'put/place' },
  { part: 'port', meaning: '携带/港口', en: 'carry/gate' },
  { part: 'pos', meaning: '放置', en: 'put/place' },
  { part: 'poten', meaning: '有力的/能力', en: 'powerful' },
  { part: 'press', meaning: '压/按', en: 'press' },
  { part: 'prim', meaning: '第一/首要', en: 'first' },
  { part: 'priv', meaning: '私人/单独', en: 'private' },
  { part: 'prob', meaning: '检验/证明', en: 'test/prove' },
  { part: 'psych', meaning: '心灵/精神', en: 'mind/soul' },
  { part: 'puls', meaning: '推/驱动', en: 'push/drive' },
  { part: 'pur', meaning: '纯净', en: 'pure' },
  { part: 'put', meaning: '思考/计算', en: 'think/calculate' },
  { part: 'quest', meaning: '寻求/询问', en: 'seek/ask' },
  { part: 'radi', meaning: '射线/根', en: 'ray/root' },
  { part: 'rect', meaning: '直/正/规则', en: 'straight/right' },
  { part: 'rupt', meaning: '破裂/打断', en: 'break/burst' },
  { part: 'san', meaning: '健康/神圣', en: 'healthy/holy' },
  { part: 'sci', meaning: '知道', en: 'know' },
  { part: 'scrib', meaning: '写', en: 'write' },
  { part: 'sect', meaning: '切割', en: 'cut' },
  { part: 'sens', meaning: '感觉', en: 'feel/sense' },
  { part: 'sequ', meaning: '跟随', en: 'follow' },
  { part: 'serv', meaning: '服务/保存/奴隶', en: 'serve/keep/slave' },
  { part: 'sign', meaning: '标记/符号', en: 'mark/sign' },
  { part: 'simil', meaning: '相似/相同', en: 'like/same' },
  { part: 'sist', meaning: '站立', en: 'stand' },
  { part: 'sol', meaning: '单独/太阳', en: 'alone/sun' },
  { part: 'son', meaning: '声音', en: 'sound' },
  { part: 'soph', meaning: '智慧', en: 'wisdom' },
  { part: 'spec', meaning: '看', en: 'look/see' },
  { part: 'spir', meaning: '呼吸/精神', en: 'breathe/spirit' },
  { part: 'st', meaning: '站立', en: 'stand' },
  { part: 'struct', meaning: '建造/结构', en: 'build' },
  { part: 'sum', meaning: '总和/最高', en: 'total/highest' },
  { part: 'tact', meaning: '触摸/接触', en: 'touch' },
  { part: 'tend', meaning: '伸展/倾向', en: 'stretch/tend' },
  { part: 'terr', meaning: '土地/恐惧', en: 'earth/frighten' },
  { part: 'test', meaning: '证明/测试', en: 'witness/test' },
  { part: 'therm', meaning: '热', en: 'heat' },
  { part: 'tort', meaning: '扭曲', en: 'twist' },
  { part: 'tract', meaning: '拉/拖', en: 'pull/draw' },
  { part: 'tribut', meaning: '给予/分派', en: 'give/assign' },
  { part: 'urb', meaning: '城市', en: 'city' },
  { part: 'vac', meaning: '空/空虚', en: 'empty' },
  { part: 'val', meaning: '价值/强', en: 'value/strong' },
  { part: 'ven', meaning: '来', en: 'come' },
  { part: 'ver', meaning: '真实', en: 'true' },
  { part: 'verb', meaning: '词语', en: 'word' },
  { part: 'vers', meaning: '转/转变', en: 'turn' },
  { part: 'vid', meaning: '看', en: 'see' },
  { part: 'vis', meaning: '看', en: 'see' },
  { part: 'viv', meaning: '活/生命', en: 'live/life' },
  { part: 'voc', meaning: '声音/呼唤', en: 'voice/call' },
  { part: 'vol', meaning: '意愿/滚动', en: 'wish/roll' },
  { part: 'volv', meaning: '滚/转', en: 'roll/turn' },
  { part: 'zo', meaning: '动物', en: 'animal' },
];

// 后缀（suffix）：定词性
const SUFFIXES = [
  { part: 'able', meaning: '能……的', en: 'able to be' },
  { part: 'age', meaning: '状态/集合', en: 'state/collection' },
  { part: 'al', meaning: '……的', en: 'relating to' },
  { part: 'ance', meaning: '状态/性质', en: 'state/quality' },
  { part: 'ant', meaning: '……的人/物', en: 'one who' },
  { part: 'ar', meaning: '……的/人', en: 'relating to/one who' },
  { part: 'ary', meaning: '……的/场所', en: 'relating to/place' },
  { part: 'ate', meaning: '使……/……的', en: 'make/state' },
  { part: 'dom', meaning: '领域/状态', en: 'domain/state' },
  { part: 'ed', meaning: '过去/已……的', en: 'past tense' },
  { part: 'ee', meaning: '被……的人', en: 'one who receives' },
  { part: 'en', meaning: '使/由……制成', en: 'make/made of' },
  { part: 'ence', meaning: '状态/性质', en: 'state/quality' },
  { part: 'ent', meaning: '……的/人', en: 'one who/adjective' },
  { part: 'er', meaning: '……的人/物/更', en: 'one who/more' },
  { part: 'ess', meaning: '女性', en: 'female' },
  { part: 'est', meaning: '最……', en: 'most' },
  { part: 'ful', meaning: '充满……的', en: 'full of' },
  { part: 'fy', meaning: '使……化', en: 'make/become' },
  { part: 'hood', meaning: '状态/身份', en: 'state/condition' },
  { part: 'ial', meaning: '……的', en: 'relating to' },
  { part: 'ian', meaning: '……的人/专家', en: 'person/specialist' },
  { part: 'ible', meaning: '能……的', en: 'able to be' },
  { part: 'ic', meaning: '……的', en: 'relating to' },
  { part: 'ical', meaning: '……的', en: 'relating to' },
  { part: 'ify', meaning: '使……化', en: 'make/become' },
  { part: 'ing', meaning: '正在……/动名词', en: 'ongoing/gerund' },
  { part: 'ion', meaning: '动作/状态', en: 'act/state' },
  { part: 'ise', meaning: '使……化', en: 'make/become' },
  { part: 'ish', meaning: '稍微/属于', en: 'somewhat/belong to' },
  { part: 'ism', meaning: '主义/学说', en: 'doctrine/belief' },
  { part: 'ist', meaning: '……家/主义者', en: 'one who practices' },
  { part: 'ity', meaning: '性质/状态', en: 'quality/state' },
  { part: 'ive', meaning: '有……倾向的', en: 'tending to' },
  { part: 'ize', meaning: '使……化', en: 'make/become' },
  { part: 'less', meaning: '无……的', en: 'without' },
  { part: 'like', meaning: '像……似的', en: 'similar to' },
  { part: 'logy', meaning: '……学', en: 'study of' },
  { part: 'ly', meaning: '……地（副词）', en: 'in a manner of' },
  { part: 'ment', meaning: '行为/状态/结果', en: 'act/state/result' },
  { part: 'ness', meaning: '性质/状态', en: 'state/quality' },
  { part: 'or', meaning: '……的人/物', en: 'one who/that which' },
  { part: 'ory', meaning: '……的/场所', en: 'relating to/place' },
  { part: 'ous', meaning: '充满……的', en: 'full of' },
  { part: 'ry', meaning: '……学/行业/场所', en: 'study/occupation/place' },
  { part: 'ship', meaning: '状态/身份/技能', en: 'state/skill' },
  { part: 'sion', meaning: '动作/状态', en: 'act/state' },
  { part: 'some', meaning: '有……倾向的', en: 'tending to' },
  { part: 'th', meaning: '状态/第……', en: 'state/ordinal' },
  { part: 'tion', meaning: '动作/状态', en: 'act/state' },
  { part: 'tude', meaning: '状态/性质', en: 'state/quality' },
  { part: 'ty', meaning: '性质/状态', en: 'quality/state' },
  { part: 'ure', meaning: '动作/过程/结果', en: 'act/process/result' },
  { part: 'ward', meaning: '向……方向', en: 'direction' },
  { part: 'y', meaning: '……的/性质', en: 'characterized by' },
];

// 常见复合词的第二部分（先把复合词拆了，各部分可能不在此词典中）
const COMPOUND_SECONDS = [
  'board', 'book', 'box', 'day', 'door', 'dream', 'fall', 'fire',
  'flower', 'fly', 'ground', 'house', 'light', 'line', 'man',
  'mark', 'mate', 'night', 'paper', 'place', 'plane', 'play',
  'power', 'rain', 'rise', 'road', 'room', 'school', 'set',
  'ship', 'side', 'sight', 'snow', 'step', 'storm', 'sun',
  'thing', 'time', 'town', 'way', 'where', 'while', 'work',
  'world', 'yard',
];

// 智能词形分析
function analyze(word) {
  const w = word.toLowerCase().trim();
  if (!w || w.length < 2) return null;

  const parts = [];

  // 1. 尝试复合词分解
  for (const second of COMPOUND_SECONDS) {
    if (w.length > second.length + 2 && w.endsWith(second)) {
      const first = w.slice(0, -second.length);
      if (first.length >= 2) {
        // 检查 first 是否是已知词根
        const firstRoot = findAny(first, PREFIXES) || findAny(first, ROOTS);
        if (firstRoot) {
          const secondMeaning = findAnyMeaning(second);
          parts.push({ type: 'compound', breakdown: [
            { text: first, meaning: firstRoot.meaning },
            { text: second, meaning: secondMeaning || second }
          ], suffix: '' });
          break;
        }
      }
    }
  }

  // 2. 尝试词根+后缀分解（从右向左）
  if (parts.length === 0 && w.length >= 4) {
    for (const suffix of SUFFIXES) {
      const sLen = suffix.part.length;
      if (sLen >= 2 && w.length > sLen + 1 && w.endsWith(suffix.part)) {
        const stem = w.slice(0, -sLen);
        if (stem.length >= 2) {
          const stemInfo = findAny(stem, ROOTS) || { part: stem, meaning: stem };
          parts.push({
            type: 'suffix',
            breakdown: [
              { text: stemInfo.part, meaning: stemInfo.meaning },
              { text: suffix.part, meaning: suffix.meaning }
            ],
            suffix: suffix.part
          });
          break;
        }
      }
    }
  }

  // 3. 尝试前缀+词根分解
  if (parts.length === 0 && w.length >= 4) {
    for (const prefix of PREFIXES) {
      const pLen = prefix.part.length;
      if (pLen >= 2 && w.length > pLen + 1 && w.startsWith(prefix.part)) {
        const stem = w.slice(pLen);
        if (stem.length >= 2) {
          const stemInfo = findAny(stem, ROOTS) || { part: stem, meaning: stem };

          // 再尝试从剩余部分找后缀
          let suffixPart = null;
          for (const suffix of SUFFIXES) {
            if (stem.length > suffix.part.length + 1 && stem.endsWith(suffix.part)) {
              suffixPart = suffix;
              break;
            }
          }

          if (suffixPart) {
            const innerStem = stem.slice(0, -suffixPart.part.length);
            const innerInfo = findAny(innerStem, ROOTS) || { part: innerStem, meaning: innerStem };
            parts.push({
              type: 'full',
              breakdown: [
                { text: prefix.part, meaning: prefix.meaning },
                { text: innerInfo.part, meaning: innerInfo.meaning },
                { text: suffixPart.part, meaning: suffixPart.meaning }
              ]
            });
          } else {
            parts.push({
              type: 'prefix',
              breakdown: [
                { text: prefix.part, meaning: prefix.meaning },
                { text: stemInfo.part, meaning: stemInfo.meaning }
              ]
            });
          }
          break;
        }
      }
    }
  }

  // 4. 常见短词特殊处理
  if (parts.length === 0 && w.length <= 4) {
    return { type: 'short', breakdown: [], word: w };
  }

  // 5. 如果都没匹配到，尝试用词根匹配开头或中间
  if (parts.length === 0 && w.length >= 5) {
    for (const root of ROOTS) {
      if (root.part.length >= 3 && w.includes(root.part)) {
        const idx = w.indexOf(root.part);
        const before = idx > 0 ? w.slice(0, idx) : '';
        const after = w.slice(idx + root.part.length);
        const breakdown = [];
        if (before) {
          const beforeInfo = findAny(before, PREFIXES);
          if (beforeInfo) {
            breakdown.push({ text: beforeInfo.part, meaning: beforeInfo.meaning });
          } // 否则忽略未知前缀
        }
        breakdown.push({ text: root.part, meaning: root.meaning });
        if (after && after.length >= 1) {
          const afterInfo = findAny(after, SUFFIXES);
          if (afterInfo) {
            breakdown.push({ text: afterInfo.part, meaning: afterInfo.meaning });
          }
        }
        if (breakdown.length >= 2) {
          parts.push({ type: 'partial', breakdown });
          break;
        }
      }
    }
  }

  if (parts.length === 0) return null;
  return parts[0];
}

// 工具函数
function findAny(text, list) {
  const exact = list.find(item => item.part === text);
  if (exact) return exact;
  return null;
}

function findAnyMeaning(text) {
  const p = findAny(text, PREFIXES);
  if (p) return p.meaning;
  const r = findAny(text, ROOTS);
  if (r) return r.meaning;
  return null;
}

// ============= 常用词场景提示 =============
// 对结构简单/无法拆分的词，给出实际用法提示
const USAGE_TIPS = {
  a: ['不定冠词：用在辅音开头的单数名词前 → a book, a cat, a house', '对比 an：an apple（元音开头时用 an）'],
  an: ['不定冠词：用在元音开头的单数名词前 → an apple, an hour', '对比 a：a book（辅音开头时用 a）'],
  the: ['定冠词：特指某个事物 → the sun, the door, the best', '对比 a/an：a cat（泛指某只猫），the cat（特指那只猫）'],
  be: ['be 动词：「是/在/成为」，最核心的英文动词', '变形：am/is/are（现在），was/were（过去），been（完成）'],
  am: ['I am = 我是，只和 I 搭配', '例：I am a student / I am happy'],
  are: ['you are / we are / they are → 复数主语用 are', '例：You are right / They are here'],
  is: ['he is / she is / it is → 单数主语用 is', '例：She is tall / It is raining'],
  was: ['am/is 的过去式 → I was, he was', '例：I was tired yesterday'],
  were: ['are 的过去式 → you were, they were', '例：We were at home'],
  been: ['be 的过去分词 → have been = 已经/曾经', '例：I have been to London'],
  of: ['表示所属关系 → the name of the book, a cup of tea', '不要和 off（离开/关闭）混淆'],
  to: ['表示方向/目的 → go to school, I want to eat', 'to + 动词原形 = 不定式（要做某事）'],
  in: ['在……里面/在……期间 → in the box, in summer', '对比 on（在……上面）和 at（在……点）'],
  on: ['在……上面/关于 → on the table, a book on history', '对比 in（里面）和 at（点）'],
  at: ['在（具体点/时间）→ at home, at 6 o\'clock', '对比 in（范围/期间）和 on（表面）'],
  for: ['为了/给/持续 → This is for you, wait for me', 'for + 时间段 = 持续多久'],
  and: ['和/而且 → you and me, bread and butter', '连接两个对等的事物'],
  but: ['但是/不过 → I like it but it\'s expensive', '表示转折，类似 however'],
  or: ['或者 → tea or coffee?', '二选一时用 or'],
  not: ['不/没 → I do not know, not now', '常和 be/do/have 连用构成否定'],
  have: ['有/吃/经历 → I have a car, have lunch', 'have + 过去分词 = 完成时（已经做了）'],
  has: ['have 的第三人称单数 → he has, she has', '例：She has a dog'],
  do: ['做/确实 → do homework, I do know', 'do/does 用于构成疑问句和否定句'],
  does: ['do 的第三人称单数 → Does he like it?', '例：He doesn\'t know'],
  did: ['do 的过去式 → Did you go?', '例：I didn\'t see it'],
  can: ['能/会/可以 → I can swim, Can I help?', '情态动词，后面直接跟动词原形'],
  will: ['将/愿意 → I will go, Will you come?', '表示将来或意愿'],
  go: ['去/走 → go home, go shopping', '常用搭配：go on（继续）, go out（出去）, go away（走开）'],
  get: ['得到/变得/到达 → get a gift, get tired, get home', '用途最多的动词之一：get up, get along, get over'],
  make: ['做/制造/使 → make a cake, make me happy', '常用：make sure, make a decision, make sense'],
  say: ['说（侧重内容）→ She said "hello"', '对比 tell（告诉某人）和 speak（讲语言）'],
  see: ['看见/明白 → I see a bird, I see（我懂了）', '对比 look（看-动作）和 watch（观察）'],
  know: ['知道/认识 → I know him, Do you know?', '对比 understand（理解）'],
  think: ['想/认为 → I think so, think about it', 'think of = 想起，think over = 仔细考虑'],
  take: ['拿/带/花费 → take a pen, take a bus, take time', '高频搭配：take care, take off, take a look'],
  come: ['来/到达 → come here, come back', '搭配：come from（来自）, come true（实现）'],
  give: ['给/提供 → give me a pen, give up', '双宾语结构：give + 人 + 物'],
  like: ['喜欢/像 → I like music, It looks like rain', 'would like = 想要（比 want 更礼貌）'],
  want: ['想要 → I want water, What do you want?', 'want to do = 想做某事'],
  need: ['需要 → I need help, Need I go?', 'need to do（需要做）/ need doing（需要被做）'],
  help: ['帮助 → Can you help me?', 'help + (to) do（帮忙做），can\'t help doing（忍不住）'],
  time: ['时间/次 → What time is it? / three times', '搭配：on time（准时）, in time（及时）, at times（有时）'],
  day: ['天/白天 → every day, day and night', '搭配：day by day（一天天）, one day（有一天）'],
  way: ['方式/路 → this way, on the way', '搭配：by the way（顺便说）, no way（没门）, in a way（某种程度上）'],
  look: ['看/看起来 → look at me, You look tired', 'look for = 寻找，look after = 照顾，look forward to = 期待'],
  work: ['工作/运转 → go to work, It works', '搭配：work out（解决/锻炼）, work on（从事）'],
  call: ['叫/打电话 → call me, call a doctor', '搭配：call back（回电话）, call off（取消）'],
  ask: ['问/请求 → ask a question, ask for help', '搭配：ask about（询问关于）, ask for（要求）'],
  try: ['尝试/努力 → try your best, try again', 'try to do（努力做）vs try doing（试着做）'],
  start: ['开始/启动 → start work, start a car', 'start doing = start to do 都表示开始做'],
  stop: ['停止/车站 → stop talking, bus stop', 'stop doing（停止做）vs stop to do（停下来去做另一件事）'],
  begin: ['开始 → begin class, begin to cry', '比 start 更正式'],
  end: ['结束/末端 → at the end, the end of the road', '搭配：in the end（最终）, end up（以……告终）'],
  live: ['居住/活的 → I live here, live music', 'live /lɪv/（住）和 live /laɪv/（现场直播）同形不同音'],
  play: ['玩/演奏/播放 → play games, play piano, play music', '搭配：play with（和……玩）, play a role（起作用）'],
  early: ['早的/提前 → early morning, arrive early', '反义词：late（晚的）'],
  only: ['仅仅/唯一的 → only one, not only but also', 'only if = 只有当……才'],
  even: ['甚至/平的 → even better, an even surface', 'even though = 即使，even if = 哪怕'],
  just: ['刚刚/只是/公正 → just now, just a minute, a just decision', 'just finished = 刚完成'],
  well: ['好地/井 → well done, a water well', 'as well = 也，as well as = 以及'],
  very: ['非常/正是 → very good, the very thing', 'very much = 非常（修饰动词）'],
  much: ['很多/非常 → too much, much better', '修饰不可数名词，对比 many（可数）'],
  many: ['很多 → many people, how many', '修饰可数名词，对比 much（不可数）'],
  more: ['更多 → more water, more interesting', 'many/much 的比较级'],
  most: ['最多/大多数 → most people, the most beautiful', 'many/much 的最高级'],
  other: ['其他的 → other people, each other', 'another = 另一个（泛指），the other = 另一个（特指）'],
  another: ['另一个 → another day, one another', 'an + other = another'],
  good: ['好的 → good idea, good at English', '比较级 better，最高级 best'],
  bad: ['坏的/糟糕的 → bad weather, feel bad', '比较级 worse，最高级 worst'],
  great: ['伟大的/极好的 → a great man, great job', '比 good 语气更强'],
  big: ['大的 → a big house, big brother', '比较级 bigger，最高级 biggest'],
  small: ['小的 → a small room, small talk', '比 little 更常用指尺寸小'],
  young: ['年轻的 → a young man, young people', '比较级 younger，最高级 youngest'],
  new: ['新的 → a new car, new to me', '反义词 old（旧的/老的）'],
  old: ['老的/旧的 → an old man, old friends', '比较级 older/elder，最高级 oldest/eldest'],
  same: ['相同的 → the same thing, same here', 'same 前面通常加 the'],
  different: ['不同的 → different from, different ideas', '名词形式：difference（差异）'],
  important: ['重要的 → an important meeting', '搭配：It is important to do / that'],
  home: ['家/回家 → go home, stay at home', 'go home 不加 to，对比 go to school'],
  people: ['人们（复数）→ many people', 'person 的单数形式，people 本身即复数'],
  child: ['孩子 → a child, children', '复数 children（不规则变化）'],
  school: ['学校 → go to school, after school', 'at school = 在校，in school = 在上学'],
  world: ['世界 → around the world, world peace', '搭配：all over the world（全世界）'],
  life: ['生命/生活 → daily life, a long life', '复数 lives，搭配：way of life（生活方式）'],
  love: ['爱/喜欢 → I love you, love music', 'love to do = love doing，都可表示喜欢做'],
  food: ['食物 → fast food, food and drink', '不可数，不说 a food'],
  water: ['水 → drink water, hot water', '不可数，说 some water'],
  water: ['水 → drink water, hot water', '不可数名词，不能说 a water，要说 some water'],
  about: ['关于/大约 → a book about China, at about 5 o\'clock', '搭配：think about（考虑）, talk about（谈论）, What about...？（……怎么样？）'],
  after: ['在……之后 → after school, after you', '搭配：look after（照顾）, after all（毕竟）'],
  because: ['因为 → because of the rain', 'because + 句子（Because it rained）, because of + 名词（because of rain）'],
  before: ['在……之前 → before lunch, before you go', 'before 可作介词、连词、副词三种用法'],
  between: ['在……之间 → between you and me, between 10 and 11', 'between 用于两者之间，among 用于三者及以上'],
  always: ['总是 → always late, I always forget', '频率副词，放在 be 动词后、实义动词前'],
  never: ['从不 → never give up, I never knew', '频率副词，语气比 not 更强'],
  sometimes: ['有时 → sometimes I walk to work', '频率副词，可放在句首、句中、句尾'],
  usually: ['通常 → I usually get up at 7', '频率副词，比 often 频率更高'],
  often: ['经常 → How often? I often go there', '频率副词，注意 t 不发音：/ˈɒfən/'],
  again: ['再一次/又 → try again, see you again', '搭配：again and again（一再）, once again（再一次）'],
  together: ['一起 → work together, let\'s go together', '搭配：get together（聚在一起）, together with（连同）'],
  really: ['真正地/非常 → I really like it, not really', '口语高频词，可表示强调或质疑'],
  still: ['仍然 → I\'m still waiting, Is he still here?', 'still 表示"仍然"，对比 yet（还-用于否定/疑问）'],
  already: ['已经 → I have already finished', 'already 用于肯定句，yet 用于否定/疑问句'],
  enough: ['足够的 → enough money, good enough', 'enough 放名词前、形容词后：big enough, enough time'],
  believe: ['相信/认为 → I believe you, believe in God', 'believe in = 信仰/信任……的存在'],
  remember: ['记住/想起 → Remember me? I can\'t remember', 'remember to do（记得要做）vs remember doing（记得做过）'],
  forget: ['忘记 → I forgot, forget the past', 'forget to do（忘记要做）vs forget doing（忘了做过）'],
  please: ['请/使高兴 → Please sit down, a pleased smile', 'please 放句首表礼貌请求'],
  sorry: ['对不起/遗憾 → I\'m sorry, feel sorry for', 'sorry for (doing) / sorry to (hear/see)'],
  thank: ['感谢 → thank you, thanks a lot', 'thank + 人 + for + 事：Thank you for coming'],
  excuse: ['原谅/借口 → excuse me, a good excuse', 'Excuse me = 打扰一下, 借过'],
  answer: ['回答/答案 → answer the question, the right answer', 'answer + 宾语（不加 to）：answer me, not answer to me'],
  question: ['问题/疑问 → ask a question, good question', 'question 可作名词和动词：question the truth'],
  idea: ['想法/主意 → good idea, I have no idea', 'I have no idea = 我完全不知道'],
  matter: ['事情/要紧 → What\'s the matter? It doesn\'t matter', 'No matter what = 无论什么'],
  problem: ['问题/难题 → a big problem, No problem!', 'problem 侧重"待解决的问题"，question 侧重"待回答的问题"'],
  reason: ['原因/理由 → the reason why, for some reason', '搭配：for this reason（因此）, reasonable（合理的）'],
  change: ['改变/零钱 → a big change, keep the change', 'change 可作动词和名词'],
  care: ['关心/在乎 → take care, I don\'t care', '搭配：take care of（照顾）, care about（在乎）, care for（喜欢/照顾）'],
  hope: ['希望 → I hope so, hope for the best', 'hope to do / hope that（不用 hope sb to do）'],
  wish: ['希望/祝愿 → I wish you luck, make a wish', 'wish + 虚拟语气表示不太可能实现的愿望'],
  believe: ['相信 → I believe you, believe it or not', 'believe + 人（相信某人说的话）, believe in（信任/信仰）'],
  agree: ['同意 → I agree, agree with you', 'agree with + 人, agree to + 提议, agree on + 事项'],
  use: ['用/使用 → use a pen, be used to', 'used to do（过去经常）, be used to doing（习惯于）'],
  wait: ['等/等待 → wait for me, can\'t wait', 'wait for + 名词/人, can\'t wait to do = 迫不及待'],
  keep: ['保持/继续 → keep quiet, keep trying', '搭配：keep on doing, keep in touch, keep a secret'],
  let: ['让/允许 → let me go, let it be', 'let + 人 + 动词原形（不用 to）'],
  turn: ['转/变成 → turn left, turn red', '搭配：turn on/off（开/关）, turn into（变成）, turn out（结果是）'],
  bring: ['带来 → bring me water, bring along', 'bring（带来）vs take（带走）：方向不同'],
  carry: ['携带/搬运 → carry a bag, carry on', '搭配：carry out（执行）, carry on（继续）'],
  hold: ['拿着/举行 → hold my hand, hold a meeting', '搭配：hold on（等一下/坚持）, hold up（举起/耽搁）'],
  pick: ['捡/选 → pick up, pick a color', 'pick up = 捡起/接人/学会'],
  put: ['放/摆 → put down, put on clothes', 'put on（穿上）, put off（推迟）, put away（收好）'],
  sit: ['坐 → sit down, sit still', '搭配：sit up（坐直/熬夜）'],
  stand: ['站/忍受 → stand up, can\'t stand', 'stand 可表示站立或忍受'],
  walk: ['走/散步 → walk home, take a walk', 'go for a walk = 去散步'],
  run: ['跑/经营 → run fast, run a company', 'run out of = 用完了'],
  eat: ['吃 → eat well, eat out', '具体食物用 eat，泛指吃饭用 have：have dinner'],
  drink: ['喝/饮料 → drink water, a cold drink', 'drink 也可作名词：Can I have a drink?'],
  sleep: ['睡觉 → go to sleep, can\'t sleep', 'fall asleep = 入睡，feel sleepy = 觉得困'],
  send: ['发送/派 → send a message, send for help', '搭配：send out（发出）, send back（退回）'],
  buy: ['买 → buy a book, buy time', 'buy + 人 + 物 = buy me one（给我买一个）'],
  pay: ['支付 → pay money, pay attention', 'pay + 人 + for + 物：I paid him for the work'],
  mean: ['意思是/刻薄 → What do you mean? a mean person', 'mean to do（打算做）, mean doing（意味着）'],
  meet: ['遇见/见面 → Nice to meet you, meet friends', 'meet = 初次见面/约见, see = 一般看望'],
  miss: ['想念/错过 → I miss you, miss the bus', 'miss doing = 错过做某事'],
  enjoy: ['享受/喜欢 → enjoy music, enjoy yourself', 'enjoy + doing（不用 to do）'],
  finish: ['完成 → finish work, finish doing', 'finish + doing（不用 to do）'],
  practice: ['练习 → practice English, practice makes perfect', 'practice + doing（不用 to do）'],
  continue: ['继续 → continue working, to be continued', 'continue doing = continue to do'],
  allow: ['允许 → allow me to go, allow smoking', 'allow + doing 或 allow + 人 + to do'],
  happen: ['发生/碰巧 → What happened? I happen to know', 'sth happened to sb = 某事发生在某人身上'],
  seem: ['似乎/好像 → You seem tired, it seems that', 'seem + 形容词 / seem to be'],
  appear: ['出现/似乎 → appear on TV, appear to be', '同义词 seem，但 appear 更正式'],
  matter: ['事情/要紧 → What\'s the matter? Does it matter?', 'It doesn\'t matter = 没关系'],
  offer: ['提供/主动提出 → offer help, an offer', 'offer to do（主动提出做）, offer + 人 + 物（给某人提供某物）'],
  order: ['命令/点餐/顺序 → give an order, order food, in order', '搭配：in order to（为了）, out of order（坏了/出故障）'],
  touch: ['触摸/感动 → Don\'t touch! a touching story', 'keep in touch = 保持联系'],
  refuse: ['拒绝 → refuse to go, refuse help', 'refuse to do（拒绝做）, refuse + 名词（拒绝某物）'],
  accept: ['接受/认可 → accept a gift, accept the fact', 'accept（接受）vs except（除了）— 发音和拼写都不同'],
  except: ['除了 → everyone except me, except for', 'except（不包括）vs besides（除了……还包括）'],
  instead: ['代替/反而 → I\'ll go instead, instead of', 'instead of + doing/noun = 代替'],
  without: ['没有/无 → without you, without thinking', 'without + doing = 没有做某事的情况下'],
  during: ['在……期间 → during the day, during class', 'during + 时间段（整个期间）vs within + 时间段（在……之内）'],
  among: ['在……之中 → among friends, among them', 'among 用于三个或以上，between 用于两者之间'],
  across: ['穿过/在对面 → across the street, come across', 'come across = 偶然遇到'],
  along: ['沿着 → along the river, walk along', '搭配：get along with（与……相处）'],
  around: ['在……周围/大约 → around the world, around 5 o\'clock', 'look around（环顾四周）, hang around（闲逛）'],
  size: ['尺寸/大小 → what size? a large size', 'size up = 估量/打量'],
  shape: ['形状/塑造 → in good shape, shape the future', 'stay in shape = 保持身材'],
  color: ['颜色/色彩 → bright color, color the picture', '美式拼写 color，英式拼写 colour'],
  experience: ['经验/经历 → work experience, a good experience', '不可数 = 经验，可数 = 经历'],
  chance: ['机会/可能性 → a second chance, by chance', 'by chance = 偶然，take a chance = 冒险一试'],
  choice: ['选择 → make a choice, no choice', 'have no choice but to do = 别无选择只能做'],
  result: ['结果 → as a result, final result', 'result in（导致）vs result from（源于）'],
  effect: ['效果/影响 → side effect, take effect', 'effect（名词=效果）vs affect（动词=影响）'],
  future: ['未来/将来 → in the future, future plans', 'in future（从现在起）vs in the future（在将来）'],
  past: ['过去/经过 → in the past, walk past', 'past 可作名词、形容词、介词、副词'],
  present: ['现在/礼物/呈现 → at present, a birthday present, present a show', '一词多义：名词=现在/礼物，动词=呈现'],
  sound: ['声音/听起来 → a loud sound, Sounds good!', 'sound + 形容词 = 听起来……：Sounds great!'],
  voice: ['嗓音/声音 → a sweet voice, voice your opinion', 'voice 指人的声音，sound 指任何声音'],
  silence: ['安静/沉默 → in silence, break the silence', 'silent = 形容词（安静的），silence = 名词（沉默）'],
  attention: ['注意力 → pay attention, full attention', 'pay attention to（注意……）'],
  protect: ['保护 → protect the environment', 'protect from/against（保护……免受……）'],
  life: ['生命/生活 → way of life, save a life', '复数 lives /laɪvz/，不要和 live /lɪv/ 混淆'],
};

// ============= 生成提示文本 =============
function generateTip(word) {
  const clean = String(word || '').trim();
  if (!clean) return '';

  const lower = clean.toLowerCase();

  // 1. 先查场景提示词典
  if (USAGE_TIPS[lower]) {
    return USAGE_TIPS[lower].filter(line => !!line).slice(0, 3).join('\n');
  }

  // 2. 尝试复合词分解（准确率最高）
  const compoundResult = tryCompoundDecomposition(lower);
  if (compoundResult) return compoundResult;

  // 3. 尝试前缀/后缀/词根分解
  const structuralResult = analyze(lower);
  if (structuralResult && structuralResult.type !== 'short') {
    return formatStructuralResult(structuralResult);
  }

  // 4. 都匹配不上，给学习方法提示
  return makeLearningTip(clean);
}

function tryCompoundDecomposition(word) {
  for (const second of COMPOUND_SECONDS) {
    if (word.length > second.length + 2 && word.endsWith(second)) {
      const first = word.slice(0, -second.length);
      if (first.length >= 2) {
        const related = findRelated(first);
        if (related && related.length >= 2) {
          return `${first}(${first}) + ${second}(${second}) → 复合词\n同类词：${related.slice(0, 4).join(' · ')}`;
        }
      }
    }
  }
  return null;
}

function formatStructuralResult(r) {
  const parts = r.breakdown.map(b => `${b.text}(${b.meaning})`).join(' + ');
  let extra = '';
  if (r.suffix) {
    const suffixWords = findWordsWithSuffix(r.suffix);
    if (suffixWords && suffixWords.length >= 2) {
      extra = `\n同类词：${suffixWords.slice(0, 4).join(' · ')}`;
    }
  } else if (r.breakdown.length >= 2) {
    const prefix = r.breakdown[0].text;
    const prefixWords = findWordsWithPrefix(prefix);
    if (prefixWords && prefixWords.length >= 2) {
      extra = `\n同类词：${prefixWords.slice(0, 4).join(' · ')}`;
    }
  }
  return `${parts}${extra}`;
}

function makeLearningTip(word) {
  const w = word.toLowerCase();

  // 根据词尾特征给针对性提示
  if (w.endsWith('ing') && w.length > 4) return `末尾 -ing → 通常是动词的现在分词/动名词形式，表示"正在……"`;
  if (w.endsWith('ed') && w.length > 3) return `末尾 -ed → 通常是动词的过去式或过去分词，表示"已经……"`;
  if (w.endsWith('ly') && w.length > 3) return `末尾 -ly → 通常是副词，"……地"`;
  if (w.endsWith('tion') || w.endsWith('sion')) return `末尾 -tion/-sion → 表示动作或状态的名词`;
  if (w.endsWith('ful') && w.length > 3) return `末尾 -ful → 表示"充满……的"，如 hopeful、colorful`;
  if (w.endsWith('less') && w.length > 4) return `末尾 -less → 表示"没有/无……的"，如 endless、careless`;
  if (w.endsWith('ness') && w.length > 4) return `末尾 -ness → 把形容词变成名词，"……性/状态"，如 happiness`;
  if (w.endsWith('ment') && w.length > 4) return `末尾 -ment → 表示行为、状态或结果的名词，如 movement`;
  if (w.endsWith('able') || w.endsWith('ible')) return `末尾 -able/-ible → 表示"能……的、可……的"`;
  if (w.endsWith('ous') && w.length > 3) return `末尾 -ous → 形容词后缀，"充满……的"，如 famous、nervous`;
  if (w.endsWith('ive') && w.length > 3) return `末尾 -ive → 形容词，表示"有……倾向的"，如 active、creative`;
  if (w.endsWith('er') && w.length > 4) return `末尾 -er → 可能是"更……"（比较级），或"做……的人/物"`;
  if (w.endsWith('est') && w.length > 4) return `末尾 -est → 最高级，"最……"`;
  if (w.endsWith('ship') && w.length > 4) return `末尾 -ship → 表示状态、身份、关系，如 friendship`;
  if (w.endsWith('hood') && w.length > 4) return `末尾 -hood → 表示身份/状态/时期，如 childhood`;
  if (w.endsWith('ist') && w.length > 3) return `末尾 -ist → 表示"……的人/家"，如 artist、scientist`;
  if (w.endsWith('al') && w.length > 3) return `末尾 -al → 常是形容词后缀，如 natural、cultural`;

  // 根据长度给记忆策略
  if (w.length <= 3) {
    return `短词「${word}」→ 放在句子里学更好，比如：I see ___ 或 It is ___`;
  }
  if (w.length <= 5) {
    return `短词「${word}」→ 动手写一个包含它的简单英文句子，写一遍胜过读十遍`;
  }
  const syllables = guessSyllables(w);
  if (syllables && w.length >= 7) {
    return `多音节词：${syllables} → 先把音节读顺，再合起来整体记`;
  }
  return `「${word}」→ 拆分音节来记：${syllables || w}，读顺了就记住了`;
}

function guessSyllables(word) {
  const w = word.toLowerCase();
  const vowels = w.match(/[aeiou]+/g);
  if (!vowels) return null;
  // 简单估算音节
  const parts = [];
  let lastVowelEnd = 0;
  // 简化版音节切分
  let syllableParts = w.match(/[^aeiou]*[aeiou]+[^aeiou]*/g);
  if (syllableParts && syllableParts.length >= 2) {
    return syllableParts.join('·');
  }
  return vowels.join('·');
}

// 查找共享前缀/后缀/词根的词（示例，从内置词表中匹配）
function findWordsWithPrefix(prefix) {
  // 用内置词的常见例子
  const examples = {
    'un': ['unhappy', 'unusual', 'unclear', 'unfair'],
    're': ['return', 'review', 'rebuild', 'restart'],
    'dis': ['dislike', 'disagree', 'disappear', 'discover'],
    'pre': ['preview', 'prepay', 'preheat', 'prewar'],
    'mis': ['misunderstand', 'mislead', 'misuse', 'mistake'],
    'over': ['overeat', 'overwork', 'overheat', 'overcome'],
    'under': ['underground', 'underline', 'underwear', 'understand'],
    'inter': ['international', 'internet', 'interact', 'interview'],
    'trans': ['transport', 'translate', 'transform', 'transfer'],
    'super': ['supermarket', 'superstar', 'superman', 'superpower'],
    'anti': ['antibody', 'antivirus', 'antisocial'],
    'auto': ['automatic', 'automobile', 'autobiography'],
    'micro': ['microscope', 'microphone', 'microwave'],
    'multi': ['multimedia', 'multitask', 'multiply'],
    'sub': ['subway', 'subtitle', 'submarine'],
    'co': ['cooperate', 'coexist', 'coworker'],
    'ex': ['export', 'express', 'expand'],
    'in': ['inside', 'input', 'income'],
    'im': ['import', 'impress', 'impossible'],
    'de': ['decode', 'decrease', 'depart'],
  };
  return examples[prefix] || null;
}

function findWordsWithSuffix(suffix) {
  const examples = {
    'able': ['readable', 'washable', 'breakable'],
    'er': ['teacher', 'worker', 'player'],
    'or': ['actor', 'director', 'inventor'],
    'tion': ['action', 'education', 'information'],
    'less': ['endless', 'priceless', 'careless'],
    'ful': ['colorful', 'hopeful', 'peaceful'],
    'ment': ['movement', 'agreement', 'development'],
    'ness': ['darkness', 'happiness', 'kindness'],
    'ist': ['artist', 'scientist', 'pianist'],
    'ous': ['famous', 'various', 'dangerous'],
    'ive': ['active', 'creative', 'positive'],
    'al': ['natural', 'cultural', 'personal'],
    'ly': ['quickly', 'slowly', 'carefully'],
    'ing': ['interesting', 'exciting', 'amazing'],
    'ed': ['excited', 'tired', 'interested'],
    'ic': ['magic', 'panic', 'basic'],
    'ian': ['musician', 'politician', 'librarian'],
    'logy': ['biology', 'geology', 'technology'],
    'ship': ['friendship', 'leadership', 'hardship'],
    'hood': ['childhood', 'neighborhood', 'adulthood'],
  };
  return examples[suffix] || null;
}

function findRelated(firstPart) {
  const examples = {
    'time': ['lifetime', 'daytime', 'nighttime'],
    'life': ['lifetime', 'lifeline', 'lifeboat'],
    'water': ['waterfall', 'waterproof', 'watermelon'],
    'book': ['notebook', 'textbook', 'storybook'],
    'sun': ['sunlight', 'sunset', 'sunflower'],
    'rain': ['rainbow', 'raincoat', 'raindrop'],
    'fire': ['fireplace', 'firework', 'firefly'],
    'ball': ['football', 'basketball', 'baseball'],
    'room': ['bedroom', 'bathroom', 'classroom'],
    'house': ['greenhouse', 'treehouse', 'farmhouse'],
    'day': ['birthday', 'weekday', 'holiday'],
    'night': ['midnight', 'tonight', 'fortnight'],
    'man': ['policeman', 'fireman', 'fisherman'],
    'school': ['preschool', 'afterschool'],
    'work': ['homework', 'teamwork', 'network'],
    'play': ['playground', 'playbook'],
    'ground': ['playground', 'underground', 'background'],
    'air': ['airport', 'airline', 'aircraft'],
    'side': ['inside', 'outside', 'riverside'],
    'way': ['highway', 'freeway', 'railway'],
  };
  return examples[firstPart] || null;
}

module.exports = { generateTip };
