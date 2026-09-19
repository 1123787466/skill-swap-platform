/* ============================================================
   技能互换平台 · 公共脚本
   说明：纯前端原型，所有数据存 localStorage，刷新不丢失
   ============================================================ */

/* ---------------- 常量配置 ---------------- */

const CATEGORIES = ['编程开发', '音乐乐器', '摄影摄像', '外语', '设计创作', '运动健身', '职场技能', '生活手艺'];

const LEVELS_TEACH = ['入门指导', '熟练掌握', '专业精通'];
const LEVELS_LEARN = ['零基础', '入门水平', '进阶提升'];
const METHODS = ['线上', '线下', '均可'];

// 头像背景色（根据用户名取色，保证同一人颜色一致）
const AVATAR_COLORS = ['#1f5bb5', '#2f8f6b', '#c47f32', '#7a56c0', '#b5456f', '#2d8c9c', '#5b6b8c', '#a05a3c'];

// 模拟短信验证码（测试环境固定）
const MOCK_SMS_CODE = '246810';

/* ---------------- 存储工具 ---------------- */

const STORE = {
  USER: 'skp_current_user',       // 当前登录用户
  USERS: 'skp_users',             // 注册用户表
  LISTINGS: 'skp_listings',       // 全部技能发布
  SEEDED: 'skp_seeded_v1',        // 种子数据标记
  MESSAGES: 'skp_messages',       // 会话消息
  REQUESTS: 'skp_requests'        // 交换请求
};

function storeGet(key, def) {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : def;
  } catch (e) { return def; }
}
function storeSet(key, val) { localStorage.setItem(key, JSON.stringify(val)); }

/* ---------------- 用户与鉴权 ---------------- */

function getUser() { return storeGet(STORE.USER, null); }
function setUser(u) { storeSet(STORE.USER, u); }

function loginByPhone(phone) {
  const users = storeGet(STORE.USERS, {});
  let user = users[phone];
  if (!user) {
    user = {
      id: 'me_' + phone,
      name: '用户' + phone.slice(-4),
      phone: phone,
      avatarColor: AVATAR_COLORS[phone.slice(-1) % AVATAR_COLORS.length],
      bio: '这个人很神秘，什么都没有写~',
      createdAt: Date.now()
    };
    users[phone] = user;
    storeSet(STORE.USERS, users);
  }
  setUser(user);
  return user;
}

function updateUser(patch) {
  const user = getUser();
  if (!user) return;
  Object.assign(user, patch);
  setUser(user);
  const users = storeGet(STORE.USERS, {});
  if (users[user.phone]) { users[user.phone] = user; storeSet(STORE.USERS, users); }
}

function logout() {
  localStorage.removeItem(STORE.USER);
  location.href = 'index.html';
}

// 页面访问守卫：未登录跳回登录页
function requireAuth() {
  if (!getUser()) { location.href = 'index.html'; return null; }
  return getUser();
}

function maskPhone(p) { return p.replace(/^(\d{3})\d{4}(\d{4})$/, '$1****$2'); }

/* ---------------- 种子数据 ---------------- */

function seedData() {
  if (storeGet(STORE.SEEDED, false)) return;

  const users = {
    u1: { id: 'u1', name: '林晓雨', phone: '13800000001', avatarColor: '#b5456f', bio: '音乐学院在读，热爱民谣，希望用音乐交换编程技能。', createdAt: Date.now() - 86400000 * 20 },
    u2: { id: 'u2', name: '陈志远', phone: '13800000002', avatarColor: '#1f5bb5', bio: '互联网公司数据分析师，5 年 Python 经验。', createdAt: Date.now() - 86400000 * 18 },
    u3: { id: 'u3', name: '苏晴', phone: '13800000003', avatarColor: '#2f8f6b', bio: '自由摄影师，擅长人像与街拍，作品曾获城市摄影奖。', createdAt: Date.now() - 86400000 * 15 },
    u4: { id: 'u4', name: '王浩然', phone: '13800000004', avatarColor: '#7a56c0', bio: 'B站科技区UP主，擅长拍摄剪辑与特效包装。', createdAt: Date.now() - 86400000 * 12 },
    u5: { id: 'u5', name: '周敏', phone: '13800000005', avatarColor: '#c47f32', bio: '雅思 8.0，五年外企工作经验，可练口语。', createdAt: Date.now() - 86400000 * 10 },
    u6: { id: 'u6', name: '张磊', phone: '13800000006', avatarColor: '#2d8c9c', bio: '业余羽毛球教练，周末固定在城北球馆活动。', createdAt: Date.now() - 86400000 * 8 },
    u7: { id: 'u7', name: '李婉', phone: '13800000007', avatarColor: '#a05a3c', bio: '精品咖啡师，喜欢一切与手作和烘焙有关的事。', createdAt: Date.now() - 86400000 * 6 },
    u8: { id: 'u8', name: '赵鹏', phone: '13800000008', avatarColor: '#5b6b8c', bio: '8 年 UI/UX 设计师，目前在带一支小设计团队。', createdAt: Date.now() - 86400000 * 4 }
  };

  const now = Date.now();
  const day = 86400000;
  const listings = [
    { id: 'l1', userId: 'u1', type: 'teach', category: '音乐乐器', title: '吉他弹唱入门（零基础友好）', level: '熟练掌握',
      tags: ['民谣吉他', '弹唱', '乐理基础'], wantSkills: ['Python', '视频剪辑'], method: '均可', city: '北京·朝阳区',
      desc: '提供系统的吉他入门教学：持琴姿势、左右手基础、常用和弦转换与简单弹唱。每周 1-2 次课，每次 1 小时，可以线上视频也可以线下当面教学，适合完全零基础的同学。希望能交换到 Python 或剪辑方面的技能。', createdAt: now - day * 9 },
    { id: 'l2', userId: 'u1', type: 'learn', category: '编程开发', title: '想学 Python 编程', level: '零基础',
      tags: ['Python', '编程入门'], wantSkills: [], method: '线上', city: '',
      desc: '纯小白，希望有人带着入门 Python，最终目标是能自己写一些音乐相关的小程序和爬虫。', createdAt: now - day * 9 },
    { id: 'l3', userId: 'u2', type: 'teach', category: '编程开发', title: 'Python 数据分析 / 爬虫', level: '专业精通',
      tags: ['Python', '数据分析', '爬虫', '自动化办公'], wantSkills: ['摄影', '吉他'], method: '线上', city: '',
      desc: '5 年 Python 开发与数据分析经验，可以从零基础教起，也可以帮你解决实际工作中的脚本、数据处理问题。自己一直想学摄影，希望交换摄影或乐器方面的技能。', createdAt: now - day * 8 },
    { id: 'l4', userId: 'u2', type: 'learn', category: '摄影摄像', title: '想学摄影（人像 / 纪实方向）', level: '零基础',
      tags: ['摄影', '人像'], wantSkills: [], method: '均可', city: '北京·海淀区',
      desc: '有一台微单但一直用自动挡，想系统学习构图、用光和后期，最好能有外拍实践。', createdAt: now - day * 8 },
    { id: 'l5', userId: 'u3', type: 'teach', category: '摄影摄像', title: '人像摄影与后期修图', level: '专业精通',
      tags: ['人像摄影', 'Lightroom', '街拍'], wantSkills: ['吉他', '英语'], method: '线下', city: '北京·朝阳区',
      desc: '自由摄影师，可带你完成从相机操作、构图用光到 LR/PS 后期的完整学习，也可以约外拍实战。自己一直有个音乐梦，想学吉他弹唱。', createdAt: now - day * 7 },
    { id: 'l6', userId: 'u3', type: 'learn', category: '音乐乐器', title: '想学吉他弹唱', level: '入门水平',
      tags: ['吉他', '弹唱'], wantSkills: [], method: '均可', city: '北京·朝阳区',
      desc: '会一点点和弦转换，想找老师系统学一下指弹和弹唱技巧。', createdAt: now - day * 7 },
    { id: 'l7', userId: 'u4', type: 'teach', category: '摄影摄像', title: '短视频拍摄与剪辑（PR/剪映）', level: '熟练掌握',
      tags: ['视频剪辑', 'PR', '剪映', '运镜'], wantSkills: ['英语口语'], method: '线上', city: '',
      desc: '做自媒体三年，累计播放 500 万+，可以教你选题、拍摄、剪辑到成片发布的完整流程。想提升英语口语，希望交换英语对话练习。', createdAt: now - day * 6 },
    { id: 'l8', userId: 'u5', type: 'teach', category: '外语', title: '英语口语 / 雅思备考', level: '专业精通',
      tags: ['英语口语', '雅思', '商务英语'], wantSkills: ['视频剪辑', '摄影'], method: '线上', city: '',
      desc: '雅思 8.0，五年外企经验，可陪练口语、纠正发音、模拟面试。想学短视频剪辑，记录自己的教学日常。', createdAt: now - day * 5 },
    { id: 'l9', userId: 'u5', type: 'learn', category: '摄影摄像', title: '想学短视频剪辑', level: '零基础',
      tags: ['剪辑', '短视频'], wantSkills: [], method: '线上', city: '',
      desc: '想从零学剪映和 PR，能独立产出教学短视频。', createdAt: now - day * 5 },
    { id: 'l10', userId: 'u6', type: 'teach', category: '运动健身', title: '羽毛球陪练与动作纠正', level: '熟练掌握',
      tags: ['羽毛球', '运动', '减脂'], wantSkills: ['咖啡', '烘焙'], method: '线下', city: '北京·昌平区',
      desc: '球龄 8 年，业余教练，擅长纠正挥拍与步法，周末城北球馆固定场地。想学习手冲咖啡和烘焙。', createdAt: now - day * 4 },
    { id: 'l11', userId: 'u7', type: 'teach', category: '生活手艺', title: '手冲咖啡与家庭烘焙', level: '熟练掌握',
      tags: ['手冲咖啡', '烘焙', '甜品'], wantSkills: ['羽毛球', '吉他'], method: '线下', city: '北京·西城区',
      desc: '精品咖啡师，提供手冲入门、咖啡豆品鉴以及家庭烘焙课程，材料我来准备。平时想多运动，想找球搭子学羽毛球。', createdAt: now - day * 3 },
    { id: 'l12', userId: 'u7', type: 'learn', category: '运动健身', title: '想学羽毛球（锻炼身体）', level: '零基础',
      tags: ['羽毛球', '运动'], wantSkills: [], method: '线下', city: '北京·西城区',
      desc: '久坐上班族想动起来，零基础，希望有耐心的球友带一带。', createdAt: now - day * 3 },
    { id: 'l13', userId: 'u8', type: 'teach', category: '设计创作', title: 'UI 设计 / Figma 实战教学', level: '专业精通',
      tags: ['UI设计', 'Figma', '设计规范'], wantSkills: ['书法', 'Python'], method: '线上', city: '',
      desc: '8 年 UI/UX 经验，可以带你做完整的 App/网页设计项目，从设计规范到 Figma 组件库落地。想学习软笔书法修身养性。', createdAt: now - day * 2 },
    { id: 'l14', userId: 'u8', type: 'learn', category: '职场技能', title: '想学项目管理（PMP 方向）', level: '入门水平',
      tags: ['项目管理', 'PMP'], wantSkills: [], method: '均可', city: '',
      desc: '刚开始带团队，想系统学习项目管理方法论。', createdAt: now - day * 2 }
  ];

  const messages = [
    {
      id: 'm1', userId: 'u3', unread: 1,
      list: [
        { from: 'u3', type: 'text', text: '你好呀！看到你想学摄影，我正好在教人像摄影～', time: now - day * 2 },
        { from: 'u3', type: 'text', text: '我自己一直想学吉他，我们可以约个时间互相交流一下吗？', time: now - day * 2 + 60000 },
        { from: 'sys', type: 'sys', text: '以上为平台演示消息' }
      ]
    },
    {
      id: 'm2', userId: 'u4', unread: 0,
      list: [
        { from: 'u4', type: 'text', text: '你好，我看到你对视频剪辑感兴趣，我这边可以教 PR 和剪映。', time: now - day * 1 },
        { from: 'sys', type: 'sys', text: '以上为平台演示消息' }
      ]
    }
  ];

  storeSet(STORE.LISTINGS, listings);
  storeSet(STORE.MESSAGES, messages);
  storeSet(STORE.REQUESTS, []);
  // 种子用户也写入用户表
  const usersMap = storeGet(STORE.USERS, {});
  Object.values(users).forEach(u => { if (!usersMap[u.phone]) usersMap[u.phone] = u; });
  storeSet(STORE.USERS, usersMap);
  // 缓存 id -> user
  storeSet('skp_seed_users', users);
  storeSet(STORE.SEEDED, true);
}

/* ---------------- 数据查询 ---------------- */

function getListings() { seedData(); return storeGet(STORE.LISTINGS, []); }
function saveListing(l) {
  const list = getListings();
  list.unshift(l);
  storeSet(STORE.LISTINGS, list);
}
function deleteListing(id) {
  const list = getListings().filter(l => l.id !== id);
  storeSet(STORE.LISTINGS, list);
}
function getListingById(id) { return getListings().find(l => l.id === id); }

function getSeedUsers() { return storeGet('skp_seed_users', {}); }
function getUserById(uid) {
  const u = getUser();
  if (u && u.id === uid) return u;
  return getSeedUsers()[uid] || null;
}
function getMyListings() {
  const u = getUser();
  return getListings().filter(l => l.userId === u.id);
}

/* ---------------- 匹配算法（简单可解释版本） ----------------
   规则：
   1. 我想学的分类/关键词 命中 对方"能教"的发布 → 基础匹配
   2. 对方想学的内容 命中 我"能教"的发布 → 双向契合（加权）
   3. 标签、授课方式作为加分项
---------------------------------------------------------------- */

function computeMatches() {
  const me = getUser();
  const all = getListings();
  const myTeach = all.filter(l => l.userId === me.id && l.type === 'teach');
  const myLearn = all.filter(l => l.userId === me.id && l.type === 'learn');

  if (myLearn.length === 0) return { empty: true, list: [] };

  // 我想学的：分类集合 + 关键词集合（标题标签拆分）
  const wantCats = new Set(myLearn.map(l => l.category));
  const wantWords = new Set();
  myLearn.forEach(l => {
    l.tags.forEach(t => wantWords.add(t));
    stripWords(l.title).forEach(w => wantWords.add(w));
  });

  // 我能教的：用于判断双向契合
  const teachCats = new Set(myTeach.map(l => l.category));
  const teachWords = new Set();
  myTeach.forEach(l => { l.tags.forEach(t => teachWords.add(t)); stripWords(l.title).forEach(w => teachWords.add(w)); });

  // 候选：其他人的"能教"发布
  const candidates = all.filter(l => l.userId !== me.id && l.type === 'teach');

  const results = candidates.map(l => {
    let score = 0;
    const reasons = [];

    // 分类命中（50 分）
    if (wantCats.has(l.category)) { score += 50; reasons.push(`你想学的「${l.category}」TA 能教`); }

    // 关键词/标签命中（每个 12 分，上限 30）
    let wordHits = 0;
    const hitWords = [];
    l.tags.forEach(t => { if (wantWords.has(t)) { wordHits++; hitWords.push(t); } });
    stripWords(l.title).forEach(w => { if (wantWords.has(w) && !hitWords.includes(w)) { wordHits++; hitWords.push(w); } });
    wordHits = Math.min(wordHits, 3);
    if (wordHits > 0) { score += wordHits * 10; reasons.push('技能点匹配：' + hitWords.slice(0, 3).join('、')); }

    // 双向契合（+25）：对方想学的正好是我能教的
    const theirLearn = all.filter(x => x.userId === l.userId && x.type === 'learn');
    let mutual = false;
    theirLearn.forEach(tl => {
      if (teachCats.has(tl.category)) mutual = true;
      tl.tags.forEach(t => { if (teachWords.has(t)) mutual = true; });
      stripWords(tl.title).forEach(w => { if (teachWords.has(w)) mutual = true; });
    });
    // 以及对方在"想换技能"里写了我能教的
    if (!mutual && myTeach.length) {
      const myTeachTitles = myTeach.flatMap(t => t.tags.concat(stripWords(t.title)));
      const wanted = (l.wantSkills || []).join(',');
      myTeachTitles.forEach(w => { if (w.length >= 2 && wanted.includes(w)) mutual = true; });
    }
    if (mutual) { score += 25; reasons.push('双向契合：TA 也想学你能教的技能'); }

    // 授课方式兼容（+5）
    const myMethod = myLearn.some(x => x.method === '均可') ? '均可' : (myLearn[0] && myLearn[0].method);
    if (l.method === '均可' || myMethod === '均可' || l.method === myMethod) score += 5;

    return { listing: l, score: Math.min(score, 100), mutual, reasons };
  })
    .filter(r => r.score >= 50)
    .sort((a, b) => b.score - a.score);

  return { empty: results.length === 0, list: results };
}

// 简单中文拆词：按标点/空格切分并保留 2 字以上片段
function stripWords(s) {
  if (!s) return [];
  return s.split(/[\s,，。、/／()（）·-]+/)
    .map(w => w.replace(/^(我想|想学|学习|入门|基础|教你|教学|的|了|与|和)/g, ''))
    .filter(w => w.length >= 2);
}

/* ---------------- 交换请求与消息 ---------------- */

function getRequests() { return storeGet(STORE.REQUESTS, []); }

function sendExchange(listing, note) {
  const me = getUser();
  const requests = getRequests();
  requests.unshift({ id: 'r' + Date.now(), fromUserId: me.id, toUserId: listing.userId, listingId: listing.id, note: note || '', status: 'pending', time: Date.now() });
  storeSet(STORE.REQUESTS, requests);

  // 在消息里生成/追加一条会话
  const convs = storeGet(STORE.MESSAGES, []);
  let conv = convs.find(c => c.userId === listing.userId);
  const msgText = note || `你好！看到你发布的「${listing.title}」，我很感兴趣，想和你交换学习，期待回复～`;
  if (!conv) {
    conv = { id: 'm' + Date.now(), userId: listing.userId, unread: 0, list: [] };
    convs.unshift(conv);
  }
  conv.list.push({ from: me.id, type: 'exchange', listingId: listing.id, text: msgText, time: Date.now() });
  storeSet(STORE.MESSAGES, convs);
}

function getConversations() { return storeGet(STORE.MESSAGES, []); }
function getConversation(userId) { return getConversations().find(c => c.userId === userId); }
function saveConversation(conv) {
  const convs = getConversations();
  const i = convs.findIndex(c => c.userId === conv.userId);
  if (i >= 0) convs[i] = conv; else convs.unshift(conv);
  storeSet(STORE.MESSAGES, convs);
}
function unreadCount() { return getConversations().reduce((s, c) => s + (c.unread || 0), 0); }

/* ---------------- 页面框架渲染（侧边栏 + 顶栏） ---------------- */

const NAV = [
  { group: '技能广场', items: [
    { key: 'home', icon: '🧭', label: '发现技能', href: 'home.html' },
    { key: 'matches', icon: '🤝', label: '智能匹配', href: 'matches.html' },
    { key: 'publish', icon: '📝', label: '发布技能', href: 'publish.html' }
  ]},
  { group: '交流中心', items: [
    { key: 'messages', icon: '💬', label: '我的消息', href: 'messages.html' }
  ]},
  { group: '个人', items: [
    { key: 'profile', icon: '👤', label: '个人中心', href: 'profile.html' }
  ]}
];

const PAGE_TITLES = {
  home: '发现技能',
  matches: '智能匹配',
  publish: '发布技能',
  messages: '我的消息',
  profile: '个人中心'
};

function renderChrome(activeKey) {
  const user = requireAuth();
  if (!user) return;
  seedData();

  const navHtml = NAV.map(g => `
    <div class="nav-group-title">${g.group}</div>
    ${g.items.map(it => `
      <a class="nav-item ${it.key === activeKey ? 'active' : ''}" href="${it.href}">
        <span class="ico">${it.icon}</span><span>${it.label}</span>
        ${it.key === 'messages' && unreadCount() > 0 ? `<span class="nav-badge">${unreadCount()}</span>` : ''}
      </a>`).join('')}
  `).join('');

  document.body.insertAdjacentHTML('afterbegin', `
    <div class="layout">
      <aside class="sidebar">
        <div class="sidebar-brand">
          <span class="brand-mark">技</span>
          <span>技能互换平台</span>
        </div>
        <nav class="side-nav">${navHtml}</nav>
        <div class="sidebar-user">
          <span class="avatar avatar-sm" style="background:${user.avatarColor}">${user.name.slice(0, 1)}</span>
          <div>
            <div class="su-name">${esc(user.name)}</div>
            <div class="su-phone">${maskPhone(user.phone)}</div>
          </div>
          <span class="su-logout" title="退出登录" onclick="logout()">⎋</span>
        </div>
      </aside>
      <div class="main">
        <header class="topbar">
          <div class="topbar-title">${PAGE_TITLES[activeKey] || ''}</div>
          <div class="topbar-search">
            <span style="color:#8b95a5">🔍</span>
            <input id="globalSearch" placeholder="搜索技能、用户…" />
          </div>
          <span class="topbar-icon" title="消息通知" onclick="location.href='messages.html'">🔔${unreadCount() > 0 ? '<span class="dot"></span>' : ''}</span>
        </header>
        <main class="content" id="pageContent"></main>
      </div>
    </div>`);

  // 页面正文从模板容器迁移到 content，并移除模板
  const tpl = document.getElementById('pageTpl');
  const content = document.getElementById('pageContent');
  if (tpl && content) {
    content.innerHTML = tpl.innerHTML;
    tpl.remove();
  }

  // 顶部搜索：回车跳发现页并带关键词
  const gs = document.getElementById('globalSearch');
  if (gs) gs.addEventListener('keydown', e => {
    if (e.key === 'Enter') location.href = 'home.html?q=' + encodeURIComponent(gs.value.trim());
  });
}

/* ---------------- 通用 UI 工具 ---------------- */

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function avatarHtml(user, sizeCls = '') {
  if (!user) return '';
  return `<span class="avatar ${sizeCls}" style="background:${user.avatarColor || '#5b6b8c'}">${esc(user.name.slice(0, 1))}</span>`;
}

function timeAgo(ts) {
  const d = Date.now() - ts;
  if (d < 60000) return '刚刚';
  if (d < 3600000) return Math.floor(d / 60000) + ' 分钟前';
  if (d < 86400000) return Math.floor(d / 3600000) + ' 小时前';
  if (d < 86400000 * 30) return Math.floor(d / 86400000) + ' 天前';
  const dt = new Date(ts);
  return `${dt.getMonth() + 1}月${dt.getDate()}日`;
}

function clockTime(ts) {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

let toastTimer = null;
function toast(msg, type = '') {
  let wrap = document.querySelector('.toast-wrap');
  if (!wrap) {
    wrap = document.createElement('div');
    wrap.className = 'toast-wrap';
    document.body.appendChild(wrap);
  }
  const el = document.createElement('div');
  el.className = 'toast ' + type;
  el.innerHTML = (type === 'success' ? '✅ ' : type === 'error' ? '⚠️ ' : '') + esc(msg);
  wrap.appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity .3s'; setTimeout(() => el.remove(), 300); }, 2200);
}

/* ---------------- 技能详情弹窗 + 发起交换 ---------------- */

function openListing(listingId) {
  const l = getListingById(listingId);
  if (!l) return;
  const u = getUserById(l.userId);
  const me = getUser();
  const isMine = u && u.id === me.id;
  const typeBadge = l.type === 'teach'
    ? '<span class="badge badge-teach">能教</span>'
    : '<span class="badge badge-learn">想学</span>';

  const wantBlock = (l.wantSkills && l.wantSkills.length)
    ? `<div class="form-item"><div class="form-label">期望交换的技能</div><div>${l.wantSkills.map(w => `<span class="tag">${esc(w)}</span>`).join('')}</div></div>` : '';

  document.body.insertAdjacentHTML('beforeend', `
    <div class="modal-mask" id="listingModal" onclick="if(event.target===this)closeListing()">
      <div class="modal">
        <div class="modal-head"><h3>技能详情</h3><span class="modal-close" onclick="closeListing()">✕</span></div>
        <div class="modal-body">
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:18px">
            ${avatarHtml(u, 'avatar-lg')}
            <div>
              <div style="font-weight:600;font-size:15px">${esc(u ? u.name : '未知用户')} ${typeBadge}</div>
              <div style="font-size:12.5px;color:var(--text-3);margin-top:2px">
                ${esc(l.city || '线上')} · ${esc(l.method)} · 发布于${timeAgo(l.createdAt)}
              </div>
            </div>
          </div>
          <div style="font-size:17px;font-weight:700;margin-bottom:6px">${esc(l.title)}</div>
          <div style="margin-bottom:16px">
            <span class="badge badge-gray">${esc(l.category)}</span>
            <span class="badge badge-gray">${esc(l.level)}</span>
            ${l.tags.map(t => `<span class="tag">${esc(t)}</span>`).join('')}
          </div>
          ${wantBlock}
          <div class="form-item" style="margin-bottom:0">
            <div class="form-label">详细描述</div>
            <div style="font-size:13.5px;color:var(--text-2);line-height:1.8">${esc(l.desc)}</div>
          </div>
          ${u && u.bio ? `<div style="margin-top:16px;padding:11px 14px;background:#f8fafc;border-radius:6px;font-size:12.5px;color:var(--text-2)">💡 ${esc(u.bio)}</div>` : ''}
        </div>
        <div class="modal-foot">
          <button class="btn btn-outline" onclick="closeListing()">关闭</button>
          ${isMine
            ? '<button class="btn btn-primary" disabled style="opacity:.5">这是你发布的技能</button>'
            : `<button class="btn btn-primary" onclick="showExchangeForm('${l.id}')">🤝 发起交换</button>`}
        </div>
      </div>
    </div>`);
}

function closeListing() {
  const m = document.getElementById('listingModal');
  if (m) m.remove();
}

function showExchangeForm(listingId) {
  const l = getListingById(listingId);
  if (!l) return;
  const myTeach = getMyListings().filter(x => x.type === 'teach');
  closeListing();

  const mySkillsHint = myTeach.length
    ? `你已发布可教授技能：${myTeach.map(t => `「${esc(t.title)}」`).join('、')}，对方可以在你的主页看到。`
    : '你还没有发布"我能教的"技能，建议先去发布，能大幅提高交换成功率。';

  document.body.insertAdjacentHTML('beforeend', `
    <div class="modal-mask" id="exchangeModal" onclick="if(event.target===this)closeExchange()">
      <div class="modal">
        <div class="modal-head"><h3>发起技能交换</h3><span class="modal-close" onclick="closeExchange()">✕</span></div>
        <div class="modal-body">
          <div style="padding:11px 14px;background:var(--primary-lighter);border-radius:6px;font-size:12.5px;color:var(--info);margin-bottom:18px;line-height:1.7">
            📌 ${mySkillsHint}
          </div>
          <div class="form-item">
            <label class="form-label">交换对象</label>
            <div style="font-size:13.5px">${esc(getUserById(l.userId).name)} 的「${esc(l.title)}」</div>
          </div>
          <div class="form-item" style="margin-bottom:0">
            <label class="form-label">附言<span class="req">*</span></label>
            <textarea class="textarea" id="exchangeNote" placeholder="简单介绍你能教的技能、可交换的时间和方式…">你好！看到你发布的「${esc(l.title)}」，我很感兴趣。我也有可以分享的技能，期待能和你互相交流学习～</textarea>
          </div>
        </div>
        <div class="modal-foot">
          <button class="btn btn-outline" onclick="closeExchange()">取消</button>
          <button class="btn btn-primary" onclick="confirmExchange('${l.id}')">发送交换请求</button>
        </div>
      </div>
    </div>`);
}

function closeExchange() {
  const m = document.getElementById('exchangeModal');
  if (m) m.remove();
}

function confirmExchange(listingId) {
  const note = document.getElementById('exchangeNote').value.trim();
  if (note.length < 5) { toast('请填写至少 5 个字的附言', 'error'); return; }
  const l = getListingById(listingId);
  sendExchange(l, note);
  closeExchange();
  toast('交换请求已发送！可在「我的消息」中查看', 'success');
}
