package db

import (
	"fmt"

	"database/sql"
)

func InitDB(db *sql.DB) error {
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
		fmt.Println("Warning: Database schema already exists. Running migrations...")
		return runMigrations(db)
	}

	fmt.Println("INFO: Schema not found, creating tables...")

	schema := `
	CREATE TABLE IF NOT EXISTS job_roles (
		id SERIAL PRIMARY KEY,
		name TEXT NOT NULL UNIQUE
	);

	CREATE TABLE IF NOT EXISTS stages (
		id SERIAL PRIMARY KEY,
		name TEXT NOT NULL UNIQUE,
		position INT
	);

	CREATE TABLE IF NOT EXISTS application (
		id SERIAL PRIMARY KEY,
		drive_file_id TEXT NOT NULL,
		drive_file_name TEXT NOT NULL,
		job_role_id INT REFERENCES job_roles(id),
		current_stage_id INT REFERENCES stages(id),
		first_name TEXT,
		middle_name TEXT,
		last_name TEXT,
		phone_number TEXT,
		email TEXT,
		has_github BOOLEAN DEFAULT FALSE,
		experience_years INT DEFAULT 0,
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

	CREATE TABLE IF NOT EXISTS notes (
		id SERIAL PRIMARY KEY,
		application_id INT REFERENCES application(id) ON DELETE CASCADE,
		content TEXT NOT NULL,
		created_by TEXT,
		created_at TIMESTAMP DEFAULT NOW()
	);

	CREATE TABLE IF NOT EXISTS users (
		id SERIAL PRIMARY KEY,
		google_id TEXT NOT NULL UNIQUE,
		email TEXT NOT NULL UNIQUE,
		name TEXT NOT NULL,
		picture TEXT,
		role TEXT NOT NULL DEFAULT 'user',
		created_at TIMESTAMP DEFAULT NOW()
	);

	CREATE TABLE IF NOT EXISTS refresh_tokens (
		id SERIAL PRIMARY KEY,
		user_id INT REFERENCES users(id) ON DELETE CASCADE,
		token_hash TEXT NOT NULL UNIQUE,
		expires_at TIMESTAMP NOT NULL,
		created_at TIMESTAMP DEFAULT NOW()
	);
	`

	_, err = db.Exec(schema)
	if err != nil {
		return fmt.Errorf("FATAL: failed to create schema: %w", err)
	}

	fmt.Println("INFO: Schema initialized successfully.")
	return nil
}

func runMigrations(db *sql.DB) error {
	migrations := []struct {
		name  string
		check string
		apply string
	}{
		{
			name:  "add first_name to application",
			check: `SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_name='application' AND column_name='first_name')`,
			apply: `ALTER TABLE application ADD COLUMN IF NOT EXISTS first_name TEXT`,
		},
		{
			name:  "add middle_name to application",
			check: `SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_name='application' AND column_name='middle_name')`,
			apply: `ALTER TABLE application ADD COLUMN IF NOT EXISTS middle_name TEXT`,
		},
		{
			name:  "add last_name to application",
			check: `SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_name='application' AND column_name='last_name')`,
			apply: `ALTER TABLE application ADD COLUMN IF NOT EXISTS last_name TEXT`,
		},
		{
			name:  "add has_github to application",
			check: `SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_name='application' AND column_name='has_github')`,
			apply: `ALTER TABLE application ADD COLUMN IF NOT EXISTS has_github BOOLEAN DEFAULT FALSE`,
		},
		{
			name:  "add experience_years to application",
			check: `SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_name='application' AND column_name='experience_years')`,
			apply: `ALTER TABLE application ADD COLUMN IF NOT EXISTS experience_years INT DEFAULT 0`,
		},
		{
			name:  "create notes table",
			check: `SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema='public' AND table_name='notes')`,
			apply: `CREATE TABLE IF NOT EXISTS notes (
				id SERIAL PRIMARY KEY,
				application_id INT REFERENCES application(id) ON DELETE CASCADE,
				content TEXT NOT NULL,
				created_by TEXT,
				created_at TIMESTAMP DEFAULT NOW()
			)`,
		},
		{
			name:  "add position to stages",
			check: `SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_name='stages' AND column_name='position')`,
			apply: `ALTER TABLE stages ADD COLUMN IF NOT EXISTS position INT; UPDATE stages SET position = id WHERE position IS NULL`,
		},
		{
			name:  "create users table",
			check: `SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema='public' AND table_name='users')`,
			apply: `CREATE TABLE IF NOT EXISTS users (
				id SERIAL PRIMARY KEY,
				google_id TEXT NOT NULL UNIQUE,
				email TEXT NOT NULL UNIQUE,
				name TEXT NOT NULL,
				picture TEXT,
				role TEXT NOT NULL DEFAULT 'user',
				created_at TIMESTAMP DEFAULT NOW()
			)`,
		},
		{
			name:  "create refresh_tokens table",
			check: `SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema='public' AND table_name='refresh_tokens')`,
			apply: `CREATE TABLE IF NOT EXISTS refresh_tokens (
				id SERIAL PRIMARY KEY,
				user_id INT REFERENCES users(id) ON DELETE CASCADE,
				token_hash TEXT NOT NULL UNIQUE,
				expires_at TIMESTAMP NOT NULL,
				created_at TIMESTAMP DEFAULT NOW()
			)`,
		},
	}

	for _, m := range migrations {
		var exists bool
		if err := db.QueryRow(m.check).Scan(&exists); err != nil {
			return fmt.Errorf("migration check failed for %s: %w", m.name, err)
		}
		if exists {
			continue
		}
		fmt.Printf("INFO: Running migration: %s\n", m.name)
		if _, err := db.Exec(m.apply); err != nil {
			return fmt.Errorf("migration failed for %s: %w", m.name, err)
		}
	}

	return nil
}
