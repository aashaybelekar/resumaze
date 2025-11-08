package main

import (
	"log"
	"os"

	"github.com/aashaybelekar/resumaze/internal/db"
	"github.com/aashaybelekar/resumaze/internal/routes"
	"github.com/joho/godotenv"
)

func main() {
	err := godotenv.Load(".env")
	if err != nil {
		log.Fatalf("Failed loading env file: %v", err)
	}

	// Connect DB
	database, err := db.Connect()
	if err != nil {
		log.Fatal("DB connection failed:", err)
	}
	defer database.Close()

	// Initialize DB (create tables if not exist)
	if err := db.InitDB(database); err != nil {
		log.Fatal("DB initialization failed:", err)
	}

	// Setup router and inject DB instance
	router := routes.SetupRouter(database)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("🚀 Server running on port %s", port)
	router.Run(":" + port)
}
