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

// Data management system for suggestions and autocomplete
const dataManager = {
    // Storage keys
    keys: {
        teacherNames: 'timetable_teacherNames',
        venues: 'timetable_venues',
        courseNames: 'timetable_courseNames',
        courseCodes: 'timetable_courseCodes'
    },
    
    // Get stored data or initialize empty array
    getData: function(key) {
        return JSON.parse(localStorage.getItem(key)) || [];
    },
    
    // Save data to localStorage
    saveData: function(key, data) {
        localStorage.setItem(key, JSON.stringify(data));
        localStorage.setItem(key + '_lastUpdated', new Date().toISOString());
    },
    
    // Add new item to a specific data collection
    addItem: function(key, item) {
        if (!item) return;
        
        const data = this.getData(key);
        if (!data.includes(item)) {
            data.push(item);
            data.sort();
            this.saveData(key, data);
        }
    },
    
    // Add multiple items at once
    addItems: function(key, items) {
        if (!items || !items.length) return;
        
        const data = this.getData(key);
        let changed = false;
        
        items.forEach(item => {
            if (item && !data.includes(item)) {
                data.push(item);
                changed = true;
            }
        });
        
        if (changed) {
            data.sort();
            this.saveData(key, data);
        }
    },
    
    // Get suggestions based on input
    getSuggestions: function(key, input) {
        if (!input) return [];
        
        const data = this.getData(key);
        const lowerInput = input.toLowerCase();
        
        return data.filter(item => 
            item.toLowerCase().includes(lowerInput)
        );
    },
    
    // Store entry data when a new entry is added
    storeEntryData: function(entry) {
        if (entry.teacherName) this.addItem(this.keys.teacherNames, entry.teacherName);
        if (entry.venue) this.addItem(this.keys.venues, entry.venue);
        if (entry.courseName) this.addItem(this.keys.courseNames, entry.courseName);
        if (entry.courseCode) this.addItem(this.keys.courseCodes, entry.courseCode);
    },
    
    // Import data from existing entries
    importFromEntries: function() {
        const entries = JSON.parse(localStorage.getItem('timetableEntries')) || [];
        
        const teacherNames = entries.map(e => e.teacherName).filter(Boolean);
        const venues = entries.map(e => e.venue).filter(Boolean);
        const courseNames = entries.map(e => e.courseName).filter(Boolean);
        const courseCodes = entries.map(e => e.courseCode).filter(Boolean);
        
        this.addItems(this.keys.teacherNames, teacherNames);
        this.addItems(this.keys.venues, venues);
        this.addItems(this.keys.courseNames, courseNames);
        this.addItems(this.keys.courseCodes, courseCodes);
        
        console.log('Imported data from existing entries');
    },

    // Get data as a structured object with metadata
    getDataWithMetadata: function(key) {
        const data = this.getData(key);
        return {
            key: key,
            items: data,
            count: data.length,
            lastUpdated: localStorage.getItem(key + '_lastUpdated') || 'Never'
        };
    },
    
    // Remove an item from a specific data collection
    removeItem: function(key, item) {
        if (!item) return false;
        
        const data = this.getData(key);
        const index = data.indexOf(item);
        
        if (index !== -1) {
            data.splice(index, 1);
            this.saveData(key, data);
            return true;
        }
        
        return false;
    },
    
    // Get all stored data
    getAllData: function() {
        return {
            teacherNames: this.getDataWithMetadata(this.keys.teacherNames),
            venues: this.getDataWithMetadata(this.keys.venues),
            courseNames: this.getDataWithMetadata(this.keys.courseNames),
            courseCodes: this.getDataWithMetadata(this.keys.courseCodes)
        };
    }
};

// Add a new entry with extended course information
const originalAddEntry = function(day, session, courseCode, courseName, creditHours, teacherName, venue, timeSlot, startTime, endTime, isLab) {
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
};

addEntry = function(day, session, courseCode, courseName, creditHours, teacherName, venue, timeSlot, startTime, endTime, isLab) {
    const entry = originalAddEntry(day, session, courseCode, courseName, creditHours, teacherName, venue, timeSlot, startTime, endTime, isLab);
    dataManager.storeEntryData(entry);
    return entry;
};

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

// Function to display stored data in modal
function displayStoredData() {
    const modal = document.getElementById('dataModal');
    const closeBtn = document.querySelector('#dataModal .close');
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    // Get all data
    const teacherNames = dataManager.getData(dataManager.keys.teacherNames);
    const venues = dataManager.getData(dataManager.keys.venues);
    const courseNames = dataManager.getData(dataManager.keys.courseNames);
    const courseCodes = dataManager.getData(dataManager.keys.courseCodes);
    
    // Populate teacher names
    const teacherNamesContainer = document.getElementById('teacherNamesList');
    teacherNamesContainer.innerHTML = '';
    teacherNames.forEach(name => {
        const div = document.createElement('div');
        div.className = 'data-item';
        div.textContent = name;
        teacherNamesContainer.appendChild(div);
    });
    
    // Populate venues
    const venuesContainer = document.getElementById('venuesList');
    venuesContainer.innerHTML = '';
    venues.forEach(venue => {
        const div = document.createElement('div');
        div.className = 'data-item';
        div.textContent = venue;
        venuesContainer.appendChild(div);
    });
    
    // Populate course names
    const courseNamesContainer = document.getElementById('courseNamesList');
    courseNamesContainer.innerHTML = '';
    courseNames.forEach(name => {
        const div = document.createElement('div');
        div.className = 'data-item';
        div.textContent = name;
        courseNamesContainer.appendChild(div);
    });
    
    // Populate course codes
    const courseCodesContainer = document.getElementById('courseCodesList');
    courseCodesContainer.innerHTML = '';
    courseCodes.forEach(code => {
        const div = document.createElement('div');
        div.className = 'data-item';
        div.textContent = code;
        courseCodesContainer.appendChild(div);
    });
    
    // Populate course database
    const courseData = document.getElementById('courseData');
    courseData.innerHTML = '';
    
    // Create a unique list of courses by course code
    const uniqueCourses = {};
    timetableEntries.forEach(entry => {
        if (entry.courseCode && !uniqueCourses[entry.courseCode]) {
            uniqueCourses[entry.courseCode] = entry;
        }
    });
    
    Object.values(uniqueCourses).forEach(course => {
        const row = document.createElement('tr');
        
        const codeCell = document.createElement('td');
        codeCell.textContent = course.courseCode || '';
        
        const nameCell = document.createElement('td');
        nameCell.textContent = course.courseName || '';
        
        const hoursCell = document.createElement('td');
        hoursCell.textContent = course.creditHours || '';
        
        const teacherCell = document.createElement('td');
        teacherCell.textContent = course.teacherName || '';
        
        const venueCell = document.createElement('td');
        venueCell.textContent = course.venue || '';
        
        row.appendChild(codeCell);
        row.appendChild(nameCell);
        row.appendChild(hoursCell);
        row.appendChild(teacherCell);
        row.appendChild(venueCell);
        
        courseData.appendChild(row);
    });
    
    // Show modal
    modal.style.display = 'block';
    
    // Close modal when clicking the X
    closeBtn.onclick = function() {
        modal.style.display = 'none';
    }
    
    // Close modal when clicking outside
    window.onclick = function(event) {
        if (event.target == modal) {
            modal.style.display = 'none';
        }
    }
    
    // Handle tabs
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active class from all buttons and contents
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            // Add active class to clicked button and corresponding content
            btn.classList.add('active');
            const tabId = btn.getAttribute('data-tab');
            document.getElementById(tabId).classList.add('active');
        });
    });
}

// Populate the data lists in the admin panel
function populateDataLists() {
    populateListView('teacherNamesListView', dataManager.keys.teacherNames);
    populateListView('venuesListView', dataManager.keys.venues);
    populateListView('courseNamesListView', dataManager.keys.courseNames);
    populateListView('courseCodesListView', dataManager.keys.courseCodes);
}

// Populate a specific list view with data
function populateListView(elementId, dataKey) {
    const listContainer = document.getElementById(elementId);
    if (!listContainer) return;
    
    const items = dataManager.getData(dataKey);
    listContainer.innerHTML = '';
    
    if (items.length === 0) {
        const emptyMessage = document.createElement('div');
        emptyMessage.className = 'empty-list-message';
        emptyMessage.textContent = 'No items yet. Add some using the form below.';
        listContainer.appendChild(emptyMessage);
        return;
    }
    
    items.forEach(item => {
        const listItem = document.createElement('div');
        listItem.className = 'list-item';
        
        const itemText = document.createElement('span');
        itemText.className = 'list-item-text';
        itemText.textContent = item;
        
        const actions = document.createElement('div');
        actions.className = 'list-item-actions';
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'danger small';
        deleteBtn.textContent = 'Delete';
        deleteBtn.addEventListener('click', () => {
            deleteListItem(dataKey, item);
            populateListView(elementId, dataKey);
        });
        
        actions.appendChild(deleteBtn);
        listItem.appendChild(itemText);
        listItem.appendChild(actions);
        listContainer.appendChild(listItem);
    });
}

// Delete an item from a data list
function deleteListItem(dataKey, item) {
    if (confirm(`Are you sure you want to delete "${item}"?`)) {
        const data = dataManager.getData(dataKey);
        const updatedData = data.filter(dataItem => dataItem !== item);
        dataManager.saveData(dataKey, updatedData);
    }
}

// Add handlers for adding new items to data lists
function setupDataListHandlers() {
    setupAddItemHandler('addTeacherBtn', 'newTeacherName', dataManager.keys.teacherNames, 'teacherNamesListView');
    setupAddItemHandler('addVenueBtn', 'newVenue', dataManager.keys.venues, 'venuesListView');
    setupAddItemHandler('addCourseNameBtn', 'newCourseName', dataManager.keys.courseNames, 'courseNamesListView');
    setupAddItemHandler('addCourseCodeBtn', 'newCourseCode', dataManager.keys.courseCodes, 'courseCodesListView');
}

// Set up handler for adding a new item to a list
function setupAddItemHandler(buttonId, inputId, dataKey, listElementId) {
    const addBtn = document.getElementById(buttonId);
    if (!addBtn) return;
    
    addBtn.addEventListener('click', () => {
        const input = document.getElementById(inputId);
        const value = input.value.trim();
        
        if (value) {
            // Add to data store
            dataManager.addItem(dataKey, value);
            
            // Update the list view
            populateListView(listElementId, dataKey);
            
            // Clear the input
            input.value = '';
        }
    });
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
    
    // Import data from existing entries
    dataManager.importFromEntries();
    
    // Setup autocomplete for form fields
    const teacherNameInput = document.getElementById('teacherName');
    const venueInput = document.getElementById('venue');
    const courseNameInput = document.getElementById('courseName');
    const courseCodeInput = document.getElementById('courseCode');
    
    if (teacherNameInput) {
        setupAutocomplete(teacherNameInput, 'teacherNamesList', dataManager.keys.teacherNames);
    }
    
    if (venueInput) {
        setupAutocomplete(venueInput, 'venuesList', dataManager.keys.venues);
    }
    
    if (courseNameInput) {
        setupAutocomplete(courseNameInput, 'courseNamesList', dataManager.keys.courseNames);
    }
    
    if (courseCodeInput) {
        setupAutocomplete(courseCodeInput, 'courseCodesList', dataManager.keys.courseCodes);
    }
    
    // Data access button
    const viewStoredDataBtn = document.getElementById('viewStoredData');
    if (viewStoredDataBtn) {
        viewStoredDataBtn.addEventListener('click', displayStoredData);
    }
    
    // Populate data lists in admin panel
    populateDataLists();
    
    // Set up data list handlers
    setupDataListHandlers();
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

// Create autocomplete functionality
function setupAutocomplete(inputField, datalistId, dataKey) {
    // Create or get datalist element
    let datalist = document.getElementById(datalistId);
    if (!datalist) {
        datalist = document.createElement('datalist');
        datalist.id = datalistId;
        document.body.appendChild(datalist);
    }
    
    // Connect input to datalist
    inputField.setAttribute('list', datalistId);
    
    // Update suggestions as user types
    inputField.addEventListener('input', function() {
        const value = this.value;
        const suggestions = dataManager.getSuggestions(dataKey, value);
        
        // Clear existing options
        datalist.innerHTML = '';
        
        // Add new suggestions
        suggestions.forEach(suggestion => {
            const option = document.createElement('option');
            option.value = suggestion;
            datalist.appendChild(option);
        });
    });
}

// Add a function to manually add suggestions
function addSuggestion(type, value) {
    const key = dataManager.keys[type];
    if (key && value) {
        dataManager.addItem(key, value);
        return true;
    }
    return false;
}

// Add a debug function to view all stored suggestions
function viewStoredSuggestions() {
    return {
        teacherNames: dataManager.getData(dataManager.keys.teacherNames),
        venues: dataManager.getData(dataManager.keys.venues),
        courseNames: dataManager.getData(dataManager.keys.courseNames),
        courseCodes: dataManager.getData(dataManager.keys.courseCodes)
    };
}