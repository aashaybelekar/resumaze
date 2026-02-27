# views/upload.py
import streamlit as st
import api
from state import load_data

def render():
    st.title("➕ Bulk Upload Resumes")

    if 'stages' not in st.session_state:
        load_data()

    stages_data = st.session_state.get('stages', [])
    job_roles_data = st.session_state.get('job_roles', [])

    if not stages_data or not job_roles_data:
        st.warning("Please create at least one Job Role and one Stage in 'Manage Settings' before uploading.")
        return

    with st.form("new_resume_form"):
        st.info("Upload multiple PDF resumes. They will all be assigned the Job Role and Stage selected below.")

        uploaded_files = st.file_uploader("Upload Resumes", type="pdf", accept_multiple_files=True)

        col1, col2 = st.columns(2)
        with col1:
            job_role = st.selectbox("Assign to Job Role", options=job_roles_data)
        with col2:
            stage = st.selectbox("Assign to Initial Stage", options=stages_data)

        submitted = st.form_submit_button("Upload and Process Resumes", type="primary")

        if submitted:
            if not uploaded_files:
                st.error("Please upload at least one PDF file.")
            elif not job_role or not stage:
                st.error("Please select a Job Role and Stage.")
            else:
                with st.spinner("Uploading and processing..."):
                    response_data = api.upload_resumes(uploaded_files, job_role, stage)
                    if response_data and response_data.get("message"):
                        st.success(f'{response_data.get("message")}')
                    else:
                        st.error("An error occurred during upload. Check backend logs for details.")
                        