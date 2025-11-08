package handlers

import (
	"database/sql"
	"net/http"

	"github.com/aashaybelekar/resumaze/internal/db"
	"github.com/gin-gonic/gin"
)



func CreateResumeHandler(c *gin.Context, dbClient *sql.DB) {
	var req struct {
		ID      int    `json:"id"`
		JobRole string `json:"jobrole"`
		Stage   string `json:"stage"`
	}
	if err := c.BindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid JSON"})
		return
	}

	succ, err := db.CreateResume(dbClient, req.ID, req.JobRole, req.Stage)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if succ {
		c.JSON(http.StatusOK, gin.H{"message": "Resume created"})
	} else {
		c.JSON(http.StatusOK, gin.H{"message": "Resume already exists"})
	}
}
