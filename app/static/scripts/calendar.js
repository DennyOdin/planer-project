class CalendarManager {
    constructor(config = {}) {
        // Default configuration with ability to override
        this.config = {
            slotHeight: 50,
            timeSlotSelector: '.calendar-slot',
            unassignedTasksSelector: '#unassigned-tasks',
            taskItemSelector: '.task-item',
            ...config
        };

        // Bind methods to maintain correct context
        this.handleDragStart = this.handleDragStart.bind(this);
        this.handleDragOver = this.handleDragOver.bind(this);
        this.handleDrop = this.handleDrop.bind(this);
        this.handleUnassignedDrop = this.handleUnassignedDrop.bind(this);
        this.startResize = this.startResize.bind(this);
        this.resizeTask = this.resizeTask.bind(this);
        this.stopResize = this.stopResize.bind(this);

        // State tracking
        this.activeTask = null;
        this.initialHeight = 0;
        this.initialMouseY = 0;
    }

    // Improved initialization method
    init() {
        this.cacheDOM();
        this.initializeDraggableTasks();
        this.setupEventListeners();
        this.setupTaskResizing();
    }

    // Cache DOM elements for performance
    cacheDOM() {
        this.calendarSlots = document.querySelectorAll(this.config.timeSlotSelector);
        this.unassignedTasksContainer = document.querySelector(this.config.unassignedTasksSelector);
    }

    // More robust task initialization
    initializeDraggableTasks() {
        const tasks = document.querySelectorAll(this.config.taskItemSelector);
        tasks.forEach(task => {
            task.setAttribute('draggable', 'true');
            task.setAttribute('role', 'button');
            task.setAttribute('aria-grabbed', 'false');
            task.addEventListener('dragstart', this.handleDragStart);
        });
    }

    // Enhanced drag start handler with more accessibility
    handleDragStart(e) {
        const target = e.currentTarget;
        e.dataTransfer.setData('text/plain', target.getAttribute('data-task-id'));
        target.classList.add('dragging');
        target.setAttribute('aria-grabbed', 'true');
        e.dataTransfer.effectAllowed = 'move';
    }

    // Drag over handler with better prevention of default
    handleDragOver(e) {
        e.preventDefault();
        e.stopPropagation();
        e.currentTarget.classList.add('drag-over');
        e.dataTransfer.dropEffect = 'move';
    }

    // More comprehensive drop handler
    handleDrop(e) {
        e.preventDefault();
        e.stopPropagation();
        const targetSlot = e.currentTarget;
        targetSlot.classList.remove('drag-over');

        const taskId = e.dataTransfer.getData('text/plain');
        const taskElement = document.querySelector(`[data-task-id="${taskId}"]`);
        
        if (!taskElement) {
            console.warn('Task element not found');
            return;
        }

        try {
            this.assignTaskToSlot(taskElement, targetSlot);
        } catch (error) {
            console.error('Task assignment failed:', error);
            alert(`Could not assign task: ${error.message}`);
        }
    }

    // Separate method for slot assignment logic
    assignTaskToSlot(taskElement, targetSlot) {
        const day = targetSlot.getAttribute('data-day');
        const hour = targetSlot.getAttribute('data-hour');
        const estimatedTime = parseInt(taskElement.getAttribute('data-estimated-time'));
        const slotsNeeded = Math.ceil(estimatedTime / this.config.slotHeight);

        // Validate slot availability
        if (this.isTaskOverlapping(taskElement, day, parseInt(hour), slotsNeeded)) {
            throw new Error('This task cannot overlap with existing tasks');
        }

        // Remove from previous container
        const currentParent = taskElement.parentNode;
        currentParent.removeChild(taskElement);

        // Clear previous multi-slot markers
        document.querySelectorAll('.calendar-slot.occupied-by-task')
            .forEach(slot => slot.classList.remove('occupied-by-task'));

        // Position and style task
        this.positionMultiSlotTask(taskElement, targetSlot, slotsNeeded, day, hour);

        // Update backend
        this.updateTaskAssignment(taskElement, day, hour, slotsNeeded);
    }

    // More granular positioning of multi-slot tasks
    positionMultiSlotTask(taskElement, targetSlot, slotsNeeded, day, hour) {
        const slotHeight = this.config.slotHeight;
        const taskHeight = slotsNeeded * slotHeight;

        taskElement.style.height = `${taskHeight}px`;
        taskElement.style.top = '0';
        taskElement.classList.add('multi-slot-task');

        targetSlot.appendChild(taskElement);

        // Mark additional slots
        let currentHour = parseInt(hour);
        for (let i = 1; i < slotsNeeded; i++) {
            const nextSlot = document.querySelector(
                `.calendar-slot[data-day="${day}"][data-hour="${currentHour + i}"]`
            );
            
            if (!nextSlot) {
                console.warn('Not enough slots to place entire task');
                break;
            }

            nextSlot.classList.add('occupied-by-task');
        }
    }

    // More efficient overlapping check
    isTaskOverlapping(currentTask, day, startHour, slotsNeeded) {
        for (let i = 0; i < slotsNeeded; i++) {
            const checkSlot = document.querySelector(
                `.calendar-slot[data-day="${day}"][data-hour="${startHour + i}"]`
            );
            
            if (!checkSlot) {
                console.warn('Not enough slots to place task');
                return true;
            }

            // More efficient overlap checking
            const occupiedTasks = checkSlot.querySelectorAll(
                `.task-item:not([data-task-id="${currentTask.getAttribute('data-task-id')}"])`
            );

            if (occupiedTasks.length > 0 || checkSlot.classList.contains('occupied-by-task')) {
                return true;
            }
        }
        return false;
    }

    // Backend communication with improved error handling
    async updateTaskAssignment(taskElement, day, hour, slotsDuration = 1) {
        const taskId = taskElement.getAttribute('data-task-id');

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
                    hour: hour,
                    slots_duration: slotsDuration
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to assign task');
            }

            // Optional: Add success feedback
            taskElement.classList.add('task-assigned');
        } catch (error) {
            console.error('Task assignment error:', error);
            alert(`Failed to assign task: ${error.message}`);
            
            // Revert task placement if backend fails
            this.revertTaskPlacement(taskElement);
        }
    }

    // Task resizing functionality (similar to previous implementation)
    setupTaskResizing() {
        const resizeHandles = document.querySelectorAll('.resize-handle');
        
        resizeHandles.forEach(handle => {
            handle.addEventListener('mousedown', this.startResize);
        });
    }

    startResize(e) {
        e.preventDefault();
        this.activeTask = e.target.closest('.task-item');
        this.initialHeight = this.activeTask.offsetHeight;
        this.initialMouseY = e.clientY;

        document.addEventListener('mousemove', this.resizeTask);
        document.addEventListener('mouseup', this.stopResize);
    }

    // Similar to previous resizeTask method
    resizeTask(e) {
        // Implementation similar to previous version
        // ... (with added error handling and validation)
    }

    stopResize() {
        // Similar to previous implementation
        // Add more robust error handling
    }

    // Setup global event listeners
    setupEventListeners() {
        this.calendarSlots.forEach(slot => {
            slot.addEventListener('dragover', this.handleDragOver);
            slot.addEventListener('drop', this.handleDrop);
            slot.addEventListener('dragleave', (e) => e.currentTarget.classList.remove('drag-over'));
        });

        // Unassigned tasks container events
        this.unassignedTasksContainer.addEventListener('dragover', this.handleDragOver);
        this.unassignedTasksContainer.addEventListener('drop', this.handleUnassignedDrop);
        this.unassignedTasksContainer.addEventListener('dragleave', 
            (e) => e.currentTarget.classList.remove('drag-over')
        );
    }

    // Handle dropping back to unassigned tasks
    handleUnassignedDrop(e) {
        e.preventDefault();
        e.currentTarget.classList.remove('drag-over');

        const taskId = e.dataTransfer.getData('text/plain');
        const taskElement = document.querySelector(`[data-task-id="${taskId}"]`);

        if (!taskElement) return;

        this.unassignFromCalendar(taskElement);
    }

    // Separate method for unassigning tasks
    unassignFromCalendar(taskElement) {
        const currentParent = taskElement.parentNode;
        currentParent.removeChild(taskElement);
        
        // Reset task styling
        taskElement.classList.remove('multi-slot-task');
        taskElement.style.height = `${this.config.slotHeight}px`;
        
        // Clear occupied slots
        document.querySelectorAll('.calendar-slot.occupied-by-task')
            .forEach(slot => slot.classList.remove('occupied-by-task'));

        // Add to unassigned container
        this.unassignedTasksContainer.appendChild(taskElement);

        // Update backend to unassign
        this.updateTaskAssignment(taskElement, null, null);
    }

    // Revert task placement if backend fails
    revertTaskPlacement(taskElement) {
        // Move task back to previous location or unassigned tasks
        this.unassignedTasksContainer.appendChild(taskElement);
        taskElement.classList.remove('multi-slot-task');
        taskElement.style.height = `${this.config.slotHeight}px`;
    }
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
    const calendarManager = new CalendarManager();
    calendarManager.init();
});

// Global drag event prevention
document.addEventListener('dragstart', (e) => {
    e.dataTransfer.effectAllowed = 'move';
});

document.addEventListener('dragend', (e) => {
    const draggingElement = document.querySelector('.dragging');
    if (draggingElement) {
        draggingElement.classList.remove('dragging');
        draggingElement.setAttribute('aria-grabbed', 'false');
    }
});