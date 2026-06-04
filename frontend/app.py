# app.py
import streamlit as st
import api
from state import refresh_data

# Views
from views import board, edit, upload, settings, analytics

# --- Page Configuration ---
st.set_page_config(
    page_title="Resumaze Dashboard",
    page_icon="📄",
    layout="wide",
    initial_sidebar_state="expanded",
)

# --- Sidebar ---
with st.sidebar:
    st.title("📄 Resumaze")
    if api.get_health():
        st.success("API Status: Connected")
    else:
        st.error("API Status: Disconnected")
        st.warning("Ensure the Go backend is running on `localhost:8080`.")
    st.markdown("---")

    page = st.radio("Navigation", [
        "Resume Board",
        "Edit Resumes",
        "Upload Resumes",
        "Analytics",
        "Manage Settings",
    ])

    st.markdown("---")
    if st.button("🔄 Refresh Data"):
        refresh_data('all')
    st.info("Applicant Tracking System")

# --- Routing ---
if page == "Resume Board":
    board.render()
elif page == "Edit Resumes":
    edit.render()
elif page == "Upload Resumes":
    upload.render()
elif page == "Analytics":
    analytics.render()
elif page == "Manage Settings":
    settings.render()
