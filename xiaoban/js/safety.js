/* ============================================================
   小伴同学 · 安全过滤
   说明：敏感词黑名单 + 安全兜底引导话术。
        命中危险/自伤/暴力/性相关/隐私话题 → 引导孩子找家长。
   ============================================================ */

/* 分类敏感词库（trigger 为命中后给家长的标签） */
const SENSITIVE_GROUPS = [
  {
    trigger: '自伤相关',
    words: ['不想活', '不要活', '想死', '去死', '打死自己', '打自己', '割自己', '伤害自己', '不要我了', '不要我活', '疼自己', '打我自己']
  },
  {
    trigger: '暴力相关',
    words: ['打人', '打你', '打死你', '打死他', '打死她', '杀', '杀人', '打哥哥', '打姐姐', '打弟弟', '打妹妹', '打妈妈', '打爸爸', '打老师', '打同学', '打小朋友', '拿刀', '刀子', '捅', '打爆', '揍']
  },
  {
    trigger: '危险相关',
    words: ['坏人抓', '陌生人带我', '有人摸我', '碰我下面', '摸我下面', '脱衣服', '亲嘴', '色情', '裸照', '不要告诉妈妈', '不许告诉', '秘密不告诉']
  },
  {
    trigger: '隐私相关',
    words: ['我家地址', '我家在哪', '我家住', '学校叫什么', '学校地址', '我电话', '我手机号', '我妈妈电话', '银行卡', '密码是', '我身份证']
  }
];

/* 安全兜底引导话术（给孩子） */
const SAFETY_GUIDE =
  '这件事一定要告诉爸爸妈妈，\n我们一起找大人帮忙好吗？';

/* 检查文本安全性
   返回 { safe:boolean, trigger?:string, guide?:string, hit?:string } */
function checkSafety(text) {
  if (!text) return { safe: true };
  // 合并用户自定义敏感词（来自设置），归为“自定义敏感词”
  const settings = getSettings();
  const userWords = settings.sensitiveWords || [];
  for (const w of userWords) {
    if (w && text.indexOf(w) >= 0) {
      return { safe: false, trigger: '自定义敏感词', guide: SAFETY_GUIDE, hit: w };
    }
  }
  // 分类敏感词
  for (const g of SENSITIVE_GROUPS) {
    for (const w of g.words) {
      if (text.indexOf(w) >= 0) {
        return { safe: false, trigger: g.trigger, guide: SAFETY_GUIDE, hit: w };
      }
    }
  }
  return { safe: true };
}
