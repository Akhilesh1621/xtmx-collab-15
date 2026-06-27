/**
 * XTMX COLLAB 15 — Schedule API
 * Google Apps Script backend for the static HTML on GitHub Pages.
 *
 * Endpoints:
 *   GET  ?action=load              → public read of the schedule
 *   GET  ?action=whoami&editPassword=... → verify editor password
 *   POST {action:'update', editPassword, di, ri, field, value} → write one cell
 *
 * Auth model:
 *   - Anyone can read (GET load).
 *   - Writes require the edit password stored in Script Properties.
 *
 * Setup: see SETUP.md.
 */

/* =========================================================================
   CONFIG — fill these in for your environment
   ========================================================================= */
const SHEET_NAME = 'Schedule';
const AUDIT_SHEET_NAME = 'Audit';

// Field shortcode → column header on the sheet
const FIELD_MAP = {
  s: 'start',
  e: 'end',
  t: 'topic',
  h: 'host'
};

// Store the real password in Apps Script:
// Project Settings -> Script properties -> Add property:
//   EDIT_PASSWORD = your-private-password
const EDIT_PASSWORD_PROPERTY = 'EDIT_PASSWORD';

/* =========================================================================
   ENTRY POINTS
   ========================================================================= */
function doGet(e) {
  try {
    const action = (e && e.parameter && e.parameter.action) || 'load';
    if (action === 'load')   return jsonOut({ ok: true, days: loadDays() });
    if (action === 'whoami') return handleWhoami_(e.parameter.editPassword);
    return jsonOut({ ok: false, error: 'Unknown action: ' + action });
  } catch (err) {
    return jsonOut({ ok: false, error: String(err) });
  }
}

function doPost(e) {
  let body;
  try { body = JSON.parse(e.postData.contents); }
  catch (err) { return jsonOut({ ok: false, error: 'Bad JSON body' }); }

  const action = body.action;
  if (action === 'update') return handleUpdate_(body);
  return jsonOut({ ok: false, error: 'Unknown action: ' + action });
}

function isEditPasswordValid_(password) {
  const expected = PropertiesService.getScriptProperties().getProperty(EDIT_PASSWORD_PROPERTY);
  if (!expected) return false;
  return String(password || '') === expected;
}

function handleWhoami_(editPassword) {
  const passwordAllowed = isEditPasswordValid_(editPassword);
  return jsonOut({
    ok: true,
    passwordRequired: true,
    passwordAccepted: passwordAllowed,
    authorized: passwordAllowed
  });
}

/* =========================================================================
   SHEET READ
   ========================================================================= */
function loadDays() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];

  const headers = data[0].map(function (h) { return String(h).trim(); });
  const idx = function (name) { return headers.indexOf(name); };

  const cDay = idx('day_n'), cName = idx('day_name'), cDate = idx('date');
  const cGif = idx('gif'), cJoin = idx('join'), cFlag = idx('flag');
  const cIdx = idx('idx'), cStart = idx('start'), cEnd = idx('end');
  const cTopic = idx('topic'), cHost = idx('host');
  const cCat = idx('category'), cDesc = idx('description');

  const dayMap = {};
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const n = row[cDay];
    if (n === '' || n === null) continue;

    if (!dayMap[n]) {
      dayMap[n] = {
        n: Number(n),
        day: String(row[cName] || ''),
        date: displayValue_(row[cDate], 'MMM d'),
        rows: []
      };
      if (cGif >= 0 && row[cGif])   dayMap[n].gif  = String(row[cGif]);
      if (cJoin >= 0 && row[cJoin]) dayMap[n].join = String(row[cJoin]);
      if (cFlag >= 0 && row[cFlag]) dayMap[n].flag = String(row[cFlag]);
    }

    if (cIdx >= 0 && row[cIdx] !== '' && row[cIdx] !== null) {
      const item = {
        s: displayValue_(row[cStart], 'h:mm a'),
        e: displayValue_(row[cEnd], 'h:mm a'),
        t: String(row[cTopic] || ''),
        h: cHost >= 0 ? String(row[cHost] || '') : '',
        cat: (cCat >= 0 && row[cCat]) ? String(row[cCat]) : 'session'
      };
      if (cDesc >= 0 && row[cDesc]) item.d = String(row[cDesc]);
      dayMap[n].rows.push(item);
    }
  }

  return Object.keys(dayMap)
    .map(function (k) { return dayMap[k]; })
    .sort(function (a, b) { return a.n - b.n; });
}

/* =========================================================================
   SHEET WRITE
   ========================================================================= */
function handleUpdate_(body) {
  if (!isEditPasswordValid_(body.editPassword)) return jsonOut({ ok: false, error: 'Edit password required' });

  const di = Number(body.di), ri = Number(body.ri);
  const field = String(body.field || '');
  const value = (body.value === undefined || body.value === null) ? '' : String(body.value);

  const colName = FIELD_MAP[field];
  if (!colName) return jsonOut({ ok: false, error: 'Unknown field: ' + field });

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  if (!sheet) return jsonOut({ ok: false, error: 'Schedule sheet missing' });

  const data = sheet.getDataRange().getValues();
  const headers = data[0].map(function (h) { return String(h).trim(); });
  const cDay = headers.indexOf('day_n');
  const cIdx = headers.indexOf('idx');
  const cTarget = headers.indexOf(colName);
  if (cTarget < 0) return jsonOut({ ok: false, error: 'Column missing: ' + colName });

  // Re-derive sorted day_n list to map client di → actual day_n
  const seen = {};
  const dayNums = [];
  for (let i = 1; i < data.length; i++) {
    const n = data[i][cDay];
    if (n !== '' && n !== null && !seen[n]) { seen[n] = 1; dayNums.push(Number(n)); }
  }
  dayNums.sort(function (a, b) { return a - b; });
  const targetDay = dayNums[di];
  if (targetDay === undefined) return jsonOut({ ok: false, error: 'Day index out of range' });

  // Find matching sheet row
  let foundRow = -1;
  for (let i = 1; i < data.length; i++) {
    if (Number(data[i][cDay]) === targetDay && Number(data[i][cIdx]) === ri) {
      foundRow = i; break;
    }
  }
  if (foundRow < 0) return jsonOut({ ok: false, error: 'Row not found (day ' + targetDay + ', idx ' + ri + ')' });

  sheet.getRange(foundRow + 1, cTarget + 1).setValue(value);
  audit_(targetDay, ri, field, value);
  return jsonOut({ ok: true, day: targetDay, ri: ri, field: field });
}

/* =========================================================================
   AUDIT LOG
   ========================================================================= */
function audit_(dayN, ri, field, value) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let s = ss.getSheetByName(AUDIT_SHEET_NAME);
    if (!s) {
      s = ss.insertSheet(AUDIT_SHEET_NAME);
      s.appendRow(['Time', 'Email', 'Name', 'Day', 'Row idx', 'Field', 'New value']);
      s.setFrozenRows(1);
    }
    s.appendRow([
      new Date(), 'Password editor', '',
      dayN, ri, field, value
    ]);
  } catch (err) { /* never fail a write because of audit */ }
}

/* =========================================================================
   UTILITIES
   ========================================================================= */
function jsonOut(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function displayValue_(value, datePattern) {
  if (value instanceof Date && !isNaN(value.getTime())) {
    return Utilities.formatDate(value, 'UTC', datePattern);
  }
  return String(value || '');
}

/* =========================================================================
   ONE-TIME SETUP — run setupSheet() from the Apps Script editor to create
   the Schedule sheet and seed it with the current COLLAB 15 program.
   ========================================================================= */
function setupSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (sheet) {
    sheet.clear();
  } else {
    sheet = ss.insertSheet(SHEET_NAME);
  }

  const headers = [
    'day_n','day_name','date','gif','join','flag',
    'idx','start','end','topic','host','category','description'
  ];
  sheet.appendRow(headers);

  const G = 'https://media.giphy.com/media/';
  const SEED = [
    { n:1, day:'Monday', date:'Jun 29', gif:G+'f4aSP1cZWR0lIKRXIT/giphy.gif', join:'Meeting joins at 10:00 AM', flag:'', rows:[
      {s:'10:00 AM', e:'11:00 AM', t:'Meet & Greet', h:'HR', cat:'session', d:'Introductions, icebreaker activity, team photos.'},
      {s:'11:00 AM', e:'12:00 PM', t:'HR Onboarding', h:'HR', cat:'session', d:'LOI, employment terms, salary structure, bond overview.'},
      {s:'12:00 PM', e:'1:00 PM', t:'Xtransmatrix Introduction', h:'Anupam & AK', cat:'session', d:'Vision, values, clients, org chart, certifications.'},
      {s:'1:00 PM', e:'2:00 PM', t:'Lunch Break', h:'', cat:'lunch', d:''},
      {s:'2:00 PM', e:'3:00 PM', t:'HR Policy & Administrative', h:'HR', cat:'session', d:'Leave policy, attendance, shift norms, payroll cycle.'},
      {s:'3:00 PM', e:'4:00 PM', t:'Office Tour', h:'', cat:'session', d:'Clean room, workstations, emergency exits, cafeteria.'},
      {s:'4:00 PM', e:'4:15 PM', t:'Break', h:'', cat:'break', d:''},
      {s:'4:15 PM', e:'5:00 PM', t:'Trust & Integrity', h:'HR', cat:'session', d:'Workplace ethics, confidentiality basics, code of conduct.'}
    ]},
    { n:2, day:'Tuesday', date:'Jun 30', gif:G+'jnhXd7KT8UTk5WIgiV/giphy.gif', join:'', flag:'', rows:[
      {s:'10:00 AM', e:'11:00 AM', t:'US Culture & Collaboration + Accent Familiarisation', h:'Anupam / Samarth', cat:'session', d:'Communication norms, time zones, professional tone.'},
      {s:'11:00 AM', e:'11:15 AM', t:'Break', h:'', cat:'break', d:''},
      {s:'11:15 AM', e:'12:15 PM', t:'HIPAA Basics & PHI', h:'Anupam / Banish', cat:'session', d:'What is PHI, consequences of breach, clean room policy, real case examples.'},
      {s:'12:15 PM', e:'1:15 PM', t:'Platform Overview', h:'Akhilesh', cat:'session', d:'WOW 2.0 + Techtonic basics (what operators will use daily).'},
      {s:'1:15 PM', e:'1:45 PM', t:'Lunch Break', h:'', cat:'lunch', d:''},
      {s:'1:45 PM', e:'2:45 PM', t:'Cybersecurity & Social Engineering', h:'Akhilesh', cat:'session', d:'Phishing, password hygiene, endpoint security.'},
      {s:'2:45 PM', e:'3:45 PM', t:'Fun Activity — Team bonding game Knowsy', h:'', cat:'milestone', d:''},
      {s:'3:45 PM', e:'4:00 PM', t:'Break', h:'', cat:'break', d:''},
      {s:'4:00 PM', e:'4:45 PM', t:'Common Behavioural Issues', h:'AK', cat:'check', d:'Discussion + Q&A: what went wrong and why.'}
    ]},
    { n:3, day:'Wednesday', date:'Jul 1', gif:G+'26AHqztlb4CzG3WTu/giphy.gif', join:'', flag:'', rows:[
      {s:'10:00 AM', e:'11:00 AM', t:'Team Building & Accountability', h:'Tanishk', cat:'session', d:'Ownership mindset, peer accountability, team norms.'},
      {s:'11:00 AM', e:'11:15 AM', t:'Break', h:'', cat:'break', d:''},
      {s:'11:15 AM', e:'12:15 PM', t:'Engagement Theory', h:'Vikas / Darrel', cat:'session', d:'Staying motivated across 8 weeks; asking good questions; navigating uncertainty.'},
      {s:'12:15 PM', e:'1:15 PM', t:'Operations Discipline', h:'Anupam / Banish', cat:'session', d:'Shift adherence, escalation protocol, managing pressure without losing quality.'},
      {s:'1:15 PM', e:'1:45 PM', t:'Lunch Break', h:'', cat:'lunch', d:''},
      {s:'1:45 PM', e:'2:45 PM', t:'Handling Difficult Conversations', h:'', cat:'session', d:'De-escalation, empathy, professional pushback.'},
      {s:'2:45 PM', e:'3:45 PM', t:'AI Ops — Future-Proof Career', h:'Anupam', cat:'session', d:'Where AI ops is going; AIPO career path at XTM.'},
      {s:'3:45 PM', e:'4:00 PM', t:'Break', h:'', cat:'break', d:''},
      {s:'4:00 PM', e:'4:45 PM', t:'Test — Day 1 & Day 2', h:'', cat:'check', d:'20 questions, open-book allowed.'}
    ]},
    { n:4, day:'Thursday', date:'Jul 2', gif:G+'U4hWYCZo9QzWU/giphy.gif', join:'', flag:'Hosts TBC', rows:[
      {s:'10:00 AM', e:'11:00 AM', t:'Time Management', h:'', cat:'session', d:'Prioritisation, shift planning, avoiding bottlenecks.'},
      {s:'11:00 AM', e:'11:30 AM', t:'Break', h:'', cat:'break', d:''},
      {s:'11:30 AM', e:'12:15 PM', t:'Team Working & Collaboration', h:'', cat:'session', d:'Dependency management, handoffs, helping without disrupting.'},
      {s:'12:15 PM', e:'1:15 PM', t:'Fun Activity — Collaborative problem-solving challenge', h:'', cat:'milestone', d:''},
      {s:'1:15 PM', e:'1:45 PM', t:'Lunch Break', h:'', cat:'lunch', d:''},
      {s:'1:45 PM', e:'2:45 PM', t:'HIPAA Deep Dive — Infinitus Part 1', h:'', cat:'session', d:'Client-specific HIPAA rules, PHI handling on platform.'},
      {s:'2:45 PM', e:'3:30 PM', t:'Buddy Session', h:'', cat:'session', d:'Meet assigned buddy, Q&A on Days 1–4.'},
      {s:'3:30 PM', e:'3:45 PM', t:'Break', h:'', cat:'break', d:''},
      {s:'3:45 PM', e:'5:00 PM', t:'Final Test — Part 1', h:'', cat:'check', d:'Days 1–4 formal assessment.'}
    ]},
    { n:5, day:'Friday', date:'Jul 3', gif:G+'sAAd1YzR8Yg9dDMRKl/giphy.gif', join:'', flag:'Some hosts TBC', rows:[
      {s:'10:00 AM', e:'11:00 AM', t:'Effective Listening', h:'', cat:'session', d:'Active listening, note-taking, comprehension in AI audio tasks.'},
      {s:'11:00 AM', e:'11:30 AM', t:'Customer Obsession', h:'', cat:'session', d:'What it means in HITL ops; why accuracy = client trust.'},
      {s:'11:30 AM', e:'12:15 PM', t:'Quality Mindset & Accuracy Fundamentals', h:'', cat:'session', d:'Error types, self-review habits, zero-defect thinking.'},
      {s:'12:15 PM', e:'1:15 PM', t:'Annotation Hands-On Practice', h:'Tanishk', cat:'session', d:'Guided live exercises on platform (supervised).'},
      {s:'1:15 PM', e:'1:45 PM', t:'Lunch Break', h:'', cat:'lunch', d:''},
      {s:'1:45 PM', e:'2:45 PM', t:'KRA & KPI Walkthrough', h:'AK / TL', cat:'session', d:'FCCR, RRR, correction rate, attendance expectations.'},
      {s:'2:45 PM', e:'3:30 PM', t:'Communication in Ops', h:'', cat:'session', d:'Written updates, Whatsapp norms, G Chat norms, escalation messages.'},
      {s:'3:30 PM', e:'3:45 PM', t:'Break', h:'', cat:'break', d:''},
      {s:'3:45 PM', e:'5:00 PM', t:'Reflection & Open Q&A', h:'AK', cat:'check', d:'Week 1 wrap-up; what\'s clear, what\'s still fuzzy.'}
    ]},
    { n:6, day:'Monday', date:'Jul 6', gif:G+'13UoiCY2pJSwZW/giphy.gif', join:'', flag:'', rows:[
      {s:'10:00 AM', e:'11:00 AM', t:'US Health Insurance — Plan Info & Other Insurance', h:'Bhavana', cat:'session', d:''},
      {s:'11:00 AM', e:'11:15 AM', t:'Break', h:'', cat:'break', d:''},
      {s:'11:15 AM', e:'12:15 PM', t:'US Health Insurance — Plan Design & Cost Share', h:'Bhavana', cat:'session', d:''},
      {s:'12:15 PM', e:'1:15 PM', t:'Jeopardy — Health insurance knowledge game', h:'', cat:'check', d:''},
      {s:'1:15 PM', e:'1:45 PM', t:'Lunch Break', h:'', cat:'lunch', d:''},
      {s:'1:45 PM', e:'2:45 PM', t:'Infinitus Introduction', h:'AK & TP', cat:'session', d:'Company background, product, why HITL matters here.'},
      {s:'2:45 PM', e:'3:45 PM', t:'Self Study — Infinitus product documentation review', h:'', cat:'milestone', d:''},
      {s:'3:45 PM', e:'4:00 PM', t:'Break', h:'', cat:'break', d:''},
      {s:'4:00 PM', e:'4:45 PM', t:'Self Study (continued)', h:'', cat:'milestone', d:'Note-taking exercise.'}
    ]},
    { n:7, day:'Tuesday', date:'Jul 7', gif:G+'loAs9eNrvabHUlLjRy/giphy.gif', join:'', flag:'', rows:[
      {s:'10:00 AM', e:'11:00 AM', t:'US Health Insurance — Access & Navigating Coverage', h:'Suraksha', cat:'session', d:''},
      {s:'11:00 AM', e:'11:15 AM', t:'Break', h:'', cat:'break', d:''},
      {s:'11:15 AM', e:'12:15 PM', t:'HIPAA Violations', h:'Pancham', cat:'session', d:'Real cases, platform-specific scenarios, Infinitus protocols.'},
      {s:'12:15 PM', e:'1:15 PM', t:'My Journey', h:'Nitya & Vinsha', cat:'milestone', d:'Senior operator share-outs (to be named): real experience, tips.'},
      {s:'1:15 PM', e:'1:45 PM', t:'Lunch Break', h:'', cat:'lunch', d:''},
      {s:'1:45 PM', e:'2:45 PM', t:'Behaviour Do & Don\'t', h:'AK', cat:'session', d:'Workplace conduct, client interaction standards.'},
      {s:'2:45 PM', e:'3:45 PM', t:'Fun Activity — Scenario role-play game', h:'', cat:'milestone', d:''},
      {s:'3:45 PM', e:'4:00 PM', t:'Break', h:'', cat:'break', d:''},
      {s:'4:00 PM', e:'4:45 PM', t:'Test — Day 6 & 7', h:'Shama', cat:'check', d:''}
    ]},
    { n:8, day:'Thursday', date:'Jul 9', gif:G+'f4aSP1cZWR0lIKRXIT/giphy.gif', join:'', flag:'Some hosts TBC', rows:[
      {s:'10:00 AM', e:'11:00 AM', t:'Handling Calls & Escalations', h:'TL', cat:'session', d:'Recognising edge cases, escalation matrix, documentation.'},
      {s:'11:00 AM', e:'11:15 AM', t:'Break', h:'', cat:'break', d:''},
      {s:'11:15 AM', e:'12:15 PM', t:'Feedback Culture', h:'', cat:'session', d:'Giving and receiving feedback gracefully; using correction as fuel.'},
      {s:'12:15 PM', e:'1:15 PM', t:'Stress & Shift Management', h:'', cat:'session', d:'Night shift wellness, mental stamina, support systems.'},
      {s:'1:15 PM', e:'1:45 PM', t:'Lunch Break', h:'', cat:'lunch', d:''},
      {s:'1:45 PM', e:'2:45 PM', t:'Fun Activity — Knowsy', h:'TL / Akhilesh', cat:'milestone', d:''},
      {s:'2:45 PM', e:'3:30 PM', t:'"Communicate & Win" Contest — Prize Event', h:'TL', cat:'milestone', d:'Communicate well and grab the prize. Share your experience and learnings so far.'},
      {s:'3:30 PM', e:'3:45 PM', t:'Break', h:'', cat:'break', d:''},
      {s:'3:45 PM', e:'4:45 PM', t:'Test — Day 8 + cumulative review', h:'', cat:'check', d:''}
    ]},
    { n:9, day:'Friday', date:'Jul 10', gif:G+'jnhXd7KT8UTk5WIgiV/giphy.gif', join:'Mock / Go-Live · evening (US-hours)', flag:'', rows:[
      {s:'5:00 PM', e:'6:00 PM', t:'Daily Stand-Up & Coffee', h:'Akhilesh', cat:'session', d:'Format, purpose, how to prepare your daily update.'},
      {s:'6:00 PM', e:'7:00 PM', t:'Setting Up Infinitus', h:'Akhilesh', cat:'session', d:'Email setup, endpoint configuration, system checks.'},
      {s:'7:00 PM', e:'7:30 PM', t:'Break', h:'', cat:'break', d:''},
      {s:'7:30 PM', e:'10:00 PM', t:'Live Shadowing', h:'TL', cat:'milestone', d:'Observe senior operator on live Infinitus tasks (silent mode).'},
      {s:'10:00 PM', e:'11:00 PM', t:'Dinner Break', h:'', cat:'lunch', d:''},
      {s:'11:00 PM', e:'12:00 AM', t:'Final Certification Test', h:'', cat:'check', d:'Comprehensive assessment (HIPAA + platform + ops).'},
      {s:'12:00 AM', e:'2:00 AM', t:'Graduation Ceremony', h:'Team', cat:'milestone', d:'Certificates, team photo, TL assignment, go-live confirmation.'}
    ]}
  ];

  SEED.forEach(function (d) {
    d.rows.forEach(function (r, idx) {
      sheet.appendRow([
        d.n, d.day, d.date, d.gif || '', d.join || '', d.flag || '',
        idx, r.s, r.e || '', r.t, r.h || '', r.cat, r.d || ''
      ]);
    });
  });

  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, headers.length);
  SpreadsheetApp.getActive().toast('Schedule seeded ✓', 'Setup complete', 5);
}
