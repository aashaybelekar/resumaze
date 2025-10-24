package main

import (
	"fmt"
	"log"

	"github.com/aashaybelekar/resumaze/internal/drive"
)

func main() {
	// Path to your service account JSON
	jsonPath := "./secrets/aerobic-star-420405-1ae031724f9b.json"

	srv, err := drive.NewDriveService(jsonPath)
	if err != nil {
		log.Fatalf("Failed to create drive service: %v", err)
	}

	// Example: list first 10 files
	fileList, err := srv.Files.List().Q("mimeType='application/vnd.google-apps.folder'").PageSize(10).Fields("files(id, name)").Do()
	if err != nil {
		log.Fatalf("Unable to retrieve files: %v", err)
	}

	fmt.Println("Files:")
	for _, f := range fileList.Files {
		fmt.Printf("%s (%s)\n", f.Name, f.Id)
	}
}
