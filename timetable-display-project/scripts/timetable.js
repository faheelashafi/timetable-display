// Check if user is logged in (for AdminPanel.html)
function checkLogin() {
    if (window.location.href.includes('AdminPanel.html')) {
        const loggedIn = sessionStorage.getItem('loggedIn');
        if (loggedIn !== 'true') {
            window.location.href = 'AdminLogin.html'; // Redirect to login page
        }
    }
}

// Initialize timetable entries from localStorage
let timetableEntries = JSON.parse(localStorage.getItem('timetableEntries')) || [];

// Save entries to localStorage
function saveEntries() {
    localStorage.setItem('timetableEntries', JSON.stringify(timetableEntries));
}

// Add a new entry with extended course information
function addEntry(day, session, courseCode, courseName, creditHours, teacherName, venue, timeSlot, startTime, endTime, isLab) {
    // Create the new entry
    const entry = {
        id: Date.now(),
        day,
        session,
        courseCode,
        courseName,
        creditHours,
        teacherName,
        venue,
        timeSlot,
        startTime,
        endTime,
        isLab: isLab || false,
        displayTimeSlot: `${startTime}-${endTime}`,
    };

    console.log('Adding entry with course details:', entry);

    // Add the entry to the array and save it
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
        
        return a.startTime.localeCompare(b.startTime);
    });
    
    sortedEntries.forEach(entry => {
        const row = document.createElement('tr');
        
        const dayCell = document.createElement('td');
        dayCell.textContent = entry.day;
        
        const sessionCell = document.createElement('td');
        sessionCell.textContent = entry.session;
        
        const courseCell = document.createElement('td');
        courseCell.textContent = entry.courseName;
        
        const timeCell = document.createElement('td');
        timeCell.textContent = entry.displayTimeSlot;
        
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

// Fix the displayTimetable function to handle time slots correctly

// Display timetable on the DisplayTimetable.html page
function XdisplayTimetable() {
    console.log('displayTimetable function called');
    const timetableEntries = JSON.parse(localStorage.getItem('timetableEntries')) || [];
    console.log('Loaded timetable entries:', timetableEntries);

    const tableBody = document.getElementById('timetableBody');
    if (!tableBody) {
        console.error('Error: Table body element not found!');
        return;
    }

    // Clear existing content
    tableBody.innerHTML = '';

    // Handle empty entries
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

    // Group entries by day
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const timeSlots = [
        '01:00', '01:30', '02:00', '02:30', '03:00', '03:30',
        '04:00', '04:30', '05:00', '05:30', '06:00', '06:30'
    ];

    days.forEach(day => {
        const dayEntries = timetableEntries.filter(entry => entry.day === day);

        if (dayEntries.length === 0) return;

        // Group entries by session
        const sessions = [...new Set(dayEntries.map(entry => entry.session))].sort();

        sessions.forEach(session => {
            const sessionEntries = dayEntries.filter(entry => entry.session === session);

            const row = document.createElement('tr');

            // Add day cell for the first session of the day
            if (sessions.indexOf(session) === 0) {
                const dayCell = document.createElement('td');
                dayCell.rowSpan = sessions.length;
                dayCell.textContent = day;
                dayCell.style.fontWeight = 'bold';
                dayCell.style.backgroundColor = '#f8f9fa';
                row.appendChild(dayCell);
            }

            // Add session cell
            const sessionCell = document.createElement('td');
            sessionCell.textContent = session;
            sessionCell.style.fontWeight = 'bold';
            sessionCell.style.backgroundColor = '#f1f1f1';
            row.appendChild(sessionCell);

            // Add time slot cells
            let cellIndex = 0;
            while (cellIndex < timeSlots.length) {
                const timeSlot = timeSlots[cellIndex];
                const entry = sessionEntries.find(e => {
                    const startMinutes = parseInt(e.startTime.split(':')[0]) * 60 + parseInt(e.startTime.split(':')[1]);
                    const endMinutes = parseInt(e.endTime.split(':')[0]) * 60 + parseInt(e.endTime.split(':')[1]);
                    const slotMinutes = parseInt(timeSlot.split(':')[0]) * 60 + parseInt(timeSlot.split(':')[1]);
                    return slotMinutes >= startMinutes && slotMinutes < endMinutes;
                });

                if (entry) {
                    const startMinutes = parseInt(entry.startTime.split(':')[0]) * 60 + parseInt(entry.startTime.split(':')[1]);
                    const endMinutes = parseInt(entry.endTime.split(':')[0]) * 60 + parseInt(entry.endTime.split(':')[1]);
                    const spanCount = Math.ceil((endMinutes - startMinutes) / 30);

                    const cell = document.createElement('td');
                    cell.className = 'has-course';
                    cell.textContent = entry.courseName;
                    cell.colSpan = spanCount;
                    cell.style.backgroundColor = '#e9ecef';
                    cell.style.textAlign = 'center';
                    row.appendChild(cell);

                    // Skip ahead by the number of slots this entry spans
                    cellIndex += spanCount;
                } else {
                    // Empty cell
                    const cell = document.createElement('td');
                    row.appendChild(cell);
                    cellIndex++;
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
                rowData.push(entry ? entry.courseName : '');
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
    
    // Admin Panel: Handle form submission with extended course data
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
            const courseCode = document.getElementById('courseCode').value;
            const courseName = document.getElementById('courseName').value;
            const creditHours = document.getElementById('creditHours').value;
            const teacherName = document.getElementById('teacherName').value;
            const venue = document.getElementById('venue').value;
            const startTime = document.getElementById('startTime').value;
            const endTime = document.getElementById('endTime').value;
            const isLab = document.getElementById('isLab').checked;
            
            // Add entry for each selected day
            dayCheckboxes.forEach(checkbox => {
                const day = checkbox.value;
                addEntry(
                    day, 
                    session, 
                    courseCode, 
                    courseName, 
                    creditHours, 
                    teacherName, 
                    venue, 
                    formatTimeFromInput(startTime), 
                    startTime, 
                    endTime, 
                    isLab
                );
            });
            
            // Update display and reset form
            displayEntriesInAdmin();
            document.getElementById('courseCode').value = '';
            document.getElementById('courseName').value = '';
            document.getElementById('creditHours').value = '';
            document.getElementById('teacherName').value = '';
            document.getElementById('venue').value = '';
            document.getElementById('isLab').checked = false;
            
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
    
    // COMMENT OUT THIS LINE to avoid conflicts with inline script
    // displayTimetable();
    // console.log('Timetable Entries Loaded:', timetableEntries);
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

// Also comment out this window.load event handler
// window.addEventListener('load', function () {
//     console.log('Display Timetable Function Called'); // Debugging
//     displayTimetable();
// });