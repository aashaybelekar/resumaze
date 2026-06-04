package drive

import (
	"fmt"
	"strings"

	"google.golang.org/api/drive/v3"
)

// MoveToDeleted moves a file to the /deleted folder under the given parent folder.
// If the deleted folder doesn't exist, it is created.
func MoveToDeleted(srv *drive.Service, fileID, parentFolderID string) (*drive.File, error) {
	deletedFolderID, err := getOrCreateDeletedFolder(srv, parentFolderID)
	if err != nil {
		return nil, fmt.Errorf("could not get or create deleted folder: %w", err)
	}

	file, err := srv.Files.Get(fileID).Fields("parents").Do()
	if err != nil {
		return nil, fmt.Errorf("could not fetch file parents: %w", err)
	}

	previousParents := strings.Join(file.Parents, ",")

	updated, err := srv.Files.Update(fileID, nil).
		AddParents(deletedFolderID).
		RemoveParents(previousParents).
		Fields("id, name, parents").
		Do()
	if err != nil {
		return nil, fmt.Errorf("could not move file to deleted folder: %w", err)
	}

	return updated, nil
}

func DeleteFile(srv *drive.Service, fileID string) error {
	return srv.Files.Delete(fileID).Do()
}

func getOrCreateDeletedFolder(srv *drive.Service, parentFolderID string) (string, error) {
	query := fmt.Sprintf(
		"mimeType='application/vnd.google-apps.folder' and name='deleted' and '%s' in parents and trashed=false",
		parentFolderID,
	)

	res, err := srv.Files.List().Q(query).Fields("files(id, name)").Do()
	if err != nil {
		return "", fmt.Errorf("could not search for deleted folder: %w", err)
	}

	if len(res.Files) > 0 {
		return res.Files[0].Id, nil
	}

	folder := &drive.File{
		Name:     "deleted",
		MimeType: "application/vnd.google-apps.folder",
		Parents:  []string{parentFolderID},
	}

	created, err := srv.Files.Create(folder).Fields("id").Do()
	if err != nil {
		return "", fmt.Errorf("could not create deleted folder: %w", err)
	}

	return created.Id, nil
}
