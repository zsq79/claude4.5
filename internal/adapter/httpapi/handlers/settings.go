package handlers

import (
	"fmt"
	"net/http"
	"os"
	"strings"
	"time"

	"kiro2api/logger"

	"github.com/gin-gonic/gin"
)

// handleGetSettings 获取当前环境配置
func (h *Handler) handleGetSettings(c *gin.Context) {
	settings := map[string]string{
		"KIRO_CLIENT_TOKEN":            maskToken(os.Getenv("KIRO_CLIENT_TOKEN")),
		"STEALTH_MODE":                 getEnvOrDefault("STEALTH_MODE", "true"),
		"HEADER_STRATEGY":              getEnvOrDefault("HEADER_STRATEGY", "real_simulation"),
		"STEALTH_HTTP2_MODE":           getEnvOrDefault("STEALTH_HTTP2_MODE", "auto"),
		"PORT":                         getEnvOrDefault("PORT", "8080"),
		"GIN_MODE":                     getEnvOrDefault("GIN_MODE", "release"),
		"LOG_LEVEL":                    getEnvOrDefault("LOG_LEVEL", "info"),
		"LOG_FORMAT":                   getEnvOrDefault("LOG_FORMAT", "json"),
		"LOG_CONSOLE":                  getEnvOrDefault("LOG_CONSOLE", "true"),
		"MAX_TOOL_DESCRIPTION_LENGTH":  getEnvOrDefault("MAX_TOOL_DESCRIPTION_LENGTH", "10000"),
	}

	c.JSON(http.StatusOK, settings)
}

// handleSaveSettings 保存环境配置到.env文件
func (h *Handler) handleSaveSettings(c *gin.Context) {
	var settings map[string]string

	if err := c.ShouldBindJSON(&settings); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "请求参数错误: " + err.Error(),
		})
		return
	}

	logger.Info("收到保存设置请求", logger.Any("settings_count", len(settings)))

	// 构建 .env 文件内容
	var envLines []string
	envLines = append(envLines, "# kiro2api 配置文件")
	envLines = append(envLines, fmt.Sprintf("# 更新时间: %s", time.Now().Format("2006-01-02 15:04:05")))
	envLines = append(envLines, "")
	envLines = append(envLines, "# Token配置")
	
	// KIRO_AUTH_TOKEN 从环境变量读取（不允许通过设置页面修改，太危险）
	if existingToken := os.Getenv("KIRO_AUTH_TOKEN"); existingToken != "" {
		envLines = append(envLines, fmt.Sprintf("KIRO_AUTH_TOKEN=%s", existingToken))
	}
	
	if clientToken := settings["KIRO_CLIENT_TOKEN"]; clientToken != "" && !strings.Contains(clientToken, "*") {
		envLines = append(envLines, fmt.Sprintf("KIRO_CLIENT_TOKEN=%s", clientToken))
	} else if existingClientToken := os.Getenv("KIRO_CLIENT_TOKEN"); existingClientToken != "" {
		envLines = append(envLines, fmt.Sprintf("KIRO_CLIENT_TOKEN=%s", existingClientToken))
	}

	envLines = append(envLines, "")
	envLines = append(envLines, "# 隐身模式配置")
	envLines = append(envLines, fmt.Sprintf("STEALTH_MODE=%s", settings["STEALTH_MODE"]))
	envLines = append(envLines, fmt.Sprintf("HEADER_STRATEGY=%s", settings["HEADER_STRATEGY"]))
	envLines = append(envLines, fmt.Sprintf("STEALTH_HTTP2_MODE=%s", settings["STEALTH_HTTP2_MODE"]))

	envLines = append(envLines, "")
	envLines = append(envLines, "# 服务配置")
	envLines = append(envLines, fmt.Sprintf("PORT=%s", settings["PORT"]))
	envLines = append(envLines, fmt.Sprintf("GIN_MODE=%s", settings["GIN_MODE"]))

	envLines = append(envLines, "")
	envLines = append(envLines, "# 日志配置")
	envLines = append(envLines, fmt.Sprintf("LOG_LEVEL=%s", settings["LOG_LEVEL"]))
	envLines = append(envLines, fmt.Sprintf("LOG_FORMAT=%s", settings["LOG_FORMAT"]))
	envLines = append(envLines, fmt.Sprintf("LOG_CONSOLE=%s", settings["LOG_CONSOLE"]))

	envLines = append(envLines, "")
	envLines = append(envLines, "# 工具配置")
	envLines = append(envLines, fmt.Sprintf("MAX_TOOL_DESCRIPTION_LENGTH=%s", settings["MAX_TOOL_DESCRIPTION_LENGTH"]))

	envContent := strings.Join(envLines, "\n")

	// 写入 .env 文件
	if err := os.WriteFile(".env", []byte(envContent), 0644); err != nil {
		logger.Error("保存.env文件失败", logger.Err(err))
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "保存文件失败: " + err.Error(),
		})
		return
	}

	// 更新当前进程的环境变量（部分立即生效）
	for key, value := range settings {
		if key != "KIRO_CLIENT_TOKEN" && key != "PORT" && key != "GIN_MODE" {
			os.Setenv(key, value)
		}
	}

	logger.Info("配置已保存到.env文件")

	// 检查是否需要重启
	restartRequired := false
	if settings["PORT"] != os.Getenv("PORT") || settings["GIN_MODE"] != os.Getenv("GIN_MODE") {
		restartRequired = true
	}

	c.JSON(http.StatusOK, gin.H{
		"success":          true,
		"message":          "配置保存成功",
		"restart_required": restartRequired,
		"timestamp":        time.Now().Format(time.RFC3339),
	})
}

func getEnvOrDefault(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func maskToken(token string) string {
	if token == "" {
		return ""
	}
	if len(token) <= 10 {
		return strings.Repeat("*", len(token))
	}
	return strings.Repeat("*", len(token)-6) + token[len(token)-6:]
}

