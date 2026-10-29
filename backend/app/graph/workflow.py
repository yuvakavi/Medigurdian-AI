from langgraph.graph import StateGraph, START, END

from app.graph.state import MedicalAgentState

from app.graph.nodes import (
    decide_action,
    retrieve_knowledge,
    generate_medical_response,

    mcp_patient_profile,
    mcp_search_doctors,
    mcp_doctor_details,
    mcp_patient_appointments,
    mcp_book_patient_appointment,

    # NEW
    mcp_cancel_patient_appointment,
    mcp_reschedule_patient_appointment,

    mcp_billing,
    mcp_notification,

    generate_tool_response,
)


# ============================================================
# CREATE GRAPH
# ============================================================

builder = StateGraph(MedicalAgentState)


# ============================================================
# ADD NODES
# ============================================================

# Main decision node
builder.add_node(
    "decide_action",
    decide_action
)

# RAG / medical information
builder.add_node(
    "retrieve_knowledge",
    retrieve_knowledge
)

builder.add_node(
    "generate_medical_response",
    generate_medical_response
)


# ============================================================
# MCP NODES
# ============================================================

builder.add_node(
    "mcp_patient_profile",
    mcp_patient_profile
)

builder.add_node(
    "mcp_search_doctors",
    mcp_search_doctors
)

builder.add_node(
    "mcp_doctor_details",
    mcp_doctor_details
)

builder.add_node(
    "mcp_patient_appointments",
    mcp_patient_appointments
)

builder.add_node(
    "mcp_book_patient_appointment",
    mcp_book_patient_appointment
)


# ============================================================
# CANCEL / RESCHEDULE
# ============================================================

builder.add_node(
    "mcp_cancel_patient_appointment",
    mcp_cancel_patient_appointment
)

builder.add_node(
    "mcp_reschedule_patient_appointment",
    mcp_reschedule_patient_appointment
)


# ============================================================
# OTHER MCP NODES
# ============================================================

builder.add_node(
    "mcp_billing",
    mcp_billing
)

builder.add_node(
    "mcp_notification",
    mcp_notification
)


# ============================================================
# TOOL RESPONSE NODE
# ============================================================

builder.add_node(
    "generate_tool_response",
    generate_tool_response
)


# ============================================================
# START
# ============================================================

builder.add_edge(
    START,
    "decide_action"
)


# ============================================================
# ROUTING FUNCTION
# ============================================================

def route_action(state: MedicalAgentState):

    action = state.get(
        "next_action",
        "rag"
    )

    # -------------------------
    # Medical / RAG
    # -------------------------

    if action == "rag":
        return "retrieve_knowledge"


    # -------------------------
    # Patient profile
    # -------------------------

    if action == "patient_profile":
        return "mcp_patient_profile"


    # -------------------------
    # Doctor search
    # -------------------------

    if action == "search_doctors":
        return "mcp_search_doctors"


    # -------------------------
    # Doctor details
    # -------------------------

    if action == "doctor_details":
        return "mcp_doctor_details"


    # -------------------------
    # Patient appointments
    # -------------------------

    if action == "patient_appointments":
        return "mcp_patient_appointments"


    # -------------------------
    # Book appointment
    # -------------------------

    if action == "book_appointment":
        return "mcp_book_patient_appointment"


    # ========================================================
    # CANCEL APPOINTMENT
    # ========================================================

    if action == "cancel_appointment":
        return "mcp_cancel_patient_appointment"


    # ========================================================
    # RESCHEDULE APPOINTMENT
    # ========================================================

    if action == "reschedule_appointment":
        return "mcp_reschedule_patient_appointment"


    # -------------------------
    # Billing
    # -------------------------

    if action == "billing":
        return "mcp_billing"


    # -------------------------
    # Notification
    # -------------------------

    if action == "notification":
        return "mcp_notification"


    # -------------------------
    # Default
    # -------------------------

    return "retrieve_knowledge"


# ============================================================
# CONDITIONAL ROUTING
# ============================================================

builder.add_conditional_edges(
    "decide_action",
    route_action
)


# ============================================================
# RAG FLOW
# ============================================================

builder.add_edge(
    "retrieve_knowledge",
    "generate_medical_response"
)

builder.add_edge(
    "generate_medical_response",
    END
)


# ============================================================
# MCP FLOWS
# ============================================================

builder.add_edge(
    "mcp_patient_profile",
    "generate_tool_response"
)

builder.add_edge(
    "mcp_search_doctors",
    "generate_tool_response"
)

builder.add_edge(
    "mcp_doctor_details",
    "generate_tool_response"
)

builder.add_edge(
    "mcp_patient_appointments",
    "generate_tool_response"
)

builder.add_edge(
    "mcp_book_patient_appointment",
    "generate_tool_response"
)


# ============================================================
# CANCEL FLOW
# ============================================================

builder.add_edge(
    "mcp_cancel_patient_appointment",
    "generate_tool_response"
)


# ============================================================
# RESCHEDULE FLOW
# ============================================================

builder.add_edge(
    "mcp_reschedule_patient_appointment",
    "generate_tool_response"
)


# ============================================================
# OTHER MCP FLOWS
# ============================================================

builder.add_edge(
    "mcp_billing",
    "generate_tool_response"
)

builder.add_edge(
    "mcp_notification",
    "generate_tool_response"
)


# ============================================================
# FINAL TOOL RESPONSE
# ============================================================

builder.add_edge(
    "generate_tool_response",
    END
)


# ============================================================
# COMPILE GRAPH
# ============================================================

medical_graph = builder.compile()