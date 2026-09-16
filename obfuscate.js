const fs = require('fs');
const path = require('path');
const JavaScriptObfuscator = require('javascript-obfuscator');
const ROOT_DIR = __dirname;
const SOURCE_DIR = path.join(ROOT_DIR, 'frontend');
const ASSETS_DIR = path.join(ROOT_DIR, 'frontend', 'MeterWebViewApp', 'android', 'app', 'src', 'main', 'assets');
const WWW_DIR = path.join(ASSETS_DIR, 'www');
const JS_FILES_TO_OBFUSCATE = ['app.js', 'api.js'];
const IGNORE_FOLDERS = [
  'node_modules', 
  'MeterWebViewApp',
  'backend', 
  'admin', 
  'build', 
  'dist', 
  '.git', 
  'ios',
  '__tests__',
  '.gradle'
];

const obfuscatorOptions = {
  compact: true,
  controlFlowFlattening: true,
  controlFlowFlatteningThreshold: 0.5,
  deadCodeInjection: false,
  stringArray: true,
  stringArrayEncoding: ['base64'],
  stringArrayThreshold: 0.75,
  renameGlobals: false,
  selfDefending: false,
  debugProtection: false,
  target: 'browser'
};

function obfuscateFile(srcFile, destFile) {
  try {
    const code = fs.readFileSync(srcFile, 'utf8');
    const result = JavaScriptObfuscator.obfuscate(code, obfuscatorOptions);
    fs.mkdirSync(path.dirname(destFile), { recursive: true });
    fs.writeFileSync(destFile, result.getObfuscatedCode(), 'utf8');
    console.log(`[OBF]  ${path.relative(ROOT_DIR, destFile)}`);
  } catch (err) {
    console.error(`Ошибка обфускации ${srcFile}:`, err.message);
    fs.mkdirSync(path.dirname(destFile), { recursive: true });
    fs.copyFileSync(srcFile, destFile);
  }
}

function copyFile(srcFile, destFile) {
  fs.mkdirSync(path.dirname(destFile), { recursive: true });
  fs.copyFileSync(srcFile, destFile);
  console.log(`[COPY] ${path.relative(ROOT_DIR, destFile)}`);
}

function getAllFiles(dir, fileList = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (IGNORE_FOLDERS.includes(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      getAllFiles(fullPath, fileList);
    } else {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

function process() {
  if (fs.existsSync(ASSETS_DIR)) {
    fs.rmSync(ASSETS_DIR, { recursive: true, force: true });
  }
  if (!fs.existsSync(SOURCE_DIR)) {
    console.error(`Папка исходников не найдена: ${SOURCE_DIR}`);
    process.exit(1);
  }
  for (const fileName of JS_FILES_TO_OBFUSCATE) {
    const srcFile = path.join(SOURCE_DIR, fileName);
    if (fs.existsSync(srcFile)) {
      obfuscateFile(srcFile, path.join(ASSETS_DIR, fileName));
      obfuscateFile(srcFile, path.join(WWW_DIR, fileName));
    } else {
      console.warn(`Файл не найден: ${srcFile}`);
    }
  }
  const allFiles = getAllFiles(SOURCE_DIR);
  for (const srcFile of allFiles) {
    const relativePath = path.relative(SOURCE_DIR, srcFile);
    const fileName = path.basename(srcFile);
    if (JS_FILES_TO_OBFUSCATE.includes(fileName)) continue;
    copyFile(srcFile, path.join(ASSETS_DIR, relativePath));
    copyFile(srcFile, path.join(WWW_DIR, relativePath));
  }
}

process();