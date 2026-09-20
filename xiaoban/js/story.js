/* ============================================================
   小伴同学 · 专属故事页逻辑
   说明：基于当日对话情绪，生成以孩子为主角的小故事；
        可用语音合成朗读；完播计入使用统计。
   ============================================================ */

let _role = null;
let _currentStory = null;

function initStory() {
  initPage();
  _role = getCurrentRole();

  // 顶部角色信息
  document.getElementById('roleEmoji').textContent = _role.emoji;
  document.getElementById('roleName').textContent = _role.name;

  // 生成或复用今日故事
  buildTodayStory();
  renderStory();

  // 听故事
  document.getElementById('listenBtn').addEventListener('click', toggleListen);
}

/* 提取当日情绪事件与主情绪（只看与当前角色的对话） */
function extractTodayEvent() {
  const conv = getConversations(_role.id);
  const todayStart = new Date().setHours(0, 0, 0, 0);
  const childMsgs = conv.filter(c => c.ts >= todayStart && c.role === 'child' && !c.isSensitive);

  if (!childMsgs.length) {
    return { emotion: 'calm', event: '看天上的云' };
  }

  // 取情绪最强的一条孩子消息作为事件
  let best = childMsgs[0];
  let bestScore = 0;
  childMsgs.forEach(m => {
    const emo = detectEmotion(m.text);
    const score = Object.values(emo.scores).reduce((a, b) => a + b, 0);
    if (score > bestScore) { bestScore = score; best = m; }
  });

  const emo = detectEmotion(best.text);
  // 事件短语：截取孩子原话前 12 字，去掉标点
  const event = best.text.replace(/[，。！？,.!?]/g, '').slice(0, 12);
  return { emotion: emo.primary, event: event || '今天发生的一件小事' };
}

/* 生成今日故事（若已生成则复用最近一条） */
function buildTodayStory() {
  const child = getChild();
  const { emotion, event } = extractTodayEvent();

  // 复用今天与当前角色的最后一条故事，避免重复生成（各角色各自独立）
  const todayStart = new Date().setHours(0, 0, 0, 0);
  const existing = getStories(_role.id).filter(s => s.ts >= todayStart).pop();
  if (existing && existing.emotion === emotion) {
    _currentStory = existing;
    return;
  }

  const gen = generateStory(child.nickname, emotion, event, _role);
  _currentStory = {
    id: genId('s'),
    title: gen.title,
    content: gen.content,
    emotion: emotion,
    basedOnConvId: '',
    completed: false,
    ts: Date.now()
  };
  addStory(_currentStory);

  // 故事总数 +1
  const u = getUsage();
  u.storiesTotal = (u.storiesTotal || 0) + 1;
  saveUsage(u);
}

/* 渲染故事卡片 */
function renderStory() {
  const card = document.getElementById('storyCard');
  if (!_currentStory) {
    card.innerHTML = '<div class="center faint" style="padding:40px 0">还没有故事，先去聊几句吧～</div>';
    return;
  }
  const emoLabel = EMOTION_LABELS[_currentStory.emotion] || _currentStory.emotion;
  card.innerHTML = `
    <h2>${_currentStory.title}</h2>
    <div class="meta"><span class="tag">主角：${getChild().nickname}</span> <span class="tag" style="margin-left:6px">${emoLabel}</span></div>
    <div class="story-content">${escapeHtml(_currentStory.content)}</div>
  `;
}

/* 朗读故事（角色口吻，语速放慢） */
let _listening = false;
function toggleListen() {
  const btn = document.getElementById('listenBtn');
  if (_listening) {
    stopSpeak();
    _listening = false;
    btn.innerHTML = '<span>🔊</span> 听故事';
    return;
  }
  if (!_currentStory) return;
  _listening = true;
  btn.innerHTML = '<span>⏸️</span> 暂停';

  // 朗读时保留角色音色（voiceMatch/pitch），只把整体语速放慢
  const role = Object.assign({}, _role, {
    voice: Object.assign({}, _role.voice, { rate: 0.78 })
  });
  const u = speak(_currentStory.content, role);
  if (u) {
    u.onend = () => {
      _listening = false;
      btn.innerHTML = '<span>🔊</span> 再听一遍';
      markStoryCompleted();
    };
    u.onerror = () => {
      _listening = false;
      btn.innerHTML = '<span>🔊</span> 听故事';
    };
  } else {
    // 浏览器不支持语音合成，直接标记完播
    _listening = false;
    btn.innerHTML = '<span>🔊</span> 再听一遍';
    markStoryCompleted();
    toast('浏览器不支持朗读，已为你准备好故事文字～');
  }
}

/* 标记故事完播 */
function markStoryCompleted() {
  if (!_currentStory || _currentStory.completed) return;
  _currentStory.completed = true;
  // 更新存储
  const list = getStories();
  const idx = list.findIndex(s => s.id === _currentStory.id);
  if (idx >= 0) { list[idx] = _currentStory; storeSet(STORE.STORIES, list); }
  // 使用统计
  const u = getUsage();
  u.storiesCompleted = (u.storiesCompleted || 0) + 1;
  saveUsage(u);
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

let _toastTimer = null;
function toast(msg) {
  let el = document.getElementById('toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast';
    el.style.cssText = 'position:fixed;left:50%;bottom:80px;transform:translateX(-50%);background:rgba(74,58,46,0.92);color:#fff;padding:10px 18px;border-radius:14px;font-size:14px;z-index:60;max-width:80vw;text-align:center;';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.style.display = 'block';
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => { el.style.display = 'none'; }, 2600);
}

initStory();
