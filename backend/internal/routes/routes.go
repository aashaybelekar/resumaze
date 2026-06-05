package routes

import (
	"database/sql"

	"github.com/aashaybelekar/resumaze/internal/handlers"
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"google.golang.org/api/drive/v3"
)

func SetupRouter(db *sql.DB, srv *drive.Service) *gin.Engine {
	router := gin.Default()
	router.Use(cors.Default())

	api := router.Group("/api/v1")
	{
		api.POST("/stage", func(c *gin.Context) { handlers.CreateStageHandler(c, db) })
		api.GET("/stage", func(c *gin.Context) { handlers.ListStagesHandler(c, db) })
		api.DELETE("/stage/:name", func(c *gin.Context) { handlers.DeleteStageHandler(c, db) })
		api.PUT("/stage/reorder", func(c *gin.Context) { handlers.ReorderStagesHandler(c, db) })

		api.POST("/jobrole", func(c *gin.Context) { handlers.CreateJobRoleHandler(c, db) })
		api.GET("/jobrole", func(c *gin.Context) { handlers.ListJobRolesHandler(c, db) })
		api.DELETE("/jobrole/:name", func(c *gin.Context) { handlers.DeleteJobRoleHandler(c, db) })

		// Static resume routes must come before /:id parameterized routes
		api.POST("/resume/bulk-stage", func(c *gin.Context) { handlers.BulkStageChangeHandler(c, db) })
		api.GET("/resume/export", func(c *gin.Context) { handlers.ExportResumesCSVHandler(c, db) })
		api.GET("/resume/duplicates", func(c *gin.Context) { handlers.GetDuplicatesHandler(c, db) })
		api.GET("/resume/archived", func(c *gin.Context) { handlers.ListArchivedHandler(c, db) })
		api.POST("/resume/upload", func(c *gin.Context) { handlers.UploadToDriveHandler(c, db, srv) })

		api.POST("/resume", func(c *gin.Context) { handlers.CreateResumeHandler(c, db) })
		api.GET("/resume", func(c *gin.Context) { handlers.ListResumesHandler(c, db) })
		api.GET("/resume/:id", func(c *gin.Context) { handlers.GetResumeHandler(c, db) })
		api.PUT("/resume/:id", func(c *gin.Context) { handlers.UpdateResumeDetailsHandler(c, db) })
		api.PUT("/resume/:id/stage", func(c *gin.Context) { handlers.ChangeApplicationStageHandler(c, db) })
		api.PUT("/resume/:id/role", func(c *gin.Context) { handlers.ChangeApplicationRoleHandler(c, db) })
		api.DELETE("/resume/:id", func(c *gin.Context) { handlers.DeleteFromDriveHandler(c, db, srv) })
		api.DELETE("/resume/:id/permanent", func(c *gin.Context) { handlers.PermanentDeleteHandler(c, db, srv) })

		api.GET("/resume/:id/interviews", func(c *gin.Context) { handlers.ListInterviewsHandler(c, db) })
		api.POST("/resume/:id/interviews", func(c *gin.Context) { handlers.CreateInterviewHandler(c, db) })
		api.PUT("/interview/:id", func(c *gin.Context) { handlers.UpdateInterviewHandler(c, db) })
		api.DELETE("/interview/:id", func(c *gin.Context) { handlers.DeleteInterviewHandler(c, db) })

		api.GET("/resume/:id/notes", func(c *gin.Context) { handlers.ListNotesHandler(c, db) })
		api.POST("/resume/:id/notes", func(c *gin.Context) { handlers.CreateNoteHandler(c, db) })
		api.DELETE("/note/:id", func(c *gin.Context) { handlers.DeleteNoteHandler(c, db) })

		api.GET("/analytics", func(c *gin.Context) { handlers.GetAnalyticsHandler(c, db) })

		api.GET("/health", func(c *gin.Context) { handlers.HealthCheck(c) })
	}

	return router
}
