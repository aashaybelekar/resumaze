package db

import (
	"database/sql"
	"fmt"
	"log"
	"os"
	"time"

	_ "github.com/lib/pq"
)

func Connect() (*sql.DB, error) {
	host := os.Getenv("POSTGRES_HOST")
	port := os.Getenv("POSTGRES_PORT")
	user := os.Getenv("POSTGRES_USER")
	password := os.Getenv("POSTGRES_PASSWORD")
	dbname := os.Getenv("POSTGRES_DB")

	connStr := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
		host, port, user, password, dbname)

	db, err := sql.Open("postgres", connStr)
	if err != nil {
		return nil, err
	}

	// Retry ping 5 times
	for i := 0; i < 5; i++ {
		if err := db.Ping(); err == nil {
			log.Println("✅ Connected to PostgreSQL!")
			return db, nil
		}
		time.Sleep(time.Second)
	}

	return nil, fmt.Errorf("failed to connect to DB after retries")
}
