package handlers

import (
	"database/sql"
	"net/http"
	"strconv"

	"github.com/aashaybelekar/resumaze/internal/db"
	"github.com/gin-gonic/gin"
)

func ListResumesHandler(c *gin.Context, dbClient *sql.DB) {
	resumes, err := db.ListResumes(dbClient)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, resumes)
}

func MoveApplicationHandler(c *gin.Context, dbClient *sql.DB) {
	idString := c.Param("id")
	ID, err := strconv.Atoi(idString)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
		return
	}
	var req struct {
		Stage string `json:"stage"`
	}
	if err := c.BindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid JSON"})
		return
	}

	err = db.MoveApplication(dbClient, ID, req.Stage)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Application moved"})
}

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
