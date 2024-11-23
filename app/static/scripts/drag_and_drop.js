document.addEventListener('DOMContentLoaded', () => {
    // Set draggable attributes and drag event listeners
    document.querySelectorAll('.list-group-item, .task-item').forEach(item => {
        item.setAttribute('draggable', true);

        item.addEventListener('dragstart', (event) => {
            event.dataTransfer.setData('taskId', event.target.dataset.taskId);
        });
    });

    // Quadrant drop zones
    document.querySelectorAll('.quadrant').forEach(quadrant => {
        quadrant.addEventListener('dragover', (event) => {
            event.preventDefault();
            event.dataTransfer.dropEffect = 'move';
        });

        quadrant.addEventListener('drop', async (event) => {
            event.preventDefault();
            const taskId = event.dataTransfer.getData('taskId');
            const taskElement = document.querySelector(`[data-task-id="${taskId}"]`);
            if (taskElement) {
                // Get the quadrant ID (which matches the quadrant values in your database)
                const quadrantId = quadrant.id;
                
                // Try to update the task's quadrant in the database first
                const updateSuccess = await updateTaskQuadrant(taskId, quadrantId);
                
                if (updateSuccess) {
                    // Only move the element in the DOM if the database update was successful
                    quadrant.querySelector('.task-list').appendChild(taskElement);
                } else {
                    alert('Failed to update task quadrant. Please try again.');
                }
            }
        });
    });

    // Unassigned tasks area (treating it as a drop zone too)
    const unassignedList = document.getElementById('unassigned-task-list');
    if (unassignedList) {
        unassignedList.addEventListener('dragover', (event) => {
            event.preventDefault();
            event.dataTransfer.dropEffect = 'move';
        });

        unassignedList.addEventListener('drop', async (event) => {
            event.preventDefault();
            const taskId = event.dataTransfer.getData('taskId');
            const taskElement = document.querySelector(`[data-task-id="${taskId}"]`);
            if (taskElement) {
                // Update the task to have no quadrant (null)
                const updateSuccess = await updateTaskQuadrant(taskId, null);
                
                if (updateSuccess) {
                    unassignedList.appendChild(taskElement);
                } else {
                    alert('Failed to update task quadrant. Please try again.');
                }
            }
        });
    }

    // Deletion zone
    const deletionZone = document.getElementById('deletion-zone');
    deletionZone.addEventListener('dragover', (event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
    });
    
    deletionZone.addEventListener('drop', (event) => {
        event.preventDefault();
        const taskId = event.dataTransfer.getData('taskId');
        
        if (taskId) {
            deleteTask(taskId, () => {
                const taskElement = document.querySelector(`[data-task-id="${taskId}"]`);
                if (taskElement) {
                    taskElement.remove();
                }
            });
        }
    });
});

// Function to update task quadrant
async function updateTaskQuadrant(taskId, quadrant) {
    try {
        const response = await fetch(`/update_task_quadrant/${taskId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: JSON.stringify({ quadrant: quadrant })
        });

        const data = await response.json();
        return data.success;
    } catch (error) {
        console.error('Error updating task quadrant:', error);
        return false;
    }
}

// Function to delete task
function deleteTask(taskId, callback) {
    fetch(`/task/delete/${taskId}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            console.log("Task deleted successfully!");
            if (callback) callback();
        } else {
            console.error("Failed to delete task.");
            alert("Failed to delete task. Please try again.");
        }
    })
    .catch(error => {
        console.error("Error:", error);
        alert("An error occurred. Please try again.");
    });
}