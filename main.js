const { app, BrowserWindow, Tray, Menu, Notification, dialog } = require('electron');
const fs = require('fs');
const os = require('os');
const zlib = require('zlib');
let lastNotification = 0;

if (!fs.existsSync(os.homedir() + "/.config")) fs.mkdirSync(os.homedir() + "/.config");

if (!fs.existsSync(os.homedir() + "/.config/derpier-database.dpiz")) {
    fs.writeFileSync(os.homedir() + "/.config/derpier-database.dpiz", zlib.deflateRawSync(JSON.stringify({
        ignored: [],
        entries: [],
        passed: [],
        characters: {},
        characterRefresh: 0,
        save: new Date().getTime(),
        last: 0,
        pid: -1
    })));
}

const createWindow = () => {
    if (global.mainWindow) return;
    app.dock.show();

    global.mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        title: "Derpier",
        maximizable: false,
        fullscreenable: false,
        titleBarStyle: "hiddenInset",
        resizable: false,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    mainWindow.loadFile('index.html');
    mainWindow.on('closed', () => {
        app.dock.hide();
        global.mainWindow = null;
    });
}

function notification() {
    if (new Date().getTime() - lastNotification >= 1800000) {
        let not = new Notification({
            title: "Your opinion helps improve our research",
            body: "Give your opinion about Derpibooru images to help train our AI model.",
            actions: [
                {
                    type: "button",
                    text: "Start"
                }
            ]
        });

        not.on('click', createWindow);
        not.on('action', createWindow);

        lastNotification = new Date().getTime();
        not.show();
    }
}

app.whenReady().then(() => {
    const db = JSON.parse(zlib.inflateRawSync(fs.readFileSync(os.homedir() + "/.config/derpier-database.dpiz")).toString());

    if (db['pid'] && db['pid'] > 1) {
        let alreadyRunning = false;

        try {
            process.kill(db['pid'], 0);
            alreadyRunning = true;
        } catch (e) {}

        if (alreadyRunning) {
            dialog.showMessageBoxSync({
                message: "Derpier is already running",
                type: "error",
                buttons: [ "Quit" ],
                detail: "Another instance of Derpier is already running with PID " + db['pid'] + ", please close this instance before opening a new one."
            });
            process.exit(1);
        }
    }

    db['pid'] = process.pid;
    fs.writeFileSync(os.homedir() + "/.config/derpier-database.dpiz", zlib.deflateRawSync(JSON.stringify(db)));

    app.dock.hide();

    setInterval(notification, 60000);

    const tray = new Tray(__dirname + '/tray/16x16Template@2x.png');

    const contextMenu = Menu.buildFromTemplate([
        { label: 'Open', click: createWindow },
        { label: 'Quit', role: 'quit' }
    ]);

    tray.setToolTip('Derpier');
    tray.setContextMenu(contextMenu);
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});