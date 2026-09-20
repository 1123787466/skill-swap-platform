/* ============================================================
   小伴同学 · Mock AI 引擎
   说明：无需任何 API Key 即可演示。
        - detectEmotion: 关键词式情绪识别
        - mockReply:     角色口吻短句回复（≤3句，每句≤15字）
        - respond:       统一入口（先安全检查，再走 Mock；阶段5接真实 LLM）
        - generateStory: 模板拼接，孩子是主角（阶段3详化）
   ============================================================ */

/* ---------- 情绪识别：关键词计分 ----------
   返回 { primary, scores:{happy,angry,scared,sad,calm}, keywords[] } */
function detectEmotion(text) {
  const scores = { happy: 0, angry: 0, scared: 0, sad: 0, calm: 0 };
  const keywords = [];
  if (!text) return { primary: 'neutral', scores, keywords };

  Object.keys(EMOTION_KEYWORDS).forEach(emo => {
    EMOTION_KEYWORDS[emo].words.forEach(w => {
      if (text.indexOf(w) >= 0) {
        scores[emo]++;
        if (keywords.indexOf(w) < 0) keywords.push(w);
      }
    });
  });

  // 取最高分情绪
  let primary = 'neutral';
  let max = 0;
  Object.keys(scores).forEach(emo => {
    if (scores[emo] > max) { max = scores[emo]; primary = emo; }
  });
  if (max === 0) primary = 'calm';
  return { primary, scores, keywords };
}

/* ---------- Mock 回复模板 ----------
   先共情 → 命名情绪 → 温柔引导。每句≤15字，一次≤3句。 */

// 每种情绪的回复句组（第二句命名情绪，第三句引导）
const REPLY_TEMPLATES = {
  happy: [
    ['{roleName}听到你开心，我也好开心呀！'],
    ['开心的时候，心里暖暖的对吗？'],
    ['愿意再跟我说说吗？']
  ],
  sad: [
    ['听起来你有点难过呀。'],
    ['心里有点委屈，对吗？'],
    ['{roleName}抱抱你，没关系的。']
  ],
  angry: [
    ['你有点生气呀，没关系的。'],
    ['生气的时候可以说出来。'],
    ['是什么让你生气了呢？']
  ],
  scared: [
    ['听起来你有点害怕呀。'],
    ['害怕时{roleName}陪着你。'],
    ['愿意告诉我害怕什么吗？']
  ],
  calm: [
    ['嗯嗯，我在听着呢。'],
    ['今天过得怎么样呀？'],
    ['想跟我聊点什么吗？']
  ],
  neutral: [
    ['嗯嗯，我在听着呢。'],
    ['今天过得怎么样呀？'],
    ['想跟我聊点什么吗？']
  ]
};

// 角色昵称映射（让回复更贴合角色）
function roleNick(role) {
  return { bear: '暖暖', dino: '勇勇', space: '奇奇' }[role.id] || role.name;
}

// 生成 Mock 回复（字符串，换行分隔，≤3句）
function mockReply(text, emotion, role) {
  const emo = (emotion && REPLY_TEMPLATES[emotion]) ? emotion : 'neutral';
  const nick = roleNick(role);
  const sets = REPLY_TEMPLATES[emo];
  // 取前 3 句，注入角色昵称
  const sentences = sets.map(arr => arr[0].replace(/\{roleName\}/g, nick).replace(/\{roleName\}/g, nick));
  // 保证每句不超过 15 字（超长截断加省略号；正常模板都达标）
  const clipped = sentences.map(s => s.length > 15 ? s.slice(0, 14) + '…' : s);
  return clipped.join('\n');
}

/* ---------- 统一回复入口 ----------
   优先级：安全检查不通过 → 引导话术；
            设置启用真实 AI（阶段5）→ realAIRespond，失败回落 Mock；
            否则 → Mock。 */
async function respond(text, role) {
  const t0 = performance.now ? performance.now() : Date.now();
  const r = role || getCurrentRole();

  // 1. 安全检查
  const safety = checkSafety(text);
  if (!safety.safe) {
    // 写入安全记录
    addSafetyLog({
      id: genId('sf'),
      text: text,
      trigger: safety.trigger,
      ts: Date.now(),
      resolved: false
    });
    const latencyMs = Math.round((performance.now ? performance.now() : Date.now()) - t0);
    return { reply: safety.guide, emotion: 'scared', isSensitive: true, trigger: safety.trigger, latencyMs };
  }

  // 2. 情绪识别（Mock 关键词式，无论是否用真实 AI 都先识别一次用于落库）
  const emo = detectEmotion(text);
  const emotion = emo.primary;

  // 3. 真实 AI（按设置），失败回落 Mock
  let reply = '';
  const settings = getSettings();
  if (settings.aiEnabled && settings.aiKey && typeof realAIRespond === 'function') {
    try {
      reply = await realAIRespond(text, r, settings);
    } catch (e) {
      // 失败回落 Mock，保证演示不崩
      reply = mockReply(text, emotion, r);
    }
  } else {
    reply = mockReply(text, emotion, r);
  }

  const latencyMs = Math.round((performance.now ? performance.now() : Date.now()) - t0);

  // 4. 记录当日情绪
  logEmotion(emotion, emo.keywords);

  return { reply, emotion, isSensitive: false, keywords: emo.keywords, latencyMs };
}

/* ---------- 故事生成（阶段3详化，此处先给基础版） ----------
   孩子是主角，把情绪事件编进 300 字内小故事。 */
function generateStory(childName, emotion, event, role) {
  const name = childName || getChild().nickname || '小宝贝';
  const r = role || getCurrentRole();
  const nick = roleNick(r);
  const evt = event || '今天发生的一件小事';

  // 按情绪选故事骨架
  const SKELETONS = {
    happy: `${name}今天${evt}。\n\n${nick}说："${name}，你笑起来真好看！"\n${name}开心地蹦了起来。\n\n天上的星星也跟着眨眨眼。\n${name}抱着${nick}说："明天我还要更开心！"`,
    sad: `${name}今天${evt}，心里有点难过。\n\n${nick}轻轻走到${name}身边。\n"${name}，没关系的，我陪着你呀。"\n\n${name}的眼泪慢慢停了。\n${nick}说："难过的时候抱抱，就会好一点哦。"`,
    angry: `${name}今天${evt}，有点生气。\n\n${nick}说："${name}，生气的时候可以深呼吸。"\n${name}吸了一大口气，又慢慢吐出来。\n\n"是不是好一点点了？"\n${name}点点头，气也飞走了。`,
    scared: `${name}今天${evt}，有点害怕。\n\n${nick}牵着${name}的手。\n"${name}，害怕的时候我在你身边。"\n\n灯亮起来了，原来什么可怕的东西都没有。\n${name}抱住${nick}，再也不怕了。`,
    calm: `${name}今天${evt}。\n\n${nick}和${name}一起看天上的云。\n一朵云像小熊，一朵云像小船。\n\n"${name}，你心里现在是什么颜色呀？"\n${name}想了想，说："是暖暖的黄色。"`,
    neutral: `${name}今天${evt}。\n\n${nick}和${name}一起看天上的云。\n一朵云像小熊，一朵云像小船。\n\n"${name}，你心里现在是什么颜色呀？"\n${name}想了想，说："是暖暖的黄色。"`
  };

  const content = SKELETONS[emotion] || SKELETONS.neutral;
  const titles = {
    happy: `${name}和${nick}的快乐一天`,
    sad: `${name}被${nick}抱抱了`,
    angry: `${name}的生气飞走了`,
    scared: `${name}不再害怕了`,
    calm: `${name}和${nick}看云朵`,
    neutral: `${name}和${nick}看云朵`
  };
  return { title: titles[emotion] || titles.neutral, content };
}

/* ---------- 家长报告聚合（阶段4使用） ---------- */
function buildParentReport() {
  const conv = getConversations();
  const today = todayStr();
  const emoLog = getEmotionLog().find(e => e.date === today) || {
    emotions: { happy: 0, angry: 0, scared: 0, sad: 0, calm: 0 }, keywords: [], summary: ''
  };
  const safety = getSafetyLog();
  const usage = getUsage();

  // 当日对话轮数 = 孩子发言数
  const todayConv = conv.filter(c => new Date(c.ts).toDateString() === new Date().toDateString());
  const childRounds = todayConv.filter(c => c.role === 'child').length;

  // 对话摘要：取孩子发言关键词拼成简句
  const childTexts = todayConv.filter(c => c.role === 'child').map(c => c.text);
  const summary = emoLog.summary || (childTexts.length
    ? childTexts.join('；').slice(0, 80)
    : '今天还没有聊天记录。');

  // 建议话题：按主情绪生成
  const SUGGEST = {
    happy: ['今天最开心的事情是什么呀？', '你笑的时候，心里是什么感觉？', '明天想再开心一次吗？'],
    sad: ['今天有没有哪件事让你有点难过？', '难过的时候，希望爸爸妈妈怎么做？', '明天我们一起做件开心的事好不好？'],
    angry: ['今天什么事情让你生气了？', '生气的时候你想怎么办？', '我们一起想想怎么让它好起来？'],
    scared: ['今天有没有害怕的事情？', '害怕的时候想找谁？', '我们一起让它变得不那么可怕好不好？'],
    calm: ['今天心情怎么样呀？', '有没有想跟爸爸妈妈分享的事？', '明天想做什么呀？'],
    neutral: ['今天心情怎么样呀？', '有没有想跟爸爸妈妈分享的事？', '明天想做什么呀？']
  };
  const primaryEmo = (function () {
    let max = 0, k = 'neutral';
    Object.keys(emoLog.emotions).forEach(e => { if (emoLog.emotions[e] > max) { max = emoLog.emotions[e]; k = e; } });
    return k;
  })();
  const suggestions = SUGGEST[primaryEmo] || SUGGEST.neutral;

  return { emoLog, summary, suggestions, safety, usage, childRounds, todayConv };
}
