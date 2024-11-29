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
    const day = parseInt(targetSlot.dataset.day);
    const hour = parseInt(targetSlot.dataset.hour);

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

document.addEventListener("DOMContentLoaded", () => {
    const calendarSlots = document.querySelectorAll(".calendar-slot");
    let activeTask = null;
    let initialHeight = 0;
    let initialMouseY = 0;

    // Drag Start Handler
    function handleDragStart(e) {
        e.dataTransfer.setData('text/plain', e.target.getAttribute('data-task-id'));
        e.target.classList.add('dragging');
    }

    // Drag Over Handler
    function handleDragOver(e) {
        e.preventDefault();
        e.currentTarget.classList.add('drag-over');
    }

    // Drop Handler
    function handleDrop(e) {
        e.preventDefault();
        e.currentTarget.classList.remove('drag-over');

        const taskId = e.dataTransfer.getData('text/plain');
        const taskElement = document.querySelector(`[data-task-id="${taskId}"]`);
        const targetSlot = e.currentTarget;
        const day = targetSlot.getAttribute('data-day');
        const hour = targetSlot.getAttribute('data-hour');

        // Check for overlapping tasks
        if (isTaskOverlapping(taskElement, targetSlot)) {
            alert('This task overlaps with existing tasks!');
            return;
        }

        // Remove from previous container
        taskElement.parentNode.removeChild(taskElement);
        
        // Add to new slot
        targetSlot.appendChild(taskElement);

        // Update backend
        fetch('/calendar/assign_task', {
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
        })
        .then(response => response.json())
        .then(data => {
            if (!data.success) {
                console.error('Failed to assign task:', data.error);
                alert('Failed to assign task');
            }
        })
        .catch(error => {
            console.error('Error assigning task:', error);
            alert('An error occurred while assigning the task');
        });
    }

    // Check for task overlapping
    function isTaskOverlapping(taskElement, targetSlot) {
        const newTaskHeight = parseInt(taskElement.getAttribute('data-estimated-time'));
        const targetSlotIndex = [...calendarSlots].indexOf(targetSlot);
        
        // Check if task exceeds remaining slots
        if (targetSlotIndex + newTaskHeight > calendarSlots.length) {
            return true;
        }

        // Check for overlapping tasks in the same column
        const existingTasks = targetSlot.querySelectorAll('.task-item');
        return existingTasks.length > 0;
    }

    // Unassigned Drop Handler
    function handleUnassignedDrop(event) {
        event.preventDefault();
        event.currentTarget.classList.remove('drag-over');

        const taskId = event.dataTransfer.getData('text/plain');

        fetch('/calendar/assign_task', {
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
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
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
        })
        .catch(error => {
            console.error('Error unassigning task:', error);
            alert('An error occurred while moving the task');
        });
    }

    // Resize Handlers
    function resizeTask(e) {
        if (!activeTask) return;

        const deltaY = e.clientY - initialMouseY;
        const slotHeight = calendarSlots[0].offsetHeight; // Assuming uniform slot height
        const newHeight = initialHeight + deltaY;

        // Calculate new duration
        const newSlots = Math.round(newHeight / slotHeight);
        const estimatedTime = parseInt(activeTask.getAttribute("data-estimated-time"));
        const currentSlot = activeTask.closest(".calendar-slot");
        const currentSlotIndex = [...calendarSlots].indexOf(currentSlot);
        const maxSlots = calendarSlots.length - currentSlotIndex;
        
        // Prevent Overflow or Overlap
        if (newSlots <= 0 || newSlots > maxSlots) return;

        // Check for overlapping tasks
        const siblingTasks = [...currentSlot.querySelectorAll(".task-item")].filter(task => task !== activeTask);
        const wouldOverlap = siblingTasks.length > 0;
        
        if (wouldOverlap) {
            alert("Task cannot overlap with other tasks!");
            return;
        }

        // Visual Update
        activeTask.style.height = `${newSlots * slotHeight}px`;

        // Update Estimated Time Attribute
        activeTask.setAttribute("data-estimated-time", newSlots);
    }

    function stopResize() {
        if (activeTask) {
            const taskId = activeTask.getAttribute("data-task-id");
            const estimatedTime = parseInt(activeTask.getAttribute("data-estimated-time"));

            // Save Updated Estimated Time to Backend
            fetch(`/task/update-duration/${taskId}`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ estimated_time: estimatedTime }),
            })
            .then(response => response.json())
            .then(data => {
                if (!data.success) {
                    console.error('Failed to update task duration:', data.error);
                    alert('Failed to update task duration');
                }
            })
            .catch(error => {
                console.error('Error updating task duration:', error);
                alert('An error occurred while updating task duration');
            });

            // Reset and Remove Listeners
            activeTask = null;
            document.removeEventListener("mousemove", resizeTask);
            document.removeEventListener("mouseup", stopResize);
        }
    }

    // Add Event Listeners
    document.querySelectorAll(".resize-handle").forEach(handle => {
        handle.addEventListener("mousedown", (e) => {
            e.preventDefault();
            activeTask = handle.parentElement;
            initialHeight = activeTask.offsetHeight;
            initialMouseY = e.clientY;

            document.addEventListener("mousemove", resizeTask);
            document.addEventListener("mouseup", stopResize);
        });
    });

    // Add global drag and drop event listeners
    document.querySelectorAll('.task-item[draggable="true"]').forEach(task => {
        task.addEventListener('dragstart', handleDragStart);
    });

    document.querySelectorAll('.calendar-slot').forEach(slot => {
        slot.addEventListener('dragover', handleDragOver);
        slot.addEventListener('drop', handleDrop);
    });

    // Unassigned tasks container drop handler
    const unassignedContainer = document.getElementById('unassigned-tasks');
    unassignedContainer.addEventListener('dragover', handleDragOver);
    unassignedContainer.addEventListener('drop', handleUnassignedDrop);
});

// Optional: Prevent default drag behavior to ensure our custom handlers work
document.addEventListener('dragstart', (e) => {
    e.dataTransfer.effectAllowed = 'move';
});

document.addEventListener('dragend', (e) => {
    const draggingElement = document.querySelector('.dragging');
    if (draggingElement) {
        draggingElement.classList.remove('dragging');
    }