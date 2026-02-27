# views/settings.py
import streamlit as st
import api
from state import load_data, refresh_data

def render():
    st.title("⚙️ Manage Settings")
    if 'stages' not in st.session_state:
        load_data()

    col1, col2 = st.columns(2)

    with col1:
        with st.container(border=True):
            st.subheader("🎓 Manage Stages")
            with st.form("new_stage_form"):
                new_stage_name = st.text_input("New Stage Name")
                if st.form_submit_button("Create Stage"):
                    if new_stage_name and api.create_stage(new_stage_name):
                        refresh_data('stages')

            st.markdown("---")
            stage_names = st.session_state.get('stages', [])

            if stage_names:
                stage_to_delete = st.selectbox(
                    "Select stage to delete", options=stage_names, index=None, placeholder="Choose a stage...", key="del_stage"
                )
                if st.button("Delete Stage", type="secondary"):
                    if stage_to_delete:
                        if api.delete_stage(stage_to_delete):
                            refresh_data('all')
                    else:
                        st.warning("Please select a stage to delete.")
            else:
                st.info("No stages created yet.")

    with col2:
        with st.container(border=True):
            st.subheader("🧑‍💻 Manage Job Roles")
            with st.form("new_job_role_form"):
                new_job_role_name = st.text_input("New Job Role Name")
                if st.form_submit_button("Create Job Role"):
                    if new_job_role_name and api.create_job_role(new_job_role_name):
                        refresh_data('job_roles')

            st.markdown("---")
            job_role_names = st.session_state.get('job_roles', [])

            if job_role_names:
                job_role_to_delete = st.selectbox(
                    "Select job role to delete", options=job_role_names, index=None, placeholder="Choose a job role...", key="del_job"
                )
                if st.button("Delete Job Role", type="secondary"):
                    if job_role_to_delete:
                        if api.delete_job_role(job_role_to_delete):
                            refresh_data('all')
                    else:
                        st.warning("Please select a job role to delete.")
            else:
                st.info("No job roles created yet.")