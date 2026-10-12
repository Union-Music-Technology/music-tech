/**
 * The portal's single server entry point. The browser calls
 *   google.script.run.api('actionName', payload)
 * and each action names the minimum role it needs. Handlers receive the
 * verified user and a payload they must validate; they never trust the client.
 */

function routes_() {
  return {
    bootstrap:          { role: 'user',      write: false, fn: bootstrap_ },
    listEquipment:      { role: 'user',      write: false, fn: listEquipment_ },
    saveEquipment:      { role: 'workstudy', write: true,  fn: saveEquipment_ },
    deleteEquipment:    { role: 'admin',     write: true,  fn: deleteEquipment_ },
    reportIssue:        { role: 'user',      write: true,  fn: reportIssue_ },
    listIssues:         { role: 'user',      write: false, fn: listIssues_ },
    updateIssue:        { role: 'workstudy', write: true,  fn: updateIssue_ },
    requestReservation: { role: 'user',      write: true,  fn: requestReservation_ },
    listReservations:   { role: 'user',      write: false, fn: listReservations_ },
    reviewReservation:  { role: 'workstudy', write: true,  fn: reviewReservation_ },
    cancelReservation:  { role: 'user',      write: true,  fn: cancelReservation_ },
    logHours:           { role: 'workstudy', write: true,  fn: logHours_ },
    listHours:          { role: 'workstudy', write: false, fn: listHours_ },
    saveAnnouncement:   { role: 'workstudy', write: true,  fn: saveAnnouncement_ },
    listAccess:         { role: 'admin',     write: false, fn: listAccess_ },
    saveAccess:         { role: 'admin',     write: true,  fn: saveAccess_ },
    listAudit:          { role: 'admin',     write: false, fn: listAudit_ }
  };
}

function api(action, payload) {
  try {
    var routes = routes_();
    if (typeof action !== 'string' || !routes.hasOwnProperty(action)) throw userError_('Unknown request.');
    var route = routes[action];
    var me = requireRole_(route.role);
    if (route.write) rateLimit_(me.email);
    var input = (payload && typeof payload === 'object' && !Array.isArray(payload)) ? payload : {};
    var result = route.write
      ? withLock_(function () { return route.fn(me, input); })
      : route.fn(me, input);
    return { ok: true, data: result === undefined ? null : result };
  } catch (e) {
    if (!e.userMessage) console.error(action, e && e.stack || e);
    return { ok: false, error: e.userMessage || 'Something went wrong. Try again, or tell Prof. Chandler if it keeps happening.' };
  }
}

/* ---------- Bootstrap ---------- */

function bootstrap_(me) {
  var s = settings_();
  var ws = hasRole_(me, 'workstudy');
  var admin = hasRole_(me, 'admin');
  var audienceOk = function (a) {
    a = String(a || 'all').toLowerCase();
    return a === 'all' || (a === 'workstudy' && ws) || (a === 'admin' && admin);
  };

  var announcements = readRows_('Announcements')
    .filter(function (r) { return bool_(r.active) && audienceOk(r.audience); })
    .sort(function (a, b) {
      return (bool_(b.pinned) - bool_(a.pinned)) || String(b.created_at).localeCompare(String(a.created_at));
    })
    .slice(0, 20)
    .map(function (r) {
      return { id: r.id, title: r.title, body: r.body, author: r.author, created_at: r.created_at,
               audience: r.audience, pinned: bool_(r.pinned), mine: r.author === me.email };
    });

  var links = readRows_('Links')
    .filter(function (r) { return audienceOk(r.audience) && httpsUrl_(r.url); })
    .map(function (r) { return { title: String(r.title), url: httpsUrl_(r.url), space: String(r.space || ''), notes: String(r.notes || '') }; });

  var team = ws ? readRows_('Access')
    .filter(function (r) { return bool_(r.active) && normalizeRole_(r.role) !== 'user' && !expired_(r.expires); })
    .map(function (r) { return { name: String(r.name || ''), email: String(r.email), area: String(r.area || ''), role: normalizeRole_(r.role) }; })
    : [];

  return {
    me: me,
    spaces: CONFIG.SPACES,
    areas: CONFIG.WORK_AREAS,
    lists: {
      equipmentStatus: CONFIG.EQUIPMENT_STATUS, equipmentCondition: CONFIG.EQUIPMENT_CONDITION,
      issueSeverity: CONFIG.ISSUE_SEVERITY, issueStatus: CONFIG.ISSUE_STATUS
    },
    reservations: {
      mode: String(s.reservations_mode),
      weeklyHourCap: Number(s.weekly_hour_cap),
      openHour: Number(s.open_hour),
      closeHour: Number(s.close_hour),
      maxBookingHours: Number(s.max_booking_hours),
      maxDaysAhead: Number(s.max_days_ahead),
      supervisionThreshold: Number(s.supervision_threshold),
      calendars: CONFIG.CALENDARS
        .filter(function (c) { return canUseSpace_(me, c.space); })
        .map(function (c) { return { key: c.key, name: c.name }; })
    },
    announcements: announcements,
    links: links,
    team: team
  };
}

/* ---------- Equipment ---------- */

function listEquipment_(me, p) {
  var ws = hasRole_(me, 'workstudy');
  var space = p.space ? oneOf_(p.space, spaceIds_(), 'space') : '';
  return readRows_('Equipment')
    .filter(function (r) { return (!space || r.space === space) && (ws || r.status === 'confirmed'); })
    .map(function (r) {
      var o = { id: r.id, space: r.space, category: r.category, name: r.name, detail: r.detail,
                qty: r.qty, status: r.status, condition: r.condition, location: r.location };
      if (ws) { o['public'] = bool_(r['public']); o.notes = r.notes; o.updated_by = r.updated_by; o.updated_at = r.updated_at; }
      return o;
    });
}

function saveEquipment_(me, p) {
  var item = {
    space: oneOf_(p.space, spaceIds_(), 'space'),
    category: str_(p.category, 60, 'Category', true),
    name: str_(p.name, 100, 'Name', true),
    detail: str_(p.detail, 200),
    qty: (p.qty === '' || p.qty == null) ? '' : num_(p.qty, 0, 999, 'Quantity'),
    status: oneOf_(p.status || 'unverified', CONFIG.EQUIPMENT_STATUS, 'status'),
    'public': bool_(p['public']),
    condition: oneOf_(p.condition || 'ok', CONFIG.EQUIPMENT_CONDITION, 'condition'),
    location: str_(p.location, 100),
    notes: str_(p.notes, 500),
    updated_by: me.email,
    updated_at: new Date()
  };
  var id;
  if (p.id) {
    var row = findBy_('Equipment', 'id', String(p.id));
    if (!row) throw userError_('That item no longer exists.');
    id = row.id;
    updateRow_('Equipment', row._row, item);
    audit_(me, 'equipment.update', id, item);
  } else {
    id = newId_('EQ');
    item.id = id;
    appendRow_('Equipment', item);
    audit_(me, 'equipment.create', id, item);
  }
  CacheService.getScriptCache().remove('feed:equipment');
  return { id: id };
}

function deleteEquipment_(me, p) {
  var row = findBy_('Equipment', 'id', String(p.id || ''));
  if (!row) throw userError_('That item no longer exists.');
  deleteRow_('Equipment', row._row);
  audit_(me, 'equipment.delete', row.id, { name: row.name, space: row.space });
  CacheService.getScriptCache().remove('feed:equipment');
  return { id: row.id };
}

/* ---------- Issues ---------- */

function reportIssue_(me, p) {
  var issue = {
    id: newId_('IS'),
    created_at: new Date(),
    reporter: me.email,
    space: oneOf_(p.space, spaceIds_(), 'space'),
    equipment: str_(p.equipment, 100),
    severity: oneOf_(p.severity || 'medium', CONFIG.ISSUE_SEVERITY, 'severity'),
    description: str_(p.description, 2000, 'Description', true),
    status: 'open',
    updated_by: me.email,
    updated_at: new Date()
  };
  appendRow_('Issues', issue);
  audit_(me, 'issue.create', issue.id, { space: issue.space, severity: issue.severity });
  notify_('[Music Tech] ' + issue.severity + ' issue in ' + spaceName_(issue.space),
    'Reported by ' + me.email + '\nEquipment: ' + (issue.equipment || '-') + '\n\n' + issue.description);
  return { id: issue.id };
}

function listIssues_(me, p) {
  var ws = hasRole_(me, 'workstudy');
  var status = p.status ? oneOf_(p.status, CONFIG.ISSUE_STATUS.concat(['active']), 'status') : '';
  return readRows_('Issues')
    .filter(function (r) {
      if (!ws && r.reporter !== me.email) return false;
      if (status === 'active') return r.status === 'open' || r.status === 'in progress';
      return !status || r.status === status;
    })
    .sort(function (a, b) { return String(b.created_at).localeCompare(String(a.created_at)); })
    .slice(0, 200)
    .map(function (r) {
      return { id: r.id, created_at: r.created_at, reporter: ws ? r.reporter : '', space: r.space,
               equipment: r.equipment, severity: r.severity, description: r.description,
               status: r.status, assignee: r.assignee, resolution: r.resolution };
    });
}

function updateIssue_(me, p) {
  var row = findBy_('Issues', 'id', String(p.id || ''));
  if (!row) throw userError_('That issue no longer exists.');
  var patch = {
    status: oneOf_(p.status, CONFIG.ISSUE_STATUS, 'status'),
    assignee: str_(p.assignee, 100),
    resolution: str_(p.resolution, 1000),
    updated_by: me.email,
    updated_at: new Date()
  };
  updateRow_('Issues', row._row, patch);
  audit_(me, 'issue.update', row.id, patch);
  return { id: row.id };
}

/* ---------- Hours and weekly check-ins (work-study) ---------- */

function logHours_(me, p) {
  var kind = oneOf_(p.kind || 'hours', ['hours', 'checkin'], 'entry type');
  var tz = Session.getScriptTimeZone();
  var entry = { id: newId_('HR'), created_at: new Date(), email: me.email, name: me.name, kind: kind };

  if (kind === 'hours') {
    entry.date = dateStr_(p.date, 'Date');
    var today = Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd');
    var oldest = Utilities.formatDate(new Date(Date.now() - 60 * 86400000), tz, 'yyyy-MM-dd');
    if (entry.date > today || entry.date < oldest) throw userError_('Date must be within the last 60 days.');
    entry.hours = num_(p.hours, 0.25, 12, 'Hours');
    entry.area = str_(p.area, 60, 'Area', true);
    if (CONFIG.WORK_AREAS.indexOf(entry.area) === -1) throw userError_('Choose a valid area.');
    entry.description = str_(p.description, 1000, 'What you worked on', true);
  } else {
    entry.date = Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd');
    entry.hours = 0;
    entry.area = 'Check-in';
    entry.description = clean_(
      'Did: ' + str_(p.did, 500, 'What you did', true) +
      '\nNext: ' + str_(p.next, 500, 'What is next', true) +
      '\nBlocking: ' + (str_(p.blocking, 500) || 'nothing'), 1600);
  }
  appendRow_('Hours', entry);
  audit_(me, 'hours.' + kind, entry.id, { date: entry.date, hours: entry.hours, area: entry.area });
  return { id: entry.id };
}

function listHours_(me, p) {
  var admin = hasRole_(me, 'admin');
  var who = admin && p.email ? String(p.email).toLowerCase() : (admin ? '' : me.email);
  var rows = readRows_('Hours').filter(function (r) { return !who || String(r.email).toLowerCase() === who; });

  // Totals for the current Monday-Sunday week, per person.
  var tz = Session.getScriptTimeZone();
  var dow = Number(Utilities.formatDate(new Date(), tz, 'u')); // 1 = Monday
  var weekStart = Utilities.formatDate(new Date(Date.now() - (dow - 1) * 86400000), tz, 'yyyy-MM-dd');
  var totals = {};
  rows.forEach(function (r) {
    var d = String(r.date).slice(0, 10);
    if (r.kind === 'hours' && d >= weekStart) totals[r.email] = (totals[r.email] || 0) + Number(r.hours || 0);
  });

  var entries = rows
    .sort(function (a, b) { return String(b.created_at).localeCompare(String(a.created_at)); })
    .slice(0, admin ? 300 : 60)
    .map(function (r) {
      return { id: r.id, created_at: r.created_at, email: r.email, name: r.name, kind: r.kind,
               date: String(r.date).slice(0, 10), hours: r.hours, area: r.area, description: r.description };
    });
  return { weekStart: weekStart, totals: totals, entries: entries };
}

/* ---------- Announcements ---------- */

function saveAnnouncement_(me, p) {
  var admin = hasRole_(me, 'admin');
  var data = {
    audience: oneOf_(p.audience || 'all', ['all', 'workstudy'], 'audience'),
    title: str_(p.title, 120, 'Title', true),
    body: str_(p.body, 2000, 'Message', true),
    active: p.hasOwnProperty('active') ? bool_(p.active) : true
  };
  if (admin) data.pinned = bool_(p.pinned);

  if (p.id) {
    var row = findBy_('Announcements', 'id', String(p.id));
    if (!row) throw userError_('That announcement no longer exists.');
    if (!admin && row.author !== me.email) throw userError_('You can only edit your own announcements.');
    updateRow_('Announcements', row._row, data);
    audit_(me, 'announcement.update', row.id, { title: data.title, active: data.active });
    return { id: row.id };
  }
  data.id = newId_('AN');
  data.created_at = new Date();
  data.author = me.email;
  if (!admin) data.pinned = false;
  appendRow_('Announcements', data);
  audit_(me, 'announcement.create', data.id, { title: data.title, audience: data.audience });
  return { id: data.id };
}

/* ---------- Access (admin) ---------- */

function listAccess_() {
  return readRows_('Access').map(function (r) {
    return { email: String(r.email), name: String(r.name || ''), role: normalizeRole_(r.role) || String(r.role),
             spaces: String(r.spaces || ''), area: String(r.area || ''), active: bool_(r.active),
             expires: r.expires ? String(r.expires).slice(0, 10) : '', notes: String(r.notes || ''),
             updated_by: r.updated_by, updated_at: r.updated_at };
  });
}

function saveAccess_(me, p) {
  var email = email_(p.email);
  if (CONFIG.OWNER_EMAILS.indexOf(email) !== -1) throw userError_('The owner account is always an admin and is not managed here.');
  var spaces = parseSpaces_(Array.isArray(p.spaces) ? p.spaces.join(',') : p.spaces);
  var data = {
    email: email,
    name: str_(p.name, 80, 'Name', true),
    role: oneOf_(p.role, Object.keys(CONFIG.ROLES), 'role'),
    spaces: spaces.join(', '),
    area: str_(p.area, 80),
    active: bool_(p.active),
    expires: p.expires ? dateStr_(p.expires, 'Expiry') : '',
    notes: str_(p.notes, 300),
    updated_by: me.email,
    updated_at: new Date()
  };
  var row = findBy_('Access', 'email', email);
  if (!row) {
    // Emails in the sheet may have stray capitals or spaces.
    row = readRows_('Access').filter(function (r) { return String(r.email).trim().toLowerCase() === email; })[0] || null;
  }
  if (row) updateRow_('Access', row._row, data); else appendRow_('Access', data);
  forgetUser_(email);
  audit_(me, row ? 'access.update' : 'access.create', email, { role: data.role, spaces: data.spaces, active: data.active, expires: data.expires });
  return { email: email };
}

function listAudit_(me, p) {
  var limit = Math.min(Number(p.limit) || 100, 300);
  return readRows_('Audit').slice(-limit).reverse().map(function (r) {
    return { timestamp: r.timestamp, email: r.email, role: r.role, action: r.action, target: r.target, details: r.details };
  });
}

/* ---------- Email ---------- */

function notify_(subject, body, to) {
  var addr = to || String(settings_().notify_email || '').trim();
  if (!addr) return;
  try {
    MailApp.sendEmail({ to: addr, subject: String(subject).slice(0, 150), body: body + '\n\n-- ' + CONFIG.APP_NAME });
  } catch (e) { console.error('mail failed', e); }
}
