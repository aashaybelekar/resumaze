# views/edit.py
import streamlit as st
import api
from state import load_data, refresh_data

def _render_notes(resume_id: int, candidate_name: str):
    notes = api.get_notes(resume_id)
    if notes:
        for note in notes:
            col_note, col_del = st.columns([10, 1])
            with col_note:
                st.markdown(f"> {note['content']}")
                st.caption(f"{note.get('created_by') or 'Anonymous'} · {note.get('created_at', '')[:10]}")
            with col_del:
                if st.button("✕", key=f"del_note_{note['id']}", help="Delete note"):
                    if api.delete_note(note["id"]):
                        st.rerun()
    else:
        st.caption("No notes yet.")

    with st.form(key=f"note_form_{resume_id}"):
        note_content = st.text_area("Add a note", key=f"note_content_{resume_id}", label_visibility="collapsed", placeholder="Write a note...")
        note_by = st.text_input("Your name (optional)", key=f"note_by_{resume_id}")
        if st.form_submit_button("Add Note"):
            if note_content:
                if api.create_note(resume_id, note_content, note_by):
                    st.rerun()
            else:
                st.warning("Note cannot be empty.")

def _render_interviews(resume_id: int):
    interviews = api.get_interviews(resume_id)
    if interviews:
        for iv in interviews:
            with st.container(border=True):
                col_a, col_b, col_del = st.columns([3, 3, 1])
                with col_a:
                    st.write(f"**Interviewer:** {iv.get('interviewer') or '—'}")
                    st.write(f"**Date:** {(iv.get('interview_date') or '')[:10] or '—'}")
                with col_b:
                    st.write(f"**Outcome:** {iv.get('outcome') or '—'}")
                    if iv.get('meeting_link'):
                        st.markdown(f"[Meeting link]({iv['meeting_link']})")
                with col_del:
                    if st.button("✕", key=f"del_iv_{iv['id']}", help="Delete interview"):
                        if api.delete_interview(iv["id"]):
                            st.rerun()
                if iv.get('feedback'):
                    st.caption(f"Feedback: {iv['feedback']}")
    else:
        st.caption("No interviews scheduled.")

    with st.expander("Schedule interview"):
        with st.form(key=f"iv_form_{resume_id}"):
            col1, col2 = st.columns(2)
            with col1:
                interviewer = st.text_input("Interviewer name")
                interview_date = st.text_input("Date (YYYY-MM-DD)", placeholder="2025-07-15")
            with col2:
                meeting_link = st.text_input("Meeting link")
                outcome = st.selectbox("Outcome", ["", "Pending", "Passed", "Failed", "No-show"])
            feedback = st.text_area("Feedback")
            if st.form_submit_button("Save Interview"):
                if interviewer:
                    date_str = f"{interview_date}T00:00:00Z" if interview_date else ""
                    if api.create_interview(resume_id, interviewer, date_str, meeting_link, feedback, outcome):
                        st.rerun()
                else:
                    st.warning("Interviewer name is required.")

def render():
    st.title("Edit Resume Details")

    if 'stages' not in st.session_state:
        load_data()

    all_job_roles = st.session_state.get('job_roles', [])
    all_stages = st.session_state.get('stages', [])

    # Server-side search and filter
    st.subheader("Find Resume")
    col1, col2, col3 = st.columns([3, 2, 2])
    with col1:
        search_query = st.text_input("Search by name or email", placeholder="Enter name or email...")
    with col2:
        filter_role = st.selectbox("Filter by Job Role", options=["All"] + all_job_roles)
    with col3:
        filter_stage = st.selectbox("Filter by Stage", options=["All"] + all_stages)

    # Export CSV button
    csv_bytes = None
    if st.button("Export filtered results as CSV"):
        csv_bytes = api.download_export_csv(
            search=search_query,
            stage="" if filter_stage == "All" else filter_stage,
            role="" if filter_role == "All" else filter_role,
        )
        if csv_bytes:
            st.download_button(
                label="Download CSV",
                data=csv_bytes,
                file_name="candidates.csv",
                mime="text/csv",
            )

    resumes_data = api.get_resumes(
        search=search_query,
        stage="" if filter_stage == "All" else filter_stage,
        role="" if filter_role == "All" else filter_role,
        limit=100,
    )

    if not resumes_data:
        st.info("No resumes match your search criteria.")
        return

    if not all_job_roles:
        st.warning("No Job Roles created. Go to 'Manage Settings' to add some.")
        return

    st.markdown("---")
    st.subheader(f"Resumes ({len(resumes_data)} found)")

    num_cols = 3
    cols = st.columns(num_cols)

    for idx, row in enumerate(resumes_data):
        resume_id = row["id"]
        resume_id_str = str(resume_id)
        parts = [row.get("first_name", ""), row.get("middle_name", ""), row.get("last_name", "")]
        display_name = " ".join(p for p in parts if p) or f"Candidate #{resume_id_str}"
        job_role = row.get("role", "")
        stage = row.get("stage", "")
        phone = row.get("phone", "")
        email = row.get("email", "")
        has_github = row.get("has_github", False)

        with cols[idx % num_cols]:
            with st.container(border=True):
                st.markdown(f"### {display_name}")
                st.caption(f"ID: {resume_id_str}")
                st.write(f"**Job Role:** {job_role or '—'}")
                st.write(f"**Stage:** {stage or '—'}")

                st.markdown("**Contact Details**")
                col_a, col_b = st.columns(2)
                with col_a:
                    st.write(f"📞 {phone or '—'}")
                with col_b:
                    st.write(f"✉️ {email or '—'}")
                github_label = "✅ GitHub present" if has_github else "❌ No GitHub"
                st.caption(github_label)

                st.markdown("---")

                with st.form(key=f"edit_form_{resume_id}"):
                    st.caption("Update Information:")

                    try:
                        current_job_role_index = all_job_roles.index(job_role)
                    except ValueError:
                        current_job_role_index = 0

                    new_job_role = st.selectbox(
                        "Job Role",
                        options=all_job_roles,
                        index=current_job_role_index,
                        key=f"job_role_select_{resume_id}"
                    )

                    try:
                        current_stage_index = all_stages.index(stage)
                    except ValueError:
                        current_stage_index = 0

                    new_stage = st.selectbox(
                        "Stage",
                        options=all_stages,
                        index=current_stage_index,
                        key=f"stage_select_{resume_id}"
                    )

                    update_clicked = st.form_submit_button("Save", type="primary", use_container_width=True)

                    if update_clicked:
                        changes_made = False
                        if new_job_role != job_role:
                            if api.update_resume_job_role(resume_id, new_job_role):
                                changes_made = True
                            else:
                                st.error("Failed to update job role")
                        if new_stage != stage:
                            if api.update_resume_stage(resume_id, new_stage):
                                changes_made = True
                            else:
                                st.error("Failed to update stage")
                        if changes_made:
                            st.success(f"✅ {display_name} updated!")
                            refresh_data('resumes')
                        else:
                            st.info("No changes detected.")

                confirm_key = f"confirm_delete_{resume_id}"
                if st.session_state.get(confirm_key):
                    st.warning(f"Move **{display_name}** to deleted folder?")
                    col_yes, col_no = st.columns(2)
                    with col_yes:
                        if st.button("Yes, delete", key=f"yes_delete_{resume_id}", type="primary", use_container_width=True):
                            if api.delete_resume(resume_id):
                                st.session_state.pop(confirm_key, None)
                                st.success(f"Moved {display_name} to deleted.")
                                refresh_data('resumes')
                                st.rerun()
                            else:
                                st.error("Delete failed.")
                    with col_no:
                        if st.button("Cancel", key=f"no_delete_{resume_id}", use_container_width=True):
                            st.session_state.pop(confirm_key, None)
                            st.rerun()
                else:
                    if st.button("Delete", key=f"delete_{resume_id}", use_container_width=True):
                        st.session_state[confirm_key] = True
                        st.rerun()

                # Notes and Interviews in tabs
                tab_notes, tab_interviews = st.tabs(["Notes", "Interviews"])
                with tab_notes:
                    _render_notes(resume_id, display_name)
                with tab_interviews:
                    _render_interviews(resume_id)
