"""add Iraqi governorates and areas

Revision ID: 9d44a2db7324
Revises: cbfc27943b30
Create Date: 2026-09-21 16:57:34.728950

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9d44a2db7324'
down_revision: Union[str, None] = 'cbfc27943b30'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
        INSERT INTO governorates (id, name_ar, name_en, is_active, created_at)
        VALUES
        (9, 'دهوك', 'Duhok', true, NOW()),
        (10, 'السليمانية', 'Sulaymaniyah', true, NOW()),
        (11, 'ديالى', 'Diyala', true, NOW()),
        (12, 'واسط', 'Wasit', true, NOW()),
        (13, 'بابل', 'Babylon', true, NOW()),
        (14, 'ميسان', 'Maysan', true, NOW()),
        (15, 'المثنى', 'Muthanna', true, NOW()),
        (16, 'القادسية', 'Qadisiyah', true, NOW()),
        (17, 'صلاح الدين', 'Saladin', true, NOW()),
        (18, 'كركوك', 'Kirkuk', true, NOW()),
        (19, 'حلبجة', 'Halabja', true, NOW())
        ON CONFLICT (id) DO NOTHING
    """)

    op.execute("""
        INSERT INTO areas (governorate_id, name_ar, name_en, is_active, created_at)
        VALUES
        (9, 'دهوك المركز', 'Duhok Center', true, NOW()),
        (9, 'زاخو', 'Zakho', true, NOW()),
        (9, 'العمادية', 'Amedi', true, NOW()),
        (10, 'السليمانية المركز', 'Sulaymaniyah Center', true, NOW()),
        (10, 'حلبجة', 'Halabja', true, NOW()),
        (10, 'رانية', 'Ranya', true, NOW()),
        (11, 'بعقوبة', 'Baqubah', true, NOW()),
        (11, 'خانقين', 'Khanaqin', true, NOW()),
        (11, 'المقدادية', 'Muqdadiyah', true, NOW()),
        (12, 'الكوت', 'Kut', true, NOW()),
        (12, 'الحي', 'Al-Hayy', true, NOW()),
        (12, 'النعمانية', 'Numaniyah', true, NOW()),
        (13, 'الحلة', 'Hillah', true, NOW()),
        (13, 'المحاويل', 'Al-Mahaweel', true, NOW()),
        (13, 'المسيب', 'Al-Musayab', true, NOW()),
        (14, 'العمارة', 'Amarah', true, NOW()),
        (14, 'المجر الكبير', 'Al-Majar Al-Kabir', true, NOW()),
        (14, 'قلعة صالح', 'Qalat Saleh', true, NOW()),
        (15, 'السماوة', 'Samawah', true, NOW()),
        (15, 'الرميثة', 'Al-Rumaitha', true, NOW()),
        (15, 'الخضر', 'Al-Khidhir', true, NOW()),
        (16, 'الديوانية', 'Diwaniyah', true, NOW()),
        (16, 'الشامية', 'Shamiyah', true, NOW()),
        (16, 'عفك', 'Afak', true, NOW()),
        (17, 'تكريت', 'Tikrit', true, NOW()),
        (17, 'سامراء', 'Samarra', true, NOW()),
        (17, 'بيجي', 'Baiji', true, NOW()),
        (18, 'كركوك المركز', 'Kirkuk Center', true, NOW()),
        (18, 'الحويجة', 'Hawija', true, NOW()),
        (18, 'الدبس', 'Dibis', true, NOW()),
        (19, 'حلبجة المركز', 'Halabja Center', true, NOW()),
        (19, 'بيارة', 'Byara', true, NOW()),
        (19, 'خورمال', 'Khurmal', true, NOW())
        ON CONFLICT DO NOTHING
    """)


def downgrade() -> None:
    op.execute("""
        DELETE FROM areas
        WHERE governorate_id BETWEEN 9 AND 19
    """)
    op.execute("""
        DELETE FROM governorates
        WHERE id BETWEEN 9 AND 19
    """)



def downgrade() -> None:
    pass
