# This files function is to define routes for viewing, creating, updating and deleteing tasks
from flask import Blueprint, render_template, request, redirect, url_for, flash, jsonify
from sqlalchemy.orm.exc import NoResultFound  # Add this import
from .models import Task, db, Prefab, PrefabTask
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

# delete a task from the db
@main.route('/task/delete/<int:task_id>', methods=['POST'])
def delete_task(task_id):
    task = Task.query.get_or_404(task_id)
    db.session.delete(task)
    db.session.commit()
    flash("Task deleted successfully!", "success")
    return jsonify({'success': True}), 200

#---Calendar---
@main.route('/calendar', methods=['GET'])
def calendar_view():
    """
    Display the full calendar with all tasks.
    """
    tasks = Task.query.all()  # Adjust for user-specific tasks later
    unassigned_tasks = Task.query.filter(Task.assigned_day.is_(None), Task.assigned_hour.is_(None)).all()
    return render_template('calendar.html', tasks=tasks, unassigned_tasks=unassigned_tasks)

@main.route('/calendar/day/<string:date>', methods=['GET'])
def calendar_day_view(date):
    """
    Display tasks for the selected day and show unassigned tasks.
    """
    selected_date = datetime.strptime(date, '%Y-%m-%d').date()
    tasks = Task.query.filter_by(calendar_date=selected_date).all()
    unassigned_tasks = Task.query.filter(Task.calendar_date.is_(None)).all()

    return render_template('calendar.html', 
                           selected_date=selected_date, 
                           tasks=tasks, 
                           unassigned_tasks=unassigned_tasks)

@main.route('/calendar/unselect', methods=['GET'])
def unselect_day():
    """
    Return to the full calendar view.
    """
    tasks = Task.query.all()  # Adjust for user-specific tasks later
    return render_template('calendar.html', tasks=tasks)

@main.route('/task/update/<int:task_id>', methods=['POST'])
def update_task(task_id):
    """
    Update task details like assigned day or hour.
    """
    data = request.get_json()
    calendar_date = data.get('calendar_date')
    time_slot = data.get('time_slot')

    task = Task.query.get(task_id)
    if task:
        try:
            if calendar_date:
                task.calendar_date = datetime.strptime(calendar_date, '%Y-%m-%d').date()
            
            # Safely handle time_slot
            if time_slot is not None:
                task.estimated_time = max(1, int(time_slot))  # Ensure at least 1
            
            db.session.commit()
            return jsonify({"message": "Task updated successfully!"}), 200
        except (ValueError, TypeError) as e:
            db.session.rollback()
            return jsonify({"error": f"Invalid update data: {str(e)}"}), 400

    return jsonify({"error": "Task not found!"}), 404

@main.route('/calendar/assign_task', methods=['POST'])
def assign_task_to_calendar():
    data = request.get_json()
    task_id = data.get('task_id')
    day = data.get('day')
    hour = data.get('hour')

    task = Task.query.get(task_id)
    if task:
        try:
            # Convert day and hour, handling None values
            task.assigned_day = int(day) if day is not None else None
            task.assigned_hour = int(hour) if hour is not None else None
            
            db.session.commit()
            return jsonify({'success': True}), 200
        except (ValueError, TypeError) as e:
            db.session.rollback()
            return jsonify({'success': False, 'error': f'Invalid assignment data: {str(e)}'}), 400

    return jsonify({'success': False, 'error': 'Task not found'}), 404

@main.route('/task/update-duration/<int:task_id>', methods=['POST'])
def update_task_duration(task_id):
    task = Task.query.get_or_404(task_id)
    new_duration = request.json.get('estimated_time')
    
    try:
        # Ensure new_duration is a positive integer
        if new_duration is not None and new_duration > 0:
            task.estimated_time = int(new_duration)
            db.session.commit()
            return jsonify({"success": True}), 200
        
        return jsonify({"success": False, "error": "Invalid duration"}), 400
    except (ValueError, TypeError) as e:
        db.session.rollback()
        return jsonify({"success": False, "error": f"Error updating duration: {str(e)}"}), 400
    
@main.route('/prefabs', methods=['GET', 'POST'])
def prefabs():
    if request.method == 'POST':
        # Use request.get_json() for JSON data
        data = request.get_json()
        
        # Validate input data
        if not data:
            return jsonify({'success': False, 'message': 'No data provided'}), 400
        
        # Check if required fields are present
        if not data.get('name'):
            return jsonify({'success': False, 'message': 'Prefab name is required'}), 400
        
        # Create new prefab
        prefab = Prefab(
            name=data['name'], 
            description=data.get('description', '')
        )

        # Create prefab tasks
        for task_data in data.get('tasks', []):
            prefab_task = PrefabTask(
                title=task_data.get('title', ''),
                description=task_data.get('description', ''),
                estimated_time=int(task_data.get('estimated_time', 1)),
                priority=int(task_data.get('priority', 3))  # Default to medium priority
            )
            prefab.tasks.append(prefab_task)

        try:
            db.session.add(prefab)
            db.session.commit()
            return jsonify({'success': True, 'message': 'Prefab created successfully.'}), 201
        except Exception as e:
            db.session.rollback()
            return jsonify({'success': False, 'message': str(e)}), 500

    # For GET, return all prefabs
    prefabs = Prefab.query.all()
    return render_template('prefabs.html', prefabs=prefabs)

@main.route('/prefabs/<int:prefab_id>', methods=['GET'])
def get_prefab(prefab_id):
    """Retrieve details of a specific prefab"""
    try:
        prefab = Prefab.query.get_or_404(prefab_id)
        return jsonify({
            'id': prefab.id,
            'name': prefab.name,
            'description': prefab.description,
            'tasks': [
                {
                    'title': task.title,
                    'description': task.description,
                    'priority': task.priority,
                    'estimated_time': task.estimated_time
                } for task in prefab.tasks
            ]
        })
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 404

@main.route('/apply_prefab/<int:prefab_id>', methods=['POST'])
def apply_prefab(prefab_id):
    """Apply a prefab to create tasks"""
    try:
        # Retrieve the prefab
        prefab = Prefab.query.get_or_404(prefab_id)

        # Create tasks from prefab
        created_tasks = []
        for prefab_task in prefab.tasks:
            task = Task(
                title=prefab_task.title,
                description=prefab_task.description,
                estimated_time=prefab_task.estimated_time,
                priority=prefab_task.priority,
                status="to do"  # Set default status
            )
            db.session.add(task)
            created_tasks.append(task)

        db.session.commit()
        return jsonify({
            'success': True, 
            'message': f'{len(created_tasks)} tasks created from prefab',
            'tasks_created': len(created_tasks)
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500

@main.route('/delete_prefab/<int:prefab_id>', methods=['DELETE'])
def delete_prefab(prefab_id):
    """Delete a specific prefab"""
    try:
        prefab = Prefab.query.get_or_404(prefab_id)
        db.session.delete(prefab)
        db.session.commit()
        return jsonify({'success': True, 'message': 'Prefab deleted successfully'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500