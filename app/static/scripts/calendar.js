document.addEventListener('DOMContentLoaded', () => {
    const unassignedTasks = document.getElementById('unassigned-tasks');
    const calendarSlots = document.querySelectorAll('.calendar-slot');

    // Add dragstart listener to tasks
    document.querySelectorAll('.task-item').forEach(task => {
        task.addEventListener('dragstart', (event) => {
            event.dataTransfer.setData('taskId', task.dataset.taskId);
        });
    });

    // Add dragover and drop listeners to calendar slots
    calendarSlots.forEach(slot => {
        slot.addEventListener('dragover', (event) => {
            event.preventDefault();
            slot.classList.add('drag-over');
        });

        slot.addEventListener('dragleave', () => {
            slot.classList.remove('drag-over');
        });

        slot.addEventListener('drop', (event) => {
            event.preventDefault();
            slot.classList.remove('drag-over');

            const taskId = event.dataTransfer.getData('taskId');
            const taskElement = document.querySelector(`.task-item[data-task-id="${taskId}"]`);
            if (taskElement) {
                slot.appendChild(taskElement);

                // Update the task's assigned time slot in the database
                updateTaskAssignment(taskId, slot.dataset.day, slot.dataset.hour);
            }
        });
    });

    // Function to update task assignment via AJAX
    const updateTaskAssignment = (taskId, day, hour) => {
        fetch('/calendar/assign_task', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ task_id: taskId, day, hour }),
        })
        .then(response => response.json())
        .then(data => {
            if (!data.success) {
                console.error('Failed to update task assignment:', data.error);
            }
        })
        .catch(console.error);
    };
});
