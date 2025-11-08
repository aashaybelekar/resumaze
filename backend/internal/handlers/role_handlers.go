package handlers

import (
	"database/sql"
	"net/http"

	"github.com/aashaybelekar/resumaze/internal/db"
	"github.com/gin-gonic/gin"
)

func CreateJobRoleHandler(c *gin.Context, dbClient *sql.DB) {
	var req struct {
		Name string `json:"name"`
	}
	if err := c.BindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid JSON"})
		return
	}

	succ, err := db.CreateJobRole(dbClient, req.Name)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if succ {
		c.JSON(http.StatusOK, gin.H{"message": "JobRole created"})
	} else {
		c.JSON(http.StatusOK, gin.H{"message": "JobRole already exists"})
	}
}

func DeleteJobRoleHandler(c *gin.Context, dbClient *sql.DB) {
	var req struct {
		Name string `json:"name"`
	}
	if err := c.BindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid JSON"})
		return
	}
	err := db.DeleteJobRole(dbClient, req.Name)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	} else {
		c.JSON(http.StatusOK, gin.H{"message": "JobRole deleted"})
	}

}
