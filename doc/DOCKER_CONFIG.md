# Docker 部署配置指南

## 🚀 快速开始

### 1. 准备环境变量文件

创建 `.env` 文件（或者直接在 `docker-compose.yml` 中配置）：

```bash
# ===== Token 配置（必填）=====
KIRO_AUTH_TOKEN='[{"auth":"Social","refreshToken":"your-token-here"}]'
KIRO_CLIENT_TOKEN=your-secure-random-token

# ===== 隐身模式配置（推荐）=====
STEALTH_MODE=true
HEADER_STRATEGY=real_simulation
STEALTH_HTTP2_MODE=auto

# ===== 服务配置 =====
PORT=8080
GIN_MODE=release
LOG_LEVEL=info
LOG_FORMAT=json
```

### 2. 启动服务

```bash
# 拉取最新镜像
docker-compose pull

# 启动服务
docker-compose up -d

# 查看日志
docker-compose logs -f
```

### 3. 验证服务

```bash
# 测试 API
curl -H "Authorization: Bearer your-token" http://localhost:8080/v1/models

# 查看容器状态
docker-compose ps

# 查看健康检查
docker inspect kiro2api | grep -A 10 Health
```

## 📋 配置说明

### Token 配置

#### 单账号配置

```bash
KIRO_AUTH_TOKEN='[
  {
    "auth": "Social",
    "refreshToken": "arn:aws:sso:us-east-1:999999999999:token/refresh/your-token"
  }
]'
```

#### 多账号池配置（推荐）

```bash
KIRO_AUTH_TOKEN='[
  {
    "auth": "Social",
    "refreshToken": "arn:aws:sso:us-east-1:999999999999:token/refresh/token1",
    "description": "主账号"
  },
  {
    "auth": "Social",
    "refreshToken": "arn:aws:sso:us-east-1:999999999999:token/refresh/token2",
    "description": "备用账号"
  }
]'
```

#### 混合认证配置

```bash
KIRO_AUTH_TOKEN='[
  {
    "auth": "Social",
    "refreshToken": "arn:aws:sso:us-east-1:999999999999:token/refresh/social-token"
  },
  {
    "auth": "IdC",
    "refreshToken": "arn:aws:identitycenter::us-east-1:999999999999:account/instance/idc-token",
    "clientId": "https://oidc.us-east-1.amazonaws.com/clients/your-client-id",
    "clientSecret": "your-client-secret"
  }
]'
```

### 隐身模式配置（新功能）

#### STEALTH_MODE（推荐启用）

```bash
STEALTH_MODE=true  # 启用真实 Kiro IDE 请求头格式
```

**效果：**
- 自动使用真实的 Kiro IDE 请求头格式
- 每次请求随机化版本号和哈希
- 提高与 CodeWhisperer 的兼容性

#### HEADER_STRATEGY（请求头策略）

```bash
# 推荐配置（默认）
HEADER_STRATEGY=real_simulation
```

**策略说明：**

| 策略 | 说明 | 生成的请求头示例 | 推荐度 |
|------|------|------------------|--------|
| `real_simulation` | 真实 Kiro IDE 格式 | `x-amz-user-agent: aws-sdk-js/1.0.0 KiroIDE-0.4.0-{hash}`<br>`user-agent: aws-sdk-js/1.0.0 ua/2.1 os/win32#10.0.26200 lang/js md/nodejs#22.19.0 api/codewhispererruntime#1.0.0 m/E KiroIDE-0.4.0-{hash}` | ⭐⭐⭐⭐⭐ |
| `random` | 随机生成（旧版） | AWS 官方工具包格式（VS Code、JetBrains 等） | ⚠️ 已过时 |

**real_simulation 用户画像机制：**

**稳定的用户画像**（绑定到 token，每周可能轻微变化）：
- ✅ Kiro 版本号（85% 使用最新版 0.4.0，15% 使用旧版 0.3.5-0.3.9）
- ✅ 操作系统版本（Windows/macOS/Linux）- 同一 token 保持一致
- ✅ Node.js 版本（18-22）- 同一 token 保持一致
- ✅ UA 版本（2.0-2.5）- 同一 token 保持一致
- ✅ 模式标识（E/A/B/C/D）- 同一 token 保持一致
- ✅ Accept-Language 偏好 - 同一 token 保持一致
- ✅ 机器 ID（machineID）- 同一 token 保持一致

**每次会话变化的元素**：
- ✅ 64 位 SHA256 哈希签名（每次请求不同，模拟真实会话）

> 💡 **设计理念**：真实用户不会频繁更换 IDE 版本和操作系统。通过将用户画像绑定到 token，同一个 token 在一周内会保持相同的版本号、操作系统等信息，只有会话哈希每次不同。这完美模拟了真实用户行为！

#### STEALTH_HTTP2_MODE（HTTP/2 配置）

```bash
STEALTH_HTTP2_MODE=auto  # 推荐
```

**选项说明：**
- `auto`（推荐）：自动随机选择 HTTP/2 或 HTTP/1.1
- `force`：强制使用 HTTP/2
- `disable`：禁用 HTTP/2，仅使用 HTTP/1.1

## 🔧 环境变量完整列表

### 必填配置

| 环境变量 | 说明 | 示例 |
|----------|------|------|
| `KIRO_AUTH_TOKEN` | Kiro 认证 Token（JSON 数组） | `'[{"auth":"Social","refreshToken":"..."}]'` |
| `KIRO_CLIENT_TOKEN` | API 客户端认证密钥 | `your-secure-token` |

### 隐身模式配置（推荐配置）

| 环境变量 | 默认值 | 说明 |
|----------|--------|------|
| `STEALTH_MODE` | `true` | 启用隐身模式 |
| `HEADER_STRATEGY` | `real_simulation` | 使用真实 Kiro IDE 请求头 |
| `STEALTH_HTTP2_MODE` | `auto` | HTTP/2 自动模式 |

### 服务配置

| 环境变量 | 默认值 | 说明 |
|----------|--------|------|
| `PORT` | `8080` | 服务端口 |
| `GIN_MODE` | `release` | Gin 运行模式（debug/release/test） |

### 日志配置

| 环境变量 | 默认值 | 说明 |
|----------|--------|------|
| `LOG_LEVEL` | `info` | 日志级别（debug/info/warn/error） |
| `LOG_FORMAT` | `json` | 日志格式（text/json） |
| `LOG_CONSOLE` | `true` | 控制台输出 |
| `LOG_FILE` | - | 日志文件路径（可选） |

### 工具配置

| 环境变量 | 默认值 | 说明 |
|----------|--------|------|
| `MAX_TOOL_DESCRIPTION_LENGTH` | `10000` | 工具描述最大长度 |

## 🎯 推荐配置

### 生产环境配置

```yaml
environment:
  # Token 配置
  - KIRO_AUTH_TOKEN='[...]'
  - KIRO_CLIENT_TOKEN=生成的强密码
  
  # 隐身模式（推荐配置）
  - STEALTH_MODE=true
  - HEADER_STRATEGY=real_simulation
  - STEALTH_HTTP2_MODE=auto
  
  # 服务配置
  - PORT=8080
  - GIN_MODE=release
  
  # 日志配置
  - LOG_LEVEL=info
  - LOG_FORMAT=json
  - LOG_CONSOLE=true
```

### 开发/调试配置

```yaml
environment:
  # Token 配置
  - KIRO_AUTH_TOKEN='[...]'
  - KIRO_CLIENT_TOKEN=123456
  
  # 隐身模式
  - STEALTH_MODE=true
  - HEADER_STRATEGY=real_simulation
  - STEALTH_HTTP2_MODE=auto
  
  # 服务配置
  - PORT=8080
  - GIN_MODE=debug
  
  # 日志配置（详细调试）
  - LOG_LEVEL=debug
  - LOG_FORMAT=text
  - LOG_CONSOLE=true
```

## 📊 验证请求头

部署后，可以通过抓包工具验证发出的请求头格式：

### 预期的请求头格式

```http
GET /api/v1/conversations HTTP/2
Host: codewhisperer.us-east-1.amazonaws.com
x-amz-user-agent: aws-sdk-js/1.0.0 KiroIDE-0.4.0-954cd22dda111dffc3592dc86986f7e9860c20f6ba8201a62cbd92f69950e7c0
user-agent: aws-sdk-js/1.0.0 ua/2.1 os/win32#10.0.26200 lang/js md/nodejs#22.19.0 api/codewhispererruntime#1.0.0 m/E KiroIDE-0.4.0-954cd22dda111dffc3592dc86986f7e9860c20f6ba8201a62cbd92f69950e7c0
Authorization: Bearer xxx
Accept-Language: en-US,en;q=0.9
Accept-Encoding: gzip, deflate, br
X-Amzn-Trace-Id: Root=1-67b4d2e0-...
```

**关键特征：**
- ✅ `aws-sdk-js/1.0.0`（固定）
- ✅ `KiroIDE-版本号-64位哈希`
- ✅ `ua/2.x`（2.0-2.5）
- ✅ `os/平台#版本`
- ✅ `lang/js`（固定）
- ✅ `md/nodejs#版本`
- ✅ `api/codewhispererruntime#1.0.0`（固定）
- ✅ `m/模式标识`（E/A/B/C/D）

## 🔍 故障排除

### 检查隐身模式是否启用

```bash
# 查看环境变量
docker exec kiro2api env | grep STEALTH

# 预期输出：
# STEALTH_MODE=true
# HEADER_STRATEGY=real_simulation
# STEALTH_HTTP2_MODE=auto
```

### 查看生成的请求头（调试模式）

```bash
# 启用 debug 日志
docker-compose down
# 修改 .env: LOG_LEVEL=debug
docker-compose up -d

# 查看日志中的请求头信息
docker-compose logs -f | grep -A 5 "user-agent"
```

### 重新构建镜像（本地开发）

如果你修改了代码，需要重新构建：

```bash
# 停止并删除容器
docker-compose down

# 重新构建镜像
docker-compose build --no-cache

# 启动服务
docker-compose up -d
```

### 使用预构建镜像（推荐）

```bash
# 拉取最新镜像
docker-compose pull

# 重启服务
docker-compose up -d
```

## 📝 常见问题

### Q: 如何验证隐身模式是否生效？

A: 启用 debug 日志并查看发出的请求头，应该看到 `KiroIDE-版本号-哈希` 格式。

### Q: 是否需要重启容器才能应用新配置？

A: 是的，修改环境变量后需要重启：

```bash
docker-compose down
docker-compose up -d
```

### Q: 如何生成安全的 KIRO_CLIENT_TOKEN？

A: 使用以下命令生成：

```bash
openssl rand -hex 32
# 或者
python3 -c "import secrets; print(secrets.token_hex(32))"
```

### Q: 旧的 AWS 工具包格式还能用吗？

A: 可以，但不推荐。设置 `HEADER_STRATEGY=random` 可以使用旧格式，但真实 Kiro IDE 格式（`real_simulation`）兼容性更好。

### Q: 如何获取 Kiro Token？

A: 
- **Social tokens**: `~/.aws/sso/cache/kiro-auth-token.json`
- **IdC tokens**: `~/.aws/sso/cache/` 目录下的相关 JSON 文件

## 🔗 相关文档

- [README.md](../README.md) - 项目总览
- [DEPLOY_ZEABUR.md](./DEPLOY_ZEABUR.md) - Zeabur 部署指南
- [CLAUDE.md](../CLAUDE.md) - 开发者指南

## 🎉 总结

使用新版本的 Docker 配置，你将获得：

1. ✅ **真实的 Kiro IDE 请求头格式** - 完全符合抓包数据
2. ✅ **自动随机化** - 每次请求使用不同的版本号和哈希
3. ✅ **简单的配置** - 默认即是最佳配置
4. ✅ **更好的兼容性** - 与真实 Kiro IDE 请求行为一致

只需设置 `STEALTH_MODE=true` 和 `HEADER_STRATEGY=real_simulation`（默认配置），即可享受最佳体验！

