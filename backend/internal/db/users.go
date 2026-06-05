package db

import (
	"crypto/sha256"
	"database/sql"
	"fmt"
	"time"
)

type User struct {
	ID        int
	GoogleID  string
	Email     string
	Name      string
	Picture   string
	Role      string
	CreatedAt time.Time
}

func UpsertUser(db *sql.DB, googleID, email, name, picture string) (*User, error) {
	var count int
	db.QueryRow(`SELECT COUNT(*) FROM users`).Scan(&count)

	role := "user"
	if count == 0 {
		role = "admin"
	}

	var user User
	err := db.QueryRow(`
		INSERT INTO users (google_id, email, name, picture, role)
		VALUES ($1, $2, $3, $4, $5)
		ON CONFLICT (google_id) DO UPDATE
			SET email = EXCLUDED.email,
				name = EXCLUDED.name,
				picture = EXCLUDED.picture
		RETURNING id, google_id, email, name, picture, role, created_at
	`, googleID, email, name, picture, role).Scan(
		&user.ID, &user.GoogleID, &user.Email, &user.Name, &user.Picture, &user.Role, &user.CreatedAt,
	)
	return &user, err
}

func GetUserByID(db *sql.DB, id int) (*User, error) {
	var user User
	err := db.QueryRow(`
		SELECT id, google_id, email, name, picture, role, created_at
		FROM users WHERE id = $1
	`, id).Scan(&user.ID, &user.GoogleID, &user.Email, &user.Name, &user.Picture, &user.Role, &user.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &user, nil
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
