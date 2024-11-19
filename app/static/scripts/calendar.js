// DOM Elements
const calendarSlots = document.querySelectorAll(".calendar-slot");
const unassignedTasksContainer = document.querySelector("#unassigned-tasks-container");
const exitSingleDayButton = document.querySelector("#exit-single-day-view");
const selectDayButtons = document.querySelectorAll(".select-day-btn");

// Global Variables
let selectedDay = null; // Track the currently selected day
let draggedTaskId = null; // Track the task being dragged

// Drag-and-Drop Logic
document.addEventListener("dragstart", (event) => {
    if (event.target.classList.contains("task-item")) {
        draggedTaskId = event.target.dataset.taskId;
        event.dataTransfer.setData("text/plain", draggedTaskId);
    }
});

document.addEventListener("dragover", (event) => {
    if (event.target.classList.contains("calendar-slot")) {
        event.preventDefault(); // Allow drop
    }
});

document.addEventListener("drop", (event) => {
    if (event.target.classList.contains("calendar-slot")) {
        event.preventDefault();
        const taskId = event.dataTransfer.getData("text/plain");
        const slotDay = event.target.dataset.day;
        const slotHour = event.target.dataset.hour;

        // Move the task to the new slot visually
        const taskElement = document.querySelector(
            `.task-item[data-task-id="${taskId}"]`
        );
        if (taskElement) {
            event.target.appendChild(taskElement);
        }

        // Update the task in the backend
        updateTaskAssignment(taskId, slotDay, slotHour);
    }
});

// Update Task Assignment in the Database
function updateTaskAssignment(taskId, day, hour) {
    fetch(`/task/update/${taskId}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            day: day,
            hour: hour,
        }),
    })
        .then((response) => {
            if (!response.ok) {
                throw new Error("Failed to update task assignment");
            }
            return response.json();
        })
        .then((data) => {
            console.log("Task updated successfully:", data);
        })
        .catch((error) => {
            console.error("Error updating task:", error);
        });
}

// Single-Day Selection Logic
selectDayButtons.forEach((button) => {
    button.addEventListener("click", (event) => {
        if (selectedDay !== null) {
            resetDayView();
        }
        selectedDay = event.target.dataset.day;

        // Highlight selected day and hide others
        calendarSlots.forEach((slot) => {
            slot.style.display = slot.dataset.day === selectedDay ? "block" : "none";
        });

        // Show unassigned tasks container
        unassignedTasksContainer.classList.remove("hidden");

        // Display exit button
        exitSingleDayButton.classList.remove("hidden");
    });
});

// Exit Single-Day View
exitSingleDayButton.addEventListener("click", resetDayView);

function resetDayView() {
    selectedDay = null;

    // Show all calendar slots
    calendarSlots.forEach((slot) => {
        slot.style.display = "block";
    });

    // Hide unassigned tasks container
    unassignedTasksContainer.classList.add("hidden");

    // Hide exit button
    exitSingleDayButton.classList.add("hidden");
}
