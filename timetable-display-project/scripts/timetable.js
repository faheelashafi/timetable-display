// Add this debugging function at the top of your file
function debugTimeFormatting(entry) {
    console.log(`Entry time format check: startTime=${entry.startTime} (${typeof entry.startTime}), endTime=${entry.endTime} (${typeof entry.endTime})`);
    return entry;
}

// Add this function at the top of your file
function debugTimeTableEntries() {
  const entries = JSON.parse(localStorage.getItem('timetableEntries')) || [];
  console.log('DEBUGGING ENTRIES:', entries);
  console.log('Entry count:', entries.length);
  if (entries.length > 0) {
    console.log('Sample entry:', entries[0]);
  } else {
    console.warn('No entries found in localStorage!');
  }
  return entries;
}

// Add this function to your script
function repairLocalStorageEntries() {
  // Check for entries under different possible key names
  const possibleKeys = ['timetableEntries', 'TimeTableEntries', 'timeTableEntries', 'entries'];
  let entries = [];
  
  for (const key of possibleKeys) {
    const data = localStorage.getItem(key);
    if (data) {
      try {
        const parsedData = JSON.parse(data);
        if (Array.isArray(parsedData) && parsedData.length > 0) {
          console.log(`Found ${parsedData.length} entries under key "${key}"`);
          entries = parsedData;
          break;
        }
      } catch (e) {
        console.error(`Error parsing data from key "${key}":`, e);
      }
    }
  }
  
  // Save to the correct key
  if (entries.length > 0) {
    localStorage.setItem('timetableEntries', JSON.stringify(entries));
    console.log(`Repaired: Saved ${entries.length} entries to 'timetableEntries' key`);
  }
  
  return entries;
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

// Replace the entire generatePDF function
function generatePDF() {
    try {
        console.log("Starting PDF generation...");
        
        // Get entries directly from localStorage each time
        let entries;
        try {
            entries = JSON.parse(localStorage.getItem('timetableEntries')) || [];
            console.log(`Found ${entries.length} entries in localStorage`);
            
            if (entries.length === 0) {
                if (confirm("No entries found. Would you like to create sample entries for testing?")) {
                    entries = [{
                        id: Date.now(),
                        day: "Monday",
                        session: "2021",
                        courseCode: "IT-415",
                        courseName: "Cyber Security",
                        creditHours: "3",
                        teacherName: "Ms. Zanib Nawab",
                        venue: "Room # 6, 1st Floor (BS Block)",
                        startTime: "01:00",
                        endTime: "03:00",
                        isLab: false
                    }, {
                        id: Date.now() + 1,
                        day: "Tuesday",
                        session: "2021",
                        courseCode: "IT-415",
                        courseName: "Cyber Security",
                        creditHours: "3",
                        teacherName: "Ms. Zanib Nawab",
                        venue: "Room # 6, 1st Floor (BS Block)",
                        startTime: "01:00",
                        endTime: "03:00",
                        isLab: false
                    }];
                    
                    localStorage.setItem('timetableEntries', JSON.stringify(entries));
                    console.log("Created sample entries:", entries);
                } else {
                    alert("No entries to display in PDF");
                    return;
                }
            }
        } catch (error) {
            console.error("Error getting entries from localStorage:", error);
            alert("Failed to load timetable entries. Please try again.");
            return;
        }
        
        // Check if jsPDF is available
        if (!window.jspdf) {
            console.error("jsPDF library not found");
            alert("PDF generation requires jsPDF library which seems to be missing");
            return;
        }
        
        // Create PDF document
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('l', 'mm', 'a4');
        
        // Add header text
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('Time Table Fall Semester 2024', doc.internal.pageSize.width / 2, 15, { align: 'center' });
        doc.setFontSize(14);
        doc.text('DEPARTMENT OF COMPUTER SCIENCE & INFORMATION TECHNOLOGY', 
            doc.internal.pageSize.width / 2, 22, { align: 'center' });
        doc.setFontSize(12);
        doc.text('University of Chakwal', doc.internal.pageSize.width / 2, 28, { align: 'center' });
        
        // Define days and time slots
        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
        const timeSlots = [
            '01:00-01:30', '01:30-02:00', '02:00-02:30', '02:30-03:00', '03:00-03:30', '03:30-04:00',
            '04:00-04:30', '04:30-05:00', '05:00-05:30', '05:30-06:00', '06:00-06:30', '06:30-07:00'
        ];
        
        // Prepare data for the table
        const tableData = [];
        
        days.forEach(day => {
            // Get entries for this day
            const dayEntries = entries.filter(entry => entry.day === day);
            if (dayEntries.length === 0) return;
            
            // Group by session
            const sessions = [...new Set(dayEntries.map(entry => entry.session))].sort();
            
            sessions.forEach((session, sessionIndex) => {
                const row = [
                    sessionIndex === 0 ? day : '', // Show day only for first row of the day
                    session
                ];
                
                // Get entries for this session on this day
                const sessionEntries = dayEntries.filter(entry => entry.session === session);
                
                // For each time slot, check if any entry covers it
                timeSlots.forEach(timeSlot => {
                    const slotStart = timeSlot.split('-')[0]; // "01:00" from "01:00-01:30"
                    
                    // Find entry that covers this slot
                    const entry = sessionEntries.find(entry => {
                        // Simple string comparison works for HH:MM format
                        return entry.startTime <= slotStart && entry.endTime > slotStart;
                    });
                    
                    // Add course code or empty string
                    row.push(entry ? entry.courseCode : '');
                });
                
                tableData.push(row);
            });
        });
        
        // Generate the main timetable
        doc.autoTable({
            startY: 35,
            head: [['Day', 'Session', ...timeSlots]],
            body: tableData,
            theme: 'grid',
            headStyles: {
                fillColor: [76, 175, 80],
                textColor: [255, 255, 255],
                halign: 'center',
                fontStyle: 'bold',
                fontSize: 8,
                cellPadding: 2
            },
            bodyStyles: {
                fontSize: 8,
                cellPadding: 2,
                halign: 'center'
            },
            columnStyles: {
                0: { cellWidth: 15 }, // Day column
                1: { cellWidth: 12 }  // Session column
            },
            didParseCell: function(data) {
                // Color cells based on session
                if (data.section === 'body' && data.column.index >= 2) {
                    if (data.cell.text && data.cell.text.length > 0) {
                        const session = data.row.raw[1];
                        
                        if (session === '2021') {
                            data.cell.styles.fillColor = [242, 239, 255]; // Light purple
                        } else if (session === '2022') {
                            data.cell.styles.fillColor = [232, 247, 232]; // Light green
                        } else if (session === '2023') {
                            data.cell.styles.fillColor = [231, 244, 255]; // Light blue
                        } else if (session === '2024') {
                            data.cell.styles.fillColor = [255, 251, 235]; // Light yellow
                        }
                    }
                }
            }
        });
        
        // Generate course detail tables
        let startY = doc.previousAutoTable.finalY + 15;
        
        // Get unique sessions
        const sessions = [...new Set(entries.map(entry => entry.session))].sort();
        
        // Semester mapping
        const semesterMap = {
            '2021': '(8th Semester)',
            '2022': '(6th Semester)',
            '2023': '(4th Semester)',
            '2024': '(2nd Semester)'
        };
        
        // Generate a separate table for each session
        sessions.forEach(session => {
            // Add session header
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text(`Session ${session} ${semesterMap[session] || ''}`, 14, startY);
            
            // Get unique courses for this session
            const sessionEntries = entries.filter(entry => entry.session === session);
            const uniqueCourses = {};
            
            sessionEntries.forEach(entry => {
                if (!uniqueCourses[entry.courseCode]) {
                    uniqueCourses[entry.courseCode] = entry;
                }
            });
            
            // Create course detail rows
            const courseData = Object.values(uniqueCourses).map(course => [
                course.courseCode,
                course.courseName,
                course.creditHours,
                course.teacherName || 'N/A',
                course.venue || 'N/A'
            ]);
            
            // Generate session course table
            doc.autoTable({
                startY: startY + 5,
                head: [['Course Code', 'Course Name', 'Credit Hrs', 'Teacher Name', 'Venue']],
                body: courseData,
                theme: 'grid',
                headStyles: {
                    fillColor: [76, 175, 80],
                    textColor: [255, 255, 255],
                    fontStyle: 'bold'
                }
            });
            
            // Update startY for next table
            startY = doc.previousAutoTable.finalY + 15;
        });
        
        // Add footer
        const totalPages = doc.internal.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(100);
            doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, doc.internal.pageSize.height - 10);
            doc.text(`Page ${i} of ${totalPages}`, doc.internal.pageSize.width - 25, doc.internal.pageSize.height - 10);
        }
        
        // Save the PDF
        doc.save('timetable.pdf');
        console.log("PDF generated successfully!");
    } catch (error) {
        console.error("Error generating PDF:", error);
        alert(`Error generating PDF: ${error.message}`);
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

// Update the ensureTestEntryExists function to properly save the entry
function ensureTestEntryExists() {
  const entries = JSON.parse(localStorage.getItem('timetableEntries')) || [];
  
  if (entries.length === 0) {
    console.log("No entries found, adding a test entry");
    
    const testEntry = {
      id: Date.now(),
      day: 'Monday',
      session: '2024',
      courseCode: 'IT-415',
      courseName: 'Web Application Development',
      creditHours: '3',
      teacherName: 'Dr. Example',
      venue: 'Room 101',
      timeSlot: '01:00-02:30',
      startTime: '01:00',
      endTime: '02:30',
      isLab: false,
      displayTimeSlot: '01:00-02:30'
    };
    
    entries.push(testEntry);
    localStorage.setItem('timetableEntries', JSON.stringify(entries));
    localStorage.setItem('timetable_lastUpdate', Date.now());
    console.log("Test entry added successfully!");
    return entries;
  }
  return entries;
}

// Clean up multiple event listeners by using a single initialization function
function initializeApplication() {
  console.log("Initializing application...");
  
  // Step 1: Make sure entries exist in localStorage
  const entries = repairLocalStorageEntries();
  console.log(`Found ${entries.length} entries in localStorage after repair`);
  
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

// Replace your incomplete renderTimetable function with this complete version
function renderTimetable(entries) {
    console.log("renderTimetable called with", entries ? entries.length : 0, "entries");
    
    const tableBody = document.getElementById('timetableBody');
    if (!tableBody) {
        console.error("Timetable body element not found");
        return;
    }
    
    // Clear existing content
    tableBody.innerHTML = '';
    
    if (!entries || entries.length === 0) {
        const row = document.createElement('tr');
        const cell = document.createElement('td');
        cell.colSpan = 14; // Span across all columns
        cell.textContent = 'No timetable entries found. Please add some entries in the Admin Panel.';
        cell.style.textAlign = 'center';
        cell.style.padding = '20px';
        row.appendChild(cell);
        tableBody.appendChild(row);
        return;
    }
    
    // Group entries by day
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    
    days.forEach(day => {
        const dayEntries = entries.filter(entry => entry.day === day);
        if (dayEntries.length === 0) return;
        
        // Group by session
        const sessions = [...new Set(dayEntries.map(entry => entry.session))].sort();
        
        sessions.forEach((session, sessionIndex) => {
            const row = document.createElement('tr');
            
            // Day column (only for first session of the day)
            const dayCell = document.createElement('td');
            dayCell.textContent = sessionIndex === 0 ? day : '';
            row.appendChild(dayCell);
            
            // Session column
            const sessionCell = document.createElement('td');
            sessionCell.textContent = session;
            row.appendChild(sessionCell);
            
            // Session-based styling
            row.classList.add(`batch-${session}`);
            
            // Time slots
            const timeSlots = [
                '01:00', '01:30', '02:00', '02:30', '03:00', '03:30',
                '04:00', '04:30', '05:00', '05:30', '06:00', '06:30'
            ];
            
            timeSlots.forEach(slotStart => {
                const cell = document.createElement('td');
                
                // Find entry for this time slot
                const entry = dayEntries.find(entry => 
                    entry.session === session && 
                    entry.startTime <= slotStart && 
                    entry.endTime > slotStart
                );
                
                if (entry) {
                    cell.textContent = entry.courseCode;
                    cell.classList.add('course-cell');
                    
                    if (entry.isLab) {
                        cell.classList.add('lab-course');
                    }
                }
                
                row.appendChild(cell);
            });
            
            tableBody.appendChild(row);
        });
    });
    
    console.log("Timetable rendering complete");
}

// Make the function globally available
window.renderTimetable = renderTimetable;

// Define renderTimetable function - add this to timetable.js
function renderTimetable(entries) {
    console.log("renderTimetable called with", entries ? entries.length : 0, "entries");
    
    const tableBody = document.getElementById('timetableBody');
    if (!tableBody) {
        console.error("Timetable body element not found");
        return;
    }
    
    // Clear existing content
    tableBody.innerHTML = '';
    
    if (!entries || entries.length === 0) {
        const row = document.createElement('tr');
        const cell = document.createElement('td');
        cell.colSpan = 14; // Total number of columns
        cell.textContent = 'No entries found. Please add some entries in the Admin Panel.';
        cell.style.textAlign = 'center';
        cell.style.padding = '20px';
        row.appendChild(cell);
        tableBody.appendChild(row);
        return;
    }
    
    // Group entries by day
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    
    days.forEach(day => {
        const dayEntries = entries.filter(entry => entry.day === day);
        if (dayEntries.length === 0) return;
        
        // Group by session
        const sessions = [...new Set(dayEntries.map(entry => entry.session))].sort();
        
        sessions.forEach((session, sessionIndex) => {
            const row = document.createElement('tr');
            
            // Day column (only for first session of the day)
            const dayCell = document.createElement('td');
            dayCell.textContent = sessionIndex === 0 ? day : '';
            row.appendChild(dayCell);
            
            // Session column
            const sessionCell = document.createElement('td');
            sessionCell.textContent = session;
            row.appendChild(sessionCell);
            
            // Session-based styling
            row.classList.add(`session-${session}`);
            
            // Get entries for this session on this day
            const sessionEntries = dayEntries.filter(entry => entry.session === session);
            
            // Time slots
            const timeSlots = [
                '01:00', '01:30', '02:00', '02:30', '03:00', '03:30',
                '04:00', '04:30', '05:00', '05:30', '06:00', '06:30'
            ];
            
            timeSlots.forEach(slotStart => {
                const cell = document.createElement('td');
                
                // Find entry that covers this time slot
                const entry = sessionEntries.find(entry => {
                    return entry.startTime <= slotStart && entry.endTime > slotStart;
                });
                
                if (entry) {
                    cell.textContent = entry.courseCode;
                    
                    // Add styling for lab classes
                    if (entry.isLab) {
                        cell.classList.add('lab-class');
                    }
                    
                    // Session-based color coding
                    cell.classList.add(`session-${session}-cell`);
                }
                
                row.appendChild(cell);
            });
            
            tableBody.appendChild(row);
        });
    });
    
    console.log("Timetable rendering complete");
}

// Make sure renderTimetable is available globally
window.renderTimetable = renderTimetable;

// Also add this to ensure the entries are properly loaded on the display page
document.addEventListener('DOMContentLoaded', function() {
    // Check if we're on the timetable display page
    const timetableBody = document.getElementById('timetableBody');
    if (timetableBody) {
        console.log("Found timetable body, loading entries");
        try {
            const entriesJson = localStorage.getItem('timetableEntries');
            console.log("Raw entries from localStorage:", entriesJson);
            
            const entries = JSON.parse(entriesJson) || [];
            console.log(`Loaded ${entries.length} entries from localStorage`);
            
            // Render the entries
            window.renderTimetable(entries);
        } catch (e) {
            console.error("Error loading timetable entries:", e);
        }
    }
});

// Add this code at the end of your file to ensure the PDF button works
document.addEventListener('DOMContentLoaded', function() {
    const pdfButton = document.getElementById('generatePdf');
    if (pdfButton) {
        console.log("Found PDF button, adding direct click handler");
        pdfButton.addEventListener('click', function() {
            console.log("Generate PDF button clicked");
            generatePDF();
        });
    }
    
    // Also check if we're on the display timetable page and render it
    const timetableBody = document.getElementById('timetableBody');
    if (timetableBody) {
        console.log("Found timetable body, rendering entries");
        const entries = JSON.parse(localStorage.getItem('timetableEntries')) || [];
        window.renderTimetable(entries);
    }
});
