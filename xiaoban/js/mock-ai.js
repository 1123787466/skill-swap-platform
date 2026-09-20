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

/* ---------- 角色化 Mock 回复模板 ----------
   每个角色 × 每种情绪一组专属话术：
   先共情 → 命名情绪 → 引导。每句≤15字，一次≤3句。
   - 小熊暖暖：温柔慢、叠词、抱抱、呀/呢/哦
   - 恐龙勇勇：短促有力、吼、小勇士、感叹号
   - 太空奇奇：好奇惊叹、哔/哇/咦、星星飞船比喻 */

const ROLE_REPLIES = {
  bear: {
    happy:  ['暖暖也跟着笑啦～', '心里甜甜的对不对？', '来，暖暖抱抱你。'],
    sad:    ['哎呀，暖暖心都软了。', '心里有点委屈对吗？', '抱抱抱抱，没关系哦。'],
    angry:  ['呼呼，气鼓鼓的呀。', '生气也没有关系哦。', '要不要跟暖暖说说？'],
    scared: ['别怕别怕，暖暖在呢。', '心里有点害怕对吗？', '暖暖牵着你的手哦。'],
    calm:   ['嗯嗯，暖暖听着呢。', '今天过得怎么样呀？', '想聊点什么呢？'],
    neutral:['嗯嗯，暖暖听着呢。', '今天过得怎么样呀？', '想聊点什么呢？']
  },
  dino: {
    happy:  ['吼！太棒啦！', '勇勇为你骄傲！', '再大声笑一个！'],
    sad:    ['咦，小勇士别哭！', '难过也没关系的。', '勇勇陪你闯过去！'],
    angry:  ['吼！气到喷火啦？', '勇敢地说出来！', '勇勇帮你想办法！'],
    scared: ['别怕！勇勇在！', '小勇士也会害怕。', '深呼吸，我们冲！'],
    calm:   ['嗯！勇勇听着！', '今天有啥冒险？', '快跟勇勇说说！'],
    neutral:['嗯！勇勇听着！', '今天有啥冒险？', '快跟勇勇说说！']
  },
  space: {
    happy:  ['哇！像星星一样亮！', '开心得要飞起来啦？', '快告诉奇奇为什么！'],
    sad:    ['咦……信号有点低落。', '是委屈的小乌云吗？', '奇奇飞来陪你啦。'],
    angry:  ['哔！能量在冒火？', '生气也可以说哦。', '把它发射到太空吧！'],
    scared: ['别怕，奇奇开飞船来啦。', '黑黑的像宇宙对吗？', '我们一起照亮它！'],
    calm:   ['哔，奇奇收到啦。', '今天的星球怎么样？', '有新鲜事告诉我吗？'],
    neutral:['哔，奇奇收到啦。', '今天的星球怎么样？', '有新鲜事告诉我吗？']
  }
};

// 角色昵称映射（故事生成用）
function roleNick(role) {
  return { bear: '暖暖', dino: '勇勇', space: '奇奇' }[role.id] || role.name;
}

// 生成 Mock 回复（字符串，换行分隔，≤3句；不同角色措辞完全不同）
function mockReply(text, emotion, role) {
  const r = role || getCurrentRole();
  const bank = ROLE_REPLIES[r.id] || ROLE_REPLIES.bear;
  const emo = (emotion && bank[emotion]) ? emotion : 'neutral';
  // 取前 3 句；保险起见超长截断加省略号（模板本身都 ≤15 字）
  return bank[emo].slice(0, 3).map(s => s.length > 15 ? s.slice(0, 14) + '…' : s).join('\n');
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

/* ---------- 角色化故事生成 ----------
   孩子是主角，把当天情绪事件编进 300 字内小故事。
   三个角色各有专属意象与叙事口吻：
   - 小熊暖暖：抱抱、蜂蜜、小毯子、树洞，温柔安抚
   - 恐龙勇勇：丛林、大山、勋章、吼，鼓励冒险
   - 太空奇奇：星星、飞船、月亮、信号，惊叹想象 */
function generateStory(childName, emotion, event, role) {
  const name = childName || getChild().nickname || '小宝贝';
  const r = role || getCurrentRole();
  const evt = event || '今天发生的一件小事';

  const ROLE_STORY_SKELETONS = {
    bear: {
      happy: `${name}今天${evt}，笑得像蜂蜜一样甜。\n\n暖暖抱着${name}转了个圈：\n"你笑起来，整个树洞都暖啦！"\n\n晚上，暖暖把${name}裹进小毯子：\n"做个甜甜的梦哦，明天还要开心！"`,
      sad: `${name}今天${evt}，眼眶红红的。\n\n暖暖什么也没说，先给了一个大大的抱抱。\n"委屈的时候，抱抱最管用啦。"\n\n${name}在暖暖怀里慢慢不哭了。\n"谢谢你，暖暖。" "我一直都在呀。"`,
      angry: `${name}今天${evt}，气得小拳头攥得紧紧的。\n\n暖暖轻轻握住${name}的手：\n"来，跟暖暖一起深呼吸——"\n\n吸一口蜂蜜味的空气，再慢慢吐掉。\n"哇，气气都被呼走啦！" ${name}笑了。`,
      scared: `${name}今天${evt}，不敢一个人睡。\n\n暖暖钻进被窝，把${name}搂得紧紧的。\n"害怕的时候，就想想暖暖在抱抱你。"\n\n被窝里暖暖的、软软的。\n${name}听着暖暖的心跳，慢慢睡着了。`,
      calm: `${name}今天${evt}，心里平平的、静静的。\n\n暖暖和${name}靠在窗边看云。\n"你看，那朵云像不像一个大抱抱？"\n\n${name}点点头，靠在暖暖身上。\n"这样的下午，也很好呀。"`
    },
    dino: {
      happy: `${name}今天${evt}，开心得蹦得比树还高！\n\n勇勇"吼"了一声：\n"这是今天最棒的冒险！"\n\n勇勇把一枚树叶勋章别在${name}胸前：\n"奖励最开心的小勇士！"\n${name}挺着小胸脯，明天还要再冒险！`,
      sad: `${name}今天${evt}，低下了头。\n\n勇勇蹲下来，轻轻碰了碰${name}：\n"小勇士也可以哭一下下。"\n\n"哭完了，我们继续往前冲！"\n${name}抹抹眼泪，重新站直了。\n"对，勇勇，我能行！"`,
      angry: `${name}今天${evt}，气得直跺脚。\n\n勇勇说："来，跟我一起吼——吼！"\n${name}也大声吼了一下。\n\n"是不是把坏脾气吓跑啦？"\n${name}噗嗤笑了："吓跑啦！"\n"好！那我们继续冒险！"`,
      scared: `${name}今天${evt}，腿有点发软。\n\n勇勇挡在${name}前面：\n"别怕，勇勇在前面开路！"\n\n它们一起走过黑黑的小路。\n原来什么可怕的东西都没有。\n"看，你自己走完啦，真勇敢！"`,
      calm: `${name}今天${evt}，像平静的小湖面。\n\n勇勇说："休息也是一种冒险！"\n\n它们坐在大石头上晒太阳。\n"勇勇，我明天想去爬那座山。"\n"好！养足精神，明天冲！"`
    },
    space: {
      happy: `${name}今天${evt}，快乐信号超强！\n\n奇奇从飞船里探出头：\n"哔！检测到一颗会笑的小星星！"\n\n那颗星星就是${name}呀。\n奇奇把最亮的星光送给${name}：\n"把开心存起来，晚上照着你！"`,
      sad: `${name}今天${evt}，信号有点低落。\n\n奇奇开着小飞飞船过来：\n"咦，小乌云也来太空旅行吗？"\n\n"来，把难过装进我的飞船。"\n奇奇"嗖"地把它送到月亮后面。\n"好啦，心里又亮啦。"`,
      angry: `${name}今天${evt}，能量在冒火星。\n\n奇奇说："一二三，发射！"\n${name}把生气包成一个小球球。\n\n小球球飞过月亮，越飞越远。\n"哔——坏情绪已送出太阳系！"\n${name}笑了："哇，真的飞走了！"`,
      scared: `${name}今天${evt}，周围黑黑的。\n\n奇奇开飞船亮起两盏小星星灯：\n"看，宇宙再黑，也有星星点灯。"\n\n它们数着一颗、两颗、三颗……\n黑黑的天空变成了星空。\n${name}抱着星星灯，不怕啦。`,
      calm: `${name}今天${evt}，信号平平的、稳稳的。\n\n奇奇和${name}飘在太空里看地球。\n"你看，地球蓝蓝的，多安静呀。"\n\n${name}打了个小哈欠。\n"奇奇，我想睡了。" "晚安，小星星。"`
    }
  };

  const bank = ROLE_STORY_SKELETONS[r.id] || ROLE_STORY_SKELETONS.bear;
  const content = bank[emotion] || bank.calm;

  const titles = {
    bear:  { happy: `${name}的蜂蜜味开心`, sad: `${name}的大大抱抱`, angry: `${name}把气气呼走啦`, scared: `${name}的暖暖被窝`, calm: `${name}和暖暖的云下午` },
    dino:  { happy: `${name}的开心勋章`, sad: `${name}哭完继续冲`, angry: `${name}吼走坏脾气`, scared: `${name}自己走完了黑路`, calm: `${name}的山顶冒险计划` },
    space: { happy: `${name}是会笑的小星星`, sad: `${name}的小乌云旅行`, angry: `${name}发射了坏情绪`, scared: `${name}的星星点灯`, calm: `${name}和奇奇看地球` }
  };
  const titleBank = titles[r.id] || titles.bear;
  return { title: titleBank[emotion] || titleBank.calm, content };
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
