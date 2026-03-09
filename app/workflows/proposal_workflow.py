from transitions import Machine

class ProposalWorkflow:
    states = [
        "draft",
        "submitted",
        "ministry_review",
        "ministry_revision",
        "ministry_rejected",
        "municipal_review",
        "municipal_revision",
        "municipal_rejected",
        "approved"
    ]

    def __init__(self):
        self.machine = Machine(
            model=self,
            states=ProposalWorkflow.states,
            initial="draft"
        )

        # Organizer submits proposal
        self.machine.add_transition(
            trigger="submit",
            source="draft",
            dest="ministry_review"
        )

        # Ministry decisions
        self.machine.add_transition(
            trigger="ministry_approve",
            source="ministry_review",
            dest="municipal_review"
        )

        self.machine.add_transition(
            trigger="ministry_revision",
            source="ministry_review",
            dest="ministry_revision"
        )

        self.machine.add_transition(
            trigger="ministry_reject",
            source="ministry_review",
            dest="ministry_rejected"
        )

        # Organizer fixes proposal
        self.machine.add_transition(
            trigger="resubmit",
            source="ministry_revision",
            dest="ministry_review"
        )

        # Municipal decisions
        self.machine.add_transition(
            trigger="municipal_approve",
            source="municipal_review",
            dest="approved"
        )

        self.machine.add_transition(
            trigger="municipal_revision",
            source="municipal_review",
            dest="municipal_revision"
        )

        self.machine.add_transition(
            trigger="municipal_reject",
            source="municipal_review",
            dest="municipal_rejected"
        )

        self.machine.add_transition(
            trigger="resubmit_municipal",
            source="municipal_revision",
            dest="municipal_review"
        )

def __init__(self):
    self.machine = Machine(
        model=self,
        states=ProposalWorkflow.states,
        initial="draft"
    )

    # Organizer submits proposal
    self.machine.add_transition(
        trigger="submit",
        source="draft",
        dest="ministry_review"
    )

    # Ministry decisions
    self.machine.add_transition(
        trigger="ministry_approve",
        source="ministry_review",
        dest="municipal_review"
    )

    self.machine.add_transition(
        trigger="ministry_revision",
        source="ministry_review",
        dest="ministry_revision"
    )

    self.machine.add_transition(
        trigger="ministry_reject",
        source="ministry_review",
        dest="ministry_rejected"
    )

    # Organizer fixes proposal
    self.machine.add_transition(
        trigger="resubmit",
        source="ministry_revision",
        dest="ministry_review"
    )

    # Municipal decisions
    self.machine.add_transition(
        trigger="municipal_approve",
        source="municipal_review",
        dest="approved"
    )

    self.machine.add_transition(
        trigger="municipal_revision",
        source="municipal_review",
        dest="municipal_revision"
    )

    self.machine.add_transition(
        trigger="municipal_reject",
        source="municipal_review",
        dest="municipal_rejected"
    )

    self.machine.add_transition(
        trigger="resubmit_municipal",
        source="municipal_revision",
        dest="municipal_review"
    )

