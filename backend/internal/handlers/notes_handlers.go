package handlers

import (
	"database/sql"
	"net/http"
	"strconv"

	"github.com/aashaybelekar/resumaze/internal/db"
	"github.com/gin-gonic/gin"
)

func ListNotesHandler(c *gin.Context, dbClient *sql.DB) {
	idStr := c.Param("id")
	applicationID, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid application ID"})
		return
	}

	notes, err := db.ListNotesByApplication(dbClient, applicationID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, notes)
}

func CreateNoteHandler(c *gin.Context, dbClient *sql.DB) {
	idStr := c.Param("id")
	applicationID, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid application ID"})
		return
	}

	var req struct {
		Content   string `json:"content"`
		CreatedBy string `json:"created_by"`
	}
	if err := c.BindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid JSON"})
		return
	}
	if req.Content == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "content is required"})
		return
	}

	id, err := db.CreateNote(dbClient, applicationID, req.Content, req.CreatedBy)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"id": id})
}

func DeleteNoteHandler(c *gin.Context, dbClient *sql.DB) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid note ID"})
		return
	}

	if err := db.DeleteNote(dbClient, id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "note deleted"})
}
