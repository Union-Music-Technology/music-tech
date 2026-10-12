/**
 * Spreadsheet access, input validation, locking, and the audit log.
 * Every write goes through these helpers so cleaning and logging can't be skipped.
 */

function ss_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('This script must be bound to the portal spreadsheet (Extensions > Apps Script).');
  return ss;
}

function sheet_(name) {
  var sh = ss_().getSheetByName(name);
  if (!sh) throw userError_('The "' + name + '" tab is missing. Ask an admin to run setup.');
  return sh;
}

function headers_(sh) {
  return sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(function (h) { return String(h).trim(); });
}

/** Rows as objects keyed by header. Dates come back as ISO strings so they can cross google.script.run. */
function readRows_(name) {
  var sh = sheet_(name);
  if (sh.getLastRow() < 2) return [];
  var values = sh.getRange(1, 1, sh.getLastRow(), sh.getLastColumn()).getValues();
  var head = values.shift().map(function (h) { return String(h).trim(); });
  return values.map(function (r, i) {
    var o = { _row: i + 2 };
    head.forEach(function (h, j) { if (h) o[h] = plain_(r[j]); });
    return o;
  }).filter(function (o) {
    return head.some(function (h) { return h && o[h] !== ''; });
  });
}

function plain_(v) {
  return v instanceof Date ? v.toISOString() : v;
}

function appendRow_(name, obj) {
  var sh = sheet_(name);
  var head = headers_(sh);
  sh.appendRow(head.map(function (h) { return obj.hasOwnProperty(h) ? obj[h] : ''; }));
}

function updateRow_(name, rowNum, patch) {
  var sh = sheet_(name);
  var head = headers_(sh);
  var range = sh.getRange(rowNum, 1, 1, head.length);
  var row = range.getValues()[0];
  head.forEach(function (h, j) { if (patch.hasOwnProperty(h)) row[j] = patch[h]; });
  range.setValues([row]);
}

function deleteRow_(name, rowNum) {
  sheet_(name).deleteRow(rowNum);
}

function findBy_(name, key, value) {
  return readRows_(name).filter(function (r) { return String(r[key]) === String(value); })[0] || null;
}

function newId_(prefix) {
  return prefix + '-' + Utilities.getUuid().replace(/-/g, '').slice(0, 10).toUpperCase();
}

/** Runs fn while holding the script lock, so two people can't write the same rows at once. */
function withLock_(fn) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(15000)) throw userError_('The portal is busy. Try again in a moment.');
  try { return fn(); } finally { lock.releaseLock(); }
}

function audit_(me, action, target, details) {
  try {
    appendRow_('Audit', {
      timestamp: new Date(), email: me.email, role: me.role, action: action,
      target: clean_(target, 100), details: clean_(typeof details === 'string' ? details : JSON.stringify(details || {}), 2000)
    });
  } catch (e) { console.error('audit failed', e); }
}

/* ---------- Settings ---------- */

function settings_() {
  var cache = CacheService.getScriptCache();
  var hit = cache.get('settings');
  if (hit) return JSON.parse(hit);
  var out = {};
  CONFIG.DEFAULT_SETTINGS.forEach(function (d) { out[d[0]] = d[1]; });
  readRows_('Settings').forEach(function (r) { if (r.key) out[String(r.key).trim()] = r.value; });
  cache.put('settings', JSON.stringify(out), 60);
  return out;
}

/* ---------- Errors ---------- */

/** An error whose message is safe to show the user. Anything else is logged and replaced with a generic message. */
function userError_(msg) {
  var e = new Error(msg);
  e.userMessage = msg;
  return e;
}

/* ---------- Validation ---------- */

/**
 * Text going into a cell: strip control characters, trim, cap length, and
 * neutralize formula injection. A leading = + - @ would make Sheets evaluate
 * the text as a formula (e.g. =IMPORTXML to leak data), so prefix an apostrophe,
 * which Sheets stores as plain text and hides.
 */
function clean_(v, max) {
  var s = String(v == null ? '' : v)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .trim();
  if (max && s.length > max) s = s.slice(0, max);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return s;
}

function str_(v, max, label, required) {
  var s = clean_(v, max);
  if (required && !s) throw userError_(label + ' is required.');
  return s;
}

function oneOf_(v, list, label) {
  var s = String(v == null ? '' : v).trim().toLowerCase();
  if (list.indexOf(s) === -1) throw userError_('Choose a valid ' + label + '.');
  return s;
}

function num_(v, min, max, label) {
  var n = Number(v);
  if (v === '' || v == null || !isFinite(n) || n < min || n > max) {
    throw userError_(label + ' must be a number from ' + min + ' to ' + max + '.');
  }
  return n;
}

function bool_(v) {
  return v === true || v === 'true' || v === 'TRUE' || v === 1 || v === '1' || v === 'yes';
}

function dateStr_(v, label) {
  var s = String(v || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) throw userError_(label + ' must be a date.');
  return s;
}

function email_(v) {
  var s = String(v || '').trim().toLowerCase();
  var re = new RegExp('^[a-z0-9._%+-]+@' + CONFIG.DOMAIN.replace(/\./g, '\\.') + '$');
  if (!re.test(s)) throw userError_('Use a full @' + CONFIG.DOMAIN + ' email address.');
  return s;
}

function httpsUrl_(v) {
  var s = String(v || '').trim();
  return /^https:\/\/[^\s"'<>]+$/.test(s) ? s : '';
}

function spaceIds_() {
  return CONFIG.SPACES.map(function (s) { return s.id; });
}

function spaceName_(id) {
  var s = CONFIG.SPACES.filter(function (x) { return x.id === id; })[0];
  return s ? s.name : id;
}
