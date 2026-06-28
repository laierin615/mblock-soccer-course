const SHEET_NAMES = {
  settings: 'Settings',
  teams: 'Teams',
  players: 'Players',
  scores: 'Scores',
  lessons: 'Lessons'
};

function doGet(e) {
  return handleRequest_(e.parameter || {}, true);
}

function doPost(e) {
  const params = Object.assign({}, e.parameter || {});
  if (e.postData && e.postData.contents) {
    try {
      Object.assign(params, JSON.parse(e.postData.contents));
    } catch (err) {
      // Form posts use e.parameter, JSON posts use e.postData.
    }
  }
  return handleRequest_(params, false);
}

function handleRequest_(params, isGet) {
  const action = params.action || 'all';
  let result;
  try {
    if (action === 'ping') result = { ok: true, message: 'connected', now: new Date().toISOString() };
    else if (action === 'all') result = getAll_();
    else if (action === 'createTeam') result = createTeam_(params);
    else if (action === 'createPlayer') result = createPlayer_(params);
    else if (action === 'addScore') result = addScore_(params);
    else result = { ok: false, error: 'Unknown action: ' + action };
  } catch (err) {
    result = { ok: false, error: String(err && err.message ? err.message : err) };
  }

  const callback = params.callback;
  if (isGet && callback) {
    return ContentService
      .createTextOutput(callback + '(' + JSON.stringify(result) + ');')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function getAll_() {
  return {
    ok: true,
    teams: readObjects_(SHEET_NAMES.teams, 3),
    players: readObjects_(SHEET_NAMES.players, 3),
    scores: readObjects_(SHEET_NAMES.scores, 3),
    lessons: readObjects_(SHEET_NAMES.lessons, 3)
  };
}

function createTeam_(params) {
  validateClassCode_(params.classCode);
  const sheet = ss_().getSheetByName(SHEET_NAMES.teams);
  const id = 'T' + Date.now();
  sheet.appendRow([
    id,
    params.teamName || '',
    params.teamColor || '',
    params.slogan || '',
    params.device || '',
    today_(),
    params.notes || ''
  ]);
  return Object.assign({ ok: true, teamId: id }, getAll_());
}

function createPlayer_(params) {
  validateClassCode_(params.classCode);
  const sheet = ss_().getSheetByName(SHEET_NAMES.players);
  const id = 'P' + Date.now();
  sheet.appendRow([
    id,
    params.teamId || '',
    params.nickname || '',
    Number(params.grade || 0),
    params.role || '',
    Number(params.jerseyNo || 0),
    params.notes || '',
    today_()
  ]);
  return Object.assign({ ok: true, playerId: id }, getAll_());
}

function addScore_(params) {
  validateClassCode_(params.classCode);
  const sheet = ss_().getSheetByName(SHEET_NAMES.scores);
  const core = Number(params.corePoints || 0);
  const teamwork = Number(params.teamworkPoints || 0);
  const debug = Number(params.debugPoints || 0);
  const creativity = Number(params.creativityPoints || 0);
  const peer = Number(params.peerFeedbackPoints || 0);
  const total = core + teamwork + debug + creativity + peer;
  const id = 'S' + Date.now();
  sheet.appendRow([
    id,
    Number(params.lessonNo || 0),
    params.teamId || '',
    params.mission || '',
    core,
    teamwork,
    debug,
    creativity,
    peer,
    total,
    params.note || '',
    Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm')
  ]);
  return Object.assign({ ok: true, scoreId: id }, getAll_());
}

function readObjects_(sheetName, headerRow) {
  const sheet = ss_().getSheetByName(sheetName);
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  if (lastRow <= headerRow) return [];
  const headers = sheet.getRange(headerRow, 1, 1, lastCol).getValues()[0];
  const values = sheet.getRange(headerRow + 1, 1, lastRow - headerRow, lastCol).getValues();
  return values
    .filter(row => row.some(value => value !== ''))
    .map(row => {
      const item = {};
      headers.forEach((header, index) => item[String(header)] = row[index]);
      return item;
    });
}

function validateClassCode_(provided) {
  const required = getSetting_('classCode');
  if (required && String(required) !== String(provided || '')) {
    throw new Error('classCode 不正確');
  }
}

function getSetting_(key) {
  const rows = ss_().getSheetByName(SHEET_NAMES.settings).getRange('A3:B20').getValues();
  const found = rows.find(row => row[0] === key);
  return found ? found[1] : '';
}

function today_() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
}

function ss_() {
  return SpreadsheetApp.getActiveSpreadsheet();
}
