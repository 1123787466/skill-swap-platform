/* 消息页逻辑 */
(function () {
  const me = requireAuth();
  let activeId = null;

  function lastMsg(conv) {
    const list = conv.list || [];
    for (let i = list.length - 1; i >= 0; i--) {
      if (list[i].type !== 'sys') return list[i];
    }
    return list[list.length - 1] || null;
  }

  function renderList() {
    const convs = getConversations();
    const box = document.getElementById('convList');

    if (!convs.length) {
      box.innerHTML = `
        <div class="empty-state" style="padding:40px 16px">
          <div class="es-ico">💬</div>
          <div class="es-title">还没有消息</div>
          <div class="es-desc">在技能广场对感兴趣的伙伴<br>点击「发起交换」即可开始沟通</div>
          <a class="btn btn-primary btn-sm" href="home.html">去发现技能</a>
        </div>`;
      return;
    }

    box.innerHTML = convs.map(c => {
      const u = getUserById(c.userId);
      const last = lastMsg(c);
      let preview = '';
      if (last) {
        if (last.type === 'exchange') preview = '[交换请求] ' + last.text;
        else preview = (last.from === me.id ? '我：' : '') + last.text;
      }
      return `
        <div class="conv-item ${c.userId === activeId ? 'active' : ''}" onclick="window.__selectConv('${c.userId}')">
          ${avatarHtml(u)}
          <div style="flex:1;min-width:0">
            <div class="ci-name">
              <span>${esc(u ? u.name : '未知用户')}</span>
              <span class="ci-time">${last && last.time ? timeAgo(last.time) : ''}</span>
            </div>
            <div class="ci-preview">${esc(preview)}</div>
          </div>
          ${c.unread ? `<span class="ci-unread">${c.unread}</span>` : ''}
        </div>`;
    }).join('');
  }

  function renderChat() {
    const panel = document.getElementById('chatPanel');

    if (!activeId) {
      panel.innerHTML = `
        <div class="empty-state" style="margin:auto">
          <div class="es-ico">👈</div>
          <div class="es-title">选择一个会话开始聊天</div>
          <div class="es-desc">交换请求发送后，也会在这里生成会话</div>
        </div>`;
      return;
    }

    const conv = getConversation(activeId);
    const u = getUserById(activeId);
    if (!conv) { activeId = null; renderChat(); return; }

    panel.innerHTML = `
      <div class="chat-head">
        ${avatarHtml(u, 'avatar-sm')}
        <div>
          <div class="ch-name">${esc(u ? u.name : '')}</div>
          <div class="ch-status">● 在线</div>
        </div>
      </div>
      <div class="chat-body" id="chatBody">
        ${conv.list.map(m => renderMessage(m, u)).join('')}
      </div>
      <div class="chat-input">
        <input type="text" id="chatText" placeholder="输入消息，回车发送…" maxlength="200">
        <button class="btn btn-primary btn-sm" id="chatSend">发送</button>
      </div>`;

    const body = document.getElementById('chatBody');
    body.scrollTop = body.scrollHeight;

    const input = document.getElementById('chatText');
    const send = () => {
      const text = input.value.trim();
      if (!text) return;
      conv.list.push({ from: me.id, type: 'text', text, time: Date.now() });
      input.value = '';
      saveConversation(conv);
      renderList(); renderChat();
      // 演示用：模拟对方回复
      setTimeout(() => mockReply(activeId), 1200);
    };
    document.getElementById('chatSend').onclick = send;
    input.addEventListener('keydown', e => { if (e.key === 'Enter') send(); });
    input.focus();
  }

  function renderMessage(m, other) {
    if (m.type === 'sys') {
      return `<div class="sys-bubble">${esc(m.text)}</div>`;
    }
    const mine = m.from === me.id;
    const sender = mine ? getUser() : other;
    const time = m.time ? `<div class="bubble-time">${clockTime(m.time)}</div>` : '';

    if (m.type === 'exchange') {
      const l = getListingById(m.listingId);
      return `
        <div class="bubble-row ${mine ? 'me' : ''}">
          ${avatarHtml(sender, 'avatar-sm')}
          <div>
            <div class="exchange-card-msg">
              <div class="ecm-title">🤝 技能交换请求 ${l ? '· ' + esc(l.category) : ''}</div>
              ${l ? `<div style="font-size:13px;margin-bottom:6px">关于「${esc(l.title)}」</div>` : ''}
              <div class="ecm-desc">${esc(m.text)}</div>
              ${l ? `<button class="btn btn-sm btn-outline" onclick="openListing('${l.id}')">查看技能详情</button>` : ''}
            </div>
            ${time}
          </div>
        </div>`;
    }

    return `
      <div class="bubble-row ${mine ? 'me' : ''}">
        ${avatarHtml(sender, 'avatar-sm')}
        <div class="bubble">${esc(m.text)}${time}</div>
      </div>`;
  }

  // 演示：模拟对方自动回复一条消息
  function mockReply(uid) {
    const conv = getConversation(uid);
    if (!conv) return;
    const replies = ['收到！我看一下时间，稍后回复你～', '好的，听起来不错！我们可以先约一次线上聊聊。', '没问题，我周末有空，你呢？', '可以的，具体想怎么交换我们可以细聊 😊'];
    conv.list.push({ from: uid, type: 'text', text: replies[Math.floor(Math.random() * replies.length)], time: Date.now() });
    // 当前正在看该会话时不增加未读
    conv.unread = activeId === uid ? 0 : (conv.unread || 0) + 1;
    saveConversation(conv);
    if (activeId === uid) { renderList(); renderChat(); } else { renderList(); }
  }

  window.__selectConv = function (uid) {
    activeId = uid;
    const conv = getConversation(uid);
    if (conv && conv.unread) { conv.unread = 0; saveConversation(conv); }
    renderList();
    renderChat();
  };

  // 默认打开第一个会话
  const first = getConversations()[0];
  if (first) window.__selectConv(first.userId); else { renderList(); renderChat(); }
})();
