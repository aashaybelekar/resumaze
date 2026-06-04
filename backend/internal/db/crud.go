package db

import (
	"database/sql"
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/lib/pq"
)

// Resume is the canonical application record returned by list/filter queries.
type Resume struct {
	ID            int    `json:"id"`
	DriveFileID   string `json:"drive_file_id"`
	DriveFileName string `json:"drive_file_name"`
	FirstName     string `json:"first_name"`
	MiddleName    string `json:"middle_name"`
	LastName      string `json:"last_name"`
	Email         string `json:"email"`
	Phone         string `json:"phone"`
	HasGithub     bool   `json:"has_github"`
	Stage         string `json:"stage"`
	Role          string `json:"role"`
	UploadedTime  string `json:"uploaded_time"`
}

type ResumeFilter struct {
	Search    string
	Stage     string
	Role      string
	HasGithub *bool
	Page      int
	Limit     int
}

type StageCount struct {
	Stage string `json:"stage"`
	Count int    `json:"count"`
}

type RoleCount struct {
	Role  string `json:"role"`
	Count int    `json:"count"`
}

type Analytics struct {
	TotalApplications int          `json:"total_applications"`
	ByStage           []StageCount `json:"by_stage"`
	ByRole            []RoleCount  `json:"by_role"`
	WithGithub        int          `json:"with_github"`
	RecentUploads7d   int          `json:"recent_uploads_7d"`
}

type DuplicateGroup struct {
	MatchType  string   `json:"match_type"`
	MatchValue string   `json:"match_value"`
	Candidates []Resume `json:"candidates"`
}

type Interview struct {
	ID            int     `json:"id"`
	CandidateID   int     `json:"candidate_id"`
	StageID       *int    `json:"stage_id,omitempty"`
	Interviewer   string  `json:"interviewer"`
	InterviewDate *string `json:"interview_date,omitempty"`
	MeetingLink   string  `json:"meeting_link"`
	Feedback      string  `json:"feedback"`
	Outcome       string  `json:"outcome"`
	CreatedAt     string  `json:"created_at"`
}

type Note struct {
	ID            int    `json:"id"`
	ApplicationID int    `json:"application_id"`
	Content       string `json:"content"`
	CreatedBy     string `json:"created_by"`
	CreatedAt     string `json:"created_at"`
}

const resumeSelectBase = `
	SELECT a.id, a.drive_file_id, a.drive_file_name,
	       a.first_name, a.middle_name, a.last_name,
	       a.email, a.phone_number, a.has_github,
	       s.name, j.name, a.uploaded_time
	FROM application a
	LEFT JOIN stages s ON a.current_stage_id = s.id
	LEFT JOIN job_roles j ON a.job_role_id = j.id
`

func scanResume(rows *sql.Rows) (Resume, error) {
	var r Resume
	var firstName, middleName, lastName, email, phone sql.NullString
	var hasGithub sql.NullBool
	var stage, role sql.NullString
	var uploadedTime sql.NullTime
	err := rows.Scan(
		&r.ID, &r.DriveFileID, &r.DriveFileName,
		&firstName, &middleName, &lastName,
		&email, &phone, &hasGithub,
		&stage, &role, &uploadedTime,
	)
	if err != nil {
		return r, err
	}
	r.FirstName = firstName.String
	r.MiddleName = middleName.String
	r.LastName = lastName.String
	r.Email = email.String
	r.Phone = phone.String
	r.HasGithub = hasGithub.Bool
	r.Stage = stage.String
	r.Role = role.String
	if uploadedTime.Valid {
		r.UploadedTime = uploadedTime.Time.Format(time.RFC3339)
	}
	return r, nil
}

func ListResumesFiltered(db *sql.DB, f ResumeFilter) ([]Resume, int, error) {
	if f.Page < 1 {
		f.Page = 1
	}
	if f.Limit < 1 {
		f.Limit = 20
	}
	if f.Limit > 100 {
		f.Limit = 100
	}

	var conditions []string
	var args []interface{}
	argIdx := 1

	if f.Search != "" {
		conditions = append(conditions, fmt.Sprintf(
			"(a.first_name ILIKE $%d OR a.last_name ILIKE $%d OR a.email ILIKE $%d)",
			argIdx, argIdx+1, argIdx+2,
		))
		pat := "%" + f.Search + "%"
		args = append(args, pat, pat, pat)
		argIdx += 3
	}
	if f.Stage != "" {
		conditions = append(conditions, fmt.Sprintf("s.name = $%d", argIdx))
		args = append(args, f.Stage)
		argIdx++
	}
	if f.Role != "" {
		conditions = append(conditions, fmt.Sprintf("j.name = $%d", argIdx))
		args = append(args, f.Role)
		argIdx++
	}
	if f.HasGithub != nil {
		conditions = append(conditions, fmt.Sprintf("a.has_github = $%d", argIdx))
		args = append(args, *f.HasGithub)
		argIdx++
	}

	where := ""
	if len(conditions) > 0 {
		where = "WHERE " + strings.Join(conditions, " AND ")
	}

	countQuery := `SELECT COUNT(*) FROM application a LEFT JOIN stages s ON a.current_stage_id = s.id LEFT JOIN job_roles j ON a.job_role_id = j.id ` + where
	var total int
	if err := db.QueryRow(countQuery, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	offset := (f.Page - 1) * f.Limit
	dataArgs := append(args, f.Limit, offset)
	dataQuery := resumeSelectBase + where + fmt.Sprintf(" ORDER BY a.uploaded_time DESC LIMIT $%d OFFSET $%d", argIdx, argIdx+1)

	rows, err := db.Query(dataQuery, dataArgs...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var resumes []Resume
	for rows.Next() {
		r, err := scanResume(rows)
		if err != nil {
			return nil, 0, err
		}
		resumes = append(resumes, r)
	}
	if resumes == nil {
		resumes = []Resume{}
	}
	return resumes, total, nil
}

func BulkChangeApplicationStage(db *sql.DB, ids []int, stageName string) (int, error) {
	var stageID int
	err := db.QueryRow(`SELECT id FROM stages WHERE name=$1`, stageName).Scan(&stageID)
	if err != nil {
		if err == sql.ErrNoRows {
			return 0, fmt.Errorf("stage %s does not exist", stageName)
		}
		return 0, err
	}

	result, err := db.Exec(`UPDATE application SET current_stage_id=$1 WHERE id = ANY($2)`, stageID, pq.Array(ids))
	if err != nil {
		return 0, err
	}
	n, err := result.RowsAffected()
	return int(n), err
}

func GetAnalytics(db *sql.DB) (*Analytics, error) {
	a := &Analytics{}

	if err := db.QueryRow(`SELECT COUNT(*) FROM application`).Scan(&a.TotalApplications); err != nil {
		return nil, err
	}

	stageRows, err := db.Query(`
		SELECT s.name, COUNT(app.id)
		FROM stages s
		LEFT JOIN application app ON app.current_stage_id = s.id
		GROUP BY s.name
		ORDER BY s.name
	`)
	if err != nil {
		return nil, err
	}
	defer stageRows.Close()
	for stageRows.Next() {
		var sc StageCount
		if err := stageRows.Scan(&sc.Stage, &sc.Count); err != nil {
			return nil, err
		}
		a.ByStage = append(a.ByStage, sc)
	}
	if a.ByStage == nil {
		a.ByStage = []StageCount{}
	}

	roleRows, err := db.Query(`
		SELECT j.name, COUNT(app.id)
		FROM job_roles j
		LEFT JOIN application app ON app.job_role_id = j.id
		GROUP BY j.name
		ORDER BY j.name
	`)
	if err != nil {
		return nil, err
	}
	defer roleRows.Close()
	for roleRows.Next() {
		var rc RoleCount
		if err := roleRows.Scan(&rc.Role, &rc.Count); err != nil {
			return nil, err
		}
		a.ByRole = append(a.ByRole, rc)
	}
	if a.ByRole == nil {
		a.ByRole = []RoleCount{}
	}

	if err := db.QueryRow(`SELECT COUNT(*) FROM application WHERE has_github = TRUE`).Scan(&a.WithGithub); err != nil {
		return nil, err
	}

	if err := db.QueryRow(`SELECT COUNT(*) FROM application WHERE uploaded_time >= NOW() - INTERVAL '7 days'`).Scan(&a.RecentUploads7d); err != nil {
		return nil, err
	}

	return a, nil
}

func fetchResumesByIDs(db *sql.DB, ids []int) ([]Resume, error) {
	rows, err := db.Query(resumeSelectBase+`WHERE a.id = ANY($1) ORDER BY a.id`, pq.Array(ids))
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var resumes []Resume
	for rows.Next() {
		r, err := scanResume(rows)
		if err != nil {
			return nil, err
		}
		resumes = append(resumes, r)
	}
	return resumes, nil
}

func FindDuplicateCandidates(db *sql.DB) ([]DuplicateGroup, error) {
	var groups []DuplicateGroup

	emailRows, err := db.Query(`
		SELECT email, ARRAY_AGG(id)
		FROM application
		WHERE email IS NOT NULL AND email != ''
		GROUP BY email
		HAVING COUNT(*) > 1
	`)
	if err != nil {
		return nil, err
	}
	defer emailRows.Close()
	for emailRows.Next() {
		var matchVal string
		var ids pq.Int64Array
		if err := emailRows.Scan(&matchVal, &ids); err != nil {
			return nil, err
		}
		intIDs := make([]int, len(ids))
		for i, v := range ids {
			intIDs[i] = int(v)
		}
		candidates, err := fetchResumesByIDs(db, intIDs)
		if err != nil {
			return nil, err
		}
		groups = append(groups, DuplicateGroup{MatchType: "email", MatchValue: matchVal, Candidates: candidates})
	}

	phoneRows, err := db.Query(`
		SELECT phone_number, ARRAY_AGG(id)
		FROM application
		WHERE phone_number IS NOT NULL AND phone_number != ''
		GROUP BY phone_number
		HAVING COUNT(*) > 1
	`)
	if err != nil {
		return nil, err
	}
	defer phoneRows.Close()
	for phoneRows.Next() {
		var matchVal string
		var ids pq.Int64Array
		if err := phoneRows.Scan(&matchVal, &ids); err != nil {
			return nil, err
		}
		intIDs := make([]int, len(ids))
		for i, v := range ids {
			intIDs[i] = int(v)
		}
		candidates, err := fetchResumesByIDs(db, intIDs)
		if err != nil {
			return nil, err
		}
		groups = append(groups, DuplicateGroup{MatchType: "phone", MatchValue: matchVal, Candidates: candidates})
	}

	nameRows, err := db.Query(`
		SELECT first_name || ' ' || last_name, ARRAY_AGG(id)
		FROM application
		WHERE first_name IS NOT NULL AND first_name != ''
		  AND last_name IS NOT NULL AND last_name != ''
		GROUP BY first_name, last_name
		HAVING COUNT(*) > 1
	`)
	if err != nil {
		return nil, err
	}
	defer nameRows.Close()
	for nameRows.Next() {
		var matchVal string
		var ids pq.Int64Array
		if err := nameRows.Scan(&matchVal, &ids); err != nil {
			return nil, err
		}
		intIDs := make([]int, len(ids))
		for i, v := range ids {
			intIDs[i] = int(v)
		}
		candidates, err := fetchResumesByIDs(db, intIDs)
		if err != nil {
			return nil, err
		}
		groups = append(groups, DuplicateGroup{MatchType: "name", MatchValue: matchVal, Candidates: candidates})
	}

	if groups == nil {
		groups = []DuplicateGroup{}
	}
	return groups, nil
}

func CreateInterview(db *sql.DB, i Interview) (int, error) {
	var id int
	err := db.QueryRow(`
		INSERT INTO interviews (candidate_id, stage_id, interviewer, interview_date, meeting_link, feedback, outcome)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id
	`, i.CandidateID, i.StageID, i.Interviewer, i.InterviewDate, i.MeetingLink, i.Feedback, i.Outcome).Scan(&id)
	return id, err
}

func ListInterviewsByCandidate(db *sql.DB, candidateID int) ([]Interview, error) {
	rows, err := db.Query(`
		SELECT id, candidate_id, stage_id, interviewer, interview_date, meeting_link, feedback, outcome, created_at
		FROM interviews
		WHERE candidate_id = $1
		ORDER BY created_at DESC
	`, candidateID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var interviews []Interview
	for rows.Next() {
		var iv Interview
		var stageID sql.NullInt64
		var interviewDate sql.NullTime
		var interviewer, meetingLink, feedback, outcome sql.NullString
		var createdAt time.Time
		if err := rows.Scan(&iv.ID, &iv.CandidateID, &stageID, &interviewer, &interviewDate, &meetingLink, &feedback, &outcome, &createdAt); err != nil {
			return nil, err
		}
		if stageID.Valid {
			v := int(stageID.Int64)
			iv.StageID = &v
		}
		iv.Interviewer = interviewer.String
		iv.MeetingLink = meetingLink.String
		iv.Feedback = feedback.String
		iv.Outcome = outcome.String
		iv.CreatedAt = createdAt.Format(time.RFC3339)
		if interviewDate.Valid {
			s := interviewDate.Time.Format(time.RFC3339)
			iv.InterviewDate = &s
		}
		interviews = append(interviews, iv)
	}
	if interviews == nil {
		interviews = []Interview{}
	}
	return interviews, nil
}

func UpdateInterview(db *sql.DB, id int, i Interview) error {
	_, err := db.Exec(`
		UPDATE interviews
		SET stage_id=$1, interviewer=$2, interview_date=$3, meeting_link=$4, feedback=$5, outcome=$6
		WHERE id=$7
	`, i.StageID, i.Interviewer, i.InterviewDate, i.MeetingLink, i.Feedback, i.Outcome, id)
	return err
}

func DeleteInterview(db *sql.DB, id int) error {
	_, err := db.Exec(`DELETE FROM interviews WHERE id=$1`, id)
	return err
}

func CreateNote(db *sql.DB, applicationID int, content, createdBy string) (int, error) {
	var id int
	err := db.QueryRow(`
		INSERT INTO notes (application_id, content, created_by)
		VALUES ($1, $2, $3)
		RETURNING id
	`, applicationID, content, createdBy).Scan(&id)
	return id, err
}

func ListNotesByApplication(db *sql.DB, applicationID int) ([]Note, error) {
	rows, err := db.Query(`
		SELECT id, application_id, content, COALESCE(created_by, ''), created_at
		FROM notes
		WHERE application_id = $1
		ORDER BY created_at DESC
	`, applicationID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var notes []Note
	for rows.Next() {
		var n Note
		var createdAt time.Time
		if err := rows.Scan(&n.ID, &n.ApplicationID, &n.Content, &n.CreatedBy, &createdAt); err != nil {
			return nil, err
		}
		n.CreatedAt = createdAt.Format(time.RFC3339)
		notes = append(notes, n)
	}
	if notes == nil {
		notes = []Note{}
	}
	return notes, nil
}

func DeleteNote(db *sql.DB, noteID int) error {
	_, err := db.Exec(`DELETE FROM notes WHERE id=$1`, noteID)
	return err
}

func CreateStage(db *sql.DB, name string) (bool, error) {
	var id int
	err := db.QueryRow(`SELECT id FROM stages WHERE name = $1`, name).Scan(&id)
	if err == sql.ErrNoRows {
		_, err := db.Exec(`INSERT INTO stages (name) VALUES ($1)`, name)
		if err != nil {
			return false, err
		}
		return true, nil
	} else if err != nil {
		return false, err
	}
	return false, nil
}

func ListStages(db *sql.DB) ([]string, error) {
	rows, err := db.Query(`SELECT name FROM stages`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var stages []string
	for rows.Next() {
		var stage string
		if err := rows.Scan(&stage); err != nil {
			return nil, err
		}
		stages = append(stages, stage)
	}

	return stages, nil
}

func DeleteStage(db *sql.DB, stageName string) error {
	var stageID int
	err := db.QueryRow(`SELECT id FROM stages WHERE name=$1`, stageName).Scan(&stageID)
	if err != nil {
		if err == sql.ErrNoRows {
			return fmt.Errorf("stage %s does not exist", stageName)
		}
		return err
	}

	var archiveStageID int
	err = db.QueryRow(`SELECT id FROM stages WHERE name='Archive'`).Scan(&archiveStageID)
	if err == sql.ErrNoRows {
		_, err = db.Exec(`INSERT INTO stages (name) VALUES ('Archive')`)
		if err != nil {
			return fmt.Errorf("failed to create Archive stage: %v", err)
		}
		err = db.QueryRow(`SELECT id FROM stages WHERE name='Archive'`).Scan(&archiveStageID)
		if err != nil {
			return err
		}
	} else if err != nil {
		return err
	}

	_, err = db.Exec(`UPDATE application SET current_stage_id=$1 WHERE current_stage_id=$2`, archiveStageID, stageID)
	if err != nil {
		return fmt.Errorf("failed to move application to Archive: %v", err)
	}

	_, err = db.Exec(`DELETE FROM stages WHERE id=$1`, stageID)
	if err != nil {
		return fmt.Errorf("failed to delete stage: %v", err)
	}

	return nil
}

func ChangeApplicationStage(db *sql.DB, applicationID int, stageName string) error {
	var stageID int
	err := db.QueryRow(`SELECT id FROM stages WHERE name=$1`, stageName).Scan(&stageID)
	if err != nil {
		if err == sql.ErrNoRows {
			return fmt.Errorf("stage %s does not exist", stageName)
		}
		return err
	}

	result, err := db.Exec(`UPDATE application SET current_stage_id=$1 WHERE drive_file_id=$2`, stageID, applicationID)
	if err != nil {
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rowsAffected == 0 {
		return fmt.Errorf("application with ID %d not found", applicationID)
	}

	return nil
}

func ChangeApplicationRole(db *sql.DB, applicationID int, roleName string) error {
	var roleID int
	err := db.QueryRow(`SELECT id FROM job_roles WHERE name=$1`, roleName).Scan(&roleID)
	if err != nil {
		if err == sql.ErrNoRows {
			return fmt.Errorf("role %s does not exist", roleName)
		}
		return err
	}
	result, err := db.Exec(`UPDATE application SET job_role_id=$1 WHERE drive_file_id=$2`, roleID, applicationID)
	if err != nil {
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rowsAffected == 0 {
		return fmt.Errorf("application with ID %d not found", applicationID)
	}

	return nil
}

func CreateResume(db *sql.DB, resumeID string, fileName string, jobRole string, stageName string) (bool, error) {
	var StageID int
	var JobID int
	err := db.QueryRow(`SELECT id FROM job_roles WHERE name=$1`, jobRole).Scan(&JobID)
	if err != nil {
		log.Fatal("Failed to get job_id")
		return false, err
	}
	err = db.QueryRow(`SELECT id FROM stages WHERE name=$1`, stageName).Scan(&StageID)
	if err != nil {
		log.Fatal("Failed to get stage_id")
		return false, err
	}
	_, err = db.Exec(`INSERT INTO application (drive_file_id, drive_file_name, job_role_id, current_stage_id) VALUES ($1, $2, $3, $4)`, resumeID, fileName, JobID, StageID)

	return true, err
}

func DeleteResume(db *sql.DB, applicationID int) (string, error) {
	var driveFileID string
	err := db.QueryRow(`SELECT drive_file_id FROM application WHERE id=$1`, applicationID).Scan(&driveFileID)
	if err == sql.ErrNoRows {
		return "", fmt.Errorf("resume not found")
	}
	if err != nil {
		return "", err
	}

	var archiveStageID int
	err = db.QueryRow(`SELECT id FROM stages WHERE name='Archive'`).Scan(&archiveStageID)
	if err == sql.ErrNoRows {
		_, err = db.Exec(`INSERT INTO stages (name) VALUES ('Archive')`)
		if err != nil {
			return "", fmt.Errorf("failed to create Archive stage: %v", err)
		}
		err = db.QueryRow(`SELECT id FROM stages WHERE name='Archive'`).Scan(&archiveStageID)
	}
	if err != nil {
		return "", fmt.Errorf("failed to get Archive stage: %v", err)
	}

	_, err = db.Exec(`UPDATE application SET current_stage_id=$1 WHERE id=$2`, archiveStageID, applicationID)
	return driveFileID, err
}

func CreateJobRole(db *sql.DB, name string) (bool, error) {
	var id int
	err := db.QueryRow(`SELECT id FROM job_roles WHERE name=$1`, name).Scan(&id)
	if err == sql.ErrNoRows {
		_, err := db.Exec(`INSERT INTO job_roles (name) VALUES ($1)`, name)
		if err != nil {
			return false, err
		}
		return true, nil
	} else if err != nil {
		return false, err
	}
	return false, nil
}

func ListJobRole(db *sql.DB) ([]string, error) {
	rows, err := db.Query(`SELECT name FROM job_roles`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var roles []string
	for rows.Next() {
		var role string
		if err := rows.Scan(&role); err != nil {
			return nil, err
		}
		roles = append(roles, role)
	}

	return roles, nil
}

func DeleteJobRole(db *sql.DB, jobRole string) error {
	var roleID int
	err := db.QueryRow(`SELECT id FROM job_roles WHERE name=$1`, jobRole).Scan(&roleID)
	if err != nil {
		log.Fatal("Failed to get job_id")
		return err
	}
	var archiveStageID int
	err = db.QueryRow(`SELECT id FROM stages WHERE name='Archive'`).Scan(&archiveStageID)
	if err != nil {
		if err == sql.ErrNoRows {
			_, err = db.Exec(`INSERT INTO stages (name) VALUES('Archive')`)
			if err != nil {
				return err
			}
			err = db.QueryRow(`SELECT id FROM stages WHERE name='Archive'`).Scan(&archiveStageID)
			if err != nil {
				return err
			}
		} else {
			return err
		}
	}

	_, err = db.Exec(`UPDATE application SET current_stage_id=$1 WHERE job_role_id=$2`, archiveStageID, roleID)
	if err != nil {
		return err
	}

	_, err = db.Exec(`DELETE FROM job_roles WHERE id=$1`, roleID)
	return err
}

func UpdateApplicationWithResumeData(db *sql.DB, driveFileID string, firstName string, middleName string, lastName string, phoneNumber string, email string, hasGithub bool) error {
	_, err := db.Exec(`
		UPDATE application
		SET first_name = $2,
			middle_name = $3,
			last_name = $4,
			phone_number = $5,
			email = $6,
			has_github = $7
		WHERE drive_file_id = $1
	`, driveFileID, firstName, middleName, lastName, phoneNumber, email, hasGithub)
	return err
}
