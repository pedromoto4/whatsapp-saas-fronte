"""Add appointments tables

Revision ID: 003_add_appointments_tables
Revises: 002_add_faq_table
Create Date: 2024-01-20 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '003_add_appointments_tables'
down_revision = '002_add_faq_table'
branch_labels = None
depends_on = None


def upgrade():
    # Create service_types table
    op.create_table('service_types',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('owner_id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('duration_minutes', sa.Integer(), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['owner_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_service_types_id'), 'service_types', ['id'], unique=False)
    
    # Create recurring_availability table
    op.create_table('recurring_availability',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('owner_id', sa.Integer(), nullable=False),
        sa.Column('day_of_week', sa.Integer(), nullable=False),
        sa.Column('start_time', sa.Time(), nullable=False),
        sa.Column('end_time', sa.Time(), nullable=False),
        sa.Column('slot_duration_minutes', sa.Integer(), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['owner_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_recurring_availability_id'), 'recurring_availability', ['id'], unique=False)
    
    # Create availability_exceptions table
    op.create_table('availability_exceptions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('owner_id', sa.Integer(), nullable=False),
        sa.Column('date', sa.DateTime(timezone=True), nullable=False),
        sa.Column('is_blocked', sa.Boolean(), nullable=True),
        sa.Column('custom_slots', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['owner_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_availability_exceptions_id'), 'availability_exceptions', ['id'], unique=False)
    op.create_index('ix_availability_exceptions_owner_date', 'availability_exceptions', ['owner_id', 'date'], unique=False)
    
    # Create appointments table
    op.create_table('appointments',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('owner_id', sa.Integer(), nullable=False),
        sa.Column('contact_id', sa.Integer(), nullable=False),
        sa.Column('service_type_id', sa.Integer(), nullable=True),
        sa.Column('scheduled_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('status', sa.String(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['owner_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['contact_id'], ['contacts.id'], ),
        sa.ForeignKeyConstraint(['service_type_id'], ['service_types.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_appointments_id'), 'appointments', ['id'], unique=False)
    op.create_index('ix_appointments_owner_scheduled', 'appointments', ['owner_id', 'scheduled_at'], unique=False)


def downgrade():
    op.drop_index('ix_appointments_owner_scheduled', table_name='appointments')
    op.drop_index(op.f('ix_appointments_id'), table_name='appointments')
    op.drop_table('appointments')
    op.drop_index('ix_availability_exceptions_owner_date', table_name='availability_exceptions')
    op.drop_index(op.f('ix_availability_exceptions_id'), table_name='availability_exceptions')
    op.drop_table('availability_exceptions')
    op.drop_index(op.f('ix_recurring_availability_id'), table_name='recurring_availability')
    op.drop_table('recurring_availability')
    op.drop_index(op.f('ix_service_types_id'), table_name='service_types')
    op.drop_table('service_types')

