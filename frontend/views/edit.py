# views/edit.py
import streamlit as st
import api
from state import load_data, refresh_data

def render():
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

    resume_map = {}
    for row in resumes_data:
        if len(row) >= 3:
            resume_id_str = str(row[0])
            job_role = row[1]
            stage = row[2]
            candidate_name = row[3] if len(row) > 3 and row[3] else None
            display_name = candidate_name if candidate_name else f"Candidate #{resume_id_str}"
            
            resume_map[resume_id_str] = {
                "id": resume_id_str, 
                "job_role": job_role, 
                "stage": stage,
                "name": display_name
            }

    st.subheader("🔍 Find Resume")
    col1, col2 = st.columns([2, 1])

    with col1:
        search_query = st.text_input("Search by Candidate Name or ID", placeholder="Enter name or ID...")
    with col2:
        filter_role = st.selectbox("Filter by Job Role", options=["All"] + all_job_roles, index=0)

    filtered_resumes = []
    for resume_id, data in resume_map.items():
        if search_query:
            query = search_query.lower()
            if query not in data["name"].lower() and query not in data["id"]:
                continue
        if filter_role != "All" and data["job_role"] != filter_role:
            continue
        filtered_resumes.append(resume_id)

    if not filtered_resumes:
        st.warning("No resumes match your search criteria.")
        return

    st.markdown("---")
    st.subheader(f"📋 Resumes ({len(filtered_resumes)} found)")

    num_cols = 3
    cols = st.columns(num_cols)

    for idx, resume_id in enumerate(filtered_resumes):
        data = resume_map[resume_id]

        with cols[idx % num_cols]:
            with st.container(border=True):
                st.markdown(f"### 📄 {data['name']}")
                st.caption(f"ID: {data['id']}")
                st.write(f"**Job Role:** {data['job_role']}")
                st.write(f"**Stage:** {data['stage']}")
                st.markdown("---")

                with st.form(key=f"edit_form_{resume_id}"):
                    st.caption("Update Information:")

                    try:
                        current_job_role_index = all_job_roles.index(data['job_role'])
                    except ValueError:
                        current_job_role_index = 0

                    new_job_role = st.selectbox(
                        "Job Role",
                        options=all_job_roles,
                        index=current_job_role_index,
                        key=f"job_role_select_{resume_id}"
                    )

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

                    update_clicked = st.form_submit_button("💾 Update", type="primary", use_container_width=True)

                    if update_clicked:
                        try:
                            resume_id_int = int(resume_id)
                            changes_made = False

                            if new_job_role != data['job_role']:
                                if api.update_resume_job_role(resume_id_int, new_job_role):
                                    changes_made = True
                                else:
                                    st.error("Failed to update job role")

                            if new_stage != data['stage']:
                                if api.update_resume_stage(resume_id_int, new_stage):
                                    changes_made = True
                                else:
                                    st.error("Failed to update stage")

                            if changes_made:
                                st.success(f"✅ {data['name']} updated successfully!")
                                refresh_data('resumes')
                            else:
                                st.info("No changes detected.")
                        except ValueError:
                            st.error("Cannot update: Resume ID is not an integer.")
                        except Exception as e:
                            st.error(f"An error occurred: {e}")

                confirm_key = f"confirm_delete_{resume_id}"
                if st.session_state.get(confirm_key):
                    st.warning(f"Move **{data['name']}** to deleted folder?")
                    col_yes, col_no = st.columns(2)
                    with col_yes:
                        if st.button("Yes, delete", key=f"yes_delete_{resume_id}", type="primary", use_container_width=True):
                            try:
                                if api.delete_resume(int(resume_id)):
                                    st.session_state.pop(confirm_key, None)
                                    st.success(f"Moved {data['name']} to deleted.")
                                    refresh_data('resumes')
                                    st.rerun()
                                else:
                                    st.error("Delete failed.")
                            except ValueError:
                                st.error("Cannot delete: Resume ID is not an integer.")
                    with col_no:
                        if st.button("Cancel", key=f"no_delete_{resume_id}", use_container_width=True):
                            st.session_state.pop(confirm_key, None)
                            st.rerun()
                else:
                    if st.button("🗑️ Delete", key=f"delete_{resume_id}", use_container_width=True):
                        st.session_state[confirm_key] = True
                        st.rerun()