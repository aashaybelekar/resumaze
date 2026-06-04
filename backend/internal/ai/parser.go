package ai

import (
	"bytes"
	"context"
	"database/sql"
	"fmt"
	"io"
	"log"
	"math"
	"os"
	"os/exec"
	"regexp"
	"sort"
	"strings"

	"github.com/aashaybelekar/resumaze/internal/db"
	"github.com/ledongthuc/pdf"
	"google.golang.org/api/drive/v3"
)

var (
	// Matches phone numbers: optional leading +, then a run of digits with allowed
	// separators (space, dash, dot, parens). Requires at least 7 digits total.
	rePhone = regexp.MustCompile(`\+?(?:\d[\s\-\.\(\)]*){6,}\d`)

	// Standard email pattern.
	reEmail = regexp.MustCompile(`[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}`)
)

type ResumeData struct {
	FirstName       string `json:"first_name"`
	MiddleName      string `json:"middle_name"`
	LastName        string `json:"last_name"`
	PhoneNumber     string `json:"phone_number"`
	Email           string `json:"email"`
	HasGithub       bool   `json:"has_github"`
	ExperienceYears int    `json:"experience_years"`
}

const resumePrompt = `
You are a resume parser. Extract the following fields from the resume text and return ONLY a JSON object with exactly these keys:

{
  "first_name": string,
  "middle_name": string,
  "last_name": string,
  "phone_number": string,
  "email": string,
  "has_github": boolean,
  "experience_years": number
}

Rules:
- "first_name", "last_name": the candidate's name from the top of the resume.
- "middle_name": middle name or initial if present, otherwise empty string "".
- "phone_number": the candidate's phone number. It may include a country code (e.g. +91, +1), dashes, spaces, or dots — return it exactly as it appears. Common patterns: +91-9900723962, +1 (555) 123-4567, 9900723962. The phone number is often near the top of the resume next to the email. Ignore any surrounding icon characters (symbols, boxes, unicode garbage) on the same line.
- "email": the candidate's email address (look for the @ symbol).
- "has_github": true if a GitHub profile URL (github.com/...) appears anywhere in the text, including in the "Links found in document" section at the bottom. Otherwise false.
- "experience_years": total years of professional work experience as an integer. Sum up the durations of all job positions listed in the experience section. If the candidate is a student with no work experience, return 0. If you cannot determine the total, return 0.
- If a string field is not found, return "" (empty string). Do not return null for any field.
- Return ONLY the JSON object. No explanation, no markdown, no code fences.
`

func ParseResumeDetails(database *sql.DB, fileID string, fileName string, pdfBytes []byte) {
	text, err := ExtractTextFromPDF(pdfBytes)
	if err != nil {
		log.Printf("failed to extract text from PDF %s: %v", fileName, err)
		return
	}

	log.Printf("=== PDF TEXT EXTRACTED FROM %s ===\n%s\n=== END PDF TEXT ===", fileName, text)

	var resumeData *ResumeData

	geminiKey := os.Getenv("GOOGLE_STUDIO_API_KEY")
	groqKey := os.Getenv("GROQ_API_KEY")

	switch {
	case geminiKey != "":
		log.Printf("parsing resume with Gemini: %s (fileID: %s)", fileName, fileID)
		resumeData, err = parseWithGemini(context.Background(), geminiKey, text)
	case groqKey != "":
		log.Printf("parsing resume with Groq: %s (fileID: %s)", fileName, fileID)
		resumeData, err = parseWithGroq(groqKey, text)
	default:
		log.Printf("no AI provider configured: set GOOGLE_STUDIO_API_KEY or GROQ_API_KEY")
		return
	}

	if err != nil {
		log.Printf("failed to parse resume %s: %v", fileName, err)
		return
	}

	// Fill any fields the model dropped using regex on the raw text.
	postProcess(resumeData, text)
	log.Printf("final parsed data for %s: %+v", fileName, resumeData)

	if err := db.UpdateApplicationWithResumeData(database, fileID,
		resumeData.FirstName, resumeData.MiddleName, resumeData.LastName,
		resumeData.PhoneNumber, resumeData.Email, resumeData.HasGithub, resumeData.ExperienceYears,
	); err != nil {
		log.Printf("failed to update application with resume data for %s: %v", fileName, err)
		return
	}

	log.Printf("successfully parsed and updated resume details for %s", fileName)
}

// postProcess fills fields that the AI model left empty by running simple
// regex patterns directly on the extracted text. This acts as a safety net
// when the model drops keys it isn't confident about.
func postProcess(d *ResumeData, text string) {
	if d.PhoneNumber == "" {
		if m := rePhone.FindString(text); m != "" {
			// Strip any trailing separator characters the regex may have captured.
			d.PhoneNumber = strings.Trim(m, " \t-.()")
			log.Printf("phone_number filled by regex: %q", d.PhoneNumber)
		}
	}
	if d.Email == "" {
		if m := reEmail.FindString(text); m != "" {
			d.Email = m
			log.Printf("email filled by regex: %q", d.Email)
		}
	}
	if !d.HasGithub && strings.Contains(strings.ToLower(text), "github.com") {
		d.HasGithub = true
		log.Printf("has_github set to true by text scan")
	}
}

func DownloadFile(srv *drive.Service, fileID string) ([]byte, error) {
	resp, err := srv.Files.Get(fileID).Download()
	if err != nil {
		return nil, fmt.Errorf("failed to download file: %w", err)
	}
	defer resp.Body.Close()

	return io.ReadAll(resp.Body)
}

// ExtractTextFromPDF extracts readable text from PDF bytes.
// It tries pdftotext (poppler) first because it handles custom/icon font
// encoding correctly. If pdftotext is not installed it falls back to a
// coordinate-based reconstruction using the ledongthuc/pdf library.
// Hyperlink annotations (GitHub, LinkedIn, etc.) are extracted separately
// and appended to the result regardless of which path is taken.
func ExtractTextFromPDF(pdfBytes []byte) (string, error) {
	var text string
	var err error

	if _, lookupErr := exec.LookPath("pdftotext"); lookupErr == nil {
		text, err = extractWithPdfToText(pdfBytes)
		if err != nil {
			log.Printf("pdftotext failed, falling back to built-in extractor: %v", err)
			text, err = extractWithLibrary(pdfBytes)
		}
	} else {
		log.Printf("pdftotext not found, using built-in extractor (install poppler for better results)")
		text, err = extractWithLibrary(pdfBytes)
	}

	if err != nil {
		return "", err
	}

	// Append hyperlink URLs extracted from PDF link annotations.
	// These are never in the text stream — they only live in annotation objects.
	links := extractHyperlinks(pdfBytes)
	if len(links) > 0 {
		text += "\n\nLinks found in document:\n" + strings.Join(links, "\n")
	}

	return text, nil
}

// extractWithPdfToText runs pdftotext -layout on a temp file and returns stdout.
// -layout preserves column alignment which helps the AI parse contact sections.
func extractWithPdfToText(pdfBytes []byte) (string, error) {
	tmp, err := os.CreateTemp("", "resumaze-*.pdf")
	if err != nil {
		return "", fmt.Errorf("create temp file: %w", err)
	}
	defer os.Remove(tmp.Name())

	if _, err := tmp.Write(pdfBytes); err != nil {
		tmp.Close()
		return "", fmt.Errorf("write temp file: %w", err)
	}
	tmp.Close()

	// "-" as output file tells pdftotext to write to stdout
	out, err := exec.Command("pdftotext", "-layout", "-enc", "UTF-8", tmp.Name(), "-").Output()
	if err != nil {
		return "", fmt.Errorf("pdftotext: %w", err)
	}
	return string(out), nil
}

// extractWithLibrary uses ledongthuc/pdf with coordinate-based line reconstruction.
func extractWithLibrary(pdfBytes []byte) (string, error) {
	reader, err := pdf.NewReader(bytes.NewReader(pdfBytes), int64(len(pdfBytes)))
	if err != nil {
		return "", err
	}

	var buf strings.Builder
	for pageIndex := 1; pageIndex <= reader.NumPage(); pageIndex++ {
		page := reader.Page(pageIndex)
		if page.V.IsNull() {
			continue
		}
		buf.WriteString(extractPageText(page))
		buf.WriteByte('\n')
	}

	return buf.String(), nil
}

// extractHyperlinks reads /Annots arrays from every page and collects URI actions.
func extractHyperlinks(pdfBytes []byte) []string {
	reader, err := pdf.NewReader(bytes.NewReader(pdfBytes), int64(len(pdfBytes)))
	if err != nil {
		return nil
	}

	seen := make(map[string]bool)
	var urls []string

	for pageIndex := 1; pageIndex <= reader.NumPage(); pageIndex++ {
		page := reader.Page(pageIndex)
		if page.V.IsNull() {
			continue
		}

		annots := page.V.Key("Annots")
		for i := 0; i < annots.Len(); i++ {
			annot := annots.Index(i)
			if annot.Key("Subtype").Name() != "Link" {
				continue
			}
			action := annot.Key("A")
			if action.Key("S").Name() == "URI" {
				uri := action.Key("URI").RawString()
				if uri != "" && !seen[uri] {
					seen[uri] = true
					urls = append(urls, uri)
				}
			}
		}
	}

	return urls
}

// extractPageText reconstructs readable text from a PDF page by grouping
// text elements into lines using their Y coordinates, then ordering each
// line left-to-right by X and inserting spaces where there are gaps.
func extractPageText(page pdf.Page) string {
	content := page.Content()
	elems := content.Text
	if len(elems) == 0 {
		return ""
	}

	sort.Slice(elems, func(i, j int) bool {
		if math.Abs(elems[i].Y-elems[j].Y) > 1 {
			return elems[i].Y > elems[j].Y
		}
		return elems[i].X < elems[j].X
	})

	type line struct {
		y     float64
		items []pdf.Text
	}

	const yTolerance = 3.0
	var lines []line
	for _, el := range elems {
		if el.S == "" {
			continue
		}
		grouped := false
		for i := range lines {
			if math.Abs(lines[i].y-el.Y) <= yTolerance {
				lines[i].items = append(lines[i].items, el)
				grouped = true
				break
			}
		}
		if !grouped {
			lines = append(lines, line{y: el.Y, items: []pdf.Text{el}})
		}
	}

	sort.Slice(lines, func(i, j int) bool {
		return lines[i].y > lines[j].y
	})

	var out strings.Builder
	for _, ln := range lines {
		sort.Slice(ln.items, func(i, j int) bool {
			return ln.items[i].X < ln.items[j].X
		})

		var prevEnd float64
		for i, el := range ln.items {
			if i > 0 && el.X > prevEnd+1 {
				out.WriteByte(' ')
			}
			out.WriteString(el.S)
			end := el.X + el.W
			if end > prevEnd {
				prevEnd = end
			}
		}
		out.WriteByte('\n')
	}

	return out.String()
}
