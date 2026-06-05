package auth

import (
	"database/sql"
	"net/http"
	"os"
	"time"

	dbpkg "github.com/aashaybelekar/resumaze/internal/db"
	"github.com/gin-gonic/gin"
)

const AccessTokenCookie = "access_token"
const RefreshTokenCookie = "refresh_token"

func setTokenCookies(c *gin.Context, accessToken, refreshToken string, refreshExpiry time.Time) {
	secure := os.Getenv("GIN_MODE") == "release"
	c.SetCookie(AccessTokenCookie, accessToken, 3600, "/", "", secure, true)
	maxAge := int(time.Until(refreshExpiry).Seconds())
	c.SetCookie(RefreshTokenCookie, refreshToken, maxAge, "/", "", secure, true)
}

func clearTokenCookies(c *gin.Context) {
	c.SetCookie(AccessTokenCookie, "", -1, "/", "", false, true)
	c.SetCookie(RefreshTokenCookie, "", -1, "/", "", false, true)
}

func RequireAuth(database *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		accessToken, err := c.Cookie(AccessTokenCookie)
		if err == nil {
			claims, err := ParseToken(accessToken)
			if err == nil {
				// Always fetch from DB so role/approved changes take effect immediately
				user, err := dbpkg.GetUserByID(database, claims.UserID)
				if err != nil {
					c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "user not found"})
					return
				}
				c.Set("user_id", user.ID)
				c.Set("role", user.Role)
				c.Set("approved", user.Approved)
				c.Next()
				return
			}
		}

		// Try refresh token
		refreshToken, err := c.Cookie(RefreshTokenCookie)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
			return
		}

		userID, err := dbpkg.ValidateRefreshToken(database, refreshToken)
		if err != nil {
			clearTokenCookies(c)
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "session expired"})
			return
		}

		user, err := dbpkg.GetUserByID(database, userID)
		if err != nil {
			clearTokenCookies(c)
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "user not found"})
			return
		}

		newAccess, err := CreateAccessToken(user.ID, user.Role, user.Approved)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "token error"})
			return
		}

		newRefresh, refreshExpiry, err := CreateRefreshToken(user.ID, user.Role, user.Approved)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "token error"})
			return
		}

		_ = dbpkg.DeleteRefreshToken(database, refreshToken)
		_ = dbpkg.StoreRefreshToken(database, user.ID, newRefresh, refreshExpiry)
		setTokenCookies(c, newAccess, newRefresh, refreshExpiry)

		c.Set("user_id", user.ID)
		c.Set("role", user.Role)
		c.Set("approved", user.Approved)
		c.Next()
	}
}

func RequireApproved() gin.HandlerFunc {
	return func(c *gin.Context) {
		approved, exists := c.Get("approved")
		if !exists || approved != true {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "access pending approval"})
			return
		}
		c.Next()
	}
}

func RequireAdmin() gin.HandlerFunc {
	return func(c *gin.Context) {
		role, exists := c.Get("role")
		if !exists || role != "admin" {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "admin required"})
			return
		}
		c.Next()
	}
}
