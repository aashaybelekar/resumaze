package ai

import (
	"bytes"
	"context"
	"database/sql"
	"fmt"
	"io"
	"log"
	"os"

	"github.com/ledongthuc/pdf"
	"github.com/aashaybelekar/resumaze/internal/db"
	"google.golang.org/api/drive/v3"
)

type ResumeData struct {
	CandidateName string  `json:"candidate_name"`
	PreviousCTC   float64 `json:"previous_ctc"`
	ExpectedCTC   float64 `json:"expected_ctc"`
	NoticePeriod  int     `json:"notice_period"`
	PhoneNumber   string  `json:"phone_number"`
	Email         string  `json:"email"`
}

const resumePrompt = `
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

// ParseResumeDetails extracts resume fields using Gemini if GOOGLE_STUDIO_API_KEY is set,
// otherwise falls back to Groq if GROQ_API_KEY is set.
func ParseResumeDetails(database *sql.DB, fileID string, fileName string, pdfBytes []byte) {
	log.Printf("parsing resume: %s (fileID: %s)", fileName, fileID)
	text, err := ExtractTextFromPDF(pdfBytes)
	if err != nil {
		log.Printf("failed to extract text from PDF %s: %v", fileName, err)
		return
	}

	// // Key candidate info (name, CTC, phone, email) is always near the top
	// const maxTextChars = 4000
	// if len(text) > maxTextChars {
	// 	text = text[:maxTextChars]
	// }

	var resumeData *ResumeData

	geminiKey := os.Getenv("GOOGLE_STUDIO_API_KEY")
	groqKey := os.Getenv("GROQ_API_KEY")

	switch {
	case geminiKey != "":
		resumeData, err = parseWithGemini(context.Background(), geminiKey, text)
	case groqKey != "":
		resumeData, err = parseWithGroq(groqKey, text)
	default:
		log.Printf("no AI provider configured: set GOOGLE_STUDIO_API_KEY or GROQ_API_KEY")
		return
	}

	if err != nil {
		log.Printf("failed to parse resume %s: %v", fileName, err)
		return
	}

	if err := db.UpdateApplicationWithResumeData(database, fileID,
		resumeData.CandidateName, resumeData.PreviousCTC, resumeData.ExpectedCTC,
		resumeData.NoticePeriod, resumeData.PhoneNumber, resumeData.Email,
	); err != nil {
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
