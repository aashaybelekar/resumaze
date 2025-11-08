package handlers

import (
	"database/sql"
	"net/http"

	"github.com/aashaybelekar/resumaze/internal/db"
	"github.com/gin-gonic/gin"
)

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
	var req struct {
		Name string `json:"name"`
	}
	if err := c.BindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid JSON"})
		return
	}
	err := db.DeleteStage(dbClient, req.Name)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	} else {
		c.JSON(http.StatusOK, gin.H{"message": "Stage deleted"})
	}

}
