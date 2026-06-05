package handlers

import (
	"context"
	"database/sql"
	"fmt"
	"net/http"
	"strconv"

	calendarPkg "github.com/aashaybelekar/resumaze/internal/calendar"
	"github.com/aashaybelekar/resumaze/internal/db"
	"github.com/gin-gonic/gin"
)

// tryCreateCalendarEvent attempts to create a Google Calendar event for an interview.
// Returns (meetLink, htmlLink, warningMessage). On any failure it returns a non-empty warning
// so the caller can surface it to the user instead of silently dropping it.
func tryCreateCalendarEvent(c *gin.Context, dbClient *sql.DB, interviewID, candidateID int, iv db.Interview) (meetLink, htmlLink, warning string) {
	userIDVal, exists := c.Get("user_id")
	if !exists {
		return "", "", "Calendar invite skipped: session missing user context"
	}
	userID, ok := userIDVal.(int)
	if !ok {
		return "", "", "Calendar invite skipped: invalid session"
	}

	accessToken, refreshToken, expiry, tokenErr := db.GetUserGoogleToken(dbClient, userID)
	if tokenErr != nil || (accessToken == "" && refreshToken == "") {
		return "", "", "Calendar invite skipped: Google account not connected — re-login to link it"
	}

	resume, resumeErr := db.GetResumeByID(dbClient, candidateID)
	user, userErr := db.GetUserByID(dbClient, userID)
	if resumeErr != nil || userErr != nil {
		return "", "", fmt.Sprintf("Calendar invite skipped: could not load required data (%v / %v)", resumeErr, userErr)
	}

	ctx := context.Background()
	svc, svcErr := calendarPkg.NewCalendarService(ctx, accessToken, refreshToken, expiry)
	if svcErr != nil {
		return "", "", fmt.Sprintf("Calendar invite skipped: failed to connect to Google Calendar: %v", svcErr)
	}

	candidateName := resume.FirstName + " " + resume.LastName
	attendees := []string{user.Email}
	if resume.Email != "" {
		attendees = append(attendees, resume.Email)
	}

	eventID, eventHTML, meet, calErr := calendarPkg.CreateInterviewEvent(
		svc,
		candidateName,
		iv.Interviewer,
		resume.Role,
		*iv.InterviewDate,
		attendees,
	)
	if calErr != nil {
		return "", "", fmt.Sprintf("Calendar invite failed: %v", calErr)
	}

	if dbErr := db.SetInterviewCalendarInfo(dbClient, interviewID, eventID, eventHTML, meet); dbErr != nil {
		fmt.Printf("[calendar] failed to save calendar info for interview %d: %v\n", interviewID, dbErr)
	}

	return meet, eventHTML, ""
}

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

	resp := gin.H{"id": id}

	// Create Google Calendar event with auto-generated Meet link.
	if iv.InterviewDate != nil && *iv.InterviewDate != "" {
		meetLink, htmlLink, calWarning := tryCreateCalendarEvent(c, dbClient, id, candidateID, iv)
		if calWarning != "" {
			resp["calendar_warning"] = calWarning
		}
		if meetLink != "" {
			resp["meet_link"] = meetLink
		}
		if htmlLink != "" {
			resp["calendar_event_link"] = htmlLink
		}
	}

	c.JSON(http.StatusCreated, resp)
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

	// Attempt to delete calendar event before removing from DB
	interview, err := db.GetInterviewByID(dbClient, id)
	if err == nil && interview.CalendarEventID != "" {
		userIDVal, exists := c.Get("user_id")
		if exists {
			if userID, ok := userIDVal.(int); ok {
				accessToken, refreshToken, expiry, tokenErr := db.GetUserGoogleToken(dbClient, userID)
				if tokenErr == nil && (accessToken != "" || refreshToken != "") {
					ctx := context.Background()
					if svc, svcErr := calendarPkg.NewCalendarService(ctx, accessToken, refreshToken, expiry); svcErr == nil {
						_ = calendarPkg.DeleteCalendarEvent(svc, interview.CalendarEventID)
					}
				}
			}
		}
	}

	if err := db.DeleteInterview(dbClient, id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "interview deleted"})
}
