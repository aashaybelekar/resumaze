# views/board.py
import streamlit as st
from streamlit_sortables import sort_items
import api
from state import load_data, refresh_data

def render():
    st.title("🚀 Resume Board")

    if 'stages' not in st.session_state:
        load_data()

    stages_data = st.session_state.get('stages', [])
    resumes_data = st.session_state.get('resumes', [])

    if not stages_data:
        st.warning("No stages found. Please create stages in 'Manage Settings' first.")
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
                    data = resume_map[resume_id_str]
                    card_string = f"{data['name']} (ID:{data['id']})\nRole: {data['job_role']}"
                    display_cards.append(card_string)
                    card_to_id_map[card_string] = resume_id_str

            sorted_cards = sort_items(
                display_cards,
                header=stage_name,
                key=f"stage_{stage_name}"
            )

            new_items_by_stage[stage_name] = [card_to_id_map[card] for card in sorted_cards]

    # Process Moves
    for stage_name, new_ids in new_items_by_stage.items():
        original_ids = set(items_by_stage[stage_name])
        for resume_id_str in new_ids:
            if resume_id_str not in original_ids:
                try:
                    resume_id_int = int(resume_id_str)
                    if api.update_resume_stage(resume_id_int, stage_name):
                        refresh_data('resumes')
                    else:
                        st.error("Failed to move candidate. Refreshing...")
                        refresh_data('all')
                except ValueError:
                    st.error(f"Invalid Resume ID: {resume_id_str}. ID must be an integer.")
                except Exception as e:
                    st.error(f"An error occurred while moving: {e}")
                return