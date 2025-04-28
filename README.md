# CycleSense

A comprehensive web and desktop application for tracking menstrual cycles and PMDD symptoms, designed to help users monitor their health patterns over time.

## Quick Start for New Users

### Portable Desktop App (Recommended)
- **Download:** Get the latest portable ZIP from GitHub Releases. (OR git clone below either works if clone skip to Run.)
- **Unzip:** Unzip anywhere (Desktop, USB drive, etc.).
- **Run:** `MakePortableExe.bat` (Will create a `Dist`)
- **Shortcut:** Make a shortcut to `CycleSense.exe` in the root for convenience. The main executable itself is located in the `dist` folder.
- **No installation required:** The app is fully self-contained. Delete the folder to remove all traces.
- **All data is stored locally** in the app `data` folder (unless you change settings).


### Web/Network Mode (Advanced/Legacy But also can use from your phone if you have the server on your PC)
**Requirements for web/server mode:**
- [Node.js](https://nodejs.org/) (version 14 or higher)
1. **Clone the repository:**
   ```
   git clone https://github.com/sammeh543/CycleTrackApp.git
   ```
2. **Install dependencies:**
   - Open a terminal in the project folder and run:
     ```
     npm install
     ```
3. **Start the app:**
   - **Run:** `MakePortableExe.bat` (Will create a `Dist`) If you  want to run the windows app.
   - **Windows:** Double-click `Start-CycleSense.bat` to launch the desktop app. For desktop development mode, use `Start-CycleSense-dev.bat`.
   - **Mac/Linux:** Run `./start.sh` in the terminal -kinda unfinished in terms of matching all the bat files.
   - **Broswer Server:** For browser-based hot reload server, use `start-broswer-dev.bat`. You will be able to access from your phone so long as your server is running on pc.
4. **To open the app in your browser:**
   - Go to [http://localhost:5000](http://localhost:5000) or your IP:5000


---

## Features

- **Cycle Tracking**: Monitor your menstrual cycle with phase calculations
- **Symptom Logging**: Track physical and emotional symptoms with customizable intensity
- **Medication Tracking**: Keep track of medications and supplements
- **Calendar View**: Visualize your cycle, symptoms, and fertility window
- **Data Analysis**: View statistics about your cycle and symptom patterns
- **Customizable**: Add custom symptoms and hide default ones that aren't relevant to you
- **Theme Support**: Choose from multiple color themes (Ocean, Beach, Starry, etc.)
- **Local Storage & Privacy**: All data is stored locally on your device for privacy
- **Robust Export/Import**: Export your data as CSV or JSON, and restore from backup via import in Settings

## Getting Started

The application will create a `data` folder to store your health information locally. No data is sent to external servers.

### Configuration (Web/Server Mode Only)

You can customize the application settings by editing the `config.json` file:

```json
{
  "dataPath": "./data",  // Where your data will be stored honestly can probably just leave it default just back it up
  "port": 5000,          // The port the app will run on
  "logLevel": "info",    // Logging detail level
  "backupInterval": 24,  // How often backups are made (hours)
  "maxBackups": 7        // Maximum number of backups to keep
}
```

## Using the Application

### Today View

The Today view allows you to track:
- Period status (spotting, light, medium, heavy)
- Mood
- Cervical mucus type
- Physical symptoms
- Emotional symptoms
- Medications
- Daily notes

### Calendar View

The Calendar view shows:
- Period days (red)
- Follicular phase (yellow)
- Ovulation/fertile window (blue)
- Luteal phase (purple)
- Days with recorded symptoms

### Analysis View

The Analysis view provides:
- Average cycle length
- Average period length
- Common symptoms
- Pattern detection


## PMDD Symptoms Toggle

- You can now choose whether to show or hide PMDD symptoms in the "Today" view via a toggle in App Settings.
- This preference is saved and persists across sessions and restarts.

## Data Export, Backup, and Restore

- Go to **Settings → Export & Backup** to download your data as CSV (for Excel) or a full JSON backup.
- To restore your data, use the **Import Backup (JSON)** option in Settings and select your backup file. 
  - HIGHLY RECCOMENDED TO RESET DATA BEFORE IMPORT TO AVOID BUGS
- All data stays on your device unless you choose to export it. No external servers are used.

## Privacy

This application values your privacy:
- All data is stored locally on your device
- No data is sent to external servers
- You control your data: export, backup, and restore at any time

## Network Access & IP Whitelisting (Web/Server Mode)

You can access the app from other devices (like your phone) on the same WiFi network `start-broswer-dev.bat` If you want a little security from other people on your wifi network but not much then follow the next steps:

### How to Find Your PC’s IP Address

- **Windows:**
  1. Press `Win + R`, type `cmd`, and press Enter to open Command Prompt.
  2. Type `ipconfig` and press Enter.
  3. Look for the `IPv4 Address` under your active network adapter (e.g., `192.168.1.70`).

- **Mac/Linux:**
  1. Open Terminal.
  2. Type `ifconfig` (or `ip a` on some Linux systems) and press Enter.
  3. Look for `inet` under your active network (e.g., `192.168.1.70`).

1. In `config.json`, set:
   ```json
   "ipWhitelistEnabled": true,
   "ipWhitelistFile": "./ip-whitelist.txt" // This should just be in the root folder always.
   ```
2. Add each allowed device's IP address to `ip-whitelist.txt` (one per line), Just edit the txt file in the root folder:
   ```
   127.0.0.1
   ::1
   192.168.1.70   # PC
   192.168.1.99   # Phone
   ```
3. Restart the server for changes to take effect.
4. **On your PC:** Open your browser to `http://localhost:5000`, or `http://<your-pc-ip>:5000` (e.g., `http://192.168.1.70:5000`)
5. **On your phone or another device:** Open your browser to `http://<your-pc-ip>:5000` (e.g., `http://192.168.1.70:5000`).
6. If your device's IP changes, update the whitelist and restart the server.

---

### Desktop Development

- **Electron Dev Mode:**
  - Use `Start-CycleSense-dev.bat` for live reload and console output in the desktop app.
- **Classic Web Dev:**
  - Use `start-broswer-dev.bat` for browser-based hot reload and network access.


---

CycleSense is now available as a native Windows desktop application, powered by Electron! This version bundles both the backend server and frontend UI for a seamless, all-in-one experience.

---

## Features
- All-in-one desktop experience: no server setup required
- Splash/loading screen for smooth startup
- Modern, themeable UI
- All data and settings remain local to your PC

---

## Network Access (Web/Server Mode)

If you want to access CycleSense from your phone or another device on your network:
- Run `start-broswer-dev.bat` as appropriate (see above for usage).
- Open a browser on your phone to `http://<your-pc-ip>:5000` (replace `<your-pc-ip>` with your PC's IP address).
- All original web/server features are still available when running in this mode.

 Otherwise just use `Start-CycleSense.bat`, `Start-CycleSense-dev.bat` for the portable version with no network access.

---

## Advanced
- To change the splash screen, edit `splash.html`.
- To customize Electron’s window or add features, edit `main.cjs`.

---

### Troubleshooting

- If you see a "Forbidden: Your IP is not whitelisted." message, make sure your current device's IP is in `ip-whitelist.txt` and restart the server.
- For import/export issues, always reset data before importing a backup.
- If the Electron app window is blank, wait a few seconds for the server to start.
- If you see errors, check the terminal for details.
- I can't offer much help but you can always ask AI lol.

---

CycleSense  sammeh543. Contributions welcome!
