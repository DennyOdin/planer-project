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
        quadrant.addEventListener('dragover', (event) => event.preventDefault());
        quadrant.addEventListener('drop', (event) => {
            event.preventDefault();
            const taskId = event.dataTransfer.getData('taskId');
            const taskElement = document.querySelector(`[data-task-id="${taskId}"]`);
            if (taskElement) {
                quadrant.querySelector('.task-list').appendChild(taskElement);
                updateTaskQuadrant(taskId, quadrant.id);  // Update the quadrant
            }
        });
    });

    // Deletion zone
    const deletionZone = document.getElementById('deletion-zone');
    deletionZone.addEventListener('dragover', (event) => event.preventDefault());
    deletionZone.addEventListener('drop', (event) => {
        event.preventDefault();
        const taskId = event.dataTransfer.getData('taskId');
        
        if (taskId) {
            deleteTask(taskId, () => {
                const taskElement = document.querySelector(`[data-task-id="${taskId}"]`);
                if (taskElement) {
                    taskElement.remove();  // Remove the task from the DOM
                }
            });
        }
    });
});

// Function to delete task
function deleteTask(taskId, callback) {
    fetch(`/task/delete/${taskId}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            console.log("Task deleted successfully!");
            if (callback) callback();
            window.location.reload();  // Force a page reload after successful deletion
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
