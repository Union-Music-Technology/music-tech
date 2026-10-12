/**
 * One-time setup, run by the owner from the spreadsheet's "Music Tech" menu
 * or from the Apps Script editor.
 */

function onOpen() {
  SpreadsheetApp.getUi().createMenu('Music Tech')
    .addItem('Set up or repair tabs', 'setup')
    .addItem('Import equipment from the public site', 'seedEquipment')
    .addToUi();
}

/** These two are callable through google.script.run, so they check the caller themselves. */
function requireOwnerRun_() {
  var email = currentEmail_();
  if (CONFIG.OWNER_EMAILS.indexOf(email) === -1) throw new Error('Only the portal owner can run this.');
}

function setup() {
  requireOwnerRun_();
  var ss = ss_();

  Object.keys(CONFIG.SHEETS).forEach(function (name) {
    var head = CONFIG.SHEETS[name];
    var sh = ss.getSheetByName(name) || ss.insertSheet(name);
    if (sh.getLastRow() === 0) {
      sh.getRange(1, 1, 1, head.length).setValues([head]).setFontWeight('bold');
      sh.setFrozenRows(1);
    } else {
      // Add any columns introduced since the tab was created.
      var have = headers_(sh);
      head.filter(function (h) { return have.indexOf(h) === -1; }).forEach(function (h) {
        sh.getRange(1, sh.getLastColumn() + 1).setValue(h).setFontWeight('bold');
      });
    }
  });

  var have = readRows_('Settings').map(function (r) { return String(r.key); });
  CONFIG.DEFAULT_SETTINGS.forEach(function (d) {
    if (have.indexOf(d[0]) === -1) appendRow_('Settings', { key: d[0], value: d[1], notes: d[2] });
  });

  // Dropdowns and checkboxes so the Access tab is hard to fill in wrong.
  var access = ss.getSheetByName('Access');
  var col = function (h) { return headers_(access).indexOf(h) + 1; };
  var rows = Math.max(access.getMaxRows() - 1, 1);
  access.getRange(2, col('role'), rows).setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(Object.keys(CONFIG.ROLES), true).setAllowInvalid(false).build());
  access.getRange(2, col('active'), rows).insertCheckboxes();
  access.getRange(2, col('expires'), rows).setDataValidation(
    SpreadsheetApp.newDataValidation().requireDate().setAllowInvalid(false).build());
  access.getRange(1, col('spaces')).setNote('Comma-separated: ' + spaceIds_().join(', ') + ' — or * for all spaces.');

  var eq = ss.getSheetByName('Equipment');
  var eqCol = function (h) { return headers_(eq).indexOf(h) + 1; };
  var eqRows = Math.max(eq.getMaxRows() - 1, 1);
  eq.getRange(2, eqCol('status'), eqRows).setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(CONFIG.EQUIPMENT_STATUS, true).build());
  eq.getRange(2, eqCol('public'), eqRows).insertCheckboxes();

  var blank = ss.getSheetByName('Sheet1');
  if (blank && blank.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(blank);

  CacheService.getScriptCache().removeAll(['settings', 'feed:equipment']);
  return 'Setup complete.';
}

/** Imports data/site.json equipment from the public site into an empty Equipment tab. */
function seedEquipment() {
  requireOwnerRun_();
  if (readRows_('Equipment').length) throw new Error('The Equipment tab already has rows. Clear it first to re-import.');
  var res = UrlFetchApp.fetch(CONFIG.SITE_URL + 'data/site.json', { muteHttpExceptions: true });
  if (res.getResponseCode() !== 200) throw new Error('Could not load site.json (' + res.getResponseCode() + ').');
  var data = JSON.parse(res.getContentText());
  var me = { email: currentEmail_(), role: 'admin' };
  var spaces = spaceIds_();
  var n = 0;
  (data.equipment || []).forEach(function (it) {
    if (spaces.indexOf(it.space) === -1) return;
    appendRow_('Equipment', {
      id: newId_('EQ'), space: it.space, category: clean_(it.category, 60), name: clean_(it.name, 100),
      detail: clean_(it.detail, 200), qty: it.qty == null ? '' : Number(it.qty),
      status: CONFIG.EQUIPMENT_STATUS.indexOf(it.status) === -1 ? 'unverified' : it.status,
      'public': it['public'] !== false, condition: 'ok', updated_by: me.email, updated_at: new Date()
    });
    n++;
  });
  audit_(me, 'equipment.seed', 'site.json', { count: n });
  return 'Imported ' + n + ' items.';
}
