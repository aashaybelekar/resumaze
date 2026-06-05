package handlers

import (
	"database/sql"
	"net/http"

	"github.com/aashaybelekar/resumaze/internal/db"
	"github.com/gin-gonic/gin"
)

func ListStagesHandler(c *gin.Context, dbClient *sql.DB) {
	stages, err := db.ListStages(dbClient)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, stages)
}

func CreateStageHandler(c *gin.Context, dbClient *sql.DB) {
	var req struct {
		Name string `json:"name"`
	}
	if err := c.BindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid JSON"})
		return
	}

	succ, err := db.CreateStage(dbClient, req.Name)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if succ {
		c.JSON(http.StatusOK, gin.H{"message": "Stage created"})
	} else {
		c.JSON(http.StatusOK, gin.H{"message": "Stage already exists"})
	}
}

func DeleteStageHandler(c *gin.Context, dbClient *sql.DB) {
	// Get the name from the URL parameter, not the body
	name := c.Param("name")
	if name == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Stage name is required in URL"})
		return
	}

	err := db.DeleteStage(dbClient, name)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Stage deleted"})
}

func ReorderStagesHandler(c *gin.Context, dbClient *sql.DB) {
	var req struct {
		Names []string `json:"names"`
	}
	if err := c.BindJSON(&req); err != nil || len(req.Names) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	if err := db.ReorderStages(dbClient, req.Names); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Stages reordered"})
}
