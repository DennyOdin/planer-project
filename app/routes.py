# This files function is to define routes for viewing, creating, updating and deleteing tasks

from flask import Blueprint, render_template, request, redirect, url_for, flash, jsonify
from .models import Task, db
from datetime import datetime

main = Blueprint('main', __name__)

#display main page and allow sorting
@main.route('/')
def index():
    sort_by = request.args.get('sort_by')
    if sort_by == 'status':
        tasks = Task.query.order_by(Task.status).all()
    elif sort_by == 'priority':
        tasks = Task.query.order_by(Task.priority.desc()).all()  # High priority first
    elif sort_by == 'due_date':
        tasks = Task.query.order_by(Task.due_date).all()
    else:
        tasks = Task.query.all()  # Default sorting
    
    return render_template('index.html', tasks=tasks)


@main.route('/task/add', methods=['GET', 'POST'])
def add_task():
    if request.method == 'POST':
        title = request.form.get('title')  # Handle missing title more gracefully
        if not title:
            flash("Task title is required!", "danger")
            return redirect(url_for('main.index'))
        
        description = request.form.get('description')
        due_date_str = request.form.get('due_date')
        due_date = datetime.strptime(due_date_str, '%Y-%m-%d') if due_date_str else None
        estimated_time = request.form.get('estimated_time')
        priority = request.form.get('priority')

        estimated_time = int(estimated_time) if estimated_time else None
        priority = int(priority) if priority else 1

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
    return render_template('index.html')  # Adjusted to load the main page


@main.route('/task/edit/<int:task_id>', methods=['POST'])
def edit_task(task_id):
    task = Task.query.get_or_404(task_id)
    task.title = request.form.get('title', task.title)
    task.description = request.form.get('description', task.description)

    due_date_str = request.form.get('due_date')
    task.due_date = datetime.strptime(due_date_str, '%Y-%m-%d') if due_date_str else None

    estimated_time_str = request.form.get('estimated_time')
    task.estimated_time = int(estimated_time_str) if estimated_time_str else None

    priority_str = request.form.get('priority')
    task.priority = int(priority_str) if priority_str else task.priority

    task.status = request.form.get('status', task.status)
    
    db.session.commit()
    flash("Task updated successfully!", "success")
    return redirect(url_for('main.index'))

#delete a task from the db
@main.route('/task/delete/<int:task_id>', methods=['POST'])
def delete_task(task_id):
    task = Task.query.get_or_404(task_id)
    db.session.delete(task)
    db.session.commit()
    flash("Task deleted successfully!", "success")
    return redirect(url_for('main.index'))

@main.route('/quadrant_view')
def quadrant_view():
    # Fetch tasks that are unassigned (to display on the right)
    unassigned_tasks = Task.query.filter_by(quadrant=None).all()

    # Fetch tasks for each quadrant
    urgent_important_tasks = Task.query.filter_by(quadrant='urgent-important').all()
    urgent_not_important_tasks = Task.query.filter_by(quadrant='urgent-not-important').all()
    not_urgent_important_tasks = Task.query.filter_by(quadrant='not-urgent-important').all()
    not_urgent_not_important_tasks = Task.query.filter_by(quadrant='not-urgent-not-important').all()

    return render_template('quadrant_view.html', 
                           unassigned_tasks=unassigned_tasks,
                           urgent_important_tasks=urgent_important_tasks,
                           urgent_not_important_tasks=urgent_not_important_tasks,
                           not_urgent_important_tasks=not_urgent_important_tasks,
                           not_urgent_not_important_tasks=not_urgent_not_important_tasks)


@main.route('/update_task_quadrant/<int:task_id>', methods=['POST'])
def update_task_quadrant(task_id):
    data = request.get_json()
    quadrant = data.get('quadrant')

    task = Task.query.get(task_id)
    if task:
        task.quadrant = quadrant  # Update the quadrant field
        db.session.commit()
        return jsonify({'success': True}), 200
    return jsonify({'success': False}), 404

