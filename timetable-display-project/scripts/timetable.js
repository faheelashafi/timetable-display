// Check if user is logged in (for AdminPanel.html)
function checkLogin() {
    if (window.location.href.includes('AdminPanel.html')) {
        const loggedIn = sessionStorage.getItem('loggedIn');
        if (loggedIn !== 'true') {
            // Redirect to login page
            window.location.href = 'AdminLogin.html';
        }
    }
}

// Initialize timetable entries from localStorage
let timetableEntries = JSON.parse(localStorage.getItem('timetableEntries')) || [];

// Save entries to localStorage
function saveEntries() {
    localStorage.setItem('timetableEntries', JSON.stringify(timetableEntries));
}

// Add a new entry 
function addEntry(day, session, course, timeSlot, startTime, endTime) {
    const entry = {
        id: Date.now(), // Generate unique ID based on timestamp
        day: day,
        session: session,
        course: course,
        timeSlot: timeSlot,
        startTime: startTime,
        endTime: endTime,
        displayTimeSlot: `${timeSlot}-${formatTimeFromInput(endTime)}`
    };
    
    timetableEntries.push(entry);
    saveEntries();
    return entry;
}

// Delete a specific entry by ID
function deleteEntry(id) {
    timetableEntries = timetableEntries.filter(entry => entry.id !== id);
    saveEntries();
}

// Delete all entries
function deleteAllEntries() {
    if (confirm('Are you sure you want to delete all entries? This cannot be undone!')) {
        timetableEntries = [];
        saveEntries();
        displayEntriesInAdmin();
    }
}

// Update session dropdown based on configuration
function updateSessionOptions() {
    const startYear = parseInt(document.getElementById('startYear').value);
    const numberOfSessions = parseInt(document.getElementById('numberOfSessions').value);
    
    const sessionDropdown = document.getElementById('session');
    sessionDropdown.innerHTML = ''; // Clear existing options
    
    // Add options based on start year and number of sessions
    for (let i = 0; i < numberOfSessions; i++) {
        const year = startYear + i;
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        sessionDropdown.appendChild(option);
    }
    
    // Save session configuration
    localStorage.setItem('sessionConfig', JSON.stringify({
        startYear: startYear,
        numberOfSessions: numberOfSessions
    }));
}

// Update the updateYearOptions function to show 8 years back to last year

function updateYearOptions() {
    const currentYear = new Date().getFullYear();
    const startYearSelect = document.getElementById('startYear');
    
    if (!startYearSelect) return;
    
    // Clear existing options
    startYearSelect.innerHTML = '';
    
    // Add options for current year - 8 to last year (currentYear - 1)
    for (let year = currentYear - 8; year <= currentYear - 1; year++) {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        startYearSelect.appendChild(option);
    }
    
    // Update the session dropdown as well
    updateSessionOptions();
}

// Display entries in the admin panel
function displayEntriesInAdmin() {
    const entriesList = document.getElementById('entriesList');
    if (!entriesList) return;
    
    entriesList.innerHTML = ''; // Clear existing entries
    
    if (timetableEntries.length === 0) {
        const row = document.createElement('tr');
        const cell = document.createElement('td');
        cell.colSpan = 5;
        cell.textContent = 'No entries yet. Add some entries above.';
        cell.style.textAlign = 'center';
        cell.style.padding = '20px';
        row.appendChild(cell);
        entriesList.appendChild(row);
        return;
    }
    
    // Sort entries by day, session, and time slot
    const sortedEntries = [...timetableEntries].sort((a, b) => {
        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
        const dayComparison = days.indexOf(a.day) - days.indexOf(b.day);
        if (dayComparison !== 0) return dayComparison;
        
        const sessionComparison = a.session - b.session;
        if (sessionComparison !== 0) return sessionComparison;
        
        return a.timeSlot.localeCompare(b.timeSlot);
    });
    
    sortedEntries.forEach(entry => {
        const row = document.createElement('tr');
        
        const dayCell = document.createElement('td');
        dayCell.textContent = entry.day;
        
        const sessionCell = document.createElement('td');
        sessionCell.textContent = entry.session;
        
        const courseCell = document.createElement('td');
        courseCell.textContent = entry.course;
        
        const timeCell = document.createElement('td');
        
        // Use the custom display time slot if available, otherwise generate it
        if (entry.displayTimeSlot) {
            timeCell.textContent = entry.displayTimeSlot;
        } else {
            // Handle legacy entries without displayTimeSlot
            const startFormatted = formatTimeFromInput(entry.startTime || '01:00');
            const endFormatted = entry.endTime ? formatTimeFromInput(entry.endTime) : '';
            
            if (endFormatted) {
                timeCell.textContent = `${startFormatted}-${endFormatted}`;
            } else {
                // Legacy format
                const timeSlotHour = entry.timeSlot;
                const timeSlotParts = timeSlotHour.split(':');
                const hour = parseInt(timeSlotParts[0]);
                const minute = parseInt(timeSlotParts[1]);
                
                let endMinute = minute + 30;
                let endHour = hour;
                if (endMinute >= 60) {
                    endMinute -= 60;
                    endHour += 1;
                }
                
                const endTimeStr = `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`;
                timeCell.textContent = `${timeSlotHour}-${endTimeStr}`;
            }
        }
        
        const actionCell = document.createElement('td');
        const deleteButton = document.createElement('button');
        deleteButton.className = 'delete-btn';
        deleteButton.textContent = 'Delete';
        deleteButton.addEventListener('click', () => {
            deleteEntry(entry.id);
            displayEntriesInAdmin();
        });
        
        actionCell.appendChild(deleteButton);
        
        row.appendChild(dayCell);
        row.appendChild(sessionCell);
        row.appendChild(courseCell);
        row.appendChild(timeCell);
        row.appendChild(actionCell);
        
        entriesList.appendChild(row);
    });
}

// Fix the bug in the displayTimetable function

function displayTimetable() {
    // Only run on DisplayTimetable.html
    if (!window.location.href.includes('DisplayTimetable.html')) return;

    const tableBody = document.getElementById('timetableBody');
    if (!tableBody) return;
    
    // Clear existing content
    tableBody.innerHTML = '';
    
    if (timetableEntries.length === 0) {
        const emptyRow = document.createElement('tr');
        const emptyCell = document.createElement('td');
        emptyCell.colSpan = 14;
        emptyCell.textContent = 'No timetable entries found. Please add entries in the Admin Panel.';
        emptyCell.style.textAlign = 'center';
        emptyCell.style.padding = '20px';
        emptyRow.appendChild(emptyCell);
        tableBody.appendChild(emptyRow);
        return;
    }
    
    console.log('Timetable entries:', timetableEntries); // Add debug output

    // Group entries by day and session
    const entriesByDayAndSession = {};
    
    // Initialize structure
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const sessions = [...new Set(timetableEntries.map(entry => entry.session))].sort();
    
    days.forEach(day => {
        entriesByDayAndSession[day] = {};
        sessions.forEach(session => {
            entriesByDayAndSession[day][session] = [];
        });
    });
    
    // Populate with entries
    timetableEntries.forEach(entry => {
        // Fix the bug here - previously using wrong variable name
        if (entriesByDayAndSession[entry.day]) {
            if (!entriesByDayAndSession[entry.day][entry.session]) {
                entriesByDayAndSession[entry.day][entry.session] = [];
            }
            entriesByDayAndSession[entry.day][entry.session].push(entry);
        }
    });
    
    console.log('Grouped entries:', entriesByDayAndSession); // Debug output
    
    // Create rows for each day and session
    days.forEach(day => {
        // Filter sessions that actually have entries for this day
        const activeSessions = sessions.filter(session => 
            entriesByDayAndSession[day] && 
            entriesByDayAndSession[day][session] && 
            entriesByDayAndSession[day][session].length > 0
        );
        
        if (activeSessions.length === 0) return; // Skip days with no entries
        
        let isFirstRowForDay = true;
        
        activeSessions.forEach(session => {
            const entries = entriesByDayAndSession[day][session];
            const row = document.createElement('tr');
            
            // Add day cell for first row of each day
            if (isFirstRowForDay) {
                const dayCell = document.createElement('td');
                dayCell.className = 'day';
                dayCell.rowSpan = activeSessions.length;
                dayCell.textContent = day;
                row.appendChild(dayCell);
                isFirstRowForDay = false;
            }
            
            // Add session cell
            const sessionCell = document.createElement('td');
            sessionCell.className = 'session';
            sessionCell.textContent = session;
            row.appendChild(sessionCell);
            
            // Initialize cells array to track which cells are already filled
            const cellsFilled = new Array(14).fill(false); // 14 columns including day and session
            cellsFilled[0] = true; // Day column is filled (or skipped for non-first rows)
            cellsFilled[1] = true; // Session column is filled
            
            // Sort entries by start time to ensure proper order
            const sortedEntries = [...entries].sort((a, b) => {
                // Sort by converting time to minutes for comparison
                const aTime = a.startTime.split(':').map(Number);
                const bTime = b.startTime.split(':').map(Number);
                return (aTime[0] * 60 + aTime[1]) - (bTime[0] * 60 + bTime[1]);
            });
            
            console.log(`Sorted entries for ${day}, ${session}:`, sortedEntries); // Debug output
            
            // Time slot mapping (12-hour format to column index)
            const timeSlotToColumn = {
                "01:00": 2, "01:30": 3, "02:00": 4, "02:30": 5,
                "03:00": 6, "03:30": 7, "04:00": 8, "04:30": 9,
                "05:00": 10, "05:30": 11, "06:00": 12, "06:30": 13
            };
            
            // Create cells for all time slots
            for (let i = 2; i <= 13; i++) {
                // Skip if cell already filled by a spanning entry
                if (cellsFilled[i]) continue;
                
                // Find corresponding time slot
                const timeSlotHour = Object.keys(timeSlotToColumn).find(key => timeSlotToColumn[key] === i);
                
                // Find an entry that starts at this time slot
                const entry = sortedEntries.find(e => {
                    // Convert 24h time to 12h time for comparison
                    const convertTo12h = time => {
                        const [hours, minutes] = time.split(':');
                        let h = parseInt(hours);
                        if (h > 12) h -= 12;
                        if (h === 0) h = 12;
                        return `${h.toString().padStart(2, '0')}:${minutes}`;
                    };
                    
                    const entry12hTime = convertTo12h(e.startTime);
                    return entry12hTime === timeSlotHour;
                });
                
                if (entry) {
                    // Calculate span based on start and end time
                    const startParts = entry.startTime.split(':').map(Number);
                    const endParts = entry.endTime.split(':').map(Number);
                    
                    const startMinutes = startParts[0] * 60 + startParts[1];
                    const endMinutes = endParts[0] * 60 + endParts[1];
                    
                    // Each cell is 30 minutes
                    const spanCount = Math.ceil((endMinutes - startMinutes) / 30);
                    
                    // Create cell with colspan
                    const cell = document.createElement('td');
                    cell.className = 'has-course';
                    cell.colSpan = spanCount;
                    cell.textContent = entry.course;
                    
                    // Add to row
                    row.appendChild(cell);
                    
                    // Mark these cells as filled
                    for (let j = 0; j < spanCount; j++) {
                        if (i + j <= 13) {
                            cellsFilled[i + j] = true;
                        }
                    }
                } else if (!cellsFilled[i]) {
                    // Empty cell
                    const cell = document.createElement('td');
                    row.appendChild(cell);
                    cellsFilled[i] = true;
                }
            }
            
            tableBody.appendChild(row);
        });
    });
}

// Generate PDF of the timetable
function generatePDF() {
    // Use jsPDF library
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(16);
    doc.text('Timetable - Fall Semester 2024', 105, 15, null, null, 'center');
    
    // Prepare data for table
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const sessions = [...new Set(timetableEntries.map(entry => entry.session))].sort();
    const timeSlots = [
        '01:00', '01:30', '02:00', '02:30', '03:00', '03:30',
        '04:00', '04:30', '05:00', '05:30', '06:00', '06:30'
    ];
    
    // Header for the table
    const headers = ['Day', 'Session', ...timeSlots.map(slot => {
        const parts = slot.split(':');
        const hour = parseInt(parts[0]);
        const min = parseInt(parts[1]);
        let endHour = hour;
        let endMin = min + 30;
        if (endMin >= 60) {
            endHour++;
            endMin = 0;
        }
        return `${slot}-${endHour.toString().padStart(2, '0')}:${endMin.toString().padStart(2, '0')}`;
    })];
    
    // Create data array for the table
    const data = [];
    days.forEach(day => {
        sessions.forEach(session => {
            const rowData = [day, session];
            timeSlots.forEach(timeSlot => {
                const entry = timetableEntries.find(e => 
                    e.day === day && e.session == session && e.timeSlot === timeSlot);
                rowData.push(entry ? entry.course : '');
            });
            data.push(rowData);
        });
    });
    
    // Add table to PDF
    doc.autoTable({
        head: [headers],
        body: data,
        startY: 25,
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 1 },
        headStyles: { fillColor: [66, 133, 244] },
        columnStyles: {
            0: { fontStyle: 'bold' },
            1: { fontStyle: 'bold' }
        }
    });
    
    // Save the PDF
    doc.save('timetable.pdf');
}

// Fix the event listener in the DOMContentLoaded function to handle the new form structure
document.addEventListener('DOMContentLoaded', function() {
    // Check login status
    checkLogin();
    
    // Update year options automatically
    updateYearOptions();
    
    // Handle logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            sessionStorage.removeItem('loggedIn');
            sessionStorage.removeItem('currentUser');
            window.location.href = 'AdminLogin.html';
        });
    }
    
    // Load session configuration
    const sessionConfig = JSON.parse(localStorage.getItem('sessionConfig')) || {
        startYear: new Date().getFullYear() - 3, 
        numberOfSessions: 4
    };
    
    const startYearSelect = document.getElementById('startYear');
    const numberOfSessionsInput = document.getElementById('numberOfSessions');
    
    if (startYearSelect && numberOfSessionsInput) {
        // Make sure the value exists in the dropdown
        const yearExists = Array.from(startYearSelect.options).some(
            option => option.value === sessionConfig.startYear.toString()
        );
        
        if (yearExists) {
            startYearSelect.value = sessionConfig.startYear;
        }
        
        numberOfSessionsInput.value = sessionConfig.numberOfSessions;
        
        // Handle session configuration updates
        const updateSessionsBtn = document.getElementById('updateSessionsBtn');
        if (updateSessionsBtn) {
            updateSessionsBtn.addEventListener('click', updateSessionOptions);
        }
    }
    
    // Admin Panel: Handle form submission with checkboxes
    const timetableForm = document.getElementById('timetableForm');
    if (timetableForm) {
        timetableForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Get selected days (checkboxes)
            const dayCheckboxes = document.querySelectorAll('input[name="day"]:checked');
            if (dayCheckboxes.length === 0) {
                alert('Please select at least one day');
                return;
            }
            
            const session = document.getElementById('session').value;
            const course = document.getElementById('courseName').value;
            const startTime = document.getElementById('startTime').value;
            const endTime = document.getElementById('endTime').value;
            
            // Validate time inputs
            if (!startTime || !endTime) {
                alert('Please select start and end times');
                return;
            }
            
            if (startTime >= endTime) {
                alert('End time must be after start time');
                return;
            }
            
            // Format time for compatibility with existing code
            // Convert from 24-hour format (HH:MM) to standard format (hh:mm)
            const formatTimeSlot = (timeStr) => {
                const [hours, minutes] = timeStr.split(':');
                let hour = parseInt(hours);
                // Convert 24-hour format to 12-hour format
                if (hour > 12) {
                    hour = hour - 12;
                }
                if (hour === 0) hour = 12;
                const minute = minutes;
                return `${hour.toString().padStart(2, '0')}:${minute}`;
            };
            
            const timeSlot = formatTimeSlot(startTime);
            const formattedStartTime = formatTimeSlot(startTime);
            const formattedEndTime = formatTimeSlot(endTime);
            const displayTimeSlot = `${formattedStartTime}-${formattedEndTime}`;
            
            // Add entry for each selected day
            dayCheckboxes.forEach(checkbox => {
                const day = checkbox.value;
                
                // Check for conflicts
                const conflictingEntry = timetableEntries.find(entry => 
                    entry.day === day && 
                    entry.session == session && 
                    entry.timeSlot === timeSlot
                );
                
                if (conflictingEntry) {
                    if (!confirm(`A course (${conflictingEntry.course}) already exists for ${day} at this time slot. Do you want to replace it?`)) {
                        return;
                    }
                    // Remove the conflicting entry
                    deleteEntry(conflictingEntry.id);
                }
                
                // Add the entry with the custom time slot display
                const entry = addEntry(day, session, course, timeSlot, startTime, endTime);
                entry.displayTimeSlot = displayTimeSlot;
            });
            
            // Update display and reset form
            displayEntriesInAdmin();
            document.getElementById('courseName').value = '';
            alert('Entry added successfully!');
        });
    }
    
    // Clear all entries button
    const clearAllBtn = document.getElementById('clearAllEntries');
    if (clearAllBtn) {
        clearAllBtn.addEventListener('click', deleteAllEntries);
    }
    
    // Generate PDF button
    const generatePdfBtn = document.getElementById('generatePdf');
    if (generatePdfBtn) {
        generatePdfBtn.addEventListener('click', generatePDF);
    }
    
    // Display entries in admin panel
    displayEntriesInAdmin();
    
    // Display timetable on display page
    displayTimetable();
    
    // Display timetable on display page
    displayTimetable();
});

// Helper function to format time from input
function formatTimeFromInput(timeStr) {
    const [hours, minutes] = timeStr.split(':');
    let hour = parseInt(hours);
    if (hour > 12) hour -= 12;
    if (hour === 0) hour = 12;
    const minute = minutes;
    return `${hour.toString().padStart(2, '0')}:${minute}`;
}