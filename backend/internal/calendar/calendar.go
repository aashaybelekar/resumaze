package calendar

import (
	"context"
	"fmt"
	"os"
	"time"

	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
	googlecalendar "google.golang.org/api/calendar/v3"
	"google.golang.org/api/option"
)

func NewCalendarService(ctx context.Context, accessToken, refreshToken string, expiry time.Time) (*googlecalendar.Service, error) {
	cfg := &oauth2.Config{
		ClientID:     os.Getenv("GOOGLE_CLIENT_ID"),
		ClientSecret: os.Getenv("GOOGLE_CLIENT_SECRET"),
		RedirectURL:  os.Getenv("GOOGLE_REDIRECT_URL"),
		Scopes:       []string{"https://www.googleapis.com/auth/calendar.events"},
		Endpoint:     google.Endpoint,
	}
	token := &oauth2.Token{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		Expiry:       expiry,
		TokenType:    "Bearer",
	}
	ts := cfg.TokenSource(ctx, token)
	return googlecalendar.NewService(ctx, option.WithTokenSource(ts))
}

// CreateInterviewEvent creates a Google Calendar event with an auto-generated Google Meet link.
// Returns (eventID, calendarHtmlLink, meetLink, error).
func CreateInterviewEvent(svc *googlecalendar.Service, candidateName, interviewerName, role, interviewDateStr string, attendeeEmails []string) (eventID, htmlLink, meetLink string, err error) {
	var startTime time.Time
	if interviewDateStr != "" {
		formats := []string{
			time.RFC3339,
			"2006-01-02T15:04:05",
			"2006-01-02T15:04", // datetime-local input without seconds
			"2006-01-02 15:04:05",
		}
		parsed := false
		for _, f := range formats {
			if t, parseErr := time.Parse(f, interviewDateStr); parseErr == nil {
				startTime = t
				parsed = true
				break
			}
		}
		if !parsed {
			return "", "", "", fmt.Errorf("invalid interview date %q: none of the supported formats matched", interviewDateStr)
		}
	} else {
		return "", "", "", fmt.Errorf("interview date is required for calendar event")
	}

	endTime := startTime.Add(60 * time.Minute)

	summary := fmt.Sprintf("Interview: %s", candidateName)
	if role != "" {
		summary = fmt.Sprintf("Interview: %s (%s)", candidateName, role)
	}
	description := fmt.Sprintf("Interviewer: %s", interviewerName)

	attendees := make([]*googlecalendar.EventAttendee, 0)
	for _, email := range attendeeEmails {
		if email != "" {
			attendees = append(attendees, &googlecalendar.EventAttendee{Email: email})
		}
	}

	event := &googlecalendar.Event{
		Summary:     summary,
		Description: description,
		Start:       &googlecalendar.EventDateTime{DateTime: startTime.UTC().Format(time.RFC3339), TimeZone: "UTC"},
		End:         &googlecalendar.EventDateTime{DateTime: endTime.UTC().Format(time.RFC3339), TimeZone: "UTC"},
		Attendees:   attendees,
		ConferenceData: &googlecalendar.ConferenceData{
			CreateRequest: &googlecalendar.CreateConferenceRequest{
				RequestId: fmt.Sprintf("resumaze-%d", startTime.UnixNano()),
				ConferenceSolutionKey: &googlecalendar.ConferenceSolutionKey{
					Type: "hangoutsMeet",
				},
			},
		},
	}

	created, err := svc.Events.Insert("primary", event).
		ConferenceDataVersion(1).
		SendNotifications(true).
		Do()
	if err != nil {
		return "", "", "", err
	}

	// Extract the Meet link from conference entry points
	if created.ConferenceData != nil {
		for _, ep := range created.ConferenceData.EntryPoints {
			if ep.EntryPointType == "video" {
				meetLink = ep.Uri
				break
			}
		}
	}

	return created.Id, created.HtmlLink, meetLink, nil
}

func DeleteCalendarEvent(svc *googlecalendar.Service, eventID string) error {
	return svc.Events.Delete("primary", eventID).Do()
}
