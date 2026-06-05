package handlers

import (
	"database/sql"
	"encoding/csv"
	"errors"
	"net/http"
	"strconv"

	"github.com/aashaybelekar/resumaze/internal/db"
	"github.com/gin-gonic/gin"
)

func ListResumesHandler(c *gin.Context, dbClient *sql.DB) {
	f := db.ResumeFilter{
		Search: c.Query("search"),
		Stage:  c.Query("stage"),
		Role:   c.Query("role"),
	}

	if hg := c.Query("has_github"); hg == "true" {
		v := true
		f.HasGithub = &v
	} else if hg == "false" {
		v := false
		f.HasGithub = &v
	}

	if p, err := strconv.Atoi(c.DefaultQuery("page", "1")); err == nil && p > 0 {
		f.Page = p
	} else {
		f.Page = 1
	}
	if l, err := strconv.Atoi(c.DefaultQuery("limit", "20")); err == nil && l > 0 {
		f.Limit = l
	} else {
		f.Limit = 20
	}

	resumes, total, err := db.ListResumesFiltered(dbClient, f)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data":  resumes,
		"total": total,
		"page":  f.Page,
		"limit": f.Limit,
	})
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

func GetResumeHandler(c *gin.Context, dbClient *sql.DB) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid ID"})
		return
	}
	r, err := db.GetResumeByID(dbClient, id)
	if errors.Is(err, sql.ErrNoRows) {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, r)
}

func UpdateResumeDetailsHandler(c *gin.Context, dbClient *sql.DB) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid ID"})
		return
	}
	var req struct {
		FirstName   string `json:"first_name"`
		MiddleName  string `json:"middle_name"`
		LastName    string `json:"last_name"`
		Email       string `json:"email"`
		Phone       string `json:"phone"`
		CurrentCTC  string `json:"current_ctc"`
		ExpectedCTC string `json:"expected_ctc"`
	}
	if err := c.BindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid JSON"})
		return
	}
	if err := db.UpdateApplicationDetails(dbClient, id, req.FirstName, req.MiddleName, req.LastName, req.Email, req.Phone, req.CurrentCTC, req.ExpectedCTC); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "updated"})
}

func BulkStageChangeHandler(c *gin.Context, dbClient *sql.DB) {
	var req struct {
		IDs   []int  `json:"ids"`
		Stage string `json:"stage"`
	}
	if err := c.BindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid JSON"})
		return
	}
	if len(req.IDs) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ids must not be empty"})
		return
	}

	count, err := db.BulkChangeApplicationStage(dbClient, req.IDs, req.Stage)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"updated": count})
}

func ExportResumesCSVHandler(c *gin.Context, dbClient *sql.DB) {
	f := db.ResumeFilter{
		Search: c.Query("search"),
		Stage:  c.Query("stage"),
		Role:   c.Query("role"),
		Page:   1,
		Limit:  100,
	}
	if hg := c.Query("has_github"); hg == "true" {
		v := true
		f.HasGithub = &v
	} else if hg == "false" {
		v := false
		f.HasGithub = &v
	}

	var all []db.Resume
	for {
		batch, _, err := db.ListResumesFiltered(dbClient, f)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		all = append(all, batch...)
		if len(batch) < f.Limit {
			break
		}
		f.Page++
	}

	c.Header("Content-Type", "text/csv")
	c.Header("Content-Disposition", `attachment; filename="candidates.csv"`)

	w := csv.NewWriter(c.Writer)
	_ = w.Write([]string{"ID", "FirstName", "MiddleName", "LastName", "Email", "Phone", "HasGithub", "Stage", "Role"})
	for _, r := range all {
		_ = w.Write([]string{
			strconv.Itoa(r.ID),
			r.FirstName,
			r.MiddleName,
			r.LastName,
			r.Email,
			r.Phone,
			strconv.FormatBool(r.HasGithub),
			r.Stage,
			r.Role,
		})
	}
	w.Flush()
}
