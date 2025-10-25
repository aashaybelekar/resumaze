package main

import (
	"database/sql"
	"fmt"
	"log"
	"os"
	"time"

	// "github.com/aashaybelekar/resumaze/internal/drive"
	pdb "github.com/aashaybelekar/resumaze/internal/db"
	"github.com/joho/godotenv"
	_ "github.com/lib/pq"
)

func main() {
	err := godotenv.Load(".env")
	if err != nil {
		log.Fatalf("Failed loading env file: %v", err)
	}

	// // Uncomment to Initialize Drive Service
	// jsonPath := os.Getenv("AUTH_JSON_PATH")
	// folderID := os.Getenv("FOLDER_ID")
	// filePath := "./data/map.pdf" // the local file you want to upload

	// srv, err := drive.NewAuthDriveService(jsonPath)
	// if err != nil {
	// 	log.Fatalf("Failed to create drive service: %v", err)
	// }

	// // Uncomment to check which files does the service has access to.
	// files, err := srv.Files.List().Do()
	// if err != nil {
	// 	log.Fatalf("Failed to fetch files: %v", err)
	// }
	// fmt.Println("Available Files:")
	// for _, f := range files.Files {
	// 	fmt.Printf("%s, id: %s\n", f.Name, f.Id)
	// }

	// // Uncomment to upload files
	// uploadedFile, err := drive.UploadFile(srv, folderID, filePath)
	// if err != nil {
	// 	log.Fatalf("Failed to upload file: %v", err)
	// }
	// fmt.Printf("File uploaded successfully: %s (%s)\n", uploadedFile.Name, uploadedFile.Id)

	host := os.Getenv("POSTGRES_HOST")
	port := os.Getenv("POSTGRES_PORT")
	user := os.Getenv("POSTGRES_USER")
	password := os.Getenv("POSTGRES_PASSWORD")
	dbname := os.Getenv("POSTGRES_DB")

	connStr := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
		host, port, user, password, dbname)

	db, err := sql.Open("postgres", connStr)
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	for i := 0; i < 5; i++ {
		if err := db.Ping(); err == nil {
			fmt.Println("Sucessfully Connected!")
			break
		}
		time.Sleep(time.Second)
	}

	err = pdb.InitDB(db)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Println("Initialization Complete!")

	succ, err := pdb.CreateStage(db, "Round 0")
	if err != nil {
		log.Fatal(err)
	}
	if succ {
		fmt.Printf("Success Inserted Stage: %v", succ)
	} else {
		fmt.Println("Already Existed Stage")
	}

	succ, err = pdb.CreateJobRole(db, "AI")
	if err != nil {
		log.Fatal(err)
	}
	if succ {
		fmt.Printf("Success Inserted JobRole: %v", succ)
	} else {
		fmt.Println("Already Existed JobRole")
	}

	succ, err = pdb.CreateResume(db, 1, "AI", "Round 0")
	if err != nil {
		log.Fatal(err)
	}
	if succ {
		fmt.Printf("Success Inserted Resume: %v", succ)
	} else {
		fmt.Println("Already Existed Resume")
	}


}
