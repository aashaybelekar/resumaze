package drive

import (
	"os"

	"google.golang.org/api/drive/v3"
)

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
