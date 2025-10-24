package drive

import (
	"context"

	"google.golang.org/api/drive/v3"
	"google.golang.org/api/option"
)

func NewSharedDriveService(jsonKeyPath string) (*drive.Service, error) {
	ctx := context.Background()

	srv, err := drive.NewService(ctx, option.WithCredentialsFile(jsonKeyPath))
	if err != nil {
		return nil, err
	}

	return srv, nil
}
