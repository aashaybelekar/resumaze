# api.py
import requests
import streamlit as st
from typing import List, Dict, Any
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

def get_stages() -> List[Dict[str, Any]]:
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

def get_job_roles() -> List[Dict[str, Any]]:
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

def get_resumes() -> List[Dict[str, Any]]:
    try:
        response = requests.get(f"{API_BASE_URL}/resume")
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

def update_resume_stage(resume_id: int, new_stage: str) -> bool:
    try:
        payload = {"stage": new_stage}
        response = requests.put(f"{API_BASE_URL}/resume/{resume_id}/stage", json=payload)
        if response.status_code == 200:
            st.toast(f"Moved resume {resume_id} to {new_stage}!", icon="✅")
            return True
        handle_api_error(response)
        return False
    except Exception as e:
        st.error(f"An error occurred: {e}")
        return False

def update_resume_job_role(resume_id: int, new_job_role: str) -> bool:
    try:
        payload = {"role": new_job_role}
        response = requests.put(f"{API_BASE_URL}/resume/{resume_id}/role", json=payload)
        if response.status_code == 200:
            st.toast(f"Updated resume {resume_id} to {new_job_role}!", icon="✅")
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