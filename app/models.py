# This files function is to create and maintain tables for users, tasks and other related data

from . import db
from datetime import datetime
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
    title = db.Column(db.String(100), nullable=False)
    description = db.Column(db.String(500))  # Limit description to 500 chars
    due_date = db.Column(db.DateTime)
    estimated_time = db.Column(db.Integer)  # in minutes
    priority = db.Column(db.Integer, CheckConstraint('priority BETWEEN 1 AND 5'), nullable=False)
    status = db.Column(db.Enum("to do", "doing", "done"), default="to do")
    reminder = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, onupdate=datetime.utcnow)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'))
    user = db.relationship('User', back_populates='tasks')