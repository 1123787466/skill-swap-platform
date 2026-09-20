/* ============================================================
   小伴同学 · 对话页逻辑
   说明：按住说话（webkitSpeechRecognition）+ 文字兜底 +
        Mock 回复渲染 + 情绪落库 + 安全兜底提示 + 故事引导。
   ============================================================ */

let _role = null;
let _recognition = null;
let _recording = false;
let _childRounds = 0;   // 本次会话孩子发言数

/* ---------- 初始化 ---------- */
function initChat() {
  initPage();
  _role = getCurrentRole();

  // 顶部角色信息
  document.getElementById('roleEmoji').textContent = _role.emoji;
  document.getElementById('roleName').textContent = _role.name;

  // 故事入口文案角色化
  const hint = document.getElementById('storyHint');
  if (hint && _role.storyCta) hint.firstElementChild.textContent = _role.storyCta;

  // 该角色第一次聊天：插入专属开场白（只入一次，归属当前角色）
  if (!getConversations(_role.id).length) {
    addConversation({
      id: genId('c'), role: 'ai', text: _role.greeting,
      emotion: '', isSensitive: false, latencyMs: 0, ts: Date.now()
    });
  }

  // 渲染该角色的已有对话（今天）
  renderHistory();

  // 按住说话
  setupHoldButton();

  // 文字输入
  setupTextInput();

  // 故事提示点击 → 跳转
  document.getElementById('storyHint').addEventListener('click', () => {
    location.href = 'story.html';
  });

  // 时长锁（家长设的 10/15 分钟）
  setupTimeLock();

  // 语音识别支持检测
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    // 不支持语音，默认展示文字输入
    document.getElementById('textWrap').classList.add('show');
    document.getElementById('textToggle').textContent = '⌨️ 该浏览器不支持语音，请打字';
  } else {
    _recognition = new SR();
    _recognition.lang = 'zh-CN';
    _recognition.continuous = false;
    _recognition.interimResults = false;
    _recognition.onresult = (e) => {
      const text = e.results[0][0].transcript;
      if (text) sendMessage(text);
    };
    _recognition.onerror = () => {
      // 失败时弹出文字输入
      document.getElementById('textWrap').classList.add('show');
      toast('没听清，可以打字告诉我呀～');
    };
    _recognition.onend = () => {
      setRecording(false);
    };
  }
}

/* ---------- 渲染历史对话（只渲染当前角色） ---------- */
function renderHistory() {
  const conv = getConversations(_role.id);
  const todayStart = new Date().setHours(0, 0, 0, 0);
  const today = conv.filter(c => c.ts >= todayStart);
  const bubbles = document.getElementById('bubbles');
  bubbles.innerHTML = '';
  today.forEach(c => appendBubble(c.role, c.text, c.emotion, c.isSensitive));
  scrollBottom();
}

/* ---------- 追加气泡 ---------- */
function appendBubble(role, text, emotion, isSensitive) {
  const bubbles = document.getElementById('bubbles');
  const row = document.createElement('div');
  row.className = 'bubble-row ' + (role === 'child' ? 'child' : 'ai');
  if (role === 'ai') {
    row.innerHTML = `<div class="ava">${_role.emoji}</div>`;
  }
  const bubble = document.createElement('div');
  bubble.className = 'bubble';
  bubble.textContent = text;
  if (role === 'ai' && emotion && !isSensitive) {
    const emo = document.createElement('div');
    emo.className = 'emo';
    emo.textContent = '心情：' + (EMOTION_LABELS[emotion] || emotion);
    bubble.appendChild(emo);
  }
  row.appendChild(bubble);
  bubbles.appendChild(row);
}

/* ---------- 打字中指示 ---------- */
function showTyping() {
  const bubbles = document.getElementById('bubbles');
  const row = document.createElement('div');
  row.className = 'bubble-row ai';
  row.id = 'typingRow';
  row.innerHTML = `<div class="ava">${_role.emoji}</div><div class="bubble"><div class="typing"><span></span><span></span><span></span></div></div>`;
  bubbles.appendChild(row);
  scrollBottom();
}
function removeTyping() {
  const t = document.getElementById('typingRow');
  if (t) t.remove();
}

/* ---------- 录音状态切换 ---------- */
function setRecording(on) {
  _recording = on;
  const btn = document.getElementById('holdBtn');
  if (on) {
    btn.classList.add('recording');
    btn.querySelector('.ico').textContent = '🔴';
    btn.querySelector('span:last-child').textContent = '松开发送';
  } else {
    btn.classList.remove('recording');
    btn.querySelector('.ico').textContent = '🎤';
    btn.querySelector('span:last-child').textContent = '按住说话';
  }
}

/* ---------- 按住说话 ---------- */
function setupHoldButton() {
  const btn = document.getElementById('holdBtn');
  let started = false;

  const start = (e) => {
    if (!_recognition) return;
    e.preventDefault();
    try {
      _recognition.start();
      started = true;
      setRecording(true);
    } catch (err) {
      // 可能重复 start，忽略
    }
  };
  const stop = () => {
    if (!started) return;
    started = false;
    try { _recognition.stop(); } catch (e) {}
    setRecording(false);
  };

  // 触摸 + 鼠标统一用 pointer 事件
  btn.addEventListener('pointerdown', start);
  btn.addEventListener('pointerup', stop);
  btn.addEventListener('pointerleave', stop);
  btn.addEventListener('pointercancel', stop);
}

/* ---------- 文字输入 ---------- */
function setupTextInput() {
  const toggle = document.getElementById('textToggle');
  const wrap = document.getElementById('textWrap');
  const input = document.getElementById('textInput');
  const send = document.getElementById('sendBtn');

  toggle.addEventListener('click', () => {
    wrap.classList.toggle('show');
    if (wrap.classList.contains('show')) { input.focus(); }
  });
  const doSend = () => {
    const v = input.value.trim();
    if (v) { sendMessage(v); input.value = ''; }
  };
  send.addEventListener('click', doSend);
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') doSend(); });
}

/* ---------- 发送消息主流程 ---------- */
function sendMessage(text) {
  if (!text || !text.trim()) return;
  text = text.trim();

  // 孩子气泡
  appendBubble('child', text);
  addConversation({
    id: genId('c'), role: 'child', text: text,
    emotion: '', isSensitive: false, latencyMs: 0, ts: Date.now()
  });
  _childRounds++;
  scrollBottom();

  // 打字中
  showTyping();

  // AI 回复（Mock 或真实 LLM，均为异步；模拟一点延迟让 typing 可见）
  setTimeout(async () => {
    removeTyping();
    let res;
    try {
      res = await respond(text, _role);
    } catch (e) {
      // 兜底：保证演示不崩
      res = { reply: '嗯嗯，我在听着呢。', emotion: 'calm', isSensitive: false, latencyMs: 0 };
    }

    // AI 气泡
    appendBubble('ai', res.reply, res.emotion, res.isSensitive);
    addConversation({
      id: genId('c'), role: 'ai', text: res.reply,
      emotion: res.emotion, isSensitive: res.isSensitive,
      trigger: res.trigger || '', latencyMs: res.latencyMs, ts: Date.now()
    });

    // 安全兜底提示
    if (res.isSensitive) {
      toast('🛡️ 已引导孩子找家长，可在家长端查看安全记录');
    }

    // 更新使用统计
    updateUsageAfterRound(res.latencyMs);

    // 达到 2 轮以上，显示故事提示
    if (_childRounds >= 2) {
      document.getElementById('storyHint').style.display = 'flex';
    }

    // 朗读 AI 回复（可选，轻量；不阻塞）
    try { speak(res.reply, _role); } catch (e) {}

    scrollBottom();
  }, 350 + Math.random() * 250);
}

/* ---------- 更新使用统计 ---------- */
function updateUsageAfterRound(latencyMs) {
  const u = getUsage();
  u.totalRounds += 1;
  // 平均时延（移动平均近似）
  u.avgLatencyMs = u.avgLatencyMs
    ? Math.round((u.avgLatencyMs + latencyMs) / 2)
    : latencyMs;
  // 累计时长（粗估每轮约 90 秒）
  u.totalSeconds += 90;
  // 成本估算：Mock 单价 0.02 元/轮
  u.estimatedCostYuan = +(u.totalRounds * 0.02).toFixed(3);
  saveUsage(u);
}

/* ---------- 时长锁：倒计时 + 到点温柔结束 ---------- */
let _timeLockTimer = null;
let _timeUp = false;
function setupTimeLock() {
  // 每次进入对话页开启新会话（重置时长）
  let sess = getSession();
  const settings = getSettings();
  // 若无会话或时长设置变化，重新开始
  if (!sess || sess.timeLimitMin !== settings.timeLimitMin) {
    sess = startSession();
  }
  const totalMs = sess.timeLimitMin * 60 * 1000;
  const endAt = sess.startedAt + totalMs;

  const timerEl = document.getElementById('timer');
  const overlay = document.getElementById('endOverlay');

  function tick() {
    const remain = endAt - Date.now();
    if (remain <= 0) {
      timerEl.textContent = '剩余 00:00';
      timerEl.classList.add('warn');
      if (!_timeUp) {
        _timeUp = true;
        stopSpeak();
        overlay.classList.add('show');
        endSession();
        clearInterval(_timeLockTimer);
      }
      return;
    }
    const m = Math.floor(remain / 60000);
    const s = Math.floor((remain % 60000) / 1000);
    timerEl.textContent = '剩余 ' + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
    // 不足 1 分钟变红提醒
    if (remain < 60000) timerEl.classList.add('warn');
  }
  tick();
  _timeLockTimer = setInterval(tick, 1000);
}

/* ---------- 工具：滚动到底 / 轻提示 ---------- */
function scrollBottom() {
  const body = document.querySelector('.chat-body');
  if (body) body.scrollTop = body.scrollHeight;
}

let _toastTimer = null;
function toast(msg) {
  let el = document.getElementById('toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast';
    el.style.cssText = 'position:fixed;left:50%;bottom:140px;transform:translateX(-50%);background:rgba(74,58,46,0.92);color:#fff;padding:10px 18px;border-radius:14px;font-size:14px;z-index:60;max-width:80vw;text-align:center;';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.style.display = 'block';
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => { el.style.display = 'none'; }, 2600);
}

/* 启动 */
initChat();
