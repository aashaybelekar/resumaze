package drive

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"

	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
	"google.golang.org/api/drive/v3"
	"google.golang.org/api/option"
)

func getClient(config *oauth2.Config) *http.Client {
	tokenFile := "./secrets/token.json"

	// Try loading saved token
	tok, err := tokenFromFile(tokenFile)
	if err != nil {
		// Generate auth URL
		authURL := config.AuthCodeURL("state-token", oauth2.AccessTypeOffline)
		fmt.Println("Go to the following link in your browser and paste the code here:")
		fmt.Println(authURL)

		// Read code from console
		fmt.Print("Enter authorization code: ")
		var code string
		fmt.Scan(&code)

		// Exchange code for token
		tok, err = config.Exchange(context.Background(), code)
		if err != nil {
			log.Fatalf("Unable to retrieve token from web: %v", err)
		}

		// Save token for future runs
		saveToken(tokenFile, tok)
	}

	return config.Client(context.Background(), tok)
}

func tokenFromFile(file string) (*oauth2.Token, error) {
	f, err := os.Open(file)
	if err != nil {
		return nil, err
	}
	defer f.Close()
	tok := &oauth2.Token{}
	err = json.NewDecoder(f).Decode(tok)
	return tok, err
}

func saveToken(path string, token *oauth2.Token) {
	dir := filepath.Dir(path)
	err := os.MkdirAll(dir, os.ModePerm)
	if err != nil {
		log.Fatalf("failed to create directory: %v", err)
	}

	f, err := os.Create(path)
	if err != nil {
		log.Fatalf("Unable to save OAuth token: %v", err)
	}

	defer f.Close()
	json.NewEncoder(f).Encode(token)
}

func NewAuthDriveService(clientSecretPath string) (*drive.Service, error) {
	b, err := os.ReadFile(clientSecretPath)
	if err != nil {
		return nil, err
	}

	config, err := google.ConfigFromJSON(b, drive.DriveScope)
	if err != nil {
		fmt.Println("YEP THIS IS ISSUE.")
		return nil, err
	}

	client := getClient(config)
	return drive.NewService(context.Background(), option.WithHTTPClient(client))
}

func NewAuthJWTDriveService(jsonPath string) (*drive.Service, error) {
	ctx := context.Background()

	b, err := os.ReadFile(jsonPath)
	if err != nil {
		return nil, fmt.Errorf("unable to read service account file: %v", err)
	}

	config, err := google.JWTConfigFromJSON(b, drive.DriveFileScope)
	if err != nil {
		return nil, fmt.Errorf("unable to parse service account file: %v", err)
	}

	client := config.Client(ctx)

	srv, err := drive.NewService(ctx, option.WithHTTPClient(client))
	if err != nil {
		return nil, fmt.Errorf("unable to create drive service: %v", err)
	}

	return srv, nil
}
