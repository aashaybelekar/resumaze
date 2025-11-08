import streamlit as st
import requests
import pandas as pd
from typing import List, Dict, Any

# --- Page Configuration ---
st.set_page_config(
    page_title="Resumaze Dashboard",
    page_icon="📄",
    layout="wide",
    initial_sidebar_state="expanded",
)

# --- API Configuration ---
API_BASE_URL = "http://localhost:8080/api/v1"


# --- API Client Functions ---

def handle_api_error(response: requests.Response):
    """Handles common API error responses."""
    try:
        data = response.json()
        if "error" in data:
            st.error(f"API Error: {data['error']}")
        else:
            st.error(f"Error {response.status_code}: {response.text}")
    except requests.exceptions.JSONDecodeError:
        st.error(f"Error {response.status_code}: {response.text}")


def get_health() -> bool:
    """Checks the health of the API."""
    try:
        response = requests.get(f"{API_BASE_URL}/health")
        return response.status_code == 200 and response.json().get("message") == "OK"
    except requests.exceptions.ConnectionError:
        return False
    except Exception as e:
        print(f"Health check failed: {e}")
        return False


def get_stages() -> List[Dict[str, Any]]:
    """Fetches all stages from the API."""
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
    """Creates a new stage."""
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
    """Deletes a stage by name."""
    try:
        # This assumes you fixed the Go handler to use c.Param("name")
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
    """Fetches all job roles from the API."""
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
    """Creates a new job role."""
    try:
        response = requests.post(
            f"{API_BASE_URL}/jobrole", json={"name": name})
        if response.status_code == 200:
            st.success(response.json().get("message", "Job role created!"))
            return True
        handle_api_error(response)
        return False
    except Exception as e:
        st.error(f"An error occurred: {e}")
        return False


def delete_job_role(name: str) -> bool:
    """Deletes a job role by name."""
    try:
        # This assumes you fixed the Go handler to use c.Param("name")
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
    """Fetches all resumes from the API."""
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


def create_resume(resume_id: int, job_role: str, stage: str) -> bool:
    """Creates a new resume entry."""
    try:
        payload = {"id": resume_id, "jobrole": job_role, "stage": stage}
        response = requests.post(f"{API_BASE_URL}/resume", json=payload)
        if response.status_code == 200:
            st.success(response.json().get("message", "Resume created!"))
            return True
        handle_api_error(response)
        return False
    except Exception as e:
        st.error(f"An error occurred: {e}")
        return False

# --- State Management ---


def load_data():
    """Loads all necessary data into session state."""
    if 'stages' not in st.session_state:
        st.session_state.stages = get_stages()
    if 'job_roles' not in st.session_state:
        st.session_state.job_roles = get_job_roles()
    if 'resumes' not in st.session_state:
        st.session_state.resumes = get_resumes()


def refresh_data(data_key: str):
    """Clears a specific key from session state to force a reload."""
    if data_key in st.session_state:
        del st.session_state[data_key]


# --- Sidebar ---
with st.sidebar:
    st.title("📄 Resumaze")

    # API Health Check
    if get_health():
        st.success("API Status: Connected")
    else:
        st.error("API Status: Disconnected")
        st.warning(
            "Please ensure the Go backend server is running on `localhost:8080`.")

    st.markdown("---")

    # Use st.navigation for modern multi-page app feel
    page = st.radio("Navigation", ["Dashboard", "Manage Settings"])

    st.markdown("---")
    st.info("This app provides a UI for the Resumaze application tracker API.")


# --- Page: Main Dashboard (Resumes) ---
def page_dashboard():
    st.title("🚀 Resume Dashboard")
    load_data()

    # Get data from session state
    stages_data = st.session_state.get('stages', [])
    job_roles_data = st.session_state.get('job_roles', [])
    resumes_data = st.session_state.get('resumes', [])

    stage_names = stages_data
    job_role_names = job_roles_data

    # Section: Create New Resume
    st.subheader("➕ Add New Resume")
    with st.form("new_resume_form"):
        col1, col2, col3 = st.columns(3)
        with col1:
            resume_id = st.number_input("Resume ID", min_value=1, step=1)
        with col2:
            job_role = st.selectbox("Job Role", options=job_role_names)
        with col3:
            stage = st.selectbox("Current Stage", options=stage_names)

        submitted = st.form_submit_button("Add Resume", type="primary")

        if submitted:
            if not job_role or not stage:
                st.warning(
                    "Please create Job Roles and Stages in the 'Manage Settings' page first.")
            else:
                if create_resume(resume_id, job_role, stage):
                    refresh_data('resumes')
                    st.rerun()

    st.markdown("---")

    # Section: Current Resumes
    st.subheader("📊 Current Resume Tracker")
    if resumes_data:
        try:
            # Convert list of dicts to Pandas DataFrame for better display
            df = pd.DataFrame(resumes_data, columns=[
                              "Resume ID", "Job Role", "Stage"])
            # Reorder columns for clarity
            st.dataframe(df, use_container_width=True)
        except Exception as e:
            st.error(f"Failed to display resumes: {e}")
            st.json(resumes_data)  # Fallback to JSON
    else:
        st.info("No resumes found. Add one above to get started!")

# --- Page: Manage Settings (Stages & Job Roles) ---


def page_manage_settings():
    st.title("⚙️ Manage Settings")
    load_data()

    col1, col2 = st.columns(2)

    # --- Column 1: Manage Stages ---
    with col1:
        with st.container(border=True):
            st.subheader("🎓 Manage Stages")

            # Create Stage
            with st.form("new_stage_form"):
                new_stage_name = st.text_input("New Stage Name")
                submitted_create = st.form_submit_button("Create Stage")
                if submitted_create and new_stage_name:
                    if create_stage(new_stage_name):
                        refresh_data('stages')
                        st.rerun()

            st.markdown("---")

            # Delete Stage
            stages_data = st.session_state.get('stages', [])
            if stages_data:
                stage_names = stages_data
                stage_to_delete = st.selectbox(
                    "Select stage to delete", options=stage_names, index=None, placeholder="Choose a stage...")

                if st.button("Delete Stage", type="secondary"):
                    if stage_to_delete:
                        if delete_stage(stage_to_delete):
                            refresh_data('stages')
                            # Resumes might depend on this
                            refresh_data('resumes')
                            st.rerun()
                    else:
                        st.warning("Please select a stage to delete.")
            else:
                st.info("No stages created yet.")

    # --- Column 2: Manage Job Roles ---
    with col2:
        with st.container(border=True):
            st.subheader("🧑‍💻 Manage Job Roles")

            # Create Job Role
            with st.form("new_job_role_form"):
                new_job_role_name = st.text_input("New Job Role Name")
                submitted_create = st.form_submit_button("Create Job Role")
                if submitted_create and new_job_role_name:
                    if create_job_role(new_job_role_name):
                        refresh_data('job_roles')
                        st.rerun()

            st.markdown("---")

            # Delete Job Role
            job_roles_data = st.session_state.get('job_roles', [])
            if job_roles_data:
                job_role_names = job_roles_data
                job_role_to_delete = st.selectbox(
                    "Select job role to delete", options=job_role_names, index=None, placeholder="Choose a job role...")

                if st.button("Delete Job Role", type="secondary"):
                    if job_role_to_delete:
                        if delete_job_role(job_role_to_delete):
                            refresh_data('job_roles')
                            # Resumes might depend on this
                            refresh_data('resumes')
                            st.rerun()
                    else:
                        st.warning("Please select a job role to delete.")
            else:
                st.info("No job roles created yet.")


# --- Main App Logic ---
if page == "Dashboard":
    page_dashboard()
elif page == "Manage Settings":
    page_manage_settings()
