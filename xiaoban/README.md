# 小伴同学 — AI 情绪陪伴故事伙伴 Web MVP

> 一个"软件定义玩具"的 MVP：用 Web App 验证 AI 情绪陪伴的核心交互、情绪价值和家长付费意愿，未来可移植到毛绒玩具、故事机或智能音箱。
>
> 3-6 岁孩子选一个角色 → 按住说话或打字 → AI 用角色口吻短句回应 → 识别情绪 → 生成"孩子是主角"的专属小故事 → 家长端收到情绪摘要和沟通建议。

---

## 一、项目背景

- **定位**：应聘"产品经理管培生-玩具产品方向"的作品集项目。
- **目标**：同时产出"可演示的运行产品 + 完整作品集材料（PRD/竞品/调研/计划/测试/复盘）"。
- **MVP 边界**：只做核心交互与 UI，不做账号、付费、管理后台、真实硬件协议。
- **AI 策略**：默认纯前端 Mock（开箱即演示），家长设置里可填真实 OpenAI 兼容 Key 自测。

## 二、在线 Demo

- **GitHub Pages**：`https://<你的用户名>.github.io/<仓库>/xiaoban/`
- **本地预览**：在 `xiaoban/` 目录下运行 `python -m http.server 5180`，浏览器访问 `http://localhost:5180/`。
- **打开即演示**：项目内置种子数据（孩子档案"朵朵"、6 条示范对话、1 条示范故事、当日情绪汇总、1 条安全记录），无需任何配置即可看到完整的家长仪表盘。
- **安全提醒**：部署后请在 GitHub 仓库 Settings → Secrets 中及时撤销使用过的 Personal Access Token。

## 三、核心流程

```
选角色（小熊/恐龙/太空伙伴）
      ↓
按住说话（Web Speech API）或文字输入
      ↓
安全检查（敏感词黑名单）→ 不通过：引导话术 + 安全记录
      ↓ 通过
Mock AI 回应（≤3 句，每句 ≤15 字，先共情→命名情绪→引导）
      ↓
情绪识别（关键词计分：开心/生气/害怕/委屈/平静）
      ↓
生成专属故事（孩子是主角，把当天情绪事件编入 300 字小故事）
      ↓
家长仪表盘：情绪关键词 / 对话摘要 / 建议话题 / 安全记录 / 使用统计
```

## 四、功能清单

### 儿童端

| 模块 | 功能 | 文件 |
| --- | --- | --- |
| 角色选择 | 小熊暖暖 / 恐龙勇勇 / 太空奇奇，固定人格与口吻 | [index.html](index.html) |
| 按住说话 | `webkitSpeechRecognition` 长按识别，松开发送 | [chat.html](chat.html) + [js/chat.js](js/chat.js) |
| 文字兜底 | ASR 不支持/失败时切换打字输入 | [js/chat.js](js/chat.js) |
| AI 回应 | 短句、温暖、儿童友好，一次 ≤3 句 | [js/mock-ai.js](js/mock-ai.js) |
| 情绪引导 | 先共情，再帮孩子命名情绪，不说教 | [js/mock-ai.js](js/mock-ai.js) |
| 专属故事 | 孩子是主角，把当天情绪事件编进故事 | [story.html](story.html) + [js/story.js](js/story.js) |
| 故事朗读 | `SpeechSynthesis` 角色口吻朗读，可暂停/完播统计 | [js/story.js](js/story.js) |
| 时长锁 | 家长设 10/15 分钟，到点温柔结束 | [js/chat.js](js/chat.js) |
| 安全兜底 | 危险/自伤/暴力/隐私/性相关话题引导找家长 | [js/safety.js](js/safety.js) |

### 家长端

| 模块 | 功能 | 文件 |
| --- | --- | --- |
| 今日情绪关键词 | 开心/生气/害怕/委屈/平静计数条形图 | [parent.html](parent.html) + [js/parent.js](js/parent.js) |
| 对话摘要 | 孩子今天聊了什么（关键词拼成简句） | [js/parent.js](js/parent.js) |
| 建议话题 | "今晚可以问孩子…"3 条（按主情绪生成） | [js/parent.js](js/parent.js) |
| 安全记录 | 敏感词拦截 / 异常话题提醒，可标记已处理、删除 | [js/parent.js](js/parent.js) |
| 使用数据 | 对话轮数 / 时长 / 故事完播 / 平均时延 / 成本估算 | [js/parent.js](js/parent.js) |
| 设置 | 角色人格、时长、敏感词、孩子档案、AI Key | [parent-settings.html](parent-settings.html) + [js/parent-settings.js](js/parent-settings.js) |

## 五、技术栈

| 层 | 选型 | 说明 |
| --- | --- | --- |
| 前端 | 原生 HTML / CSS / JS（ES6+） | 无构建步骤，无框架，零依赖 |
| 存储 | `localStorage`（键名 `xb_` 前缀） | 浏览器内隔离，刷新不丢失 |
| 语音识别 | `webkitSpeechRecognition` | Chrome / Edge 中文识别 |
| 语音合成 | `SpeechSynthesis` | 朗读故事，角色口吻 |
| AI | Mock 默认 + 可选 OpenAI 兼容接口 | 失败自动回落 Mock，保证演示不崩 |
| 部署 | GitHub Pages | 静态托管，`.nojekyll` 跳过 Jekyll |

## 六、项目结构

```
xiaoban/
├── index.html                 # 角色选择页
├── chat.html                  # 儿童端：对话页
├── story.html                 # 儿童端：专属故事页
├── parent.html                # 家长端：仪表盘
├── parent-settings.html       # 家长端：设置
├── css/
│   ├── common.css             # 公共样式 + CSS 变量
│   ├── child.css              # 儿童端样式
│   └── parent.css             # 家长端样式
├── js/
│   ├── common.js              # 存储 / 角色 / 种子数据 / 语音合成
│   ├── mock-ai.js             # Mock AI：情绪识别 + 回复 + 故事生成
│   ├── real-ai.js             # 真实 LLM 调用（可选，失败回落 Mock）
│   ├── safety.js              # 敏感词黑名单 + 安全兜底引导
│   ├── chat.js                # 对话页：ASR / 发送 / 时长锁
│   ├── story.js               # 故事生成与朗读
│   ├── parent.js              # 家长仪表盘渲染
│   └── parent-settings.js     # 家长设置读写
├── docs/
│   ├── 竞品分析.md
│   ├── 用户调研.md
│   ├── 项目计划.md
│   ├── 测试报告.md
│   └── 复盘报告.md
├── PRD.md
├── README.md
├── .nojekyll
└── .gitignore
```

## 七、本地运行

```bash
# 方式一：Python 内置静态服务器
cd xiaoban
python -m http.server 5180
# 浏览器访问 http://localhost:5180/

# 方式二：VSCode Live Server 插件
# 右键 index.html → Open with Live Server
```

## 八、使用真实 AI（可选）

1. 打开 `parent-settings.html`（家长端 → 设置）。
2. 打开"用真实 AI"开关。
3. 填入 OpenAI 兼容的 `Base URL`（默认 `https://api.openai.com/v1`）、`API Key`、模型名（默认 `gpt-4o-mini`）。
4. 保存后，对话将优先走真实 LLM；超时（8s）或报错自动回落 Mock。
5. **Key 仅存浏览器 localStorage，不上传任何服务器**；明示存在泄露风险，仅自测用。

## 九、验收对照（MVP 标准）

| # | 验收项 | 达成 |
| --- | --- | --- |
| 1 | 完整流程：选角色 → 说话 → AI 回应 → 情绪识别 → 故事 → 家长报告 | ✓ |
| 2 | 移动端可用（响应式 + 触控大按钮） | ✓ |
| 3 | AI 失败时 Mock 兜底，演示不崩 | ✓ |
| 4 | 安全过滤（4 类敏感词 + 引导话术） | ✓ |
| 5 | 种子数据，打开即可演示 | ✓ |
| 6 | 可部署 GitHub Pages | ✓ |
| 7 | 产出 PRD/竞品/调研/计划/测试/复盘 | ✓ |

## 十、作品集材料

- [PRD.md](PRD.md) — 用户画像 / 场景 / 价值主张 / 优先级 / MVP 范围
- [docs/竞品分析.md](docs/竞品分析.md) — 火火兔 / 牛听听 / Luka / BubblePal / Miko 等 15 款
- [docs/用户调研.md](docs/用户调研.md) — 访谈提纲 / 痛点地图 / 需求机会矩阵
- [docs/项目计划.md](docs/项目计划.md) — 甘特图 / 关键节点 / 风险清单 / 依赖项
- [docs/测试报告.md](docs/测试报告.md) — 内测记录 / 儿童反应 / ASR 准确率 / 时延 / 成本
- [docs/复盘报告.md](docs/复盘报告.md) — 数据 / 迭代建议 / 量产硬件设想

## 十一、截图位

> 演示时自行替换为实际截图（移动端角色选择 / 对话气泡 / 故事朗读 / 家长仪表盘）。

- `assets/screenshots/01-roles.png` — 角色选择页
- `assets/screenshots/02-chat.png` — 对话页（按住说话 + 气泡）
- `assets/screenshots/03-story.png` — 专属故事页
- `assets/screenshots/04-parent.png` — 家长仪表盘
- `assets/screenshots/05-settings.png` — 家长设置页

## 十二、License

MIT — 仅用于作品集演示，请勿用于商业场景。AI 接口、角色形象、儿童数据安全需另行合规评估。
