package ai

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"

	"github.com/ledongthuc/pdf"
	"github.com/aashaybelekar/resumaze/internal/db"
	"google.golang.org/api/drive/v3"
)

type GroqRequest struct {
	Model    string `json:"model"`
	Messages []struct {
		Role    string `json:"role"`
		Content string `json:"content"`
	} `json:"messages"`
	ResponseFormat struct {
		Type string `json:"type"`
	} `json:"response_format"`
	Stream bool `json:"stream"`
	MaxTokens int `json:"max_tokens"`
	Temperature float64 `json:"temperature"`
	ReasoningEffort string `json:"reasoning_effort"`
}

type GroqResponse struct {
	Choices []struct {
		Message struct {
			Content string `json:"content"`
		} `json:"message"`
	} `json:"choices"`
}

type ResumeData struct {
	CandidateName  string  `json:"candidate_name"`
	PreviousCTC    float64 `json:"previous_ctc"`
	ExpectedCTC    float64 `json:"expected_ctc"`
	NoticePeriod   int     `json:"notice_period"`
	PhoneNumber    string  `json:"phone_number"`
	Email          string  `json:"email"`
}

func ParseResumeDetails(database *sql.DB, fileID string, fileName string, pdfBytes []byte){
	text, err := ExtractTextFromPDF(pdfBytes)
	if err != nil {
		log.Fatal(err)
	}

	fmt.Println(text)	

	log.Printf("file content for %s: %s", fileName, text)

	apiKey := os.Getenv("GROQ_API_KEY")
	if apiKey == "" {
		log.Println("GROQ_API_KEY not set")
		return
	}

	url := "https://api.groq.com/openai/v1/chat/completions"

	prompt := `
	Extract the following fields from the resume and return STRICT JSON.

	Use EXACTLY these keys:
	{
	"candidate_name": string,
	"previous_ctc": number,
	"expected_ctc": number,
	"notice_period": number,
	"phone_number": string,
	"email": string
	}

	If a field is missing, return null.
	Do not return explanations.
	`

	reqBody := GroqRequest{
				Model: "openai/gpt-oss-20b",
				Messages: []struct {
					Role    string `json:"role"`
					Content string `json:"content"`
				}{
					{
						Role: "system",
						Content: prompt,
					},
					{
						Role: "user",
						Content: text,
					},
				},
				ResponseFormat: struct {
					Type string `json:"type"`
				}{
					Type: "json_object",
				},
				Stream: false,
				MaxTokens: 30000,
				Temperature: 1,
				ReasoningEffort: "medium",
			}

	jsonBody, err := json.Marshal(reqBody)
	if err != nil {
		log.Printf("failed to marshal request body for %s: %v", fileName, err)
		return
	}

	req, err := http.NewRequest("POST", url, bytes.NewBuffer(jsonBody))
	if err != nil {
		log.Printf("failed to create request for %s: %v", fileName, err)
		return
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+apiKey)

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		log.Printf("failed to send request to Groq API for %s: %v", fileName, err)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		log.Printf("Groq API request failed with status %d for %s: %s", resp.StatusCode, fileName, string(body))
		return
	}

	var groqResp GroqResponse
	if err := json.NewDecoder(resp.Body).Decode(&groqResp); err != nil {
		log.Printf("failed to decode Groq API response for %s: %v", fileName, err)
		return
	}

	if len(groqResp.Choices) == 0 {
		log.Printf("no choices in Groq API response for %s", fileName)
		return
	}

	var resumeData ResumeData
	if err := json.Unmarshal([]byte(groqResp.Choices[0].Message.Content), &resumeData); err != nil {
		log.Printf("failed to unmarshal resume data from Groq API response for %s: %v", fileName, err)
		return
	}

	log.Printf("parsed details for %s: %+v", fileName, resumeData)

	if err := db.UpdateApplicationWithResumeData(database, fileID, resumeData.CandidateName, resumeData.PreviousCTC, resumeData.ExpectedCTC, resumeData.NoticePeriod, resumeData.PhoneNumber, resumeData.Email); err != nil {
		log.Printf("failed to update application with resume data for %s: %v", fileName, err)
		return
	}

	log.Printf("successfully parsed and updated resume details for %s", fileName)
}

func DownloadFile(srv *drive.Service, fileID string) ([]byte, error) {
	resp, err := srv.Files.Get(fileID).Download()
	if err != nil {
		return nil, fmt.Errorf("failed to download file: %w", err)
	}
	defer resp.Body.Close()

	return io.ReadAll(resp.Body)
}


func ExtractTextFromPDF(pdfBytes []byte) (string, error) {
	reader, err := pdf.NewReader(bytes.NewReader(pdfBytes), int64(len(pdfBytes)))
	if err != nil {
		return "", err
	}

	var buf bytes.Buffer
	totalPage := reader.NumPage()

	for pageIndex := 1; pageIndex <= totalPage; pageIndex++ {
		page := reader.Page(pageIndex)
		if page.V.IsNull() {
			continue
		}
		text, err := page.GetPlainText(nil)
		if err != nil {
			return "", err
		}
		buf.WriteString(text)
	}

	return buf.String(), nil
}