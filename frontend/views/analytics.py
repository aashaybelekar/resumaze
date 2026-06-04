# views/analytics.py
import streamlit as st
import api

def render():
    st.title("Analytics & Insights")

    col_refresh, _ = st.columns([1, 5])
    with col_refresh:
        if st.button("Refresh"):
            for key in ["analytics_data", "duplicates_data"]:
                st.session_state.pop(key, None)
            st.rerun()

    tab_overview, tab_duplicates = st.tabs(["Pipeline Overview", "Duplicate Candidates"])

    with tab_overview:
        _render_analytics()

    with tab_duplicates:
        _render_duplicates()


def _render_analytics():
    if "analytics_data" not in st.session_state:
        st.session_state.analytics_data = api.get_analytics()

    data = st.session_state.analytics_data
    if not data:
        st.error("Could not load analytics data.")
        return

    # Top metrics
    col1, col2, col3, col4 = st.columns(4)
    col1.metric("Total Applications", data.get("total_applications", 0))
    col2.metric("With GitHub", data.get("with_github", 0))
    col3.metric("Uploaded (last 7 days)", data.get("recent_uploads_7d", 0))
    github_pct = 0
    total = data.get("total_applications", 0)
    if total > 0:
        github_pct = round(data.get("with_github", 0) / total * 100, 1)
    col4.metric("GitHub %", f"{github_pct}%")

    st.markdown("---")

    col_stage, col_role = st.columns(2)

    with col_stage:
        st.subheader("By Stage")
        by_stage = data.get("by_stage", [])
        if by_stage:
            for entry in by_stage:
                stage_name = entry.get("stage", "")
                count = entry.get("count", 0)
                pct = count / total if total > 0 else 0
                st.write(f"**{stage_name}** — {count}")
                st.progress(pct)
        else:
            st.info("No stage data available.")

    with col_role:
        st.subheader("By Job Role")
        by_role = data.get("by_role", [])
        if by_role:
            for entry in by_role:
                role_name = entry.get("role", "")
                count = entry.get("count", 0)
                pct = count / total if total > 0 else 0
                st.write(f"**{role_name}** — {count}")
                st.progress(pct)
        else:
            st.info("No role data available.")


def _render_duplicates():
    if "duplicates_data" not in st.session_state:
        st.session_state.duplicates_data = api.get_duplicates()

    groups = st.session_state.duplicates_data
    if not groups:
        st.success("No duplicate candidates detected.")
        return

    st.warning(f"{len(groups)} duplicate group(s) found")

    for i, group in enumerate(groups):
        match_type = group.get("match_type", "")
        match_value = group.get("match_value", "")
        candidates = group.get("candidates", [])

        with st.expander(f"Duplicate by {match_type}: **{match_value}** ({len(candidates)} candidates)"):
            for c in candidates:
                parts = [c.get("first_name", ""), c.get("middle_name", ""), c.get("last_name", "")]
                name = " ".join(p for p in parts if p) or f"Candidate #{c['id']}"
                col_a, col_b, col_c = st.columns([3, 2, 2])
                with col_a:
                    st.write(f"**{name}** (ID: {c['id']})")
                    st.caption(f"📧 {c.get('email') or '—'}  📞 {c.get('phone') or '—'}")
                with col_b:
                    st.write(f"Role: {c.get('role') or '—'}")
                    st.write(f"Stage: {c.get('stage') or '—'}")
                with col_c:
                    st.caption(f"Uploaded: {(c.get('uploaded_time') or '')[:10] or '—'}")
                st.markdown("---")
