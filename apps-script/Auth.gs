/**
 * Who is signed in, and what they may do.
 *
 * Google handles sign-in: the web app is deployed with "Who has access: Anyone
 * within Union College", so every visitor arrives with a verified @union.edu
 * account. This file maps that account to a role using the Access tab.
 * The browser never decides anything about permissions; every api() call
 * re-checks the role here on the server.
 */

function currentEmail_() {
  // Active user only. Never fall back to Session.getEffectiveUser(): the script
  // runs as the owner, so that would turn every visitor into the owner.
  return String(Session.getActiveUser().getEmail() || '').trim().toLowerCase();
}

function currentUser_() {
  var email = currentEmail_();
  if (!email) return null;
  if (CONFIG.OWNER_EMAILS.indexOf(email) !== -1) {
    return { email: email, name: 'Prof. Chandler', role: 'admin', spaces: ['*'], area: 'Program Director' };
  }
  if (!new RegExp('@' + CONFIG.DOMAIN.replace(/\./g, '\\.') + '$').test(email)) return null;

  var cache = CacheService.getScriptCache();
  var key = 'user:' + email;
  var hit = cache.get(key);
  if (hit) {
    var cached = JSON.parse(hit);
    return cached.role ? cached : null;
  }

  var user = null;
  var row = readRows_('Access').filter(function (r) {
    return String(r.email).trim().toLowerCase() === email;
  })[0];
  var role = row ? normalizeRole_(row.role) : '';
  if (row && role && bool_(row.active) && !expired_(row.expires)) {
    user = { email: email, name: String(row.name || ''), role: role, spaces: parseSpaces_(row.spaces), area: String(row.area || '') };
  }
  // Short cache so revoking access takes effect within a minute.
  cache.put(key, JSON.stringify(user || {}), 60);
  return user;
}

function normalizeRole_(v) {
  var s = String(v || '').toLowerCase().replace(/[\s_-]/g, '');
  if (s === 'admin') return 'admin';
  if (s === 'workstudy') return 'workstudy';
  if (s === 'user') return 'user';
  return '';
}

function parseSpaces_(v) {
  var s = String(v || '').toLowerCase().trim();
  if (!s) return [];
  if (s === '*' || s === 'all') return ['*'];
  var valid = spaceIds_();
  return s.split(/[,\s]+/).filter(function (x) { return valid.indexOf(x) !== -1; });
}

function expired_(v) {
  if (!v) return false;
  var d = new Date(v);
  if (isNaN(d.getTime())) return false;
  d.setHours(23, 59, 59, 999); // valid through the end of the expiry day
  return d.getTime() < Date.now();
}

function hasRole_(user, min) {
  return !!user && CONFIG.ROLES[user.role] >= CONFIG.ROLES[min];
}

function requireRole_(min) {
  var user = currentUser_();
  if (!user) throw userError_('Your account does not have access. Ask Prof. Chandler to add you.');
  if (!hasRole_(user, min)) throw userError_('Your role cannot do that.');
  return user;
}

function canUseSpace_(user, space) {
  return hasRole_(user, 'workstudy') || user.spaces.indexOf('*') !== -1 || user.spaces.indexOf(space) !== -1;
}

function forgetUser_(email) {
  CacheService.getScriptCache().remove('user:' + String(email).toLowerCase());
}

/** Writes and admin calls: cap how fast one account can change things. */
function rateLimit_(email) {
  var cache = CacheService.getScriptCache();
  var key = 'rate:' + email;
  var n = Number(cache.get(key) || 0) + 1;
  if (n > 40) throw userError_('Too many changes in a short time. Wait a few minutes and try again.');
  cache.put(key, String(n), 300);
}
