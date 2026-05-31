package ai

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"strings"
	"log"

	"google.golang.org/genai"
)

// stripCodeFences removes leading ```[lang] and trailing ``` markers Gemini sometimes adds.
func stripCodeFences(s string) string {
	s = strings.TrimSpace(s)
	if strings.HasPrefix(s, "```") {
		if i := strings.Index(s, "\n"); i != -1 {
			s = s[i+1:]
		}
	}
	s = strings.TrimSpace(s)
	s = strings.TrimSuffix(s, "```")
	return strings.TrimSpace(s)
}

func parseWithGemini(ctx context.Context, apiKey string, text string) (*ResumeData, error) {
	client, err := genai.NewClient(ctx, &genai.ClientConfig{
		APIKey:  apiKey,
		Backend: genai.BackendGeminiAPI,
	})
	if err != nil {
		return nil, fmt.Errorf("create gemini client: %w", err)
	}

	model := os.Getenv("GOOGLE_STUDIO_MODEL")
	if model == "" {
		model = "gemma-4-26b-a4b-it"
	}

	config := &genai.GenerateContentConfig{
		ResponseMIMEType: "application/json",
		ResponseSchema: &genai.Schema{
			Type: genai.TypeObject,
			Properties: map[string]*genai.Schema{
				"first_name":   {Type: genai.TypeString},
				"middle_name":  {Type: genai.TypeString},
				"last_name":    {Type: genai.TypeString},
				"phone_number": {Type: genai.TypeString},
				"email":        {Type: genai.TypeString},
				"has_github":   {Type: genai.TypeBoolean},
			},
		},
	}

	prompt := resumePrompt + "\n\nResume text:\n" + text

	result, err := client.Models.GenerateContent(ctx, model, genai.Text(prompt), config)
	if err != nil {
		return nil, fmt.Errorf("gemini generate content: %w", err)
	}

	raw := stripCodeFences(result.Text())
	log.Printf("Response Text: %s", raw)

	var data ResumeData
	if err := json.Unmarshal([]byte(raw), &data); err != nil {
		return nil, fmt.Errorf("unmarshal gemini response: %w", err)
	}

	return &data, nil
}
