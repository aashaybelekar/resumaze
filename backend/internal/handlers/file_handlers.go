package handlers

import (
	"database/sql"
	"fmt"
	"log"
	"net/http"
	"os"

	"github.com/aashaybelekar/resumaze/internal/db"
	gdrive "github.com/aashaybelekar/resumaze/internal/drive"
	"github.com/gin-gonic/gin"
	"google.golang.org/api/drive/v3"
)

func UploadToDriveHandler(c *gin.Context, database *sql.DB, srv *drive.Service) {
	folderID := os.Getenv("DRIVE_FOLDER_ID")

	// Parse form fields
	var req struct {
		Role  string `form:"role"`
		Stage string `form:"stage"`
	}

	if err := c.Bind(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid form data"})
		return
	}

	// Parse uploaded files
	form, err := c.MultipartForm()
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid multipart form"})
		return
	}

	files := form.File["file"]
	if len(files) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "no files uploaded"})
		return
	}

	uploadedCount := 0
	for _, f := range files {
		src, err := f.Open()
		if err != nil {
			log.Printf("failed to open file %s: %v", f.Filename, err)
			continue
		}
		defer src.Close()

		// Upload to Google Drive
		uploadedFile, err := gdrive.UploadStream(srv, folderID, src, f.Filename)
		if err != nil {
			log.Printf("upload failed for %s: %v", f.Filename, err)
			continue
		}

		// Save to DB
		succ, err := db.CreateResume(database, uploadedFile.Id, req.Role, req.Stage)
		if err != nil {
			log.Printf("db insert error for %s: %v", f.Filename, err)
			continue
		}
		if succ {
			uploadedCount++
		}
	}

	if uploadedCount > 0 {
		c.JSON(http.StatusOK, gin.H{"message": fmt.Sprintf("%d file(s) uploaded successfully", uploadedCount)})
	} else {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "no files were uploaded successfully"})
	}
}
