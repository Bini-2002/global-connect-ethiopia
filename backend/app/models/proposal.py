# app/models/proposal.py

from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, Enum
from sqlalchemy.orm import relationship
from datetime import datetime
from app.db.base import Base
from app.models.proposal_states import ProposalStatus


class Proposal(Base):
    __tablename__ = "proposals"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    organizer_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    status = Column(
        Enum(ProposalStatus),
        default=ProposalStatus.DRAFT,
        nullable=False
    )
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    organizer = relationship("User", back_populates="proposals")