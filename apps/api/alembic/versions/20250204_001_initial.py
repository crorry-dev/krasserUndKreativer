"""Initial schema

Revision ID: 001_initial
Revises: 
Create Date: 2025-02-04

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '001_initial'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Enable PostGIS extension for spatial queries
    op.execute('CREATE EXTENSION IF NOT EXISTS postgis')
    
    # Boards table
    op.create_table(
        'boards',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('name', sa.String(255), nullable=False, default='Untitled Board'),
        sa.Column('owner_id', sa.String(36), nullable=True),  # Future: user system
        sa.Column('settings', postgresql.JSONB, nullable=False, server_default='{}'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now()),
    )
    op.create_index('ix_boards_owner_id', 'boards', ['owner_id'])
    
    # Canvas objects table
    op.create_table(
        'canvas_objects',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('board_id', sa.String(36), sa.ForeignKey('boards.id', ondelete='CASCADE'), nullable=False),
        sa.Column('type', sa.String(50), nullable=False),  # stroke, shape, text, sticky, etc.
        sa.Column('x', sa.Float, nullable=False, default=0),
        sa.Column('y', sa.Float, nullable=False, default=0),
        sa.Column('width', sa.Float, nullable=False, default=0),
        sa.Column('height', sa.Float, nullable=False, default=0),
        sa.Column('rotation', sa.Float, nullable=False, default=0),
        sa.Column('z_index', sa.Integer, nullable=False, default=0),
        sa.Column('data', postgresql.JSONB, nullable=False, server_default='{}'),
        sa.Column('created_by', sa.String(36), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now()),
    )
    op.create_index('ix_canvas_objects_board_id', 'canvas_objects', ['board_id'])
    op.create_index('ix_canvas_objects_type', 'canvas_objects', ['type'])
    
    # Spatial index for efficient viewport queries
    # Using a box (x, y, x+width, y+height) for spatial lookups
    op.execute('''
        CREATE INDEX ix_canvas_objects_spatial ON canvas_objects 
        USING GIST (
            ST_MakeEnvelope(x, y, x + width, y + height, 0)
        )
    ''')
    
    # Guest links table
    op.create_table(
        'guest_links',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('board_id', sa.String(36), sa.ForeignKey('boards.id', ondelete='CASCADE'), nullable=False),
        sa.Column('code', sa.String(12), nullable=False, unique=True),
        sa.Column('name', sa.String(100), nullable=True),
        sa.Column('password_hash', sa.String(255), nullable=True),
        sa.Column('permissions', sa.String(20), nullable=False, default='edit'),  # 'edit' or 'view'
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('is_active', sa.Boolean, nullable=False, default=True),
        sa.Column('uses', sa.Integer, nullable=False, default=0),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index('ix_guest_links_board_id', 'guest_links', ['board_id'])
    op.create_index('ix_guest_links_code', 'guest_links', ['code'], unique=True)
    
    # Canvas events table (for history/versioning)
    op.create_table(
        'canvas_events',
        sa.Column('id', sa.BigInteger, primary_key=True, autoincrement=True),
        sa.Column('board_id', sa.String(36), sa.ForeignKey('boards.id', ondelete='CASCADE'), nullable=False),
        sa.Column('sequence', sa.BigInteger, nullable=False),
        sa.Column('event_type', sa.String(50), nullable=False),  # create, update, delete
        sa.Column('object_id', sa.String(36), nullable=False),
        sa.Column('data', postgresql.JSONB, nullable=False),
        sa.Column('user_id', sa.String(36), nullable=True),
        sa.Column('user_name', sa.String(100), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index('ix_canvas_events_board_id', 'canvas_events', ['board_id'])
    op.create_index('ix_canvas_events_board_sequence', 'canvas_events', ['board_id', 'sequence'])
    op.create_index('ix_canvas_events_object_id', 'canvas_events', ['object_id'])
    op.create_index('ix_canvas_events_created_at', 'canvas_events', ['created_at'])


def downgrade() -> None:
    op.drop_table('canvas_events')
    op.drop_table('guest_links')
    op.drop_table('canvas_objects')
    op.drop_table('boards')
    op.execute('DROP EXTENSION IF EXISTS postgis')
