## Purpose

确保共享类型、HTTP 错误响应与 SSE 事件格式在前后端之间保持一致，避免实现和测试漂移。

## Requirements

### Requirement: 共享类型必须作为前后端契约的单一事实源
系统 MUST 以共享包中的契约定义为准，前端 API 层、后端返回结构与测试用例必须与其保持一致，不得维护语义冲突的重复定义。

#### Scenario: 更新共享契约后验证调用方
- **WHEN** 某个用户、消息或 SSE 事件契约发生调整
- **THEN** 前端消费代码、后端序列化逻辑与相关测试同步采用同一份共享定义

### Requirement: HTTP API 错误响应必须保持统一结构
系统对于非 SSE 的 API 错误 MUST 返回统一的 `{ code, msg, data }` 结构，前端错误处理 MUST 基于该结构解析错误。

#### Scenario: 受保护接口返回错误
- **WHEN** 前端调用普通 HTTP API 且后端返回认证失败、参数错误或内部错误
- **THEN** 响应体仍保持统一错误结构且前端能够稳定提取错误码与错误消息

### Requirement: SSE 事件格式必须一致且可被前端完整解析
系统 MUST 为聊天流使用一致的事件名称、事件数据结构与结束语义，前端流解析器与测试必须按同一格式处理。

#### Scenario: 前端消费聊天事件流
- **WHEN** 聊天接口发送 `delta`、`tool.start`、`tool.end`、`done`、`error` 或 `heartbeat` 事件
- **THEN** 前端解析器与测试夹具均按相同字段结构成功解析这些事件
