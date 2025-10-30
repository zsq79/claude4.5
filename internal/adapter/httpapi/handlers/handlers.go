package handlers

import (
	"net/http"
	"path/filepath"

	"kiro2api/auth"
	"kiro2api/config"
	logutil "kiro2api/internal/adapter/httpapi/logging"
	"kiro2api/internal/adapter/upstream"
	"kiro2api/logger"
	"kiro2api/types"

	"github.com/gin-gonic/gin"
)

type Options struct {
	AuthService  *auth.AuthService
	TokenManager *auth.TokenManager
}

type Handler struct {
	authService  *auth.AuthService
	tokenManager *auth.TokenManager
	gateway      *upstream.Gateway
}

func New(opts Options) *Handler {
	return &Handler{
		authService:  opts.AuthService,
		tokenManager: opts.TokenManager,
		gateway:      upstream.NewGateway(),
	}
}

func (h *Handler) Register(r *gin.Engine) {
	staticDir := filepath.Join(".", "static")
	r.Static("/static", staticDir)
	r.GET("/", func(c *gin.Context) {
		c.File(filepath.Join(staticDir, "index.html"))
	})

	r.GET("/api/tokens", h.handleTokenPool)
	r.POST("/api/tokens/reload", h.handleTokenReload)
	r.POST("/api/tokens/toggle", h.handleTokenToggle)
	r.POST("/api/tokens/delete", h.handleTokenDelete)

	r.GET("/api/settings", h.handleGetSettings)
	r.POST("/api/settings", h.handleSaveSettings)

	r.GET("/v1/models", h.handleModels)

	r.POST("/v1/messages", h.handleAnthropicMessages)
	r.POST("/v1/messages/count_tokens", h.handleCountTokens)
	r.POST("/v1/chat/completions", h.handleOpenAICompletions)

	r.NoRoute(func(c *gin.Context) {
		logger.Warn("访问未知端点",
			logutil.AddFields(c,
				logger.String("path", c.Request.URL.Path),
				logger.String("method", c.Request.Method),
			)...)
		c.JSON(http.StatusNotFound, gin.H{"error": "404 未找到"})
	})
}

func (h *Handler) handleModels(c *gin.Context) {
	models := []types.Model{}
	for anthropicModel := range config.ModelMap {
		model := types.Model{
			ID:          anthropicModel,
			Object:      "model",
			Created:     1234567890,
			OwnedBy:     "anthropic",
			DisplayName: anthropicModel,
			Type:        "text",
			MaxTokens:   200000,
		}
		models = append(models, model)
	}

	response := types.ModelsResponse{
		Object: "list",
		Data:   models,
	}

	c.JSON(http.StatusOK, response)
}
