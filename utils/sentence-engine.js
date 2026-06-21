// 听写句库 — 覆盖日常交流场景，300+句，分3级
// level 1: 短句，简单词汇
// level 2: 中等长度，日常对话
// level 3: 长句，复合结构

const LISTENING_SENTENCES = [
  // ===== 问候与介绍 =====
  {en:'Hello, how are you?',zh:'你好，你怎么样？',level:1},
  {en:'Nice to meet you.',zh:'很高兴见到你',level:1},
  {en:'My name is Tom.',zh:'我的名字是Tom',level:1},
  {en:'Where are you from?',zh:'你从哪里来？',level:1},
  {en:'I am from China.',zh:'我来自中国',level:1},
  {en:'How old are you?',zh:'你多大了？',level:1},
  {en:'This is my friend.',zh:'这是我的朋友',level:1},
  {en:'Good morning, everyone.',zh:'大家早上好',level:1},
  {en:'See you tomorrow.',zh:'明天见',level:1},
  {en:'Have a nice day.',zh:'祝你今天愉快',level:1},

  // ===== 日常寒暄 =====
  {en:'How was your day?',zh:'你今天过得怎么样？',level:1},
  {en:'I am fine, thank you.',zh:'我很好，谢谢',level:1},
  {en:'Not too bad.',zh:'还不错',level:1},
  {en:'Long time no see.',zh:'好久不见',level:1},
  {en:'What is new with you?',zh:'你有什么新鲜事吗？',level:2},
  {en:'I am so glad to see you.',zh:'见到你太高兴了',level:2},
  {en:'Take care of yourself.',zh:'照顾好自己',level:2},
  {en:'Say hello to your family.',zh:'代我向你家人问好',level:2},

  // ===== 天气 =====
  {en:'It is sunny today.',zh:'今天天气晴朗',level:1},
  {en:'It is raining outside.',zh:'外面在下雨',level:1},
  {en:'It is very cold today.',zh:'今天很冷',level:1},
  {en:'The weather is nice.',zh:'天气真好',level:1},
  {en:'It is going to snow.',zh:'要下雪了',level:1},
  {en:'I like the warm weather.',zh:'我喜欢温暖的天气',level:1},
  {en:'It is hot and sunny.',zh:'又热又晒',level:1},
  {en:'The wind is strong today.',zh:'今天风很大',level:1},
  {en:'What will the weather be like tomorrow?',zh:'明天天气会怎样？',level:2},
  {en:'The weather has been very strange lately.',zh:'最近天气很奇怪',level:3},

  // ===== 时间与日程 =====
  {en:'What time is it?',zh:'现在几点了？',level:1},
  {en:'It is three o\'clock.',zh:'现在三点钟',level:1},
  {en:'I am late for work.',zh:'我上班迟到了',level:1},
  {en:'See you at seven.',zh:'七点见',level:1},
  {en:'The bus comes at eight.',zh:'公交车八点来',level:1},
  {en:'I get up at six every day.',zh:'我每天六点起床',level:2},
  {en:'We have a meeting at ten.',zh:'我们十点有个会议',level:2},
  {en:'I will be back in five minutes.',zh:'我五分钟后就回来',level:2},
  {en:'She stays up late every night.',zh:'她每晚熬夜',level:2},
  {en:'The train leaves in an hour.',zh:'火车一小时后出发',level:2},

  // ===== 食物与餐饮 =====
  {en:'I want some water.',zh:'我想要一些水',level:1},
  {en:'I like to eat fruit.',zh:'我喜欢吃水果',level:1},
  {en:'The food is very hot.',zh:'食物很烫',level:1},
  {en:'Can I have the menu?',zh:'我能看一下菜单吗？',level:1},
  {en:'Breakfast is ready.',zh:'早餐准备好了',level:1},
  {en:'This tastes very good.',zh:'这个味道很好',level:1},
  {en:'I am full now.',zh:'我吃饱了',level:1},
  {en:'Would you like some tea?',zh:'你想喝点茶吗？',level:1},
  {en:'I drink milk every morning.',zh:'我每天早上喝牛奶',level:2},
  {en:'She likes to cook for her family.',zh:'她喜欢给家人做饭',level:2},
  {en:'The soup is too hot to drink.',zh:'汤太烫了喝不了',level:2},
  {en:'We should eat more fruit every day.',zh:'我们应该每天多吃水果',level:2},
  {en:'He never eats before going to bed.',zh:'他从不在睡前吃东西',level:2},
  {en:'Could I have a cup of coffee?',zh:'我能来一杯咖啡吗？',level:2},
  {en:'My mother makes the best cake.',zh:'我妈妈做的蛋糕最好吃',level:2},
  {en:'I am so hungry I could eat a horse.',zh:'我饿得能吃下一匹马',level:3},

  // ===== 购物 =====
  {en:'How much is this?',zh:'这个多少钱？',level:1},
  {en:'That is too expensive.',zh:'那太贵了',level:1},
  {en:'I will take this one.',zh:'我要这个',level:1},
  {en:'Do you have a bigger size?',zh:'有更大的尺码吗？',level:1},
  {en:'Can I pay by card?',zh:'我可以用卡支付吗？',level:1},
  {en:'I am just looking, thank you.',zh:'我只是看看，谢谢',level:2},
  {en:'Is there any discount today?',zh:'今天有折扣吗？',level:2},
  {en:'I want to return this shirt.',zh:'我想退掉这件衬衫',level:2},
  {en:'She spent all her money on clothes.',zh:'她把所有钱都花在衣服上了',level:2},
  {en:'The shop opens at nine in the morning.',zh:'商店早上九点开门',level:2},

  // ===== 交通与出行 =====
  {en:'Where is the bus stop?',zh:'公交车站在哪？',level:1},
  {en:'I am going to the airport.',zh:'我要去机场',level:1},
  {en:'Turn left at the light.',zh:'在红绿灯处左转',level:1},
  {en:'The train is on time.',zh:'火车准时',level:1},
  {en:'Please fasten your seat belt.',zh:'请系好安全带',level:2},
  {en:'How long does it take to get there?',zh:'到那里要多久？',level:2},
  {en:'The road is very busy at this hour.',zh:'这个时间路上很堵',level:2},
  {en:'I missed the last bus home.',zh:'我错过了末班车',level:2},
  {en:'Can you drop me off at the corner?',zh:'能在拐角处让我下车吗？',level:2},
  {en:'You should turn right at the next corner.',zh:'你应该在下个拐角右转',level:2},

  // ===== 健康与身体 =====
  {en:'I have a headache.',zh:'我头痛',level:1},
  {en:'I do not feel well.',zh:'我感觉不舒服',level:1},
  {en:'You should see a doctor.',zh:'你应该去看医生',level:2},
  {en:'She needs to get more sleep.',zh:'她需要多睡一会',level:2},
  {en:'Take this medicine three times a day.',zh:'这个药一天吃三次',level:2},
  {en:'He hurt his leg when he was running.',zh:'他跑步的时候伤了腿',level:2},
  {en:'I try to walk for an hour every day.',zh:'我尽量每天走一小时路',level:2},
  {en:'Smoking is bad for your health.',zh:'吸烟对你的健康不好',level:2},
  {en:'She has been in bed for three days.',zh:'她已经卧床三天了',level:3},

  // ===== 学习与工作 =====
  {en:'I am a student.',zh:'我是一个学生',level:1},
  {en:'We go to school.',zh:'我们去学校',level:1},
  {en:'He works very hard.',zh:'他工作很努力',level:1},
  {en:'Can you help me?',zh:'你能帮我吗？',level:1},
  {en:'I love to read books.',zh:'我爱读书',level:1},
  {en:'She always helps me with my homework.',zh:'她总是帮我做作业',level:2},
  {en:'The teacher wrote the words on the board.',zh:'老师把单词写在黑板上',level:2},
  {en:'We should try our best to learn.',zh:'我们应该尽最大努力学习',level:2},
  {en:'I think this is a very good book.',zh:'我觉得这是一本很好的书',level:2},
  {en:'He has been working here for five years.',zh:'他已经在这里工作五年了',level:2},
  {en:'The more you read, the more you know.',zh:'你读得越多，就知道得越多',level:3},
  {en:'She never gives up when she has trouble.',zh:'她遇到困难时从不放弃',level:3},

  // ===== 情感与关系 =====
  {en:'I like you.',zh:'我喜欢你',level:1},
  {en:'She is very beautiful.',zh:'她非常漂亮',level:1},
  {en:'He loves his family.',zh:'他爱他的家人',level:1},
  {en:'She is my good friend.',zh:'她是我的好朋友',level:1},
  {en:'I miss you so much.',zh:'我非常想念你',level:1},
  {en:'Thank you for your help.',zh:'谢谢你的帮助',level:1},
  {en:'I am sorry for that.',zh:'那件事我很抱歉',level:1},
  {en:'Do not be angry with me.',zh:'别生我的气',level:1},
  {en:'She makes me feel happy.',zh:'她让我感到快乐',level:2},
  {en:'He is the best friend I have ever had.',zh:'他是我有过的最好的朋友',level:2},
  {en:'She is kind to everyone she meets.',zh:'她对遇到的每个人都很友善',level:2},
  {en:'I hope we can see each other again.',zh:'我希望我们能再见面',level:2},
  {en:'A true friend is hard to find.',zh:'知音难觅',level:3},

  // ===== 家庭 =====
  {en:'I have a big family.',zh:'我有一个大家庭',level:1},
  {en:'My mother is a teacher.',zh:'我妈妈是一名老师',level:1},
  {en:'He lives with his parents.',zh:'他和父母住在一起',level:1},
  {en:'We have dinner together.',zh:'我们一起吃晚饭',level:1},
  {en:'My sister is five years old.',zh:'我妹妹五岁',level:1},
  {en:'Her brother plays football well.',zh:'她哥哥足球踢得好',level:2},
  {en:'They take their kids to the park.',zh:'他们带孩子去公园',level:2},
  {en:'My parents got married twenty years ago.',zh:'我父母二十年前结婚的',level:2},

  // ===== 娱乐与休闲 =====
  {en:'I like the music.',zh:'我喜欢这音乐',level:1},
  {en:'They play football every day.',zh:'他们每天踢足球',level:1},
  {en:'Let us go to the park.',zh:'我们去公园吧',level:1},
  {en:'He plays the guitar well.',zh:'他弹吉他很好',level:1},
  {en:'I like to listen to the radio at night.',zh:'我喜欢在晚上听收音机',level:2},
  {en:'She loves to sing for her friends.',zh:'她喜欢为朋友们唱歌',level:2},
  {en:'What kind of music do you like?',zh:'你喜欢什么类型的音乐？',level:2},
  {en:'We had a great time at the party.',zh:'我们在派对上玩得很开心',level:2},
  {en:'I like watching movies on the weekend.',zh:'我喜欢在周末看电影',level:2},
  {en:'The new film was very long but good.',zh:'这部新电影很长但是不错',level:2},

  // ===== 旅行 =====
  {en:'I want to travel.',zh:'我想去旅行',level:1},
  {en:'We go to the beach.',zh:'我们去海边',level:1},
  {en:'Can I take a photo?',zh:'我可以拍照吗？',level:1},
  {en:'Where is the hotel?',zh:'酒店在哪里？',level:1},
  {en:'I need a map of the city.',zh:'我需要一张城市地图',level:2},
  {en:'She wants to travel to many places.',zh:'她想去很多地方旅行',level:2},
  {en:'We will go to the sea this summer.',zh:'这个夏天我们会去海边',level:2},
  {en:'They went camping in the mountains last week.',zh:'他们上周去山里露营了',level:3},
  {en:'The best time to visit is in spring.',zh:'最好的游览时间是春天',level:2},
  {en:'I have been to many countries.',zh:'我去过很多国家',level:2},

  // ===== 请求和建议 =====
  {en:'Can I open the window?',zh:'我能打开窗户吗？',level:1},
  {en:'Please sit down.',zh:'请坐',level:1},
  {en:'Could you speak slowly?',zh:'你能说慢一点吗？',level:1},
  {en:'Please wait a moment.',zh:'请稍等片刻',level:1},
  {en:'Do not forget your bag.',zh:'别忘了你的包',level:1},
  {en:'I think you should go now.',zh:'我觉得你应该现在出发',level:2},
  {en:'Would you like to come with us?',zh:'你愿意和我们一起来吗？',level:2},
  {en:'Let me know if you need anything.',zh:'需要什么就跟我说',level:2},
  {en:'It would be better to leave early.',zh:'早点出发会更好',level:2},
  {en:'You had better bring an umbrella.',zh:'你最好带一把伞',level:2},

  // ===== 描述人物 =====
  {en:'She is tall and thin.',zh:'她又高又瘦',level:1},
  {en:'He has blue eyes.',zh:'他有一双蓝眼睛',level:1},
  {en:'She has a sweet smile.',zh:'她有一个甜美的微笑',level:1},
  {en:'My father is very kind.',zh:'我爸爸非常和蔼',level:1},
  {en:'Her hair is long and black.',zh:'她的头发又长又黑',level:2},
  {en:'He is tall and very strong.',zh:'他高大又强壮',level:2},
  {en:'She looks much younger than her age.',zh:'她看起来比实际年龄年轻很多',level:2},
  {en:'The man in the blue shirt is my uncle.',zh:'穿蓝衬衫的那个男人是我叔叔',level:2},

  // ===== 居住与环境 =====
  {en:'He has a big house.',zh:'他有一座大房子',level:1},
  {en:'They live in the city.',zh:'他们住在城市里',level:1},
  {en:'The room is too small.',zh:'这个房间太小了',level:1},
  {en:'The city is big and busy.',zh:'这个城市又大又繁忙',level:1},
  {en:'We live near the river.',zh:'我们住在河边',level:1},
  {en:'There is a garden behind the house.',zh:'房子后面有一个花园',level:2},
  {en:'Her room is always clean and tidy.',zh:'她的房间总是干净整洁',level:2},
  {en:'They moved to a new house last month.',zh:'他们上个月搬到了新房子',level:2},

  // ===== 动物与自然 =====
  {en:'The dog is very friendly.',zh:'这只狗很友好',level:1},
  {en:'The cat is very cute.',zh:'这只猫很可爱',level:1},
  {en:'The bird can fly high.',zh:'鸟儿能飞得很高',level:1},
  {en:'I love animals.',zh:'我爱动物',level:1},
  {en:'The horse runs very fast.',zh:'这匹马跑得很快',level:1},
  {en:'There are many trees in the park.',zh:'公园里有很多树',level:2},
  {en:'The sky is blue and clear.',zh:'天空又蓝又清澈',level:2},

  // ===== 比较与选择 =====
  {en:'This one is better.',zh:'这个更好',level:1},
  {en:'It is too small for me.',zh:'对我来说太小了',level:1},
  {en:'This book is more interesting.',zh:'这本书更有趣',level:2},
  {en:'He runs faster than his brother.',zh:'他跑得比他哥哥快',level:2},
  {en:'She is the most careful girl in our class.',zh:'她是我们班最细心的女孩',level:2},
  {en:'The red dress is more beautiful than the blue one.',zh:'红裙子比蓝裙子更漂亮',level:2},
  {en:'Of all the cities, I like this one the best.',zh:'在所有城市中，我最喜欢这个',level:3},

  // ===== 计划与将来 =====
  {en:'What will you do today?',zh:'你今天要做什么？',level:1},
  {en:'I will call you later.',zh:'我晚点打给你',level:1},
  {en:'She is going to visit her grandma.',zh:'她要去拜访奶奶',level:2},
  {en:'They plan to get married next year.',zh:'他们计划明年结婚',level:2},
  {en:'I hope to find a better job soon.',zh:'我希望很快找到更好的工作',level:2},
  {en:'We are thinking about moving to a bigger city.',zh:'我们在考虑搬到一个更大的城市',level:3},

  // ===== Level 2 中级扩展句 =====
  {en:'He goes to the shop after school.',zh:'他放学后去商店',level:2},
  {en:'They are having a good time together.',zh:'他们在一起过得很愉快',level:2},
  {en:'The river is very long and beautiful.',zh:'这条河又长又美',level:2},
  {en:'She found a flower in the park.',zh:'她在公园里发现了一朵花',level:2},
  {en:'He gave me a gift for my birthday.',zh:'他送了我一份生日礼物',level:2},
  {en:'The old tree in the park is very tall.',zh:'公园里的老树非常高',level:2},
  {en:'I need to finish my work before night.',zh:'我需要在夜晚前完成工作',level:2},
  {en:'I wish you have a great day.',zh:'我希望你度过美好的一天',level:2},
  {en:'She drew a picture of her family.',zh:'她画了一幅家人的画',level:2},
  {en:'We should be kind to everyone around us.',zh:'我们应该对身边每个人友善',level:2},
  {en:'He put all his books into the big box.',zh:'他把所有的书放进了大箱子',level:2},
  {en:'She always brings some food to share.',zh:'她总是带一些食物来分享',level:2},
  {en:'I think it is good to have a plan first.',zh:'我认为先有个计划比较好',level:2},
  {en:'The sun is shining in the sky.',zh:'太阳在天空中照耀着',level:2},
  {en:'She wears a red dress to the party.',zh:'她穿了一条红裙子去派对',level:2},
  {en:'We walk to school together every day.',zh:'我们每天一起走路上学',level:2},
  {en:'He plays ball with his friends after class.',zh:'他课后和朋友玩球',level:2},
  {en:'The little girl can sing very well.',zh:'这个小女孩唱歌很好听',level:2},

  // ===== Level 3 高级扩展句 =====
  {en:'I never forget the good time we had together.',zh:'我永远不会忘记我们一起度过的美好时光',level:3},
  {en:'The most important thing is to be kind and honest.',zh:'最重要的事情是善良和诚实',level:3},
  {en:'I believe that if you work hard enough, you can win.',zh:'我相信如果你足够努力，你就能赢',level:3},
  {en:'We need to keep our planet clean and beautiful.',zh:'我们需要保持我们的星球清洁美丽',level:3},
  {en:'He said the best way to learn is to do it every day.',zh:'他说最好的学习方法是每天都做',level:3},
  {en:'We should never be afraid to ask for help.',zh:'我们在需要帮助的时候永远不要害怕开口',level:3},
  {en:'The best gift you can give is your time and love.',zh:'你能给的最好的礼物是你的时间和爱',level:3},
  {en:'The boy put all his toys into the big box.',zh:'男孩把所有的玩具放进了大箱子',level:3},
  {en:'He finally knew that family is the most precious thing.',zh:'他终于明白了家人是最珍贵的东西',level:3},
  {en:'We can learn a lot from people around us every day.',zh:'我们每天可以从身边的人那里学到很多',level:3},
  {en:'She spent the whole afternoon reading a good book.',zh:'她花了整个下午读一本好书',level:3},
  {en:'The new teacher told us a story that made us laugh.',zh:'新老师给我们讲了一个让我们笑了的故事',level:3},
  {en:'If you never try, you will never know.',zh:'如果你从不尝试，你永远不知道',level:3},
  {en:'Every time I come to this city, I find something new.',zh:'每次我来到这个城市，都会发现新东西',level:3},
  {en:'He was so tired that he fell asleep right after dinner.',zh:'他太累了，晚饭后立刻就睡着了',level:3},
];

function getSentences(level) {
  if (!level) return LISTENING_SENTENCES;
  return LISTENING_SENTENCES.filter(s => s.level === level);
}

function generateListeningDeck(count, level) {
  count = count || 20;
  let pool = level ? getSentences(level) : LISTENING_SENTENCES;
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

module.exports = { LISTENING_SENTENCES, getSentences, generateListeningDeck };
