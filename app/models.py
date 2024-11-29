# This file's function is to create and maintain tables for users, tasks, and other related data

from . import db
from datetime import datetime, date, time
from sqlalchemy import CheckConstraint

class User(db.Model):
    __tablename__ = 'user'
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password = db.Column(db.String(120), nullable=False)
    tasks = db.relationship('Task', back_populates='user')

class Task(db.Model):
    __tablename__ = 'task'
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(100), nullable=False)  # Task title (required)
    description = db.Column(db.String(500))  # Optional description
    due_date = db.Column(db.DateTime, nullable=True)  # Optional due date
    estimated_time = db.Column(db.Integer, default="1", nullable=False)  # Optional duration in minutes
    priority = db.Column(db.Integer, CheckConstraint('priority BETWEEN 1 AND 5'), nullable=True)  # 1 to 5
    status = db.Column(db.Enum("to do", "doing", "done"), default="to do", nullable=False)  # Default: 'to do'
    reminder = db.Column(db.DateTime, nullable=True)  # Optional reminder time
    created_at = db.Column(db.DateTime, default=datetime.utcnow)  # Created timestamp
    updated_at = db.Column(db.DateTime, onupdate=datetime.utcnow)  # Updated timestamp
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'))  # Foreign key to User
    user = db.relationship('User', back_populates='tasks')  # Relationship to User

    # Quadrant classification for task visualization (optional)
    quadrant = db.Column(db.String(50), nullable=True)

    # New fields for calendar scheduling
    calendar_date = db.Column(db.Date, nullable=True)  # Specific date for the task
    start_time = db.Column(db.Time, nullable=True)  # Start time on the calendar
    duration_minutes = db.Column(db.Integer, nullable=True)  # Duration in minutes

    # Calendar grid association for drag-and-drop
    assigned_day = db.Column(db.Integer, nullable=True)  # Day of the week (0 for Monday, 6 for Sunday)
    assigned_hour = db.Column(db.Integer, nullable=True)  # Hour of the day (0 to 23)

    def __repr__(self):
        return f"<Task {self.id} - {self.title}>"

