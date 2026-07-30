const { app, BrowserWindow, dialog, ipcMain, shell, session } = require('electron');
const path = require('path');
const fs = require('fs');
const fsp = fs.promises;
const os = require('os');
const { pathToFileURL } = require('url');
const { execFile } = require('child_process');

const APP_ROOT = __dirname;
const DATA_ROOT = path.join(APP_ROOT, 'data');
const RUNTIME_ROOT = path.join(APP_ROOT, '.runtime');
const SETTINGS_FILE = path.join(DATA_ROOT, 'settings.json');
const INDEX_FILE = path.join(DATA_ROOT, 'media-index.json');
const VIDEO_EXTS = new Set(['.mp4','.mkv','.avi','.mov','.wmv','.m4v','.webm','.flv','.ts','.mts','.m2ts','.mpg','.mpeg','.vob','.ogv','.3gp','.asf','.rm','.rmvb','.divx']);
const IMAGE_EXTS = new Set(['.jpg','.jpeg','.png','.webp','.gif','.bmp','.tif','.tiff','.heic','.heif','.avif','.ico','.jfif']);
const SKIP_NAMES = new Set(['$recycle.bin','system volume information','$windows.~bt','$windows.~ws','recovery','windowsapps','node_modules','.runtime']);
let mainWindow = null;
let scanCancelled = false;
let scanRunning = false;

// Portable runtime paths: Electron must have a userData directory, so keep it inside
// the app folder and remove it on clean shutdown. No files are written to AppData.
fs.mkdirSync(RUNTIME_ROOT, { recursive: true });
app.setPath('userData', RUNTIME_ROOT);
app.setPath('sessionData', RUNTIME_ROOT);
app.commandLine.appendSwitch('disable-http-cache');
app.commandLine.appendSwitch('disk-cache-size', '1');
app.commandLine.appendSwitch('media-cache-size', '1');
app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');
app.commandLine.appendSwitch('disable-features', 'MediaSessionService,OptimizationHints,AutofillServerCommunication');

function ensureData() {
  fs.mkdirSync(DATA_ROOT, { recursive: true });
  if (!fs.existsSync(SETTINGS_FILE)) {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify({
      libraryFolders: [], privacyLock: true, autoplayMuted: true,
      skipSystemFolders: true, keepLightweightIndex: true
    }, null, 2));
  }
  if (!fs.existsSync(INDEX_FILE)) fs.writeFileSync(INDEX_FILE, '[]');
}
function readJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; }
}
function writeJsonAtomic(file, data) {
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data));
  // Windows rename-over-existing can fail. Remove only our own index/settings target.
  try { fs.renameSync(tmp, file); }
  catch {
    try { fs.copyFileSync(tmp, file); } finally { try { fs.unlinkSync(tmp); } catch {} }
  }
}
function cleanRuntime() {
  try { fs.rmSync(RUNTIME_ROOT, { recursive: true, force: true }); } catch {}
}
function createWindow() {
  ensureData();
  mainWindow = new BrowserWindow({
    width: 1580, height: 960, minWidth: 1080, minHeight: 680,
    backgroundColor: '#08090b', show: true, title: 'Girllover22 Cinema',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false, contextIsolation: true, sandbox: false,
      webSecurity: true, spellcheck: false,
      partition: 'g22cinema-memory-session'
    }
  });
  mainWindow.removeMenu();
  // Show the shell immediately. The previous build waited only for
  // ready-to-show, which could leave the process running with no visible window.
  mainWindow.loadFile('index.html').catch((error) => {
    console.error('Failed to load interface:', error);
    dialog.showErrorBox(
      'Girllover22 Cinema could not load',
      String(error?.message || error)
    );
  });

  mainWindow.webContents.on('did-finish-load', () => {
    if (!mainWindow.isVisible()) mainWindow.show();
    mainWindow.focus();
  });

  mainWindow.webContents.on(
    'did-fail-load',
    (_event, errorCode, errorDescription, validatedURL) => {
      console.error('Interface load failed:', errorCode, errorDescription, validatedURL);
      if (!mainWindow.isVisible()) mainWindow.show();
      dialog.showErrorBox(
        'Interface load failed',
        `${errorDescription} (${errorCode})\n${validatedURL}`
      );
    }
  );

  mainWindow.webContents.on('render-process-gone', (_event, details) => {
    console.error('Renderer stopped:', details.reason, details.exitCode);
    dialog.showErrorBox(
      'Girllover22 Cinema stopped unexpectedly',
      `Renderer: ${details.reason}\nExit code: ${details.exitCode}`
    );
  });

  mainWindow.on('unresponsive', () => {
    console.error('Application window became unresponsive.');
  });

  // Last-resort visibility safeguard.
  setTimeout(() => {
    if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.isVisible()) {
      mainWindow.show();
      mainWindow.focus();
    }
  }, 2500);
}
app.whenReady().then(async () => {
  app.setAppUserModelId('Girllover22.Cinema');
  try { await session.defaultSession.clearCache(); } catch {}
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on('before-quit', cleanRuntime);
app.on('window-all-closed', () => { cleanRuntime(); if (process.platform !== 'darwin') app.quit(); });

async function chooseFolder() {
  const res = await dialog.showOpenDialog(mainWindow, {
    title: 'Add a media folder or drive', properties: ['openDirectory']
  });
  if (res.canceled || !res.filePaths.length) return { canceled: true };
  const settings = readJson(SETTINGS_FILE, {});
  settings.libraryFolders = [...new Set([...(settings.libraryFolders || []), res.filePaths[0]])];
  writeJsonAtomic(SETTINGS_FILE, settings);
  return { canceled: false, folder: res.filePaths[0], settings };
}
function getWindowsDrives() {
  return new Promise((resolve) => {
    if (process.platform !== 'win32') {
      const roots = [os.homedir(), '/media', '/mnt', '/run/media'].filter(p => fs.existsSync(p));
      return resolve([...new Set(roots)]);
    }
    const script = "Get-CimInstance Win32_LogicalDisk | Where-Object {$_.DriveType -in 2,3} | Select-Object -ExpandProperty DeviceID";
    execFile('powershell.exe', ['-NoProfile','-NonInteractive','-Command',script], { windowsHide:true, timeout:10000 }, (err, stdout) => {
      if (err) return resolve(['C:\\']);
      resolve(stdout.split(/\r?\n/).map(x => x.trim()).filter(Boolean).map(x => `${x}\\`));
    });
  });
}

async function scanRoots(roots) {
  if (scanRunning) return { started:false, reason:'already-running' };
  scanRunning = true;
  scanCancelled = false;
  setImmediate(async () => {
    const started = Date.now();
    const settings = readJson(SETTINGS_FILE, {});
    const old = settings.keepLightweightIndex === false ? [] : readJson(INDEX_FILE, []);
    const oldMap = new Map(old.map(x => [x.path, x]));
    const found = [];
    const stack = roots.filter(Boolean).map(p => path.resolve(p));
    let folders=0, checked=0, videos=0, pictures=0, errors=0;
    let lastUpdate=0;
    try {
      while (stack.length && !scanCancelled) {
        const dir = stack.pop(); folders++;
        let entries;
        try { entries = await fsp.readdir(dir, { withFileTypes:true }); }
        catch { errors++; continue; }
        for (const entry of entries) {
          if (scanCancelled) break;
          const full = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            if (settings.skipSystemFolders !== false && SKIP_NAMES.has(entry.name.toLowerCase())) continue;
            stack.push(full); continue;
          }
          if (!entry.isFile()) continue;
          checked++;
          const ext = path.extname(entry.name).toLowerCase();
          const type = VIDEO_EXTS.has(ext) ? 'video' : IMAGE_EXTS.has(ext) ? 'picture' : null;
          if (!type) continue;
          let stat;
          try { stat = await fsp.stat(full); } catch { errors++; continue; }
          if (type === 'video') videos++; else pictures++;
          const previous = oldMap.get(full);
          found.push({
            path:full, url:pathToFileURL(full).href, name:entry.name, folder:dir,
            extension:ext, type, size:stat.size, modified:stat.mtimeMs,
            added:previous?.added || Date.now()
          });
          const now=Date.now();
          if (now-lastUpdate>250) {
            lastUpdate=now;
            mainWindow?.webContents.send('scan-progress', {
              folders,checked,found:found.length,videos,pictures,errors,
              elapsed:now-started,current:full
            });
            // Yield so the UI stays responsive on huge drives.
            await new Promise(resolve => setImmediate(resolve));
          }
        }
      }
      found.sort((a,b)=>b.modified-a.modified);
      if (settings.keepLightweightIndex !== false) writeJsonAtomic(INDEX_FILE, found);
      else writeJsonAtomic(INDEX_FILE, []);
      const stats={folders,checked,found:found.length,videos,pictures,errors,elapsed:Date.now()-started};
      // Never send the whole library through an event; that was a likely crash source.
      mainWindow?.webContents.send('scan-complete',{cancelled:scanCancelled,stats});
    } catch (error) {
      mainWindow?.webContents.send('scan-error', { message:error?.message || String(error) });
    } finally {
      scanRunning = false;
    }
  });
  return { started:true };
}

ipcMain.handle('settings:get',()=>readJson(SETTINGS_FILE,{}));
ipcMain.handle('settings:save',(_e,s)=>{ writeJsonAtomic(SETTINGS_FILE,{...readJson(SETTINGS_FILE,{}),...s,privacyLock:true}); return true; });
ipcMain.handle('library:get',()=>readJson(INDEX_FILE,[]));
ipcMain.handle('folder:select',chooseFolder);
ipcMain.handle('drives:list',getWindowsDrives);
ipcMain.handle('scan:folders',async()=>{ const s=readJson(SETTINGS_FILE,{}); return scanRoots(s.libraryFolders||[]); });
ipcMain.handle('scan:all-drives',async()=>scanRoots(await getWindowsDrives()));
ipcMain.handle('scan:cancel',()=>{scanCancelled=true; return true;});
ipcMain.handle('path:show',(_e,p)=>shell.showItemInFolder(p));
ipcMain.handle('window:fullscreen',()=>{ if(!mainWindow)return false; mainWindow.setFullScreen(!mainWindow.isFullScreen()); return mainWindow.isFullScreen(); });
