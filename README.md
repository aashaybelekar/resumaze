<div align="center">

# 📄 Resumaze

*A powerful, self-hosted Applicant Tracking System (ATS) to streamline your hiring pipeline.*

[![Go Version](https://img.shields.io/badge/Go-1.21+-00ADD8?style=flat&logo=go)](https://golang.org/)
[![Python Version](https://img.shields.io/badge/Python-3.8+-3776AB?style=flat&logo=python)](https://www.python.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Streamlit App](https://img.shields.io/badge/Streamlit-FF4B4B?style=flat&logo=streamlit&logoColor=white)](https://streamlit.io/)

</div>

---

**Resumaze** is a decoupled Applicant Tracking System featuring a robust Go-powered backend, an interactive Python-based frontend, and AI integration. It is designed to help individuals and teams manage candidates efficiently, parse resumes intelligently, and visualize the hiring workflow.

## 📑 Table of Contents

- [Features](#-features)
- [Technology Stack](#-technology-stack)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Backend Setup](#backend-setup)
  - [Frontend Setup](#frontend-setup)
- [Configuration](#️-configuration)
- [Usage](#-usage)
- [API Endpoints](#-api-endpoints)
- [Contributing](#-contributing)
- [License](#-license)

---

## ✨ Features

- **Kanban-Style Resume Board:** Visualize your applicant pipeline with draggable cards representing different stages (e.g., *Applied, Interview, Offer*).
- **Secure Resume Storage:** Easily upload resumes, which are securely forwarded and stored in your Google Drive.
- **AI-Powered Insights:** Leverage Groq API within the GoLang backend to automatically parse, analyze, and extract insights from resume content.
- **Customizable Workflows:** Define your own job roles and application stages to perfectly fit your unique hiring process.
- **Intuitive Web Interface:** A sleek, reactive UI built with Streamlit (`streamlit-sortables`) for effortless candidate management.

---

## 🚀 Technology Stack

| Domain | Technologies |
| :--- | :--- |
| **Backend** | Go, Gin Framework, RESTful API |
| **Database** | PostgreSQL (Dockerized) |
| **Cloud & AI** | Google Drive API, Groq API |
| **Frontend** | Python, Streamlit, `requests`, `streamlit-sortables` |

---

## 🏁 Getting Started

Follow these instructions to get a copy of the project up and running on your local machine for development and testing.

### Prerequisites

Ensure you have the following installed:
- [Go](https://golang.org/doc/install) (latest version recommended)
- [Python](https://www.python.org/downloads/) (3.8+)
- [Docker](https://docs.docker.com/get-docker/) & [Docker Compose](https://docs.docker.com/compose/install/)
- [Git](https://git-scm.com/downloads/)

### Backend Setup

1. **Clone the repository:**
   ```bash
   git clone <your-repository-url>
   cd resumaze/backend
   ```

2. **Configure Environment Variables:**
   Copy the example environment file and fill in your details (see [Configuration](#️-configuration)).
   ```bash
   cp .env.example .env
   ```

3. **Set up Google Drive API:**
   - Create a Service Account via the [Google Cloud Console](https://console.cloud.google.com/).
   - Download the JSON key file.
   - Save it as `service-account.json` inside a `backend/secrets/` directory.
   - *Important:* Share your target Google Drive folder with the service account's email address.

4. **Install Go Dependencies:**
   ```bash
   go mod tidy
   ```

5. **Start the Database Container:**
   ```bash
   docker-compose up -d
   ```

### Frontend Setup

1. **Navigate to the frontend directory:**
   ```bash
   cd ../frontend
   ```

2. **Create and activate a virtual environment:**
   ```bash
   python -m venv .venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   ```

3. **Install Python Dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

---

## ⚙️ Configuration

The backend requires the following environment variables to be set in your `backend/.env` file:

| Variable | Description | Example |
| :--- | :--- | :--- |
| `POSTGRES_HOST` | Hostname for the PostgreSQL container. | `localhost` |
| `POSTGRES_PORT` | Port exposed by the PostgreSQL container. | `5432` |
| `POSTGRES_USER` | Username for the PostgreSQL database. | `postgres` |
| `POSTGRES_PASSWORD`| Password for the PostgreSQL database. | `postgres` |
| `POSTGRES_DB` | Name of the database to use. | `resumaze_db` |
| `DRIVE_FOLDER_ID` | Google Drive folder ID for resume storage. | `1A2b3C4d5E6f7G8h9I0j` |
| `PORT` | Port for the Go backend server. | `8080` |
| `AUTH_JSON_PATH` | Path to Google Service Account JSON key. | `./secrets/service-account.json` |
| `GROQ_API_KEY` | Your Groq service API key. | `gsk_your_api_key_here` |

---

## ▶️ Usage

### 1. Run the Backend Server
Open a terminal, navigate to the `backend/` directory, ensure Docker is running, and start the server:
```bash
go run ./cmd/server/main.go
```
*The API will be available at `http://localhost:8080` (or your configured `PORT`).*

### 2. Run the Frontend App
Open a new terminal, navigate to the `frontend/` directory, activate your virtual environment, and start Streamlit:
```bash
streamlit run app.py
```
*The Web UI will open automatically at `http://localhost:8501`.*

---

## 🌐 API Endpoints

The backend exposes a RESTful API under the `/api/v1` prefix.

### Stages & Roles
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/stage` | List all application stages. |
| `POST` | `/stage` | Create a new application stage. |
| `DELETE` | `/stage/:name` | Delete a stage by its name. |
| `GET` | `/jobrole` | List all job roles. |
| `POST` | `/jobrole` | Create a new job role. |
| `DELETE`| `/jobrole/:name` | Delete a job role by its name. |

### Resumes
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/resume` | List all resumes. |
| `POST` | `/resume` | Create a new resume entry. |
| `POST` | `/resume/upload` | Upload a resume file to Google Drive. |
| `PUT` | `/resume/:id/stage`| Change a resume's application stage. |
| `PUT` | `/resume/:id/role` | Change a resume's job role. |

### System
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/health` | API health check. |

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! 
Feel free to check out the [issues page](<your-repository-url>/issues) if you want to contribute.

## 📝 License

This project is licensed under the [MIT License](LICENSE) - see the LICENSE file for details.