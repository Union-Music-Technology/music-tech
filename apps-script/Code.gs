/**
 * Music Tech Members portal: web entry points.
 *
 * Callable from outside: doGet (page loads), api (Api.gs), and the owner-only
 * setup and seedEquipment (Setup.gs). Functions whose names end in _ are
 * private: google.script.run cannot call them.
 */

function doGet(e) {
  var params = (e && e.parameter) || {};
  if (params.feed === 'equipment') return equipmentFeed_();

  var me = null;
  try { me = currentUser_(); } catch (err) { console.error(err); }
  var page = HtmlService.createTemplateFromFile(me ? 'Index' : 'Denied');
  page.email = currentEmail_();
  return page.evaluate()
    .setTitle(CONFIG.APP_NAME)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
  // Embedding stays blocked (the default X-Frame-Options), which prevents clickjacking.
}

function include_(name) {
  return HtmlService.createHtmlOutputFromFile(name).getContent();
}

/**
 * Read-only public list of confirmed, public equipment for the GitHub Pages site.
 * Only reachable from a separate deployment whose access is "Anyone"; see README.
 * Returns only display fields: no notes, people, or locations.
 */
function equipmentFeed_() {
  var cache = CacheService.getScriptCache();
  var body = cache.get('feed:equipment');
  if (!body) {
    var items = readRows_('Equipment')
      .filter(function (r) { return r.status === 'confirmed' && bool_(r['public']); })
      .map(function (r) {
        return { space: String(r.space), category: String(r.category), name: String(r.name),
                 detail: String(r.detail || ''), qty: r.qty === '' ? null : Number(r.qty), status: 'confirmed' };
      });
    body = JSON.stringify({ updated: new Date().toISOString(), items: items });
    cache.put('feed:equipment', body, 300);
  }
  return ContentService.createTextOutput(body).setMimeType(ContentService.MimeType.JSON);
}
