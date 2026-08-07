const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

let win = null;
let miniPlayerWin = null;

function createWindow() {
    win = new BrowserWindow({
        width: 1200,
        height: 800,
        title: "Spotify True All-Time Top 100",
        webPreferences: {
            contextIsolation: true,
            nodeIntegration: false,
            preload: path.join(__dirname, 'preload.js')
        },
    });

    win.loadURL('http://127.0.0.1:5173');

    // Simge durumuna küçülme tetiklendiğinde
    win.on('minimize', (event) => {
        event.preventDefault(); // Pencerenin normal küçülmesini engelle
        win.hide();             // Ana pencereyi gizle
        createMiniPlayer();     // Mini oynatıcıyı aç
    });
}

function createMiniPlayer() {
    if (miniPlayerWin) {
        miniPlayerWin.show();
        return;
    }

    miniPlayerWin = new BrowserWindow({
        width: 320,
        height: 170,
        frame: false,            // Çerçevesiz (frameless) yapısı
        resizable: false,
        alwaysOnTop: true,       // Her zaman üstte
        transparent: true,       // Yuvarlatılmış köşeler için saydamlık
        webPreferences: {
            contextIsolation: true,
            nodeIntegration: false,
            preload: path.join(__dirname, 'preload.js')
        }
    });

    // React uygulamasını miniplayer modu parametresiyle yükle
    miniPlayerWin.loadURL('http://127.0.0.1:5173/?miniplayer=true');

    miniPlayerWin.on('closed', () => {
        miniPlayerWin = null;
    });
}

// IPC Kanalları ile Pencere Yönetimi
ipcMain.on('restore-main', () => {
    if (miniPlayerWin) {
        miniPlayerWin.close();
        miniPlayerWin = null;
    }
    if (win) {
        win.show();
        win.restore(); // Ana pencereyi simge durumundan çıkar ve göster
    }
});

ipcMain.on('close-app', () => {
    app.quit();
});

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});
