import streamlit as st
import requests
import pandas as pd
from typing import List, Dict, Any
from streamlit_sortables import sort_items

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
        return response.status_code == 200 and response.json().get("status") == "ok"
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


def update_resume_stage(resume_id: int, new_stage: str) -> bool:
    """Updates a resume's stage via the new PUT endpoint."""
    try:
        payload = {"stage": new_stage}
        response = requests.put(
            f"{API_BASE_URL}/resume/{resume_id}/stage", json=payload)
        if response.status_code == 200:
            st.toast(f"Moved resume {resume_id} to {new_stage}!", icon="✅")
            return True
        handle_api_error(response)
        return False
    except Exception as e:
        st.error(f"An error occurred: {e}")
        return False


def update_resume_job_role(resume_id: int, new_job_role: str) -> bool:
    """Updates a resume's job role via the new PUT endpoint."""
    try:
        payload = {"role": new_job_role}
        response = requests.put(
            f"{API_BASE_URL}/resume/{resume_id}/role", json=payload)
        if response.status_code == 200:
            st.toast(
                f"Updated resume {resume_id} to {new_job_role}!", icon="✅")
            return True
        handle_api_error(response)
        return False
    except Exception as e:
        st.error(f"An error occurred: {e}")
        return False


def upload_resumes(files: List[Any], job_role: str, stage: str) -> dict:
    try:
        files_to_upload = [("file", (file.name, file, file.type))
                           for file in files]  # note singular "file"
        payload = {"role": job_role, "stage": stage}

        response = requests.post(
            f"{API_BASE_URL}/resume/upload",
            files=files_to_upload,
            data=payload  # ✅ form data, not JSON
        )
        return response.json()
    except Exception as e:
        print("Upload error:", e)
        return {}


# --- State Management ---
def load_data():
    """Loads all necessary data into session state."""
    st.session_state.stages = get_stages()
    st.session_state.job_roles = get_job_roles()
    st.session_state.resumes = get_resumes()


def refresh_data(data_key: str):
    """Clears a specific key from session state to force a reload."""
    if data_key in st.session_state:
        del st.session_state[data_key]
    if 'stages' in st.session_state:
        del st.session_state.stages
    if 'job_roles' in st.session_state:
        del st.session_state.job_roles
    if 'resumes' in st.session_state:
        del st.session_state.resumes
    st.rerun()


# --- Sidebar ---
with st.sidebar:
    st.title("📄 Resumaze")
    if get_health():
        st.success("API Status: Connected")
    else:
        st.error("API Status: Disconnected")
        st.warning("Ensure the Go backend is running on `localhost:8080`.")
    st.markdown("---")
    page = st.radio("Navigation", ["Resume Board", "Edit Resumes",
                    "Upload Resumes", "Manage Settings"])
    st.markdown("---")
    if st.button("🔄 Refresh Data"):
        refresh_data('all')
    st.info("Applicant Tracking System")


# --- Page: Kanban Board ---
def page_resume_board():
    st.title("🚀 Resume Board")

    if 'stages' not in st.session_state:
        load_data()

    stages_data = st.session_state.get('stages', [])
    resumes_data = st.session_state.get('resumes', [])

    if not stages_data:
        st.warning(
            "No stages found. Please create stages in 'Manage Settings' first.")
        return

    if not resumes_data:
        st.info("No resumes found. Upload some resumes to get started!")
        return

    stage_names = stages_data

    items_by_stage = {stage: [] for stage in stage_names}
    resume_map = {}

    try:
        for row in resumes_data:
            if len(row) >= 3:
                resume_id_str, job_role, stage = row
                resume_map[resume_id_str] = row
                if stage in items_by_stage:
                    items_by_stage[stage].append(resume_id_str)
            else:
                st.warning(f"Skipping malformed resume data: {row}")
    except Exception as e:
        st.error(f"Failed to parse resume data. (Error: {e})")
        st.json(resumes_data)
        return

    st.subheader("Drag and drop candidates to their new stage")

    cols = st.columns(len(stage_names))
    new_items_by_stage = {}
    card_to_id_map = {}

    for i, stage_name in enumerate(stage_names):
        with cols[i]:
            display_cards = []
            for resume_id_str in items_by_stage[stage_name]:
                if resume_id_str in resume_map:
                    _, job_role, _ = resume_map[resume_id_str]
                    card_string = f"ID: {resume_id_str}\nJob Role: {job_role}"
                    display_cards.append(card_string)
                    card_to_id_map[card_string] = resume_id_str

            sorted_cards = sort_items(
                display_cards,
                header=stage_name,
                key=f"stage_{stage_name}"
            )

            new_items_by_stage[stage_name] = [
                card_to_id_map[card] for card in sorted_cards]

    # Process Moves
    for stage_name, new_ids in new_items_by_stage.items():
        original_ids = set(items_by_stage[stage_name])
        for resume_id_str in new_ids:
            if resume_id_str not in original_ids:
                try:
                    resume_id_int = int(resume_id_str)
                    if update_resume_stage(resume_id_int, stage_name):
                        refresh_data('resumes')
                    else:
                        st.error(
                            f"Failed to move {resume_id_str}. Refreshing...")
                        refresh_data('all')
                except Exception as e:
                    st.error(f"An error occurred while moving: {e}")
                return


# --- NEW PAGE: Edit Resumes ---
def page_edit_resumes():
    st.title("✍️ Edit Resume Details")

    if 'stages' not in st.session_state:
        load_data()

    resumes_data = st.session_state.get('resumes', [])
    all_job_roles = st.session_state.get('job_roles', [])
    all_stages = st.session_state.get('stages', [])

    if not resumes_data:
        st.info("No resumes loaded. Upload some resumes first!")
        return

    if not all_job_roles:
        st.warning("No Job Roles created. Go to 'Manage Settings' to add some.")
        return

    # Create resume map
    resume_map = {}
    for row in resumes_data:
        if len(row) >= 3:
            resume_id_str, job_role, stage = row
            resume_map[resume_id_str] = {
                "id": resume_id_str, "job_role": job_role, "stage": stage}

    # --- Search/Filter Section ---
    st.subheader("🔍 Find Resume")

    col1, col2 = st.columns([2, 1])

    with col1:
        search_id = st.text_input(
            "Search by Resume ID", placeholder="Enter resume ID...")

    with col2:
        filter_role = st.selectbox(
            "Filter by Job Role",
            options=["All"] + all_job_roles,
            index=0
        )

    # Filter resumes based on search
    filtered_resumes = []
    for resume_id, data in resume_map.items():
        if search_id and search_id not in resume_id:
            continue
        if filter_role != "All" and data["job_role"] != filter_role:
            continue
        filtered_resumes.append(resume_id)

    if not filtered_resumes:
        st.warning("No resumes match your search criteria.")
        return

    st.markdown("---")

    # --- Display Resumes in Cards ---
    st.subheader(f"📋 Resumes ({len(filtered_resumes)} found)")

    # Create cards in columns
    num_cols = 3
    cols = st.columns(num_cols)

    for idx, resume_id in enumerate(filtered_resumes):
        data = resume_map[resume_id]

        with cols[idx % num_cols]:
            with st.container(border=True):
                st.markdown(f"### 📄 Resume #{data['id']}")

                # Current details
                st.caption("Current Details:")
                st.write(f"**Job Role:** {data['job_role']}")
                st.write(f"**Stage:** {data['stage']}")

                st.markdown("---")

                # Edit form
                with st.form(key=f"edit_form_{resume_id}"):
                    st.caption("Update Information:")

                    # Job Role selector
                    try:
                        current_job_role_index = all_job_roles.index(
                            data['job_role'])
                    except ValueError:
                        current_job_role_index = 0

                    new_job_role = st.selectbox(
                        "Job Role",
                        options=all_job_roles,
                        index=current_job_role_index,
                        key=f"job_role_select_{resume_id}"
                    )

                    # Stage selector
                    try:
                        current_stage_index = all_stages.index(data['stage'])
                    except ValueError:
                        current_stage_index = 0

                    new_stage = st.selectbox(
                        "Stage",
                        options=all_stages,
                        index=current_stage_index,
                        key=f"stage_select_{resume_id}"
                    )

                    # Submit button
                    col_btn1, col_btn2 = st.columns(2)

                    with col_btn1:
                        update_clicked = st.form_submit_button(
                            "💾 Update", type="primary", use_container_width=True)

                    with col_btn2:
                        # You could add a delete button here if needed
                        pass

                    if update_clicked:
                        try:
                            resume_id_int = int(resume_id)
                            changes_made = False

                            # Update job role if changed
                            if new_job_role != data['job_role']:
                                if update_resume_job_role(resume_id_int, new_job_role):
                                    changes_made = True
                                else:
                                    st.error("Failed to update job role")

                            # Update stage if changed
                            if new_stage != data['stage']:
                                if update_resume_stage(resume_id_int, new_stage):
                                    changes_made = True
                                else:
                                    st.error("Failed to update stage")

                            if changes_made:
                                st.success(
                                    f"✅ Resume {resume_id} updated successfully!")
                                refresh_data('resumes')
                            else:
                                st.info("No changes detected.")

                        except Exception as e:
                            st.error(f"An error occurred: {e}")


# --- Page: Upload Resumes ---
def page_upload_resumes():
    st.title("➕ Bulk Upload Resumes")

    if 'stages' not in st.session_state:
        load_data()

    stages_data = st.session_state.get('stages', [])
    job_roles_data = st.session_state.get('job_roles', [])

    stage_names = stages_data
    job_role_names = job_roles_data

    if not stage_names or not job_role_names:
        st.warning(
            "Please create at least one Job Role and one Stage in 'Manage Settings' before uploading.")
        return

    with st.form("new_resume_form"):
        st.info(
            "Upload multiple PDF resumes. They will all be assigned the Job Role and Stage selected below.")

        uploaded_files = st.file_uploader(
            "Upload Resumes",
            type="pdf",
            accept_multiple_files=True
        )

        col1, col2 = st.columns(2)
        with col1:
            job_role = st.selectbox(
                "Assign to Job Role", options=job_role_names)
        with col2:
            stage = st.selectbox(
                "Assign to Initial Stage", options=stage_names)

        submitted = st.form_submit_button(
            "Upload and Process Resumes", type="primary")

        if submitted:
            if not uploaded_files:
                st.error("Please upload at least one PDF file.")
            elif not job_role or not stage:
                st.error("Please select a Job Role and Stage.")
            else:
                with st.spinner("Uploading and processing..."):
                    response_data = upload_resumes(
                        uploaded_files, job_role, stage)
                    if response_data and response_data.get("message"):
                        st.success(
                            f'{response_data.get("message")}')
                    else:
                        st.error(
                            "An error occurred during upload. Check backend logs for details.")


# --- Page: Manage Settings ---
def page_manage_settings():
    st.title("⚙️ Manage Settings")
    if 'stages' not in st.session_state:
        load_data()

    col1, col2 = st.columns(2)

    # --- Column 1: Manage Stages ---
    with col1:
        with st.container(border=True):
            st.subheader("🎓 Manage Stages")
            with st.form("new_stage_form"):
                new_stage_name = st.text_input("New Stage Name")
                if st.form_submit_button("Create Stage"):
                    if new_stage_name and create_stage(new_stage_name):
                        refresh_data('stages')

            st.markdown("---")
            stages_data = st.session_state.get('stages', [])
            stage_names = stages_data

            if stage_names:
                stage_to_delete = st.selectbox(
                    "Select stage to delete", options=stage_names, index=None, placeholder="Choose a stage...", key="del_stage"
                )
                if st.button("Delete Stage", type="secondary"):
                    if stage_to_delete:
                        if delete_stage(stage_to_delete):
                            refresh_data('all')
                    else:
                        st.warning("Please select a stage to delete.")
            else:
                st.info("No stages created yet.")

    # --- Column 2: Manage Job Roles ---
    with col2:
        with st.container(border=True):
            st.subheader("🧑‍💻 Manage Job Roles")
            with st.form("new_job_role_form"):
                new_job_role_name = st.text_input("New Job Role Name")
                if st.form_submit_button("Create Job Role"):
                    if new_job_role_name and create_job_role(new_job_role_name):
                        refresh_data('job_roles')

            st.markdown("---")
            job_roles_data = st.session_state.get('job_roles', [])
            job_role_names = job_roles_data

            if job_role_names:
                job_role_to_delete = st.selectbox(
                    "Select job role to delete", options=job_role_names, index=None, placeholder="Choose a job role...", key="del_job"
                )
                if st.button("Delete Job Role", type="secondary"):
                    if job_role_to_delete:
                        if delete_job_role(job_role_to_delete):
                            refresh_data('all')
                    else:
                        st.warning("Please select a job role to delete.")
            else:
                st.info("No job roles created yet.")


# --- Main App Logic ---
if page == "Resume Board":
    page_resume_board()
elif page == "Edit Resumes":
    page_edit_resumes()
elif page == "Upload Resumes":
    page_upload_resumes()
elif page == "Manage Settings":
    page_manage_settings()
