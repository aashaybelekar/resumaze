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

func ChangeApplicationStageHandler(c *gin.Context, dbClient *sql.DB) {
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

	err = db.ChangeApplicationStage(dbClient, ID, req.Stage)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Application moved"})
}

func ChangeApplicationRoleHandler(c *gin.Context, dbClient *sql.DB) {
	idString := c.Param("id")
	ID, err := strconv.Atoi(idString)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
		return
	}
	var req struct {
		Role string `json:"role"`
	}
	if err := c.BindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid JSON"})
		return
	}

	err = db.ChangeApplicationRole(dbClient, ID, req.Role)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Application role changed"})
}

func CreateResumeHandler(c *gin.Context, dbClient *sql.DB) {
	var req struct {
		ID       string `json:"id"`
		FileName string `json:"filename"`
		JobRole  string `json:"jobrole"`
		Stage    string `json:"stage"`
	}
	if err := c.BindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid JSON"})
		return
	}

	succ, err := db.CreateResume(dbClient, req.ID, req.FileName, req.JobRole, req.Stage)
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
