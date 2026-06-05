package db

import (
	"crypto/sha256"
	"database/sql"
	"fmt"
	"os"
	"strings"
	"time"
)

type User struct {
	ID        int
	GoogleID  string
	Email     string
	Name      string
	Picture   string
	Role      string
	Approved  bool
	CreatedAt time.Time
}

func isAdminEmail(email string) bool {
	raw := os.Getenv("ADMIN_EMAILS")
	if raw == "" {
		return false
	}
	for _, e := range strings.Split(raw, ",") {
		if strings.EqualFold(strings.TrimSpace(e), email) {
			return true
		}
	}
	return false
}

func IsSuperAdminEmail(email string) bool {
	raw := os.Getenv("SUPER_ADMIN_EMAILS")
	if raw == "" {
		return false
	}
	for _, e := range strings.Split(raw, ",") {
		if strings.EqualFold(strings.TrimSpace(e), email) {
			return true
		}
	}
	return false
}

func UpsertUser(db *sql.DB, googleID, email, name, picture string) (*User, error) {
	role := "user"
	approved := false
	if IsSuperAdminEmail(email) || isAdminEmail(email) {
		role = "admin"
		approved = true
	} else {
		var count int
		db.QueryRow(`SELECT COUNT(*) FROM users`).Scan(&count)
		if count == 0 {
			role = "admin"
			approved = true
		}
	}

	var user User
	err := db.QueryRow(`
		INSERT INTO users (google_id, email, name, picture, role, approved)
		VALUES ($1, $2, $3, $4, $5, $6)
		ON CONFLICT (google_id) DO UPDATE
			SET email = EXCLUDED.email,
				name = EXCLUDED.name,
				picture = EXCLUDED.picture,
				role = CASE WHEN $5 = 'admin' THEN 'admin' ELSE users.role END,
				approved = CASE WHEN $5 = 'admin' THEN true ELSE users.approved END
		RETURNING id, google_id, email, name, picture, role, approved, created_at
	`, googleID, email, name, picture, role, approved).Scan(
		&user.ID, &user.GoogleID, &user.Email, &user.Name, &user.Picture, &user.Role, &user.Approved, &user.CreatedAt,
	)
	return &user, err
}

func GetUserByID(db *sql.DB, id int) (*User, error) {
	var user User
	err := db.QueryRow(`
		SELECT id, google_id, email, name, picture, role, approved, created_at
		FROM users WHERE id = $1
	`, id).Scan(&user.ID, &user.GoogleID, &user.Email, &user.Name, &user.Picture, &user.Role, &user.Approved, &user.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func GetAllUsers(db *sql.DB) ([]User, error) {
	rows, err := db.Query(`
		SELECT id, google_id, email, name, picture, role, approved, created_at
		FROM users ORDER BY created_at ASC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var users []User
	for rows.Next() {
		var u User
		if err := rows.Scan(&u.ID, &u.GoogleID, &u.Email, &u.Name, &u.Picture, &u.Role, &u.Approved, &u.CreatedAt); err != nil {
			return nil, err
		}
		users = append(users, u)
	}
	return users, rows.Err()
}

func UpdateUserRole(db *sql.DB, userID int, role string) error {
	_, err := db.Exec(`UPDATE users SET role = $1 WHERE id = $2`, role, userID)
	return err
}

func UpdateUserApproved(db *sql.DB, userID int, approved bool) error {
	_, err := db.Exec(`UPDATE users SET approved = $1 WHERE id = $2`, approved, userID)
	return err
}

func StoreRefreshToken(db *sql.DB, userID int, token string, expiresAt time.Time) error {
	hash := fmt.Sprintf("%x", sha256.Sum256([]byte(token)))
	_, err := db.Exec(`
		INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
		VALUES ($1, $2, $3)
	`, userID, hash, expiresAt)
	return err
}

func ValidateRefreshToken(db *sql.DB, token string) (int, error) {
	hash := fmt.Sprintf("%x", sha256.Sum256([]byte(token)))
	var userID int
	err := db.QueryRow(`
		SELECT user_id FROM refresh_tokens
		WHERE token_hash = $1 AND expires_at > NOW()
	`, hash).Scan(&userID)
	return userID, err
}

func DeleteRefreshToken(db *sql.DB, token string) error {
	hash := fmt.Sprintf("%x", sha256.Sum256([]byte(token)))
	_, err := db.Exec(`DELETE FROM refresh_tokens WHERE token_hash = $1`, hash)
	return err
}

func UpsertUserGoogleToken(db *sql.DB, userID int, accessToken, refreshToken string, expiry time.Time) error {
	_, err := db.Exec(`
		INSERT INTO user_google_tokens (user_id, access_token, refresh_token, expiry, updated_at)
		VALUES ($1, $2, $3, $4, NOW())
		ON CONFLICT (user_id) DO UPDATE
			SET access_token = EXCLUDED.access_token,
				refresh_token = CASE WHEN EXCLUDED.refresh_token != '' THEN EXCLUDED.refresh_token ELSE user_google_tokens.refresh_token END,
				expiry = EXCLUDED.expiry,
				updated_at = NOW()
	`, userID, accessToken, refreshToken, expiry)
	return err
}

func GetUserGoogleToken(db *sql.DB, userID int) (accessToken, refreshToken string, expiry time.Time, err error) {
	err = db.QueryRow(`
		SELECT access_token, COALESCE(refresh_token, ''), expiry
		FROM user_google_tokens WHERE user_id = $1
	`, userID).Scan(&accessToken, &refreshToken, &expiry)
	return
}
