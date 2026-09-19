/* 智能匹配页逻辑 */
(function () {
  const me = requireAuth();
  const myTeach = getMyListings().filter(l => l.type === 'teach');
  const myLearn = getMyListings().filter(l => l.type === 'learn');

  // ---------- 我的技能名片 ----------
  const chipLine = (label, cls, list, addHref, addText) => {
    const items = list.length
      ? list.map(l => `<span class="tag" style="font-size:12.5px;padding:3px 10px;margin:0 6px 6px 0">${esc(l.title)}</span>`).join('')
      : `<span style="color:var(--text-3);font-size:13px">尚未发布</span>`;
    return `
      <div style="display:flex;gap:10px;align-items:flex-start;margin-bottom:6px">
        <span class="badge ${cls}" style="margin-top:3px;width:52px;justify-content:center">${label}</span>
        <div style="flex:1">${items}</div>
        <a href="${addHref}" class="btn btn-sm btn-outline">${addText}</a>
      </div>`;
  };
  document.getElementById('myProfile').innerHTML =
    chipLine('我能教', 'badge-teach', myTeach, 'publish.html?type=teach', '＋ 添加') +
    chipLine('我想学', 'badge-learn', myLearn, 'publish.html?type=learn', '＋ 添加');

  const box = document.getElementById('matchResult');

  // ---------- 空状态：没发过想学 ----------
  if (!myLearn.length) {
    box.innerHTML = `
      <div class="card empty-state" style="padding:64px 20px">
        <div class="es-ico">🎯</div>
        <div class="es-title">还无法为你生成匹配</div>
        <div class="es-desc">先发布一条「我想学的」技能需求，系统会自动找到能教你的伙伴<br>建议同时发布「我能教的」，获得更高质量的双向匹配</div>
        <div style="display:flex;gap:10px;justify-content:center">
          <a class="btn btn-primary" href="publish.html?type=learn">📥 发布我想学的</a>
          <a class="btn btn-outline" href="publish.html?type=teach">📗 发布我能教的</a>
        </div>
      </div>
      <div class="card card-pad" style="margin-top:18px">
        <div class="card-title">⚙️ 匹配规则说明</div>
        <ul style="font-size:13px;color:var(--text-2);line-height:2.1;list-style:none">
          <li>1️⃣ 技能分类匹配（占 50%）：你想学的分类与对方「能教」的分类一致</li>
          <li>2️⃣ 技能点匹配（占 30%）：标签、关键词重合越多，匹配度越高</li>
          <li>3️⃣ 双向契合（加 25%）：对方想学的，恰好也是你能教的</li>
          <li>4️⃣ 交换方式兼容（加 5%）：线上 / 线下方式一致或接受「均可」</li>
        </ul>
      </div>`;
    return;
  }

  const result = computeMatches();

  // ---------- 空状态：有需求但无结果 ----------
  if (result.empty) {
    box.innerHTML = `
      <div class="card empty-state">
        <div class="es-ico">🗂️</div>
        <div class="es-title">暂时没有匹配度达标的伙伴</div>
        <div class="es-desc">可以到技能广场看看全部内容，或调整你发布的分类与标签</div>
        <div style="display:flex;gap:10px;justify-content:center">
          <a class="btn btn-primary" href="home.html">去技能广场</a>
          <a class="btn btn-outline" href="profile.html">管理我的发布</a>
        </div>
      </div>`;
    return;
  }

  // ---------- 匹配结果卡片 ----------
  const mutualCount = result.list.filter(r => r.mutual).length;
  const C = 2 * Math.PI * 18;

  box.innerHTML = `
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px">
      <span style="font-size:15px;font-weight:600">为你找到 ${result.list.length} 位匹配伙伴</span>
      ${mutualCount ? `<span class="badge badge-success">🤝 ${mutualCount} 位双向契合</span>` : ''}
    </div>
    <div class="skill-grid">
      ${result.list.map(r => {
        const l = r.listing;
        const u = getUserById(l.userId);
        const offset = C * (1 - r.score / 100);
        return `
          <div class="skill-card match-card" onclick="openListing('${l.id}')">
            <div class="match-score">
              <svg width="46" height="46" viewBox="0 0 46 46">
                <circle cx="23" cy="23" r="18" fill="none" stroke="#e7edf5" stroke-width="4"></circle>
                <circle cx="23" cy="23" r="18" fill="none" stroke="${r.mutual ? '#1a9c5b' : '#1f5bb5'}"
                  stroke-width="4" stroke-linecap="round"
                  stroke-dasharray="${C}" stroke-dashoffset="${offset}"></circle>
              </svg>
              <span class="ms-num" style="color:${r.mutual ? '#1a9c5b' : '#1f5bb5'}">${r.score}</span>
            </div>
            <div class="sc-user">
              ${avatarHtml(u)}
              <div style="min-width:0">
                <div class="sc-name">${esc(u ? u.name : '未知')}</div>
                <div class="sc-meta">${esc(l.city || (l.method === '线下' ? '线下' : '线上'))} · ${esc(l.method)}</div>
              </div>
            </div>
            <div class="sc-title" style="padding-right:52px">${esc(l.title)}</div>
            <div class="sc-tags">
              <span class="tag">${esc(l.category)}</span>
              ${l.tags.slice(0, 2).map(t => `<span class="tag">${esc(t)}</span>`).join('')}
            </div>
            <div class="match-reason">
              ${r.mutual ? '🤝 <b>双向契合！</b><br>' : '匹配理由：'}
              ${r.reasons.filter(x => !x.startsWith('双向契合')).slice(0, 2).join('；')}
            </div>
            <div class="sc-foot">
              ${(l.wantSkills && l.wantSkills.length)
                ? `<span style="font-size:12px;color:var(--text-3)">TA想换：${esc(l.wantSkills.slice(0, 2).join('、'))}</span>`
                : '<span></span>'}
              <button class="btn btn-sm ${r.mutual ? 'btn-success' : 'btn-primary'}"
                onclick="event.stopPropagation();showExchangeForm('${l.id}')">
                ${r.mutual ? '🤝 立即交换' : '发起交换'}
              </button>
            </div>
          </div>`;
      }).join('')}
    </div>`;
})();
