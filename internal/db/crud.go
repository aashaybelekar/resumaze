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

func MoveApplication(db *sql.DB, resumeID int, stageName string) (bool, error) {
	var stageID int
	err := db.QueryRow(`SELECT id FROM stages WHERE name=$1`, stageName).Scan(&stageID)
	if err != nil {
		if err == sql.ErrNoRows {
			return false, fmt.Errorf("stage %s does not exist", stageName)
		}
		return false, err
	}

	_, err = db.Exec(`UPDATE application SET current_stage_id=$1 WHERE id=$2`, stageID, resumeID)
	return true, err
}

func CreateResume(db *sql.DB, resumeID int, jobRole string, stageName string) (bool, error) {
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
	_, err = db.Exec(`INSERT INTO application (drive_file_id, job_role_id, current_stage_id) VALUES ($1, $2, $3)`, resumeID, JobID, StageID)

	return true, err
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
