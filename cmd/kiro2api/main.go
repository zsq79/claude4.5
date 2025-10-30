package main

import (
	"context"
	"os"
	"os/signal"
	"syscall"

	"kiro2api/internal/runtime"
	"kiro2api/logger"

	"github.com/joho/godotenv"
)

func main() {
	if err := godotenv.Load(); err != nil {
		logger.Info("未找到.env文件，使用环境变量")
	}

	logger.Reinitialize()

	logger.Debug("日志系统初始化完成",
		logger.String("config_level", os.Getenv("LOG_LEVEL")),
		logger.String("config_file", os.Getenv("LOG_FILE")))

	options := runtime.Options{}

	if len(os.Args) > 1 {
		options.Port = os.Args[1]
	}

	if envPort := os.Getenv("PORT"); envPort != "" {
		options.Port = envPort
	}

	options.ClientToken = os.Getenv("KIRO_CLIENT_TOKEN")
	if options.ClientToken == "" {
		logger.Error("致命错误: 未设置 KIRO_CLIENT_TOKEN 环境变量")
		logger.Error("请在 .env 文件中设置强密码，例如: KIRO_CLIENT_TOKEN=your-secure-random-password")
		logger.Error("安全提示: 请使用至少32字符的随机字符串")
		os.Exit(1)
	}

	application, err := runtime.New(options)
	if err != nil {
		logger.Error("应用初始化失败", logger.Err(err))
		os.Exit(1)
	}

	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	if err := application.Run(ctx); err != nil {
		logger.Error("服务器运行失败", logger.Err(err))
		os.Exit(1)
	}
}
