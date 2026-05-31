package db

import (
	"database/sql"
	"fmt"
	"log"
)

func CreateStage(db *sql.DB, name string) (bool, error) {
	var id int
	err := db.QueryRow(`SELECT id FROM stages WHERE name = $1`, name).Scan(&id)
	if err == sql.ErrNoRows {
		_, err := db.Exec(`INSERT INTO stages (name) VALUES ($1)`, name)
		if err != nil {
			return false, err
		}
		return true, nil // Success
	} else if err != nil {
		return false, err
	}
	return false, nil // Stage already exists
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
	// 1. Find stage ID
	var stageID int
	err := db.QueryRow(`SELECT id FROM stages WHERE name=$1`, stageName).Scan(&stageID)
	if err != nil {
		if err == sql.ErrNoRows {
			return fmt.Errorf("stage %s does not exist", stageName)
		}
		return err
	}

	// 2. Find or create Archive stage
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

	// 3. Move application to Archive
	_, err = db.Exec(`UPDATE application SET current_stage_id=$1 WHERE current_stage_id=$2`, archiveStageID, stageID)
	if err != nil {
		return fmt.Errorf("failed to move application to Archive: %v", err)
	}

	// 4. Delete the stage
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
	_, err = db.Exec(`DELETE FROM application WHERE id=$1`, applicationID)
	return driveFileID, err
}

type Resume struct {
	ID          int    `json:"id"`
	JobRole     string `json:"job_role"`
	Stage       string `json:"stage"`
	FirstName   string `json:"first_name"`
	MiddleName  string `json:"middle_name"`
	LastName    string `json:"last_name"`
	PhoneNumber string `json:"phone_number"`
	Email       string `json:"email"`
	HasGithub   bool   `json:"has_github"`
}

func ListResumes(db *sql.DB) ([]Resume, error) {
	rows, err := db.Query(`
		SELECT a.id, COALESCE(j.name, ''), COALESCE(s.name, ''),
			COALESCE(a.first_name, ''), COALESCE(a.middle_name, ''), COALESCE(a.last_name, ''),
			COALESCE(a.phone_number, ''), COALESCE(a.email, ''), COALESCE(a.has_github, false)
		FROM application a
		LEFT JOIN job_roles j ON a.job_role_id = j.id
		LEFT JOIN stages s ON a.current_stage_id = s.id;`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var resumes []Resume
	for rows.Next() {
		var r Resume
		if err := rows.Scan(&r.ID, &r.JobRole, &r.Stage, &r.FirstName, &r.MiddleName, &r.LastName, &r.PhoneNumber, &r.Email, &r.HasGithub); err != nil {
			return nil, err
		}
		resumes = append(resumes, r)
	}

	return resumes, nil
}

func CreateJobRole(db *sql.DB, name string) (bool, error) {
	var id int
	err := db.QueryRow(`SELECT id FROM job_roles WHERE name=$1`, name).Scan(&id)
	if err == sql.ErrNoRows {
		_, err := db.Exec(`INSERT INTO job_roles (name) VALUES ($1)`, name)
		if err != nil {
			return false, err
		}
		return true, nil // Success
	} else if err != nil {
		return false, err
	}
	return false, nil // Role already exists
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
	// 1. Find Archive stage ID
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
			// Create Archive stage if not exists
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

	// 2. Move application to Archive stage
	_, err = db.Exec(`UPDATE application SET current_stage_id=$1 WHERE job_role_id=$2`, archiveStageID, roleID)
	if err != nil {
		return err
	}

	// 3. Delete role
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
