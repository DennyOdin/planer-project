"""estimate set to 1 default

Revision ID: 4090339c1fce
Revises: f1a6cccfb34e
Create Date: 2024-11-29 13:11:28.725407

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '4090339c1fce'
down_revision = 'f1a6cccfb34e'
branch_labels = None
depends_on = None


def upgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    with op.batch_alter_table('task', schema=None) as batch_op:
        batch_op.alter_column('estimated_time',
               existing_type=sa.INTEGER(),
               nullable=False)

    # ### end Alembic commands ###


def downgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    with op.batch_alter_table('task', schema=None) as batch_op:
        batch_op.alter_column('estimated_time',
               existing_type=sa.INTEGER(),
               nullable=True)

    # ### end Alembic commands ###
