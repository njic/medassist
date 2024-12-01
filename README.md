<div align="center">
  <img src="https://github.com/njic/medassist/blob/main/public/icons/logo-pills.svg?raw=true" width="100" title="MedAssist">
  <h1>MedAssist</h1>
  <p>self-hosted medication management software</p>
    <a href="https://volimandr.eu">Demo</a>
    ·
    <a href="https://github.com/njic/medassist">GitHub</a>
  </p>
</div>

MedAssist is a simple Node.js application made with love to help my partner manage their daily medications. It makes it easy to keep track of medication inventory and reorder on time by sending reminders. If you're unsure whether a dose was taken, just check the dashboard, and comparing the expected stock with the actual quantity can help confirm. For travel, MedAssist takes away the stress by generating a quick list of all necessary medications for the time you’ll be away.

Keep in mind I’m not a professional programmer, coding is just a hobby for me. Working on this project is a way for me to unwind on stressful days and spend some time doing something I enjoy. I’d be happy if anyone else finds it useful, but I’ll likely keep it going either way!

### ⚠️ Disclamer 

- Your health is your responsibility. Take it seriously and don’t rely on any app, especially not this one! I don't have a medical or programming degree, this app is made with more love than knowledge, it may have serious flaws.

- Follow your doctor’s instructions closely, keep track of your medication supply, and plan ahead for reordering.

- Think of this app as a helpful tool, but make all health decisions independently!

## Features
If you take at least one medication on a regular schedule, this app might be useful. But if you manage multiple medications with complex schedules, you might enjoy it even more.

- Track medication inventory and know exactly when to reorder
- Receive email reminders when supplies are low
- Generate a custom medication list for travel, including quantities needed for your chosen timeframe (optionally send by e-mail)
- Simple dashboard showing medication status and upcoming schedules
- User friendly web interface for easy medication management and configuration

## Instalation
### Docker container
Use provided docker-compose.yaml (modify time zone, port and volume path)

```
services:
  medassist:
    container_name: medassist
    image: ghcr.io/njic/medassist:latest
    restart: always
    environment:
      - TZ=Etc/UTC
    ports:
      - 3111:3111
    volumes:
      - /path/to/database/directory:/app/database
```
Alternatively user docker run command

```
docker run -p 3111:3111 -v /path/to/database/directory:/app/database --restart always -e TZ=Etc/UTC medassist
```

GUI is available on http://localhost:3111

### Node.js app

1. Download source code
2. Extract content to your project directory (make sure it includes ```public``` folder and ```app.js```)
3. Open directory in terminal and install dependencies by running ```npm install express sqlite3 node-cron nodemailer```
4. Finally start the application with ```node app.js```

## Demo

You can try application here: [Demo](https://volimandr.eu)

Demo was not working for some time because the server was running too many things for that amount of RAM. I have reinstalled OS and its running again.

Application doesn't have login and I'm not sure what to expect security wise, but that domain and server are not being used for anything else right now. It's running in docker container behind Nginx Proxy Manager. I might clear the databse from time to time, but feel free to play around.

## Screenshots and User Guide

### Dashboard
Dashboard provides a preview of all medication and upcoming schedules:


<img src="https://github.com/njic/medassist/blob/main/screenshots/scr_dashboard.png?raw=true" width="800">
<br><br>

- Reorder Reminder (visible only if inventory is low)
  - a list of medication with low Days Left (default is 10, but it can be modified in settings)
- Medication Overview (a list of all medication sorted by Days Left)
  - Name: medication name
  - Meds Left: current quantity
  - Days Left: number of days left before medication runs out
  - Resupply Before: date and time of first schedule with not enough medication
- Upcoming Schedules (schedules for today and tomorrow with possibility to expand)
  - Time: 24h format
  - Usage: symbolic quantity
  - Name: medication name
  - Date: DD.MM. format

### Config
This is the place where user can add or update/delete medication

<img src="https://github.com/njic/medassist/blob/main/screenshots/scr_config.png?raw=true" width="800">
<br><br>

- Add Medication form can be populated with medication name, quantity and schedule (one medication can have one or more schedules)
  - Name: unique medication name
  - Count: current quantity
  - Usage: amount of medication used at a time
  - Every: interval in days
  - Time: time when medication should be taken (24h format)
  - Start: date of first schedule (can be used to postpone first usage and to define schedule if Every ≠ 1)
  - Add Schedule Button (add more schedules)
  - Remove Button (remove a schedule)
  - Save Medication Button (submits changes to the database)
- Medication List is a table with full inventory data
  - Name: medication name
  - Meds Left: current quantity
  - Days Left: number of days left before medication runs out
  - Resupply Before: date and time of first schedule with not enough medication
  - Usage: amount of medication used at a time
  - Every: interval in days
  - Time: time when medication should be taken (24h format)
  - Starting From: date of first schedule
  - Last Updated → Count: date, time and medication quantity when last update was made
  - Actions:
    - Update Button (fills the form above)
    - Delete Button (deletes medication from database)

### Planner
Prepare for upcoming period like when traveling

<img src="https://github.com/njic/medassist/blob/main/screenshots/scr_planner.png?raw=true" width="800">
<br><br>

- select date range form
- a list of medication needed for that period of time
  - Name: medication name
  - Amount Needed: quantity needed for that period of time
  - In Stock: Yes if there is already enough medication in inventory
  - Send by e-mail Button (sends the table to email - must be configured in Settings)


### Settings
Application settings: when submitting changes, blank fields will not overwrite values in database

<img src="https://github.com/njic/medassist/blob/main/screenshots/scr_settings.png?raw=true" width="800">
<br><br>

- Username: used for dashboard and e-mail notifications (default: User)
- Configure e-mail notifications
  - Enamble/Disable Toggle
  - Min Days: set the minimum number of days left for medication that expires first to trigger notifications
  - Send Time: time at e-mail will be sent
  - Repeat: number of days between e-mails (to avoid too frequent e-mails)
- Configure SMTP server
  - SMTP Host
  - SMTP Port
  - SMTP Username
  - SMTP Password
  - Recipient Email: use multiple comma separated "," recipient e-mails

### More screenshots

<img src="https://github.com/njic/medassist/blob/main/screenshots/scr_update.png?raw=true" width="800">
<br><br>
<img src="https://github.com/njic/medassist/blob/main/screenshots/scr_mob_dashboard.png?raw=true" width="300">
<br><br>
<img src="https://github.com/njic/medassist/blob/main/screenshots/scr_mob_schedules.png?raw=true" width="300">
<br><br>
<img src="https://github.com/njic/medassist/blob/main/screenshots/scr_mail.png?raw=true" width="300">
<br><br>
<img src="https://github.com/njic/medassist/blob/main/screenshots/scr_planner_mail.png?raw=true" width="300">

## Backup
Make sure to sve database file ```medication.db``` somewhere safe

## Project Goals

 - Add option for usage = 0 -> DONE
 - Improve backend to avoid CPU/Memory issues -> DONE
 - Add multiple date/time formats -> Incoming feature
 - Add Login -> Incoming feature
 - Add Repeating prescriptions -> Considering implementation as new feature, but not priority for now since you can use a simple workaround (just create additional entry with Medication Count until prescription has to be updated, name that Medication like "medication_name Prescription")
 - Home Assistant support -> Possible in the future
 - FHIR Support -> Possible in the future

<div align="center">
  <h1></h1>
  <p>MedAssist<br/><br/>
    <a href="https://volimandr.eu">Demo</a>
    ·
    <a href="https://github.com/njic/medassist">GitHub</a>
  </p>

</div>
