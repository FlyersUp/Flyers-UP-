/**
 * Prepend message event listener to generated sw.js.
 * W3C requires: "Event handler of 'message' must be added on the initial evaluation of worker script."
 * next-pwa injects the custom worker via importScripts inside an async AMD callback, so the listener
 * is added too late. This script prepends it at the very top so it runs during initial evaluation.
 */
const fs = require('fs');
const path = require('path');

const SW_PATH = path.join(__dirname, '..', 'public', 'sw.js');
const PATCH = "self.addEventListener('message',function(){});";

try {
  if (fs.existsSync(SW_PATH)) {
    const content = fs.readFileSync(SW_PATH, 'utf8');
    if (!content.trimStart().startsWith("self.addEventListener('message'")) {
      fs.writeFileSync(SW_PATH, PATCH + content, 'utf8');
      console.log('[patch-sw] Prepended message listener to sw.js');
    }
  } else {
    console.warn('[patch-sw] sw.js not found (PWA may be disabled in dev)');
  }
} catch (err) {
  console.error('[patch-sw] Failed:', err.message);
  process.exit(1);
}
