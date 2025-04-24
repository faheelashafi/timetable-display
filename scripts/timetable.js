// Updated time utilities for more reliable comparison
function normalizeTimeFormat(timeString) {
    if (!timeString) return '00:00';
    
    // If only hours are provided, add minutes
    if (!timeString.includes(':')) {
        return timeString + ':00';
    }
    
    return timeString;
}

// Replace the broken convertToMinutes function with this fixed version
function convertToMinutes(timeString) {
    if (!timeString) return 0;
    
    // First normalize the time format
    const normalizedTime = normalizeTimeFormat(timeString);
    
    // Now use the normalized time
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

// Save entries to localStorage with timestamp for cross-page sync
function saveEntries() {
    try {
        localStorage.setItem('timetableEntries', JSON.stringify(timetableEntries));
        localStorage.setItem('timetable_lastUpdate', Date.now());
        console.log(`Saved ${timetableEntries.length} entries to localStorage`);
    } catch (error) {
        console.error('Error saving entries to localStorage:', error);
    }
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

// Add or update the addEntry function
function addEntry(day, session, courseCode, courseName, creditHours, teacherName, venue, displayTimeSlot, startTime, endTime, isLab) {
    // Create a unique ID for the entry
    const entryId = Date.now();
    
    // Create the entry object
    const entry = {
        id: entryId,
        day: day,
        session: session,
        courseCode: courseCode,
        courseName: courseName,
        creditHours: creditHours,
        teacherName: teacherName,
        venue: venue,
        displayTimeSlot: displayTimeSlot,
        startTime: startTime,
        endTime: endTime,
        isLab: isLab
    };
    
    // Add to the global array
    timetableEntries.push(entry);
    
    // Save to localStorage
    localStorage.setItem('timetableEntries', JSON.stringify(timetableEntries));
    
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

// Replace the autoUpdateSessionOptions function with the original version
function autoUpdateSessionOptions() {
    const sessionDropdown = document.getElementById('session');
    if (!sessionDropdown) {
        return;
    }
    
    // Clear existing options
    while (sessionDropdown.options.length > 0) {
        sessionDropdown.remove(0);
    }
    
    // Add options for years 2021-2024
    const option1 = document.createElement('option');
    option1.value = '2021';
    option1.textContent = '2021';
    sessionDropdown.appendChild(option1);
    
    const option2 = document.createElement('option');
    option2.value = '2022';
    option2.textContent = '2022';
    sessionDropdown.appendChild(option2);
    
    const option3 = document.createElement('option');
    option3.value = '2023';
    option3.textContent = '2023';
    sessionDropdown.appendChild(option3);
    
    const option4 = document.createElement('option');
    option4.value = '2024';
    option4.textContent = '2024';
    sessionDropdown.appendChild(option4);
    
    // Select the first option by default
    if (sessionDropdown.options.length > 0) {
        sessionDropdown.selectedIndex = 0;
    }
}

// Display entries in the admin panel (updated version)
function displayEntriesInAdmin() {
    const entriesList = document.getElementById('entriesList');
    if (!entriesList) {
        console.warn("Admin entries table not found (id='entriesList') - are you on the admin panel page?");
        return;
    }

    // Always reload from localStorage to get the latest data
    const entriesJson = localStorage.getItem('timetableEntries');
    console.log("Raw entries from localStorage:", entriesJson);
    
    try {
        timetableEntries = JSON.parse(entriesJson) || [];
    } catch (error) {
        console.error("Error parsing timetable entries from localStorage:", error);
        timetableEntries = [];
    }

    console.log(`Displaying ${timetableEntries.length} entries in admin panel`);
    entriesList.innerHTML = ''; // Clear existing entries
    
    // Implement the rest of the function to display entries
    // ...
}

// Fixed generatePDF function - replace the existing function with this one
function generatePDF() {
    try {
        console.log("Starting PDF generation...");
        
        // Check if jsPDF is loaded
        if (typeof window.jspdf === 'undefined') {
            window.jspdf = window.jspdf || {};
            if (typeof jsPDF !== 'undefined') {
                window.jspdf.jsPDF = jsPDF;
            }
        }
        
        const { jsPDF } = window.jspdf;
        if (!jsPDF) {
            alert("PDF generation failed: jsPDF library not loaded properly");
            return;
        }
        
        const doc = new jsPDF('l', 'mm', 'a4');
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('Time Table Fall Semester 2024', doc.internal.pageSize.width / 2, 15, { align: 'center' });
        doc.setFontSize(14);
        doc.text('DEPARTMENT OF COMPUTER SCIENCE & INFORMATION TECHNOLOGY', 
            doc.internal.pageSize.width / 2, 22, { align: 'center' });
        doc.setFontSize(12);
        doc.text('University of Chakwal', doc.internal.pageSize.width / 2, 28, { align: 'center' });
        
        const entries = window.timetableEntries || JSON.parse(localStorage.getItem('timetableEntries')) || [];
        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
        const timeSlots = getAllTimeSlots(entries); // <-- Use dynamic slots!
        const headers = ['Day', 'Session', ...timeSlots];
        const tableData = [];
        
        days.forEach(day => {
            const dayEntries = timetableEntries.filter(entry => entry.day === day);
            if (dayEntries.length === 0) return;
            
            const daySessions = [...new Set(dayEntries.map(entry => entry.session))].sort();
            daySessions.forEach((session, index) => {
                const row = [];
                row.push(index === 0 ? day : '');
                row.push(session);
                const sessionEntries = dayEntries.filter(entry => entry.session.toString() === session.toString());
                
                let skipSlots = 0;
                for (let i = 0; i < timeSlots.length; i++) {
                    if (skipSlots > 0) {
                        skipSlots--;
                        continue;
                    }
                    
                    const slotParts = timeSlots[i].split('-');
                    const slotStart = slotParts[0];
                    
                    let foundEntry = null;
                    for (const entry of sessionEntries) {
                        if (isEntryInTimeSlot(entry, slotStart)) {
                            foundEntry = entry;
                            const entryStartMinutes = convertToMinutes(normalizeTimeFormat(entry.startTime));
                            const entryEndMinutes = convertToMinutes(normalizeTimeFormat(entry.endTime));
                            const spanCount = Math.ceil((entryEndMinutes - entryStartMinutes) / 30);
                            const cellContent = entry.isLab ? entry.courseCode + ' Lab' : entry.courseCode;
                            row.push(cellContent);
                            skipSlots = spanCount - 1;
                            break;
                        }
                    }
                    
                    if (!foundEntry) {
                        row.push('');
                    }
                }
                tableData.push(row);
            });
        });
        
        const startY = 35;
        doc.autoTable({
            head: [headers],
            body: tableData,
            startY: startY,
            styles: {
                fontSize: 8,
                cellPadding: 2
            },
            columnStyles: {
                0: { cellWidth: 20 },
                1: { cellWidth: 15 }
            },
            didParseCell: function(data) {
                if (data.section === 'body') {
                    const session = data.row.cells[1].text;
                    if (data.column.index < 2) {
                        if (data.column.index === 0) {
                            data.cell.styles.fillColor = [73, 124, 15];
                            data.cell.styles.textColor = [255, 255, 255];
                            data.cell.styles.fontStyle = 'bold';
                        } else {
                            data.cell.styles.fillColor = [240, 240, 240];
                        }
                    } else if (data.row.cells[1].text) {
                        if (data.row.cells[data.column.index].text) {
                            const isLab = data.row.cells[data.column.index].text.includes('Lab');
                            data.cell.styles.fillColor = [240, 240, 240];
                            if (isLab) {
                                data.cell.styles.fillColor = [255, 243, 205];
                            } else {
                                switch(session) {
                                    case '2021': data.cell.styles.fillColor = [242, 239, 255]; break;
                                    case '2022': data.cell.styles.fillColor = [232, 247, 232]; break;
                                    case '2023': data.cell.styles.fillColor = [231, 244, 255]; break;
                                    case '2024': data.cell.styles.fillColor = [255, 251, 235]; break;
                                }
                            }
                        } else {
                            switch(session) {
                                case '2021': data.cell.styles.fillColor = [250, 249, 255]; break;
                                case '2022': data.cell.styles.fillColor = [248, 253, 248]; break;
                                case '2023': data.cell.styles.fillColor = [247, 251, 255]; break;
                                case '2024': data.cell.styles.fillColor = [255, 254, 250]; break;
                            }
                        }
                    }
                } else if (data.section === 'head') {
                    data.cell.styles.fillColor = [73, 124, 15];
                    data.cell.styles.textColor = [255, 255, 255];
                    data.cell.styles.fontStyle = 'bold';
                }
            }
        });
        
        sessions.forEach((session, index) => {
            if (index > 0) {
                doc.addPage();
            } else if (doc.lastAutoTable) {
                doc.lastAutoTable.finalY += 15;
            }
            
            const sessionYear = parseInt(session);
            const currentYear = new Date().getFullYear();
            let semesterNum;
            const currentMonth = new Date().getMonth();
            const isFall = currentMonth >= 6 && currentMonth <= 11;
            if (isFall) {
                const yearDiff = currentYear - sessionYear;
                if (yearDiff === 0) semesterNum = "1st";
                else if (yearDiff === 1) semesterNum = "3rd";
                else if (yearDiff === 2) semesterNum = "5th";
                else if (yearDiff === 3) semesterNum = "7th";
                else semesterNum = "";
            } else {
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
                        fillColor: [73, 124, 15],
                        textColor: [255, 255, 255],
                        fontStyle: 'bold'
                    },
                    alternateRowStyles: {
                        fillColor: [248, 248, 248]
                    },
                    margin: { left: 14, right: 14 }
                });
            }
        });
        
        const totalPages = doc.internal.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
            doc.setPage(i);
            const today = new Date().toLocaleDateString();
            doc.setFontSize(8);
            doc.setTextColor(100);
            doc.text(`Generated on: ${today}`, 14, doc.internal.pageSize.height - 10);
            doc.text(
                `Page ${i} of ${totalPages}`,
                doc.internal.pageSize.width - 25,
                doc.internal.pageSize.height - 10
            );
        }
        
        doc.save('timetable.pdf');
        console.log("PDF generated successfully!");
    } catch (error) {
        console.error("Error generating PDF:", error);
        alert("Error generating PDF: " + error.message);
    }
}

// Replace the existing login response handling in your login form event listener
document.getElementById('loginForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();
    const rememberMe = document.getElementById('rememberMe').checked;
    if (!username || !password) {
        alert('Please enter both username and password.');
        return;
    }
    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || 'Login failed');
        }
        sessionStorage.setItem('authToken', data.token);
        sessionStorage.setItem('loggedIn', 'true');
        sessionStorage.setItem('currentUser', username);
        sessionStorage.setItem('userRole', data.role);
        if (rememberMe) {
            localStorage.setItem('rememberedUser', username);
        }
        if (data.role === 'admin') {
            window.location.href = 'AdminPanel.html';
        } else {
            alert('Login successful but you do not have administrator privileges. Redirecting to timetable view.');
            window.location.href = 'DisplayTimetable.html';
        }
    } catch (error) {
        alert(error.message);
    }
});

// Modify the existing form submission handler for adding new entries
const timetableForm = document.getElementById('timetableForm');
if (timetableForm) {
    console.log("✅ Found timetable form, attaching submit handler");
    timetableForm.addEventListener('submit', function(e) {
        e.preventDefault();
        console.log("Form submitted, processing...");
        
        // Get form values
        const courseCode = document.getElementById('courseCode')?.value.trim() || '';
        const courseName = document.getElementById('courseName')?.value.trim() || '';
        const creditHours = document.getElementById('creditHours')?.value.trim() || '';
        const venue = document.getElementById('venue')?.value.trim() || '';
        const teacherName = document.getElementById('teacherName')?.value.trim() || '';
        const session = document.getElementById('session')?.value || '';
        const startTime = document.getElementById('startTime')?.value || '';
        const endTime = document.getElementById('endTime')?.value || '';
        const isLab = document.getElementById('isLab')?.checked || false;
        
        // Log form values for debugging
        console.log("Form values:", {
            courseCode, courseName, creditHours, venue, teacherName, session, startTime, endTime, isLab
        });
        
        // Get selected days
        const selectedDays = [];
        document.querySelectorAll('input[name="day"]:checked').forEach(checkbox => {
            selectedDays.push(checkbox.value);
        });
        console.log("Selected days:", selectedDays);
        
        // Form validation
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
        if (startTime && endTime && startTime >= endTime) {
            alert('End time must be after start time');
            document.getElementById('endTime').classList.add('input-error');
            error = true;
        }
        if (error) {
            alert('Please fill in all required fields');
            return;
        }
        
        // Add entries for each selected day
        let entryCount = 0;
        selectedDays.forEach(day => {
            addEntry(
                day,
                session,
                courseCode,
                courseName, 
                creditHours,
                teacherName,
                venue,
                `${startTime}-${endTime}`,  // timeSlot
                startTime,
                endTime,
                isLab
            );
            entryCount++;
        });

        // Save to localStorage with timestamp for cross-window updates
        saveEntries();

        // Force immediate display update
        displayEntriesInAdmin();
        updateStats();

        // Reset form
        timetableForm.reset();

        // Store update timestamp for cross-window sync
        localStorage.setItem('timetable_lastUpdate', Date.now());

        // Show success message
        alert(`Successfully added ${entryCount} entries to the timetable.`);
    });
}

// Clean up multiple event listeners by using a single initialization function
function initializeApplication() {
  console.log("Initializing application...");
  
  // Step 1: Make sure entries exist in localStorage
  const entries = JSON.parse(localStorage.getItem('timetableEntries')) || [];
  console.log(`Found ${entries.length} entries in localStorage`);
  
  // Step 2: Add a test entry if none exist
  if (entries.length === 0) {
    const newEntries = ensureTestEntryExists();
    console.log(`Created test entry. Now have ${newEntries.length} entries.`);
    
    // Make sure global variable is updated
    timetableEntries = newEntries;
  } else {
    // Make sure global variable matches localStorage
    timetableEntries = entries;
  }
  
  // Step 3: Initialize UI components
  checkLogin();
  autoUpdateSessionOptions();
  
  // Step 4: Set up event handlers
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', function() {
      sessionStorage.removeItem('loggedIn');
      sessionStorage.removeItem('currentUser');
      window.location.href = 'AdminLogin.html';
    });
  }
  
  const generatePdfBtn = document.getElementById('generatePdf');
  if (generatePdfBtn) {
    generatePdfBtn.addEventListener('click', generatePDF);
  }
  
  const viewStoredDataBtn = document.getElementById('viewStoredData');
  if (viewStoredDataBtn) {
    viewStoredDataBtn.addEventListener('click', displayStoredData);
  }
  
  const clearAllEntriesBtn = document.getElementById('clearAllEntries');
  if (clearAllEntriesBtn) {
    clearAllEntriesBtn.addEventListener('click', deleteAllEntries);
  }
  
  // Step 5: Initialize data management
  dataManager.importFromEntries();
  populateDataLists();
  setupDataListHandlers();
  
  // Step 6: Display entries
  displayEntriesInAdmin();
  
  console.log("Application initialization complete!");
}

// Use a single DOMContentLoaded event listener
document.addEventListener('DOMContentLoaded', function() {
  console.log("Document loaded, starting initialization");
  // Slight delay to ensure DOM is fully ready
  setTimeout(initializeApplication, 100);
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
    const teacherNames = dataManager.getData(dataManager.keys.teacherNames);
    const venues = dataManager.getData(dataManager.keys.venues);
    const courseNames = dataManager.getData(dataManager.keys.courseNames);
    const courseCodes = dataManager.getData(dataManager.keys.courseCodes);
    const teacherNamesContainer = document.getElementById('teacherNamesList');
    teacherNamesContainer.innerHTML = '';
    teacherNames.forEach(name => {
        const div = document.createElement('div');
        div.className = 'data-item';
        div.textContent = name;
        teacherNamesContainer.appendChild(div);
    });
    const venuesContainer = document.getElementById('venuesList');
    venuesContainer.innerHTML = '';
    venues.forEach(venue => {
        const div = document.createElement('div');
        div.className = 'data-item';
        div.textContent = venue;
        venuesContainer.appendChild(div);
    });
    const courseNamesContainer = document.getElementById('courseNamesList');
    courseNamesContainer.innerHTML = '';
    courseNames.forEach(name => {
        const div = document.createElement('div');
        div.className = 'data-item';
        div.textContent = name;
        courseNamesContainer.appendChild(div);
    });
    const courseCodesContainer = document.getElementById('courseCodesList');
    courseCodesContainer.innerHTML = '';
    courseCodes.forEach(code => {
        const div = document.createElement('div');
        div.className = 'data-item';
        div.textContent = code;
        courseCodesContainer.appendChild(div);
    });
    const courseData = document.getElementById('courseData');
    courseData.innerHTML = '';
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
    modal.style.display = 'block';
    closeBtn.onclick = function() {
        modal.style.display = 'none';
    };
    window.onclick = function(event) {
        if (event.target == modal) {
            modal.style.display = 'none';
        }
    };
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
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
            dataManager.addItem(dataKey, value);
            populateListView(listElementId, dataKey);
            input.value = '';
        }
    });
}

// Setup autocomplete for input fields
function setupAutocomplete(inputElement, listId, dataKey) {
    if (!inputElement) return;
    let datalist = document.getElementById(listId);
    if (!datalist) {
        datalist = document.createElement('datalist');
        datalist.id = listId;
        document.body.appendChild(datalist);
    }
    inputElement.setAttribute('list', listId);
    const items = dataManager.getData(dataKey);
    datalist.innerHTML = '';
    items.forEach(item => {
        const option = document.createElement('option');
        option.value = item;
        datalist.appendChild(option);
    });
}

window.renderTimetable = function(entries) {
    const tableBody = document.getElementById('timetableBody');
    if (!tableBody) {
        console.error("No timetableBody element found in document");
        return;
    }
    
    // Clear any existing content
    tableBody.innerHTML = '';
    
    if (!entries || entries.length === 0) {
        console.warn("No timetable entries to display");
        const row = document.createElement('tr');
        const cell = document.createElement('td');
        cell.colSpan = 14;
        cell.textContent = 'No timetable entries found. Please add entries in the Admin Panel.';
        cell.style.textAlign = 'center';
        cell.style.padding = '20px';
        row.appendChild(cell);
        tableBody.appendChild(row);
        return;
    }
    
    console.log(`Rendering ${entries.length} entries to timetable`);
    
    // Group entries by day and session
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const timeSlots = getAllTimeSlots(entries); // <-- Use dynamic slots!
    
    // Update table header as well
    const table = document.getElementById('timetableDisplay');
    if (table) {
        const thead = table.querySelector('thead');
        if (thead) {
            const headerRow = thead.querySelector('tr');
            // Remove old slot headers
            while (headerRow.children.length > 2) {
                headerRow.removeChild(headerRow.lastChild);
            }
            // Add new slot headers
            timeSlots.forEach(slot => {
                const th = document.createElement('th');
                th.textContent = slot;
                headerRow.appendChild(th);
            });
        }
    }
    
    days.forEach(day => {
        const dayEntries = entries.filter(entry => entry.day === day);
        if (dayEntries.length === 0) return;
        
        const sessions = [...new Set(dayEntries.map(entry => entry.session))].sort();
        
        sessions.forEach((session, sessionIndex) => {
            const row = document.createElement('tr');
            row.className = `batch-${session}`;
            
            if (sessionIndex === 0) {
                const dayCell = document.createElement('td');
                dayCell.className = 'day-cell';
                dayCell.textContent = day;
                dayCell.rowSpan = sessions.length;
                row.appendChild(dayCell);
            }
            
            const sessionCell = document.createElement('td');
            sessionCell.className = 'session-cell';
            sessionCell.textContent = session;
            row.appendChild(sessionCell);
            
            const sessionEntries = dayEntries.filter(entry => entry.session === session);
            
            let slotIndex = 0;
            while (slotIndex < timeSlots.length) {
                const timeSlot = timeSlots[slotIndex];
                const [slotStart, slotEnd] = timeSlot.split('-');
                const entry = sessionEntries.find(e =>
                    normalizeTimeFormat(e.startTime) === slotStart &&
                    normalizeTimeFormat(e.endTime) === slotEnd
                );
                if (entry) {
                    const cell = document.createElement('td');
                    cell.className = 'course-cell';
                    cell.textContent = entry.isLab ? entry.courseCode + ' Lab' : entry.courseCode;
                    cell.title = `${entry.courseName}\nCredit Hours: ${entry.creditHours}\nTeacher: ${entry.teacherName || 'N/A'}\nVenue: ${entry.venue || 'N/A'}`;
                    row.appendChild(cell);
                } else {
                    const cell = document.createElement('td');
                    row.appendChild(cell);
                }
                slotIndex++;
            }
            
            tableBody.appendChild(row);
        });
    });
};

// Function to load entries from localStorage and render them
function loadAndRenderTimetable() {
    const entries = JSON.parse(localStorage.getItem('timetableEntries')) || [];
    window.renderTimetable(entries);
}

// Add this at the bottom of the file for simple entry display
function renderTimetable(entries) {
    const tableBody = document.getElementById('timetableBody');
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    
    if (!entries || entries.length === 0) {
        const row = document.createElement('tr');
        const cell = document.createElement('td');
        cell.colSpan = 14;
        cell.textContent = 'No timetable entries found. Please add entries in the Admin Panel.';
        cell.style.textAlign = 'center';
        cell.style.padding = '20px';
        row.appendChild(cell);
        tableBody.appendChild(row);
        return;
    }
    
    // Group entries by day and session
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const timeSlots = getAllTimeSlots(entries); // <-- Use dynamic slots!
    
    days.forEach(day => {
        const dayEntries = entries.filter(entry => entry.day === day);
        if (dayEntries.length === 0) return;
        
        const sessions = [...new Set(dayEntries.map(entry => entry.session))].sort();
        
        sessions.forEach((session, sessionIndex) => {
            const row = document.createElement('tr');
            row.className = `batch-${session}`;
            
            if (sessionIndex === 0) {
                const dayCell = document.createElement('td');
                dayCell.className = 'day-cell';
                dayCell.textContent = day;
                dayCell.rowSpan = sessions.length;
                row.appendChild(dayCell);
            }
            
            const sessionCell = document.createElement('td');
            sessionCell.className = 'session-cell';
            sessionCell.textContent = session;
            row.appendChild(sessionCell);
            
            const sessionEntries = dayEntries.filter(entry => entry.session === session);
            
            let slotIndex = 0;
            while (slotIndex < timeSlots.length) {
                const timeSlot = timeSlots[slotIndex];
                const [slotStart, slotEnd] = timeSlot.split('-');
                const entry = sessionEntries.find(e =>
                    normalizeTimeFormat(e.startTime) === slotStart &&
                    normalizeTimeFormat(e.endTime) === slotEnd
                );
                if (entry) {
                    const cell = document.createElement('td');
                    cell.className = 'course-cell';
                    cell.textContent = entry.isLab ? entry.courseCode + ' Lab' : entry.courseCode;
                    cell.title = `${entry.courseName}\nCredit Hours: ${entry.creditHours}\nTeacher: ${entry.teacherName || 'N/A'}\nVenue: ${entry.venue || 'N/A'}`;
                    row.appendChild(cell);
                } else {
                    const cell = document.createElement('td');
                    row.appendChild(cell);
                }
                slotIndex++;
            }
            
            tableBody.appendChild(row);
        });
    });
}

// Function to get all time slots dynamically
function getAllTimeSlots(entries) {
    // Collect all unique (start, end) pairs as slot strings
    const slotSet = new Set();
    entries.forEach(entry => {
        if (entry.startTime && entry.endTime) {
            const slot = `${normalizeTimeFormat(entry.startTime)}-${normalizeTimeFormat(entry.endTime)}`;
            slotSet.add(slot);
        }
    });

    // Convert to array and sort by start time
    const slots = Array.from(slotSet);
    slots.sort((a, b) => {
        const aStart = convertToMinutes(a.split('-')[0]);
        const bStart = convertToMinutes(b.split('-')[0]);
        return aStart - bStart;
    });

    return slots;
}

// Helper to add minutes to a time string
function addMinutes(time, minsToAdd) {
    const [h, m] = time.split(':').map(Number);
    let total = h * 60 + m + minsToAdd;
    let hours = Math.floor(total / 60);
    let mins = total % 60;
    // Pad with zero if needed
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}
