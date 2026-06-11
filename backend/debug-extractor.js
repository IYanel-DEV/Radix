/**
 * debug-extractor.js — Standalone ZIP extraction & binary scanner debugger.
 *
 * Isolates the exact logic from ServersService.createWithZip so we can
 * pinpoint filesystem or path-resolution failures on Windows.
 *
 * Usage:
 *   1. Place a game-server .zip named "test-server.zip" in this directory.
 *   2. Run: node debug-extractor.js
 *
 * Each step is independently try/caught with coloured console output.
 */

// ---------------------------------------------------------------------------
// Polyfill minimal path helpers (no TS, no NestJS, no import weirdness)
// ---------------------------------------------------------------------------
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

let AdmZip;
try {
  AdmZip = require('adm-zip');
} catch (e) {
  console.error('\n  [FATAL] adm-zip is not installed. Run: npm install adm-zip\n');
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Configuration – mirrors ServersService.createWithZip
// ---------------------------------------------------------------------------
const ROOT = path.resolve(__dirname, 'data');
const ZIP_PATH = path.join(__dirname, 'test-server.zip');

// The engine type to test – change this if your zip targets a different engine
const ENGINE_TYPE = process.argv[2] || 'godot';

// Pattern tables – mirrors ServersService.engineExecutables
const ENGINE_PATTERNS = {
  godot: ['godot_server.exe', 'godot.x86_64', 'server.x86_64', 'godot*', '*godot*'],
  unreal: ['UE4Server.exe', 'UE5Server.exe', 'GameServer.exe', 'YourProjectServer.exe', '*Server.exe'],
  unity:  ['UnityPlayer.exe', 'GameAssembly.dll', 'UnityPlayer.so'],
};

const UNREAL_BIN_DIRS = ['Binaries', 'Binaries/Win64', 'Binaries/Linux'];

// ---------------------------------------------------------------------------
// Colour helpers
// ---------------------------------------------------------------------------
const C = {
  reset: '\x1b[0m',
  red:   '\x1b[31m',
  green: '\x1b[32m',
  yellow:'\x1b[33m',
  cyan:  '\x1b[36m',
  white: '\x1b[37m',
  bold:  '\x1b[1m',
};

function ok(msg)  { console.log(`  ${C.green}[OK]${C.reset} ${msg}`); }
function warn(msg){ console.log(`  ${C.yellow}[WARN]${C.reset} ${msg}`); }
function fail(msg){ console.log(`  ${C.red}[FAIL]${C.reset} ${msg}`); }
function step(n, label){
  console.log(`\n${C.cyan}${C.bold}══════ STEP ${n}: ${label} ${C.reset}`);
}

// ---------------------------------------------------------------------------
// RECURSIVE FILE SCANNER — mirrors ServersService.findFileRecursive
// ---------------------------------------------------------------------------
function findFileRecursive(dir, targets) {
  try {
    if (!fs.existsSync(dir)) {
      warn(`Path does not exist: ${dir}`);
      return null;
    }
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      console.log(`    ${C.cyan}scan${C.reset} ${full}`);
      if (entry.isDirectory()) {
        const found = findFileRecursive(full, targets);
        if (found) return found;
      } else if (entry.isFile()) {
        const lower = entry.name.toLowerCase();
        for (const pattern of targets) {
          if (pattern.includes('*')) {
            const re = new RegExp(
              '^' + pattern.replace(/\*/g, '.*').replace(/\./g, '\\.') + '$',
              'i',
            );
            if (re.test(lower)) { ok(`Pattern "${pattern}" matched ${full}`); return full; }
          } else if (lower === pattern.toLowerCase()) {
            ok(`Exact match "${pattern}" → ${full}`);
            return full;
          }
        }
      }
    }
  } catch (err) {
    fail(`findFileRecursive threw: ${err.message}`);
    console.error(`    ${C.red}${err.stack}${C.reset}`);
  }
  return null;
}

// ---------------------------------------------------------------------------
// FALLBACK scanner — mirrors ServersService.findAnyExecutable
// ---------------------------------------------------------------------------
function findAnyExecutable(dir) {
  try {
    if (!fs.existsSync(dir)) return null;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        const found = findAnyExecutable(full);
        if (found) return found;
      } else if (entry.isFile()) {
        const lower = entry.name.toLowerCase();
        if (lower.endsWith('.exe')) { ok(`Fallback .exe: ${full}`); return full; }
        if (!lower.includes('.'))   { ok(`Fallback extensionless: ${full}`); return full; }
      }
    }
  } catch (err) {
    fail(`findAnyExecutable threw: ${err.message}`);
    console.error(`    ${C.red}${err.stack}${C.reset}`);
  }
  return null;
}

// ---------------------------------------------------------------------------
// ROOT-FOLDER DETECTION — mirrors ServersService.resolveZipRoot
// ---------------------------------------------------------------------------
function resolveZipRoot(extractDir) {
  try {
    if (!fs.existsSync(extractDir)) return extractDir;
    const entries = fs.readdirSync(extractDir, { withFileTypes: true });
    const dirs  = entries.filter(e => e.isDirectory());
    const files = entries.filter(e => e.isFile());
    if (dirs.length === 1 && files.length === 0) {
      const nested = path.join(extractDir, dirs[0].name);
      warn(`Single subfolder detected – unwrapping: ${nested}`);
      const deeper = fs.readdirSync(nested, { withFileTypes: true });
      const deeperDirs  = deeper.filter(e => e.isDirectory());
      const deeperFiles = deeper.filter(e => e.isFile());
      if (deeperDirs.length >= 1 || deeperFiles.length >= 1) {
        return resolveZipRoot(nested);
      }
    }
  } catch (err) {
    fail(`resolveZipRoot threw: ${err.message}`);
    console.error(`    ${C.red}${err.stack}${C.reset}`);
  }
  return extractDir;
}

// ---------------------------------------------------------------------------
// SERVER-DIRECTORY RESOLUTION — mirrors ServersService.determineServerDirectory
// ---------------------------------------------------------------------------
function determineServerDirectory(exePath, root) {
  const exeDir = path.dirname(exePath);
  const rel = exeDir.replace(root, '').split(path.sep).filter(Boolean);
  const hasBinaries = rel.some(p => p.toLowerCase() === 'binaries');
  if (hasBinaries) {
    const idx = rel.findIndex(p => p.toLowerCase() === 'binaries');
    const keep = rel.slice(0, idx);
    return path.join(root, ...keep);
  }
  return exeDir;
}

// ---------------------------------------------------------------------------
// MAIN PIPELINE — mirrors ServersService.createWithZip
// ---------------------------------------------------------------------------
(async function main() {
  console.log(`\n${C.bold}${C.white}  SERVER PANEL EXTRACTION DEBUGGER${C.reset}`);
  console.log(`  Engine  : ${ENGINE_TYPE}`);
  console.log(`  Zip     : ${ZIP_PATH}`);
  console.log(`  Root    : ${ROOT}`);
  console.log(`  Dir     : ${__dirname}`);
  console.log(`  Platform: ${process.platform}\n`);

  // ---- STEP 1: Check zip exists -----------------------------------------
  step(1, 'CHECK TEST-SERVER.ZIP');
  let zipBuffer;
  try {
    if (!fs.existsSync(ZIP_PATH)) {
      fail(`File not found: ${ZIP_PATH}`);
      console.log(`\n  ${C.yellow}→ Place a file named "test-server.zip" in ${__dirname}${C.reset}\n`);
      process.exit(1);
    }
    zipBuffer = fs.readFileSync(ZIP_PATH);
    ok(`Read ${zipBuffer.length} bytes from ${path.basename(ZIP_PATH)}`);
  } catch (err) {
    fail(`readFileSync threw: ${err.message}`);
    console.error(`    ${C.red}${err.stack}${C.reset}`);
    process.exit(1);
  }

  // ---- STEP 2: Create extraction directory ------------------------------
  step(2, 'CREATE EXTRACTION DIRECTORY');
  const serverId = 'debug-' + Date.now();
  const serverDir = path.join(ROOT, 'servers', serverId);
  try {
    fs.mkdirSync(serverDir, { recursive: true });
    ok(`Created: ${serverDir}`);
  } catch (err) {
    fail(`mkdirSync threw: ${err.message}`);
    console.error(`    ${C.red}${err.stack}${C.reset}`);
    process.exit(1);
  }

  // ---- STEP 3: Extract ZIP via adm-zip ----------------------------------
  step(3, 'EXTRACT ZIP WITH ADM-ZIP');
  try {
    const zip = new AdmZip(zipBuffer);
    zip.extractAllTo(serverDir, true);
    ok(`Extracted to ${serverDir}`);
  } catch (err) {
    fail(`adm-zip extraction threw: ${err.message}`);
    console.error(`    ${C.red}${err.stack}${C.reset}`);
    process.exit(1);
  }

  // ---- STEP 3b: List extracted files (diagnostic) -----------------------
  step('3b', 'LIST EXTRACTED FILES');
  try {
    const walk = (dir, indent = '    ') => {
      const items = fs.readdirSync(dir, { withFileTypes: true });
      for (const item of items) {
        console.log(`${indent}${item.isDirectory() ? '[DIR] ' : '[FILE]'} ${item.name}`);
        if (item.isDirectory()) walk(path.join(dir, item.name), indent + '  ');
      }
    };
    walk(serverDir);
  } catch (err) {
    warn(`Could not list files: ${err.message}`);
  }

  // ---- STEP 4: Resolve zip root (unwrap single-folder) ------------------
  step(4, 'RESOLVE ZIP ROOT');
  let resolvedRoot = serverDir;
  try {
    resolvedRoot = resolveZipRoot(serverDir);
    ok(`Resolved root: ${resolvedRoot}`);
  } catch (err) {
    fail(`resolveZipRoot threw: ${err.message}`);
    console.error(`    ${C.red}${err.stack}${C.reset}`);
  }

  // ---- STEP 5: Engine binary scan ---------------------------------------
  step(5, `ENGINE BINARY SCAN (${ENGINE_TYPE})`);
  let executablePath = null;
  let serverDirectory = resolvedRoot;
  try {
    const patterns = ENGINE_PATTERNS[ENGINE_TYPE] || [];
    console.log(`    Patterns: ${patterns.join(', ')}`);
    executablePath = findFileRecursive(resolvedRoot, patterns);

    // Unreal-specific: check common binary directories
    if (!executablePath && ENGINE_TYPE === 'unreal') {
      for (const sub of UNREAL_BIN_DIRS) {
        const p = findFileRecursive(path.join(resolvedRoot, sub), patterns);
        if (p) { executablePath = p; break; }
      }
    }

    if (executablePath) {
      ok(`Executable found: ${executablePath}`);
      serverDirectory = determineServerDirectory(executablePath, resolvedRoot);
      ok(`Server directory: ${serverDirectory}`);
    } else {
      warn('No engine-specific executable found – trying fallback scan');
    }
  } catch (err) {
    fail(`Scanner threw: ${err.message}`);
    console.error(`    ${C.red}${err.stack}${C.reset}`);
  }

  // ---- STEP 6: Fallback scanner -----------------------------------------
  step(6, 'FALLBACK EXECUTABLE SCAN');
  if (!executablePath) {
    try {
      executablePath = findAnyExecutable(resolvedRoot);
      if (executablePath) {
        ok(`Fallback executable: ${executablePath}`);
        serverDirectory = determineServerDirectory(executablePath, resolvedRoot);
        ok(`Server directory: ${serverDirectory}`);
      } else {
        fail('No executable found by any scanner');
      }
    } catch (err) {
      fail(`Fallback scanner threw: ${err.message}`);
      console.error(`    ${C.red}${err.stack}${C.reset}`);
    }
  }

  // ---- SUMMARY -----------------------------------------------------------
  console.log(`\n${C.bold}${C.white}══════ SUMMARY ${C.reset}`);
  if (executablePath) {
    console.log(`  ${C.green}executablePath:${C.reset} ${executablePath}`);
    console.log(`  ${C.green}serverDirectory:${C.reset} ${serverDirectory}`);
  } else {
    console.log(`  ${C.red}executablePath: NOT FOUND${C.reset}`);
    console.log(`  ${C.yellow}serverDirectory:${C.reset} ${serverDirectory}`);
  }
  console.log(`  Extraction path: ${serverDir}`);
  console.log('');
})();
