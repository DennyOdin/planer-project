from . import db
from datetime import datetime, date, time
from sqlalchemy import CheckConstraint

class Task(db.Model):
    __tablename__ = 'task'
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(100), nullable=False)
    description = db.Column(db.String(500))
    due_date = db.Column(db.DateTime, nullable=True)
    estimated_time = db.Column(db.Integer, default=1, nullable=False)
    priority = db.Column(db.Integer, CheckConstraint('priority BETWEEN 1 AND 5'), nullable=True)
    status = db.Column(db.Enum("to do", "doing", "done"), default="to do", nullable=False)
    reminder = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, onupdate=datetime.utcnow)

    # Quadrant classification for task visualization (optional)
    quadrant = db.Column(db.String(50), nullable=True)

    # New fields for calendar scheduling
    calendar_date = db.Column(db.Date, nullable=True)
    start_time = db.Column(db.Time, nullable=True)
    duration_minutes = db.Column(db.Integer, nullable=True)
    assigned_day = db.Column(db.Integer, nullable=True)
    assigned_hour = db.Column(db.Integer, nullable=True)

    def __repr__(self):
        return f"<Task {self.id} - {self.title}>"

class Prefab(db.Model):
    __tablename__ = 'prefab'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.String(500))
    tasks = db.relationship('PrefabTask', back_populates='prefab', cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Prefab {self.id} - {self.name}>"

class PrefabTask(db.Model):
    __tablename__ = 'prefab_task'
    id = db.Column(db.Integer, primary_key=True)
    prefab_id = db.Column(db.Integer, db.ForeignKey('prefab.id'), nullable=False)
    prefab = db.relationship('Prefab', back_populates='tasks')
    title = db.Column(db.String(100), nullable=False)
    description = db.Column(db.String(500))
    estimated_time = db.Column(db.Integer, default=1, nullable=False)
    priority = db.Column(db.Integer, CheckConstraint('priority BETWEEN 1 AND 5'), nullable=True)
    quadrant = db.Column(db.String(50), nullable=True)

    def __repr__(self):
        return f"<PrefabTask {self.id} - {self.title}>"