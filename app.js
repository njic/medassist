const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const app = express();
const cron = require('node-cron');
const nodemailer = require('nodemailer');
// Replace '/app/medassist/medication.db' with './medication.db' for non docker (node.js) deployment
const db = new sqlite3.Database('./medication.db', sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } 
});

// Serve static files
app.use(express.static('public'));
app.use(express.json()); 
app.use(express.urlencoded({ extended: true })); 

// Function to convert 'YYYY-MM-DD HH:MM:SS' to 'DD.MM.'YY @HH:MM' in server's local time
const formatLocalDateTime = (isoDateString) => {
    // Try to create a Date object from the input string
    const date = new Date(isoDateString);

    // Check if the date is invalid (NaN) and return the original string if so
    if (isNaN(date)) {
        return isoDateString;
    }

    // Otherwise, format the valid date
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear()).slice(-2);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    // Return the formatted date string
    return `${day}.${month}.'${year} @${hours}:${minutes}`;
};

// Function to convert 'YYYY-MM-DD HH:MM:SS' to 'DD.MM.'YY in server's local time
const formatLocalDate = (isoDateString) => {
    const date = new Date(isoDateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear()).slice(-2);
    return `${day}.${month}.'${year}.`; // Local time is shown here
};

// Subtract 1 day for the Planner endDate
function subtractOneDay(date) {
    const newDate = new Date(date);
    newDate.setDate(newDate.getDate() - 1);
    return newDate;
}

// Create db table if not exists
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS list (
        medication_name TEXT UNIQUE,
        medication_count REAL,
        medication_usage TEXT,
        medication_every TEXT,
        medication_start TEXT,
        medication_update TEXT
    )`, (err) => {
        if (err) {
            console.error('Error creating table:', err.message);
        }
    });

    // Create a table to store the SMTP settings and email log
    db.run(`CREATE TABLE IF NOT EXISTS smtp (
        last_sent_time TEXT,
        smtp_host TEXT,
        smtp_port INTEGER,
        smtp_user TEXT,
        smtp_pass TEXT,
        cron_enabled INTEGER,
        email_send_time TEXT,
        email_delay_days INTEGER,
        recipient_email TEXT,
        username TEXT,
        min_days_left INTEGER
    )`, (err) => {
        if (err) {
            console.error('Error creating smtp table:', err.message);
        }
    });
});

// Add medication to database
app.post('/add-medication', (req, res) => {
    const { name, count, schedules } = req.body;

    // Check if the medication name already exists
    db.get(`SELECT medication_name FROM list WHERE medication_name = ?`, [name], (err, row) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Database error' });
        }

        // If the medication name exists, send a specific message
        if (row) {
            return res.status(400).json({ error: `Medication name "${name}" already exists` });
        }
        // Sort schedules by time
        const sortedSchedules = schedules.sort((a, b) => {
            // Extract time from 'YYYY-MM-DD HH:MM:SS'
            const timeA = a.start.split('T')[1].substring(0, 8); // Get 'HH:MM:SS'
            const timeB = b.start.split('T')[1].substring(0, 8); // Get 'HH:MM:SS'
            
            return timeA.localeCompare(timeB); // Compare times
        });

        // Prepare the arrays for usages, times, everys, and starts
        const usages = sortedSchedules.map(s => s.usage); // Ensure usage is stored as float
        const everys = sortedSchedules.map(s => s.every); 
        const starts = sortedSchedules.map(s => s.start); 

        // Store the current UTC date and time in ISO format for medication_update
        const currentUtcDateTime = new Date().toISOString(); // 'YYYY-MM-DDTHH:MM:SS.sssZ' format

        // Insert the new medication record with the UTC datetime
        db.run(
            `INSERT INTO list (medication_name, medication_count, medication_usage, medication_every, medication_start, medication_update)
            VALUES (?, ?, ?, ?, ?, ?)`,
            [name, count, JSON.stringify(usages), JSON.stringify(everys), JSON.stringify(starts), currentUtcDateTime],
            function (err) {
                if (err) {
                    console.error(err);
                    return res.status(500).json({ error: 'Database error' });
                }
                console.log(`${name} added successfully!`);
                res.status(200).json({ success: `${name} added successfully!` });
            }
        );
    });
});

// Update medication in the database
app.put('/update-medication', (req, res) => {
    const { name, count, schedules, oldName } = req.body;

    // Prepare the schedule data
    const usages = schedules.map(s => s.usage);
    const everys = schedules.map(s => s.every);
    const starts = schedules.map(s => s.start);

    // Update the medication
    db.run(`UPDATE list SET 
                medication_name = ?, 
                medication_count = ?, 
                medication_usage = ?, 
                medication_every = ?, 
                medication_start = ?, 
                medication_update = ? 
            WHERE medication_name = ?`,
        [
            name,
            count,
            JSON.stringify(usages),
            JSON.stringify(everys),
            JSON.stringify(starts),
            new Date().toISOString(),
            oldName],
        function (err) {
            if (err) {
                console.error(err);
                return res.status(500).json({ error: 'Database error' });
            }
            console.log(`${oldName} updated successfully!`);
            res.status(200).json({ success: `${oldName} updated successfully!`});
        }
    );
});

// Delete medication from database
app.delete('/delete-medication/:name', (req, res) => {
    const { name } = req.params;
    db.run(`DELETE FROM list WHERE medication_name = ?`, [name], function (err) {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Database error' });
        }
        console.log(`${name} deleted successfully!`);
        res.status(200).json({ success: `${name} deleted successfully!` });
    });
});

// Generate config table
function fetchAndCalculateMedications(callback) {
    const maxdays = 365; // Maximum days threshold
    db.all(`SELECT * FROM list`, [], (err, rows) => {
        if (err) {
            console.error(err);
            return callback(err, null); // Return error in callback
        }

        const medications = rows.map(med => {
            const usages = JSON.parse(med.medication_usage);
            const everys = JSON.parse(med.medication_every);
            const starts = JSON.parse(med.medication_start);

            let sumMedUsed = 0;
            const updateDateTime = new Date(med.medication_update);
            let orderBefore = null;
            let medsUsed = 0;
            let nowDateTime = new Date();
            let days = 0;
            let medicationCountExceeded = false;

            const allUsagesZero = usages.every(usage => usage === 0);

            if (allUsagesZero) {
                return {
                    ...med,
                    orderBefore: "∞",
                    daysLeft: "∞",
                    medsLeft: med.medication_count,
                };
            }

            while (!medicationCountExceeded) {
                let currentDateTime = new Date(updateDateTime);
                currentDateTime.setUTCDate(currentDateTime.getUTCDate() + days);

                // Break the loop if currentDateTime exceeds maxdays from nowDateTime
                if ((currentDateTime - nowDateTime) / (1000 * 60 * 60 * 24) > maxdays) {
                    orderBefore = "1+ Year"; // Set both values here
                    daysLeft = "365+";
                    break;
                }

                for (let i = 0; i < usages.length; i++) {
                    if (usages[i] === 0) continue;

                    let [startDate, startTime] = starts[i].split("T");
                    let [hours, minutes] = startTime.split(":").map(Number);
                    currentDateTime.setUTCHours(hours, minutes, 0, 0);

                    let medicationStartTime = new Date(starts[i]);
                    let medicationStartOffset = medicationStartTime.getTimezoneOffset();
                    let currentOffset = currentDateTime.getTimezoneOffset();

                    if (currentOffset !== medicationStartOffset) {
                        let timezoneOffset = (medicationStartOffset - currentOffset) / 60;
                        currentDateTime.setUTCHours(currentDateTime.getUTCHours() - timezoneOffset);
                    }

                    if (currentDateTime < updateDateTime) continue;

                    if (
                        currentDateTime >= medicationStartTime &&
                        (Math.round((currentDateTime - medicationStartTime) / (1000 * 60 * 60 * 24)) % everys[i] === 0)
                    ) {
                        if (sumMedUsed + usages[i] > med.medication_count) {
                            if (!orderBefore || currentDateTime < orderBefore) {
                                orderBefore = new Date(currentDateTime);
                            }
                            medicationCountExceeded = true;
                            break;
                        }

                        sumMedUsed += usages[i];
                        if (currentDateTime < nowDateTime) {
                            medsUsed = sumMedUsed;
                        }
                    }
                }

                days++;
            }

            const medsLeft = med.medication_count - medsUsed;

            // Final calculation for daysLeft
            const finalDaysLeft = orderBefore === "1+ Year" 
            ? "365+" 
            : orderBefore === "∞" 
                ? "∞" 
                : orderBefore 
                    ? Math.floor((new Date(orderBefore) - nowDateTime) / (1000 * 60 * 60 * 24)) 
                    : null;

            return {
                ...med,
                orderBefore: orderBefore,
                daysLeft: finalDaysLeft,  // Use finalDaysLeft here
                medsLeft: medsLeft,
            };
        });

        callback(null, medications);
    });
}

// Fetch config table
app.get('/fetchConfig', (req, res) => {
    fetchAndCalculateMedications((err, medications) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(medications);
    });
});

// Generate clockList
function createClockTable(callback) {
    db.all(`SELECT * FROM list`, [], async (err, rows) => {
        if (err) {
            console.error(err);
            return callback(err);
        }

        let totalClockListLength = 0; // Initialize total length counter

        const clockTablePromises = rows.map(async (med) => {
            const usages = JSON.parse(med.medication_usage);
            const everys = JSON.parse(med.medication_every);
            const starts = JSON.parse(med.medication_start);

            let sumMedUsed = 0;
            const updateDateTime = new Date(med.medication_update);

            // Define the oldest and newest days
            const oldestDay = new Date();
            oldestDay.setUTCDate(oldestDay.getUTCDate()); // Yesterday
            oldestDay.setUTCHours(0, 0, 0, 0); // 00:00

            const newestDay = new Date();
            newestDay.setUTCDate(newestDay.getUTCDate() + 3); // In 3 days
            newestDay.setUTCHours(0, 0, 0, 0); // 00:00 of the third day

            const clockList = [];
            let medicationCountExceeded = false;
            let days = 0;

            // Fetch and check orderBefore asynchronously
            const calculatedMed = await new Promise((resolve, reject) => {
                fetchAndCalculateMedications((err, medications) => {
                    if (err) return reject(err);
                    const medMatch = medications.find(m => m.medication_name === med.medication_name);
                    resolve(medMatch || {}); // Ensure we resolve to an empty object if no match
                });
            });

            const orderBefore = new Date(calculatedMed.orderBefore || 0);

            while (!medicationCountExceeded) {
                let currentDateTime = new Date(med.medication_update); // Start from the medication update date
                currentDateTime.setUTCDate(currentDateTime.getUTCDate() + days); // Increment days for each iteration

                if (currentDateTime > newestDay) {
                    break; // Stop looping if the current date exceeds the newest day
                }

                for (let i = 0; i < usages.length; i++) {
                    const [startDate, startTime] = starts[i].split("T");
                    const [hours, minutes] = startTime.split(":").map(Number);

                    currentDateTime.setUTCHours(hours, minutes, 0, 0); // Adjust time to match usage time
                    const medicationStartTime = new Date(starts[i]); // Parse medication start time
                    const medicationStartOffset = medicationStartTime.getTimezoneOffset();
                    const currentOffset = currentDateTime.getTimezoneOffset();

                    if (currentOffset !== medicationStartOffset) {
                        const timezoneOffset = (medicationStartOffset - currentOffset) / 60;
                        currentDateTime.setUTCHours(currentDateTime.getUTCHours() - timezoneOffset);
                    }

                    if (currentDateTime < oldestDay) {
                        continue; // Skip times before the oldest day
                    }

                    // Only add to clockList if usage is greater than 0
                    if (
                        currentDateTime >= medicationStartTime &&
                        (Math.round((currentDateTime - medicationStartTime) / (1000 * 60 * 60 * 24)) % everys[i] === 0)
                    ) {
                        if (usages[i] > 0) {  // Skip usage 0
                            if (sumMedUsed + usages[i] > med.medication_count) {
                                clockList.push({
                                    name: med.medication_name,
                                    usage: orderBefore <= currentDateTime ? 'X' : usages[i],
                                    scheduledTime: new Date(currentDateTime)
                                });

                                medicationCountExceeded = true;
                                break;
                            }

                            sumMedUsed += usages[i];
                            clockList.push({
                                name: med.medication_name,
                                usage: orderBefore <= currentDateTime ? 'X' : usages[i],
                                scheduledTime: new Date(currentDateTime)
                            });

                            // Check if the total length has reached 6 and break if so
                            totalClockListLength += 1;
                            if (totalClockListLength >= 12) {
                                return { clockList }; // Return clockList up to this point
                            }
                        }
                    }
                }

                days++; // Increment days after processing all usages for the current day
            }

            return { clockList };
        });

        const clockTable = await Promise.all(clockTablePromises);

        callback(null, clockTable); // Callback with the processed clockTable
    });
}


app.get('/fetchClockTable', (req, res) => {
    createClockTable((err, clockTable) => {
        if (err) {
            console.error("Error fetching clock table:", err);
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(clockTable); // Send the clock table as JSON to the frontend
    });
});

// Get list of low Stock
app.get('/medications/low-stock', (req, res) => {
    db.get(`SELECT min_days_left, username FROM smtp`, [], (err, row) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Database error' });
        }

        const minDaysLeft = row && row.min_days_left ? row.min_days_left : 10;
        const username = row && row.username ? row.username : 'User';

        fetchAndCalculateMedications((err, medications) => {
            if (err) {
                return res.status(500).json({ error: 'Database error' });
            }

            const lowStockMedications = medications.filter(med => med.daysLeft <= minDaysLeft);
            const names = lowStockMedications.map(med => med.medication_name); // Assuming each medication has a 'medication_name' property
            res.json({ names, username });
        });
    });
});

// Get list for Planner
app.post('/api/medications/usage', (req, res) => {
    const { startDate, endDate } = req.body;

    // Validate the received dates
    if (!startDate || !endDate) {
        return res.status(400).json({ error: 'Start date and end date are required' });
    }

    // Call your existing function with the date range
    fetchAndCalculateMedicationsByDateRange(startDate, endDate, (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Error fetching medication data' });
        }
        res.json(results);
    });
});

// Function to calculate medication for Planner
function fetchAndCalculateMedicationsByDateRange(startDate, endDate, callback) {
    const plannerStartDate = new Date(startDate);
    const plannerEndDate = new Date(endDate);

    // Call the original function to get all medication data, including orderBefore
    fetchAndCalculateMedications((err, medications) => {
        if (err) {
            return callback(err);
        }

        // Now you have access to orderBefore from the original function
        db.all(`SELECT * FROM list`, [], (err, rows) => {
            if (err) {
                console.error(err);
                return callback(err);
            }

            const medicationsWithPlannerData = rows.map((med, index) => {
                const orderBefore = medications[index].orderBefore; // Get the corresponding orderBefore from original function

                const usages = JSON.parse(med.medication_usage);
                const everys = JSON.parse(med.medication_every);
                const starts = JSON.parse(med.medication_start);

                let plannerUsage = 0;
                let plannerDateExceeded = false;

                for (let days = 0; !plannerDateExceeded && plannerStartDate <= plannerEndDate; days++) {
                    let currentDateTime = new Date(plannerStartDate);
                    currentDateTime.setUTCDate(currentDateTime.getUTCDate() + days);

                    for (let i = 0; i < usages.length; i++) {
                        let [startDate, startTime] = starts[i].split("T");
                        let [hours, minutes] = startTime.split(":").map(Number);
                        currentDateTime.setUTCHours(hours, minutes, 0, 0);

                        if (
                            currentDateTime >= new Date(starts[i]) &&
                            (Math.round((currentDateTime - new Date(starts[i])) / (1000 * 60 * 60 * 24)) % everys[i] === 0)
                        ) {
                            if (currentDateTime >= plannerStartDate && currentDateTime <= plannerEndDate) {
                                plannerUsage += usages[i];
                            }
                        }
                    }

                    if (currentDateTime > plannerEndDate) {
                        plannerDateExceeded = true;
                    }
                }

                // Compare plannerEndDate with orderBefore and set plannerEnough
                const plannerEnough = 
                    (orderBefore === "1+ Year" || orderBefore === "∞") || 
                    (orderBefore && plannerEndDate < orderBefore);

                return {
                    ...med,
                    plannerUsage: plannerUsage,
                    plannerEnough: plannerEnough
                };
            });

            callback(null, medicationsWithPlannerData);
        });
    });
}

// Function to render HTML table for Planner
function renderPlannerHtmlTable(medicationsWithPlannerData, medications, startDate, endDate, smtpConfig) {
    const displayUsername = smtpConfig.username || 'User';
    // Build the HTML content for the planner email
    const localStartDate = new Date(startDate);    
    const localEndDate = new Date(endDate);
    const numberOfDays = Math.round((localEndDate - localStartDate) / (24 * 60 * 60 * 1000));
    const dayLabel = numberOfDays === 1 ? 'day' : 'days';

    let tableHTML = `
        <p>Dear ${displayUsername},<br><br>Here is your medication usage plan for the period from ${formatLocalDate(localStartDate)} to ${formatLocalDate(subtractOneDay(localEndDate))} (${numberOfDays} ${dayLabel})<br>Make sure to bring these:</p>
        <table style="border: 1px solid gray; border-radius: 10px;">
            <thead>
                <tr>
                    <th style="text-align: right; padding: 5px 8px; vertical-align: bottom; border-bottom: 1px solid gray; background-color: #f2f2f2;">Name</th>
                    <th style="text-align: center; padding: 5px 8px; vertical-align: bottom; border-bottom: 1px solid gray; background-color: #f2f2f2;">Usage<br>Needed</th>
                    <th style="text-align: center; padding: 5px 8px; vertical-align: bottom; border-bottom: 1px solid gray; background-color: #f2f2f2;">Enough for<br> the Trip?</th>
                </tr>
            </thead>
            <tbody>
    `;

    // Add rows for each medication
    medicationsWithPlannerData.forEach(med => {
        if (med.plannerUsage === 0) return; // Skip rows with Usage Needed = 0
        const enoughStyle = med.plannerEnough ? '' : 'style="background-color: #ffcccc;"'; // Light red background for "Not Enough!"
        tableHTML += `
            <tr ${enoughStyle}>
                <td style="text-align: right; padding: 5px 8px;">${med.medication_name}</td>
                <td style="text-align: center; padding: 5px 8px;">${med.plannerUsage}</td>
                <td style="text-align: center; padding: 5px 8px;">${med.plannerEnough ? 'Yes' : 'Not Enough!'}</td>
            </tr>
        `;
    });

    // Close the usage plan table
    tableHTML += `
            </tbody>
        </table>
    `;

    // Calculate medications that need reordering
    const minDaysLeft = smtpConfig.min_days_left || 10; // Use 10 if not set
    const medsToReorder = medications.filter(med => med.daysLeft < minDaysLeft);
    const medNames = medsToReorder.map(med => med.medication_name);
    
    let reorderMessage = '';
    if (medNames.length > 1) {
        reorderMessage = `By the way, it is time to reorder ${medNames.slice(0, -1).join(', ')} & ${medNames[medNames.length - 1]}!`;
    } else if (medNames.length === 1) {
        reorderMessage = `By the way, it is time to reorder ${medNames[0]}!`;
    }

    // Add reorder message if there are medications to reorder
    if (reorderMessage) {
        tableHTML += `<p>${reorderMessage}</p>`;
    }

    // Sort medications by daysLeft (ascending)
    medications.sort((a, b) => {
        // Helper function for custom sorting
        const customSort = (val) => {
            if (val === "365+") return 1; // "365+" (1+ Year) should come after numbers
            if (val === "∞") return 2;    // "∞" should come last
            if (typeof val === "number") return 0; // Numbers are sorted normally
            return -1; // Invalid or unknown cases come first
        };
    
        const aSortValue = customSort(a.daysLeft);
        const bSortValue = customSort(b.daysLeft);
    
        // If both values are numbers, sort numerically
        if (aSortValue === 0 && bSortValue === 0) {
            return a.daysLeft - b.daysLeft;
        }
    
        // Otherwise, sort based on custom sort logic
        return aSortValue - bSortValue;
    });

    // Add Complete Medication Inventory section
    tableHTML += `
        <p>Your Complete Medication Inventory:</p>
        <table style="border: 1px solid gray; border-radius: 10px;">
            <thead>
                <tr>
                    <th style="text-align: right; padding: 5px 8px; vertical-align: bottom; border-bottom: 1px solid gray; background-color: #f2f2f2;">Name</th>
                    <th style="text-align: center; padding: 5px 8px; vertical-align: bottom; border-bottom: 1px solid gray; background-color: #f2f2f2;">Meds Left</th>
                    <th style="text-align: center; padding: 5px 8px; vertical-align: bottom; border-bottom: 1px solid gray; background-color: #f2f2f2;">Days Left</th>
                    <th style="text-align: center; padding: 5px 8px; vertical-align: bottom; border-bottom: 1px solid gray; background-color: #f2f2f2;">Order Before</th>
                </tr>
            </thead>
            <tbody>
    `;

    // Add rows for complete medication inventory
    medications.forEach(med => {
        const lowStyle = 
        (med.daysLeft !== "∞" && med.daysLeft !== "365+" && minDaysLeft >= med.daysLeft)
            ? 'style="background-color: #ffcccc;"'
            : '';
        tableHTML += `
            <tr ${lowStyle}>
                <td style="text-align: right; padding: 5px 8px;">${med.medication_name}</td>
                <td style="text-align: center; padding: 5px 8px;">${med.medsLeft}</td>
                <td style="text-align: center; padding: 5px 8px;">${med.daysLeft}</td>
                <td style="text-align: center; padding: 5px 8px;">${med.orderBefore ? formatLocalDateTime(med.orderBefore) : 'N/A'}</td>
            </tr>
        `;
    });
        // Get and format the current server time
        const serverTime = new Date();
        const formattedServerTime = formatLocalDateTime(serverTime);

    // Close the complete inventory table
    tableHTML += `
            </tbody>
        </table>
        <br>
        <div>Wherever you go, whatever you do, MediAssist will be there for you!<br>&#10084; &#9992; &#128663; &#128646; &#127956; &#10052; &#127938; &#127757;<br>Have an awesome trip!<br>Your MedAssist<br><br>Sent on: ${formattedServerTime}  (server time)</div>
    `;

    // Return the complete HTML string
    return tableHTML;
}

// Function to send planner email
function sendPlannerEmail(startDate, endDate) {
    // Fetch SMTP configuration from the 'smtp' table in your database
    db.get('SELECT * FROM smtp', (err, smtpConfig) => {
        if (err) {
            console.error('Error fetching SMTP configuration:', err.message);
            return;
        }

        // Fetch and calculate medications
        fetchAndCalculateMedications((err, medications) => {  // Note the change here
            if (err) {
                console.error('Error fetching medications:', err.message);
                return;
            }

            // Fetch and calculate medications by date range
            fetchAndCalculateMedicationsByDateRange(startDate, endDate, (err, medicationsWithPlannerData) => {
                if (err) {
                    console.error('Error fetching medications by date range:', err.message);
                    return;
                }

                // Generate the HTML table for the email
                const pillTableHTML = renderPlannerHtmlTable(medicationsWithPlannerData, medications, startDate, endDate, smtpConfig);

                // Set up Nodemailer transporter with SMTP settings
                const transporter = nodemailer.createTransport({
                    host: smtpConfig.smtp_host,
                    port: smtpConfig.smtp_port,
                    secure: smtpConfig.smtp_port === 465, // Use SSL if port is 465
                    auth: {
                        user: smtpConfig.smtp_user,
                        pass: smtpConfig.smtp_pass,
                    },
                });

                const formattedStartDate = formatLocalDate(startDate); // Format the start date
                const formattedEndDate = formatLocalDate(endDate); // Format the end date
                const dayDifference = Math.round((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24)); // Difference in days
                
                // Define email options
                const mailOptions = {
                    from: `"MedAssist" <${smtpConfig.smtp_user}>`,
                    to: smtpConfig.recipient_email,
                    subject: dayDifference === 1 
                        ? `Trip Planner - 1 day (${formattedStartDate})` 
                        : `Trip Planner - ${dayDifference} days (from ${formattedStartDate} to ${formattedEndDate})`, // Updated subject line based on condition
                    html: pillTableHTML,
                };

                // Send email
                transporter.sendMail(mailOptions, (err, info) => {
                    if (err) {
                        console.error('Error sending email:', err.message);
                    } else {
                        console.log('Planner email sent: %s', info.messageId);
                    }
                });
            });
        });
    });
}

// Create a route for sending the planner email
app.post('/api/send-planner-email', (req, res) => {
    const { startDate, endDate } = req.body;

    sendPlannerEmail(startDate, endDate);

    res.json({ message: 'e-mail sent successfully' });
});

// Variable to hold the current cron job
let cronJob = null;

// Function to start the cron job
function startCronJob(smtpConfig) {
    if (cronJob) {
        cronJob.stop(); // Stop any existing job before starting a new one
    }

    if (smtpConfig.cron_enabled === 1) {
        const emailSendTime = smtpConfig.email_send_time; // e.g., "09:46"
        const [hour, minute] = emailSendTime.split(':');

        cronJob = cron.schedule(`${minute} ${hour} * * *`, async () => {
            try {
                const lastSentTime = smtpConfig.last_sent_time;
                const now = new Date();
                const delayDaysInMs = smtpConfig.email_delay_days * 24 * 60 * 60 * 1000;

                // Check if the delay between emails has been respected with a 1-hour buffer
                if (!lastSentTime || (now - new Date(lastSentTime) >= delayDaysInMs - (1 * 60 * 60 * 1000))) {

                    // Fetch medications and calculate their status
                    fetchAndCalculateMedications((err, medications) => {
                        if (err) {
                            console.error('Error fetching medications:', err.message);
                            return;
                        }

                        const minDaysLeft = smtpConfig.min_days_left || 10; // Default to 10 if not set

                        // This condition triggers the cron job: check if there are meds below the threshold
                        const medsToReorder = medications.filter(med => med.daysLeft <= minDaysLeft);

                        // If there are any meds that need reordering (i.e., below minDaysLeft)
                        if (medsToReorder.length > 0) {
                            // Generate the full HTML table with all medications (not just the filtered ones)
                            const pillTableHTML = renderHtmlTable(medications, smtpConfig); // Use all medications here

                            // Send email logic here...
                            const transporter = nodemailer.createTransport({
                                host: smtpConfig.smtp_host,
                                port: smtpConfig.smtp_port,
                                secure: smtpConfig.smtp_port === 465,
                                auth: {
                                    user: smtpConfig.smtp_user,
                                    pass: smtpConfig.smtp_pass,
                                },
                            });

                            const now = new Date(); // Get the current date and time
                            const formattedDate = formatLocalDate(now.toISOString()); // Format the current date

                            transporter.sendMail({
                                from: `"MedAssist" <${smtpConfig.smtp_user}>`,
                                to: smtpConfig.recipient_email,
                                subject: `Reorder Reminder ${formattedDate}`,
                                html: pillTableHTML, // Send the full table
                            }, (err, info) => {
                                if (err) {
                                    console.error('Error sending email:', err.message);
                                } else {
                                    updateLastEmailSentTime();
                                    console.log('Email sent: %s', info.messageId);
                                }
                            });
                        } else {
                            console.log('No medications need reordering.');
                        }
                    });
                } else {
                    console.log(`Waiting ${smtpConfig.email_delay_days} days before sending the next email.`);
                }
            } catch (error) {
                console.error('Error fetching medications or sending email:', error.message);
            }
        });
    }
}

// HTML Table rendering
function renderHtmlTable(medications, smtpConfig) {
    const displayUsername = smtpConfig.username || 'User';
    const minDaysLeft = smtpConfig.min_days_left || 10; // Use 10 if not set
    const medsToReorder = medications.filter(med => med.daysLeft < minDaysLeft);
    const medNames = medsToReorder.map(med => med.medication_name);
    let tableHTML = ``;

    let reorderMessage = '';
    if (medNames.length > 1) {
        reorderMessage = `It is time to reorder ${medNames.slice(0, -1).join(', ')} & ${medNames[medNames.length - 1]}!`;
    } else if (medNames.length === 1) {
        reorderMessage = `It is time to reorder ${medNames[0]}!`;
    }

    // Add reorder message if there are medications to reorder
    if (reorderMessage) {
        tableHTML += `<p>Dear ${displayUsername},</p><p>${reorderMessage}</p>`;
    }

    // Sort medications by daysLeft (ascending)
    medications.sort((a, b) => {
        // Helper function for custom sorting
        const customSort = (val) => {
            if (val === "365+") return 1; // "365+" (1+ Year) should come after numbers
            if (val === "∞") return 2;    // "∞" should come last
            if (typeof val === "number") return 0; // Numbers are sorted normally
            return -1; // Invalid or unknown cases come first
        };

        const aSortValue = customSort(a.daysLeft);
        const bSortValue = customSort(b.daysLeft);

        // If both values are numbers, sort numerically
        if (aSortValue === 0 && bSortValue === 0) {
            return a.daysLeft - b.daysLeft;
        }

        // Otherwise, sort based on custom sort logic
        return aSortValue - bSortValue;
    });

    // Add Complete Medication Inventory section
    tableHTML += `
        <p>Your Complete Medication Inventory:</p>
        <table style="border: 1px solid gray; border-radius: 10px;">
            <thead>
                <tr>
                    <th style="text-align: right; padding: 5px 8px; vertical-align: bottom; border-bottom: 1px solid gray; background-color: #f2f2f2;">Name</th>
                    <th style="text-align: center; padding: 5px 8px; vertical-align: bottom; border-bottom: 1px solid gray; background-color: #f2f2f2;">Meds Left</th>
                    <th style="text-align: center; padding: 5px 8px; vertical-align: bottom; border-bottom: 1px solid gray; background-color: #f2f2f2;">Days Left</th>
                    <th style="text-align: center; padding: 5px 8px; vertical-align: bottom; border-bottom: 1px solid gray; background-color: #f2f2f2;">Order Before</th>
                </tr>
            </thead>
            <tbody>
    `;

    // Add rows for complete medication inventory
    medications.forEach(med => {
        const lowStyle = 
            (med.daysLeft !== "∞" && med.daysLeft !== "365+" && minDaysLeft >= med.daysLeft)
                ? 'style="background-color: #ffcccc;"'
                : '';
        tableHTML += `
            <tr ${lowStyle}>
                <td style="text-align: right; padding: 5px 8px;">${med.medication_name}</td>
                <td style="text-align: center; padding: 5px 8px;">${med.medsLeft}</td>
                <td style="text-align: center; padding: 5px 8px;">${med.daysLeft}</td>
                <td style="text-align: center; padding: 5px 8px;">${med.orderBefore ? formatLocalDateTime(med.orderBefore) : 'N/A'}</td>
            </tr>
        `;
    });
        // Get and format the current server time
        const serverTime = new Date();
        const formattedServerTime = formatLocalDateTime(serverTime);

    // Close the complete inventory table
    tableHTML += `
            </tbody>
        </table>
        <br>
        <div>Wherever you go, whatever you do, MediAssist will be there for you!<br>&#10084; &#128137; &#129465; &#128646; &#127956; &#10052; &#127938; &#127757;<br>Enjoy your drugs!<br>Your MedAssist<br><br>Sent on: ${formattedServerTime}  (server time)</div>
    `;

    // Return the complete HTML string
    return tableHTML;
}

// Function to update the last sent time in the database
function updateLastEmailSentTime() {
    const now = new Date();
    db.run('UPDATE smtp SET last_sent_time = ?', [now.toISOString()], (err) => {
        if (err) {
            console.error('Error updating last sent time:', err.message);
        }
    });
}

// Load the SMTP settings and start the cron job
function loadSmtpSettingsAndStartCron() {
    db.get('SELECT * FROM smtp LIMIT 1', (err, row) => {
        if (err) {
            console.error('Error fetching SMTP settings:', err.message);
        } else if (row) {
            startCronJob(row); // Start or stop the cron job based on the settings
        }
    });
}

// Update SMTP settings
app.post('/update-smtp-settings', (req, res) => {
    const { 
        smtp_host, 
        smtp_port, 
        smtp_user, 
        smtp_pass, 
        cron_enabled, 
        email_send_time,
        email_delay_days,
        recipient_email, 
        username, 
        min_days_left
    } = req.body;

    const cronStatus = cron_enabled ? 1 : 0; // Checkbox value (1 if checked, 0 if not)

    // Check if a row already exists
    db.get('SELECT * FROM smtp LIMIT 1', (err, row) => {
        if (err) {
            console.error('Error fetching SMTP settings:', err.message);
            return res.status(500).json({ message: 'Internal server error: Could not fetch SMTP settings' });
        }

        if (row) {
            // Prepare the update query
            const updateQuery = `
                UPDATE smtp 
                SET smtp_host = ?,
                    smtp_port = ?,
                    smtp_user = ?, 
                    smtp_pass = CASE WHEN ? = '' THEN smtp_pass ELSE ? END, 
                    cron_enabled = ?,
                    email_send_time = ?,
                    email_delay_days = ?,
                    recipient_email = ?,
                    username = ?, 
                    min_days_left = ?`;

            const params = [
                smtp_host, 
                smtp_port, 
                smtp_user, 
                smtp_pass,   // Check this value to decide whether to update
                smtp_pass,   // Actual value to set if not empty
                cronStatus, 
                email_send_time,
                email_delay_days,
                recipient_email, 
                username, 
                min_days_left
            ];

            db.run(updateQuery, params, (err) => {
                if (err) {
                    console.error('Error updating SMTP settings:', err.message);
                    return res.status(500).json({ message: 'Internal server error: Could not update SMTP settings' });
                }

                // Reload settings and start cron job
                loadSmtpSettingsAndStartCron();
                console.log(`Settings saved successfully!`);
                res.json({ message: 'Settings saved successfully!' });
            });
        } else {
            // Insert a new record if none exists
            db.run('INSERT INTO smtp (smtp_host, smtp_port, smtp_user, smtp_pass, cron_enabled, email_send_time, email_delay_days, recipient_email, username, min_days_left) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', 
                [
                    smtp_host,          // 1
                    smtp_port,          // 2
                    smtp_user,          // 3
                    smtp_pass,          // 4
                    cronStatus,         // 5
                    email_send_time,    // 6
                    email_delay_days || 1, // 7
                    recipient_email,     // 8
                    username || 'User',  // 9
                    min_days_left || 10, // 10
                ], 
                (err) => {
                    if (err) {
                        console.error('Error inserting SMTP settings:', err.message);
                        return res.status(500).json({ message: 'Internal server error: Could not insert SMTP settings' });
                    }

                    // Reload settings and start cron job
                    loadSmtpSettingsAndStartCron();
                    console.log(`Settings saved successfully!`);
                    res.json({ message: 'Settings saved successfully!' });
                });
        }
    });
});

// Load SMTP settings
app.get('/api/smtp-settings', (req, res) => {
    db.get('SELECT * FROM smtp LIMIT 1', (err, row) => {
        if (err) {
            console.error('Error fetching SMTP settings:', err.message);
            return res.status(500).json({ message: 'Internal server error: Could not fetch SMTP settings' });
        }

        // If the table is empty, return the warning message
        if (!row) {
            return res.status(400).json({ message: 'Unable to send e-mail, please configure SMTP server!' });
        }

        // If any required fields are empty, return the warning message
        if (
            !row.smtp_host || !row.smtp_port || !row.smtp_user || !row.smtp_pass || !row.recipient_email ||
            row.smtp_host.trim() === '' || row.smtp_user.trim() === '' || row.smtp_pass.trim() === '' || row.recipient_email.trim() === ''
        ) {
            return res.status(400).json({ message: 'Unable to send e-mail, please configure SMTP server!' });
        }

        // If everything is fine, return the SMTP settings with all columns
        res.json(row);
    });
});

// Fetch all settings
app.get('/api/all-settings', (req, res) => {
    db.get(`SELECT * FROM smtp`, [], (err, row) => {
        if (err) {
            console.error('Error fetching SMTP settings:', err.message);
            return res.status(500).json({ error: 'Database error' });
        }
        
        // If no settings exist, return an empty object
        const settings = row || {};
        res.json(settings);
    });
});

// Start the server on port
app.listen(3111, () => { 
    console.log('Server is running on http://localhost:3111');
});