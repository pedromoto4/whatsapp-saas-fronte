"""Add push_tokens table

Revision ID: 004_add_push_tokens_table
Revises: 003_add_appointments_tables
Create Date: 2025-01-20 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '004_add_push_tokens_table'
down_revision = '003_add_appointments_tables'
branch_labels = None
depends_on = None


def upgrade():
    # Create push_tokens table
    op.create_table('push_tokens',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('owner_id', sa.Integer(), nullable=False),
        sa.Column('token', sa.String(), nullable=False),
        sa.Column('platform', sa.String(), nullable=False),
        sa.Column('device_name', sa.String(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['owner_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_push_tokens_id'), 'push_tokens', ['id'], unique=False)
    op.create_index(op.f('ix_push_tokens_token'), 'push_tokens', ['token'], unique=True)


def downgrade():
    op.drop_index(op.f('ix_push_tokens_token'), table_name='push_tokens')
    op.drop_index(op.f('ix_push_tokens_id'), table_name='push_tokens')
    op.drop_table('push_tokens')

