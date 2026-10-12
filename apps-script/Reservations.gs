/**
 * TARDIS reservations on Google Calendar.
 *
 * Requests are checked against the studio rules (hours, weekly cap, booking
 * length, notice) and against both the calendar and other pending requests.
 * In "request" mode a work-study student or admin approves each one; in "auto"
 * mode small sessions are booked straight away. Either way the event is created
 * by the owner's account, with the requester added as a guest.
 */

function calendarDef_(key) {
  var def = CONFIG.CALENDARS.filter(function (c) { return c.key === key; })[0];
  if (!def) throw userError_('Choose a valid room.');
  return def;
}

function calendarFor_(def) {
  var id = String(settings_()['calendar_' + def.key] || '').trim();
  var cal = id ? CalendarApp.getCalendarById(id) : null;
  if (!cal) throw userError_(def.name + ' calendar is not set up yet. Tell Prof. Chandler.');
  return cal;
}

function requestReservation_(me, p) {
  var s = settings_();
  var mode = String(s.reservations_mode || 'off').toLowerCase();
  if (mode === 'off') throw userError_('Portal booking is turned off right now. Use the studio calendar or ask a work-study student.');

  var def = calendarDef_(String(p.calendar || ''));
  if (!canUseSpace_(me, def.space)) throw userError_('You are not approved to book ' + spaceName_(def.space) + ' yet.');

  var tz = Session.getScriptTimeZone();
  var date = dateStr_(p.date, 'Date');
  if (!/^([01]\d|2[0-3]):(00|30)$/.test(String(p.start || ''))) throw userError_('Choose a start time on the hour or half hour.');
  var maxMin = Number(s.max_booking_hours) * 60;
  var minutes = num_(p.minutes, 30, maxMin, 'Length in minutes');
  if (minutes % 30) throw userError_('Book in 30-minute steps.');

  var start = Utilities.parseDate(date + ' ' + p.start, tz, 'yyyy-MM-dd HH:mm');
  var end = new Date(start.getTime() + minutes * 60000);
  var dayStart = Utilities.parseDate(date + ' 00:00', tz, 'yyyy-MM-dd HH:mm');
  var open = new Date(dayStart.getTime() + Number(s.open_hour) * 3600000);
  var close = new Date(dayStart.getTime() + Number(s.close_hour) * 3600000);
  var now = Date.now();

  if (start.getTime() < now + Number(s.min_notice_hours) * 3600000) {
    throw userError_('Bookings must start at least ' + s.min_notice_hours + ' hours from now.');
  }
  if (start.getTime() > now + Number(s.max_days_ahead) * 86400000) {
    throw userError_('You can book up to ' + s.max_days_ahead + ' days ahead.');
  }
  if (start < open || end > close) {
    throw userError_('The studio is open ' + hourLabel_(s.open_hour) + ' to ' + hourLabel_(s.close_hour) + '.');
  }

  var purpose = str_(p.purpose, 300, 'Purpose', true);
  var musicians = num_(p.musicians, 1, 40, 'Number of musicians');
  var needsSupervision = musicians > Number(s.supervision_threshold);

  var rows = readRows_('Reservations');
  var live = rows.filter(function (r) { return r.status === 'pending' || r.status === 'approved'; });

  if (!hasRole_(me, 'workstudy')) {
    var dow = Number(Utilities.formatDate(start, tz, 'u')); // 1 = Monday
    var weekStart = Utilities.parseDate(
      Utilities.formatDate(new Date(dayStart.getTime() - (dow - 1) * 86400000 + 12 * 3600000), tz, 'yyyy-MM-dd') + ' 00:00',
      tz, 'yyyy-MM-dd HH:mm');
    var weekEnd = new Date(weekStart.getTime() + 7 * 86400000);
    var used = live.filter(function (r) {
      var t = new Date(r.start).getTime();
      return r.requester === me.email && t >= weekStart.getTime() && t < weekEnd.getTime();
    }).reduce(function (sum, r) { return sum + (new Date(r.end) - new Date(r.start)) / 3600000; }, 0);
    var cap = Number(s.weekly_hour_cap);
    if (used + minutes / 60 > cap) {
      throw userError_('That would put you over ' + cap + ' reserved hours this week (you have ' + used + '). Unreserved time is still open to use.');
    }
  }

  var clash = live.some(function (r) {
    return r.calendar === def.key && new Date(r.start) < end && new Date(r.end) > start;
  });
  var cal = calendarFor_(def);
  if (clash || cal.getEvents(start, end).length) throw userError_('That time overlaps another booking. Pick a different time.');

  var r = {
    id: newId_('RS'), created_at: new Date(), requester: me.email, name: me.name || me.email,
    calendar: def.key, start: start, end: end, purpose: purpose, musicians: musicians,
    status: 'pending', note: needsSupervision ? 'Needs work-study supervision' : ''
  };
  if (mode === 'auto' && !needsSupervision) {
    r.event_id = createEvent_(cal, def, r);
    r.status = 'approved';
    r.reviewed_by = 'auto';
    r.reviewed_at = new Date();
  }
  appendRow_('Reservations', r);
  audit_(me, 'reservation.' + r.status, r.id, { calendar: def.key, start: start.toISOString(), minutes: minutes, musicians: musicians });
  if (r.status === 'pending') {
    notify_('[Music Tech] Booking request: ' + def.name,
      r.name + ' (' + me.email + ') requested ' + def.name + '\n' + whenLabel_(start, end) +
      '\nMusicians: ' + musicians + (needsSupervision ? ' (needs supervision)' : '') + '\nPurpose: ' + purpose +
      '\n\nApprove or decline it in the portal Queue.');
  }
  return { id: r.id, status: r.status };
}

function createEvent_(cal, def, r) {
  var ev = cal.createEvent(def.name + ': ' + r.name, new Date(r.start), new Date(r.end), {
    description: 'Booked through the ' + CONFIG.APP_NAME + ' portal.\nBooked by: ' + r.requester +
                 '\nMusicians: ' + r.musicians + '\nPurpose: ' + r.purpose,
    guests: r.requester,
    sendInvites: true
  });
  return ev.getId();
}

function listReservations_(me, p) {
  var ws = hasRole_(me, 'workstudy');
  var all = ws && p.scope === 'all';
  var since = Date.now() - (all ? 1 : 30) * 86400000;
  var names = {};
  CONFIG.CALENDARS.forEach(function (c) { names[c.key] = c.name; });
  return readRows_('Reservations')
    .filter(function (r) {
      if (!all && r.requester !== me.email) return false;
      if (p.status && r.status !== p.status) return false;
      return new Date(r.end).getTime() >= since;
    })
    .sort(function (a, b) { return String(a.start).localeCompare(String(b.start)); })
    .map(function (r) {
      return { id: r.id, requester: r.requester, name: r.name, calendar: r.calendar, room: names[r.calendar] || r.calendar,
               start: r.start, end: r.end, when: whenLabel_(new Date(r.start), new Date(r.end)),
               purpose: r.purpose, musicians: r.musicians, status: r.status, note: r.note, mine: r.requester === me.email };
    });
}

function reviewReservation_(me, p) {
  var row = findBy_('Reservations', 'id', String(p.id || ''));
  if (!row) throw userError_('That request no longer exists.');
  if (row.status !== 'pending') throw userError_('That request was already ' + row.status + '.');
  var decision = oneOf_(p.decision, ['approve', 'decline'], 'decision');
  var note = str_(p.note, 300);
  var def = calendarDef_(row.calendar);
  var patch = { reviewed_by: me.email, reviewed_at: new Date(), note: [row.note, note].filter(String).join(' | ') };

  if (decision === 'approve') {
    var start = new Date(row.start), end = new Date(row.end);
    if (start.getTime() < Date.now()) throw userError_('That request is in the past. Decline it instead.');
    var cal = calendarFor_(def);
    if (cal.getEvents(start, end).length) throw userError_('Something else is booked at that time now. Decline with a note.');
    patch.event_id = createEvent_(cal, def, row);
    patch.status = 'approved';
  } else {
    patch.status = 'declined';
  }
  updateRow_('Reservations', row._row, patch);
  audit_(me, 'reservation.' + patch.status, row.id, { note: note });
  notify_('[Music Tech] Your ' + def.name + ' booking was ' + patch.status,
    whenLabel_(new Date(row.start), new Date(row.end)) + '\nPurpose: ' + row.purpose + (note ? '\nNote: ' + note : '') +
    (patch.status === 'approved' ? '\n\nA calendar invitation is on its way.' : ''), row.requester);
  return { id: row.id, status: patch.status };
}

function cancelReservation_(me, p) {
  var row = findBy_('Reservations', 'id', String(p.id || ''));
  if (!row) throw userError_('That booking no longer exists.');
  var ws = hasRole_(me, 'workstudy');
  if (row.requester !== me.email && !ws) throw userError_('You can only cancel your own bookings.');
  if (row.status !== 'pending' && row.status !== 'approved') throw userError_('That booking is already ' + row.status + '.');
  if (!ws && new Date(row.start).getTime() < Date.now()) throw userError_('That booking has already started.');
  if (row.event_id) {
    try {
      var ev = calendarFor_(calendarDef_(row.calendar)).getEventById(row.event_id);
      if (ev) ev.deleteEvent();
    } catch (e) { console.error('event delete failed', e); }
  }
  updateRow_('Reservations', row._row, { status: 'cancelled', reviewed_by: me.email, reviewed_at: new Date() });
  audit_(me, 'reservation.cancelled', row.id, {});
  return { id: row.id, status: 'cancelled' };
}

function hourLabel_(h) {
  h = Number(h) % 24;
  if (h === 0) return 'midnight';
  if (h === 12) return 'noon';
  return (h % 12) + (h < 12 ? 'am' : 'pm');
}

function whenLabel_(start, end) {
  var tz = Session.getScriptTimeZone();
  return Utilities.formatDate(start, tz, 'EEE MMM d, h:mm a') + ' to ' + Utilities.formatDate(end, tz, 'h:mm a');
}
