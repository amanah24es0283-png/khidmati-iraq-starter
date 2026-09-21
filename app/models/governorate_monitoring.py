"""Continuous monitoring configuration for governorates."""

from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class GovernorateMonitoring(Base):
    __tablename__ = "governorate_monitoring"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    governorate_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("governorates.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean, default=True, nullable=False, index=True
    )
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    governorate: Mapped["Governorate"] = relationship(
        "Governorate",
        back_populates="monitoring",
    )
