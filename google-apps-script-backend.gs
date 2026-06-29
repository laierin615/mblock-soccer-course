const SPREADSHEET_ID = '';
const DEFAULT_CLASS_CODE = 'SOCCER2026';
const DEFAULT_TEACHER_PASSWORD_HASH = '6d60392b6d56e300f7c5e8f94415bc675e971037881b673a799a545a91191f04';

const SHEET_NAMES = {
  settings: 'Settings',
  teams: 'Teams',
  players: 'Players',
  scores: 'Scores',
  lessons: 'Lessons'
};

const SHEET_DEFINITIONS = {
  Settings: {
    title: 'mBlock 足球機器人課程後台設定',
    headers: ['key', 'value', 'note'],
    defaults: [
      ['schemaVersion', '2.0', '後台資料表版本'],
      ['classCode', DEFAULT_CLASS_CODE, '網站送出資料時使用的班級代碼'],
      ['teacherPasswordHash', DEFAULT_TEACHER_PASSWORD_HASH, '老師計分密碼 SHA-256；預設密碼為 543861'],
      ['githubPagesUrl', '', '課程網站網址'],
      ['appsScriptWebAppUrl', '', '部署後貼上 Web App URL'],
      ['privacyNote', '建議使用學生暱稱、座號或小隊代號，不放公開個資。', ''],
      ['lastUpdated', today_(), '最後初始化日期']
    ]
  },
  Teams: {
    title: '球隊登錄 Teams',
    headers: ['teamId', 'teamName', 'teamColor', 'slogan', 'device', 'createdAt', 'notes']
  },
  Players: {
    title: '球員登錄 Players',
    headers: ['playerId', 'teamId', 'nickname', 'grade', 'role', 'jerseyNo', 'notes', 'createdAt']
  },
  Scores: {
    title: '計分紀錄 Scores',
    headers: ['scoreId', 'lessonNo', 'teamId', 'mission', 'corePoints', 'teamworkPoints', 'debugPoints', 'creativityPoints', 'peerFeedbackPoints', 'total', 'note', 'timestamp']
  },
  Lessons: {
    title: '課程資料 Lessons',
    headers: ['lessonNo', 'title', 'skill', 'footballMission', 'status', 'notes']
  }
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
    ensureBackend_();
    if (action === 'ping') result = { ok: true, message: 'connected', now: new Date().toISOString(), backend: 'google-sheet' };
    else if (action === 'setup') result = setupBackend_(params);
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

function setupBackend_(params) {
  validateTeacher_(params);
  if (params.newClassCode) writeSetting_('classCode', params.newClassCode, '網站送出資料時使用的班級代碼');
  if (params.githubPagesUrl) writeSetting_('githubPagesUrl', params.githubPagesUrl, '課程網站網址');
  if (params.appsScriptWebAppUrl) writeSetting_('appsScriptWebAppUrl', params.appsScriptWebAppUrl, '部署後貼上 Web App URL');
  writeSetting_('lastUpdated', today_(), '最後初始化日期');
  return Object.assign({ ok: true, message: 'backend initialized' }, getAll_());
}

function getAll_() {
  return {
    ok: true,
    teams: readObjects_(SHEET_NAMES.teams, 3),
    players: readObjects_(SHEET_NAMES.players, 3),
    scores: readObjects_(SHEET_NAMES.scores, 3),
    lessons: readObjects_(SHEET_NAMES.lessons, 3),
    config: {
      classCode: getSetting_('classCode') || DEFAULT_CLASS_CODE,
      githubPagesUrl: getSetting_('githubPagesUrl') || '',
      appsScriptWebAppUrl: getSetting_('appsScriptWebAppUrl') || ''
    }
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
  validateTeacher_(params);
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

function ensureBackend_() {
  Object.keys(SHEET_DEFINITIONS).forEach(sheetName => ensureSheet_(sheetName, SHEET_DEFINITIONS[sheetName]));
}

function ensureSheet_(sheetName, definition) {
  const spreadsheet = ss_();
  let sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet) sheet = spreadsheet.insertSheet(sheetName);
  if (!sheet.getRange(1, 1).getValue()) sheet.getRange(1, 1).setValue(definition.title);
  const headerRange = sheet.getRange(3, 1, 1, definition.headers.length);
  const headers = headerRange.getValues()[0];
  const needsHeaders = definition.headers.some((header, index) => headers[index] !== header);
  if (needsHeaders) {
    headerRange.setValues([definition.headers]);
    headerRange.setFontWeight('bold').setBackground('#eef7f1');
  }
  if (sheetName === SHEET_NAMES.settings) seedSettings_(sheet, definition.defaults);
}

function seedSettings_(sheet, defaults) {
  const rows = sheet.getRange(4, 1, Math.max(sheet.getLastRow() - 3, 1), 3).getValues();
  const existingKeys = rows.map(row => String(row[0] || ''));
  defaults.forEach(row => {
    if (!existingKeys.includes(row[0])) sheet.appendRow(row);
  });
}

function readObjects_(sheetName, headerRow) {
  const sheet = ss_().getSheetByName(sheetName);
  if (!sheet) return [];
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
  const required = getSetting_('classCode') || DEFAULT_CLASS_CODE;
  if (required && String(required) !== String(provided || '')) {
    throw new Error('classCode 不正確');
  }
}

function validateTeacher_(params) {
  const requiredHash = String(getSetting_('teacherPasswordHash') || DEFAULT_TEACHER_PASSWORD_HASH).trim().toLowerCase();
  const providedHash = String(params.teacherPasswordHash || params.teacherAuth || '').trim().toLowerCase();
  const providedPassword = params.teacherPassword ? hash_(params.teacherPassword) : '';
  if (requiredHash !== providedHash && requiredHash !== providedPassword) {
    throw new Error('老師計分密碼不正確');
  }
}

function getSetting_(key) {
  const sheet = ss_().getSheetByName(SHEET_NAMES.settings);
  if (!sheet) return '';
  const lastRow = Math.max(sheet.getLastRow(), 4);
  const rows = sheet.getRange(4, 1, lastRow - 3, 3).getValues();
  const found = rows.find(row => row[0] === key);
  return found ? found[1] : '';
}

function writeSetting_(key, value, note) {
  const sheet = ss_().getSheetByName(SHEET_NAMES.settings);
  const lastRow = Math.max(sheet.getLastRow(), 4);
  const rows = sheet.getRange(4, 1, lastRow - 3, 3).getValues();
  const index = rows.findIndex(row => row[0] === key);
  if (index >= 0) {
    sheet.getRange(index + 4, 2, 1, 2).setValues([[value, note || rows[index][2] || '']]);
  } else {
    sheet.appendRow([key, value, note || '']);
  }
}

function hash_(value) {
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(value), Utilities.Charset.UTF_8);
  return bytes.map(byte => {
    const normalized = byte < 0 ? byte + 256 : byte;
    return normalized.toString(16).padStart(2, '0');
  }).join('');
}

function today_() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
}

function ss_() {
  if (SPREADSHEET_ID) return SpreadsheetApp.openById(SPREADSHEET_ID);
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  if (!spreadsheet) throw new Error('請從 Google 試算表的 Extensions → Apps Script 建立專案，或在 SPREADSHEET_ID 填入試算表 ID');
  return spreadsheet;
}
