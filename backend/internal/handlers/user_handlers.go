package handlers

import (
	"database/sql"
	"net/http"
	"strconv"

	dbpkg "github.com/aashaybelekar/resumaze/internal/db"
	"github.com/gin-gonic/gin"
)

func GetUsersHandler(c *gin.Context, database *sql.DB) {
	users, err := dbpkg.GetAllUsers(database)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch users"})
		return
	}

	type userResponse struct {
		ID           int    `json:"id"`
		Email        string `json:"email"`
		Name         string `json:"name"`
		Picture      string `json:"picture"`
		Role         string `json:"role"`
		Approved     bool   `json:"approved"`
		IsSuperAdmin bool   `json:"is_super_admin"`
	}

	result := make([]userResponse, len(users))
	for i, u := range users {
		result[i] = userResponse{
			ID:           u.ID,
			Email:        u.Email,
			Name:         u.Name,
			Picture:      u.Picture,
			Role:         u.Role,
			Approved:     u.Approved,
			IsSuperAdmin: dbpkg.IsSuperAdminEmail(u.Email),
		}
	}
	c.JSON(http.StatusOK, result)
}

func UpdateUserApprovedHandler(c *gin.Context, database *sql.DB) {
	idStr := c.Param("id")
	userID, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid user id"})
		return
	}

	var body struct {
		Approved bool `json:"approved"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}

	target, err := dbpkg.GetUserByID(database, userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		return
	}
	if dbpkg.IsSuperAdminEmail(target.Email) && !body.Approved {
		c.JSON(http.StatusForbidden, gin.H{"error": "cannot revoke super admin access"})
		return
	}

	if err := dbpkg.UpdateUserApproved(database, userID, body.Approved); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update user"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

func UpdateUserRoleHandler(c *gin.Context, database *sql.DB) {
	idStr := c.Param("id")
	userID, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid user id"})
		return
	}

	currentUserID, _ := c.Get("user_id")
	if currentUserID.(int) == userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "cannot change your own role"})
		return
	}

	var body struct {
		Role string `json:"role"`
	}
	if err := c.ShouldBindJSON(&body); err != nil || (body.Role != "admin" && body.Role != "user") {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid role"})
		return
	}

	target, err := dbpkg.GetUserByID(database, userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		return
	}
	if dbpkg.IsSuperAdminEmail(target.Email) {
		c.JSON(http.StatusForbidden, gin.H{"error": "cannot change super admin role"})
		return
	}

	if err := dbpkg.UpdateUserRole(database, userID, body.Role); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update user"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}
