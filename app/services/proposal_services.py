from app.models.proposal_states import ProposalState
from app.workflows.proposal_workflow import ProposalWorkflow

def process_ministry_decision(current_status: str, decision: str):
  workflow = ProposalWorkflow()
  workflow.state = current_status

  if decision == "approve":
    workflow.ministry_approve()
  elif decision == "revision":
    workflow.ministry_revision()
  elif decision == "reject":
    workflow.ministry_reject()
  return workflow.state


def process_municipal_decision(current_status: str, decision: str):
  workflow = ProposalWorkflow()
  workflow.state = current_status

  if decision == "approve":
    workflow.municipal_approve()
  elif decision == "revision":
    workflow.municipal_revision()
  elif decision == "reject":
    workflow.municipal_reject()
  return workflow.state

