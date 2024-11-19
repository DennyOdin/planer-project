"""Add calendar_date to tasks

Revision ID: f92bb967f24d
Revises: d52da5f9360f
Create Date: 2024-11-18 23:35:32.154772

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'f92bb967f24d'
down_revision = 'd52da5f9360f'
branch_labels = None
depends_on = None


def upgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    with op.batch_alter_table('task', schema=None) as batch_op:
        batch_op.add_column(sa.Column('calendar_date', sa.Date(), nullable=True))

    # ### end Alembic commands ###


def downgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    with op.batch_alter_table('task', schema=None) as batch_op:
        batch_op.drop_column('calendar_date')

    # ### end Alembic commands ###
