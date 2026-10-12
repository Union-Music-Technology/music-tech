/**
 * Music Tech Members portal: configuration.
 *
 * This file is in a public GitHub repository. Never put passwords, door codes,
 * student names, or schedules here. Anything private belongs in the
 * spreadsheet (Settings, Links, Access tabs), which only the owner can open.
 */
var CONFIG = {
  APP_NAME: 'Music Tech Members',
  DOMAIN: 'union.edu',

  // Always admins, even if missing from the Access tab, so the owner can never be locked out.
  OWNER_EMAILS: ['chandlec@union.edu'],

  // Public site, used by seedEquipment() to import data/site.json.
  SITE_URL: 'https://union-music-technology.github.io/music-tech/',

  ROLES: { user: 1, workstudy: 2, admin: 3 },

  // Ids match data/site.json on the public site.
  SPACES: [
    { id: 'tardis', name: 'TARDIS' },
    { id: 'studio', name: 'Music Technology Studio' },
    { id: 'advanced-studio', name: 'Advanced Studio' },
    { id: 'tech-booth', name: 'Tech Booth' },
    { id: 'emerson', name: 'Emerson Auditorium' }
  ],

  // Reservable calendars. The Google Calendar id for each lives in the Settings tab
  // under "calendar_<key>", and the owner's account must be able to edit that calendar.
  CALENDARS: [
    { key: 'tardis_live', name: 'TARDIS Live Room', space: 'tardis' },
    { key: 'tardis_control', name: 'TARDIS Control Room', space: 'tardis' }
  ],

  WORK_AREAS: ['TARDIS', 'Music Technology Studio', 'Advanced Studio', 'Tech Booth', 'Emerson',
               'Concert recording', 'Outreach', 'Training', 'Documentation', 'Other'],

  EQUIPMENT_STATUS: ['confirmed', 'unverified', 'retired'],
  EQUIPMENT_CONDITION: ['ok', 'needs attention', 'out of service', 'missing'],
  ISSUE_SEVERITY: ['low', 'medium', 'high'],
  ISSUE_STATUS: ['open', 'in progress', 'resolved', 'wont fix'],

  // Tab name -> header row. setup() creates any missing tab. Columns can be
  // reordered in the sheet; the code reads them by header name.
  SHEETS: {
    Access: ['email', 'name', 'role', 'spaces', 'area', 'active', 'expires', 'notes', 'updated_by', 'updated_at'],
    Settings: ['key', 'value', 'notes'],
    Links: ['title', 'url', 'audience', 'space', 'notes'],
    Announcements: ['id', 'created_at', 'author', 'audience', 'title', 'body', 'pinned', 'active'],
    Equipment: ['id', 'space', 'category', 'name', 'detail', 'qty', 'status', 'public', 'condition', 'location', 'notes', 'updated_by', 'updated_at'],
    Issues: ['id', 'created_at', 'reporter', 'space', 'equipment', 'severity', 'description', 'status', 'assignee', 'resolution', 'updated_by', 'updated_at'],
    Reservations: ['id', 'created_at', 'requester', 'name', 'calendar', 'start', 'end', 'purpose', 'musicians', 'status', 'event_id', 'reviewed_by', 'reviewed_at', 'note'],
    Hours: ['id', 'created_at', 'email', 'name', 'kind', 'date', 'hours', 'area', 'description'],
    Audit: ['timestamp', 'email', 'role', 'action', 'target', 'details']
  },

  // Seeded into the Settings tab by setup(). Edit values in the sheet, not here.
  DEFAULT_SETTINGS: [
    ['reservations_mode', 'request', 'off = portal booking disabled; request = work-study approves each booking; auto = small sessions are booked immediately'],
    ['weekly_hour_cap', 4, 'Reservation hours per user per week (Mon-Sun). Work-study and admins are exempt.'],
    ['open_hour', 8, 'Earliest start, 24-hour clock'],
    ['close_hour', 24, 'Latest end, 24-hour clock (24 = midnight)'],
    ['max_booking_hours', 4, 'Longest single booking'],
    ['min_notice_hours', 2, 'How far ahead a booking must start'],
    ['max_days_ahead', 21, 'How far ahead people can book'],
    ['supervision_threshold', 2, 'Sessions with more musicians than this always need work-study approval and supervision'],
    ['calendar_tardis_live', '', 'Google Calendar id for the TARDIS Live Room (Calendar settings > Integrate calendar)'],
    ['calendar_tardis_control', '', 'Google Calendar id for the TARDIS Control Room'],
    ['notify_email', 'chandlec@union.edu', 'Gets an email for new issues and booking requests. Leave blank for none.']
  ]
};
