package handlers

import (
	"context"
	"database/sql"
	"encoding/json"
	"net/http"
	"os"

	"github.com/aashaybelekar/resumaze/internal/auth"
	dbpkg "github.com/aashaybelekar/resumaze/internal/db"
	"github.com/gin-gonic/gin"
	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
)

func googleOAuthConfig() *oauth2.Config {
	return &oauth2.Config{
		ClientID:     os.Getenv("GOOGLE_CLIENT_ID"),
		ClientSecret: os.Getenv("GOOGLE_CLIENT_SECRET"),
		RedirectURL:  os.Getenv("GOOGLE_REDIRECT_URL"),
		Scopes:       []string{"openid", "email", "profile"},
		Endpoint:     google.Endpoint,
	}
}

func GoogleLoginHandler(c *gin.Context) {
	cfg := googleOAuthConfig()
	// Use a fixed state for simplicity (production: use CSRF state)
	url := cfg.AuthCodeURL("state-token", oauth2.AccessTypeOffline)
	c.Redirect(http.StatusTemporaryRedirect, url)
}

func GoogleCallbackHandler(c *gin.Context, database *sql.DB) {
	cfg := googleOAuthConfig()
	code := c.Query("code")
	if code == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "missing code"})
		return
	}

	token, err := cfg.Exchange(context.Background(), code)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "token exchange failed"})
		return
	}

	client := cfg.Client(context.Background(), token)
	resp, err := client.Get("https://www.googleapis.com/oauth2/v3/userinfo")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get user info"})
		return
	}
	defer resp.Body.Close()

	var info struct {
		Sub     string `json:"sub"`
		Email   string `json:"email"`
		Name    string `json:"name"`
		Picture string `json:"picture"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&info); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to parse user info"})
		return
	}

	user, err := dbpkg.UpsertUser(database, info.Sub, info.Email, info.Name, info.Picture)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "database error"})
		return
	}

	accessToken, err := auth.CreateAccessToken(user.ID, user.Role)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "token error"})
		return
	}
	refreshToken, refreshExpiry, err := auth.CreateRefreshToken(user.ID, user.Role)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "token error"})
		return
	}

	if err := dbpkg.StoreRefreshToken(database, user.ID, refreshToken, refreshExpiry); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "database error"})
		return
	}

	secure := os.Getenv("GIN_MODE") == "release"
	c.SetCookie(auth.AccessTokenCookie, accessToken, 3600, "/", "", secure, true)
	c.SetCookie(auth.RefreshTokenCookie, refreshToken, 30*24*3600, "/", "", secure, true)

	frontendURL := os.Getenv("FRONTEND_URL")
	if frontendURL == "" {
		frontendURL = "http://localhost:3000"
	}
	c.Redirect(http.StatusTemporaryRedirect, frontendURL)
}

func MeHandler(c *gin.Context, database *sql.DB) {
	userID, _ := c.Get("user_id")
	user, err := dbpkg.GetUserByID(database, userID.(int))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "user not found"})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"id":      user.ID,
		"email":   user.Email,
		"name":    user.Name,
		"picture": user.Picture,
		"role":    user.Role,
	})
}

func LogoutHandler(c *gin.Context, database *sql.DB) {
	refreshToken, err := c.Cookie(auth.RefreshTokenCookie)
	if err == nil {
		_ = dbpkg.DeleteRefreshToken(database, refreshToken)
	}
	c.SetCookie(auth.AccessTokenCookie, "", -1, "/", "", false, true)
	c.SetCookie(auth.RefreshTokenCookie, "", -1, "/", "", false, true)
	c.JSON(http.StatusOK, gin.H{"message": "logged out"})
}
