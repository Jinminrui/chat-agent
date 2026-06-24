## ADDED Requirements

### Requirement: 聊天请求必须携带完整执行上下文
系统在处理新的聊天消息时 MUST 将目标会话的已有消息历史与当前用户消息一起提供给聊天执行链路，确保多轮对话语义连续。

#### Scenario: 已有会话继续对话
- **WHEN** 已登录用户向一个已有历史消息的会话发送新消息
- **THEN** 后端将该会话已持久化的消息历史与本次新消息一起交给聊天执行链路

### Requirement: 聊天执行链路必须支持受控工具调用循环
系统 MUST 支持模型发起白名单工具调用、执行工具并将结果回注到后续推理中，直到得到最终答复或达到工具调用上限。

#### Scenario: 模型请求使用内置工具
- **WHEN** provider 返回一个合法的工具调用请求
- **THEN** runtime 执行对应白名单工具、记录调用结果并继续后续执行直至得到最终答复或触发上限保护

### Requirement: checkpoint 恢复不得丢失当前请求输入
系统在从 checkpoint 恢复执行状态时 MUST 保留当前请求的新用户输入，不得用旧状态覆盖本次消息。

#### Scenario: 存在历史 checkpoint 的会话继续聊天
- **WHEN** 某会话已有 checkpoint 且用户再次发送新消息
- **THEN** runtime 恢复已有执行状态时仍保留本次新用户消息并基于合并后的上下文继续执行

### Requirement: 流式聊天在写出 SSE 后必须通过 SSE 事件报告执行错误
系统在聊天流已开始输出 SSE 后 MUST 通过 `error` 事件结束执行期异常，而不是切换为普通 JSON 错误体。

#### Scenario: 流式执行中发生 provider 或工具异常
- **WHEN** SSE 响应头已写出且 runtime、provider、工具执行或持久化过程发生异常
- **THEN** 服务端发送符合契约的 `error` 事件并结束事件流
