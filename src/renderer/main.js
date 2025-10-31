const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1000,
        height: 800,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        },
    });

    mainWindow.loadFile('index.html');
    
    // Open DevTools for debugging
    // mainWindow.webContents.openDevTools();
}

// IPC Handlers
ipcMain.handle('search-album', async (event, url) => {
    return new Promise((resolve, reject) => {
        const pythonPath = process.platform === 'win32' ? 'python' : 'python3';
        const scriptPath = path.join(__dirname, '..', 'python', 'scraper.py');
        
        console.log('Running Python script:', pythonPath, scriptPath, 'get_info', url);
        
        const pythonProcess = spawn(pythonPath, [scriptPath, 'get_info', url]);
        
        let dataBuffer = '';
        let stderrBuffer = '';
        
        pythonProcess.stdout.on('data', (data) => {
            dataBuffer += data.toString();
            const lines = dataBuffer.split('\n');
            
            // Process complete lines
            for (let i = 0; i < lines.length - 1; i++) {
                const line = lines[i].trim();
                if (!line) continue;
                
                try {
                    const message = JSON.parse(line);
                    console.log('Python message:', message);
                    
                    if (message.type === 'album_info') {
                        resolve(message.data);
                    } else if (message.type === 'error') {
                        reject(new Error(message.data));
                    }
                } catch (e) {
                    console.error('Failed to parse JSON:', line, e);
                }
            }
            
            // Keep the last incomplete line
            dataBuffer = lines[lines.length - 1];
        });
        
        pythonProcess.stderr.on('data', (data) => {
            stderrBuffer += data.toString();
            console.error(`Python stderr: ${data}`);
        });
        
        pythonProcess.on('close', (code) => {
            console.log(`Python process exited with code ${code}`);
            if (stderrBuffer) {
                console.error('Full stderr:', stderrBuffer);
            }
            if (code !== 0 && code !== null) {
                reject(new Error(`Python process exited with code ${code}`));
            }
        });
    });
});

ipcMain.handle('download-tracks', async (event, { url, trackIndices, outputDir }) => {
    return new Promise((resolve, reject) => {
        const pythonPath = process.platform === 'win32' ? 'python' : 'python3';
        const scriptPath = path.join(__dirname, '..', 'python', 'scraper.py');
        
        const args = [
            scriptPath,
            'download_selected',
            url,
            JSON.stringify(trackIndices)
        ];
        
        if (outputDir) {
            args.push(outputDir);
        }
        
        console.log('Running Python download:', pythonPath, ...args);
        
        const pythonProcess = spawn(pythonPath, args);
        
        let dataBuffer = '';
        let stderrBuffer = '';
        let hasStarted = false;
        
        pythonProcess.stdout.on('data', (data) => {
            dataBuffer += data.toString();
            const lines = dataBuffer.split('\n');
            
            for (let i = 0; i < lines.length - 1; i++) {
                const line = lines[i].trim();
                if (!line) continue;
                
                try {
                    const message = JSON.parse(line);
                    console.log('Python download message:', message);
                    
                    // Send progress updates to renderer
                    if (message.type === 'progress') {
                        event.sender.send('download-progress', message.data);
                    } else if (message.type === 'start') {
                        hasStarted = true;
                        event.sender.send('download-start', message.data);
                    } else if (message.type === 'complete') {
                        resolve(message.data);
                    } else if (message.type === 'error') {
                        reject(new Error(message.data));
                    } else if (message.type === 'warning') {
                        console.warn('Python warning:', message.data);
                        event.sender.send('download-warning', message.data);
                    }
                } catch (e) {
                    console.error('Failed to parse download JSON:', line, e);
                }
            }
            
            dataBuffer = lines[lines.length - 1];
        });
        
        pythonProcess.stderr.on('data', (data) => {
            stderrBuffer += data.toString();
            console.error(`Python download stderr: ${data}`);
        });
        
        pythonProcess.on('close', (code) => {
            console.log(`Python download process exited with code ${code}`);
            if (stderrBuffer) {
                console.error('Full stderr:', stderrBuffer);
            }
            
            if (code !== 0 && code !== null) {
                reject(new Error(`Python process exited with code ${code}. Check console for details.`));
            } else if (!hasStarted) {
                reject(new Error('Download did not start. Check if Python dependencies are installed.'));
            }
        });
    });
});

ipcMain.handle('select-directory', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory']
    });
    
    if (!result.canceled && result.filePaths.length > 0) {
        return result.filePaths[0];
    }
    return null;
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
