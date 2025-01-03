class CalendarManager {
    constructor(config = {}) {
        this.config = {
            slotHeight: 50,
            timeSlotSelector: '.calendar-slot',
            unassignedTasksSelector: '#unassigned-tasks',
            taskItemSelector: '.task-item',
            deletionZoneSelector: '#deletion-zone',
            ...config
        };

        // Bind methods
        this.handleDragStart = this.handleDragStart.bind(this);
        this.handleDragOver = this.handleDragOver.bind(this);
        this.handleDrop = this.handleDrop.bind(this);
        this.handleUnassignedDrop = this.handleUnassignedDrop.bind(this);
        this.handleDeleteDrop = this.handleDeleteDrop.bind(this);
        this.refreshCalendar = this.refreshCalendar.bind(this);
    }

    init() {
        this.cacheDOM();
        this.createDeletionZone();
        this.initializeDraggableTasks();
        this.setupEventListeners();
    }

    cleanupEventListeners() {
        // Remove existing event listeners before adding new ones
        this.calendarSlots.forEach(slot => {
            slot.removeEventListener('dragover', this.handleDragOver);
            slot.removeEventListener('drop', this.handleDrop);
            slot.removeEventListener('dragleave', (e) => e.currentTarget.classList.remove('drag-over'));
        });

        const deletionZone = document.querySelector(this.config.deletionZoneSelector);
        if (deletionZone) {
            deletionZone.removeEventListener('dragover', this.handleDragOver);
            deletionZone.removeEventListener('drop', this.handleDeleteDrop);
            deletionZone.removeEventListener('dragleave', (e) => e.currentTarget.classList.remove('drag-over'));
        }

        if (this.unassignedTasksContainer) {
            this.unassignedTasksContainer.removeEventListener('dragover', this.handleDragOver);
            this.unassignedTasksContainer.removeEventListener('drop', this.handleUnassignedDrop);
            this.unassignedTasksContainer.removeEventListener('dragleave', 
                (e) => e.currentTarget.classList.remove('drag-over')
            );
        }
    }

    cacheDOM() {
        this.calendarSlots = document.querySelectorAll(this.config.timeSlotSelector);
        this.unassignedTasksContainer = document.querySelector(this.config.unassignedTasksSelector);
        this.calendarGrid = document.querySelector('.calendar-grid');
    }

    createDeletionZone() {
        // Create deletion zone if it doesn't exist
        if (!document.querySelector(this.config.deletionZoneSelector)) {
            const deletionZone = document.createElement('div');
            deletionZone.id = 'deletion-zone';
            deletionZone.className = 'deletion-zone';
            deletionZone.innerHTML = `
                <div class="deletion-zone-content">
                    <i class="fas fa-trash-alt"></i>
                    <span>Drop here to delete</span>
                </div>
            `;
            document.querySelector('.calendar-container').appendChild(deletionZone);
        }
    }

    initializeDraggableTasks() {
        const tasks = document.querySelectorAll(this.config.taskItemSelector);
        tasks.forEach(task => {
            task.setAttribute('draggable', 'true');
            task.setAttribute('role', 'button');
            task.setAttribute('aria-grabbed', 'false');
            task.addEventListener('dragstart', this.handleDragStart);
            
            // Remove resize handle if it exists
            const resizeHandle = task.querySelector('.resize-handle');
            if (resizeHandle) {
                resizeHandle.remove();
            }
        });
    }

    handleDragStart(e) {
        if (this.isDragging) return; // Prevent multiple drag operations
        
        const target = e.currentTarget;
        e.dataTransfer.setData('text/plain', target.getAttribute('data-task-id'));
        target.classList.add('dragging');
        target.setAttribute('aria-grabbed', 'true');
        e.dataTransfer.effectAllowed = 'move';
        this.isDragging = true;
    }

    handleDragOver(e) {
        e.preventDefault();
        e.stopPropagation();
        e.currentTarget.classList.add('drag-over');
        e.dataTransfer.dropEffect = 'move';
    }

    async handleDrop(e) {
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
            await this.assignTaskToSlot(taskElement, targetSlot);
            await this.refreshCalendar();
        } catch (error) {
            console.error('Task assignment failed:', error);
            alert(`Could not assign task: ${error.message}`);
        }
    }

    async assignTaskToSlot(taskElement, targetSlot) {
        const day = targetSlot.getAttribute('data-day');
        const hour = targetSlot.getAttribute('data-hour');
        const estimatedTime = parseInt(taskElement.getAttribute('data-estimated-time'));
        const slotsNeeded = Math.ceil(estimatedTime / this.config.slotHeight);

        if (this.isTaskOverlapping(taskElement, day, parseInt(hour), slotsNeeded)) {
            throw new Error('This task cannot overlap with existing tasks');
        }

        await this.updateTaskAssignment(taskElement, day, hour, slotsNeeded);
    }

    isTaskOverlapping(currentTask, day, startHour, slotsNeeded) {
        for (let i = 0; i < slotsNeeded; i++) {
            const checkSlot = document.querySelector(
                `.calendar-slot[data-day="${day}"][data-hour="${startHour + i}"]`
            );
            
            if (!checkSlot) {
                console.warn('Not enough slots to place task');
                return true;
            }

            const occupiedTasks = checkSlot.querySelectorAll(
                `.task-item:not([data-task-id="${currentTask.getAttribute('data-task-id')}"])`
            );

            if (occupiedTasks.length > 0 || checkSlot.classList.contains('occupied-by-task')) {
                return true;
            }
        }
        return false;
    }

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

            return data;
        } catch (error) {
            throw error;
        }
    }

    setupEventListeners() {
        this.calendarSlots.forEach(slot => {
            slot.addEventListener('dragover', this.handleDragOver);
            slot.addEventListener('drop', this.handleDrop);
            slot.addEventListener('dragleave', (e) => e.currentTarget.classList.remove('drag-over'));
        });

        const deletionZone = document.querySelector(this.config.deletionZoneSelector);
        if (deletionZone) {
            deletionZone.addEventListener('dragover', this.handleDragOver);
            deletionZone.addEventListener('drop', this.handleDeleteDrop);
            deletionZone.addEventListener('dragleave', (e) => e.currentTarget.classList.remove('drag-over'));
        }

        this.unassignedTasksContainer.addEventListener('dragover', this.handleDragOver);
        this.unassignedTasksContainer.addEventListener('drop', this.handleUnassignedDrop);
        this.unassignedTasksContainer.addEventListener('dragleave', 
            (e) => e.currentTarget.classList.remove('drag-over')
        );
    }

    async handleDeleteDrop(e) {
        e.preventDefault();
        e.stopPropagation();
        e.currentTarget.classList.remove('drag-over');
    
        const taskId = e.dataTransfer.getData('text/plain');
        const taskElement = document.querySelector(`[data-task-id="${taskId}"]`);
        
        if (!taskId || !taskElement) {
            console.warn('No task found to delete');
            return;
        }
    
        try {
            const response = await fetch(`/task/delete/${taskId}`, {
                method: 'DELETE',  // Changed from DELETE to POST
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });
    
            const data = await response.json();
    
            if (!response.ok) {
                throw new Error(data.error || 'Failed to delete task');
            }
    
            // Remove the element immediately for better UX
            taskElement.remove();
            
            // Then refresh the calendar
            await this.refreshCalendar();
        } catch (error) {
            console.error('Delete failed:', error);
            await this.refreshCalendar(); // Refresh anyway to ensure UI is in sync
        } finally {
            this.isDragging = false; // Reset dragging state
        }
    }

    handleUnassignedDrop(e) {
        e.preventDefault();
        e.currentTarget.classList.remove('drag-over');

        const taskId = e.dataTransfer.getData('text/plain');
        const taskElement = document.querySelector(`[data-task-id="${taskId}"]`);

        if (!taskElement) return;

        this.unassignFromCalendar(taskElement);
    }

    async unassignFromCalendar(taskElement) {
        try {
            await this.updateTaskAssignment(taskElement, null, null);
            await this.refreshCalendar();
        } catch (error) {
            console.error('Failed to unassign task:', error);
            alert('Failed to unassign task');
        }
    }

    async refreshCalendar() {
        try {
            const response = await fetch('/calendar', {
                method: 'GET',
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'Accept': 'text/html'
                }
            });
    
            if (!response.ok) {
                throw new Error(`Failed to refresh calendar: ${response.statusText}`);
            }
    
            const html = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            
            // Clean up existing event listeners
            this.cleanupEventListeners();
            
            // Update calendar grid content
            const newCalendarGrid = doc.querySelector('.calendar-grid');
            const newUnassignedTasks = doc.querySelector('#unassigned-tasks');
            
            if (newCalendarGrid && this.calendarGrid) {
                const scrollTop = this.calendarGrid.scrollTop;
                const scrollLeft = this.calendarGrid.scrollLeft;
                
                this.calendarGrid.innerHTML = newCalendarGrid.innerHTML;
                
                this.calendarGrid.scrollTop = scrollTop;
                this.calendarGrid.scrollLeft = scrollLeft;
            }
            
            if (newUnassignedTasks && this.unassignedTasksContainer) {
                this.unassignedTasksContainer.innerHTML = newUnassignedTasks.innerHTML;
            }
    
            // Clear any lingering drag-over states
            document.querySelectorAll('.drag-over').forEach(el => {
                el.classList.remove('drag-over');
            });
    
            // Recache DOM elements and reinitialize
            this.cacheDOM();
            this.initializeDraggableTasks();
            this.setupEventListeners();
            
            // Reset dragging state
            this.isDragging = false;
        } catch (error) {
            console.error('Calendar refresh failed:', error);
            this.isDragging = false; // Make sure to reset state even on error
        }
    }
}


// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
    const calendarManager = new CalendarManager();
    calendarManager.init();
});

// Global drag event handlers
document.addEventListener('dragstart', (e) => {
    e.dataTransfer.effectAllowed = 'move';
});

document.addEventListener('dragend', (e) => {
    const draggingElement = document.querySelector('.dragging');
    if (draggingElement) {
        draggingElement.classList.remove('dragging');
        draggingElement.setAttribute('aria-grabbed', 'false');
    }
    // Reset dragging state on drag end
    if (window.calendarManager) {
        window.calendarManager.isDragging = false;
    }
});