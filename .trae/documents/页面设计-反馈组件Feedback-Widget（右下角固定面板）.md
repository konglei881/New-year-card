# 页面设计说明（桌面优先）

## 全局设计（适用于所有页面）

### Layout
- 桌面端（≥1024px）优先：主体内容居中容器 `max-width: 1100px`，两侧留白。
- 组件布局：页面内容用 Flex/Stack；后台列表区采用 Grid（列表 + 右侧详情抽屉/弹层）。
- 响应式：
  - 768–1023px：容器收窄；管理页详情改为抽屉覆盖。
  - ≤767px：反馈面板全宽底部抽屉；管理页表格改为卡片列表。

### Meta Information（建议）
- 默认 Title："反馈组件 Demo"
- Description："右下角固定反馈面板，数据存入 Supabase。"
- Open Graph：`og:title`、`og:description`、`og:type=website`

### Global Styles（Design Tokens）
- 背景色：`--bg: #0B1220`（深色背景）
- 面板色：`--panel: #111B2E`
- 文本色：`--text: #E6EEF9`，弱文本：`--muted: #A9B7D0`
- 主色：`--primary: #5B8CFF`；危险色：`--danger: #FF5B5B`
- 圆角：`12px`；阴影：`0 16px 40px rgba(0,0,0,.35)`
- 字体：`14/16/20` 三档；标题 `20-24`；等宽仅用于 URL
- 按钮：主按钮填充主色；hover 提亮 6%；disabled 降低透明度
- 链接：下划线弱化，hover 显示下划线

### 全局组件：右下角固定反馈面板（全站常驻）
- 触发器（Floating Button）
  - 位置：`position: fixed; right: 24px; bottom: 24px; z-index: 50`
  - 尺寸：48x48；图标：对话气泡；支持键盘聚焦与 aria-label
- 面板（Panel）
  - 展开方式：从右下角向上弹出（桌面宽度 360px，高度自适应，最大 520px）
  - 结构：标题栏（“反馈”+ 关闭按钮）/ 表单区 / 状态提示区
- 表单字段
  - 多行输入：反馈内容（必填，建议 10–500 字；实时字数）
  - 单行输入：联系邮箱（可选，校验格式）
  - 隐藏字段：当前页面 URL（自动采集）
- 交互状态
  - Idle：可编辑
  - Submitting：禁用表单 + 显示 loading
  - Success：显示成功文案 + “继续反馈/关闭”
  - Error：显示错误文案 + “重试”
- 动效
  - 面板出现/消失：200ms ease-out（opacity + translateY）

---

## 页面 1：首页（示例站点）

### Page Structure
- 顶部导航（Nav）
- 介绍区（Hero）
- 内容区（Content Sections）
- 页脚（Footer）
- 右下角固定反馈面板（常驻）

### Sections & Components
1. 顶部导航
   - 左侧：站点名称 "Feedback Widget"
   - 右侧："反馈管理"入口（若已登录显示；未登录也可显示但点击跳转登录）
2. Hero
   - 标题："随时收集用户反馈"
   - 副标题："固定右下角面板 + Supabase 存储"
   - 引导：提示点击右下角按钮提交反馈
3. 内容区
   - 3 张说明卡片："随时可用"、"自动记录页面"、"后台可处理"
   - 示例段落：用于模拟真实页面滚动
4. Footer
   - 简短隐私提示："提交内容仅用于改进产品"

---

## 页面 2：登录页

### Page Structure
- 居中卡片布局（单列）

### Sections & Components
1. 登录卡片
   - 标题："管理员登录"
   - 表单：邮箱、（按你选用的 Auth 方式）密码/一次性验证码
   - 主按钮："登录"
   - 状态提示：登录中/失败原因
2. 跳转逻辑
   - 已登录：自动跳转到 `/admin/feedback`

---

## 页面 3：反馈管理页

### Page Structure
- 顶部栏 + 主内容区
- 主内容区：左侧列表（主列）+ 右侧详情（抽屉/面板）

### Sections & Components
1. 顶部栏
   - 左侧："反馈管理"
   - 右侧：管理员邮箱（只读）+ "登出"按钮
2. 工具条（列表上方）
   - 状态筛选：new / in_progress / closed
   - 搜索框：按 message/page_url 关键词
3. 反馈列表
   - 行信息：创建时间、页面 URL（截断+hover 展示完整）、内容摘要、状态 Badge
   - 分页方式："加载更多" 或分页器（默认加载最近 20 条）
   - 空状态：无结果提示 + 清除筛选
4. 反馈详情面板
   - 字段：完整内容、来源 URL、联系邮箱（如有）、创建/更新时间
   - 操作：状态下拉更新（new/in_progress/closed），更新中禁用
   - 更新成功提示：toast 或内联提示

---

## 可访问性与可用性要点
- 所有按钮与输入具备可见 focus 样式；面板支持 ESC 关闭。
- 错误提示使用易懂文案，避免仅颜色区分；状态 Badge 同时含文本。
