document.addEventListener('DOMContentLoaded', () => {
    // Add draggable attribute to each task in the unassigned list
    document.querySelectorAll('.list-group-item, .task-item').forEach(item => {
        item.setAttribute('draggable', true);

        // Drag start event
        item.addEventListener('dragstart', (event) => {
            event.dataTransfer.setData('taskId', event.target.dataset.taskId);
        });
    });

    // Quadrant drop zones
    document.querySelectorAll('.quadrant').forEach(quadrant => {
        // Allow tasks to be dropped
        quadrant.addEventListener('dragover', (event) => event.preventDefault());

        // Drop event to handle task assignment
        quadrant.addEventListener('drop', (event) => {
            event.preventDefault();
            const taskId = event.dataTransfer.getData('taskId');
            const taskElement = document.querySelector(`[data-task-id="${taskId}"]`);
            
            if (taskElement) {
                // Append task to the dropped quadrant
                quadrant.querySelector('.task-list').appendChild(taskElement);
                updateTaskQuadrant(taskId, quadrant.id);  // Call to update quadrant in the database
            }
        });
    });
});

// Function to update the task's quadrant in the database
function updateTaskQuadrant(taskId, quadrantId) {
    fetch(`/update_task_quadrant/${taskId}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ quadrant: quadrantId })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            console.log("Task quadrant updated successfully!");
        } else {
            console.error("Failed to update task quadrant.");
        }
    });
}
