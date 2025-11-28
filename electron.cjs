// main.js - Electron
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      // Permitir cargar la app desde Vercel
      webSecurity: true,
    },
    icon: path.join(__dirname, 'public/favicon.ico'),
    title: 'Sistema de Prácticas Pre Profesionales'
  });

  // URL de tu app en Vercel
  const APP_URL = 'https://sistema-practicas.vercel.app';
  
  mainWindow.loadURL(APP_URL);

  // Ocultar la barra de menú
  mainWindow.setMenuBarVisibility(false);

  // DevTools solo en desarrollo (comentar en producción)
  // mainWindow.webContents.openDevTools();

  // Manejar errores de carga
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('Error al cargar la aplicación:', errorCode, errorDescription);
    
    // Mostrar página de error
    mainWindow.loadURL(`data:text/html,
      <html>
        <body style="font-family: Arial; padding: 40px; text-align: center;">
          <h1>⚠️ Error de conexión</h1>
          <p>No se pudo conectar al sistema de prácticas.</p>
          <p>Por favor verifica tu conexión a internet.</p>
          <button onclick="location.reload()">Reintentar</button>
        </body>
      </html>
    `);
  });

  // Logs de consola (útil para debugging)
  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`[WEB CONSOLE] ${message}`);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});