// Calendar Drag and Drop Functionality
document.addEventListener('DOMContentLoaded', () => {
    const calendarSlots = document.querySelectorAll('.calendar-slot');
    const unassignedTasksContainer = document.getElementById('unassigned-tasks');
    let activeTask = null;
    let initialHeight = 0;
    let initialMouseY = 0;

    // Initialize draggable tasks
    function initializeDraggableTasks() {
        document.querySelectorAll('.task-item').forEach(task => {
            task.setAttribute('draggable', 'true');
            task.addEventListener('dragstart', handleDragStart);
        });
    }

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

    // Drop Handler for Calendar Slots
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
            alert('This task cannot overlap with existing tasks!');
            return;
        }

        // Remove from previous container and parent slots
        const currentParent = taskElement.parentNode;
        currentParent.removeChild(taskElement);

        // Determine number of slots needed
        const estimatedTime = parseInt(taskElement.getAttribute('data-estimated-time'));
        const slotsNeeded = Math.ceil(estimatedTime / 50); // Assuming each slot is 50px high

        // Append task and additional slots as needed
        targetSlot.appendChild(taskElement);
        
        // Expand task across multiple slots
        let currentSlot = targetSlot;
        let remainingSlots = slotsNeeded - 1;
        let currentHour = parseInt(hour);

        // Adjust task styling to span slots
        taskElement.style.height = `${slotsNeeded * 50}px`;
        taskElement.classList.add('multi-slot-task');

        // Find and add tasks to subsequent slots
        while (remainingSlots > 0) {
            currentHour++;
            // Find the next slot for the same day
            const nextSlot = document.querySelector(`.calendar-slot[data-day="${day}"][data-hour="${currentHour}"]`);
            
            if (!nextSlot) {
                console.warn('Not enough slots to place entire task');
                break;
            }

            // Mark slots as occupied
            nextSlot.classList.add('occupied-by-task');
            remainingSlots--;
        }

        // Update backend
        updateTaskAssignment(taskId, day, hour, slotsNeeded);
    }

    // Drop Handler for Unassigned Tasks
    function handleUnassignedDrop(e) {
        e.preventDefault();
        e.currentTarget.classList.remove('drag-over');

        const taskId = e.dataTransfer.getData('text/plain');
        const taskElement = document.querySelector(`[data-task-id="${taskId}"]`);

        // Remove from previous container and free up any occupied slots
        const currentParent = taskElement.parentNode;
        currentParent.removeChild(taskElement);
        
        // Remove multi-slot task classes and markers
        taskElement.classList.remove('multi-slot-task');
        document.querySelectorAll('.calendar-slot.occupied-by-task').forEach(slot => {
            slot.classList.remove('occupied-by-task');
        });

        // Reset task styling
        taskElement.style.height = '50px';
        
        // Add to unassigned container
        unassignedTasksContainer.appendChild(taskElement);

        // Update backend - unassign task
        updateTaskAssignment(taskId, null, null);
    }

    // Check for task overlapping
    function isTaskOverlapping(taskElement, targetSlot) {
        const estimatedTime = parseInt(taskElement.getAttribute('data-estimated-time'));
        const slotsNeeded = Math.ceil(estimatedTime / 50);
        const day = targetSlot.getAttribute('data-day');
        const startHour = parseInt(targetSlot.getAttribute('data-hour'));

        // Check slots that would be needed
        for (let i = 0; i < slotsNeeded; i++) {
            const checkSlot = document.querySelector(`.calendar-slot[data-day="${day}"][data-hour="${startHour + i}"]`);
            
            if (!checkSlot) {
                console.warn('Not enough slots to place task');
                return true;
            }

            // Check if any slot in the path is already occupied
            if (checkSlot.querySelector('.task-item') || checkSlot.classList.contains('occupied-by-task')) {
                return true;
            }
        }

        return false;
    }

    // Update task assignment via backend
    function updateTaskAssignment(taskId, day, hour, slotsDuration = 1) {
        fetch('/calendar/assign_task', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: JSON.stringify({
                task_id: taskId,
                day: day,
                hour: hour,
                slots_duration: slotsDuration
            })
        })
        .then(response => response.json())
        .then(data => {
            if (!data.success) {
                console.error('Failed to assign task:', data.error);
                alert('Failed to assign task: ' + (data.error || 'Unknown error'));
            }
        })
        .catch(error => {
            console.error('Error assigning task:', error);
            alert('An error occurred while assigning the task');
        });
    }

    // Task Resizing Functionality
    function setupTaskResizing() {
        const resizeHandles = document.querySelectorAll('.resize-handle');
        
        resizeHandles.forEach(handle => {
            handle.addEventListener('mousedown', startResize);
        });

        function startResize(e) {
            e.preventDefault();
            activeTask = e.target.closest('.task-item');
            initialHeight = activeTask.offsetHeight;
            initialMouseY = e.clientY;

            document.addEventListener('mousemove', resizeTask);
            document.addEventListener('mouseup', stopResize);
        }

        function resizeTask(e) {
            if (!activeTask) return;

            const deltaY = e.clientY - initialMouseY;
            const slotHeight = 50; // Matches the height in the HTML style
            const newHeight = initialHeight + deltaY;

            // Calculate new duration
            const newSlots = Math.ceil(newHeight / slotHeight);
            
            // Prevent negative or zero duration
            if (newSlots <= 0) return;

            // Get current slot and day
            const currentSlot = activeTask.closest('.calendar-slot');
            const day = currentSlot.getAttribute('data-day');
            const startHour = parseInt(currentSlot.getAttribute('data-hour'));

            // Check for overlapping tasks across slots
            if (isTaskOverlapping(activeTask, currentSlot)) {
                alert("Task cannot overlap with other tasks!");
                return;
            }

            // Clear previous multi-slot markers
            document.querySelectorAll('.calendar-slot.occupied-by-task').forEach(slot => {
                slot.classList.remove('occupied-by-task');
            });

            // Visual Update
            activeTask.style.height = `${newSlots * slotHeight}px`;
            activeTask.setAttribute('data-estimated-time', newSlots * slotHeight);

            // Mark additional slots as occupied
            let remainingSlots = newSlots - 1;
            let currentHour = startHour;

            while (remainingSlots > 0) {
                currentHour++;
                const nextSlot = document.querySelector(`.calendar-slot[data-day="${day}"][data-hour="${currentHour}"]`);
                
                if (!nextSlot) break;

                nextSlot.classList.add('occupied-by-task');
                remainingSlots--;
            }

            // Add multi-slot task class
            activeTask.classList.add('multi-slot-task');
        }

        function stopResize() {
            if (activeTask) {
                const taskId = activeTask.getAttribute('data-task-id');
                const estimatedTime = parseInt(activeTask.getAttribute('data-estimated-time'));

                // Save Updated Estimated Time to Backend
                fetch(`/task/update-duration/${taskId}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ 
                        estimated_time: estimatedTime,
                        slots_duration: Math.ceil(estimatedTime / 50)
                    }),
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
                document.removeEventListener('mousemove', resizeTask);
                document.removeEventListener('mouseup', stopResize);
            }
        }
    }

    // Setup global event listeners
    function setupEventListeners() {
        // Drag and drop for calendar slots
        calendarSlots.forEach(slot => {
            slot.addEventListener('dragover', handleDragOver);
            slot.addEventListener('drop', handleDrop);
            slot.addEventListener('dragleave', (e) => e.currentTarget.classList.remove('drag-over'));
        });

        // Drag and drop for unassigned tasks container
        unassignedTasksContainer.addEventListener('dragover', handleDragOver);
        unassignedTasksContainer.addEventListener('drop', handleUnassignedDrop);
        unassignedTasksContainer.addEventListener('dragleave', (e) => e.currentTarget.classList.remove('drag-over'));
    }

    // Initialize everything
    function init() {
        initializeDraggableTasks();
        setupEventListeners();
        setupTaskResizing();
    }

    // Run initialization
    init();
});

// Prevent default drag behavior
document.addEventListener('dragstart', (e) => {
    e.dataTransfer.effectAllowed = 'move';
});

document.addEventListener('dragend', (e) => {
    const draggingElement = document.querySelector('.dragging');
    if (draggingElement) {
        draggingElement.classList.remove('dragging');
    }
});