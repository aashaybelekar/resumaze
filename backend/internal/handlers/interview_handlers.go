package handlers

import (
	"database/sql"
	"net/http"
	"strconv"

	"github.com/aashaybelekar/resumaze/internal/db"
	"github.com/gin-gonic/gin"
)

func ListInterviewsHandler(c *gin.Context, dbClient *sql.DB) {
	idStr := c.Param("id")
	candidateID, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid candidate ID"})
		return
	}

	interviews, err := db.ListInterviewsByCandidate(dbClient, candidateID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, interviews)
}

func CreateInterviewHandler(c *gin.Context, dbClient *sql.DB) {
	idStr := c.Param("id")
	candidateID, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid candidate ID"})
		return
	}

	var iv db.Interview
	if err := c.BindJSON(&iv); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid JSON"})
		return
	}
	iv.CandidateID = candidateID

	id, err := db.CreateInterview(dbClient, iv)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"id": id})
}

func UpdateInterviewHandler(c *gin.Context, dbClient *sql.DB) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid interview ID"})
		return
	}

	var iv db.Interview
	if err := c.BindJSON(&iv); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid JSON"})
		return
	}

	if err := db.UpdateInterview(dbClient, id, iv); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "interview updated"})
}

func DeleteInterviewHandler(c *gin.Context, dbClient *sql.DB) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid interview ID"})
		return
	}

	if err := db.DeleteInterview(dbClient, id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "interview deleted"})
}
