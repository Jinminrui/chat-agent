# 基于 shadcn/ui 的 UI 精细化还原设计文档

## 1. 背景与目标

本项目目标是将现有 Chat Agent 的 UI 基于 shadcn/ui 组件库进行精细化还原，结合 spec 文档中的设计 token，实现一个高质量、可维护的聊天产品界面。

### 1.1 当前状态

- 项目已有完整的设计 spec（`2026-06-23-chat-agent-design.md`）
- 已有部分设计 token（`apps/web/styles/tokens.css`），但只定义了 8 个基础变量
- 当前组件使用原生 HTML + inline style 实现，代码可维护性差
- 项目未使用任何 UI 组件库

### 1.2 设计目标

- 基于 shadcn/ui 组件库全量还原 UI
- 将 spec 中的设计 token 映射到 shadcn/ui 主题系统
- 保持设计一致性，提升代码可维护性
- 支持响应式布局（桌面优先）

## 2. 技术选型

### 2.1 组件库

- **shadcn/ui**: 基于 Radix UI 的高质量 React 组件库
- **风格**: New York 风格（更现代、更有层次感）
- **图标**: Lucide React（轻量且风格统一）

### 2.2 主题系统

将 spec 中的设计 token 映射到 shadcn/ui 的 CSS 变量系统：

```css
@layer base {
  :root {
    /* 背景色 - 暖灰系 */
    --background: 40 20% 96%;        /* --bg-app: #f6f3ee */
    --foreground: 40 10% 12%;        /* --text-primary: #1f1f1c */
    
    /* 卡片/表面色 */
    --card: 40 25% 97%;              /* --bg-surface: #fbf9f6 */
    --card-foreground: 40 10% 12%;
    
    /* 弹出层 */
    --popover: 40 25% 97%;
    --popover-foreground: 40 10% 12%;
    
    /* 主色调 - 深绿色 */
    --primary: 160 27% 28%;          /* --accent-primary: #355d52 */
    --primary-foreground: 0 0% 100%;
    
    /* 次要色 */
    --secondary: 40 20% 90%;         /* --bg-muted: #f3eee7 */
    --secondary-foreground: 40 10% 12%;
    
    /* 静音色 */
    --muted: 40 20% 90%;
    --muted-foreground: 40 10% 40%;  /* --text-secondary: #6f6a62 */
    
    /* 强调色 */
    --accent: 40 20% 88%;            /* --bg-hover: #e8e1d8 */
    --accent-foreground: 40 10% 12%;
    
    /* 危险色 */
    --destructive: 0 60% 40%;
    --destructive-foreground: 0 0% 100%;
    
    /* 边框 */
    --border: 40 20% 85%;            /* --border-default: #ddd6cc */
    --input: 40 20% 85%;
    --ring: 160 27% 28%;
    
    /* 侧边栏 */
    --sidebar: 40 25% 90%;           /* --bg-sidebar: #efe9e1 */
    --sidebar-foreground: 40 10% 12%;
    --sidebar-primary: 160 27% 28%;
    --sidebar-primary-foreground: 0 0% 100%;
    --sidebar-accent: 40 20% 88%;
    --sidebar-accent-foreground: 40 10% 12%;
    --sidebar-border: 40 20% 85%;
    --sidebar-ring: 160 27% 28%;
    
    /* 圆角 */
    --radius: 0.5rem;
    
    /* 状态色 */
    --status-info-bg: 150 30% 90%;   /* --status-info-bg: #e8f0ed */
    --status-info-text: 160 27% 28%; /* --status-info-text: #355d52 */
    --status-error-bg: 0 60% 92%;    /* --status-error-bg: #f8e7e5 */
    --status-error-text: 0 50% 37%;  /* --status-error-text: #8a3d34 */
  }
}
```

## 3. 组件映射关系

### 3.1 认证页面组件

| 现有组件 | shadcn/ui 组件 | 说明 |
|---------|---------------|------|
| AuthCard | Card | 登录/注册卡片容器 |
| LoginForm | Form + Input + Button | 登录表单 |
| RegisterForm | Form + Input + Button | 注册表单 |

### 3.2 聊天页面组件

| 现有组件 | shadcn/ui 组件 | 说明 |
|---------|---------------|------|
| Sidebar | Sidebar | 侧边栏导航 |
| ConversationItem | SidebarMenu + Button | 会话列表项 |
| MessageList | ScrollArea | 消息滚动区域 |
| MessageRow | Avatar + Card | 消息气泡 |
| Composer | Textarea + Button | 输入区域 |
| EmptyState | Card | 空状态建议问题 |
| ToolStatus | Badge | 工具调用状态 |

## 4. 页面结构设计

### 4.1 登录页

```
LoginPage
└─ AuthShell (全屏居中)
   └─ Card (420px, 居中)
      ├─ CardHeader
      │  ├─ Logo (Lucide: MessageSquare)
      │  ├─ CardTitle: "Chat Agent"
      │  └─ CardDescription: "AI 助手"
      ├─ CardContent
      │  └─ Form
      │     ├─ FormField (username/email)
      │     │  ├─ Label
      │     │  └─ Input
      │     ├─ FormField (password)
      │     │  ├─ Label
      │     │  └─ Input (type=password)
      │     └─ FormMessage (错误提示)
      └─ CardFooter
         ├─ Button (登录, 全宽)
         └─ Link (注册入口)
```

### 4.2 注册页

```
RegisterPage
└─ AuthShell (全屏居中)
   └─ Card (420px, 居中)
      ├─ CardHeader
      │  ├─ Logo (Lucide: MessageSquare)
      │  ├─ CardTitle: "创建账号"
      │  └─ CardDescription: "注册新账号"
      ├─ CardContent
      │  └─ Form
      │     ├─ FormField (username)
      │     │  ├─ Label
      │     │  └─ Input
      │     ├─ FormField (email)
      │     │  ├─ Label
      │     │  └─ Input (type=email)
      │     ├─ FormField (password)
      │     │  ├─ Label
      │     │  └─ Input (type=password)
      │     └─ FormMessage (错误提示)
      └─ CardFooter
         ├─ Button (注册, 全宽)
         └─ Link (登录入口)
```

### 4.3 聊天页

```
ChatPage
└─ SidebarProvider
   ├─ Sidebar
   │  ├─ SidebarHeader
   │  │  ├─ Logo + "Chat Agent"
   │  │  └─ Button (新建会话, Plus icon)
   │  ├─ SidebarContent
   │  │  └─ SidebarGroup
   │  │     ├─ SidebarGroupLabel: "历史会话"
   │  │     └─ SidebarMenu
   │  │        └─ SidebarMenuItem[] (会话列表)
   │  └─ SidebarFooter
   │     └─ DropdownMenu (用户菜单)
   │        ├─ DropdownMenuItem: "个人设置"
   │        └─ DropdownMenuItem: "退出登录"
   └─ SidebarInset
      ├─ ChatTopBar
      │  ├─ SidebarTrigger (移动端)
      │  ├─ Separator
      │  ├─ 会话标题
      │  └─ Badge (模型标识)
      ├─ ChatBody (ScrollArea)
      │  ├─ EmptyState (无消息时)
      │  │  ├─ 欢迎语
      │  │  └─ Card[] (建议问题, 3-4 个)
      │  └─ MessageList (有消息时)
      │     └─ MessageRow[]
      │        ├─ Avatar (用户/AI)
      │        └─ Card (消息内容)
      │           ├─ ToolStatus (如有)
      │           └─ MessageContent
      └─ ComposerArea (固定底部)
         ├─ ToolStatusBar (如有工具调用)
         └─ Composer
            ├─ Textarea (自动扩展)
            └─ Button (发送, ArrowUp icon)
```

## 5. 关键组件实现细节

### 5.1 侧边栏会话项

```tsx
<SidebarMenuItem>
  <SidebarMenuButton
    isActive={conv.id === currentConversationId}
    onClick={() => router.push(`/chat/${conv.id}`)}
  >
    <MessageSquare />
    <span>{conv.title}</span>
  </SidebarMenuButton>
</SidebarMenuItem>
```

### 5.2 消息气泡

```tsx
<div className={cn("flex gap-3", msg.role === "user" && "flex-row-reverse")}>
  <Avatar>
    <AvatarFallback>
      {msg.role === "user" ? "你" : "AI"}
    </AvatarFallback>
  </Avatar>
  <Card className={cn(
    "max-w-[80%]",
    msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
  )}>
    <CardContent className="p-3">
      {toolStatus && <ToolStatusBadge status={toolStatus} />}
      <p>{msg.content}</p>
    </CardContent>
  </Card>
</div>
```

### 5.3 输入区域

```tsx
<div className="border-t p-4">
  <form onSubmit={handleSubmit}>
    <div className="flex gap-2">
      <Textarea
        placeholder="输入消息..."
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="min-h-[44px] max-h-[200px] resize-none"
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
          }
        }}
      />
      <Button type="submit" size="icon" disabled={!value.trim()}>
        <ArrowUp className="h-4 w-4" />
      </Button>
    </div>
  </form>
</div>
```

### 5.4 工具状态提示

```tsx
{toolStatus && (
  <Badge variant="secondary" className="gap-1">
    <Loader2 className="h-3 w-3 animate-spin" />
    {toolStatus.label}
  </Badge>
)}
```

## 6. 响应式策略

采用桌面优先策略：

- **>= 1024px**: 标准双栏布局，侧边栏默认展开
- **768px - 1023px**: 侧边栏可折叠，默认收起
- **< 768px**: 侧边栏改为抽屉（Sheet），默认聚焦聊天主区

```tsx
// 移动端侧边栏抽屉化
<Sidebar collapsible="offcanvas">
  {/* 侧边栏内容 */}
</Sidebar>

// 聊天区域自适应
<div className="flex h-screen">
  <Sidebar />
  <main className="flex-1 flex flex-col">
    {/* 聊天内容 */}
  </main>
</div>
```

## 7. 空状态与建议问题

当用户进入空白新会话时，主区展示空状态：

- 一句欢迎语："欢迎使用 Chat Agent"
- 一句简短说明："我可以帮你搜索网页、获取信息、回答问题"
- 3-4 个建议问题卡片：
  - "总结这个网页的内容"
  - "搜索最新的 AI 新闻"
  - "现在几点了？"
  - "帮我写一封邮件"

点击建议问题后，优先填入输入框而不是直接发送，给用户保留确认感。

## 8. 工具状态表达

工具调用状态是本产品相对普通聊天产品的重要差异点，第一版保持克制：

- 在 assistant 消息附近显示一条轻量状态提示
- 文案形如 "正在搜索网页"、"正在读取页面"、"正在整理结果"
- 使用浅底色胶囊或轻状态条（Badge 组件）
- 工具完成后自动收起或弱化显示

第一版不展示：
- 工具底层参数
- 原始 JSON
- 调试级执行细节

## 9. 实现步骤

### 9.1 使用 shadcn CLI 初始化

使用 shadcn 官方 CLI 工具初始化项目和安装组件：

```bash
# 初始化 shadcn/ui（在 apps/web 目录下执行）
cd apps/web
npx shadcn@latest init

# 按照提示选择配置：
# - 风格: New York
# - 基色: Neutral
# - CSS 文件路径: app/globals.css
# - Tailwind 配置路径: tailwind.config.ts
# - 组件别名: @/components
# - 工具函数别名: @/lib/utils
```

### 9.2 安装所需组件

使用 shadcn CLI 添加组件：

```bash
# 在 apps/web 目录下执行
cd apps/web

# 基础组件
npx shadcn@latest add button card input label textarea

# 布局组件
npx shadcn@latest add scroll-area separator avatar

# 导航组件
npx shadcn@latest add sidebar dropdown-menu sheet

# 表单组件
npx shadcn@latest add form

# 反馈组件
npx shadcn@latest add badge

# 安装 Lucide React 图标库
pnpm add lucide-react
```

### 9.3 配置主题

1. 更新 `globals.css`，添加完整的主题变量（替换 shadcn 默认主题）
2. 删除旧的 `tokens.css`
3. 更新 `tailwind.config.ts`，确保 shadcn/ui 配置正确

### 9.4 重构组件

按以下顺序重构：
1. 登录页（AuthCard、LoginForm）
2. 注册页（RegisterForm）
3. 聊天页侧边栏（Sidebar、ConversationItem）
4. 聊天页主区域（MessageList、MessageRow）
5. 输入区域（Composer）
6. 空状态（EmptyState）

### 9.5 测试验证

- 视觉验证：对比 spec 设计，确保还原度
- 响应式测试：验证不同屏幕尺寸下的表现
- 交互测试：验证所有功能正常工作

## 10. 文件结构

```
apps/web/
├─ components/
│  ├─ ui/                    # shadcn/ui 组件（自动生成）
│  │  ├─ button.tsx
│  │  ├─ card.tsx
│  │  ├─ input.tsx
│  │  └─ ...
│  ├─ auth/
│  │  ├─ auth-card.tsx       # 登录/注册卡片容器
│  │  ├─ login-form.tsx      # 登录表单
│  │  └─ register-form.tsx   # 注册表单
│  └─ chat/
│      ├─ sidebar.tsx        # 侧边栏
│      ├─ message-list.tsx   # 消息列表
│      ├─ message-row.tsx    # 消息行
│      ├─ composer.tsx       # 输入区域
│      └─ empty-state.tsx    # 空状态
├─ app/
│  ├─ login/page.tsx
│  ├─ register/page.tsx
│  ├─ chat/
│  │  ├─ page.tsx
│  │  └─ [conversationId]/page.tsx
│  └─ layout.tsx
└─ styles/
   └─ globals.css            # 主题配置
```

## 11. 成功标准

- 所有页面使用 shadcn/ui 组件重构
- 设计 token 完整映射到 shadcn/ui 主题系统
- 响应式布局正常工作（桌面/平板/手机）
- 所有交互功能正常（登录、注册、聊天、会话切换）
- 代码可维护性显著提升
- 视觉效果符合 spec 设计要求

## 12. 风险与应对

### 12.1 主题适配风险

**风险**: shadcn/ui 默认主题可能与 spec 设计不完全匹配

**应对**: 通过 CSS 变量覆盖，确保主题完全符合设计要求

### 12.2 组件兼容性风险

**风险**: 某些 shadcn/ui 组件可能不完全满足需求

**应对**: 必要时对组件进行二次封装，保持接口一致

### 12.3 响应式布局风险

**风险**: 移动端侧边栏抽屉化可能影响用户体验

**应对**: 充分测试移动端交互，确保流畅体验

---

**设计文档完成时间**: 2026-06-23
**设计者**: Claude
**状态**: 待审核
