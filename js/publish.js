/* 发布页逻辑 */
(function () {
  const me = requireAuth();

  // 从 URL 预选类型
  const params = new URLSearchParams(location.search);
  let pubType = params.get('type') === 'learn' ? 'learn' : 'teach';

  const typeCards = document.querySelectorAll('#typeCards .radio-card');
  const levelSel = document.getElementById('fLevel');
  const catSel = document.getElementById('fCategory');
  const wantItem = document.getElementById('wantSkillsItem');
  const titleLabel = document.getElementById('titleLabel');
  const levelLabel = document.getElementById('levelLabel');
  const descLabel = document.getElementById('descLabel');

  // 填充分类
  CATEGORIES.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c; opt.textContent = c;
    catSel.appendChild(opt);
  });

  function fillLevels() {
    const levels = pubType === 'teach' ? LEVELS_TEACH : LEVELS_LEARN;
    levelSel.innerHTML = levels.map(l => `<option value="${l}">${l}</option>`).join('');
  }

  function applyType() {
    typeCards.forEach(c => c.classList.toggle('active', c.dataset.type === pubType));
    document.querySelector(`input[name="pubType"][value="${pubType}"]`).checked = true;
    fillLevels();
    // 「想学」时不展示「期望交换」
    wantItem.style.display = pubType === 'teach' ? 'block' : 'none';
    if (pubType === 'teach') {
      titleLabel.innerHTML = '技能名称<span class="req">*</span>';
      levelLabel.textContent = '熟练程度';
      descLabel.innerHTML = '详细描述<span class="req">*</span>';
      document.getElementById('fTitle').placeholder = '例：吉他弹唱入门（零基础友好）';
      document.getElementById('fDesc').placeholder = '介绍你的经验、可以教的内容、建议的学习节奏，以及你希望交换的方向…';
    } else {
      titleLabel.innerHTML = '想学的技能<span class="req">*</span>';
      levelLabel.textContent = '当前水平';
      descLabel.innerHTML = '学习需求描述<span class="req">*</span>';
      document.getElementById('fTitle').placeholder = '例：想学 Python 编程';
      document.getElementById('fDesc').placeholder = '描述你的学习目标、当前基础、可投入的时间和偏好的学习方式…';
    }
  }

  typeCards.forEach(card => {
    card.addEventListener('click', () => { pubType = card.dataset.type; applyType(); });
  });
  applyType();

  // 方式单选
  let method = '线上';
  document.getElementById('methodList').addEventListener('click', e => {
    const t = e.target.closest('.check-tag');
    if (!t) return;
    method = t.dataset.method;
    document.querySelectorAll('#methodList .check-tag').forEach(x => x.classList.toggle('active', x === t));
  });

  // 通用标签输入
  function bindTagInput(inputId, listId) {
    const input = document.getElementById(inputId);
    const list = document.getElementById(listId);
    const tags = [];
    function draw() {
      list.innerHTML = tags.map((t, i) =>
        `<span class="check-tag active" style="cursor:pointer" title="点击删除">${esc(t)} ✕</span>`).join('');
    }
    list.addEventListener('click', () => { tags.pop(); draw(); });
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ',' || e.key === '，') {
        e.preventDefault();
        const v = input.value.trim().replace(/[,，]/g, '');
        if (v && !tags.includes(v) && tags.length < 6) { tags.push(v); draw(); }
        input.value = '';
      } else if (e.key === 'Backspace' && !input.value && tags.length) {
        tags.pop(); draw();
      }
    });
    return {
      get: () => tags.slice(),
      add: t => { if (t && !tags.includes(t) && tags.length < 6) { tags.push(t); draw(); } }
    };
  }

  const tagCtl = bindTagInput('fTagInput', 'tagList');
  const wantCtl = bindTagInput('fWantInput', 'wantList');

  // 描述字数
  const desc = document.getElementById('fDesc');
  desc.addEventListener('input', () => { document.getElementById('descCount').textContent = desc.value.length; });

  // 已发布统计
  const my = getMyListings();
  document.getElementById('myCountTip').innerHTML =
    `📗 我能教的：<b>${my.filter(l => l.type === 'teach').length}</b> 条<br>
     📙 我想学的：<b>${my.filter(l => l.type === 'learn').length}</b> 条`;

  // 提交
  document.getElementById('submitBtn').addEventListener('click', () => {
    const category = catSel.value;
    const title = document.getElementById('fTitle').value.trim();
    const level = levelSel.value;
    const descVal = desc.value.trim();
    const city = document.getElementById('fCity').value.trim();

    if (!category) return toast('请选择技能分类', 'error');
    if (title.length < 2) return toast('请填写技能名称（至少 2 个字）', 'error');
    if (descVal.length < 10) return toast('详细描述不少于 10 个字，方便伙伴了解你', 'error');

    const listing = {
      id: 'l' + Date.now(),
      userId: me.id,
      type: pubType,
      category,
      title,
      level,
      tags: tagCtl.get(),
      wantSkills: pubType === 'teach' ? wantCtl.get() : [],
      method,
      city: method === '线上' ? '' : city,
      desc: descVal,
      createdAt: Date.now()
    };
    saveListing(listing);
    toast('发布成功！', 'success');
    setTimeout(() => location.href = pubType === 'learn' ? 'matches.html' : 'home.html', 600);
  });
})();
