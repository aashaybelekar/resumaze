package handlers

import (
	"database/sql"
	"net/http"

	"github.com/aashaybelekar/resumaze/internal/db"
	"github.com/gin-gonic/gin"
)

func GetAnalyticsHandler(c *gin.Context, dbClient *sql.DB) {
	analytics, err := db.GetAnalytics(dbClient)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, analytics)
}

func GetDuplicatesHandler(c *gin.Context, dbClient *sql.DB) {
	groups, err := db.FindDuplicateCandidates(dbClient)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, groups)
}
