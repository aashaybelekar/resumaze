package db

import (
	"fmt"

	"database/sql"
)

func InitDB(db *sql.DB) error {
	// check if key tables exist
	var exists bool
	err := db.QueryRow(`
		SELECT EXISTS (
			SELECT FROM information_schema.tables 
			WHERE table_schema = 'public' AND table_name = 'job_roles'
		);
	`).Scan(&exists)
	if err != nil {
		return fmt.Errorf("failed to check existing schema: %w", err)
	}

	if exists {
		fmt.Println("Warning: Database schema already exists. Skipping creation.")
		return nil
	}

	fmt.Println("INFO: Schema not found, creating tables...")

	schema := `
	CREATE TABLE IF NOT EXISTS job_roles (
		id SERIAL PRIMARY KEY,
		name TEXT NOT NULL UNIQUE
	);

	CREATE TABLE IF NOT EXISTS stages (
		id SERIAL PRIMARY KEY,
		name TEXT NOT NULL UNIQUE
	);

	CREATE TABLE IF NOT EXISTS application (
		id SERIAL PRIMARY KEY,
		drive_file_id TEXT NOT NULL,
		job_role_id INT REFERENCES job_roles(id),
		current_stage_id INT REFERENCES stages(id),
		candidate_name TEXT,
		previous_ctc NUMERIC(12, 2),
		expected_ctc NUMERIC(12, 2),
		notice_period INT,
		phone_number TEXT,
		email TEXT,
		uploaded_time TIMESTAMP DEFAULT NOW(),
		uploaded_by TEXT,
		last_change_time TIMESTAMP DEFAULT NOW(),
		last_change_by TEXT,
		status TEXT DEFAULT 'Active'
	);

	CREATE TABLE IF NOT EXISTS interviews (
		id SERIAL PRIMARY KEY,
		candidate_id INT REFERENCES application(id) ON DELETE CASCADE,
		stage_id INT REFERENCES stages(id),
		interviewer TEXT,
		interview_date TIMESTAMP,
		meeting_link TEXT,
		feedback TEXT,
		outcome TEXT, 
		created_at TIMESTAMP DEFAULT NOW()
	);

	CREATE TABLE IF NOT EXISTS stage_history (
		id SERIAL PRIMARY KEY,
		candidate_id INT REFERENCES application(id) ON DELETE CASCADE,
		from_stage INT REFERENCES stages(id),
		to_stage INT REFERENCES stages(id),
		changed_by TEXT,
		changed_at TIMESTAMP DEFAULT NOW() 
	);
	`

	_, err = db.Exec(schema)
	if err != nil {
		return fmt.Errorf("FATAL: failed to create schema: %w", err)
	}

	fmt.Println("INFO: Schema initialized successfully.")
	return nil
}
