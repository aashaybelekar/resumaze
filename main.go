package main

import (
	"fmt"
	"log"

	"github.com/aashaybelekar/resumaze/internal/drive"
)

func main() {
	jsonPath := "./secrets/client_secret_423643519548-tau2b80al0q8iqnj2ok1kl1njig800a6.apps.googleusercontent.com.json"
	folderID := "1CPxLOE5VQtZfLUTuaJYsZJIAwoBmr8af" // the folder you shared with the service account
	filePath := "./data/map.pdf"                    // the local file you want to upload

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
