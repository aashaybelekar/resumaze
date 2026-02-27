# state.py
import streamlit as st
import api

def load_data():
    """Loads all necessary data into session state."""
    st.session_state.stages = api.get_stages()
    st.session_state.job_roles = api.get_job_roles()
    st.session_state.resumes = api.get_resumes()

def refresh_data(data_key: str):
    """Clears keys from session state to force a reload."""
    if data_key in st.session_state:
        del st.session_state[data_key]
    if 'stages' in st.session_state:
        del st.session_state.stages
    if 'job_roles' in st.session_state:
        del st.session_state.job_roles
    if 'resumes' in st.session_state:
        del st.session_state.resumes
    st.rerun()