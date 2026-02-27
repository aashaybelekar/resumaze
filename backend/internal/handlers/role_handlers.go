package handlers

import (
	"database/sql"
	"net/http"

	"github.com/aashaybelekar/resumaze/internal/db"
	"github.com/gin-gonic/gin"
)

func ListJobRolesHandler(c *gin.Context, dbClient *sql.DB) {
	jobRoles, err := db.ListJobRole(dbClient)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
	}
	c.JSON(http.StatusOK, jobRoles)
}

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
	// Get the name from the URL parameter, not the body
	name := c.Param("name")
	if name == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Job role name is required in URL"})
		return
	}

	err := db.DeleteJobRole(dbClient, name)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "JobRole deleted"})
}
