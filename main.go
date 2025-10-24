package main

import (
	"fmt"
	"log"
	"os"

	"github.com/aashaybelekar/resumaze/internal/drive"
	"github.com/joho/godotenv"
)

func main() {
	err := godotenv.Load("./secrets/.env")
	if err != nil {
		log.Fatalf("Failed loading env file: %v", err)
	}

	jsonPath := os.Getenv("AUTH_JSON_PATH")
	folderID := os.Getenv("FOLDER_ID")
	filePath := "./data/map.pdf" // the local file you want to upload

	srv, err := drive.NewAuthDriveService(jsonPath)
	if err != nil {
		log.Fatalf("Failed to create drive service: %v", err)
	}

	// // Uncomment to check which files does the service has access to.
	// files, err := srv.Files.List().Do()
	// if err != nil {
	// 	log.Fatalf("Failed to fetch files: %v", err)
	// }
	// fmt.Println("Available Files:")
	// for _, f := range files.Files {
	// 	fmt.Printf("%s, id: %s\n", f.Name, f.Id)
	// }

	uploadedFile, err := drive.UploadFile(srv, folderID, filePath)
	if err != nil {
		log.Fatalf("Failed to upload file: %v", err)
	}

	fmt.Printf("File uploaded successfully: %s (%s)\n", uploadedFile.Name, uploadedFile.Id)
}
