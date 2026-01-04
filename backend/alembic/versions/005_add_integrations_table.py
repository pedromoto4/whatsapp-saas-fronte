"""Add integrations table

Revision ID: 005_add_integrations_table
Revises: 004_add_push_tokens_table
Create Date: 2025-01-20 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '005_add_integrations_table'
down_revision = '004_add_push_tokens_table'
branch_labels = None
depends_on = None


def upgrade():
    # Create integrations table
    op.create_table('integrations',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('wa_phone_number_id', sa.String(), nullable=False),
        sa.Column('wa_access_token', sa.Text(), nullable=False),
        sa.Column('wa_business_account_id', sa.String(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True, server_default='true'),
        sa.Column('last_verified_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id')
    )
    op.create_index(op.f('ix_integrations_id'), 'integrations', ['id'], unique=False)
    op.create_index(op.f('ix_integrations_user_id'), 'integrations', ['user_id'], unique=True)
    op.create_index(op.f('ix_integrations_wa_phone_number_id'), 'integrations', ['wa_phone_number_id'], unique=False)


def downgrade():
    op.drop_index(op.f('ix_integrations_wa_phone_number_id'), table_name='integrations')
    op.drop_index(op.f('ix_integrations_user_id'), table_name='integrations')
    op.drop_index(op.f('ix_integrations_id'), table_name='integrations')
    op.drop_table('integrations')

