package routes

import (
	"database/sql"

	"github.com/aashaybelekar/resumaze/internal/handlers"
	"github.com/gin-gonic/gin"
)

func SetupRouter(db *sql.DB) *gin.Engine {
	router := gin.Default()

	api := router.Group("/api/v1")
	{
		api.POST("/stage", func(c *gin.Context) { handlers.CreateStageHandler(c, db) })
		api.DELETE("/stage/:name", func(c *gin.Context) { handlers.DeleteStageHandler(c, db) })
		api.POST("/jobrole", func(c *gin.Context) { handlers.CreateJobRoleHandler(c, db) })
		api.DELETE("/jobrole/:name", func(c *gin.Context) { handlers.DeleteJobRoleHandler(c, db) })
		api.POST("/resume", func(c *gin.Context) { handlers.CreateResumeHandler(c, db) })
		api.GET("/health", func(c *gin.Context) { handlers.HealthCheck(c) })
	}

	return router
}
