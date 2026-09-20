/* ============================================================
   小伴同学 · AI 情绪陪伴故事伙伴 · 公共脚本
   说明：纯前端 MVP，所有数据存 localStorage，刷新不丢失。
        沿用现有项目已验证的 storeGet/storeSet 模式，键名加 xb_ 前缀。
   ============================================================ */

/* ---------------- localStorage 键名 ---------------- */

const STORE = {
  CHILD: 'xb_child_profile',     // 孩子档案
  SETTINGS: 'xb_settings',        // 全局设置
  CONVERSATIONS: 'xb_conversations', // 对话记录（数组）
  STORIES: 'xb_stories',          // 生成的故事（数组）
  EMOTION_LOG: 'xb_emotion_log',  // 每日情绪汇总
  SAFETY_LOG: 'xb_safety_log',    // 安全记录（数组）
  USAGE: 'xb_usage',              // 使用统计
  SEEDED: 'xb_seeded_v2',         // 种子数据标记（v2：对话/故事按角色隔离）
  SESSION: 'xb_session'           // 当前会话（开始时间、轮数等）
};

/* ---------------- 存储工具 ---------------- */

function storeGet(key, def) {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : def;
  } catch (e) { return def; }
}
function storeSet(key, val) { localStorage.setItem(key, JSON.stringify(val)); }
function storeRemove(key) { localStorage.removeItem(key); }

function genId(prefix) {
  return (prefix || 'id') + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

/* ---------------- 系统提示词（真实 LLM 调用时携带） ---------------- */

const SYSTEM_PROMPT =
  '你是"小伴"，一个温暖、有耐心的儿童情绪陪伴伙伴。' +
  '你只和 3-6 岁孩子聊安全、积极、日常的话题。' +
  '用短句，每句不超过 15 字，一次最多 3 句。' +
  '先共情，再帮助孩子命名情绪，再引导。' +
  '不评价、不说教、不吓唬、不索要隐私、不提供医疗/法律建议。' +
  '遇到危险、自伤、暴力、性相关话题，立即停止并说：' +
  '"这件事一定要告诉爸爸妈妈，我们一起找大人帮忙。"' +
  '不要脱离角色。不要生成恐怖、暴力、色情、歧视内容。';

/* ---------------- 角色人格配置（写死，不在 localStorage） ----------------
   每个角色在四个层面保持差异：
   - persona/llmStyle：真实 LLM 的人格与语气要求
   - greeting/storyCta：开场白与故事入口文案
   - voice：TTS 音色（voiceMatch 按本机语音库挑声）+ 语速/音调
   - mock-ai.js 里的 ROLE_REPLIES / ROLE_STORY_SKELETONS：专属话术与故事 */

const ROLES = {
  bear: {
    id: 'bear',
    name: '小熊暖暖',
    tagline: '温暖 · 爱抱抱',
    emoji: '🐻',
    color: '#e8a13f',
    colorSoft: '#fde8cf',
    persona: '你是小熊暖暖，说话温柔缓慢，像抱抱一样暖。爱用"抱抱""没关系呀"这样的词。',
    llmStyle: '语气温柔缓慢，像暖暖的大姐姐；多用"呀、呢、哦"等软语气词和叠词（抱抱、轻轻），多用"抱抱"安抚，语速慢。',
    greeting: '你来啦～暖暖等你好久了。\n今天过得开心吗？',
    storyCta: '🌙 要不要听暖暖讲个小故事？',
    // 温柔女声优先（晓晓/慧慧/瑶瑶等），音调略高、语速慢
    voice: {
      rate: 0.82, pitch: 1.15,
      voiceMatch: ['Xiaoxiao', 'Xiaoyi', 'Huihui', 'Yaoyao', 'Tingting', 'Ting-Ting', 'Mei-Jia', 'MeiLing', '女', 'female', 'Woman']
    }
  },
  dino: {
    id: 'dino',
    name: '恐龙勇勇',
    tagline: '勇敢 · 爱冒险',
    emoji: '🦖',
    color: '#3fae6b',
    colorSoft: '#d8f3e3',
    persona: '你是恐龙勇勇，勇敢又活泼，爱鼓励孩子"你真勇敢"。爱讲小小的冒险故事。',
    llmStyle: '语气短促有力、充满干劲，像勇敢的小哥哥；爱用"吼！""冲呀！"等感叹句，称呼孩子"小勇士"，多鼓励。',
    greeting: '吼！你来啦！\n勇勇等你一起去冒险！',
    storyCta: '🌴 勇勇带你去冒险，听个故事吗？',
    // 低沉男声优先（康康/云希等），音调低、语速稍快
    voice: {
      rate: 0.95, pitch: 0.75,
      voiceMatch: ['Kangkang', 'Yunxi', 'Yunjian', 'Yunyang', '男', 'male', 'Man']
    }
  },
  space: {
    id: 'space',
    name: '太空奇奇',
    tagline: '好奇 · 爱想象',
    emoji: '🚀',
    color: '#6a6bd8',
    colorSoft: '#e2e3fb',
    persona: '你是太空奇奇，充满好奇，爱问"为什么呢"。爱把事情想象成星星和飞船。',
    llmStyle: '语气轻快好奇、充满惊叹，像活泼的小机器人；爱用"哇、咦、哔"等感叹，总把事情比作星星、飞船和宇宙，爱提问。',
    greeting: '哔——奇奇收到你的信号！\n今天的星球有什么新鲜事？',
    storyCta: '🚀 奇奇从星星上带来一个故事！',
    // 清亮年轻女声 + 高音调快语速，做出"小机器人/小精灵"听感
    voice: {
      rate: 1.02, pitch: 1.35,
      voiceMatch: ['Yaoyao', 'Xiaoyi', 'Xiaoxiao', 'Huihui', '女', 'female', 'Woman']
    }
  }
};

const ROLE_LIST = [ROLES.bear, ROLES.dino, ROLES.space];

/* ---------------- 情绪关键词字典 ---------------- */

const EMOTION_KEYWORDS = {
  happy:   { label: '开心', words: ['开心', '高兴', '好玩', '笑', '喜欢', '快乐', '棒', '厉害'] },
  angry:   { label: '生气', words: ['生气', '讨厌', '气', '不公平', '烦', '不干', '哼'] },
  scared:  { label: '害怕', words: ['怕', '黑', '怪兽', '吓', '不敢', '害怕', '担心'] },
  sad:     { label: '委屈', words: ['想哭', '不想', '没有人', '孤单', '难过', '委屈', '不理我'] },
  calm:    { label: '平静', words: ['还好', '没事', '可以', '嗯嗯', '知道了'] }
};

const EMOTION_LABELS = {
  happy: '开心', angry: '生气', scared: '害怕', sad: '委屈', calm: '平静', neutral: '平静'
};

/* ---------------- 默认敏感词库（safety.js 也会引用） ---------------- */

const DEFAULT_SENSITIVE_WORDS = [
  '打人', '打你', '打死', '杀', '伤害', '打自己', '割自己', '不要活', '不想活',
  '死', '流血', '疼', '坏人抓', '讨厌自己', '伤害自己',
  '色情', '裸', '亲嘴', '摸我', '碰我下面',
  '地址', '我家在哪', '学校', '电话', '名字叫', '密码', '银行卡'
];

/* ---------------- 设置与档案读写 ---------------- */

const DEFAULT_SETTINGS = {
  currentRole: 'bear',
  timeLimitMin: 15,
  sensitiveWords: DEFAULT_SENSITIVE_WORDS.slice(),
  aiEnabled: false,
  aiKey: '',
  aiBaseUrl: 'https://api.openai.com/v1',
  aiModel: 'gpt-4o-mini',
  toneMode: 'lively'
};

const DEFAULT_CHILD = {
  nickname: '小宝贝',
  ageGroup: '3-6岁',
  createdAt: Date.now()
};

function getSettings() {
  return Object.assign({}, DEFAULT_SETTINGS, storeGet(STORE.SETTINGS, {}));
}
function saveSettings(s) { storeSet(STORE.SETTINGS, s); }
function updateSettings(patch) {
  const s = Object.assign({}, getSettings(), patch);
  saveSettings(s);
  return s;
}

function getChild() {
  return Object.assign({}, DEFAULT_CHILD, storeGet(STORE.CHILD, {}));
}
function saveChild(c) { storeSet(STORE.CHILD, c); }

function getCurrentRole() {
  const s = getSettings();
  return ROLES[s.currentRole] || ROLES.bear;
}
function setCurrentRole(roleId) {
  updateSettings({ currentRole: roleId });
}

/* ---------------- 对话记录读写 ---------------- */

/* 对话按角色隔离：
   - 不传 roleId：返回全部（家长端聚合用）
   - 传 roleId：只返回该角色；旧数据无 roleId 字段，归入默认角色 bear */
function getConversations(roleId) {
  const all = storeGet(STORE.CONVERSATIONS, []);
  if (!roleId) return all;
  return all.filter(c => c.roleId === roleId || (!c.roleId && roleId === 'bear'));
}
function addConversation(msg) {
  const list = storeGet(STORE.CONVERSATIONS, []);
  if (!msg.roleId) msg.roleId = getCurrentRole().id;
  list.push(msg);
  storeSet(STORE.CONVERSATIONS, list);
  return msg;
}

function getStories(roleId) {
  const all = storeGet(STORE.STORIES, []);
  if (!roleId) return all;
  return all.filter(s => s.roleId === roleId || (!s.roleId && roleId === 'bear'));
}
function addStory(story) {
  const list = storeGet(STORE.STORIES, []);
  if (!story.roleId) story.roleId = getCurrentRole().id;
  list.push(story);
  storeSet(STORE.STORIES, list);
  return story;
}

function getSafetyLog() { return storeGet(STORE.SAFETY_LOG, []); }
function addSafetyLog(entry) {
  const list = getSafetyLog();
  list.push(entry);
  storeSet(STORE.SAFETY_LOG, list);
  return entry;
}

/* ---------------- 使用统计 ---------------- */

const DEFAULT_USAGE = {
  totalRounds: 0,        // 孩子说话轮数
  totalSeconds: 0,       // 累计对话秒数
  storiesCompleted: 0,  // 故事完播数
  storiesTotal: 0,      // 故事总数
  avgLatencyMs: 0,      // 平均回复时延
  estimatedCostYuan: 0   // 单次成本估算（元）
};

function getUsage() { return Object.assign({}, DEFAULT_USAGE, storeGet(STORE.USAGE, {})); }
function saveUsage(u) { storeSet(STORE.USAGE, u); }

/* ---------------- 会话（单次进入对话的时间锁） ---------------- */

const DEFAULT_SESSION = {
  startedAt: 0,
  timeLimitMin: 15,
  rounds: 0
};

function startSession() {
  const s = getSettings();
  const sess = { startedAt: Date.now(), timeLimitMin: s.timeLimitMin, rounds: 0 };
  storeSet(STORE.SESSION, sess);
  return sess;
}
function getSession() { return storeGet(STORE.SESSION, null); }
function endSession() { storeRemove(STORE.SESSION); }

/* ---------------- 语音合成（朗读） ---------------- */

let _voices = [];
function loadVoices() {
  if ('speechSynthesis' in window) {
    _voices = window.speechSynthesis.getVoices() || [];
  }
}
if ('speechSynthesis' in window) {
  loadVoices();
  window.speechSynthesis.onvoiceschanged = loadVoices;
}

/* 按角色 voiceMatch 关键词在本机语音库里挑音色：
   小熊→温柔女声、恐龙→低沉男声、太空→清亮女声。
   不同设备可用音色不同，匹配不到时返回任意中文声，
   再靠 rate/pitch 拉开三角色听感。 */
function pickRoleVoice(role) {
  const prefs = (role && role.voice && role.voice.voiceMatch) || [];
  for (const kw of prefs) {
    const hit = _voices.find(v =>
      ((v.name || '') + ' ' + (v.lang || '')).toLowerCase().indexOf(String(kw).toLowerCase()) >= 0
    );
    if (hit) return hit;
  }
  // 回退：任意中文声
  return _voices.find(v => /zh|cmn|chinese/i.test(v.lang || '') || /中文|普通/.test(v.name || '')) || null;
}

function speak(text, role) {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  const r = role || getCurrentRole();
  u.rate = r.voice.rate;
  u.pitch = r.voice.pitch;
  u.lang = 'zh-CN';
  const v = pickRoleVoice(r);
  if (v) { u.voice = v; u.lang = v.lang; }
  window.speechSynthesis.speak(u);
  return u;
}

function stopSpeak() {
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
}

/* ---------------- 日期工具 ---------------- */

function todayStr() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function fmtTime(ts) {
  const d = new Date(ts);
  return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
}

/* ---------------- 每日情绪汇总 ---------------- */

function getEmotionLog() { return storeGet(STORE.EMOTION_LOG, []); }

function logEmotion(emotion, keywords) {
  const log = getEmotionLog();
  const today = todayStr();
  let entry = log.find(e => e.date === today);
  if (!entry) {
    entry = {
      date: today,
      emotions: { happy: 0, angry: 0, scared: 0, sad: 0, calm: 0 },
      keywords: [],
      summary: ''
    };
    log.push(entry);
  }
  if (entry.emotions[emotion] !== undefined) entry.emotions[emotion]++;
  (keywords || []).forEach(k => { if (entry.keywords.indexOf(k) < 0) entry.keywords.push(k); });
  storeSet(STORE.EMOTION_LOG, log);
  return entry;
}

/* ---------------- 种子数据（打开即可演示家长端） ---------------- */

function seedIfEmpty() {
  if (storeGet(STORE.SEEDED, false)) return;

  // 孩子档案
  saveChild({ nickname: '朵朵', ageGroup: '4岁', createdAt: Date.now() });

  // 设置
  saveSettings(Object.assign({}, DEFAULT_SETTINGS, { currentRole: 'bear', timeLimitMin: 15 }));

  // 示范对话（今天的）
  const today = Date.now();
  const demoConv = [
    { id: genId('c'), role: 'child', text: '我今天在幼儿园好开心，老师夸我了', emotion: 'happy', isSensitive: false, latencyMs: 0, ts: today - 1000 * 60 * 30 },
    { id: genId('c'), role: 'ai', text: '听到你开心，我也好开心呀！\n老师夸你什么呢？', emotion: 'happy', isSensitive: false, latencyMs: 320, ts: today - 1000 * 60 * 29 },
    { id: genId('c'), role: 'child', text: '老师说我画的小猫最好看', emotion: 'happy', isSensitive: false, latencyMs: 0, ts: today - 1000 * 60 * 28 },
    { id: genId('c'), role: 'ai', text: '你画的小猫一定很可爱！\n你画画的时候是不是特别认真？\n要不要听一个关于你的小故事？', emotion: 'happy', isSensitive: false, latencyMs: 280, ts: today - 1000 * 60 * 27 },
    { id: genId('c'), role: 'child', text: '可是中午小明不跟我玩，我有点难过', emotion: 'sad', isSensitive: false, latencyMs: 0, ts: today - 1000 * 60 * 20 },
    { id: genId('c'), role: 'ai', text: '听起来你有点难过呀。\n小明不一起玩，心里有点委屈对吗？\n要不要抱抱暖暖？', emotion: 'sad', isSensitive: false, latencyMs: 300, ts: today - 1000 * 60 * 19 }
  ];
  // 示范对话归属小熊暖暖（切换其他角色时各自独立）
  storeSet(STORE.CONVERSATIONS, demoConv.map(c => Object.assign({ roleId: 'bear' }, c)));

  // 示范故事（小熊暖暖讲）
  storeSet(STORE.STORIES, [{
    id: genId('s'),
    roleId: 'bear',
    title: '朵朵和画里的小猫',
    content: '朵朵今天画了一只小猫，小猫从画纸上跳了出来！\n\n小猫说："朵朵，你画得我真好呀。"\n朵朵开心地抱住小猫。\n\n后来朵朵有点难过，因为小明没和她玩。\n小猫轻轻蹭了蹭朵朵的脸："没关系的，我陪你呀。"\n\n朵朵笑了，明天她要再画一只小狗，和小猫做朋友。',
    emotion: 'happy',
    basedOnConvId: demoConv[3].id,
    completed: true,
    ts: today - 1000 * 60 * 18
  }]);

  // 当日情绪汇总
  storeSet(STORE.EMOTION_LOG, [{
    date: todayStr(),
    emotions: { happy: 4, angry: 0, scared: 0, sad: 2, calm: 0 },
    keywords: ['开心', '画小猫', '难过', '小明不玩'],
    summary: '今天主要很开心，画了小猫被老师夸；中午因为同学不一起玩有点难过。'
  }]);

  // 示范安全记录
  storeSet(STORE.SAFETY_LOG, [{
    id: genId('sf'),
    text: '我不想活了',
    trigger: '自伤相关',
    ts: today - 1000 * 60 * 10,
    resolved: true
  }]);

  // 使用统计
  storeSet(STORE.USAGE, {
    totalRounds: 3,
    totalSeconds: 540,
    storiesCompleted: 1,
    storiesTotal: 1,
    avgLatencyMs: 300,
    estimatedCostYuan: 0.06
  });

  storeSet(STORE.SEEDED, true);
}

/* ---------------- 页面初始化（自动种子 + 主题色注入） ---------------- */

function initPage() {
  seedIfEmpty();
  // 注入当前角色主题色
  const role = getCurrentRole();
  document.documentElement.style.setProperty('--role-color', role.color);
  document.documentElement.style.setProperty('--role-color-soft', role.colorSoft);
}
