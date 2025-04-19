// Add this debugging function at the top of your file
function debugTimeFormatting(entry) {
    console.log(`Entry time format check: startTime=${entry.startTime} (${typeof entry.startTime}), endTime=${entry.endTime} (${typeof entry.endTime})`);
    return entry;
}

// Updated time utilities for more reliable comparison
function normalizeTimeFormat(timeString) {
    if (!timeString) return '00:00';
    
    // If only hours are provided, add minutes
    if (!timeString.includes(':')) {
        return timeString + ':00';
    }
    
    return timeString;
}

// Updated convertToMinutes function
function convertToMinutes(timeString) {
    if (!timeString) return 0;
    
    const normalizedTime = normalizeTimeFormat(timeString);
    const parts = normalizedTime.split(':');
    let hours = parseInt(parts[0]);
    const minutes = parseInt(parts[1] || 0);
    
    // Make sure we're using 24-hour format for consistency
    // If hours are between 1-7 and the time is PM (afternoon classes)
    if (hours >= 1 && hours <= 7) {
        hours += 12; // Convert to 24-hour format (1pm = 13:00)
    }
    
    return hours * 60 + minutes;
}

// Fix time slot comparison in generatePDF
function isEntryInTimeSlot(entry, slotStart) {
    // Normalize times for consistency
    const entryStartTime = normalizeTimeFormat(entry.startTime);
    const entryEndTime = normalizeTimeFormat(entry.endTime);
    
    // Convert to minutes for easier comparison
    const entryStartMinutes = convertToMinutes(entryStartTime);
    const entryEndMinutes = convertToMinutes(entryEndTime);
    const slotStartMinutes = convertToMinutes(slotStart);
    
    // Debug output
    console.log(`Comparing ${entry.courseCode}: ${entryStartTime}(${entryStartMinutes}) - ${entryEndTime}(${entryEndMinutes}) with slot ${slotStart}(${slotStartMinutes})`);
    
    // Entry starts at or before this slot and ends after this slot starts
    return entryStartMinutes <= slotStartMinutes && entryEndMinutes > slotStartMinutes;
}

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
    autoUpdateSessionOptions();
}

// Determine available sessions based on current year and academic semester
function autoUpdateSessionOptions() {
    const sessionDropdown = document.getElementById('session');
    if (!sessionDropdown) return;
    
    // Clear existing options
    sessionDropdown.innerHTML = '';
    
    // Get current date
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth(); // 0-11 (Jan-Dec)
    
    // Determine if we're in Spring (Jan-June) or Fall (July-Dec) semester
    const isSpring = currentMonth >= 0 && currentMonth <= 5; // January (0) to June (5)
    const isFall = currentMonth >= 6 && currentMonth <= 11; // July (6) to December (11)
    
    // Calculate the years to include - 4 active batches
    let startYear, endYear;
    
    if (isFall) {
        // Fall semester (July-Dec): Show 1st, 3rd, 5th, 7th semesters
        startYear = currentYear - 3;
        endYear = currentYear;
    } else {
        // Spring semester (Jan-June): Show 2nd, 4th, 6th, 8th semesters
        startYear = currentYear - 4;
        endYear = currentYear - 1;
    }
    
    // Add options for the 4 active batches (ordered newest to oldest)
    for (let year = endYear; year >= startYear; year--) {
        const option = document.createElement('option');
        option.value = year;
        
        // Calculate which semester this batch is in
        const yearsElapsed = endYear - year;
        let semester;
        
        if (isFall) {
            // Fall semester: Odd-numbered semesters
            switch (yearsElapsed) {
                case 0: semester = "1st"; break;
                case 1: semester = "3rd"; break;
                case 2: semester = "5th"; break;
                case 3: semester = "7th"; break;
                default: semester = "Unknown";
            }
        } else {
            // Spring semester: Even-numbered semesters
            switch (yearsElapsed) {
                case 0: semester = "2nd"; break;
                case 1: semester = "4th"; break;
                case 2: semester = "6th"; break;
                case 3: semester = "8th"; break;
                default: semester = "Unknown";
            }
        }
        
        const semesterType = isFall ? "Fall" : "Spring";
        option.textContent = `${year} (${semester} Semester - ${semesterType})`;
        sessionDropdown.appendChild(option);
    }
    
    console.log(`Auto-configured ${isFall ? "Fall" : "Spring"} semester sessions from ${startYear} to ${endYear}`);
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

// Fixed generatePDF function - replace the existing function with this one
function generatePDF() {
    try {
        console.log("Starting PDF generation...");
        
        // Check if jsPDF is loaded
        if (typeof window.jspdf === 'undefined') {
            if (typeof window.jspdf === 'undefined') {
                window.jspdf = window.jspdf || {};
                if (typeof jsPDF !== 'undefined') {
                    window.jspdf.jsPDF = jsPDF;
                }
            }
        }
        
        // Get jsPDF constructor
        const { jsPDF } = window.jspdf;
        if (!jsPDF) {
            alert("PDF generation failed: jsPDF library not loaded properly");
            return;
        }
        
        // Create a new PDF document (landscape orientation for timetable)
        const doc = new jsPDF('l', 'mm', 'a4');
        
        // Add header
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('Time Table Fall Semester 2024', doc.internal.pageSize.width / 2, 15, { align: 'center' });
        
        doc.setFontSize(14);
        doc.text('DEPARTMENT OF COMPUTER SCIENCE & INFORMATION TECHNOLOGY', 
            doc.internal.pageSize.width / 2, 22, { align: 'center' });
        
        doc.setFontSize(12);
        doc.text('University of Chakwal', doc.internal.pageSize.width / 2, 28, { align: 'center' });
        
        // Group entries by session
        const sessions = [...new Set(timetableEntries.map(entry => entry.session))].sort();
        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
        const timeSlots = [
            '01:00-01:30', '01:30-02:00', '02:00-02:30', '02:30-03:00', '03:00-03:30', '03:30-04:00',
            '04:00-04:30', '04:30-05:00', '05:00-05:30', '05:30-06:00', '06:00-06:30', '06:30-07:00'
        ];
        
        // Debug all entries
        console.log("All timetable entries:", timetableEntries);
        
        // Set up timetable headers
        const headers = ['Day', 'Session', ...timeSlots.map(slot => slot)];
        
        // Set up timetable data
        let tableData = [];
        
        // Process each day and session
        days.forEach(day => {
            const dayEntries = timetableEntries.filter(entry => entry.day === day);
            if (dayEntries.length === 0) return;
            
            console.log(`Entries for ${day}:`, dayEntries);
            
            const daySessions = [...new Set(dayEntries.map(entry => entry.session))].sort();
            
            daySessions.forEach((session, index) => {
                const row = [];
                
                // Add day (only for first session)
                row.push(index === 0 ? day : '');
                
                // Add session
                row.push(session);
                
                // Get entries for this session/day
                const sessionEntries = dayEntries.filter(entry => entry.session.toString() === session.toString());
                console.log(`Entries for ${day}, session ${session}:`, sessionEntries);
                
                // Track slots that are already filled
                let skipSlots = 0;
                
                // Fill each time slot
                for (let i = 0; i < timeSlots.length; i++) {
                    // Skip slots that are already filled by previous entries
                    if (skipSlots > 0) {
                        skipSlots--;
                        continue;
                    }
                    
                    // Get the start time from the time slot
                    const slotParts = timeSlots[i].split('-');
                    const slotStart = slotParts[0];
                    
                    // Find entry that overlaps with this time slot
                    let foundEntry = null;
                    for (const entry of sessionEntries) {

                        // Use the improved time comparison function
                        if (isEntryInTimeSlot(entry, slotStart)) {
                            foundEntry = entry;
                            console.log(`MATCH FOUND: ${entry.courseCode} at slot ${slotStart}`);
                            
                            // Calculate span count - how many 30-min slots this entry covers
                            const entryStartMinutes = convertToMinutes(normalizeTimeFormat(entry.startTime));
                            const entryEndMinutes = convertToMinutes(normalizeTimeFormat(entry.endTime));
                            const spanCount = Math.ceil((entryEndMinutes - entryStartMinutes) / 30);
                            
                            // Add the course code to this cell
                            const cellContent = entry.isLab ? entry.courseCode + ' Lab' : entry.courseCode;
                            row.push(cellContent);
                            
                            // Skip appropriate number of slots
                            skipSlots = spanCount - 1;
                            break;
                        }
                    }
                    
                    // If no matching entry found, add empty cell
                    if (!foundEntry) {
                        row.push('');
                    }
                }
                
                // Add row to table data
                tableData.push(row);
            });
        });
        
        console.log("Generated table data:", tableData);
        
        // Set up autotable configuration
        const startY = 35;
        
        // Generate the timetable
        doc.autoTable({
            head: [headers],
            body: tableData,
            startY: startY,
            styles: {
                fontSize: 8,
                cellPadding: 2
            },
            columnStyles: {
                0: { cellWidth: 20 }, // Day column
                1: { cellWidth: 15 }  // Session column
            },
            didParseCell: function(data) {
                // Set colors based on session
                if (data.section === 'body') {
                    const session = data.row.cells[1].text;
                    
                    if (data.column.index < 2) {
                        // Day and session columns
                        if (data.column.index === 0) {
                            data.cell.styles.fillColor = [73, 124, 15]; // Green for day
                            data.cell.styles.textColor = [255, 255, 255]; // White text
                            data.cell.styles.fontStyle = 'bold';
                        } else {
                            data.cell.styles.fillColor = [240, 240, 240]; // Light gray for session
                        }
                    } else if (data.row.cells[1].text) {
                        // Set batch colors based on session year
                        if (data.row.cells[data.column.index].text) {
                            // Has course content
                            const isLab = data.row.cells[data.column.index].text.includes('Lab');
                            
                            if (isLab) {
                                data.cell.styles.fillColor = [255, 243, 205]; // Light yellow for labs
                            } else {
                                switch(session) {
                                    case '2021': data.cell.styles.fillColor = [242, 239, 255]; break; // Light lavender
                                    case '2022': data.cell.styles.fillColor = [232, 247, 232]; break; // Light green
                                    case '2023': data.cell.styles.fillColor = [231, 244, 255]; break; // Light blue
                                    case '2024': data.cell.styles.fillColor = [255, 251, 235]; break; // Light cream
                                }
                            }
                        } else {
                            // Empty cell - very light color based on batch
                            switch(session) {
                                case '2021': data.cell.styles.fillColor = [250, 249, 255]; break; // Very light lavender
                                case '2022': data.cell.styles.fillColor = [248, 253, 248]; break; // Very light green
                                case '2023': data.cell.styles.fillColor = [247, 251, 255]; break; // Very light blue
                                case '2024': data.cell.styles.fillColor = [255, 254, 250]; break; // Very light cream
                            }
                        }
                    }
                } else if (data.section === 'head') {
                    data.cell.styles.fillColor = [73, 124, 15]; // Green header
                    data.cell.styles.textColor = [255, 255, 255]; // White text
                    data.cell.styles.fontStyle = 'bold';
                }
            }
        });
        
        // Add course information tables for each session
        sessions.forEach((session, index) => {
            // Add a page break for all but the first session
            if (index > 0) {
                doc.addPage();
            } else if (doc.lastAutoTable) {
                // Start below the timetable on the first page
                doc.lastAutoTable.finalY += 15;
            }
            
            // Add session header
            const sessionYear = parseInt(session);
            const currentYear = new Date().getFullYear();
            let semesterNum;
            
            // Determine semester number based on current month and session year
            const currentMonth = new Date().getMonth();
            const isFall = currentMonth >= 6 && currentMonth <= 11;
            
            if (isFall) {
                // Fall semester (July-Dec): Show 1st, 3rd, 5th, 7th semesters
                const yearDiff = currentYear - sessionYear;
                if (yearDiff === 0) semesterNum = "1st";
                else if (yearDiff === 1) semesterNum = "3rd";
                else if (yearDiff === 2) semesterNum = "5th";
                else if (yearDiff === 3) semesterNum = "7th";
                else semesterNum = "";
            } else {
                // Spring semester (Jan-June): Show 2nd, 4th, 6th, 8th semesters
                const yearDiff = (currentYear-1) - sessionYear;
                if (yearDiff === 0) semesterNum = "2nd";
                else if (yearDiff === 1) semesterNum = "4th";
                else if (yearDiff === 2) semesterNum = "6th";
                else if (yearDiff === 3) semesterNum = "8th";
                else semesterNum = "";
            }
            
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(12);
            const sessionTitle = `Session ${session} (${semesterNum} Semester)`;
            doc.text(sessionTitle, 14, doc.lastAutoTable ? doc.lastAutoTable.finalY + 10 : 120);
            
            // Filter courses for this session
            const sessionEntries = timetableEntries.filter(entry => entry.session.toString() === session.toString());
            const uniqueCourses = {};
            
            sessionEntries.forEach(entry => {
                if (!uniqueCourses[entry.courseCode]) {
                    uniqueCourses[entry.courseCode] = entry;
                }
            });
            
            const courseData = Object.values(uniqueCourses).map(course => [
                course.courseCode,
                course.courseName,
                course.creditHours,
                course.teacherName || '',
                course.venue
            ]);
            
            // Generate course table
            if (courseData.length > 0) {
                doc.autoTable({
                    head: [['Course Code', 'Course Name', 'Credit Hrs', 'Teacher Name', 'Venue']],
                    body: courseData,
                    startY: doc.lastAutoTable ? doc.lastAutoTable.finalY + 15 : 125,
                    styles: {
                        fontSize: 9,
                        cellPadding: 3
                    },
                    headStyles: {
                        fillColor: [73, 124, 15], // Green header
                        textColor: [255, 255, 255], // White text
                        fontStyle: 'bold'
                    },
                    alternateRowStyles: {
                        fillColor: [248, 248, 248] // Light gray for alternate rows
                    },
                    margin: { left: 14, right: 14 }
                });
            }
        });
        
        // Add footer with date and page number
        const totalPages = doc.internal.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
            doc.setPage(i);
            
            // Footer with date
            const today = new Date().toLocaleDateString();
            doc.setFontSize(8);
            doc.setTextColor(100);
            doc.text(`Generated on: ${today}`, 14, doc.internal.pageSize.height - 10);
            
            // Page number
            doc.text(
                `Page ${i} of ${totalPages}`,
                doc.internal.pageSize.width - 25,
                doc.internal.pageSize.height - 10
            );
        }
        
        // Save the PDF
        doc.save('timetable.pdf');
        console.log("PDF generated successfully!");
    } catch (error) {
        console.error("Error generating PDF:", error);
        alert("Error generating PDF: " + error.message);
    }
}

// Add this at the end of your timetable.js file
document.addEventListener('DOMContentLoaded', function() {
    // Check login status
    checkLogin();
    
    // Update session options automatically based on current year
    autoUpdateSessionOptions();
    
    // Handle logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            sessionStorage.removeItem('loggedIn');
            sessionStorage.removeItem('currentUser');
            window.location.href = 'AdminLogin.html';
        });
    }
    
    // Handle form submission for adding new entries
    const timetableForm = document.getElementById('timetableForm');
    if (timetableForm) {
        timetableForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Form validation
            const courseCode = document.getElementById('courseCode').value.trim();
            const courseName = document.getElementById('courseName').value.trim();
            const creditHours = document.getElementById('creditHours').value.trim();
            const venue = document.getElementById('venue').value.trim();
            const teacherName = document.getElementById('teacherName').value.trim(); // Optional
            const session = document.getElementById('session').value;
            const startTime = document.getElementById('startTime').value;
            const endTime = document.getElementById('endTime').value;
            const isLab = document.getElementById('isLab').checked;
            
            // Get selected days
            const selectedDays = [];
            document.querySelectorAll('input[name="day"]:checked').forEach(checkbox => {
                selectedDays.push(checkbox.value);
            });
            
            // Validate required fields
            let error = false;
            
            if (!courseCode) {
                document.getElementById('courseCode').classList.add('input-error');
                error = true;
            } else {
                document.getElementById('courseCode').classList.remove('input-error');
            }
            
            if (!courseName) {
                document.getElementById('courseName').classList.add('input-error');
                error = true;
            } else {
                document.getElementById('courseName').classList.remove('input-error');
            }
            
            if (!creditHours) {
                document.getElementById('creditHours').classList.add('input-error');
                error = true;
            } else {
                document.getElementById('creditHours').classList.remove('input-error');
            }
            
            if (!venue) {
                document.getElementById('venue').classList.add('input-error');
                error = true;
            } else {
                document.getElementById('venue').classList.remove('input-error');
            }
            
            if (!startTime) {
                document.getElementById('startTime').classList.add('input-error');
                error = true;
            } else {
                document.getElementById('startTime').classList.remove('input-error');
            }
            
            if (!endTime) {
                document.getElementById('endTime').classList.add('input-error');
                error = true;
            } else {
                document.getElementById('endTime').classList.remove('input-error');
            }
            
            if (selectedDays.length === 0) {
                alert('Please select at least one day');
                error = true;
            }
            
            // Additional validation: end time must be after start time
            if (startTime && endTime && startTime >= endTime) {
                alert('End time must be after start time');
                document.getElementById('endTime').classList.add('input-error');
                error = true;
            }
            
            if (error) {
                alert('Please fill in all required fields');
                return;
            }
            
            // Add entry for each selected day
            let entryCount = 0;
            selectedDays.forEach(day => {
                addEntry(
                    day,
                    session,
                    courseCode,
                    courseName,
                    creditHours,
                    teacherName, // This is optional, can be empty
                    venue,
                    formatTimeFromInput(startTime),
                    startTime,
                    endTime,
                    isLab
                );
                entryCount++;
            });
            
            // Update display and reset form
            displayEntriesInAdmin();
            timetableForm.reset();
            
            // Show success message
            alert(`Successfully added ${entryCount} entries to the timetable.`);
        });
    }
    
    // Generate PDF button
    const generatePdfBtn = document.getElementById('generatePdf');
    if (generatePdfBtn) {
        generatePdfBtn.addEventListener('click', generatePDF);
    }
    
    // View Stored Data button
    const viewStoredDataBtn = document.getElementById('viewStoredData');
    if (viewStoredDataBtn) {
        viewStoredDataBtn.addEventListener('click', displayStoredData);
    }
    
    // Delete All Entries button
    const clearAllEntriesBtn = document.getElementById('clearAllEntries');
    if (clearAllEntriesBtn) {
        clearAllEntriesBtn.addEventListener('click', deleteAllEntries);
    }
    
    // Initialize data lists and autocomplete
    dataManager.importFromEntries();
    populateDataLists();
    setupDataListHandlers();
    
    // Display existing entries in admin panel
    displayEntriesInAdmin();
});

// Helper function to format time for timetable
function formatTimeFromInput(timeString) {
    if (!timeString) return '';
    
    const [hours, minutes] = timeString.split(':');
    return `${hours}:${minutes}`;
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
    };
    
    // Close modal when clicking outside
    window.onclick = function(event) {
        if (event.target == modal) {
            modal.style.display = 'none';
        }
    };
    
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

// Set up handlers for adding new items to data lists
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

// Setup autocomplete for input fields
function setupAutocomplete(inputElement, listId, dataKey) {
    if (!inputElement) return;
    
    // Create datalist if not exists
    let datalist = document.getElementById(listId);
    if (!datalist) {
        datalist = document.createElement('datalist');
        datalist.id = listId;
        document.body.appendChild(datalist);
    }
    
    // Link input to datalist
    inputElement.setAttribute('list', listId);
    
    // Populate datalist
    const items = dataManager.getData(dataKey);
    datalist.innerHTML = '';
    items.forEach(item => {
        const option = document.createElement('option');
        option.value = item;
        datalist.appendChild(option);
    });
}