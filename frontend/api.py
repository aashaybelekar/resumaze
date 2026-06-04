# api.py
import requests
import streamlit as st
from typing import List, Dict, Any, Optional
from config import API_BASE_URL

def handle_api_error(response: requests.Response):
    try:
        data = response.json()
        if "error" in data:
            st.error(f"API Error: {data['error']}")
        else:
            st.error(f"Error {response.status_code}: {response.text}")
    except requests.exceptions.JSONDecodeError:
        st.error(f"Error {response.status_code}: {response.text}")

def get_health() -> bool:
    try:
        response = requests.get(f"{API_BASE_URL}/health")
        return response.status_code == 200 and response.json().get("status") == "ok"
    except requests.exceptions.ConnectionError:
        return False
    except Exception as e:
        print(f"Health check failed: {e}")
        return False

def get_stages() -> List[str]:
    try:
        response = requests.get(f"{API_BASE_URL}/stage")
        if response.status_code == 200:
            return response.json()
        handle_api_error(response)
        return []
    except requests.exceptions.ConnectionError:
        st.error("Connection failed. Is the backend server running?")
        return []
    except Exception as e:
        st.error(f"An error occurred: {e}")
        return []

def create_stage(name: str) -> bool:
    try:
        response = requests.post(f"{API_BASE_URL}/stage", json={"name": name})
        if response.status_code == 200:
            st.success(response.json().get("message", "Stage created!"))
            return True
        handle_api_error(response)
        return False
    except Exception as e:
        st.error(f"An error occurred: {e}")
        return False

def delete_stage(name: str) -> bool:
    try:
        response = requests.delete(f"{API_BASE_URL}/stage/{name}")
        if response.status_code == 200:
            st.success(response.json().get("message", "Stage deleted!"))
            return True
        handle_api_error(response)
        return False
    except Exception as e:
        st.error(f"An error occurred: {e}")
        return False

def get_job_roles() -> List[str]:
    try:
        response = requests.get(f"{API_BASE_URL}/jobrole")
        if response.status_code == 200:
            return response.json()
        handle_api_error(response)
        return []
    except requests.exceptions.ConnectionError:
        st.error("Connection failed. Is the backend server running?")
        return []
    except Exception as e:
        st.error(f"An error occurred: {e}")
        return []

def create_job_role(name: str) -> bool:
    try:
        response = requests.post(f"{API_BASE_URL}/jobrole", json={"name": name})
        if response.status_code == 200:
            st.success(response.json().get("message", "Job role created!"))
            return True
        handle_api_error(response)
        return False
    except Exception as e:
        st.error(f"An error occurred: {e}")
        return False

def delete_job_role(name: str) -> bool:
    try:
        response = requests.delete(f"{API_BASE_URL}/jobrole/{name}")
        if response.status_code == 200:
            st.success(response.json().get("message", "Job role deleted!"))
            return True
        handle_api_error(response)
        return False
    except Exception as e:
        st.error(f"An error occurred: {e}")
        return False

def get_resumes(search: str = "", stage: str = "", role: str = "", has_github: Optional[bool] = None, page: int = 1, limit: int = 100) -> List[Dict[str, Any]]:
    """Returns flat list of resume dicts. Handles the paginated {data, total, page, limit} response."""
    try:
        params = {"page": page, "limit": limit}
        if search:
            params["search"] = search
        if stage:
            params["stage"] = stage
        if role:
            params["role"] = role
        if has_github is not None:
            params["has_github"] = "true" if has_github else "false"

        response = requests.get(f"{API_BASE_URL}/resume", params=params)
        if response.status_code == 200:
            data = response.json()
            # Backend returns {data: [...], total, page, limit}
            if isinstance(data, dict) and "data" in data:
                return data.get("data") or []
            # Fallback if somehow plain list
            if isinstance(data, list):
                return data
            return []
        handle_api_error(response)
        return []
    except requests.exceptions.ConnectionError:
        st.error("Connection failed. Is the backend server running?")
        return []
    except Exception as e:
        st.error(f"An error occurred: {e}")
        return []

def update_resume_stage(resume_id: int, new_stage: str) -> bool:
    try:
        response = requests.put(f"{API_BASE_URL}/resume/{resume_id}/stage", json={"stage": new_stage})
        if response.status_code == 200:
            st.toast(f"Moved to {new_stage}!", icon="✅")
            return True
        handle_api_error(response)
        return False
    except Exception as e:
        st.error(f"An error occurred: {e}")
        return False

def update_resume_job_role(resume_id: int, new_job_role: str) -> bool:
    try:
        response = requests.put(f"{API_BASE_URL}/resume/{resume_id}/role", json={"role": new_job_role})
        if response.status_code == 200:
            st.toast(f"Updated role to {new_job_role}!", icon="✅")
            return True
        handle_api_error(response)
        return False
    except Exception as e:
        st.error(f"An error occurred: {e}")
        return False

def delete_resume(resume_id: int) -> bool:
    try:
        response = requests.delete(f"{API_BASE_URL}/resume/{resume_id}")
        if response.status_code == 200:
            return True
        handle_api_error(response)
        return False
    except Exception as e:
        st.error(f"An error occurred: {e}")
        return False

def upload_resumes(files: List[Any], job_role: str, stage: str) -> dict:
    try:
        files_to_upload = [("file", (file.name, file, file.type)) for file in files]
        payload = {"role": job_role, "stage": stage}
        response = requests.post(
            f"{API_BASE_URL}/resume/upload",
            files=files_to_upload,
            data=payload
        )
        return response.json()
    except Exception as e:
        print("Upload error:", e)
        return {}

def bulk_stage_change(ids: List[int], stage: str) -> Optional[int]:
    """Returns count of updated records, or None on error."""
    try:
        response = requests.post(f"{API_BASE_URL}/resume/bulk-stage", json={"ids": ids, "stage": stage})
        if response.status_code == 200:
            return response.json().get("updated", 0)
        handle_api_error(response)
        return None
    except Exception as e:
        st.error(f"An error occurred: {e}")
        return None

def get_analytics() -> Optional[Dict[str, Any]]:
    try:
        response = requests.get(f"{API_BASE_URL}/analytics")
        if response.status_code == 200:
            return response.json()
        handle_api_error(response)
        return None
    except Exception as e:
        st.error(f"An error occurred: {e}")
        return None

def get_duplicates() -> List[Dict[str, Any]]:
    try:
        response = requests.get(f"{API_BASE_URL}/resume/duplicates")
        if response.status_code == 200:
            return response.json()
        handle_api_error(response)
        return []
    except Exception as e:
        st.error(f"An error occurred: {e}")
        return []

def get_export_csv_url(search: str = "", stage: str = "", role: str = "") -> str:
    params = []
    if search:
        params.append(f"search={requests.utils.quote(search)}")
    if stage:
        params.append(f"stage={requests.utils.quote(stage)}")
    if role:
        params.append(f"role={requests.utils.quote(role)}")
    qs = "&".join(params)
    return f"{API_BASE_URL}/resume/export" + (f"?{qs}" if qs else "")

def download_export_csv(search: str = "", stage: str = "", role: str = "") -> Optional[bytes]:
    try:
        params = {}
        if search:
            params["search"] = search
        if stage:
            params["stage"] = stage
        if role:
            params["role"] = role
        response = requests.get(f"{API_BASE_URL}/resume/export", params=params)
        if response.status_code == 200:
            return response.content
        handle_api_error(response)
        return None
    except Exception as e:
        st.error(f"An error occurred: {e}")
        return None

# --- Interview API ---

def get_interviews(candidate_id: int) -> List[Dict[str, Any]]:
    try:
        response = requests.get(f"{API_BASE_URL}/resume/{candidate_id}/interviews")
        if response.status_code == 200:
            return response.json()
        handle_api_error(response)
        return []
    except Exception as e:
        st.error(f"An error occurred: {e}")
        return []

def create_interview(candidate_id: int, interviewer: str, interview_date: str, meeting_link: str, feedback: str, outcome: str) -> bool:
    try:
        payload = {
            "interviewer": interviewer,
            "interview_date": interview_date or None,
            "meeting_link": meeting_link,
            "feedback": feedback,
            "outcome": outcome,
        }
        response = requests.post(f"{API_BASE_URL}/resume/{candidate_id}/interviews", json=payload)
        if response.status_code == 201:
            return True
        handle_api_error(response)
        return False
    except Exception as e:
        st.error(f"An error occurred: {e}")
        return False

def delete_interview(interview_id: int) -> bool:
    try:
        response = requests.delete(f"{API_BASE_URL}/interview/{interview_id}")
        if response.status_code == 200:
            return True
        handle_api_error(response)
        return False
    except Exception as e:
        st.error(f"An error occurred: {e}")
        return False

# --- Notes API ---

def get_notes(application_id: int) -> List[Dict[str, Any]]:
    try:
        response = requests.get(f"{API_BASE_URL}/resume/{application_id}/notes")
        if response.status_code == 200:
            return response.json()
        handle_api_error(response)
        return []
    except Exception as e:
        st.error(f"An error occurred: {e}")
        return []

def create_note(application_id: int, content: str, created_by: str = "") -> bool:
    try:
        response = requests.post(f"{API_BASE_URL}/resume/{application_id}/notes", json={"content": content, "created_by": created_by})
        if response.status_code == 201:
            return True
        handle_api_error(response)
        return False
    except Exception as e:
        st.error(f"An error occurred: {e}")
        return False

def delete_note(note_id: int) -> bool:
    try:
        response = requests.delete(f"{API_BASE_URL}/note/{note_id}")
        if response.status_code == 200:
            return True
        handle_api_error(response)
        return False
    except Exception as e:
        st.error(f"An error occurred: {e}")
        return False
