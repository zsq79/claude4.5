# Zeabur 部署指南

本文档详细说明如何将 kiro2api 部署到 [Zeabur](https://zeabur.com/) 平台，并利用其自动构建与全球加速能力进行托管。

## 部署概览

Zeabur 的构建系统默认使用 [Nixpacks](https://nixpacks.com)，因此本项目提供了开箱即用的 `nixpacks.toml` 与 `Procfile`。在 Zeabur 侧只需要：

1. 绑定 GitHub 仓库（或手动上传镜像）。
2. 选择 "Deploy from Git" 并关联 `work` 分支。
3. 在 **Environment** 面板中配置运行所需的密钥。 
4. 点击 **Deploy** 即可完成构建与发布。

> ℹ️ Zeabur 会自动注入 `PORT` 环境变量，程序会优先监听该端口，因此无需手动设置对外端口。

## 准备工作

- 一份可用的 AWS CodeWhisperer Refresh Token（或 IdC 客户端凭证）。
- 一个自定义的客户端访问密钥，用于 `KIRO_CLIENT_TOKEN`。
- 已 Fork 或有权限访问的项目仓库。

## 仓库配置说明

### nixpacks.toml

项目根目录新增的 `nixpacks.toml` 用于精确描述构建步骤：

```toml
providers = ['...', 'go']

[phases.setup]
nixPkgs = ['...', 'go', 'gcc', 'pkg-config']

[phases.install]
cmds = ['go mod download']

[phases.build]
cmds = ['CGO_ENABLED=1 go build -o kiro2api ./cmd/kiro2api']

[start]
cmd = './kiro2api'
```

- `providers` 显式启用 Go 语言提供者，确保 Nixpacks 使用 Go toolchain。
- `setup` 阶段安装 `gcc` 与 `pkg-config`，以便启用 CGO（`bytedance/sonic` 会根据 CGO 获得最佳性能）。
- `install` / `build` 阶段缓存 `go mod` 并生成生产环境二进制。
- `start` 定义服务启动命令，与 Procfile 保持一致。

### Procfile

根目录的 `Procfile` 进一步声明 Web 进程：

```
web: ./kiro2api
```

Zeabur 会将其解析为单一 Web 进程，自动绑定到平台提供的 `PORT`。

## Zeabur 平台操作步骤

1. **创建项目**：在 Zeabur 控制台选择 "Create Project"，并选择任意区域。
2. **连接代码仓库**：在服务创建页点击 "Deploy from Git"，授权后选择包含本项目的仓库与分支。
3. **确认构建配置**：Zeabur 检测到 `nixpacks.toml` 与 `Procfile` 后会自动使用它们构建，无需额外手动配置。
4. **设置环境变量**：在服务面板的 **Environment** 标签页添加以下变量：

   | 变量名 | 是否必填 | 示例值 | 说明 |
   |--------|----------|--------|------|
   | `KIRO_AUTH_TOKEN` | ✅ | `[{"auth":"Social","refreshToken":"aws-refresh-token"}]` | 支持 JSON 字符串或在 Zeabur Secret 中存储的文件路径 |
   | `KIRO_CLIENT_TOKEN` | ✅ | `my-super-strong-password` | 用于客户端访问的 API 密钥，请使用 32+ 随机字符 |
   | `STEALTH_MODE` | 可选 | `true` | 启用隐身模式，全面随机化网络特征；未设置时保持旧行为 |
   | `HEADER_STRATEGY` | 可选 | `real_simulation` | 当隐身模式开启时，选择 `real_simulation` 或 `random` 策略 |
   | `STEALTH_HTTP2_MODE` | 可选 | `auto` | 控制 HTTP/2 行为：`auto`（默认随机）、`force`、`disable` |
   | `GIN_MODE` | 建议 | `release` | 启用 Gin Release 模式，减少日志噪声 |
   | `LOG_LEVEL` | 可选 | `info` | 控制日志级别（`debug`/`info`/`warn`） |
   | `LOG_FORMAT` | 可选 | `json` | 若需要 JSON 格式日志，可设置为 `json` |

   > 如果将 `KIRO_AUTH_TOKEN` 存储为 Zeabur Secret 文件，可填写文件路径；程序会检测并读取文件内容。

5. **触发部署**：点击 **Deploy**，等待 Zeabur 完成 Nixpacks 构建与发布。
6. **验证服务**：部署成功后，在 **Domains** 中使用内置的 preview 域名执行健康检查：

   ```bash
   curl -H "Authorization: Bearer <KIRO_CLIENT_TOKEN>" \
     https://<your-zeabur-domain>/v1/models
   ```

7. **静态控制台**：访问 `https://<your-zeabur-domain>/` 可打开内置 Dashboard；`/api/tokens` 可查看账号池状态（无需认证）。

## 常见问题

- **端口监听错误**：无需修改任何配置，程序默认监听 `PORT` 环境变量。若看到 `address already in use`，请检查是否存在多个实例并行运行。
- **认证失败**：确认 `KIRO_CLIENT_TOKEN` 与请求头中的 Bearer Token 一致；或检查 `KIRO_AUTH_TOKEN` 是否包含可用账号。
- **构建失败**：请确认仓库中包含 `nixpacks.toml` 与 `Procfile`，并且无未提交的 `go.mod` 变更。Zeabur 控制台的 "Build Logs" 中可查看详细错误。

## 后续优化建议

- **绑定自定义域名**：在 Zeabur 的 **Domains** 页面添加自定义域，并按提示配置 DNS。
- **启用自动部署**：开启 "Auto Deploy" 让每次推送自动触发构建。
- **日志采集**：Zeabur 提供实时日志流，可结合自定义 `LOG_FORMAT` 输出结构化日志，方便接入外部观测平台。
