# This files function is to define routes for viewing, creating, updating and deleteing tasks

from flask import Blueprint, render_template, request, redirect, url_for
from .models import Task, db

main = Blueprint('main', __name__)

#Display all tasks on the / route
@main.route('/')
def index():
    tasks = Task.query.all()  # Fetch all tasks
    return render_template('index.html', tasks=tasks)

#Add a new task to the database, through form submission
@main.route('/add', methods=['POST'])
def add_task():
    title = request.form.get('title')
    new_task = Task(title=title)
    db.session.add(new_task)
    db.session.commit()
    return redirect(url_for('main.index'))