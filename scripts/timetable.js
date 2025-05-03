// Define these functions to be loaded from the HTML modules
let initializeApp; 
let getFirestore, collection, getDocs, addDoc, setDoc, doc, deleteDoc, getDoc, updateDoc, arrayUnion, arrayRemove;

// Firebase initialization function
function setupFirebase(imports) {
  console.log("Starting Firebase initialization...");
  
  // Prevent multiple initializations
  if (window.firebaseInitialized) {
    console.log("Firebase already initialized, skipping");
    return window.db;
  }
  
  try {
    // Assign functions from imports
    initializeApp = imports.initializeApp;
    getFirestore = imports.getFirestore;
    collection = imports.collection;
    getDocs = imports.getDocs;
    addDoc = imports.addDoc;
    setDoc = imports.setDoc;
    doc = imports.doc;
    deleteDoc = imports.deleteDoc;
    getDoc = imports.getDoc;
    updateDoc = imports.updateDoc;
    arrayUnion = imports.arrayUnion;
    arrayRemove = imports.arrayRemove;

    // Initialize Firebase ONCE with console logging
    console.log("Initializing Firebase app...");
    const app = initializeApp(firebaseConfig);
    console.log("Firebase app initialized, setting up Firestore...");
    window.db = getFirestore(app);
    console.log("Firestore initialized, db object created");
    window.firebaseInitialized = true;
    
    // Export functions to window for access across HTML files
    window.addTimetableEntry = addTimetableEntry;
    window.getAllTimetableEntries = getAllTimetableEntries;
    window.deleteTimetableEntry = deleteTimetableEntry;
    window.loadAndDisplayEntries = loadAndDisplayEntries;
    window.displayEntriesInAdmin = displayEntriesInAdmin;
    window.renderEmptyTimetableGrid = renderEmptyTimetableGrid;
    window.renderTimetable = renderTimetable;
    window.initializeApplication = initializeApplication;
    window.getSuggestionArray = getSuggestionArray;
    window.updateStats = updateStats;
    window.ensureCollectionsExist = ensureCollectionsExist;
    window.initializeSessionDropdown = initializeSessionDropdown;
    
    console.log("Firebase initialization completed successfully");
    return window.db;
  } catch (error) {
    console.error("Firebase initialization failed:", error);
    alert("Firebase initialization failed: " + error.message);
    return null;
  }
}

// Your Firebase config
const firebaseConfig = {
    apiKey: "AIzaSyB6PZysrQMckTjMuBVv0FohIaI9FJIrhLQ",
    authDomain: "timetable-c8.firebaseapp.com",
    projectId: "timetable-c8",
    storageBucket: "timetable-c8.appspot.com", // Note: fixed storage bucket URL
    messagingSenderId: "58609356223",
    appId: "1:58609356223:web:c7a7f6014324f05605a50a",
    measurementId: "G-DFEDHHHV88"
};

// Complete time format normalization function
function normalizeTimeFormat(timeString) {
  if (!timeString) return '00:00';
  
  // Remove any trailing or leading spaces
  const trimmed = timeString.trim();
  
  // Make sure it's in HH:MM format
  if (trimmed.includes(':')) {
    const [hours, minutes] = trimmed.split(':');
    // Pad with leading zeros if needed
    return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`;
  }
  
  // Try to format numeric input
  if (!isNaN(trimmed)) {
    // If it's just a number, assume it's hours
    const hours = parseInt(trimmed, 10);
    return `${hours.toString().padStart(2, '0')}:00`;
  }
  
  // Return original if we can't normalize
  return timeString;
}

// Replace the broken convertToMinutes function with this fixed version
function convertToMinutes(timeString) {
    if (!timeString) return 0;
    
    const [hours, minutes] = timeString.split(':').map(part => parseInt(part, 10));
    
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
  
    
    // Entry starts at or before this slot and ends after this slot starts
    return entryStartMinutes <= slotStartMinutes && entryEndMinutes > slotStartMinutes;
}

// Improved authentication function in timetable.js
function checkLogin() {
  if (window.location.href.includes('AdminPanel.html')) {
    const loggedIn = sessionStorage.getItem('loggedIn');
    const authToken = sessionStorage.getItem('authToken');
    
    if (loggedIn !== 'true' || !authToken) {
      redirectToLogin();
      return false;
    }
    
    try {
      // Verify token expiration (JWT format)
      const tokenData = JSON.parse(atob(authToken.split('.')[1]));
      if (tokenData.exp < Date.now()/1000) {
        throw new Error("Session expired");
      }
      
      // Set current user display
      const currentUserDisplay = document.getElementById('currentUserDisplay');
      if (currentUserDisplay) {
        currentUserDisplay.textContent = tokenData.sub || 'Admin';
      }
      
      return true;
    } catch (error) {
      handleError(error, "checkLogin", false);
      redirectToLogin();
      return false;
    }
  }
  return true; // Not admin page
}

function redirectToLogin() {
  // Clear all auth data
  sessionStorage.removeItem('loggedIn');
  sessionStorage.removeItem('authToken');
  sessionStorage.removeItem('currentUser');
  
  // Redirect
  window.location.href = 'AdminLogin.html';
}

// Centralized error handler
function handleError(error, context, userFeedback = true) {
  // Log the error with context
  console.error(`Error in ${context}:`, error);
  
  // Prevent multiple alerts 
  if (window._lastErrorTime && (Date.now() - window._lastErrorTime < 2000)) {
    return error; // Skip showing multiple errors in quick succession
  }
  
  // Record last error time
  window._lastErrorTime = Date.now();
  
  // Only show user feedback if requested
  if (userFeedback) {
    let message = "An unexpected error occurred.";
    
    if (error.code === 'permission-denied') {
      message = "You don't have permission to perform this action.";
    } else if (error.code === 'unavailable') {
      message = "Database is currently unavailable. Please check your connection.";
    } else if (error.message) {
      message = error.message;
    }
    
    // Show the error to the user
    if (document.getElementById('errorToast')) {
      // Use existing toast element if available
      const toast = document.getElementById('errorToast');
      toast.textContent = message;
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), 3000);
    } else {
      // Fallback to alert if no toast element
      alert(message);
    }
  }
  
  return error; // Return for optional chaining
}

// Helper to save a suggestion array to Firestore
async function saveSuggestionArray(key, items) {
    try {
        const docRef = doc(db, "suggestions", key);
        await setDoc(docRef, { items });
    } catch (error) {
        handleError(error, "saveSuggestionArray");
    }
}

// Improved getSuggestionArray with better error handling
async function getSuggestionArray(key) {
  // Static cache to prevent repeated Firestore reads
  window._suggestionCache = window._suggestionCache || {};
  
  // Return from cache if available
  if (window._suggestionCache[key]) {
    return window._suggestionCache[key];
  }
  
  try {
    // Wait for Firebase to initialize with timeout
    let attempts = 0;
    while (!window.db && attempts < 10) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
    
    if (!window.db) {
      console.error("Firebase not initialized after waiting");
      return []; // Return empty array instead of throwing
    }
    
    const docRef = doc(window.db, "suggestions", key);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const items = docSnap.data().items || [];
      window._suggestionCache[key] = items; // Cache the results
      return items;
    } else {
      // Initialize with empty array if not found
      await setDoc(docRef, { items: [] });
      window._suggestionCache[key] = []; // Cache empty array
      return [];
    }
  } catch (error) {
    console.error("Error getting suggestion array:", error);
    return []; // Return empty array on error
  }
}

// Data management system for suggestions and autocomplete
const dataManager = {
    keys: {
        teacherNames: 'teacherNames',
        venues: 'venues',
        courseNames: 'courseNames',
        courseCodes: 'courseCodes'
    },

    // Get stored data or initialize empty array
    getData: async function(key) {
        try {
            return await getSuggestionArray(key);
        } catch (error) {
            handleError(error, "getData");
            return [];
        }
    },

    // Save data to Firestore
    saveData: async function(key, data) {
        try {
            await saveSuggestionArray(key, data);
        } catch (error) {
            handleError(error, "saveData");
        }
    },

    // Add new item to a specific data collection
    addItem: async function(key, item) {
        try {
            if (!item) return;
            const items = await getSuggestionArray(key);
            if (!items.includes(item)) {
                items.push(item);
                items.sort();
                await saveSuggestionArray(key, items);
            }
        } catch (error) {
            handleError(error, "addItem");
        }
    },

    // Add multiple items at once
    addItems: async function(key, itemsToAdd) {
        try {
            if (!itemsToAdd || !itemsToAdd.length) return;
            const items = await getSuggestionArray(key);
            let changed = false;
            itemsToAdd.forEach(item => {
                if (item && !items.includes(item)) {
                    items.push(item);
                    changed = true;
                }
            });
            if (changed) {
                items.sort();
                await saveSuggestionArray(key, items);
            }
        } catch (error) {
            handleError(error, "addItems");
        }
    },

    // Get suggestions based on input
    getSuggestions: async function(key, input) {
        try {
            if (!input) return [];
            const items = await getSuggestionArray(key);
            const lowerInput = input.toLowerCase();
            return items.filter(item => item.toLowerCase().includes(lowerInput));
        } catch (error) {
            handleError(error, "getSuggestions");
            return [];
        }
    },

    // Remove an item from a specific data collection
    removeItem: async function(key, item) {
        try {
            if (!item) return false;
            const items = await getSuggestionArray(key);
            const index = items.indexOf(item);
            if (index !== -1) {
                items.splice(index, 1);
                await saveSuggestionArray(key, items);
                return true;
            }
            return false;
        } catch (error) {
            handleError(error, "removeItem");
            return false;
        }
    },

    // Import data from timetable entries
    importFromEntries: async function() {
        try {
            const entries = await getAllTimetableEntries();
            const teachers = [];
            const venues = [];
            const courseNames = [];
            const courseCodes = [];
            
            entries.forEach(entry => {
                if (entry.teacherName && !teachers.includes(entry.teacherName)) teachers.push(entry.teacherName);
                if (entry.venue && !venues.includes(entry.venue)) venues.push(entry.venue);
                if (entry.courseName && !courseNames.includes(entry.courseName)) courseNames.push(entry.courseName);
                if (entry.courseCode && !courseCodes.includes(entry.courseCode)) courseCodes.push(entry.courseCode);
            });
            
            await this.addItems(this.keys.teacherNames, teachers);
            await this.addItems(this.keys.venues, venues);
            await this.addItems(this.keys.courseNames, courseNames);
            await this.addItems(this.keys.courseCodes, courseCodes);
        } catch (error) {
            handleError(error, "importFromEntries");
        }
    }
};

// Add or update the addEntry function
async function addEntry(day, session, courseCode, courseName, creditHours, teacherName, venue, displayTimeSlot, startTime, endTime, isLab) {
    try {
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
        
        // Add to Firestore
        await addTimetableEntry(entry);
        
        return entry;
    } catch (error) {
        handleError(error, "addEntry");
    }
}

// Add this function at an appropriate place in timetable.js
async function addTimetableEntry(entry) {
    if (!entry) {
        throw new Error("Cannot add empty entry");
    }
    
    try {
        if (!window.db) {
            await new Promise(resolve => setTimeout(resolve, 300));
            if (!window.db) {
                throw new Error("Firebase database not initialized");
            }
        }
        
        const docRef = await addDoc(collection(window.db, "timetableEntries"), entry);
        return { success: true, id: docRef.id };
    } catch (error) {
        handleError(error, "addTimetableEntry");
        return { success: false, error: error.message };
    }
}

// Get all timetable entries from Firestore
async function getAllTimetableEntries() {
    try {
        if (!window.db) {
            await new Promise(resolve => setTimeout(resolve, 300));
            if (!window.db) {
                throw new Error("Firebase database not initialized");
            }
        }
        
        const querySnapshot = await getDocs(collection(window.db, "timetableEntries"));
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        handleError(error, "getAllTimetableEntries");
        return [];
    }
}

// Delete a timetable entry by ID
async function deleteTimetableEntry(id) {
    try {
        if (!window.db) {
            await new Promise(resolve => setTimeout(resolve, 300));
            if (!window.db) {
                throw new Error("Firebase database not initialized");
            }
        }
        
        await deleteDoc(doc(window.db, "timetableEntries", id));
        return true;
    } catch (error) {
        handleError(error, "deleteTimetableEntry");
        return false;
    }
}

// Improved deleteAllEntries function with batch processing
async function deleteAllEntries() {
    if (!confirm('Are you sure you want to delete all entries? This cannot be undone!')) {
        return;
    }
    
    const loadingEl = showLoading("Deleting all entries...");
    
    try {
        const entries = await getAllTimetableEntries();
        if (entries.length === 0) {
            alert("No entries to delete.");
            hideLoading();
            return;
        }
        
        // Use Promise.all for parallel deletion instead of sequential
        const deletionPromises = entries.map(entry => {
            return deleteDoc(doc(window.db, "timetableEntries", entry.id))
                .catch(e => console.error(`Failed to delete entry ${entry.id}:`, e));
        });
        
        await Promise.all(deletionPromises);
        console.log(`Successfully deleted ${entries.length} entries`);
        
        // Clear local cache
        window.timetableEntries = [];
        
        // Update UI
        await loadAndDisplayEntries();
        alert(`Successfully deleted ${entries.length} entries`);
        return true;
    } catch (error) {
        console.error("Error in bulk delete:", error);
        alert(`Error deleting entries: ${error.message}`);
        return false;
    } finally {
        hideLoading();
    }
}

// Improved autoUpdateSessionOptions function with better error handling
function autoUpdateSessionOptions() {
    try {
        const sessionDropdown = document.getElementById('session');
        if (!sessionDropdown) {
            console.warn("Session dropdown not found in the DOM yet, will retry");
            // Add a retry mechanism
            setTimeout(() => autoUpdateSessionOptions(), 100);
            return;
        }
        
        // Clear existing options
        while (sessionDropdown.options.length > 0) {
            sessionDropdown.remove(0);
        }
        
        // Add options for years 2021-2024
        const years = ['2021', '2022', '2023', '2024'];
        years.forEach(year => {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            sessionDropdown.appendChild(option);
        });
        
        // Select the first option by default
        if (sessionDropdown.options.length > 0) {
            sessionDropdown.selectedIndex = 0;
        }
    } catch (error) {
        console.error("Error updating session dropdown:", error);
    }
}

// Standalone function to initialize session dropdown 
function initializeSessionDropdown() {
    const sessionDropdown = document.getElementById('session');
    if (!sessionDropdown) {
        console.warn("Session dropdown not found, will try again shortly");
        setTimeout(initializeSessionDropdown, 100); // Retry after 100ms
        return;
    }
    
    console.log("Found session dropdown, initializing options");
    
    // Clear existing options
    while (sessionDropdown.options.length > 0) {
        sessionDropdown.remove(0);
    }
    
    // Add options for years 2021-2024
    const years = ['2024', '2023', '2022', '2021'];
    years.forEach(year => {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        sessionDropdown.appendChild(option);
    });
    
    // Select the first option by default
    if (sessionDropdown.options.length > 0) {
        sessionDropdown.selectedIndex = 0;
    }
}

// Make it available globally
window.initializeSessionDropdown = initializeSessionDropdown;

// Display entries in the admin panel (updated version)
async function displayEntriesInAdmin() {
    const entriesList = document.getElementById('entriesList');
    if (!entriesList) {
        return;
    }

    try {
        // Always reload from Firestore to get the latest data
        timetableEntries = await getAllTimetableEntries();

        entriesList.innerHTML = ''; // Clear existing entries
        
        // Add empty state message if no entries
        if (timetableEntries.length === 0) {
            const emptyRow = document.createElement('tr');
            const emptyCell = document.createElement('td');
            emptyCell.colSpan = 5;
            emptyCell.style.textAlign = 'center';
            emptyCell.style.padding = '30px';
            emptyCell.textContent = 'No timetable entries yet. Add some using the form above.';
            emptyRow.appendChild(emptyCell);
            entriesList.appendChild(emptyRow);
            return;
        }

        // Sort entries by day, session, and time
        timetableEntries.sort((a, b) => {
            const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
            const dayCompare = days.indexOf(a.day) - days.indexOf(b.day);
            if (dayCompare !== 0) return dayCompare;
            
            const sessionCompare = a.session.localeCompare(b.session);
            if (sessionCompare !== 0) return sessionCompare;
            
            return convertToMinutes(a.startTime) - convertToMinutes(a.startTime);
        });
        
        // Create table rows for each entry
        timetableEntries.forEach(entry => {
            const row = document.createElement('tr');
            
            const dayCell = document.createElement('td');
            dayCell.textContent = entry.day;
            
            const sessionCell = document.createElement('td');
            sessionCell.textContent = entry.session;
            
            const courseCell = document.createElement('td');
            courseCell.textContent = entry.isLab ? `${entry.courseCode} (Lab)` : entry.courseCode;
            courseCell.title = entry.courseName;
            
            const timeCell = document.createElement('td');
            timeCell.textContent = `${entry.startTime}-${entry.endTime}`;
            
            const actionsCell = document.createElement('td');
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'btn danger small';
            deleteBtn.textContent = 'Delete';
            deleteBtn.addEventListener('click', async function() {
                try {
                    await deleteTimetableEntry(entry.id);
                    await loadAndDisplayEntries();
                } catch (error) {
                    handleError(error, "displayEntriesInAdmin - deleteBtn");
                }
            });
            actionsCell.appendChild(deleteBtn);
            
            row.appendChild(dayCell);
            row.appendChild(sessionCell);
            row.appendChild(courseCell);
            row.appendChild(timeCell);
            row.appendChild(actionsCell);
            
            entriesList.appendChild(row);
        });
    } catch (error) {
        handleError(error, "displayEntriesInAdmin");
    }
}

// Fixed generatePDF function with better page layout
function generatePDF() {
    try {
        ensureJsPdfLoaded().then(() => {
            const { jsPDF } = window.jspdf;
            if (!jsPDF) {
                alert("PDF generation failed: jsPDF library not loaded properly");
                return;
            }
            
            // Create landscape PDF
            const doc = new jsPDF('l', 'mm', 'a4');
            const pageWidth = doc.internal.pageSize.width;
            const pageHeight = doc.internal.pageSize.height;
            const margin = 14;
            
            // Title section
            doc.setFontSize(16);
            doc.setFont('helvetica', 'bold');
            doc.text('Time Table Fall Semester 2024', pageWidth / 2, 15, { align: 'center' });
            doc.setFontSize(14);
            doc.text('DEPARTMENT OF COMPUTER SCIENCE & INFORMATION TECHNOLOGY', 
                pageWidth / 2, 22, { align: 'center' });
            doc.setFontSize(12);
            doc.text('University of Chakwal', pageWidth / 2, 28, { align: 'center' });
            
            // Get all entries and generate timetable
            const entries = window.timetableEntries || [];
            const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
            const timeSlots = getAllTimeSlots(entries);
            const headers = ['Day', 'Session', ...timeSlots];
            
            // Generate main timetable (all sessions together)
            let currentY = 35; // Starting Y position after the header
            
            // Main timetable
            doc.autoTable({
                head: [headers],
                body: generateMainTableData(entries, days, timeSlots),
                startY: currentY,
                styles: {
                    fontSize: 8,
                    cellPadding: 2
                },
                columnStyles: {
                    0: { cellWidth: 20 },
                    1: { cellWidth: 15 }
                },
                didParseCell: styleTableCells,
                margin: { left: margin, right: margin }
            });
            
            currentY = doc.lastAutoTable.finalY + 15;
            
            // Generate course details tables (one table per session on the same page if possible)
            const uniqueSessions = [...new Set(entries.map(entry => entry.session))].sort();
            uniqueSessions.forEach((session, index) => {
                const sessionEntries = entries.filter(entry => entry.session.toString() === session.toString());
                const sessionYear = parseInt(session);
                const semesterNum = getSemesterNumber(sessionYear);
                
                // Check if we need a new page
                const estimatedTableHeight = 15 + (Object.keys(getUniqueCoursesForSession(sessionEntries)).length * 10);
                if (currentY + estimatedTableHeight > pageHeight - 20) {
                    doc.addPage();
                    currentY = 15;
                }
                
                // Session heading
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(12);
                const sessionTitle = `Session ${session} (${semesterNum} Semester)`;
                doc.text(sessionTitle, margin, currentY);
                
                // Course details table for this session
                const courseData = generateCourseTableData(sessionEntries);
                if (courseData.length > 0) {
                    doc.autoTable({
                        head: [['Course Code', 'Course Name', 'Credit Hrs', 'Teacher Name', 'Venue']],
                        body: courseData,
                        startY: currentY + 5,
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
                        margin: { left: margin, right: margin }
                    });
                    
                    currentY = doc.lastAutoTable.finalY + 10;
                }
            });
            
            // Add page numbers and generation date to all pages
            const totalPages = doc.internal.getNumberOfPages();
            for (let i = 1; i <= totalPages; i++) {
                doc.setPage(i);
                const today = new Date().toLocaleDateString();
                doc.setFontSize(8);
                doc.setTextColor(100);
                doc.text(`Generated on: ${today}`, margin, pageHeight - 10);
                doc.text(`Page ${i} of ${totalPages}`, pageWidth - 25, pageHeight - 10);
            }
            
            doc.save('timetable.pdf');
        }).catch(error => {
            handleError(error, "generatePDF");
        });
    } catch (error) {
        handleError(error, "generatePDF");
    }
}

// Helper function to generate main timetable data
function generateMainTableData(entries, days, timeSlots) {
    const tableData = [];
    days.forEach(day => {
        const dayEntries = entries.filter(entry => entry.day === day);
        if (dayEntries.length === 0) return;
        
        const daySessions = [...new Set(dayEntries.map(entry => entry.session))].sort();
        daySessions.forEach((session, index) => {
            const row = [];
            row.push(index === 0 ? day : '');
            row.push(session);
            
            const sessionEntries = dayEntries.filter(entry => 
                entry.session.toString() === session.toString());
            
            let skipSlots = 0;
            for (let i = 0; i < timeSlots.length; i++) {
                if (skipSlots > 0) {
                    skipSlots--;
                    continue;
                }
                
                const slotParts = timeSlots[i].split('-');
                const slotStart = slotParts[0];
                const slotEnd = slotParts[1];
                
                const entry = findEntryForTimeSlot(sessionEntries, slotStart, slotEnd);
                
                if (entry) {
                    const entryStartMinutes = convertToMinutes(normalizeTimeFormat(entry.startTime));
                    const entryEndMinutes = convertToMinutes(normalizeTimeFormat(entry.endTime));
                    const spanCount = Math.ceil((entryEndMinutes - entryStartMinutes) / 30);
                    const cellContent = entry.isLab ? entry.courseCode + ' Lab' : entry.courseCode;
                    row.push(cellContent);
                    skipSlots = spanCount - 1;
                } else {
                    row.push('');
                }
            }
            tableData.push(row);
        });
    });
    return tableData;
}

// Helper function to get unique courses for a session
function getUniqueCoursesForSession(sessionEntries) {
    const uniqueCourses = {};
    sessionEntries.forEach(entry => {
        if (!uniqueCourses[entry.courseCode]) {
            uniqueCourses[entry.courseCode] = entry;
        }
    });
    return uniqueCourses;
}

// Helper function to generate course table data
function generateCourseTableData(sessionEntries) {
    const uniqueCourses = getUniqueCoursesForSession(sessionEntries);
    return Object.values(uniqueCourses).map(course => [
        course.courseCode,
        course.courseName,
        course.creditHours,
        course.teacherName || '',
        course.venue
    ]);
}

// Helper function to style table cells
function styleTableCells(data) {
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
                if (isLab) {
                    data.cell.styles.fillColor = [255, 243, 205];
                } else {
                    switch(session) {
                        case '2021': data.cell.styles.fillColor = [242, 239, 255]; break;
                        case '2022': data.cell.styles.fillColor = [232, 247, 232]; break;
                        case '2023': data.cell.styles.fillColor = [231, 244, 255]; break;
                        case '2024': data.cell.styles.fillColor = [255, 251, 235]; break;
                        default: data.cell.styles.fillColor = [240, 240, 240];
                    }
                }
            } else {
                switch(session) {
                    case '2021': data.cell.styles.fillColor = [250, 249, 255]; break;
                    case '2022': data.cell.styles.fillColor = [248, 253, 248]; break;
                    case '2023': data.cell.styles.fillColor = [247, 251, 255]; break;
                    case '2024': data.cell.styles.fillColor = [255, 254, 250]; break;
                    default: data.cell.styles.fillColor = [255, 255, 255];
                }
            }
        }
    } else if (data.section === 'head') {
        data.cell.styles.fillColor = [73, 124, 15];
        data.cell.styles.textColor = [255, 255, 255];
        data.cell.styles.fontStyle = 'bold';
    }
}

// Helper function to determine semester number based on session year
function getSemesterNumber(sessionYear) {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();
    const isFall = currentMonth >= 6 && currentMonth <= 11;
    
    if (isFall) {
        const yearDiff = currentYear - sessionYear;
        if (yearDiff === 0) return "1st";
        else if (yearDiff === 1) return "3rd";
        else if (yearDiff === 2) return "5th";
        else if (yearDiff === 3) return "7th";
        else return "";
    } else {
        const yearDiff = (currentYear-1) - sessionYear;
        if (yearDiff === 0) return "2nd";
        else if (yearDiff === 1) return "4th";
        else if (yearDiff === 2) return "6th";
        else if (yearDiff === 3) return "8th";
        else return "";
    }
}

// Comment out this entire section to avoid conflicts
/*
document.getElementById('loginForm')?.addEventListener('submit', function(e) {
    e.preventDefault();
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();
    // ... rest of the login handler code
});
*/

// Main application initialization function
function initializeApplication() {
  // Don't show loading indicator on DisplayTimetable page
  let loadingElement = null;
  if (window.location.href.includes('AdminPanel.html')) {
    loadingElement = showLoading("Loading application...");
  }
  
  try {
    // Check login status first
    checkLogin();
    
    // Run initialization in proper sequence with delays
    setTimeout(() => {
      if (window.location.href.includes('AdminPanel.html')) {
        // Make sure DOM is fully loaded before manipulating it
        document.addEventListener('DOMContentLoaded', function() {
          // Admin panel specific initialization
          autoUpdateSessionOptions();
          setupEventHandlers();
        });
        
        // If DOMContentLoaded has already fired, run immediately
        if (document.readyState === 'complete' || document.readyState === 'interactive') {
          autoUpdateSessionOptions();
          setupEventHandlers();
        }
        
        // Delay data operations to ensure Firebase is ready
        setTimeout(() => {
          loadAndDisplayEntries()
            .then(() => dataManager.importFromEntries())
            .then(() => populateDataLists())
            .then(() => setupDataListHandlers())
            .then(() => {
              // Remove loading indicator when done
              if (loadingElement) hideLoading();
            })
            .catch(error => {
              handleError(error, "initializeApplication", false);
              if (loadingElement) hideLoading();
            });
        }, 500);
      } else {
        // Just load entries for display timetable
        loadAndDisplayEntries();
      }
    }, 300);

    // Initialize time range inputs with stored values
    const timetableStartTime = document.getElementById('timetableStartTime');
    const timetableEndTime = document.getElementById('timetableEndTime');
    if (timetableStartTime && timetableEndTime) {
        timetableStartTime.value = localStorage.getItem('timetableStartTime') || '08:00';
        timetableEndTime.value = localStorage.getItem('timetableEndTime') || '13:00';
    }
  } catch (error) {
    handleError(error, "initializeApplication", false);
    if (loadingElement) hideLoading();
  }
}

// Clean up DOMContentLoaded listener - single initialization point
document.addEventListener('DOMContentLoaded', function() {
  if (document.readyState === 'loading') {
    setTimeout(initializeApplication, 100);
  } else {
    initializeApplication();
  }
});

// Make sure this is properly waiting for the DOM to be ready
document.addEventListener('DOMContentLoaded', function() {
  autoUpdateSessionOptions();
});

// Create a separate function for event handlers
function setupEventHandlers() {
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', handleLogout);
  }
  
  const generatePdfBtn = document.getElementById('generatePdf');
  if (generatePdfBtn) {
    generatePdfBtn.addEventListener('click', handleGeneratePdf);
  }
  
  const viewStoredDataBtn = document.getElementById('viewStoredData');
  if (viewStoredDataBtn) {
    viewStoredDataBtn.addEventListener('click', displayStoredData);
  }
  
  const clearAllEntriesBtn = document.getElementById('clearAllEntries');
  if (clearAllEntriesBtn) {
    clearAllEntriesBtn.addEventListener('click', deleteAllEntries);
  }
  
  const timetableForm = document.getElementById('timetableForm');
  if (timetableForm) {
    timetableForm.addEventListener('submit', handleFormSubmit);
  }

  const updateTimeRangeBtn = document.getElementById('updateTimeRange');
  if (updateTimeRangeBtn) {
    updateTimeRangeBtn.addEventListener('click', function() {
        const startTime = document.getElementById('timetableStartTime').value;
        const endTime = document.getElementById('timetableEndTime').value;
        
        // Validate that end time is after start time
        if (convertToMinutes(startTime) >= convertToMinutes(endTime)) {
            alert('End time must be after start time');
            return;
        }
        
        // Save to localStorage for persistence
        localStorage.setItem('timetableStartTime', startTime);
        localStorage.setItem('timetableEndTime', endTime);
        
        // Refresh the display
        loadAndDisplayEntries();
        
        alert('Time range updated successfully!');
    });
  }
}

// Handle logout with better cleanup
function handleLogout() {
  // Clear all session data
  sessionStorage.removeItem('authToken');
  sessionStorage.removeItem('loggedIn');
  sessionStorage.removeItem('currentUser');
  sessionStorage.removeItem('userRole');
  
  // Redirect to login page
  window.location.href = 'AdminLogin.html';
}

// Updated handleGeneratePdf function with proper data loading
async function handleGeneratePdf() {
  try {
    console.log("Starting PDF generation process");
    
    // Make sure we have the latest data first
    await loadAndDisplayEntries(); 
    
    // Wait a moment for data to load and process
    setTimeout(() => {
      // Force refresh entries from Firestore
      getAllTimetableEntries().then(entries => {
        console.log(`Retrieved ${entries.length} entries for PDF`);
        
        // Store entries globally for the PDF function to use
        window.timetableEntries = entries;
        
        if (entries.length === 0) {
          alert("No entries found to generate PDF. Please add some entries first.");
          return;
        }
        
        // Now generate the PDF with the fresh data
        generatePDF();
      }).catch(error => {
        console.error("Error fetching entries for PDF:", error);
        alert("Failed to fetch entries for PDF generation");
      });
    }, 500);
  } catch (error) {
    console.error("PDF generation error:", error);
    alert("PDF generation failed: " + error.message);
  }
}

// Handle form submission
async function handleFormSubmit(e) {
  e.preventDefault();
  
  try {
    // Get form values
    const courseCode = document.getElementById('courseCode').value.trim();
    const courseName = document.getElementById('courseName').value.trim();
    const creditHours = document.getElementById('creditHours').value.trim();
    const venue = document.getElementById('venue').value.trim();
    const teacherName = document.getElementById('teacherName').value.trim();
    const session = document.getElementById('session').value;
    const startTime = document.getElementById('startTime').value;
    const endTime = document.getElementById('endTime').value;
    const isLab = document.getElementById('isLab').checked;
    
    // Get selected days
    const selectedDays = [];
    document.querySelectorAll('input[name="day"]:checked').forEach(checkbox => {
      selectedDays.push(checkbox.value);
    });
    
    // Basic validation
    if (!courseCode || !courseName || !venue || !startTime || !endTime || selectedDays.length === 0) {
      alert('Please fill all required fields and select at least one day');
      return;
    }
    
    if (new Date(`2000-01-01T${startTime}`) >= new Date(`2000-01-01T${endTime}`)) {
      alert('End time must be after start time');
      return;
    }
    
    // Add entries for each selected day
    let count = 0;
    let errors = [];
    
    for (const day of selectedDays) {
      const entry = {
        day,
        session,
        courseCode,
        courseName,
        creditHours,
        teacherName,
        venue,
        startTime,
        endTime,
        isLab
      };
      
      const result = await addTimetableEntry(entry);
      if (result.success) {
        count++;
      } else {
        errors.push(`Failed to add entry for ${day}: ${result.error}`);
      }
    }
    
    if (errors.length > 0) {
      alert(`Added ${count} entries, but encountered ${errors.length} errors:\n${errors.join('\n')}`);
    } else {
      alert(`Added ${count} entries successfully!`);
    }
    
    this.reset();
    await loadAndDisplayEntries();
  } catch (error) {
    handleError(error, "handleFormSubmit");
  }
}

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
    try {
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
    } catch (error) {
        handleError(error, "displayStoredData");
    }
}

// Populate the data lists in the admin panel
function populateDataLists() {
    populateListView('teacherNamesListView', dataManager.keys.teacherNames);
    populateListView('venuesListView', dataManager.keys.venues);
    populateListView('courseNamesListView', dataManager.keys.courseNames);
    populateListView('courseCodesListView', dataManager.keys.courseCodes);
}

// Replace the old function with this async version:
async function populateListView(elementId, dataKey) {
    try {
        const listContainer = document.getElementById(elementId);
        if (!listContainer) return;
        const items = await dataManager.getData(dataKey);
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
            deleteBtn.addEventListener('click', async () => {
                try {
                    await dataManager.removeItem(dataKey, item);
                    await populateListView(elementId, dataKey);
                } catch (error) {
                    handleError(error, "populateListView - deleteBtn");
                }
            });
            actions.appendChild(deleteBtn);
            listItem.appendChild(itemText);
            listItem.appendChild(actions);
            listContainer.appendChild(listItem);
        });
    } catch (error) {
        handleError(error, "populateListView");
    }
}

// Delete an item from a data list
function deleteListItem(dataKey, item) {
    try {
        if (confirm(`Are you sure you want to delete "${item}"?`)) {
            const data = dataManager.getData(dataKey);
            const updatedData = data.filter(dataItem => dataItem !== item);
            dataManager.saveData(dataKey, updatedData);
        }
    } catch (error) {
        handleError(error, "deleteListItem");
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
        try {
            const input = document.getElementById(inputId);
            const value = input.value.trim();
            if (value) {
                dataManager.addItem(dataKey, value);
                populateListView(listElementId, dataKey);
                input.value = '';
            }
        } catch (error) {
            handleError(error, "setupAddItemHandler");
        }
    });
}

// Setup autocomplete for input fields
async function setupAutocomplete(inputElement, listId, dataKey) {
    try {
        if (!inputElement) return;
        let datalist = document.getElementById(listId);
        if (!datalist) {
            datalist = document.createElement('datalist');
            datalist.id = listId;
            document.body.appendChild(datalist);
        }
        inputElement.setAttribute('list', listId);
        const items = await dataManager.getData(dataKey);
        datalist.innerHTML = '';
        items.forEach(item => {
            const option = document.createElement('option');
            option.value = item;
            datalist.appendChild(option);
        });
    } catch (error) {
        handleError(error, "setupAutocomplete");
    }
}

// Define hardcoded time slots from 8:00am to 1:00pm with half hour intervals in 12-hour format
function getHardcodedTimeSlots() {
    const slots = [];
    for (let hour = 8; hour < 13; hour++) {
        const formattedHour = hour.toString().padStart(2, '0');
        slots.push(`${formattedHour}:00-${formattedHour}:30`);
        if (hour === 12) {
            slots.push(`${formattedHour}:30-13:00`);
        } else {
            const nextHour = (hour + 1).toString().padStart(2, '0');
            slots.push(`${formattedHour}:30-${nextHour}:00`);
        }
    }
    return slots;
}

// Generate dynamic time slots with configurable start and end times
function getDynamicTimeSlots(startTime = "08:00", endTime = "13:00") {
    const slots = [];
    
    // Validate and normalize input times
    startTime = normalizeTimeFormat(startTime);
    endTime = normalizeTimeFormat(endTime);
    
    // Convert to minutes for easier calculation
    let currentMinutes = convertToMinutes(startTime);
    const endMinutes = convertToMinutes(endTime);
    
    // Generate slots in 30 minute increments
    while (currentMinutes < endMinutes) {
        // Format current time
        const currentHour = Math.floor(currentMinutes / 60);
        const currentMin = currentMinutes % 60;
        const currentTimeStr = `${currentHour.toString().padStart(2, '0')}:${currentMin.toString().padStart(2, '0')}`;
        
        // Calculate next slot time (30 minutes later)
        let nextMinutes = currentMinutes + 30;
        if (nextMinutes > endMinutes) {
            nextMinutes = endMinutes; // Ensure we don't go past the end time
        }
        
        const nextHour = Math.floor(nextMinutes / 60);
        const nextMin = nextMinutes % 60;
        const nextTimeStr = `${nextHour.toString().padStart(2, '0')}:${nextMin.toString().padStart(2, '0')}`;
        
        // Add the slot
        slots.push(`${currentTimeStr}-${nextTimeStr}`);
        
        // Move to next 30-minute mark
        currentMinutes = nextMinutes;
    }
    
    return slots;
}

// Update renderTimetable function to add session data attributes and time-slot-end class
function renderTimetable(entries) {
    const tableBody = document.getElementById('timetableBody');
    const table = document.getElementById('timetableDisplay');
    if (!tableBody || !table) return;

    // Clear previous content
    tableBody.innerHTML = '';
    
    // Reset and prepare header
    const thead = table.querySelector('thead');
    if (thead) {
        const headerRow = thead.querySelector('tr');
        // Keep only Day and Session columns
        while (headerRow.children.length > 2) {
            headerRow.removeChild(headerRow.lastChild);
        }
    }

    if (!entries || entries.length === 0) {
        renderEmptyTimetableGrid();
        return;
    }
    
    // Use dynamic time slots
    const startTime = localStorage.getItem('timetableStartTime') || '08:00';
    const endTime = localStorage.getItem('timetableEndTime') || '13:00';
    const timeSlots = getDynamicTimeSlots(startTime, endTime);
    
    // Add time slots to header without AM/PM format
    if (thead && timeSlots.length > 0) {
        const headerRow = thead.querySelector('tr');
        timeSlots.forEach(slot => {
            const th = document.createElement('th');
            
            // Convert the slot to 12-hour format display
            const [start, end] = slot.split('-');
            const startHour = parseInt(start.split(':')[0]);
            const endHour = parseInt(end.split(':')[0]);
            
            // Format for 12-hour display without AM/PM
            let displayStart = startHour > 12 ? (startHour - 12) : startHour;
            let displayEnd = endHour > 12 ? (endHour - 12) : endHour;
            
            // Add minutes part
            const startMinutes = start.split(':')[1];
            const endMinutes = end.split(':')[1];
            
            // No AM/PM as requested
            th.textContent = `${displayStart}:${startMinutes}-${displayEnd}:${endMinutes}`;
            headerRow.appendChild(th);
        });
    }

    // Create table rows for each day - ALWAYS show all days and all sessions
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const allSessions = ['2021', '2022', '2023', '2024']; // Show all four sessions
    
    days.forEach(day => {
        // Filter entries for this day
        const dayEntries = entries.filter(entry => entry.day === day);
        
        // For each session - always show ALL sessions
        allSessions.forEach((session, sessionIndex) => {
            const row = document.createElement('tr');
            
            // Add day cell for first session of each day
            if (sessionIndex === 0) {
                const dayCell = document.createElement('td');
                dayCell.className = 'day-cell';
                dayCell.textContent = day;
                dayCell.rowSpan = allSessions.length;
                
                // ADD EXPLICIT STYLE OVERRIDES
                dayCell.style.display = "table-cell";
                dayCell.style.color = "#fff";
                dayCell.style.fontWeight = "bold";
                dayCell.style.background = "#388e3c";
                
                row.appendChild(dayCell);
            }
            
            // Add session cell
            const sessionCell = document.createElement('td');
            sessionCell.className = 'session-cell';
            sessionCell.textContent = session;
            row.appendChild(sessionCell);
            
            // Filter entries for this session
            const sessionEntries = dayEntries.filter(entry => entry.session === session);
            
            // Process each time slot to handle spanning cells
            let skipCells = 0;
            
            for (let slotIndex = 0; slotIndex < timeSlots.length; slotIndex++) {
                if (skipCells > 0) {
                    skipCells--;
                    continue; // Skip this cell as it's covered by a previous colspan
                }
                
                const timeSlot = timeSlots[slotIndex];
                const [slotStart, slotEnd] = timeSlot.split('-');
                
                // Find an entry that starts at this slot
                const entry = findEntryForTimeSlot(sessionEntries, slotStart, slotEnd);
                
                if (entry) {
                    // Calculate how many slots this entry spans
                    const entryStartMins = convertToMinutes(normalizeTimeFormat(entry.startTime));
                    const entryEndMins = convertToMinutes(normalizeTimeFormat(entry.endTime));
                    
                    // Calculate how many half-hour slots this covers
                    const slotSpan = Math.max(1, Math.ceil((entryEndMins - entryStartMins) / 30));
                    
                    // Create the cell
                    const cell = document.createElement('td');
                    cell.className = 'course-cell';
                    if (entry.isLab) cell.classList.add('lab-course');
                    
                    // Set colspan if needed
                    if (slotSpan > 1 && slotIndex + slotSpan <= timeSlots.length) {
                        cell.colSpan = slotSpan;
                        skipCells = slotSpan - 1; // Skip the next cells
                    }
                    
                    cell.innerHTML = `<div style="font-weight:bold;">${entry.isLab ? entry.courseCode + ' Lab' : entry.courseCode}</div>`;
                    cell.title = `${entry.courseName}\nTime: ${entry.startTime}-${entry.endTime}\nCredit Hours: ${entry.creditHours}\nTeacher: ${entry.teacherName || 'N/A'}\nVenue: ${entry.venue || 'N/A'}`;
                    
                    // Add time-slot-end class to last cell or when a course ends
                    if (slotIndex < timeSlots.length - 1) {
                        const nextSlot = timeSlots[slotIndex + 1];
                        const [_, slotEnd] = timeSlot.split('-');
                        const [nextStart, __] = nextSlot.split('-');
                        
                        // If this entry ends at this slot
                        if (normalizeTimeFormat(entry.endTime) === slotEnd) {
                            cell.classList.add('time-slot-end');
                        }
                    }
                    
                    // If it's the last slot in the row
                    if (slotIndex === timeSlots.length - 1) {
                        cell.classList.add('time-slot-end');
                    }
                    
                    row.appendChild(cell);
                } else {
                    // Check if there's an entry that spans this slot
                    const spanningEntry = sessionEntries.find(e => {
                        const entryStartMins = convertToMinutes(normalizeTimeFormat(e.startTime));
                        const entryEndMins = convertToMinutes(normalizeTimeFormat(e.endTime));
                        const slotStartMins = convertToMinutes(normalizeTimeFormat(slotStart));
                        const slotEndMins = convertToMinutes(normalizeTimeFormat(slotEnd));
                        
                        // Entry starts before this slot and ends after slot starts
                        return entryStartMins < slotStartMins && entryEndMins > slotStartMins;
                    });
                    
                    if (spanningEntry) {
                        // This slot is covered by a spanning entry that started earlier
                        // We already handled it with colspan, so skip
                        continue;
                    }
                    
                    // Empty cell - no entry for this time slot
                    const cell = document.createElement('td');
                    row.appendChild(cell);
                }
            }
            
            tableBody.appendChild(row);
        });
    });
}

// Helper function to determine if an entry fits within a time slot
function doesEntryFitTimeSlot(entry, slotStart, slotEnd) {
    const entryStartMins = convertToMinutes(normalizeTimeFormat(entry.startTime));
    const entryEndMins = convertToMinutes(normalizeTimeFormat(entry.endTime));
    const slotStartMins = convertToMinutes(normalizeTimeFormat(slotStart));
    const slotEndMins = convertToMinutes(normalizeTimeFormat(slotEnd));
    
    // Entry starts at or before slot start and ends at or after slot end
    return entryStartMins <= slotStartMins && entryEndMins >= slotEndMins;
}

// Also update the getAllTimeSlots function to use hardcoded slots for PDF generation
function getAllTimeSlots(entries) {
    const startTime = localStorage.getItem('timetableStartTime') || '08:00';
    const endTime = localStorage.getItem('timetableEndTime') || '13:00';
    return getDynamicTimeSlots(startTime, endTime);
}

function renderHardcodedGrid(showSaturday = false, showSunday = false) {
    const tableBody = document.getElementById('timetableBody');
    const table = document.getElementById('timetableDisplay');
    if (!tableBody || !table) return;

    // Clear previous content
    tableBody.innerHTML = '';

    // Define days and sessions
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const sessions = ['2021', '2022', '2023', '2024'];

    // Filter days based on checkbox options
    const filteredDays = days.filter(day => {
        if (day === 'Saturday' && !showSaturday) return false;
        if (day === 'Sunday' && !showSunday) return false;
        return true;
    });

    // Create table rows for each day and session
    filteredDays.forEach((day, dayIdx) => {
        sessions.forEach((session, sessionIdx) => {
            const row = document.createElement('tr');
            
            // Add day cell only for the first session of each day
            if (sessionIdx === 0) {
                const dayCell = document.createElement('td');
                dayCell.className = 'day-cell';
                dayCell.textContent = day; // This sets the day name
                dayCell.rowSpan = sessions.length;
                dayCell.style.display = "table-cell"; // Force visibility
                dayCell.style.color = "#fff"; // Ensure text is visible
                dayCell.style.fontWeight = "bold";
                dayCell.style.background = "#388e3c";
                row.appendChild(dayCell);
            }
            
            // Add session cell
            const sessionCell = document.createElement('td');
            sessionCell.className = 'session-cell';
            sessionCell.textContent = session;
            row.appendChild(sessionCell);
            
            // Add empty slots with random distribution
            const slotCount = Math.floor(Math.random() * 5) + 4; // 4-8 slots
            for (let i = 0; i < slotCount; i++) {
                const cell = document.createElement('td');
                cell.innerHTML = '&nbsp;';
                row.appendChild(cell);
            }
            
            // Fill remaining slots
            for (let i = slotCount; i < 8; i++) {
                const cell = document.createElement('td');
                cell.style.background = "#f4f4f4";
                row.appendChild(cell);
            }
            
            tableBody.appendChild(row);
        });
    });
}

function renderEmptyTimetableGrid() {
    const tableBody = document.getElementById('timetableBody');
   const table = document.getElementById('timetableDisplay');
    if (!tableBody || !table) return;
    
    tableBody.innerHTML = '';

    // Get dynamic time slots
    const startTime = localStorage.getItem('timetableStartTime') || '08:00';
    const endTime = localStorage.getItem('timetableEndTime') || '13:00';
    const timeSlots = getDynamicTimeSlots(startTime, endTime);
    
    // Add time slots to header without AM/PM format
    const thead = table.querySelector('thead');
    if (thead) {
        const headerRow = thead.querySelector('tr');
        // Keep only Day and Session columns
        while (headerRow.children.length > 2) {
            headerRow.removeChild(headerRow.lastChild);
        }
        
        // Add the time slots to header
        timeSlots.forEach(slot => {
            const th = document.createElement('th');
            
            // Convert the slot to 12-hour format display
            const [start, end] = slot.split('-');
            const startHour = parseInt(start.split(':')[0]);
            const endHour = parseInt(end.split(':')[0]);
            
            // Format for 12-hour display without AM/PM
            let displayStart = startHour > 12 ? (startHour - 12) : startHour;
            let displayEnd = endHour > 12 ? (endHour - 12) : endHour;
            
            // Add minutes part
            const startMinutes = start.split(':')[1];
            const endMinutes = end.split(':')[1];
            
            // No AM/PM as requested
            th.textContent = `${displayStart}:${startMinutes}-${displayEnd}:${endMinutes}`;
            headerRow.appendChild(th);
        });
    }

    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const sessions = ['2024', '2023', '2022', '2021'];

    days.forEach((day, dayIdx) => {
        sessions.forEach((session, sessionIdx) => {
            const row = document.createElement('tr');
            if (sessionIdx === 0 && dayIdx > 0) {
                row.style.borderTop = '4px solid #7cb342';
            }
            
            // Add day cell
            if (sessionIdx === 0) {
                const dayCell = document.createElement('td');
                dayCell.className = 'day-cell';
                dayCell.textContent = day;
                dayCell.rowSpan = sessions.length;
                dayCell.style.display = "table-cell"; // Force visibility
                dayCell.style.color = "#fff"; // Ensure text is visible
                dayCell.style.fontWeight = "bold";
                dayCell.style.background = "#388e3c";
                row.appendChild(dayCell);
            }
            
            // Add session cell
            const sessionCell = document.createElement('td');
            sessionCell.className = 'session-cell';
            sessionCell.textContent = session;
            row.appendChild(sessionCell);
            
            // Add empty cells for each time slot
            timeSlots.forEach(() => {
                const cell = document.createElement('td');
                cell.innerHTML = '&nbsp;';
                row.appendChild(cell);
            });
            
            tableBody.appendChild(row);
        });
    });
}

// 1. On page load, call loadAndDisplayEntries
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        loadAndDisplayEntries();
    }, 100);
});

// 3. When deleting an entry (e.g., in your delete button handler)
async function handleDeleteEntry(id) {
    try {
        await deleteTimetableEntry(id);
        await loadAndDisplayEntries();
    } catch (error) {
        handleError(error, "handleDeleteEntry");
    }
}

// Add this function to scripts/timetable.js
async function ensureJsPdfLoaded() {
  // Check if jsPDF is available
  if (typeof window.jspdf === 'undefined' || !window.jspdf.jsPDF) {
    // Check for globally available jsPDF (from CDN)
    if (typeof jsPDF !== 'undefined') {
      window.jspdf = { jsPDF };
    } else {
      throw new Error("jsPDF library is not loaded. Please check your internet connection.");
    }
  }
  return window.jspdf.jsPDF;
}

// Add this function to scripts/timetable.js
async function loadAndDisplayEntries() {
  const loadingEl = showLoading("Loading entries...");
  try {
    const entries = await getAllTimetableEntries();
    timetableEntries = entries;
    window.timetableEntries = entries;
    
    // Only run these on admin panel
    if (window.location.href.includes('AdminPanel.html')) {
      displayEntriesInAdmin();
      if (typeof updateStats === 'function') {
        updateStats();
      }
    } else {
      // For DisplayTimetable, just render the timetable
      if (typeof renderTimetable === 'function') {
        renderTimetable(entries);
      }
    }
  } catch (error) {
    handleError(error, "loadAndDisplayEntries", window.location.href.includes('AdminPanel.html'));
  } finally {
    hideLoading();
  }
}

// Show loading spinner
function showLoading(message = "Loading...") {
  const existingSpinner = document.getElementById('app-loading');
  if (existingSpinner) return existingSpinner;
  
  const loadingElement = document.createElement('div');
  loadingElement.id = 'app-loading';
  loadingElement.innerHTML = `
    <div class="spinner"></div>
    <p>${message}</p>
  `;
  loadingElement.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(255,255,255,0.8);display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:9999;';
  document.body.appendChild(loadingElement);
  return loadingElement;
}

// Hide loading spinner
function hideLoading() {
  const loadingElement = document.getElementById('app-loading');
  if (loadingElement && document.body.contains(loadingElement)) {
    document.body.removeChild(loadingElement);
  }
}

// Add this function to update the statistics in the admin panel
function updateStats() {
  try {
    const totalEntriesEl = document.getElementById('totalEntries');
    const activeSessionsEl = document.getElementById('activeSessions');
    const totalCoursesEl = document.getElementById('totalCourses');
    const totalTeachersEl = document.getElementById('totalTeachers');
    
    if (!window.timetableEntries) return;
    
    if (totalEntriesEl) 
      totalEntriesEl.textContent = window.timetableEntries.length;
    
    if (activeSessionsEl) {
      const uniqueSessions = [...new Set(window.timetableEntries.map(entry => entry.session))].length;
      activeSessionsEl.textContent = uniqueSessions || 0;
    }
    
    if (totalCoursesEl) {
      const uniqueCourses = [...new Set(window.timetableEntries.map(entry => entry.courseCode))].length;
      totalCoursesEl.textContent = uniqueCourses || 0;
    }
    
    if (totalTeachersEl) {
      const uniqueTeachers = [...new Set(window.timetableEntries
        .filter(entry => entry.teacherName)
        .map(entry => entry.teacherName))].length;
      totalTeachersEl.textContent = uniqueTeachers || 0;
    }
  } catch (error) {
    handleError(error, "updateStats", false); // Don't show alerts for this function
  }
}

// Helper function to ensure all required collections exist in Firestore
async function ensureCollectionsExist() {
  try {
    // Wait for Firebase to fully initialize with proper checks
    for (let i = 0; i < 20; i++) {
      if (window.db) break;
      console.log(`Waiting for Firebase (attempt ${i+1}/20)...`);
      await new Promise(resolve => setTimeout(resolve, 250));
    }
    
    if (!window.db) {
      throw new Error("Firebase database not initialized after multiple attempts");
    }
    
    console.log("Firebase initialized, ensuring collections exist...");
    
    // Check for timetableEntries collection
    try {
      const snapshot = await getDocs(collection(window.db, "timetableEntries"));
      console.log(`timetableEntries collection exists with ${snapshot.docs.length} documents`);
    } catch (error) {
      // Create collection with placeholder document if needed
      await addDoc(collection(window.db, "timetableEntries"), { 
        placeholder: true,
        createdAt: new Date().toISOString()
      });
      console.log("Created timetableEntries collection with placeholder");
    }
    
    // Ensure suggestions collection exists
    const suggestionCollections = ['teacherNames', 'venues', 'courseNames', 'courseCodes'];
    
    for (const collName of suggestionCollections) {
      try {
        const docRef = doc(window.db, "suggestions", collName);
        const docSnap = await getDoc(docRef);
        
        if (!docSnap.exists()) {
          await setDoc(docRef, { items: [] });
          console.log(`Created suggestions/${collName} document`);
        } else {
          console.log(`Verified suggestions/${collName} exists`);
        }
      } catch (error) {
        await setDoc(doc(window.db, "suggestions", collName), { items: [] });
        console.log(`Created suggestions/${collName} after error`);
      }
    }
    
    console.log("All collections verified successfully");
    return true;
  } catch (error) {
    console.error("Error ensuring collections exist:", error);
    throw error;
  }
}

// Make it available globally
window.ensureCollectionsExist = ensureCollectionsExist;

// At the END of your timetable.js file, add this line - it must be OUTSIDE any function
window.setupFirebase = setupFirebase;

// Also add this to limit Firebase initialization error messages
let _lastFirebaseError = 0;
function handleFirebaseError(error) {
  if (Date.now() - _lastFirebaseError < 10000) {
    console.error("Suppressing duplicate Firebase error:", error);
    return;
  }
  _lastFirebaseError = Date.now();
  console.error("Firebase error:", error);
  alert("Firebase database not initialized. Please check your connection and try again.");
}

// Helper function to correctly match entries to time slots for PDF
function findEntryForTimeSlot(entries, slotStart, slotEnd) {
  // First try exact match
  let entry = entries.find(e => 
    normalizeTimeFormat(e.startTime) === slotStart && 
    normalizeTimeFormat(e.endTime) === slotEnd
  );
  
  // If exact match fails, try to find an overlapping entry
  if (!entry) {
    const slotStartMinutes = convertToMinutes(slotStart);
    const slotEndMinutes = convertToMinutes(slotEnd);
    
    entry = entries.find(e => {
      const entryStartMinutes = convertToMinutes(normalizeTimeFormat(e.startTime));
      const entryEndMinutes = convertToMinutes(normalizeTimeFormat(e.endTime));
      
      // Entry overlaps with slot
      return (entryStartMinutes < slotEndMinutes && entryEndMinutes > slotStartMinutes);
    });
  }
  
  return entry;
}
