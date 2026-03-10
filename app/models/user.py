from sqlalchemy import Column, Integer, String, Enum
from sqlalchemy.orm import relationship

from app.db.base import Base
from app.models.roles import UserRole


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False)
    full_name = Column(String(255))
    role = Column(Enum(UserRole), nullable=False)
    proposals = relationship("Proposal", back_populates="organizer")
    organizer = relationship("User", back_populates="proposals")