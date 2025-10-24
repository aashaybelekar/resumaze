package drive

import (
	"context"
	"os"

	"google.golang.org/api/drive/v3"
	"google.golang.org/api/option"
)

// NewDriveService creates a Google Drive service using a service account JSON key
func NewDriveService(jsonKeyPath string) (*drive.Service, error) {
	ctx := context.Background()

	// Use the service account JSON file
	srv, err := drive.NewService(ctx, option.WithCredentialsFile(jsonKeyPath))
	if err != nil {
		return nil, err
	}

	return srv, nil
}

func UploadFile(srv *drive.Service, folderID, localFilePath string) (*drive.File, error) {
	f, err := os.Open(localFilePath)
	if err != nil {
		return nil, err
	}
	defer f.Close()

	fileName := f.Name()
	driveFile := &drive.File{
		Name:    fileName,
		Parents: []string{folderID}, // specify the folder
	}

	uploadedFile, err := srv.Files.Create(driveFile).Media(f).Do()
	if err != nil {
		return nil, err
	}

	return uploadedFile, nil
}
