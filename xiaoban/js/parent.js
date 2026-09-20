/* ============================================================
   小伴同学 · 家长仪表盘逻辑
   说明：聚合当日对话/情绪/安全/使用统计，渲染卡片式数据。
   ============================================================ */

function initParent() {
  initPage();
  const report = buildParentReport();

  renderEmotions(report);
  renderSummary(report);
  renderSuggestions(report);
  renderSafety(report);
  renderUsage(report);
}

/* ---------- 今日情绪关键词 ---------- */
function renderEmotions(report) {
  const emos = report.emoLog.emotions || { happy: 0, angry: 0, scared: 0, sad: 0, calm: 0 };
  const order = ['happy', 'sad', 'angry', 'scared', 'calm'];
  const colors = { happy: '#e8a13f', sad: '#6a6bd8', angry: '#e5605b', scared: '#3fae6b', calm: '#9aa0b0' };
  const max = Math.max(1, ...order.map(k => emos[k] || 0));

  const html = order.map(k => {
    const cnt = emos[k] || 0;
    const pct = Math.round((cnt / max) * 100);
    return `
      <div class="emo-bar-row">
        <div class="lbl">${EMOTION_LABELS[k]}</div>
        <div class="track"><div class="fill" style="width:${pct}%;background:${colors[k]}"></div></div>
        <div class="cnt">${cnt}</div>
      </div>`;
  }).join('');

  const keywords = (report.emoLog.keywords || []).join('、') || '暂无';
  document.getElementById('emoBox').innerHTML = html + `<div class="muted mt-8" style="font-size:13px">关键词：${escapeHtml(keywords)}</div>`;
}

/* ---------- 对话摘要 ---------- */
function renderSummary(report) {
  const el = document.getElementById('summaryBox');
  el.innerHTML = `<div style="font-size:15px;line-height:1.7">${escapeHtml(report.summary)}</div>` +
    `<div class="muted mt-8" style="font-size:13px">今日对话轮数：${report.childRounds} 轮</div>`;
}

/* ---------- 建议话题 ---------- */
function renderSuggestions(report) {
  const el = document.getElementById('suggestBox');
  el.innerHTML = report.suggestions.map((s, i) =>
    `<div class="suggest-item">${i + 1}. ${escapeHtml(s)}</div>`
  ).join('');
}

/* ---------- 安全记录 ---------- */
function renderSafety(report) {
  const el = document.getElementById('safetyBox');
  const list = report.safety || [];
  if (!list.length) {
    el.innerHTML = `<div class="muted center" style="padding:12px 0">今天很棒，没有敏感记录 ✅</div>`;
    return;
  }
  el.innerHTML = list.map(s => `
    <div class="safety-item${s.resolved ? ' resolved' : ''}" data-id="${s.id}">
      <div class="dot">${s.resolved ? '✅' : '⚠️'}</div>
      <div class="body">
        <div class="t">${escapeHtml(s.text)}</div>
        <div class="m">${escapeHtml(s.trigger || '敏感词')} · ${fmtTime(s.ts)} ${s.resolved ? '· 已处理' : '· 待处理'}</div>
      </div>
      <div class="actions">
        ${s.resolved ? '' : `<button data-act="resolve">标记已处理</button>`}
        <button data-act="delete">删除</button>
      </div>
    </div>
  `).join('');

  // 绑定动作
  el.querySelectorAll('.safety-item').forEach(item => {
    const id = item.getAttribute('data-id');
    item.querySelectorAll('button').forEach(b => {
      b.addEventListener('click', () => {
        const act = b.getAttribute('data-act');
        if (act === 'resolve') markSafetyResolved(id);
        if (act === 'delete') deleteSafety(id);
      });
    });
  });
}

function markSafetyResolved(id) {
  const list = getSafetyLog();
  const it = list.find(s => s.id === id);
  if (it) { it.resolved = true; storeSet(STORE.SAFETY_LOG, list); }
  initParent();
}
function deleteSafety(id) {
  const list = getSafetyLog().filter(s => s.id !== id);
  storeSet(STORE.SAFETY_LOG, list);
  initParent();
}

/* ---------- 使用数据 ---------- */
function renderUsage(report) {
  const u = report.usage || {};
  const fmtDur = (sec) => {
    const m = Math.floor(sec / 60), s = sec % 60;
    return m + '分' + (s ? s + '秒' : '');
  };
  document.getElementById('usageBox').innerHTML = `
    <div class="stat"><div class="num">${u.totalRounds || 0}</div><div class="lbl">对话轮数</div></div>
    <div class="stat"><div class="num">${fmtDur(u.totalSeconds || 0)}</div><div class="lbl">使用时长</div></div>
    <div class="stat"><div class="num">${u.storiesCompleted || 0}/${u.storiesTotal || 0}</div><div class="lbl">故事完播</div></div>
    <div class="stat"><div class="num">${u.avgLatencyMs || 0}ms</div><div class="lbl">平均时延</div></div>
    <div class="stat" style="grid-column:1/-1"><div class="num">¥${(u.estimatedCostYuan || 0).toFixed(3)}</div><div class="lbl">单次成本估算（Mock）</div></div>
  `;
}

function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

initParent();
