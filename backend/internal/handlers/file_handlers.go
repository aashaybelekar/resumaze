package handlers

import (
	"bytes"
	"database/sql"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strconv"

	"github.com/aashaybelekar/resumaze/internal/ai"
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
		pdfBytes, err := io.ReadAll(src)
		if err != nil {
			log.Printf("failed to read file %s: %v", f.Filename, err)
			continue
		}

		// Upload to Google Drive
		uploadedFile, err := gdrive.UploadStream(srv, folderID, bytes.NewReader(pdfBytes), f.Filename)
		if err != nil {
			log.Printf("upload failed for %s: %v", f.Filename, err)
			continue
		}

		// Save to DB
		succ, err := db.CreateResume(database, uploadedFile.Id, uploadedFile.Name, req.Role, req.Stage)
		if err != nil {
			log.Printf("db insert error for %s: %v", f.Filename, err)
			continue
		}
		if succ {
			uploadedCount++
			go ai.ParseResumeDetails(database, uploadedFile.Id, uploadedFile.Name, pdfBytes)
		}
	}

	if uploadedCount > 0 {
		c.JSON(http.StatusOK, gin.H{"message": fmt.Sprintf("%d file(s) uploaded successfully", uploadedCount)})
	} else {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "no files were uploaded successfully"})
	}
}

func DeleteFromDriveHandler(c *gin.Context, database *sql.DB, srv *drive.Service) {
	folderID := os.Getenv("DRIVE_FOLDER_ID")

	idStr := c.Param("id")
	applicationID, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid resume ID"})
		return
	}

	driveFileID, err := db.DeleteResume(database, applicationID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if _, err := gdrive.MoveToDeleted(srv, driveFileID, folderID); err != nil {
		log.Printf("DB record removed but drive move failed for file %s: %v", driveFileID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "resume removed from DB but could not move file on Drive: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "resume moved to deleted"})
}
