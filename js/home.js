/* 发现页逻辑 */
(function () {
  const me = requireAuth();

  // 欢迎语 & 顶部统计
  document.getElementById('welcomeText').textContent = `你好，${me.name}，来看看今天有哪些新技能 👋`;
  const all = getListings();
  document.getElementById('statTeach').textContent = all.filter(l => l.type === 'teach').length;
  document.getElementById('statLearn').textContent = all.filter(l => l.type === 'learn').length;
  const matches = computeMatches();
  document.getElementById('statMatch').textContent = matches.empty ? 0 : matches.list.length;
  document.getElementById('statUser').textContent = new Set(all.map(l => l.userId)).size;

  // 筛选状态（支持 URL 带 ?q= / ?type= / ?cat=）
  const params = new URLSearchParams(location.search);
  const state = {
    type: params.get('type') || 'all',
    cat: params.get('cat') || '全部',
    method: 'all',
    q: params.get('q') || ''
  };

  // 渲染分类筛选
  const catBox = document.getElementById('catFilter');
  ['全部'].concat(CATEGORIES).forEach(c => {
    const el = document.createElement('span');
    el.className = 'check-tag' + (state.cat === c ? ' active' : '');
    el.textContent = c;
    el.onclick = () => { state.cat = c; syncChips(); render(); };
    catBox.appendChild(el);
  });

  function syncChips() {
    document.querySelectorAll('#typeFilter .check-tag').forEach(t =>
      t.classList.toggle('active', t.dataset.type === state.type));
    document.querySelectorAll('#catFilter .check-tag').forEach(t =>
      t.classList.toggle('active', t.textContent === state.cat));
    document.querySelectorAll('#methodFilter .check-tag').forEach(t =>
      t.classList.toggle('active', t.dataset.method === state.method));
  }
  syncChips();

  document.getElementById('typeFilter').addEventListener('click', e => {
    const t = e.target.closest('.check-tag');
    if (!t) return;
    state.type = t.dataset.type;
    syncChips(); render();
  });
  document.getElementById('methodFilter').addEventListener('click', e => {
    const t = e.target.closest('.check-tag');
    if (!t) return;
    state.method = t.dataset.method;
    syncChips(); render();
  });

  const searchInput = document.getElementById('searchInput');
  searchInput.value = state.q;
  let searchTimer = null;
  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => { state.q = searchInput.value.trim(); render(); }, 200);
  });

  function matchMethod(l) {
    if (state.method === 'all') return true;
    return l.method === state.method || l.method === '均可';
  }

  function matchQuery(l, u) {
    if (!state.q) return true;
    const q = state.q.toLowerCase();
    const hay = [l.title, l.category, l.level, (l.tags || []).join(','), (l.wantSkills || []).join(','), u ? u.name : ''].join(' ').toLowerCase();
    return hay.includes(q);
  }

  function render() {
    const list = getListings().filter(l => {
      if (state.type !== 'all' && l.type !== state.type) return false;
      if (state.cat !== '全部' && l.category !== state.cat) return false;
      if (!matchMethod(l)) return false;
      if (!matchQuery(l, getUserById(l.userId))) return false;
      return true;
    });

    document.getElementById('resultCount').textContent = `共 ${list.length} 条结果`;
    const grid = document.getElementById('skillGrid');
    const empty = document.getElementById('emptyBox');

    if (!list.length) {
      grid.innerHTML = '';
      empty.innerHTML = `
        <div class="card empty-state">
          <div class="es-ico">🔍</div>
          <div class="es-title">没有找到符合条件的技能</div>
          <div class="es-desc">换个关键词或筛选条件试试，也可以自己发布第一条技能</div>
          <a class="btn btn-primary" href="publish.html">去发布技能</a>
        </div>`;
      return;
    }
    empty.innerHTML = '';

    grid.innerHTML = list.map(l => {
      const u = getUserById(l.userId);
      const isTeach = l.type === 'teach';
      const typeBadge = isTeach
        ? '<span class="badge badge-teach">能教</span>'
        : '<span class="badge badge-learn">想学</span>';
      const wantBlock = (l.wantSkills && l.wantSkills.length)
        ? `<div class="sc-want"><span class="want-label">想换</span><span>${l.wantSkills.map(esc).join('、')}</span></div>`
        : '';
      const isMine = u && u.id === me.id;
      return `
        <div class="skill-card" onclick="openListing('${l.id}')">
          <div class="sc-user">
            ${avatarHtml(u)}
            <div style="min-width:0">
              <div class="sc-name">${esc(u ? u.name : '未知')}</div>
              <div class="sc-meta">${esc(l.city || (l.method === '线下' ? '线下' : '线上'))} · ${timeAgo(l.createdAt)}</div>
            </div>
            <span class="sc-type">${typeBadge}</span>
          </div>
          <div class="sc-title">${esc(l.title)}</div>
          <div class="sc-desc">${esc(l.desc)}</div>
          ${wantBlock}
          <div class="sc-foot">
            <div class="sc-tags">
              <span class="tag">${esc(l.category)}</span>
              ${l.tags.slice(0, 2).map(t => `<span class="tag">${esc(t)}</span>`).join('')}
            </div>
            ${isMine
              ? '<span class="badge badge-gray">我发布的</span>'
              : `<button class="btn btn-sm ${isTeach ? 'btn-primary' : 'btn-outline'}" onclick="event.stopPropagation();showExchangeForm('${l.id}')">
                  ${isTeach ? '🤝 发起交换' : '我可以教'}
                </button>`}
          </div>
        </div>`;
    }).join('');
  }

  render();
})();
