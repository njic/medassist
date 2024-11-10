<div align="center">
  <img src="https://github.com/njic/medassist/blob/main/public/icons/logo-pills.svg?raw=true" width="100" title="MedAssist">
  <h1>MedAssist</h1>
  <p>self-hosted medication managgement software</p><br>
</div>

This is just a brief description

### ⚠️ Disclamer 

- Your health is your responsibility. Take it seriously and don’t rely on any app—especially not this one! I don't have a medical or programming degree; this app is made with more love than skilly, it may have some serious flaws.

- Follow your doctor’s instructions closely, keep track of your medication supply, and plan ahead for reordering.

- Think of this app as a helpful tool, but make all health decisions independently!

## Features
If you are a person who take at least one medication at regular intervals, this application might be usefull. But if you have to deal with a lot of different medicaiton and complex schedules, you might enjoy it even more.

- track amount of medication left at any time
- receive e-mail reminder when it's time to reorder medication
- make a list of medication (with quantity) required for upcoming period (set by user) with possibility to send the list by e-mail
- dashboard with medication overview and upcoming schedules
- easy to use web GUI to manage medication inventory and change settings


## Demo

You can try application here: [Demo](https://volimandr.eu)

Application doesn't have login and I'm not sure what to expect security wise, but that domain and server are not being used for anything else right now. It's running in docker container behind Nginx Proxy Manager. I might clear databse from time to time, but feel free to play around.

## How to use & screenshots

### Dashboard
Dashboard provides preview of all medication and upcoming schedules:
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

<br>
<img src="https://github.com/njic/medassist/blob/main/screenshots/scr_dashboard.png?raw=true" width="700">

### Config
This is the place where user can add or update/delete medication:
- Add Medication form can be populated with medication name, quantity and schedule (one medication can have one or more schedules)
  - Name: unique medication name
  - Count: current quintity
  - Usage: amount of medication used at a time
  - Every: interval in days
  - Time: time when medication should be taken (24h format)
  - Start: date of first schedule (can be used to postpone first usage and to define schedule if Every ≠ 1)
  - Add Schedule Button (add more schedules)
  - Remove Button (remove schedule)
  - Save Medication Button (submits changes to database)
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

<br>
<img src="https://github.com/njic/medassist/blob/main/screenshots/scr_config.png?raw=true" width="700">

### Planner
To prepare for upcoming period like when user is traveling
- select date range form
- a list of medication needed for that period of time
  - Name: medication name
  - Amount Needed: quantity needed for that period of time
  - In Stock: Yes if there is already enough medication in inventory
  - Send by e-mail Button (sends the table to email - must be configured in Settings)

<br>
<img src="https://github.com/njic/medassist/blob/main/screenshots/scr_planner.png?raw=true" width="700">

### Settings
Settings

<br>
<img src="https://github.com/njic/medassist/blob/main/screenshots/scr_settings.png?raw=true" width="700">


<div align="center">
  <h1></h1>
  <p>MedAssist<br/><br/>
    <a href="https://volimandr.eu">Demo</a>
    ·
    <a href="https://github.com/njic/medassist">GitHub</a>
  </p>

</div>