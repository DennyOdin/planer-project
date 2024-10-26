# This files function is to define routes for viewing, creating, updating and deleteing tasks

from flask import Blueprint, render_template, request, redirect, url_for, flash
from .models import Task, db
from datetime import datetime

main = Blueprint('main', __name__)

#Display all tasks on the / route
@main.route('/')
def index():
    tasks = Task.query.all()  # Fetch all tasks
    return render_template('index.html', tasks=tasks)

# Add a new task to the database, through form submission
@main.route('/task/add', methods=['GET', 'POST'])
def add_task():
    if request.method == 'POST':
        title = request.form['title']
        description = request.form.get('description')
        due_date_str = request.form.get('due_date')
        
        if not due_date_str:
            flash("Due date is required.", "danger")
            return redirect(url_for('main.index'))

        try:
            due_date = datetime.strptime(due_date_str, '%Y-%m-%d')
        except ValueError:
            flash("Invalid date format. Please use YYYY-MM-DD.", "danger")
            return redirect(url_for('main.index'))
        
        estimated_time = int(request.form.get('estimated_time', 0))
        priority = int(request.form.get('priority', 1))
        task = Task(
            title=title,
            description=description,
            due_date=due_date,
            estimated_time=estimated_time,
            priority=priority
        )
        db.session.add(task)
        db.session.commit()
        flash("Task added successfully!", "success")
        return redirect(url_for('main.index'))
    return render_template('add_task.html')

# Edit an existing task
@main.route('/task/edit/<int:task_id>', methods=['GET', 'POST'])
def edit_task(task_id):
    task = Task.query.get_or_404(task_id)
    if request.method == 'POST':
        task.title = request.form['title']
        task.description = request.form.get('description')
        task.due_date = datetime.strptime(request.form.get('due_date'), '%Y-%m-%d')
        task.estimated_time = int(request.form.get('estimated_time', 0))
        task.priority = int(request.form.get('priority', 1))
        task.status = request.form.get('status')
        db.session.commit()
        flash("Task updated successfully!", "success")
        return redirect(url_for('main.index'))
    return render_template('edit_task.html', task=task)

# Delete a task
@main.route('/task/delete/<int:task_id>', methods=['POST'])
def delete_task(task_id):
    task = Task.query.get_or_404(task_id)
    db.session.delete(task)
    db.session.commit()
    flash("Task deleted successfully!", "success")
    return redirect(url_for('main.index'))