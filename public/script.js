document.addEventListener('DOMContentLoaded', () => {
    const medicationForm = document.getElementById('medicationForm');
    const emptyTitle = document.getElementById('empty-title');
    const overviewTitle = document.getElementById('overview-title');
    const overviewTable = document.getElementById('overviewTable');
    const clockTitle = document.getElementById('clock-title');
    const topTitle = document.querySelector('.top-title');
    const logo = document.querySelector('.logo');
    const reorderTitle = document.getElementById('reorder-title');
    const reorderForm = document.getElementById('reorderForm');
    const plannerForm = document.getElementById('plannerForm');
    const settingsForm = document.getElementById('settingsForm');

    // Function to convert 'YYYY-MM-DD' to 'DD.MM.'YY in user's local time
    const formatShortDate = (isoDateString) => {
        const date = new Date(isoDateString); // Date in user's local time
        const day = String(date.getDate()).padStart(2, '0'); // Ensure two digits
        const month = String(date.getMonth() + 1).padStart(2, '0'); // Month is 0-indexed
        const year = String(date.getFullYear()).slice(-2); // Get last two digits of the year
        return `${day}.${month}.'${year}`; // Format: DD.MM.'YY
    };

    // Function to convert 'YYYY-MM-DD HH:MM:SS' to 'DD.MM.'YY @HH:MM' in user's local time
    const formatDateTime = (isoDateString) => {
        const date = new Date(isoDateString);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = String(date.getFullYear()).slice(-2);
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${day}.${month}.'${year} @${hours}:${minutes}`;
    };

    // Function to convert 'YYYY-MM-DD HH:MM' to 'DD.MM.'YY @HH.MM'
    const formatTime = (isoDateString) => {
        const date = new Date(isoDateString);
        const hours = String(date.getHours()).padStart(2, '0'); // Ensure two digits
        const minutes = String(date.getMinutes()).padStart(2, '0'); // Ensure two digits
        return `${hours}:${minutes}`; // Format: HH.MM
    };

    // Function to format time and date
    const formatClockTime = (time) => {
        return time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    };
    
    // Function to format the date and return the corresponding class
    const formatClockDate = (date) => {
        const day = String(date.getDate()).padStart(2, '0'); // Pad day with 0 if needed
        const month = String(date.getMonth() + 1).padStart(2, '0'); // Pad month with 0 if needed
        return `${day}.${month}.`; // Return formatted as DD.MM.
    };

    // Add 1 day (for Planner endDate)
    function addOneDay(date) {
        const newDate = new Date(date);
        newDate.setDate(newDate.getDate() + 1);
        return newDate;
    }
    
    // Do this for medicationForm only
    if (medicationForm) {
        // Add Schedule Row
        let scheduleIndex = 0;

        const addScheduleRow = (updateUsage, updateEvery, updateTime, updateStart) => {
            // Default values
            const defaultUsage = updateUsage || '1';
            const defaultEvery = updateEvery || '1';
            const now = new Date(); // Current date
            const tomorrow = new Date(now);
            tomorrow.setDate(now.getDate() + 1); // Set the date to tomorrow

            // Extracting local date and time from UTC values
            const startDate = updateStart ? new Date(updateStart) : tomorrow;
            const timeDate = updateTime ? new Date(updateTime) : now;

            // Extract year, month, day from updateStart
            const defaultYears = startDate.getFullYear();
            const defaultMonths = (startDate.getMonth() + 1).toString().padStart(2, '0'); // Months are 0-indexed
            const defaultDays = startDate.getDate().toString().padStart(2, '0');

            // Extracting hours and minutes from updateTime
            const defaultHours = timeDate.getHours().toString().padStart(2, '0');
            const defaultMinutes = timeDate.getMinutes().toString().padStart(2, '0');

            const scheduleContainer = document.getElementById('scheduleContainer');
            const scheduleRow = document.createElement('div');
            scheduleRow.classList.add('schedule-row');
            scheduleRow.innerHTML = `
                <div class="form-group usage-input">
                    <label for="usage_${scheduleIndex}" class="input-top">Usage:</label>
                    <div class="input-wrapper">
                        <div class="input-group">
                            <label for="usage_${scheduleIndex}" class="input-inside">Meds</label>
                            <input type="number" step="0.1" id="usage_${scheduleIndex}" name="usage" value="${defaultUsage}" required>
                        </div>
                    </div>
                    <label id="usageLabel_${scheduleIndex}" class="input-bottom">Taking 1</label> <!-- Added ID here -->
                </div>
                <div class="form-group every-input">
                    <label for="every_${scheduleIndex}" class="input-top">Every:</label>
                    <div class="input-wrapper">
                        <div class="input-group">
                            <label for="every_${scheduleIndex}" class="input-inside">Days</label>
                            <input type="number" id="every_${scheduleIndex}" name="every" value="${defaultEvery}" required>
                        </div>
                    </div>
                    <label id="everyLabel_${scheduleIndex}" class="input-bottom">Every Day</label> <!-- Added ID here -->
                </div>
                <div class="form-group time-input">
                    <label for="time_${scheduleIndex}" class="input-top">Time:</label>
                    <div class="input-wrapper">
                        <div class="input-group">
                            <label for="hours_${scheduleIndex}" class="input-inside">HH</label>
                            <input type="number" min="0" max="23" step="1" id="hours_${scheduleIndex}" name="hours" value="${defaultHours}" required>
                        </div>
                        <span>:</span>
                        <div class="input-group">
                            <label for="minutes_${scheduleIndex}" class="input-inside">MM</label>
                            <input type="number" min="0" max="59" step="1" id="minutes_${scheduleIndex}" name="minutes" value="${defaultMinutes}" required>
                        </div>
                    </div>
                    <label id="timeLabel_${scheduleIndex}" class="input-bottom">@${defaultHours}:${defaultMinutes}</label>
                </div>
                <div class="form-group start-input">
                    <label for="start_${scheduleIndex}" class="input-top">Start:</label>
                    <div class="input-wrapper">
                        <div class="input-group">
                            <label for="day_${scheduleIndex}" class="input-inside">DD</label>
                            <input type="number" min="1" max="31" step="1" id="day_${scheduleIndex}" name="day" class="schedule-day" value="${defaultDays}" placeholder="DD" required>
                        </div>
                        <span>.</span>
                        <div class="input-group">
                            <label for="month_${scheduleIndex}" class="input-inside">MM</label>
                            <input type="number" min="1" max="12" step="1" id="month_${scheduleIndex}" name="month" class="schedule-month" value="${defaultMonths}" placeholder="MM" required>
                        </div>
                        <span>.</span>
                        <div class="input-group">
                            <label for="year_${scheduleIndex}" class="input-inside">YYYY</label>
                            <input type="number" min="1900" max="2100" step="1" id="year_${scheduleIndex}" name="year" class="schedule-year" value="${defaultYears}" placeholder="YYYY" required>
                        </div>
                        <button type="button" class="calendar-icon" id="calendarButton_${scheduleIndex}">📅</button> <!-- Calendar icon -->
                    </div>
                    <label id="startLabel_${scheduleIndex}" class="input-bottom">Starting from ${defaultDays}.${defaultMonths}.${defaultYears}</label>
                </div>
                <div class="remove-button-wrapper">
                    <button type="button" class="removeScheduleBtn">Remove</button>
                </div>
            `;
        
            // Append the new schedule row to the container
            scheduleContainer.appendChild(scheduleRow);

            // initialize flatpickr
            flatpickr(`#calendarButton_${scheduleIndex}`, { 
                dateFormat: "d.m.Y",
                defaultDate: new Date(defaultYears, defaultMonths - 1, defaultDays),
                disableMobile: true,  // Disable the mobile input field
                onReady: function(selectedDates, dateStr, instance) {
                  const button = instance._input; // Reference to the flatpickr input
                  // Prevent default when the calendar button is clicked
                  button.addEventListener('click', function(event) {
                    event.preventDefault(); // Prevent the default action (form submission)
                  });
                },
                onChange: function(selectedDates, dateStr) {
                  if (dateStr) {
                    const [day, month, year] = dateStr.split('.');
                    const scheduleRow = this._input.closest('.schedule-row'); 
              
                    // Update input fields
                    scheduleRow.querySelector('.schedule-day').value = day;
                    scheduleRow.querySelector('.schedule-month').value = month;
                    scheduleRow.querySelector('.schedule-year').value = year;

                    updateStartLabel();
                  }
                }
              });
        
            // Attach change listeners for "Every", "Hours", and "Minutes" inputs
            const usageInput = scheduleRow.querySelector(`input[name="usage"]`);
            const everyInput = scheduleRow.querySelector(`input[name="every"]`);
            const hoursInput = scheduleRow.querySelector(`input[name="hours"]`);
            const minutesInput = scheduleRow.querySelector(`input[name="minutes"]`);
            const dayInput = scheduleRow.querySelector(`input[name="day"]`);
            const monthInput = scheduleRow.querySelector(`input[name="month"]`);
            const yearInput = scheduleRow.querySelector(`input[name="year"]`);
            let isStartModified = false; // Flag to check if start was modified

            everyInput.addEventListener('change', updateStartDate);
            hoursInput.addEventListener('change', updateStartDate);
            minutesInput.addEventListener('change', updateStartDate);
            dayInput.addEventListener('change', updateStartDate);
            monthInput.addEventListener('change', updateStartDate);
            yearInput.addEventListener('change', updateStartDate);

            // Function to update the Start date based on Hours, Minutes, and Every
            function updateStartDate() {
                if (!isStartModified) { // Only update if Start hasn't been modified
                    const hours = parseInt(hoursInput.value, 10) || 0; // Default to 0 if empty
                    const minutes = parseInt(minutesInput.value, 10) || 0; // Default to 0 if empty

                    const day = parseInt(dayInput.value, 10);
                    const month = parseInt(monthInput.value, 10) - 1; // Month is 0-indexed
                    const year = parseInt(yearInput.value, 10);

                    const now = new Date();
                    const currentTime = now.getHours() * 60 + now.getMinutes(); // Current time in minutes
                    const selectedTime = hours * 60 + minutes; // Selected time in minutes

                    let startDate = new Date();

                    // Set the start date from the input values
                    if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
                        startDate.setFullYear(year, month, day);
                    }

                    if (selectedTime > currentTime) {
                        // If time is greater than or equal to now, use today's date
                        startDate = now;
                    } else {
                        // If time is less than now, add 'Every' days to today's date
                        startDate = new Date(now);
                        startDate.setDate(now.getDate() + 1);
                    }
                    // Now, update the input fields to reflect the new start date
                    dayInput.value = startDate.getDate().toString().padStart(2, '0');
                    monthInput.value = (startDate.getMonth() + 1).toString().padStart(2, '0'); // Months are 0-indexed
                    yearInput.value = startDate.getFullYear();

                    updateStartLabel();
                }
            }

            // Update bottom label
            const usageLabel = scheduleRow.querySelector(`#usageLabel_${scheduleIndex}`);
            const everyLabel = scheduleRow.querySelector(`#everyLabel_${scheduleIndex}`);
            const timeLabel = scheduleRow.querySelector(`#timeLabel_${scheduleIndex}`);
            const startLabel = scheduleRow.querySelector(`#startLabel_${scheduleIndex}`);

            // Attach listeners for hour and minute inputs
            hoursInput.addEventListener('change', updateTimeLabel);
            minutesInput.addEventListener('change', updateTimeLabel);

            // Attach listeners for day, month, and year inputs
            dayInput.addEventListener('change', () => {
                isStartModified = true; // Mark Start as modified
                updateStartLabel(); // Call the function to update the label
            });
            monthInput.addEventListener('change', () => {
                isStartModified = true; // Mark Start as modified
                updateStartLabel(); // Call the function to update the label
            });
            yearInput.addEventListener('change', () => {
                isStartModified = true; // Mark Start as modified
                updateStartLabel(); // Call the function to update the label
            });

            // Update usage and every label
            usageInput.addEventListener('input', () => {
                usageLabel.textContent = `Taking ${usageInput.value}`;
            });
            everyInput.addEventListener('input', () => {
                everyLabel.textContent = everyInput.value === '1' ? 'Every Day' : `Every ${everyInput.value} Days`;
            });            

            // Function to update time label
            function updateTimeLabel() {
                const hours = hoursInput.value.padStart(2, '0');
                const minutes = minutesInput.value.padStart(2, '0');
                timeLabel.textContent = `@ ${hours}:${minutes}`;
            }

            // Function to update start label
            const updateStartLabel = () => {
                const dayValue = dayInput.value.padStart(2, '0'); // Ensure two digits for day
                const monthValue = monthInput.value.padStart(2, '0'); // Ensure two digits for month
                const yearValue = yearInput.value; // Get the year value   
                startLabel.textContent = `Starting from ${dayValue}.${monthValue}.${yearValue}`;
            };

            // Attach remove button functionality
            scheduleRow.querySelector('.removeScheduleBtn').addEventListener('click', () => {
                scheduleRow.remove();
                updateRemoveButtonsVisibility(); // Update the visibility of Remove buttons
            });
        
            scheduleIndex++; // Increment the schedule index for unique IDs
            updateRemoveButtonsVisibility(); // Optional: Update any button visibility as needed
        };
        
        // Update Remove Button Visibility if there is only one entry
        const updateRemoveButtonsVisibility = () => {
            const scheduleRows = document.querySelectorAll('.schedule-row');
            const removeButtons = document.querySelectorAll('.removeScheduleBtn');
            if (scheduleRows.length === 1) {
                removeButtons.forEach(button => button.style.display = 'none');
            } else {
                removeButtons.forEach(button => button.style.display = 'inline-block');
            }
        };
        
        // Add first schedule row on page load
        addScheduleRow();
        
        // Add more schedules
        document.getElementById('addScheduleBtn').addEventListener('click', () => {
            addScheduleRow(); // Call without arguments
        });

        // Handle save Medication
        document.getElementById('medicationForm').addEventListener('submit', async (event) => {
            event.preventDefault();

            const formData = new FormData(event.target);
            const medicationId = formData.get('medicationId'); // Get the medication ID

            const schedules = Array.from(document.querySelectorAll('.schedule-row')).map(row => {
                // Directly retrieve values from the separate inputs
                const day = row.querySelector('.schedule-day').value.padStart(2, '0');   // Day input (DD)
                const month = row.querySelector('.schedule-month').value.padStart(2, '0'); // Month input (MM)
                const year = row.querySelector('.schedule-year').value; // Year input (YYYY)

                // Get the time values
                const hours = row.querySelector('[name="hours"]').value.padStart(2, '0'); // Hours input (e.g., "08" for 8 AM)
                const minutes = row.querySelector('[name="minutes"]').value.padStart(2, '0'); // Minutes input (e.g., "30" for half past)

                // Combine hours and minutes into HH:MM format
                const time = `${hours}:${minutes}`;
                
                // Create a combined date and time string in ISO format with user's local time
                const localDateTimeString = `${year}-${month}-${day}T${time}:00`; 
                const utcDateTime = new Date(localDateTimeString).toISOString(); // Create a new Date object and convert it to UTC with toISOString
                
                return {
                    usage: parseFloat(row.querySelector('[name="usage"]').value),  // Ensure usage is a float
                    every: parseInt(row.querySelector('[name="every"]').value),    // Ensure every is an integer
                    start: utcDateTime  // Final combined ISO date-time string in UTC
                };
            });


            const payload = {
                name: formData.get('name'), // New name
                count: parseFloat(formData.get('count')),
                schedules: schedules,
                oldName: oldMedicationName, // Use old name for the update
            };
            
            // Check if updating or adding a new medication
            if (medicationId) {
                // Update the existing medication
                response = await fetch('/update-medication', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                });
            
                // Handle update response
                const responseData = await response.json();
                if (response.ok) {
                    alert(responseData.success || 'Medication updated successfully');
                    fetchConfigTable(); // Refresh the medication list
                    exitUpdateMode(); // Exit update mode
                } else {
                    const errorData = await response.json();
                    alert(errorData.error || 'Error updating medication');
                }
            } else {
                // For adding new medication
                response = await fetch('/add-medication', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                });
            
                // Handle add response
                const responseData = await response.json();
                if (response.ok) {
                    alert(responseData.success || 'Medication saved successfully');
                    event.target.reset();
                    document.getElementById('medicationId').value = ''; // Clear the hidden input for ID
                    document.getElementById('scheduleContainer').innerHTML = '';
                    addScheduleRow(); // Add one empty schedule row after save
            
                    // Fetch the updated medication list to refresh the table
                    fetchConfigTable();
                } else {
                    const errorData = await response.json();
                    alert(errorData.error || 'Error saving medication');
                }
            }
        });

        // Function to exit update mode
        const exitUpdateMode = () => {
            document.getElementById('medicationId').value = ''; // Clear the medication ID
            document.getElementById('medicationForm').reset(); // Reset the form
            document.getElementById('scheduleContainer').innerHTML = ''; // Clear schedules
            addScheduleRow(); // Add one empty schedule row
        };

        // Function to fill the form with the medication details for updating
        let oldMedicationName; // Store old medication name

        const fillFormForUpdate = (med) => {
            oldMedicationName = med.medication_name; // Save the old name
            document.getElementById('medicationId').value = med.medication_id; // Optionally keep it for any future use
            document.getElementById('name').value = med.medication_name;
            document.getElementById('count').value = med.medsLeft;
            document.querySelector('.medication-heading-text').textContent = 'Update Medication';
            scheduleContainer.innerHTML = ''; // Clear existing schedules

            const usages = JSON.parse(med.medication_usage);
            const everys = JSON.parse(med.medication_every);
            const starts = JSON.parse(med.medication_start);

            for (let i = 0; i < usages.length; i++) {
                addScheduleRow(usages[i], everys[i], starts[i], starts[i]);
            }
        };

        // Function to delete medication
        const deleteMedication = async (name) => {
            const confirmation = confirm(`Are you sure you want to delete ${name}?`);
            if (!confirmation) return; // Exit if the user cancels

            // Proceed with deletion if the user confirms
            const response = await fetch(`/delete-medication/${name}`, {
                method: 'DELETE',
            });

            const result = await response.json();
            if (result.success) {
                alert(result.success || 'Medication deleted successfully');
                fetchConfigTable(); // Refresh the table
            } else if (result.error) {
                alert(result.error); // Show error if deletion fails
            }
        };

        // Function to fetch config table
        const fetchConfigTable = async () => {
            const response = await fetch('/fetchConfig');
            const medications = await response.json();
        
            medications.sort((a, b) => a.medication_name.localeCompare(b.medication_name));
        
            // Get the container for the table
            const configTableContainer = document.getElementById('configTableContainer');
            
            // Clear previous content
            configTableContainer.innerHTML = ''; 
        
            // Create the table elements
            const tableContainer = document.createElement('div');
            tableContainer.classList.add('table-container'); // Add class for styling
        
            const configTable = document.createElement('table');
            const thead = document.createElement('thead');
            const tbody = document.createElement('tbody');
        
            // Create header row
            const headerRow = document.createElement('tr');
            const headers = ['Name', 'Meds Left', 'Days Left', 'Resupply Before', 'Usage', 'Every', 'Time', 'Starting From', 'Last Updated → Count', 'Actions'];
            headers.forEach(headerText => {
                const th = document.createElement('th');
                th.textContent = headerText;
                headerRow.appendChild(th);
            });
            thead.appendChild(headerRow);
            configTable.appendChild(thead);
            
            // Populate the table rows
            medications.forEach(med => {
                const row = document.createElement('tr');
        
                row.innerHTML = `
                    <td>${med.medication_name}</td>
                    <td>${med.medsLeft}</td>
                    <td>${med.daysLeft}</td>
                    <td>${formatDateTime(med.orderBefore)}</td>
                    <td>${JSON.parse(med.medication_usage).join('<br>')}</td>
                    <td>${JSON.parse(med.medication_every).join('<br>')}</td>
                    <td>${JSON.parse(med.medication_start).map(formatTime).join('<br>')}</td>
                    <td>${JSON.parse(med.medication_start).map(formatShortDate).join('<br>')}</td>
                    <td>${formatDateTime(med.medication_update) + " →" + med.medication_count}</td>
                    <td>
                        <div class="actions-group">
                            <button class="updateBtn" data-id="${med.medication_name}">Update</button>
                            <button class="deleteBtn" data-id="${med.medication_name}">Delete</button>
                        </div>
                    </td>
                `;
                tbody.appendChild(row);
        
                row.querySelector('.updateBtn').addEventListener('click', () => fillFormForUpdate(med));
                row.querySelector('.deleteBtn').addEventListener('click', () => deleteMedication(med.medication_name));
            });
        
            configTable.appendChild(tbody);
            tableContainer.appendChild(configTable); // Append the table to the container
            configTableContainer.appendChild(tableContainer); // Append the container to the main container
        };
        
        // Initial fetch of medication list on page load
        fetchConfigTable();
    }

    // Do this for low stock
    if (reorderForm) {
        reorderForm.classList.add('hidden'); // Hide the form by default

        fetch('/medications/low-stock')
            .then(response => {
                return response.json();
            })
            .then(data => {
                const { names, username } = data;
                if (names.length > 0) {
                    const formattedNames = names.slice(0, -1).join(', ') + (names.length > 1 ? ' & ' : '') + names.slice(-1);
                    reorderForm.innerHTML = `<p>Dear ${username},<br><br> It is time to reorder ${formattedNames}!</p>`;
                    reorderForm.classList.remove('hidden'); // Show the form
                    reorderTitle.classList.remove('hidden'); // Show the form
                } else {
                    reorderForm.classList.add('hidden'); // Hide the form if no medications need reordering
                }
            })
            .catch(error => {
                console.error('Error fetching low-stock medications:', error);
                reorderForm.innerHTML = '<p>Error fetching low-stock medications.</p>';
                reorderForm.classList.remove('hidden'); // Show the form to display the error message
            });
    }

    // Do this for overviewTable and clockTable
    if (overviewTable) {
        // OVERVIEW
        const fetchOverviewTable = async () => {
            try {
                const response = await fetch('/fetchConfig');
                const medications = await response.json();

                const overviewTableContainer = document.getElementById('overviewTable');
                overviewTableContainer.innerHTML = ''; // Clear any existing content
        
                // Create a new container for the table
                const tableContainer = document.createElement('div');
                tableContainer.classList.add('table-container'); // Add the 'table-container' class
        
                // Create a new table element
                const overviewTable = document.createElement('table');
        
                // Create table head
                const thead = document.createElement('thead');
                thead.innerHTML = `
                    <tr>
                        <th>Name</th>
                        <th>Meds Left</th>
                        <th>Days Left</th>
                        <th>Resupply Before</th>
                    </tr>
                `;
        
                // Create table body
                const tbody = document.createElement('tbody');
        
                // Process and sort medications by Days Left
                const processedMedications = medications.map(med => {
                    const medsLeft = med.medsLeft;
                    const daysLeft = med.daysLeft;
                    const orderBefore = med.orderBefore ? new Date(med.orderBefore) : null;
        
                    return {
                        name: med.medication_name,
                        medsLeft,
                        daysLeft,
                        orderBefore
                    };
                }).sort((a, b) => a.daysLeft - b.daysLeft);
        
                // Populate the tbody with processed medications
                processedMedications.forEach(item => {
                    const row = document.createElement('tr');
        
                    row.innerHTML = `
                        <td>${item.name}</td>
                        <td>${item.medsLeft}</td>
                        <td>${item.daysLeft}</td>
                        <td>${item.orderBefore ? formatDateTime(item.orderBefore) : 'N/A'}</td>
                    `;
        
                    tbody.appendChild(row);
                });
        
                // Append thead and tbody to the new table
                overviewTable.appendChild(thead);
                overviewTable.appendChild(tbody);
        
                // Append the new table to the table container
                tableContainer.appendChild(overviewTable);
        
                // Append the table container to the overviewTableContainer
                overviewTableContainer.appendChild(tableContainer);

                if (medications.length > 0) {
                    overviewTableContainer.classList.remove('hidden');
                    overviewTitle.classList.remove('hidden');
                }
        
            } catch (error) {
                console.error('Error fetching overview table:', error);
            }
        };

        fetchOverviewTable();

        // CLOCK TABLE
        // Variables to track the button states
        let showHistory = false;
        let showFuture = false;

        // Function to fetch clock table
        const fetchClockTable = async () => {
            try {
                const response = await fetch('/fetchConfig');
                const medications = await response.json();
        
                const clockTableContainer = document.getElementById('clockTable');
                clockTableContainer.innerHTML = ''; // Clear any existing content
        
                // Create a new table element
                const clockTable = document.createElement('table');
        
                // Create table body
                const tbody = document.createElement('tbody');
        
                // Combine all clockList entries into one array
                const combinedClockList = [];
        
                medications.forEach(med => {
                    med.clockList.forEach((clock, index) => {
                        const isLastEntry = index === med.clockList.length - 1;
        
                        combinedClockList.push({
                            name: med.medication_name,
                            usage: isLastEntry ? 'X' : clock.usage,
                            time: new Date(clock.scheduledTime),
                        });
                    });
                });
        
                // Sort combinedClockList by time
                combinedClockList.sort((a, b) => a.time - b.time);
        
                const getIconSvg = (pillType) => `
                    <div class="pill-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="40" class="pill">
                            <g class="${pillType}"> <!-- Apply pillType class to the group -->
                                <rect class="top-half" x="0" y="0" width="15" height="20"/>
                                <rect class="bottom-half" x="0" y="20" width="15" height="20"/>
                            </g>
                        </svg>
                    </div>`;
        
                const nowTime = new Date();
                const currentDateTime = new Date();
                const startOfToday = new Date(currentDateTime.setHours(0, 0, 0, 0));
                const startOfTomorrow = new Date(startOfToday);
                startOfTomorrow.setDate(startOfToday.getDate() + 1);
                const endOfTomorrow = new Date(startOfTomorrow);
                endOfTomorrow.setHours(23, 59, 59, 999);
        
                // Populate the tbody with combined clock list
                combinedClockList.forEach((item) => {
                    const row = document.createElement('tr');
                    let usageContent = '';
        
                    // Determine usage display
                    if (item.usage === 'X') {
                        row.classList.add('red_row');
                        usageContent = getIconSvg('med_zero');
                    } else if (item.usage !== '') {
                        const usageValue = parseFloat(item.usage);
                        const fullIconsCount = Math.floor(usageValue);
                        const hasHalfIcon = (usageValue - fullIconsCount) > 0;
        
                        for (let i = 0; i < fullIconsCount; i++) {
                            usageContent += getIconSvg(item.time < nowTime ? 'med_one_past' : 'med_one');
                        }
        
                        if (hasHalfIcon) {
                            usageContent += getIconSvg(item.time < nowTime ? 'med_half_past' : 'med_half');
                        }
                    }
        
                    // Determine the content and class for the date cell
                    const dateContent = item.time >= startOfToday && item.time < startOfTomorrow ? 'Today' : formatClockDate(item.time);
                    const dateClass = item.time >= startOfToday && item.time < startOfTomorrow ? 'today rotated-date' : 'rotated-date';
                    const pastClass = item.time < nowTime ? 'past_row' : '';
        
                    // Hide rows by default except for today and tomorrow
                    row.style.display = item.time > endOfTomorrow || item.time < startOfToday ? 'none' : '';
        
                    // Construct the row with the date cell having conditional classes
                    row.innerHTML = `
                        <td class="${pastClass}">${formatClockTime(item.time)}</td>
                        <td>${usageContent}</td>
                        <td class="${pastClass}">${item.name}</td>
                        <td class="${dateClass}">${dateContent}</td>
                    `;
        
                    tbody.appendChild(row); // Append the row to the tbody
                });
        
                // Add the "Show History" row at the top
                const showHistoryRow = document.createElement('tr');
                showHistoryRow.innerHTML = `
                    <td colspan="4">
                        <button id="showHistoryBtn">Show History</button>
                    </td>
                `;
                tbody.prepend(showHistoryRow); // Add to the top of the tbody
        
                // Add the "Show Future" row at the bottom
                const showFutureRow = document.createElement('tr');
                showFutureRow.innerHTML = `
                    <td colspan="4">
                        <button id="showFutureBtn">Show Future</button>
                    </td>
                `;
                tbody.appendChild(showFutureRow); // Add to the bottom of the tbody
        
                // Append tbody to the clock table
                clockTable.appendChild(tbody);
        
                // Create a new div container
                const clockTableWrapper = document.createElement('div');
                clockTableWrapper.className = 'table-container'; // Add class for styling
                clockTableWrapper.appendChild(clockTable); // Append the clock table to the wrapper
        
                // Append the wrapper to the clockTableContainer
                clockTableContainer.appendChild(clockTableWrapper);

                // Unhide the title and the clockTable container if there are medications
                if (medications.length > 0) {
                    clockTableContainer.classList.remove('hidden');
                    clockTitle.classList.remove('hidden');
                }
        
                // Add event listeners for the buttons
                document.getElementById('showHistoryBtn').addEventListener('click', () => {
                    showHistory = !showHistory;
                    document.getElementById('showHistoryBtn').textContent = showHistory ? 'Hide History' : 'Show History';
                    toggleRows(combinedClockList);
                });
        
                document.getElementById('showFutureBtn').addEventListener('click', () => {
                    showFuture = !showFuture;
                    document.getElementById('showFutureBtn').textContent = showFuture ? 'Hide Future' : 'Show Future';
                    toggleRows(combinedClockList);
                });
        
            } catch (error) {
                console.error('Error fetching clock table:', error);
            }
        };

        // Function to toggle visibility of rows
        const toggleRows = (combinedClockList) => {
            const tbody = document.querySelector('#clockTable tbody');
            const rows = tbody.getElementsByTagName('tr');

            Array.from(rows).forEach((row, index) => {
                // Skip the button rows
                if (index === 0 || index === rows.length - 1) return; // Skip button rows

                const item = combinedClockList[index - 1]; // Adjust for button rows

                const currentDate = new Date();
                const startOfToday = new Date(currentDate.setHours(0, 0, 0, 0));
                const tomorrow = new Date();
                tomorrow.setDate(currentDate.getDate() + 1); // Move to the next day
                const endOfTomorrow = new Date(tomorrow.setHours(23, 59, 59, 999)); // Set time to 23:59:59.999

                // Always hide rows older than 4 days before today
                const pastLimit = new Date(currentDate);
                pastLimit.setDate(currentDate.getDate() - 2);

                // Always hide rows later than 5 days after today
                const futureLimit = new Date(currentDate);
                futureLimit.setDate(currentDate.getDate() + 4);

                const isOlderMoreDays = new Date(currentDate);
                isOlderMoreDays.setDate(currentDate.getDate() - (showHistory ? 2 : 0)); // Show extra days in the past

                const isLaterMoreDays = new Date(currentDate);
                isLaterMoreDays.setDate(currentDate.getDate() + (showFuture ? 4 : 0)); // Show extra days in the future

                const isOlderThanNow = item.time < currentDate;
                const isLaterThanTomorrow = item.time > endOfTomorrow;

                const isOlderThanMoreDays = item.time < isOlderMoreDays;
                const isLaterThanMoreDays = item.time > isLaterMoreDays;

                const isOlderThanPastLimit = item.time < pastLimit;
                const isLaterThanFutureLimit = item.time > futureLimit;

                if (isOlderThanPastLimit || isLaterThanFutureLimit || 
                    (isOlderThanNow && !showHistory && isOlderThanMoreDays) || 
                    (isLaterThanTomorrow && !showFuture && isLaterThanMoreDays)) {
                    row.style.display = 'none'; // Hide row by default
                } else {
                    row.style.display = ''; // Show row
                }
            });
        };

        // Call fetchClockTable to load the data
        fetchClockTable();
    }

    // Do this if DB is empty
    if (emptyTitle) {
        // Define an async function here
        const checkMedications = async () => {
            try {
                const response = await fetch('/fetchConfig');
                const medications = await response.json();

                // Check if the medications array is empty
                if (medications.length === 0) {
                    // Unhide the form wrapper and title if there are no medications
                    document.getElementById('goToConfigBtn').style.display = '';
                    document.getElementById('empty-title').style.display = '';
                }
            } catch (error) {
                console.error('Error fetching medication data:', error);
            }
        };

        checkMedications();  // Call the async function
    }

    // Do this for planner
    if (plannerForm) {
        const flatpickrInstance = flatpickr("#inlineCalendar", {
            mode: "range",
            dateFormat: "d.m.Y", // User sees DD.MM.YYYY format 
            minDate: "today",
            onChange: (selectedDates) => {
                if (selectedDates.length === 2) {
                    // Update the Start Date and End Date input fields
                    document.getElementById('startDate').value = flatpickr.formatDate(selectedDates[0], "d.m.Y");
                    document.getElementById('endDate').value = flatpickr.formatDate(selectedDates[1], "d.m.Y");
                    // Convert start date to ISO format (midnight local time)
                    const startDateISO = selectedDates[0].toISOString();
                    // Convert end date by adding 1 day and setting to midnight (start of the next day)
                    const endDateISO = addOneDay(selectedDates[1]).toISOString();
                    // Send the ISO-formatted date range to the backend
                    sendDateRange(startDateISO, endDateISO);
        
                    // Enable the Send Email button
                    document.querySelector('.planner-result').style.display = 'block';
                }
            },
            inline: true, // Inline calendar
            static: true  // Always visible
        });
    
        function sendDateRange(startDateISO, endDateISO) {
            fetch('/api/medications/usage', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    startDate: startDateISO,
                    endDate: endDateISO
                })
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                if (data && data.length > 0) { // Check if data is valid and not empty, then create the table
                    createPlannerTable(data);
                } else {
                    console.error('No data received or data is empty');
                }
            })
            .catch(error => {
                console.error('Error fetching medication data:', error);
            });
        }

        // Handle the Send Email button click
        document.getElementById('sendEmailBtn').addEventListener('click', () => {
            // Fetch SMTP settings before proceeding
            fetch('/api/smtp-settings')
                .then(response => {
                    if (!response.ok) {
                        return response.json(); // To handle error message in the response body
                    }
                    return response.json();
                })
                .then(smtpSettings => {
                    // If the backend returned the error message about missing SMTP settings
                    if (smtpSettings.message && smtpSettings.message === 'Unable to send e-mail, please configure SMTP server!') {
                        alert('Unable to send e-mail, please configure SMTP server!');
                        return; // Stop further execution if settings are incomplete
                    }
        
                    // If settings are valid, proceed with date validation
                    const selectedDates = flatpickrInstance.selectedDates; // Get selected dates directly from flatpickr instance
        
                    if (selectedDates.length === 2) {
                        // Convert the selected dates to ISO format at local midnight
                        const startDateISO = selectedDates[0].toISOString();
                        const endDateISO = addOneDay(selectedDates[1]).toISOString();
        
                        // Send the dates to the backend
                        fetch('/api/send-planner-email', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                startDate: startDateISO,
                                endDate: endDateISO
                            })
                        })
                        .then(response => {
                            if (!response.ok) {
                                throw new Error('Network response was not ok');
                            }
                            return response.json();
                        })
                        .then(data => {
                            alert(data.message || 'Email sent successfully'); // Show a confirmation message to the user
                        })
                        .catch(error => {
                            console.error('Error:', error);
                            alert('Error sending email'); // Optional error message
                        });
                    } else {
                        console.error('Please select both start and end dates.');
                        alert('Please select both start and end dates.'); // Optional alert for user feedback
                    }
                })
                .catch(error => {
                    console.error('Error fetching SMTP settings:', error);
                    alert('Error fetching SMTP settings');
                });
        });
        
    
        function createPlannerTable(data) {
            // Get the container where the table will be placed
            const tableContainer = document.getElementById('plannerTableContainer');
        
            // Clear previous content if it exists
            tableContainer.innerHTML = '';
        
            // Create a div with the 'table-container' class
            const tableWrapper = document.createElement('div');
            tableWrapper.classList.add('table-container'); // Add 'table-container' class
        
            // Create the table element
            const table = document.createElement('table');
            table.classList.add('planner-table'); // Add your own styling class if necessary
        
            // Create the table header
            const header = document.createElement('thead');
            const headerRow = document.createElement('tr');
        
            const nameHeader = document.createElement('th');
            nameHeader.textContent = 'Name';
            headerRow.appendChild(nameHeader);
        
            const usageHeader = document.createElement('th');
            usageHeader.textContent = 'Amount Needed';
            headerRow.appendChild(usageHeader);
        
            const enoughHeader = document.createElement('th');
            enoughHeader.textContent = 'In Stock';
            headerRow.appendChild(enoughHeader);
        
            header.appendChild(headerRow);
            table.appendChild(header);
        
            // Create the table body
            const tableBody = document.createElement('tbody');
        
            // Loop through the data and create a row for each medication
            data.forEach(medication => {
                if (medication.plannerUsage > 0) {
                    const row = document.createElement('tr');
        
                    const nameCell = document.createElement('td');
                    nameCell.textContent = medication.medication_name;
                    row.appendChild(nameCell);
        
                    const usageCell = document.createElement('td');
                    usageCell.textContent = medication.plannerUsage;
                    row.appendChild(usageCell);
        
                    const enoughCell = document.createElement('td');
                    enoughCell.textContent = medication.plannerEnough ? 'Yes' : 'Not Enough!';
                    row.appendChild(enoughCell);
        
                    tableBody.appendChild(row);
                }
            });
        
            // Append the body to the table
            table.appendChild(tableBody);
        
            // Append the table to the table-wrapper div
            tableWrapper.appendChild(table);
        
            // Append the table-wrapper to the main container
            tableContainer.appendChild(tableWrapper);
        }
    }

    // Do this for Settings
    if (settingsForm) {
        // Fetch SMTP settings from the backend
        function fetchSmtpSettings() {
            fetch('/api/all-settings')
                .then(response => response.json())
                .then(data => {
                    populateForm(data); // Populate the form with the fetched data
                    updateLabels(data); // Update labels with fetched values
                })
                .catch(error => {
                    console.error('Error fetching SMTP settings:', error);
                });
        }
    
        // Populate the form with fetched data or default values
        function populateForm(data) {
            const defaultSettings = {
                username: 'User',
                cron_enabled: false,
                min_days_left: 10,
                email_send_time: '07:00', // Default time is in HH:MM format
                email_delay_days: 1,
                smtp_host: 'smtp.gmail.com',
                smtp_port: 587,
                smtp_user: '',
                smtp_pass: '', // Assuming password should not be pre-filled for security reasons
                recipient_email: '',
            };
    
            // Split the email_send_time into hours and minutes
            const [hours, minutes] = (data.email_send_time || defaultSettings.email_send_time).split(':').map(num => num.padStart(2, '0'));
    
            // Fill the form with fetched data or default values
            document.getElementById('username').value = data.username !== undefined ? data.username : defaultSettings.username;
            document.getElementById('cron_enabled').checked = data.cron_enabled !== undefined ? data.cron_enabled : defaultSettings.cron_enabled;
            document.getElementById('min_days_left').value = data.min_days_left ?? defaultSettings.min_days_left;
            document.getElementById('email_send_time_hours').value = hours ?? 7; // Default to 7 if no value
            document.getElementById('email_send_time_minutes').value = minutes ?? 0; // Default to 0 if no value
            document.getElementById('email_delay_days').value = data.email_delay_days ?? defaultSettings.email_delay_days;
            document.getElementById('smtp_host').value = data.smtp_host ?? defaultSettings.smtp_host;
            document.getElementById('smtp_port').value = data.smtp_port ?? defaultSettings.smtp_port;
            document.getElementById('smtp_user').value = data.smtp_user ?? defaultSettings.smtp_user;
            document.getElementById('smtp_pass').value = ''; // Keep password field empty for security
            document.getElementById('recipient_email').value = data.recipient_email ?? defaultSettings.recipient_email;            
        }
    
        // Update labels based on fetched data or default values
        function updateLabels(data) {
            const minDaysLeftInput = document.getElementById('min_days_left');
            const emailSendTimeHoursInput = document.getElementById('email_send_time_hours');
            const emailSendTimeMinutesInput = document.getElementById('email_send_time_minutes');
            const emailDelayDaysInput = document.getElementById('email_delay_days');
    
            const minDaysLabel = document.getElementById('minDaysLabel');
            const emailSendTimeLabel = document.getElementById('emailSendTimeLabel');
            const emailRepeatLabel = document.getElementById('emailRepeatLabel');
    
            // Default values from fetched data or defaults
            const minDaysValue = data.min_days_left || 10;
            const sendTimeValue = data.email_send_time || '07:00';
            const delayDaysValue = data.email_delay_days || 1;
    
            // Set default labels
            minDaysLabel.textContent = `If Days Left ≤ ${minDaysValue}`;
            emailSendTimeLabel.textContent = `Send @${sendTimeValue}`;
            emailRepeatLabel.textContent = delayDaysValue === 1 ? 'Every Day' : `Every ${delayDaysValue} Days`;
    
            // Update labels on input change
            minDaysLeftInput.addEventListener('input', () => {
                minDaysLabel.textContent = `If Days Left ≤ ${minDaysLeftInput.value}`;
            });
    
            // Event listeners for the time input fields
            emailSendTimeHoursInput.addEventListener('input', updateTimeLabel);
            emailSendTimeMinutesInput.addEventListener('input', updateTimeLabel);
    
            // Update the time label when either HH or MM changes
            function updateTimeLabel() {
                const hours = emailSendTimeHoursInput.value.padStart(2, '0'); // Ensure 2 digits
                const minutes = emailSendTimeMinutesInput.value.padStart(2, '0'); // Ensure 2 digits
                emailSendTimeLabel.textContent = `Send @${hours}:${minutes}`;
            }
    
            emailDelayDaysInput.addEventListener('input', () => {
                const delayDaysValue = emailDelayDaysInput.value;
                emailRepeatLabel.textContent = delayDaysValue === '1' ? 'Every Day' : `Every ${delayDaysValue} Days`;
            });
        }
    
        // Fetch the settings when the page loads
        fetchSmtpSettings();
    
        // Handle form submission
        settingsForm.addEventListener('submit', function(event) {
            event.preventDefault(); // Prevent default form submission
    
            // Create a FormData object to get the form values
            const formData = new FormData(settingsForm);
    
            // Convert FormData to JSON
            const data = Object.fromEntries(formData.entries());
            data.cron_enabled = settingsForm.cron_enabled.checked ? 1 : 0;
    
            // Combine the hours and minutes into a single string for email_send_time
            data.email_send_time = `${data.email_send_time_hours.padStart(2, '0')}:${data.email_send_time_minutes.padStart(2, '0')}`;
    
            // Send the data to the backend
            fetch(settingsForm.action, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            })
            .then(response => {
                if (!response.ok) throw new Error('Network response was not ok');
                return response.json(); // Parse as JSON
            })
            .then(responseData => {
                alert(responseData.message); // Show success message from server
                fetchSmtpSettings(); // Refresh settings after saving
            })
            .catch(error => {
                console.error('Error saving SMTP settings:', error);
                alert('Failed to save settings.');
            });
        });
    }

    // DO THIS FOR ALL PAGES (TO HIDE TITLE WHEN SCROLLING)
    if (topTitle) {
        window.addEventListener('scroll', () => {
            const titleRect = topTitle.getBoundingClientRect();
            
            // Check if top-title is out of view (below the top of the viewport)
            if (titleRect.top < 0) {
                logo.textContent = topTitle.textContent;  // Change logo text to the title
                logo.classList.add('non-bold'); // Make it non-bold
            } else {
                logo.textContent = 'MedAssist';  // Revert back to 'MedAssist'
                logo.classList.remove('non-bold'); // Make it bold again
            }
        });
    }

});


let startX = 0;  // Track the X coordinate where the swipe started
let isSwiping = false;  // Track if the user is performing a swipe action

// Set up the event listeners for swipe detection
document.addEventListener('touchstart', handleTouchStart);
document.addEventListener('touchmove', handleTouchMove);
document.addEventListener('touchend', handleTouchEnd);

/* Open the side navigation */
function openNav() {
    document.getElementById("mySidenav").style.width = "270px";

    // Delay adding the event listener to prevent immediate closing
    setTimeout(() => {
        document.addEventListener('click', closeOnOutsideClick);
    }, 100);  // Delay by 100 milliseconds
}

/* Close the side navigation */
function closeNav() {
    document.getElementById("mySidenav").style.width = "0";

    // Remove the event listener when the navigation is closed
    document.removeEventListener('click', closeOnOutsideClick);
}

/* Close side navigation if clicked outside */
function closeOnOutsideClick(event) {
    const sidenav = document.getElementById("mySidenav");

    // Check if sidenav is open (width is not 0)
    if (sidenav.style.width !== "0px" && sidenav.style.width !== "") {
        // If the click is outside the sidenav and not on the button that opens it
        if (!sidenav.contains(event.target) && event.target !== document.querySelector(".openNavButton")) {
            closeNav();
        }
    }
}

/* Handle touch start event */
function handleTouchStart(event) {
    startX = event.touches[0].clientX;
    isSwiping = startX < 30;  // Start swipe if it's within 30px from the left edge
}

/* Handle touch move event */
function handleTouchMove(event) {
    if (!isSwiping) return;  // Only proceed if swiping

    const touchX = event.touches[0].clientX;
    const swipeDistance = touchX - startX;

    // Open the nav if the swipe distance is sufficient
    if (swipeDistance > 100) {  // Swipe distance threshold for opening the nav
        openNav();
        isSwiping = false;  // Reset swiping status after opening
    }
}

/* Handle touch end event */
function handleTouchEnd() {
    // Reset swiping state on touch end
    isSwiping = false;
}

// Get the current URL path
const currentPath = window.location.pathname;

// Remove leading '/' and get the last part of the path
let pageName = currentPath.substring(currentPath.lastIndexOf('/') + 1);

// Treat root URL (/) as index.html
if (pageName === '' || pageName === 'index.html') {
    pageName = 'index.html';
}

// Now apply the active class to the appropriate side navigation link
const navLinks = document.querySelectorAll('.sidenav a');
navLinks.forEach(link => {
    // Get the href attribute value and remove leading '/' if present
    let linkPage = link.getAttribute('href').replace('/', '');

    // Special case for external links like GitHub (skip them)
    if (linkPage.includes('http')) return;

    // Compare the current page with the link's href
    if (linkPage === pageName) {
        link.classList.add('active');
    } else {
        link.classList.remove('active');
    }
});

