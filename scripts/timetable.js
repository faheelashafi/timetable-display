// At the top of the file - define these variables but don't initialize them yet
let initializeApp, getFirestore, collection, getDocs, addDoc, setDoc, doc, 
    deleteDoc, getDoc, updateDoc, arrayUnion, arrayRemove, onSnapshot;

// Firebase initialization function that will be called from HTML with imports
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
    onSnapshot = imports.onSnapshot;
    
    // Initialize Firebase ONCE with console logging
    console.log("Initializing Firebase app...");
    const app = initializeApp(firebaseConfig);
    console.log("Firebase app initialized, setting up Firestore...");
    window.db = getFirestore(app);
    console.log("Firestore initialized, db object created");
    window.firebaseInitialized = true;
    
    // Rest of your function...
    return window.db;
  } catch (error) {
    console.error("Firebase initialization failed:", error);
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

// Add this function at the beginning of your timetable.js file 
function initializeApplication() {
  // Prevent multiple initializations
  if (window._appInitialized) {
    console.log("Application already initialized, skipping");
    return;
  }
  
  // Don't show loading indicator on DisplayTimetable page
  let loadingElement = null;
  if (window.location.href.includes('AdminPanel.html')) {
    loadingElement = showLoading("Loading application...");
  }
  
  window._appInitialized = true; // Set the flag
  
  // Check login status for admin pages
  if (!checkLogin()) return;
  
  try {
    // Initialize time range inputs with stored values
    const timetableStartTime = document.getElementById('timetableStartTime');
    const timetableEndTime = document.getElementById('timetableEndTime');
    if (timetableStartTime && timetableEndTime) {
      timetableStartTime.value = localStorage.getItem('timetableStartTime') || '08:00';
      timetableEndTime.value = localStorage.getItem('timetableEndTime') || '17:00'; 
    }
    
    // Load entries and display them
    loadAndDisplayEntries();
    
    // Initialize dropdown menus
    if (typeof initializeSessionDropdown === 'function') {
      initializeSessionDropdown();
    }
    
    // Initialize autocomplete
    const autocompleteInputs = document.querySelectorAll('[data-autocomplete]');
    autocompleteInputs.forEach(input => {
      const field = input.dataset.autocomplete;
      if (!field) return;
      
      // Implementation of autocomplete setup here
    });
    
  } catch (error) {
    console.error("Error in initializeApplication:", error);
    handleError(error, "initializeApplication");
  } finally {
    if (loadingElement) hideLoading();
  }
}

// Add handleLogout function
function handleLogout() {
  if (confirm('Are you sure you want to logout?')) {
    console.log("User logged out");
    sessionStorage.removeItem('loggedIn');
    sessionStorage.removeItem('authToken');
    sessionStorage.removeItem('currentUser');
    window.location.href = 'AdminLogin.html';
  }
}

// Improved PDF generation function with department selection

function handleGeneratePdf() {
  const loadingEl = showLoading("Preparing PDF options...");
  
  try {
    // Create a department selection dialog
    const dialog = document.createElement('div');
    dialog.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);display:flex;justify-content:center;align-items:center;z-index:10000;';
    
    const dialogContent = document.createElement('div');
    dialogContent.style.cssText = 'background:white;padding:20px;border-radius:8px;width:400px;max-width:90%;box-shadow:0 4px 20px rgba(0,0,0,0.2);';
    dialogContent.innerHTML = `
      <h3 style="margin-top:0;color:#4285f4;border-bottom:1px solid #eee;padding-bottom:10px;">Generate Timetable PDF</h3>
      <p>Select department to generate PDF:</p>
      <select id="pdfDeptSelect" style="width:100%;padding:10px;margin-bottom:20px;border:1px solid #ddd;border-radius:4px;">
        <option value="all">All Departments</option>
        <option value="cs">Computer Science & IT</option>
        <option value="eng">Engineering</option>
        <option value="pharm">Pharmacy & HND</option>
      </select>
      <div style="display:flex;justify-content:flex-end;gap:10px;">
        <button id="cancelPdfBtn" style="padding:8px 16px;background:#f5f5f5;border:none;border-radius:4px;cursor:pointer;">Cancel</button>
        <button id="generatePdfBtn" style="padding:8px 16px;background:#4285f4;color:white;border:none;border-radius:4px;cursor:pointer;">Generate PDF</button>
      </div>
    `;
    
    dialog.appendChild(dialogContent);
    document.body.appendChild(dialog);
    
    // Handle dialog buttons
    document.getElementById('cancelPdfBtn').addEventListener('click', () => {
      document.body.removeChild(dialog);
      hideLoading();
    });
    
    document.getElementById('generatePdfBtn').addEventListener('click', async () => {
      const selectedDept = document.getElementById('pdfDeptSelect').value;
      document.body.removeChild(dialog);
      
      // Now actually generate the PDF
      const generatingEl = showLoading("Generating PDF...");
      try {
        // Get fresh entries before generating PDF
        const freshEntries = await getAllTimetableEntries();
        window.allTimetableEntries = freshEntries; // Update the global state
        
        await generatePDF(selectedDept);
        hideLoading();
        showToastMessage('PDF generated successfully!', 'success');
      } catch (error) {
        hideLoading();
        handleError(error, "generatePDF");
      }
    });
    
    hideLoading();
  } catch (error) {
    hideLoading();
    handleError(error, "handleGeneratePdf");
  }
}

// Updated generatePDF function to show all timetables first, then all course details
async function generatePDF(department = 'all') {
  try {
    if (!window.jspdf || !window.jspdf.jsPDF) {
      throw new Error("PDF generation libraries not loaded");
    }
    
    const { jsPDF } = window.jspdf;
    
    // Create document
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });
    
    // Get all entries or filter by department
    const allEntries = window.allTimetableEntries || [];
    const entries = department === 'all' ? 
      allEntries : 
      allEntries.filter(e => e.department === department);
    
    // Set the department name for header
    const departmentNames = {
      'cs': 'Computer Science & IT',
      'eng': 'Engineering',
      'pharm': 'Pharmacy & HND',
      'all': 'All Departments'
    };
    
    const departmentName = departmentNames[department] || 'All Departments';
    
    // Add header information
    const title = "Time Table Fall Semester 2024";
    const subheader = `DEPARTMENT OF ${departmentName.toUpperCase()}`;
    const universityName = "University of Chakwal";
    const semesterInfo = "BSIT -1st, 3rd, 5th, 7th Semester (Evening): 30-09-2024";
    
    // Set initial position for title
    let startY = 15;
    
    // Add title
    doc.setFontSize(16);
    doc.text(title, doc.internal.pageSize.getWidth() / 2, startY, { align: 'center' });
    
    // Add department name
    startY += 7;
    doc.setFontSize(14);
    doc.text(subheader, doc.internal.pageSize.getWidth() / 2, startY, { align: 'center' });
    
    // Add university name
    startY += 7;
    doc.setFontSize(12);
    doc.text(universityName, doc.internal.pageSize.getWidth() / 2, startY, { align: 'center' });
    
    // Add semester info
    startY += 7;
    doc.setFontSize(11);
    doc.text(semesterInfo, doc.internal.pageSize.getWidth() / 2, startY, { align: 'center' });
    
    startY += 10;
    
    // Group entries by session for better organization
    const sessionGroups = {};
    entries.forEach(entry => {
      if (!sessionGroups[entry.session]) {
        sessionGroups[entry.session] = [];
      }
      sessionGroups[entry.session].push(entry);
    });
    
    // Sort sessions in descending order (newest first)
    const sortedSessions = Object.keys(sessionGroups).sort((a, b) => b - a);
    
    // Get time slots for calculating column spans
    const startTime = localStorage.getItem('timetableStartTime') || '08:00';
    const endTime = localStorage.getItem('timetableEndTime') || '17:00';
    const timeSlots = getDynamicTimeSlots(startTime, endTime);
    
    // Process each session - TIMETABLES SECTION
    let currentY = startY;
    
    // First, render all timetables
    for (const session of sortedSessions) {
      // Create a grid for this session
      const sessionEntries = sessionGroups[session];
      
      // Create grid header
      const tableHeader = [
        ['Day', 'Session', ...timeSlots]
      ];
      
      // Add day rows
      const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
      const tableBody = [];
      
      days.forEach(day => {
        const dayRow = [
          { content: day, styles: { fillColor: [56, 142, 60], textColor: [255, 255, 255], fontStyle: 'bold' } },
          { content: session, styles: { fillColor: [232, 245, 233] } }
        ];
        
        // Track what's been rendered to avoid repetition
        const renderedCells = {};
        
        // Add cells for each time slot
        for (let i = 0; i < timeSlots.length; i++) {
          const slot = timeSlots[i];
          const [slotStart, slotEnd] = slot.split('-');
          
          // Skip if this slot is already handled by a previous multi-slot entry
          const cellKey = `${day}-${i}`;
          if (renderedCells[cellKey]) {
            dayRow.push(''); // Push empty content for merged cells
            continue;
          }
          
          // Find entry for this slot - only match exact start time
          const entry = sessionEntries.find(e => 
            e.day === day && 
            e.session === session &&
            isEntryInTimeSlot(e, slotStart, 'exact')
          );
          
          if (entry) {
            // Calculate span based on duration
            const entryStartMinutes = convertToMinutes(normalizeTimeFormat(entry.startTime));
            const entryEndMinutes = convertToMinutes(normalizeTimeFormat(entry.endTime));
            const durationMinutes = entryEndMinutes - entryStartMinutes;
            let span = Math.ceil(durationMinutes / 30); // Each slot is 30 minutes
            
            // Ensure minimum span of 1
            if (span < 1) span = 1;
            
            // Mark the cells this entry spans as handled
            for (let j = 1; j < span && (i + j) < timeSlots.length; j++) {
              renderedCells[`${day}-${i + j}`] = true;
            }
            
            // Add the course cell with appropriate colSpan
            dayRow.push({
              content: entry.isLab ? `${entry.courseCode} Lab` : entry.courseCode,
              colSpan: span,
              styles: {
                fillColor: entry.isLab ? [255, 248, 225] : 
                            entry.department === 'cs' ? [225, 245, 254] : 
                            entry.department === 'eng' ? [232, 245, 233] : 
                            entry.department === 'pharm' ? [255, 243, 224] : [245, 245, 245]
              }
            });
          } else {
            dayRow.push(''); // Empty cell
          }
        }
        
        tableBody.push(dayRow);
      });
      
      // Add the session heading
      doc.setFontSize(14);
      doc.setTextColor(44, 62, 80);
      doc.text(`Session ${session} (${getSessionName(session)})`, 14, currentY);
      currentY += 7;
      
      // Add the timetable
      doc.autoTable({
        startY: currentY,
        head: tableHeader,
        body: tableBody,
        theme: 'grid',
        headStyles: {
          fillColor: [56, 142, 60],
          textColor: [255, 255, 255],
          fontSize: 9,
          cellPadding: 2
        },
        bodyStyles: {
          fontSize: 9,
          cellPadding: 2
        },
        columnStyles: {
          0: { cellWidth: 20 },
          1: { cellWidth: 15 }
        }
      });
      
      // Update current Y position for next session
      currentY = doc.lastAutoTable.finalY + 15;
      
      // Add page break if near bottom of page
      if (currentY > doc.internal.pageSize.getHeight() - 20) {
        doc.addPage();
        currentY = 20;
      }
    }
    
    // Add all course details - DETAILS SECTION
    // Start on a new page for course details
    doc.addPage();
    currentY = 20;
    
    // Add header for the details section
    doc.setFontSize(14);
    doc.setTextColor(44, 62, 80);
    doc.text("Course Details", 14, currentY);
    currentY += 10;
    
    // Now process each session for course details
    for (const session of sortedSessions) {
      const sessionEntries = sessionGroups[session];
      
      // Add session heading for details
      doc.setFontSize(12);
      doc.setTextColor(44, 62, 80);
      doc.text(`Session ${session} (${getSessionName(session)})`, 14, currentY);
      currentY += 7;
      
      // Add entries table for this session
      const courseHeader = [
        ['Course Code', 'Course Name', 'Credit Hrs.', 'Teacher Name', 'Venue']
      ];
      
      const courseRows = sessionEntries
        .filter((v, i, a) => a.findIndex(t => t.courseCode === v.courseCode) === i) // Unique courses
        .sort((a, b) => a.courseCode.localeCompare(b.courseCode))
        .map(entry => [
          entry.courseCode,
          entry.courseName,
          entry.creditHours || '3',
          entry.teacherName || '',
          entry.venue || ''
        ]);
      
      doc.autoTable({
        startY: currentY,
        head: courseHeader,
        body: courseRows,
        theme: 'plain',
        headStyles: {
          fillColor: [240, 240, 240],
          textColor: [0, 0, 0],
          fontStyle: 'bold',
          fontSize: 9
        },
        bodyStyles: {
          fontSize: 9
        },
      });
      
      // Update Y position and add page break if needed
      currentY = doc.lastAutoTable.finalY + 10;
      
      if (currentY > doc.internal.pageSize.getHeight() - 20 && session !== sortedSessions[sortedSessions.length - 1]) {
        doc.addPage();
        currentY = 20;
      }
    }
    
    // Add footer
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      
      // Add footer content
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      
      // Add footer items
      doc.text("1. Notice Board", 14, pageHeight - 20);
      doc.text("2. Concerned Teachers", 14, pageHeight - 17);
      doc.text("3. Concerned Labs", 14, pageHeight - 14);
      doc.text("4. Chairman Office", 14, pageHeight - 11);
      
      // Right side footer
      doc.text("Dr. Rashid Amin", pageWidth - 14, pageHeight - 20, { align: 'right' });
      doc.text("Head of Department", pageWidth - 14, pageHeight - 17, { align: 'right' });
      doc.text(`Department of ${department === 'pharm' ? 'Pharmacy & HND' : 'CS & IT'}`, pageWidth - 14, pageHeight - 14, { align: 'right' });
      
      // Add page number
      doc.text(`Page ${i} of ${pageCount}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
    }
    
    // Save the PDF
    doc.save(`timetable_${department}_${new Date().toISOString().slice(0, 10)}.pdf`);
    
    return true;
  } catch (error) {
    console.error("Error in generatePDF:", error);
    throw error;
  }
}

// Helper function to get session name
function getSessionName(session) {
  const currentYear = new Date().getFullYear();
  const sessionYear = parseInt(session);
  const diff = currentYear - sessionYear;
  
  if (diff === 0) return "1st Semester";
  if (diff === 1) return "3rd Semester";
  if (diff === 2) return "5th Semester";
  if (diff === 3) return "7th Semester";
  return `${diff * 2 + 1}th Semester`;
}

// Add displayStoredData function
function displayStoredData() {
  try {
    const entries = window.timetableEntries || [];
    if (entries.length === 0) {
      alert("No entries to display");
      return;
    }
    
    // Create a formatted display
    let output = `Total Entries: ${entries.length}\n\n`;
    entries.forEach((entry, i) => {
      output += `Entry ${i+1}: ${entry.day} - ${entry.session} - ${entry.courseCode} - ${entry.startTime}-${entry.endTime}\n`;
    });
    
    console.log(output);
    alert(output);
  } catch (error) {
    handleError(error, "displayStoredData");
  }
}

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

// Fixed version of convertToMinutes function that properly handles hours
function convertToMinutes(timeString) {
    if (!timeString) return 0;
    
    const parts = timeString.split(':');
    let hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);
    
    // No automatic PM conversion - use time as provided
    // (removed the problematic hours modification)
    
    return (hours * 60) + minutes;
}

// Fix the isEntryInTimeSlot function to handle both exact start time and time spans
function isEntryInTimeSlot(entry, slotStart, mode = 'exact') {
    // Normalize times for consistency
    const entryStartTime = normalizeTimeFormat(entry.startTime);
    const entryEndTime = normalizeTimeFormat(entry.endTime);
    
    // Convert to minutes for easier comparison
    const entryStartMinutes = convertToMinutes(entryStartTime);
    const entryEndMinutes = convertToMinutes(entryEndTime);
    const slotStartMinutes = convertToMinutes(slotStart);
    const slotEndMinutes = slotStartMinutes + 30; // Default 30-minute slots
    
    if (mode === 'exact') {
        // For finding the starting slot, check exact match with start time
        return entryStartMinutes === slotStartMinutes;
    } else if (mode === 'span') {
        // For calculating spans, check if entry covers this time slot
        // Entry must start before or at slot start AND end after slot start
        return entryStartMinutes <= slotStartMinutes && entryEndMinutes > slotStartMinutes;
    } else {
        // For overlap detection (used elsewhere)
        // Check if there's any overlap between entry and slot
        return (entryStartMinutes < slotEndMinutes && entryEndMinutes > slotStartMinutes);
    }
}

// Modify the getAllTimeSlots function to use 17:00 (5pm) as default end time
function getAllTimeSlots(entries) {
    // Use the start and end times from localStorage to match the display view
    const startTime = localStorage.getItem('timetableStartTime') || '08:00';
    const endTime = localStorage.getItem('timetableEndTime') || '17:00'; // Changed from 13:00 to 17:00
    
    return getDynamicTimeSlots(startTime, endTime);
}

// Add this function to timetable.js
function getDynamicTimeSlots(startTime, endTime) {
    console.log(`Generating time slots from ${startTime} to ${endTime}`);
    const slots = [];
    
    // Convert to minutes for easier calculation
    const startMinutes = convertToMinutes(startTime);
    const endMinutes = convertToMinutes(endTime);
    
    // Generate slots with 30 minute intervals
    for (let time = startMinutes; time < endMinutes; time += 30) {
        const slotStartHour = Math.floor(time / 60);
        const slotStartMin = time % 60;
        
        const slotEndHour = Math.floor((time + 30) / 60);
        const slotEndMin = (time + 30) % 60;
        
        // Format hours and minutes with leading zeros
        const formattedStart = `${String(slotStartHour).padStart(2, '0')}:${String(slotStartMin).padStart(2, '0')}`;
        const formattedEnd = `${String(slotEndHour).padStart(2, '0')}:${String(slotEndMin).padStart(2, '0')}`;
        
        slots.push(`${formattedStart}-${formattedEnd}`);
    }
    
    return slots;
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
async function displayEntriesInAdmin(entries) {
    const entriesList = document.getElementById('entriesList');
    if (!entriesList) {
        return;
    }

    try {
        // Always reload from Firestore to get the latest data
        timetableEntries = entries || await getAllTimetableEntries();

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


// Add this function to scripts/timetable.js
async function loadAndDisplayEntries() {
  const loadingEl = showLoading("Loading entries...");
  try {
    // Get all entries
    const entries = await getAllTimetableEntries();
    window.allTimetableEntries = entries; // Store all entries

    // For admin panel, show all entries
    if (window.location.href.includes('AdminPanel.html')) {
      window.timetableEntries = entries;
      displayEntriesInAdmin(entries);
      if (typeof updateStats === 'function') {
        updateStats(entries);
      }
    } else {
      // For timetable display, filter by department
      const urlParams = new URLSearchParams(window.location.search);
      const department = urlParams.get('dept');
      
      console.log("Department filter applied:", department);
      
      // Filter entries by department if requested
      const filteredEntries = department 
        ? entries.filter(entry => entry.department === department)
        : entries;
      
      // Store filtered entries for this view
      window.timetableEntries = filteredEntries;
      
      console.log(`Filtered from ${entries.length} to ${filteredEntries.length} entries`);
      
      // Render the filtered entries
      if (typeof renderTimetable === 'function') {
        renderTimetable(filteredEntries);
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
function updateStats(entries) {
  try {
    const totalEntriesEl = document.getElementById('totalEntries');
    const activeSessionsEl = document.getElementById('activeSessions');
    const totalCoursesEl = document.getElementById('totalCourses');
    const totalTeachersEl = document.getElementById('totalTeachers');
    
    if (!entries) return;
    
    if (totalEntriesEl) 
      totalEntriesEl.textContent = entries.length;
    
    if (activeSessionsEl) {
      const uniqueSessions = [...new Set(entries.map(entry => entry.session))].length;
      activeSessionsEl.textContent = uniqueSessions || 0;
    }
    
    if (totalCoursesEl) {
      const uniqueCourses = [...new Set(entries.map(entry => entry.courseCode))].length;
      totalCoursesEl.textContent = uniqueCourses || 0;
    }
    
    if (totalTeachersEl) {
      const uniqueTeachers = [...new Set(entries
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
  // Normalize all times for consistency
  const normalizedSlotStart = normalizeTimeFormat(slotStart);
  const normalizedSlotEnd = normalizeTimeFormat(slotEnd || '');
  const slotStartMins = convertToMinutes(normalizedSlotStart);
  const slotEndMins = slotStartMins + 30; // Default 30-minute slots
  
  // First look for an entry that starts exactly at this slot
  let entry = entries.find(e => {
    const entryStart = normalizeTimeFormat(e.startTime);
    return entryStart === normalizedSlotStart;
  });
  
  if (!entry) {
    // If no exact match, find an entry that overlaps with this slot
    entry = entries.find(e => {
      const entryStartMins = convertToMinutes(normalizeTimeFormat(e.startTime));
      const entryEndMins = convertToMinutes(normalizeTimeFormat(e.endTime));
      
      // Check if there's any overlap:
      // Entry starts before slot ends AND entry ends after slot starts
      return entryStartMins < slotEndMins && entryEndMins > slotStartMins;
    });
  }
  
  return entry;
}

// Replace both setupRealtimeUpdates functions with this single implementation
function setupRealtimeUpdates() {
  try {
    // Modified to handle missing firestore reference
    if (window._realtimeUpdatesFailing) {
      console.log("Real-time updates previously failed, not retrying");
      return; // Stop trying after too many failures
    }
    
    // Add visual indicator for real-time status
    let statusIndicator = document.getElementById('realtime-status');
    if (!statusIndicator && !window.location.href.includes('AdminPanel.html')) {
      statusIndicator = document.createElement('div');
      statusIndicator.id = 'realtime-status';
      statusIndicator.style.cssText = 'position:fixed;bottom:10px;right:10px;padding:5px 10px;font-size:12px;background:rgba(52,168,83,0.8);color:white;border-radius:4px;z-index:1000;';
      statusIndicator.textContent = 'Connecting...';
      document.body.appendChild(statusIndicator);
    }
    
    // More robust Firebase initialization check
    if (!window.db) {
      console.warn("Firebase not initialized yet, retrying in 500ms");
      if (statusIndicator) statusIndicator.style.background = 'rgba(234,67,53,0.8)';
      if (statusIndicator) statusIndicator.textContent = 'Connecting...';
      
      // Retry with a shorter interval, but limit retries
      window._realtimeUpdateRetries = (window._realtimeUpdateRetries || 0) + 1;
      if (window._realtimeUpdateRetries < 5) {
        setTimeout(setupRealtimeUpdates, 500);
      } else {
        if (statusIndicator) statusIndicator.textContent = 'Connection Failed';
        window._realtimeUpdatesFailing = true;
      }
      return;
    }
    
    console.log("Setting up real-time timetable updates");
    
    // Only setup the listener once
    if (window._timetableListener) {
      console.log("Real-time listener already exists");
      if (statusIndicator) statusIndicator.textContent = 'Connected';
      return;
    }
    
    // Check if we have access to onSnapshot
    if (!window.onSnapshotImport) {
      console.log("onSnapshot not available, skipping real-time updates");
      if (statusIndicator) {
        statusIndicator.style.background = 'rgba(234,67,53,0.8)';
        statusIndicator.textContent = 'Updates Disabled';
      }
      
      // Instead, set up a polling mechanism as fallback
      if (!window._pollingInterval) {
        window._pollingInterval = setInterval(async () => {
          try {
            const entries = await getAllTimetableEntries();
            renderTimetable(entries);
          } catch (err) {
            console.error("Polling error:", err);
          }
        }, 10000); // Poll every 10 seconds
      }
      
      return;
    }
    
    try {
      // Use the functions stored during setup
      const collection = window.collectionImport;
      const onSnapshot = window.onSnapshotImport;
      
      if (!collection || !onSnapshot) {
        throw new Error("Firebase functions not available");
      }
      
      // Create the listener with error handling
      window._timetableListener = onSnapshot(
        collection(window.db, "timetableEntries"),
        (snapshot) => {
          const timestamp = new Date().toLocaleTimeString();
          console.log(`[${timestamp}] Timetable data updated in real-time`);
          
          // Visual feedback
          if (statusIndicator) {
            statusIndicator.style.background = 'rgba(52,168,83,0.8)';
            statusIndicator.textContent = `Connected ✓`;
            // Flash effect
            statusIndicator.style.transform = 'scale(1.1)';
            setTimeout(() => {
              if (statusIndicator) statusIndicator.style.transform = 'scale(1)';
            }, 200);
          }
          
          // Convert snapshot to array of entries
          const entries = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          
          // Always store all entries in window for reference - critical for PDF generation
          window.allTimetableEntries = entries;
          
          // Update display based on page
          if (window.location.href.includes('AdminPanel.html')) {
            // For admin panel, show ALL entries
            window.timetableEntries = entries;
            displayEntriesInAdmin(entries);
            if (typeof updateStats === 'function') updateStats(entries);
          } else {
            // For timetable display, filter by department
            const urlParams = new URLSearchParams(window.location.search);
            const department = urlParams.get('dept');
            
            console.log("Current URL department parameter:", department);
            
            // Only display entries for the current department
            const filteredEntries = department 
              ? entries.filter(entry => entry.department === department)
              : entries;
            
            // Set the filtered entries for this page
            window.timetableEntries = filteredEntries;
            
            console.log(`Filtered ${entries.length} entries to ${filteredEntries.length} for department: ${department}`);
            renderTimetable(filteredEntries);
          }
        },
        (error) => {
          console.error("Real-time updates error:", error);
          if (statusIndicator) {
            statusIndicator.style.background = 'rgba(234,67,53,0.8)';
            statusIndicator.textContent = 'Error: ' + error.code;
          }
          
          // Reset listener and retry after error
          window._timetableListener = null;
          setTimeout(setupRealtimeUpdates, 3000);
        }
      );
      
      console.log("Real-time listener setup complete");
    } catch (error) {
      console.error("Error setting up onSnapshot:", error);
      window._realtimeUpdateRetries = (window._realtimeUpdateRetries || 0) + 1;
      
      if (window._realtimeUpdateRetries >= 3) {
        window._realtimeUpdatesFailing = true;
        if (statusIndicator) {
          statusIndicator.style.background = 'rgba(234,67,53,0.8)';
          statusIndicator.textContent = 'Real-time Disabled';
        }
      }
    }
  } catch (error) {
    console.error("Error in setupRealtimeUpdates:", error);
    // Prevent the infinite retry loop by limiting retries
    window._realtimeUpdateRetries = (window._realtimeUpdateRetries || 0) + 1;
    if (window._realtimeUpdateRetries < 3) {
      setTimeout(setupRealtimeUpdates, 2000);
    } else {
      window._realtimeUpdatesFailing = true;
    }
  }
}

// Make sure the button handlers are properly set up
document.addEventListener('DOMContentLoaded', function() {
    console.log("Setting up event handlers on DOM load");
    setTimeout(setupEventHandlers, 500);
});
    
// Fix the window load event listener by separating it correctly
window.addEventListener('load', function() {
    console.log("Setting up event handlers on window load");
    setupEventHandlers(); // Call again on full page load
});

// Add the missing setupEventHandlers function
function setupEventHandlers() {
    console.log("Setting up event handlers");
    
    // Set up form submission handler
    const timetableForm = document.getElementById('timetableForm');
    if (timetableForm) {
        timetableForm.addEventListener('submit', handleFormSubmit);
    }
    
    // Set up PDF generation button
    const generatePdfBtn = document.getElementById('generatePdf');
    if (generatePdfBtn) {
        generatePdfBtn.addEventListener('click', handleGeneratePdf);
    }
    
    // Set up view data button
    const viewDataBtn = document.getElementById('viewStoredData');
    if (viewDataBtn) {
        viewDataBtn.addEventListener('click', displayStoredData);
    }
    
    // Set up clear all entries button
    const clearAllBtn = document.getElementById('clearAllEntries');
    if (clearAllBtn) {
        clearAllBtn.addEventListener('click', deleteAllEntries);
    }
    
    // Set up logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
    
    // Set up time range update button
    const updateTimeRangeBtn = document.getElementById('updateTimeRange');
    if (updateTimeRangeBtn) {
        updateTimeRangeBtn.addEventListener('click', function() {
            const startTime = document.getElementById('timetableStartTime').value;
            const endTime = document.getElementById('timetableEndTime').value;
            
            localStorage.setItem('timetableStartTime', startTime);
            localStorage.setItem('timetableEndTime', endTime);
            
            renderEmptyTimetableGrid();
            loadAndDisplayEntries();
            
            showToastMessage("Display time range updated", "success");
        });
    }
    
    // Set up handlers for suggestion list items
    setupSuggestionHandlers();
}

// Properly define the renderTimetable function globally
function renderTimetable(entries) {
    console.log("Rendering timetable with", entries?.length || 0, "entries");
    
    // Start with empty grid then populate it
    renderEmptyTimetableGrid();
    
    if (!entries || entries.length === 0) {
        console.log("No entries to display");
        return;
    }
    
    // Get days and sessions
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const allSessions = ['2024', '2023', '2022', '2021'];
    
    // Use dynamic time slots
    const startTime = localStorage.getItem('timetableStartTime') || '08:00';
    const endTime = localStorage.getItem('timetableEndTime') || '17:00';
    const timeSlots = getDynamicTimeSlots(startTime, endTime);
    
    // Track cells that are already handled by multi-slot entries
    const handledCells = {};
    
    // For each day and session, process entries
    days.forEach((day, dayIndex) => {
        allSessions.forEach((session, sessionIndex) => {
            // Calculate row index (skip header row)
            const rowIndex = 1 + (dayIndex * allSessions.length) + sessionIndex;
            const row = document.querySelector(`#timetableBody tr:nth-child(${rowIndex})`);
            
            if (!row) {
                console.error(`Row not found for day ${day}, session ${session}, index ${rowIndex}`);
                return;
            }
            
            // Get entries for this day and session
            const daySessionEntries = entries.filter(e => 
                e.day === day && e.session === session);
            
            if (daySessionEntries.length === 0) return;
            
            // Process each entry for this day/session
            daySessionEntries.forEach(entry => {
                // Find which time slot the entry starts in
                let firstSlotIndex = -1;
                for (let i = 0; i < timeSlots.length; i++) {
                    const [slotStart] = timeSlots[i].split('-');
                    if (isEntryInTimeSlot(entry, slotStart, 'exact')) {
                        firstSlotIndex = i;
                        break;
                    }
                }
                
                if (firstSlotIndex !== -1) {
                    // Calculate how many slots this entry spans
                    let slotSpan = 0;
                    const entryStartMinutes = convertToMinutes(normalizeTimeFormat(entry.startTime));
                    const entryEndMinutes = convertToMinutes(normalizeTimeFormat(entry.endTime));
                    const durationMinutes = entryEndMinutes - entryStartMinutes;
                    slotSpan = Math.ceil(durationMinutes / 30); // Each slot is 30 minutes
                    
                    // Ensure minimum span of 1
                    if (slotSpan < 1) slotSpan = 1;
                    
                    // Skip if column index is beyond table width
                    const firstCellIndex = firstSlotIndex + 2; // +2 for day and session columns
                    if (firstCellIndex >= row.cells.length) {
                        console.warn(`Cell index ${firstCellIndex} out of range for row with ${row.cells.length} cells`);
                        return;
                    }
                    
                    const firstCell = row.cells[firstCellIndex];
                    
                    if (firstCell) {
                        // Mark cells as handled to avoid repetition
                        for (let i = 0; i < slotSpan; i++) {
                            const cellKey = `${rowIndex}-${firstSlotIndex + i + 2}`;
                            handledCells[cellKey] = true;
                        }
                        
                        // Remove other cells this entry spans, but check boundaries
                        for (let i = 1; i < slotSpan && (firstCellIndex + 1) < row.cells.length; i++) {
                            const cellToRemove = row.cells[firstCellIndex + 1]; // Always remove the next cell
                            if (cellToRemove) {
                                row.removeChild(cellToRemove);
                            }
                        }
                        
                        // Set colspan for the first cell
                        firstCell.colSpan = slotSpan;
                        
                        // Style the cell and add content
                        firstCell.textContent = entry.isLab ? `${entry.courseCode} Lab` : entry.courseCode;
                        firstCell.title = `${entry.courseName} (${entry.teacherName || 'TBD'})`;
                        firstCell.className = 'course-cell';
                        
                        // Style cell based on type and department
                        if (entry.isLab) {
                            firstCell.style.backgroundColor = '#fff8e1'; // Light yellow
                            firstCell.style.fontStyle = 'italic';
                            firstCell.classList.add('lab-course');
                        } else {
                            // Department based colors
                            if (entry.department === 'cs') {
                                firstCell.style.backgroundColor = '#e1f5fe'; // Light blue
                            } else if (entry.department === 'eng') {
                                firstCell.style.backgroundColor = '#e8f5e9'; // Light green
                            } else if (entry.department === 'pharm') {
                                firstCell.style.backgroundColor = '#fff3e0'; // Light orange
                            } else {
                                firstCell.style.backgroundColor = '#f5f5f5'; // Light gray
                            }
                        }
                    }
                }
            });
        });
    });
}

// Add the missing renderEmptyTimetableGrid function
function renderEmptyTimetableGrid() {
    console.log("Rendering empty timetable grid");
    
    // Get the container by id
    const timetableContainer = document.getElementById('timetable-container');
    if (!timetableContainer) {
        console.error("Timetable container not found");
        return;
    }
    
    // Clear existing content
    timetableContainer.innerHTML = '';
    
    // Create table element with id for later reference
    const table = document.createElement('table');
    table.className = 'table';
    table.id = 'timetableDisplay'; // Add an id for easier reference
    
    // Get days and sessions
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const sessions = ['2024', '2023', '2022', '2021'];
    
    // Get dynamic time slots
    const startTime = localStorage.getItem('timetableStartTime') || '08:00';
    const endTime = localStorage.getItem('timetableEndTime') || '17:00';
    const timeSlots = getDynamicTimeSlots(startTime, endTime);
    
    // Create header row
    const headerRow = document.createElement('tr');
    
    // Add Day header
    const dayHeader = document.createElement('th');
    dayHeader.textContent = 'Day';
    dayHeader.style.fontSize = '14px';
    headerRow.appendChild(dayHeader);
    
    // Add Session header
    const sessionHeader = document.createElement('th');
    sessionHeader.textContent = 'Session';
    sessionHeader.style.fontSize = '14px';
    headerRow.appendChild(sessionHeader);
    
    // Add time slot headers
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
        
        th.textContent = `${displayStart}:${startMinutes}-${displayEnd}:${endMinutes}`;
        th.style.fontSize = '11px'; // Smaller font for time slot headers
        headerRow.appendChild(th);
    });
    
    // Create thead and append header row
    const thead = document.createElement('thead');
    thead.appendChild(headerRow);
    table.appendChild(thead);
    
    // Create tbody for content
    const tbody = document.createElement('tbody');
    tbody.id = 'timetableBody';
    
    // Create rows for each day and session
    days.forEach(day => {
        sessions.forEach((session, sessionIdx) => {
            const row = document.createElement('tr');
            
            // Add day cell only for the first session
            if (sessionIdx === 0) {
                const dayCell = document.createElement('td');
                dayCell.className = 'day-cell';
                dayCell.textContent = day;
                dayCell.rowSpan = sessions.length;
                dayCell.style.display = "table-cell"; 
                dayCell.style.color = "#fff";
                dayCell.style.fontWeight = "bold";
                dayCell.style.background = "#388e3c";
                dayCell.style.fontSize = "13px"; // Decreased from default
                dayCell.style.width = "10%";     // Ensure enough width
                row.appendChild(dayCell);
            }
            
            // Add session cell
            const sessionCell = document.createElement('td');
            sessionCell.className = 'session-cell';
            sessionCell.textContent = session;
            row.appendChild(sessionCell);
            
            // Add empty cells for time slots
            timeSlots.forEach(() => {
                const td = document.createElement('td');
                td.innerHTML = '&nbsp;'; // Non-breaking space to ensure cell has height
                row.appendChild(td);
            });
            
            tbody.appendChild(row);
        });
    });
    
    table.appendChild(tbody);
    timetableContainer.appendChild(table);
    
    console.log("Empty timetable grid rendered successfully");
}

// Add setupSuggestionHandlers function
function setupSuggestionHandlers() {
    // Set up handlers for teacher names list
    const addTeacherBtn = document.getElementById('addTeacherBtn');
    if (addTeacherBtn) {
        addTeacherBtn.addEventListener('click', async function() {
            const input = document.getElementById('newTeacherName');
            if (input && input.value.trim()) {
                await dataManager.addItem(dataManager.keys.teacherNames, input.value.trim());
                input.value = '';
                loadSuggestionList(dataManager.keys.teacherNames, 'teacherNamesListView');
            }
        });
    }
    
    // Set up handlers for venues list
    const addVenueBtn = document.getElementById('addVenueBtn');
    if (addVenueBtn) {
        addVenueBtn.addEventListener('click', async function() {
            const input = document.getElementById('newVenue');
            if (input && input.value.trim()) {
                await dataManager.addItem(dataManager.keys.venues, input.value.trim());
                input.value = '';
                loadSuggestionList(dataManager.keys.venues, 'venuesListView');
            }
        });
    }
    
    // Set up handlers for course names list
    const addCourseNameBtn = document.getElementById('addCourseNameBtn');
    if (addCourseNameBtn) {
        addCourseNameBtn.addEventListener('click', async function() {
            const input = document.getElementById('newCourseName');
            if (input && input.value.trim()) {
                await dataManager.addItem(dataManager.keys.courseNames, input.value.trim());
                input.value = '';
                loadSuggestionList(dataManager.keys.courseNames, 'courseNamesListView');
            }
        });
    }
    
    // Set up handlers for course codes list
    const addCourseCodeBtn = document.getElementById('addCourseCodeBtn');
    if (addCourseCodeBtn) {
        addCourseCodeBtn.addEventListener('click', async function() {
            const input = document.getElementById('newCourseCode');
            if (input && input.value.trim()) {
                await dataManager.addItem(dataManager.keys.courseCodes, input.value.trim());
                input.value = '';
                loadSuggestionList(dataManager.keys.courseCodes, 'courseCodesListView');
            }
        });
    }
    
    // Load all suggestion lists
    loadAllSuggestionLists();
}

// Add loadSuggestionList and loadAllSuggestionLists functions
function loadSuggestionList(key, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    dataManager.getData(key).then(items => {
        container.innerHTML = '';
        
        if (items.length === 0) {
            container.innerHTML = '<div class="list-item">No items yet</div>';
            return;
        }
        
        items.forEach(item => {
            const itemEl = document.createElement('div');
            itemEl.className = 'list-item';
            
            const itemText = document.createElement('span');
            itemText.className = 'list-item-text';
            itemText.textContent = item;
            itemEl.appendChild(itemText);
            
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'btn danger small';
            deleteBtn.textContent = '×';
            deleteBtn.addEventListener('click', async () => {
                await dataManager.removeItem(key, item);
                loadSuggestionList(key, containerId);
            });
            
            const actionDiv = document.createElement('div');
            actionDiv.className = 'list-item-actions';
            actionDiv.appendChild(deleteBtn);
            itemEl.appendChild(actionDiv);
            
            container.appendChild(itemEl);
        });
    });
}

function loadAllSuggestionLists() {
    loadSuggestionList(dataManager.keys.teacherNames, 'teacherNamesListView');
    loadSuggestionList(dataManager.keys.venues, 'venuesListView');
    loadSuggestionList(dataManager.keys.courseNames, 'courseNamesListView');
    loadSuggestionList(dataManager.keys.courseCodes, 'courseCodesListView');
}

// Make sure all these functions are available globally
window.setupEventHandlers = setupEventHandlers;
window.renderTimetable = renderTimetable;
window.renderEmptyTimetableGrid = renderEmptyTimetableGrid;
window.showToastMessage = showToastMessage;

// Define the showToastMessage function
function showToastMessage(message, type = 'info') {
  // Check if toast container exists, if not, create it
  let toastContainer = document.getElementById('toast-container');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    toastContainer.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:10000;';
    document.body.appendChild(toastContainer);
  }
  
  // Create toast element
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  toast.style.cssText = `
    padding: 12px 20px;
    background-color: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#F44336' : '#2196F3'};
    color: white;
    border-radius: 4px;
    margin-top: 10px;
    box-shadow: 0 2px 5px rgba(0,0,0,0.2);
    min-width: 250px;
    transition: all 0.3s ease;
    opacity: 0;
  `;
  
  // Add to container
  toastContainer.appendChild(toast);
  
  // Trigger animation
  setTimeout(() => {
    toast.style.opacity = '1';
  }, 10);
  
  // Remove after delay
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => {
      if (toast && toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }, 3000);
}

// Add the missing handleFormSubmit function
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
    const department = document.getElementById('department').value;
    
    // Add the entry to selected days
    const dayCheckboxes = document.querySelectorAll('input[type="checkbox"][name="day"]');
    const selectedDays = Array.from(dayCheckboxes)
      .filter(checkbox => checkbox.checked)
      .map(checkbox => checkbox.value);
    
    console.log("Selected days:", selectedDays);
    
    if (selectedDays.length === 0) {
      alert("Please select at least one day.");
      return;
    }
    
    if (convertToMinutes(startTime) >= convertToMinutes(endTime)) {
      alert("End time must be after start time.");
      return;
    }
    
    const loadingEl = showLoading("Adding entries...");
    
    let addedEntries = 0;
    
    // Log for debugging
    console.log("Adding entries with department:", department);
    
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
        isLab,
        department
      };
      
      const result = await addTimetableEntry(entry);
      
      if (result.success) {
        addedEntries++;
        
        // Add to suggestion arrays for autocomplete
        dataManager.addItem(dataManager.keys.teacherNames, teacherName);
        dataManager.addItem(dataManager.keys.venues, venue);
        dataManager.addItem(dataManager.keys.courseNames, courseName);
        dataManager.addItem(dataManager.keys.courseCodes, courseCode);
      }
    }
    
    hideLoading();
    showToastMessage(`Added ${addedEntries} entries successfully.`, 'success');
    
    // Reset form after submission
    document.getElementById('timetableForm').reset();
    
    // IMPORTANT: Refresh the displayed entries immediately
    await loadAndDisplayEntries();
    
  } catch (error) {
    hideLoading();
    handleError(error, "handleFormSubmit");
  }
}

// Add the fixExistingEntries function
async function fixExistingEntries() {
  if (!confirm('Do you want to update all entries without a department to your current department?')) {
    return;
  }
  
  try {
    const loadingEl = showLoading("Updating entries...");
    const entries = await getAllTimetableEntries();
    const currentDept = document.getElementById('department').value || 'cs';
    let updated = 0;
    
    for (const entry of entries) {
      if (!entry.department) {
        // Update entry with the current department
        await updateDoc(doc(window.db, "timetableEntries", entry.id), {
          department: currentDept
        });
        updated++;
      }
    }
    
    hideLoading();
    alert(`Updated ${updated} entries to department: ${currentDept}`);
    loadAndDisplayEntries();
  } catch (error) {
    hideLoading();
    handleError(error, "fixExistingEntries");
  }
}

// Make it available globally
window.fixExistingEntries = fixExistingEntries;

// Add the verifyDepartments function
function verifyDepartments() {
  const entries = window.allTimetableEntries || [];
  if (entries.length === 0) {
    console.log("No entries to verify");
    alert("No entries to verify");
    return;
  }

  const departmentCounts = {
    cs: 0,
    eng: 0,
    pharm: 0,
    undefined: 0,
    null: 0,
    other: 0
  };

  entries.forEach(entry => {
    if (entry.department === undefined) departmentCounts.undefined++;
    else if (entry.department === null) departmentCounts.null++;
    else if (['cs', 'eng', 'pharm'].includes(entry.department)) departmentCounts[entry.department]++;
    else departmentCounts.other++;
  });

  console.table(departmentCounts);
  
  // Show results in an alert
  const message = Object.entries(departmentCounts)
    .map(([dept, count]) => `${dept}: ${count}`)
    .join('\n');
    
  alert(`Department verification results:\n${message}\n\nTotal: ${entries.length} entries checked`);
  
  return departmentCounts;
}

// Make it available
window.verifyDepartments = verifyDepartments;

// Fix issue with department filtering in the DisplayTimetable page
function setupAndVerifyDepartmentEntries() {
  console.log("Verifying department entries...");
  const urlParams = new URLSearchParams(window.location.search);
  const department = urlParams.get('dept');
  
  if (!department) {
    console.log("No department specified in URL");
    return;
  }
  
  console.log(`Department from URL: ${department}`);
  
  // Function to check department data
  const verifyDepartments = async () => {
    try {
      // Get all entries directly from Firestore to ensure fresh data
      const entries = await getAllTimetableEntries();
      
      if (entries.length === 0) {
        console.log("No entries found in database");
        showToastMessage("No timetable entries found. Please add some entries first.", "warning");
        return;
      }
      
      const departmentCounts = {
        cs: 0,
        eng: 0,
        pharm: 0,
        undefined: 0,
        null: 0,
        other: 0
      };
      
      entries.forEach(entry => {
        if (entry.department === undefined) departmentCounts.undefined++;
        else if (entry.department === null) departmentCounts.null++;
        else if (['cs', 'eng', 'pharm'].includes(entry.department)) departmentCounts[entry.department]++;
        else departmentCounts.other++;
      });
      
      console.log("Department counts:", departmentCounts);
      
      // Filter by department
      const filteredEntries = entries.filter(entry => entry.department === department);
      console.log(`Filtered from ${entries.length} to ${filteredEntries.length} entries for ${department}`);
      
      if (filteredEntries.length === 0) {
        // No entries for this department, show message
        const messageEl = document.createElement('div');
        messageEl.style.cssText = 'padding: 20px; text-align: center; margin: 20px; background: #f8f9fa; border-radius: 4px;';
        messageEl.innerHTML = `
          <h3>No Timetable Entries</h3>
          <p>There are no entries available for the ${department} department.</p>
          <p>Please add some entries from the admin panel first.</p>
          <p><a href="AdminPanel.html">Go to Admin Panel</a></p>
        `;
        
        const container = document.getElementById('timetable-container');
        if (container) {
          container.innerHTML = '';
          container.appendChild(messageEl);
        }
        
        // Show toast message
        showToastMessage(`No entries found for ${department} department`, "info");
      } else {
        // Render the timetable with filtered entries
        window.timetableEntries = filteredEntries;
        if (typeof renderTimetable === 'function') {
          renderTimetable(filteredEntries);
        } else {
          console.error("renderTimetable function not available");
        }
      }
    } catch (error) {
      console.error("Error verifying departments:", error);
      showToastMessage("Error loading timetable data", "error");
    }
  };
  
  // Run the verification
  setTimeout(verifyDepartments, 1000); // Give Firebase time to initialize fully
}
