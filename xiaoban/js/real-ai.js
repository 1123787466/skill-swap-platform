/* ============================================================
   小伴同学 · 真实 LLM 调用（可选）
   说明：浏览器直接 fetch OpenAI 兼容接口。失败抛错，由调用方回落 Mock。
        ⚠️ 前端存 Key 有泄露风险，仅供自测，请勿用生产密钥。
   ============================================================ */

/* 调用真实 LLM，返回回复字符串；失败抛异常
   text:    孩子说的话
   role:    当前角色（带 persona/voice）
   settings: 全局设置（aiKey / aiBaseUrl / aiModel） */
async function realAIRespond(text, role, settings) {
  const baseUrl = (settings.aiBaseUrl || 'https://api.openai.com/v1').replace(/\/+$/, '');
  const model = settings.aiModel || 'gpt-4o-mini';
  const key = settings.aiKey;
  if (!key) throw new Error('missing key');

  // 系统提示词 = 小伴系统约束 + 角色人格 + 角色语气/口癖要求
  const sysContent = SYSTEM_PROMPT + '\n\n' + role.persona +
    (role.llmStyle ? '\n说话风格要求：' + role.llmStyle : '');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000); // 8s 超时

  try {
    const res = await fetch(baseUrl + '/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: 'system', content: sysContent },
          { role: 'user', content: text }
        ],
        max_tokens: 120,
        temperature: 0.85
      }),
      signal: controller.signal
    });
    clearTimeout(timer);
    if (!res.ok) {
      const t = await res.text().catch(() => '');
      throw new Error('HTTP ' + res.status + (t ? ': ' + t.slice(0, 120) : ''));
    }
    const data = await res.json();
    const reply = data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
    if (!reply) throw new Error('empty reply');
    return reply.trim();
  } catch (e) {
    clearTimeout(timer);
    throw e;
  }
}
