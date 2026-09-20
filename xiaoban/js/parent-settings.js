/* ============================================================
   小伴同学 · 家长设置页逻辑
   说明：读写孩子档案、角色人格、使用时长、敏感词、AI Key、数据管理。
   ============================================================ */

function initSettings() {
  initPage();
  const s = getSettings();
  const child = getChild();

  // 孩子档案
  document.getElementById('childName').value = child.nickname || '';
  document.getElementById('childAge').value = child.ageGroup || '3-6岁';

  // 角色人格
  renderRoles(s.currentRole);

  // 口吻
  document.getElementById('toneMode').value = s.toneMode || 'lively';

  // 使用时长
  document.getElementById('timeLimit').value = String(s.timeLimitMin || 15);

  // 敏感词
  renderChips(s.sensitiveWords || []);

  document.getElementById('addWordBtn').addEventListener('click', addWord);
  document.getElementById('newWord').addEventListener('keydown', (e) => { if (e.key === 'Enter') addWord(); });

  // AI 设置
  document.getElementById('aiEnabled').checked = !!s.aiEnabled;
  document.getElementById('aiKey').value = s.aiKey || '';
  document.getElementById('aiBaseUrl').value = s.aiBaseUrl || 'https://api.openai.com/v1';
  document.getElementById('aiModel').value = s.aiModel || 'gpt-4o-mini';

  // 保存
  document.getElementById('saveBtn').addEventListener('click', saveAll);

  // 清空数据
  document.getElementById('clearBtn').addEventListener('click', clearAll);
}

/* ---------- 角色选择渲染 ---------- */
function renderRoles(currentId) {
  const grid = document.getElementById('roleGrid');
  grid.innerHTML = ROLE_LIST.map(r => `
    <div class="role-card${r.id === currentId ? ' selected' : ''}"
         style="--rc:${r.color};--rc-soft:${r.colorSoft};padding:16px 10px"
         data-role="${r.id}">
      <div class="badge" style="width:54px;height:54px;font-size:30px">${r.emoji}</div>
      <h3 style="font-size:16px">${r.name}</h3>
      <div class="tagline" style="font-size:12px">${r.tagline}</div>
    </div>
  `).join('');
  grid.querySelectorAll('.role-card').forEach(card => {
    card.addEventListener('click', () => {
      grid.querySelectorAll('.role-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
    });
  });
  grid._getSelected = () => {
    const sel = grid.querySelector('.role-card.selected');
    return sel ? sel.getAttribute('data-role') : currentId;
  };
}

/* ---------- 敏感词 chips ---------- */
function renderChips(words) {
  const el = document.getElementById('chipList');
  el.innerHTML = words.map((w, i) => `
    <span class="chip" data-i="${i}">${escapeHtml(w)} <span class="x" data-del="${escapeHtml(w)}">✕</span></span>
  `).join('');
  el.querySelectorAll('.x').forEach(x => {
    x.addEventListener('click', () => {
      const w = x.getAttribute('data-del');
      const s = getSettings();
      s.sensitiveWords = s.sensitiveWords.filter(t => t !== w);
      saveSettings(s);
      renderChips(s.sensitiveWords);
    });
  });
}

function addWord() {
  const input = document.getElementById('newWord');
  const w = input.value.trim();
  if (!w) return;
  const s = getSettings();
  if (s.sensitiveWords.indexOf(w) >= 0) { toast('已存在'); return; }
  s.sensitiveWords.push(w);
  saveSettings(s);
  renderChips(s.sensitiveWords);
  input.value = '';
}

/* ---------- 保存 ---------- */
function saveAll() {
  const grid = document.getElementById('roleGrid');
  const child = getChild();
  child.nickname = document.getElementById('childName').value.trim() || '小宝贝';
  child.ageGroup = document.getElementById('childAge').value;
  saveChild(child);

  updateSettings({
    currentRole: grid._getSelected(),
    toneMode: document.getElementById('toneMode').value,
    timeLimitMin: parseInt(document.getElementById('timeLimit').value, 10) || 15,
    aiEnabled: document.getElementById('aiEnabled').checked,
    aiKey: document.getElementById('aiKey').value.trim(),
    aiBaseUrl: document.getElementById('aiBaseUrl').value.trim() || 'https://api.openai.com/v1',
    aiModel: document.getElementById('aiModel').value.trim() || 'gpt-4o-mini'
  });

  // 注入主题色
  const r = ROLES[getSettings().currentRole] || ROLES.bear;
  document.documentElement.style.setProperty('--role-color', r.color);
  document.documentElement.style.setProperty('--role-color-soft', r.colorSoft);

  toast('已保存 ✅');
  setTimeout(() => { location.href = 'parent.html'; }, 600);
}

/* ---------- 清空数据 ---------- */
function clearAll() {
  if (!confirm('确定清空所有对话、故事、情绪、安全记录和统计吗？设置会保留。')) return;
  storeRemove(STORE.CONVERSATIONS);
  storeRemove(STORE.STORIES);
  storeRemove(STORE.EMOTION_LOG);
  storeRemove(STORE.SAFETY_LOG);
  storeRemove(STORE.USAGE);
  storeRemove(STORE.SESSION);
  storeRemove(STORE.SEEDED);
  // 重新种子
  seedIfEmpty();
  toast('已清空并重置种子数据');
  setTimeout(() => location.reload(), 700);
}

/* ---------- 工具 ---------- */
function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

let _toastTimer = null;
function toast(msg) {
  let el = document.getElementById('toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast';
    el.style.cssText = 'position:fixed;left:50%;bottom:100px;transform:translateX(-50%);background:rgba(74,58,46,0.92);color:#fff;padding:10px 18px;border-radius:14px;font-size:14px;z-index:60;max-width:80vw;text-align:center;';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.style.display = 'block';
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => { el.style.display = 'none'; }, 2200);
}

initSettings();
