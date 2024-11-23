document.addEventListener('DOMContentLoaded', () => {
    // Initialize all draggable task items
    initializeDraggableItems();
    initializeDropZones();
});

function initializeDraggableItems() {
    document.querySelectorAll('.task-item').forEach(task => {
        task.setAttribute('draggable', true);
        task.addEventListener('dragstart', handleDragStart);
        task.addEventListener('dragend', handleDragEnd);
    });
}

function initializeDropZones() {
    document.querySelectorAll('.calendar-slot').forEach(slot => {
        slot.addEventListener('dragover', handleDragOver);
        slot.addEventListener('dragleave', handleDragLeave);
        slot.addEventListener('drop', handleDrop);
    });

    // Make unassigned tasks container a drop zone too
    const unassignedContainer = document.getElementById('unassigned-tasks');
    if (unassignedContainer) {
        unassignedContainer.addEventListener('dragover', handleDragOver);
        unassignedContainer.addEventListener('dragleave', handleDragLeave);
        unassignedContainer.addEventListener('drop', handleUnassignedDrop);
    }
}

function handleDragStart(event) {
    event.target.classList.add('dragging');
    event.dataTransfer.setData('text/plain', event.target.dataset.taskId);
    event.dataTransfer.effectAllowed = 'move';
}

function handleDragEnd(event) {
    event.target.classList.remove('dragging');
    document.querySelectorAll('.drag-over').forEach(element => {
        element.classList.remove('drag-over');
    });
}

function handleDragOver(event) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    event.currentTarget.classList.add('drag-over');
}

function handleDragLeave(event) {
    event.currentTarget.classList.remove('drag-over');
}

async function handleDrop(event) {
    event.preventDefault();
    event.currentTarget.classList.remove('drag-over');

    const taskId = event.dataTransfer.getData('text/plain');
    const targetSlot = event.currentTarget;
    const day = targetSlot.dataset.day;
    const hour = targetSlot.dataset.hour;

    try {
        const response = await fetch('/calendar/assign_task', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: JSON.stringify({
                task_id: taskId,
                day: day,
                hour: hour
            })
        });

        const data = await response.json();
        
        if (data.success) {
            // Move the task element to the new slot
            const taskElement = document.querySelector(`[data-task-id="${taskId}"]`);
            if (taskElement) {
                // Remove from old parent
                taskElement.parentNode.removeChild(taskElement);
                // Add to new slot
                targetSlot.appendChild(taskElement);
            }
        } else {
            console.error('Failed to assign task:', data.error);
            alert('Failed to assign task to calendar slot');
        }
    } catch (error) {
        console.error('Error assigning task:', error);
        alert('An error occurred while assigning the task');
    }
}

async function handleUnassignedDrop(event) {
    event.preventDefault();
    event.currentTarget.classList.remove('drag-over');

    const taskId = event.dataTransfer.getData('text/plain');

    try {
        const response = await fetch('/calendar/assign_task', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: JSON.stringify({
                task_id: taskId,
                day: null,
                hour: null
            })
        });

        const data = await response.json();
        
        if (data.success) {
            // Move the task element to the unassigned container
            const taskElement = document.querySelector(`[data-task-id="${taskId}"]`);
            if (taskElement) {
                // Remove from old parent
                taskElement.parentNode.removeChild(taskElement);
                // Add to unassigned container
                document.getElementById('unassigned-tasks').appendChild(taskElement);
            }
        } else {
            console.error('Failed to unassign task:', data.error);
            alert('Failed to move task to unassigned list');
        }
    } catch (error) {
        console.error('Error unassigning task:', error);
        alert('An error occurred while moving the task');
    }
}