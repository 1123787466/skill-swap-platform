/* 个人中心逻辑 */
(function () {
  const me = getUser();
  let currentTab = 'mypub';

  function renderHero() {
    const u = getUser();
    document.getElementById('heroAvatar').outerHTML =
      `<span id="heroAvatar" class="avatar avatar-lg" style="background:${u.avatarColor};width:60px;height:60px;font-size:24px">${esc(u.name.slice(0, 1))}</span>`;
    document.getElementById('heroName').textContent = u.name;
    const joinDate = new Date(u.createdAt);
    document.getElementById('heroMeta').textContent =
      `📱 ${maskPhone(u.phone)}　|　🗓 ${joinDate.getFullYear()}年${joinDate.getMonth() + 1}月加入`;
    document.getElementById('heroBio').textContent = u.bio || '';
  }

  function renderStats() {
    const mine = getMyListings();
    const teach = mine.filter(l => l.type === 'teach');
    const learn = mine.filter(l => l.type === 'learn');
    document.getElementById('cntTeach').textContent = teach.length;
    document.getElementById('cntLearn').textContent = learn.length;
    const m = computeMatches();
    document.getElementById('cntMatch').textContent = m.empty ? 0 : m.list.length;
    const reqs = getRequests();
    const related = reqs.filter(r => r.fromUserId === me.id || r.toUserId === me.id);
    document.getElementById('cntReq').textContent = related.length;
    document.getElementById('tabPubCnt').textContent = mine.length;
    document.getElementById('tabRecvCnt').textContent = reqs.filter(r => r.toUserId === me.id).length;
    document.getElementById('tabSentCnt').textContent = reqs.filter(r => r.fromUserId === me.id).length;
  }

  function renderTab() {
    const body = document.getElementById('tabBody');
    const mine = getMyListings();

    if (currentTab === 'mypub') {
      if (!mine.length) {
        body.innerHTML = `
          <div class="empty-state">
            <div class="es-ico">📝</div>
            <div class="es-title">你还没有发布任何技能</div>
            <div class="es-desc">发布「我能教的」和「我想学的」，开启技能互换之旅</div>
            <div style="display:flex;gap:10px;justify-content:center">
              <a class="btn btn-primary" href="publish.html?type=teach">发布我能教的</a>
              <a class="btn btn-outline" href="publish.html?type=learn">发布我想学的</a>
            </div>
          </div>`;
        return;
      }
      body.innerHTML = mine.map(l => `
        <div class="my-listing">
          <div class="ml-main">
            <div class="ml-title">
              ${l.type === 'teach' ? '<span class="badge badge-teach">能教</span>' : '<span class="badge badge-learn">想学</span>'}
              ${esc(l.title)}
            </div>
            <div class="ml-meta">
              ${esc(l.category)} · ${esc(l.level)} · ${esc(l.method)}${l.city ? ' · ' + esc(l.city) : ''} · ${timeAgo(l.createdAt)}
              ${l.wantSkills && l.wantSkills.length ? ' · 想换：' + esc(l.wantSkills.join('、')) : ''}
            </div>
          </div>
          <div class="ml-actions">
            <button class="btn btn-sm btn-ghost" onclick="openListing('${l.id}')">查看</button>
            <button class="btn btn-sm btn-ghost" style="color:var(--danger)" onclick="window.__delListing('${l.id}')">删除</button>
          </div>
        </div>`).join('');
      return;
    }

    // 请求列表（收到 / 发出）
    const reqs = getRequests().filter(r =>
      currentTab === 'received' ? r.toUserId === me.id : r.fromUserId === me.id
    );

    if (!reqs.length) {
      body.innerHTML = `
        <div class="empty-state">
          <div class="es-ico">${currentTab === 'received' ? '📥' : '📤'}</div>
          <div class="es-title">${currentTab === 'received' ? '还没有收到交换请求' : '还没有发出交换请求'}</div>
          <div class="es-desc">${currentTab === 'received'
            ? '完善你的技能发布，让更多伙伴想与你交换'
            : '去技能广场或智能匹配中，找到感兴趣的伙伴发起交换吧'}</div>
          <a class="btn btn-primary" href="${currentTab === 'received' ? 'home.html' : 'matches.html'}">
            ${currentTab === 'received' ? '去发现技能' : '去智能匹配'}
          </a>
        </div>`;
      return;
    }

    body.innerHTML = reqs.map(r => {
      const otherId = currentTab === 'received' ? r.fromUserId : r.toUserId;
      const u = getUserById(otherId);
      const l = getListingById(r.listingId);
      const statusBadge = r.status === 'pending'
        ? '<span class="badge badge-gray">待处理</span>'
        : r.status === 'accepted'
          ? '<span class="badge badge-success">已同意</span>'
          : '<span class="badge badge-gray">已关闭</span>';
      return `
        <div class="my-listing">
          ${avatarHtml(u)}
          <div class="ml-main">
            <div class="ml-title">
              ${currentTab === 'received' ? `${esc(u ? u.name : '')} 想与你交换` : `向 ${esc(u ? u.name : '')} 发起交换`}
              ${statusBadge}
            </div>
            <div class="ml-meta">
              ${l ? `技能：${esc(l.title)}　|　` : ''}${esc(r.note || '')}
            </div>
            <div class="ml-meta">${timeAgo(r.time)}</div>
          </div>
          <div class="ml-actions">
            ${l ? `<button class="btn btn-sm btn-ghost" onclick="openListing('${l.id}')">技能详情</button>` : ''}
            <button class="btn btn-sm btn-outline" onclick="location.href='messages.html'">去消息</button>
          </div>
        </div>`;
    }).join('');
  }

  // Tab 切换
  document.getElementById('tabs').addEventListener('click', e => {
    const t = e.target.closest('.tab');
    if (!t) return;
    currentTab = t.dataset.tab;
    document.querySelectorAll('#tabs .tab').forEach(x => x.classList.toggle('active', x === t));
    renderTab();
  });

  // 删除（二次确认）
  window.__delListing = function (id) {
    document.body.insertAdjacentHTML('beforeend', `
      <div class="modal-mask" id="delModal">
        <div class="modal" style="width:400px">
          <div class="modal-head"><h3>删除确认</h3></div>
          <div class="modal-body">
            <p style="font-size:14px;line-height:1.8">确定要删除这条技能发布吗？<br>删除后将无法恢复，相关匹配也会同步消失。</p>
          </div>
          <div class="modal-foot">
            <button class="btn btn-outline" onclick="document.getElementById('delModal').remove()">取消</button>
            <button class="btn btn-primary" style="background:var(--danger)" id="delOkBtn">确认删除</button>
          </div>
        </div>
      </div>`);
    document.getElementById('delOkBtn').onclick = () => {
      deleteListing(id);
      document.getElementById('delModal').remove();
      toast('已删除', 'success');
      renderStats(); renderTab();
    };
  };

  // 编辑资料
  window.openEditProfile = function () {
    const u = getUser();
    document.body.insertAdjacentHTML('beforeend', `
      <div class="modal-mask" id="profileModal" onclick="if(event.target===this)closeEditProfile()">
        <div class="modal" style="width:460px">
          <div class="modal-head"><h3>编辑个人资料</h3><span class="modal-close" onclick="closeEditProfile()">✕</span></div>
          <div class="modal-body">
            <div class="form-item">
              <label class="form-label">昵称</label>
              <input class="input" id="pfName" maxlength="12" value="${esc(u.name)}">
            </div>
            <div class="form-item" style="margin-bottom:0">
              <label class="form-label">个人简介</label>
              <textarea class="textarea" id="pfBio" maxlength="80" placeholder="介绍一下你擅长和感兴趣的领域…">${esc(u.bio || '')}</textarea>
              <div class="form-hint">好的简介能让交换伙伴更快了解你</div>
            </div>
          </div>
          <div class="modal-foot">
            <button class="btn btn-outline" onclick="closeEditProfile()">取消</button>
            <button class="btn btn-primary" onclick="saveProfile()">保存</button>
          </div>
        </div>
      </div>`);
  };
  window.closeEditProfile = () => { const m = document.getElementById('profileModal'); if (m) m.remove(); };
  window.saveProfile = () => {
    const name = document.getElementById('pfName').value.trim();
    const bio = document.getElementById('pfBio').value.trim();
    if (!name) return toast('昵称不能为空', 'error');
    updateUser({ name, bio });
    closeEditProfile();
    toast('资料已更新', 'success');
    renderChromeUser();
    renderHero(); renderStats(); renderTab();
  };

  // 资料更新后刷新侧边栏/顶栏用户信息
  function renderChromeUser() {
    const u = getUser();
    const suName = document.querySelector('.sidebar-user .su-name');
    if (suName) suName.textContent = u.name;
    const avatars = document.querySelectorAll('.sidebar-user .avatar');
    if (avatars.length) avatars[0].textContent = u.name.slice(0, 1);
  }

  renderHero();
  renderStats();
  renderTab();
})();
