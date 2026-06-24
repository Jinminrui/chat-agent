## ADDED Requirements

### Requirement: Assistant 消息必须按受限 Markdown 渲染
系统 MUST 将 assistant 消息内容按受限 Markdown 规则渲染，至少正确展示段落、标题、列表、链接、行内代码和代码块，同时不得启用原始 HTML 直通渲染。

#### Scenario: 展示包含 Markdown 结构的 assistant 历史消息
- **WHEN** 用户进入一个已有历史消息的会话，且某条 assistant 消息包含标题、列表或代码块
- **THEN** 页面以格式化后的 Markdown 形式展示该消息，而不是将 Markdown 标记原样显示为纯文本

#### Scenario: 展示包含原始 HTML 的 assistant 消息
- **WHEN** assistant 消息内容包含原始 HTML 标签
- **THEN** 页面不得将这些 HTML 作为可执行或可渲染的原始 HTML 直接输出

## MODIFIED Requirements

### Requirement: 会话消息历史与流式新消息必须以一致形式展示
系统 MUST 将历史消息与当前流式回复整合为一致的聊天展示体验，不得要求用户理解两套不同的数据形态；其中 assistant 消息在历史展示与流式展示阶段都 MUST 使用同一套 Markdown 渲染规则，user 消息则 MUST 保持纯文本展示。

#### Scenario: 查看旧消息并继续发送
- **WHEN** 用户进入已有历史记录的会话并发送新消息
- **THEN** 页面同时展示已加载的历史消息与新产生的流式回复，且消息顺序保持正确
- **THEN** assistant 的流式回复在生成中与生成完成后保持一致的 Markdown 展示语义
- **THEN** user 消息继续按纯文本显示，不被解释为 Markdown 富文本
