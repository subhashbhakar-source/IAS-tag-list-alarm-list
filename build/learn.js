/* Learning aids for IAS Alarm & Tag Finder (inlined into the page by build/encrypt_build.py in place of __LEARN_JS__).
   Pure helpers, no data inside: tag decoder, plain-English descriptions, glossary, limits picture,
   action chain, search synonyms and guide links. The main script calls LEARN.prep(D) after unlock. */
const LEARN = (() => {
"use strict";
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const unent = s => String(s).replace(/&apos;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

// ---------------- plain English ----------------
// Abbreviations used in the yard / maker descriptions. Only clear, unambiguous ones are expanded.
const ABBR = {
  'M/E':'main engine', 'G/E':'generator engine', 'E/G':'emergency generator', 'T/C':'turbocharger', 'E/R':'engine room',
  'S/T':'stern tube', 'S/G':'steering gear', 'P/P':'pump',
  'TEMP':'temperature', 'PRESS':'pressure', 'EXH':'exhaust', 'CYL':'cylinder', 'GEN':'generator', 'COMP':'compressor',
  'BEAR':'bearing', 'TRANSF':'transformer', 'CTRL':'control', 'CIRC':'circulating', 'SUP':'supply', 'SERV':'service',
  'SETT':'settling', 'AUX':'auxiliary', 'LIQ':'liquid', 'INDI':'indication', 'IND':'indication', 'POS':'position',
  'DIFF':'differential', 'BETW':'between', 'ERR':'error', 'COMM':'communication', 'COM':'communication', 'CMD':'command',
  'SYS':'system', 'RM':'room', 'STOR':'storage', 'INCOM':'incoming', 'ELEC':'electric', "EM'CY":'emergency',
  'EMCY':'emergency', 'EMERG':'emergency', 'ST-BY':'standby', 'STBY':'standby', 'SCAV':'scavenge', 'COOL':'cooling',
  'LUB':'lubrication', 'VV':'valve', 'VLV':'valve', 'TK':'tank', 'T.K':'tank', 'C.T':'cargo tank', 'W.B.T':'water ballast tank',
  'D.W.P':'double-wall pipe', 'P.B':'push button', 'F.O':'fuel oil', 'FO':'fuel oil', 'L.O':'lube oil', 'S.W':'sea water',
  'C.S.W':'cooling sea water', 'F.W':'fresh water', 'FW':'fresh water', 'C.W':'cooling water', 'CW':'cooling water',
  'J.W':'jacket water', 'J.C.W':'jacket cooling water', 'B.W':'ballast water', 'G.W':'glycol water',
  'L.T.F.W':'low-temperature fresh water', 'H.T.F.W':'high-temperature fresh water', 'I.S':'insulation space',
  'I.B.S':'interbarrier space', 'IBS':'interbarrier space', 'H.V':'high-voltage', 'L.V':'low-voltage', 'HV':'high-voltage',
  'LV':'low-voltage', 'D.E':'drive end', 'N.D.E':'non-drive end', 'INL':'inlet', 'BEF':'before', 'CONC':'concentration',
  'STBD':'Stbd', 'FWD':'forward', 'SHD':'shutdown', 'SLD':'slowdown', 'INH':'inhibit', 'ACK':'acknowledge', 'RDY':'ready',
  'TRF':'transfer', 'DIG':'digital', 'ALM':'alarm', 'FLT':'fault', 'LVL':'level', 'ABN':'abnormal', 'REQ':'request',
  'HVMSB':'HV main switchboard', 'HVMCC':'HV motor control centre', 'LVMSB':'LV main switchboard', 'LVMCC':'LV motor control centre',
  'MSB':'main switchboard', 'SWBD':'switchboard', 'ESB':'emergency switchboard', 'VFD':'variable frequency drive (VFD)',
  'PCO':'piston cooling oil (PCO)', 'GAV':'gas admission valve (GAV)', 'SAC':'scavenge air cooler (SAC)',
  'EGC':'exhaust gas cooler (EGC)', 'BPV':'back-pressure valve (BPV)', 'SOV':'shut-off valve (SOV)',
  'FRV':'flow regulation valve (FRV)', 'OMD':'oil mist detector (OMD)', 'FSU':'fuel supply unit (FSU)', 'BOG':'boil-off gas (BOG)',
  'CCW':'cylinder cooling water (CCW)', 'TC':'turbocharger', 'SG':'shaft generator', 'ICER':'iCER', 'WICE':'WiCE', 'NAOH':'NaOH',
  'N2':'nitrogen (N2)'
};
// Obvious misprints in the source lists, corrected in the plain-English line only.
const MISPRINT = {'COMON':'common', 'RESERVIOR':'reservoir', 'AIXIAL':'axial', 'OVERLORD':'overload', 'MOUDLE':'module',
  'INJICTOR':'injector', 'BALLLAST':'ballast', 'INCOMMING':'incoming', 'EMERGENCYU':'emergency', 'ACITVE':'active'};
const ABBR_ALL = Object.assign({}, ABBR, MISPRINT);
// Only expanded when written with a full stop (IN / OUT are ordinary words otherwise).
const ABBR_DOT = {'IN':'inlet', 'OUT':'outlet'};
const reEsc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const ABBR_RE = new RegExp("(?<![A-Za-z0-9'])(" +
  Object.keys(ABBR_DOT).map(k => reEsc(k) + '\\.').concat(
  Object.keys(ABBR_ALL).sort((a, b) => b.length - a.length).map(k => reEsc(k) + '\\.?')).join('|') +
  ")(?![A-Za-z0-9])", 'gi');
const KEEPCAPS = new Set(['VLSFO','EICU','UNIC','IGPR','AMOS','DENIS','HVAC','ECDIS','OFAS','IACS','LDC','HDC','HFO','MGO','LNG']);
const SHORT = new Set(['GAS','OIL','AIR','FAN','LOW','FOR','AND','THE','OUT','OFF','ON','TO','IN','OF','BY','AT','NOT','ALL','RUN','SET',
  'END','TOP','HOT','DRY','TIE','BUS','KEY','MAX','MIN','CUT','NON','ONE','TWO','VIA','NEW','OLD','BOX','NO','UP','OR','WAY','SEA','AFT','USE','ARM','ANY']);
function casefix(w){
  if (!/^[A-Z']+$/.test(w)) return w;
  if (KEEPCAPS.has(w)) return w;
  if (w.length >= 4 && /[AEIOU]/.test(w)) return w.toLowerCase();
  if (SHORT.has(w)) return w.toLowerCase();
  return w;
}
function plain(text, rec){
  if (!text) return '';
  let s = ' ' + text + ' ';
  s = s.replace(/([A-Za-z]{2,})\.(?=[A-Za-z]{2,})/g, '$1. ');      // TEMP.SLD -> TEMP. SLD
  s = s.replace(/\bNO\.\s?(?=\d)/gi, 'No.');                         // NO.1 -> No.1
  s = s.replace(/\b(?!No\.)([A-Za-z]{2,})\.(?=\d)/g, '$1 ');          // CYL.1 -> CYL 1
  s = s.replace(/\bS\.\s?GEN\.?/gi, 'shaft generator');
  s = s.replace(/(\s)aft\.(?=\s)/g, '$1after');
  s = s.replace(/\((P|S)\)/g, (m, p) => p === 'P' ? '(Port)' : '(Stbd)');
  if (rec && rec.s != null && rec.s <= 11) s = s.replace(/^ ([PS]) (?=\S)/, (m, p) => p === 'P' ? ' Port ME: ' : ' Stbd ME: ');
  s = s.replace(ABBR_RE, m => {
    const k = m.toUpperCase();
    if (k.endsWith('.') && ABBR_DOT[k.slice(0, -1)]) return ABBR_DOT[k.slice(0, -1)];
    const v = ABBR_ALL[k.replace(/\.$/, '')];
    return v == null ? m : v;
  });
  s = s.replace(/[A-Za-z][A-Za-z']*/g, casefix);
  s = s.replace(/\s+/g, ' ').trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
}
const same = (a, b) => String(a).toLowerCase().replace(/[^a-z0-9]/g, '') === String(b).toLowerCase().replace(/[^a-z0-9]/g, '');

// ---------------- tag decoder ----------------
// Instrument letters. Kongsberg's own list (XA miscellaneous alarm, XI miscellaneous indication, XC miscellaneous control,
// TI temperature indication ...) follows the same ISA 5.1 letter code.
const ISA1 = {A:'analysis (gas, oil mist …)', D:'density', E:'voltage', F:'flow', H:'hand (manual)', I:'current', J:'power',
  K:'time', L:'level', P:'pressure', Q:'quantity', S:'speed', T:'temperature', U:'multivariable', V:'vibration',
  W:'weight / force', X:'miscellaneous', Y:'event / state', Z:'position'};
const ISA2 = {A:'alarm', C:'control', E:'element (the sensor itself)', G:'gauge / sight glass', H:'high', I:'indication',
  K:'control station', L:'low', R:'recorder', S:'switch', T:'transmitter', V:'valve', X:'miscellaneous',
  Y:'relay / converter / calculation', Z:'actuator'};
const ISASPECIAL = {CV:'control valve', SV:'solenoid valve', POT:'potentiometer', ZV:'Z = position · V = valve (a valve the system drives)'};
function isa(code){
  if (!/^[A-Z]{2,5}$/.test(code)) return null;
  if (ISASPECIAL[code]) return ISASPECIAL[code];
  if (!ISA1[code[0]]) return null;
  const out = [code[0] + ' = ' + ISA1[code[0]]];
  let i = 1;
  if (code[1] === 'D' && code.length > 2 && ISA2[code[2]]){ out.push('D = differential'); i = 2; }
  for (; i < code.length; i++){
    const c = code[i];
    if (!ISA2[c]) return null;
    out.push(c + ' = ' + ISA2[c]);
  }
  return out.join(' · ');
}
const WSUF = {A:'A = signal for the alarm system (IAS)', S:'S = signal for the safety system (shutdown / slowdown)',
  C:'C = signal for the control system (WiCE / AutoChief)', L:'L = local gauge or indicator on the engine', M:'M = local indicator'};
const UNITNAME = {DPU:'DPU — Distributed Processing Unit (a Kongsberg I/O unit)', SCU:'SCU — Segment Controller Unit (AutoChief controller)',
  ACP:'ACP — AutoChief Control Panel', SEG:'operator-station segment', IND:'indicator on the bridge / in the ECR'};
const UNITSUF = {COM:'communication-error point', STA:'status point', MEM:'memory-use point', SW:'software check point'};
const WICEF = {COFD:'COFD — WiCE failure list "Common Failures Diesel"', COFG:'COFG — WiCE failure list "Common Failures Gas"',
  CYFD:'CYFD — WiCE failure list "Cylinder Failures Diesel"', CYFG:'CYFG — WiCE failure list "Cylinder Failures Gas"'};
// Endings of yard-list tags: meaning taken from how they are used in this ship's list (signal type of every point).
const SUFFIX = {IT:'used here on hard-wired analogue inputs (PT100 or 4-20 mA)', NA:'used here on hard-wired alarm contacts (mostly N.C.)',
  NC:'used here on outputs from the IAS (on/off, some 4-20 mA)', XC:'control command out (mostly 4-20 mA)', US:'used here on on/off status inputs',
  ZT:'position feedback', XYO:'open command', XYC:'close command', ZSO:'open feedback (limit switch)', ZSC:'closed feedback (limit switch)',
  SHD:'cut-off / shutdown command', XYSP:'stop command', XYSTF:'start command'};
// System codes at the start of yard-list tags (the "system" column of the E/R Monitoring and Alarm List).
const SYSCODE = {
  MEP:'Main engine – Port', MES:'Main engine – Stbd', MEPGVU:'Main engine Port – gas valve unit (GVU)', MESGVU:'Main engine Stbd – gas valve unit (GVU)',
  DG:'Generator engine', MVMSB:'HV (6.6 kV) main switchboard', MVMCC:'HV (6.6 kV) motor control centre', LVMSB:'LV main switchboard',
  LVMCC:'LV motor control centre', ESB:'Emergency switchboard', EG:'Emergency generator',
  FA:'Fire alarm system (detectors)', GD:'Gas detection', FD:'Fire dampers', CO2:'CO2 fire-extinguishing system', MIST:'Water-mist fire-fighting',
  HERF:'Foam fire-fighting system', FFSP:'Cargo deck water-spray pump', ALS:'Air lubrication system', MIALS:'Air lubrication system (common signals)',
  VRC:'Valve remote control', HPU:'Hydraulic power unit (valve remote control)', GC:'Gas combustion unit (GCU)', GCU:'Gas combustion unit (GCU)',
  IGG:'Inert gas generator', NGAP:'Natural gas analyser', NG:'Nitrogen system', '1NG':'Nitrogen generator No.1', '2NG':'Nitrogen generator No.2',
  BWTS:'Ballast water treatment system', BAP:'Ballast pump', OWS:'Oily water separator', ESV:'ESD valves', ESPB:'ESD push buttons',
  ESSSL:'ESD – ship-shore link', ESCTS:'ESD – cargo tank level alarms', ESIAS:'ESD – IAS UPS alarms', SSL:'Ship-shore link',
  BLR:'Boiler', EGB:'Exhaust gas boiler', ICER:'iCER exhaust gas recirculation', WTS:'iCER water treatment', LMS:'Level monitoring (tanks, draughts)',
  '91':'No.1 HD compressor', '92':'No.2 HD compressor', '93':'No.1 LD compressor', '94':'No.2 LD compressor', HD:'HD compressor', LD:'LD compressor',
  SGPP:'Shaft generator – Port', SGPS:'Shaft generator – Stbd', SGP:'Steering gear – Port', SGS:'Steering gear – Stbd',
  SBCL:'Subcooler unit', CGP:'Main cargo pump', CP:'Cargo pumps', STL:'Stern tube lube oil', GFSU:'Generator engine fuel supply unit',
  MFSU:'Main engine fuel supply unit', PFSU:'Main engine pilot oil pump unit', COH:'Glycol water heaters', CT:'Cargo system HV transformer',
  PAC:'Packaged air conditioners', EDA:"Engineers' safety (dead man) alarm", CHP:'Battery charger panel', GUPS:'General-use UPS',
  IAS:'IAS power supply and UPS', PVL:'Pneumatic ventilation louvres'
};
let PREFSYS = new Map(), WGROUP = new Map();
const lcFirst = b => b.length > 1 && b[1] === b[1].toLowerCase() ? b.charAt(0).toLowerCase() + b.slice(1) : b;
function sysName(p, depth){
  if (SYSCODE[p]) return SYSCODE[p];
  if (depth) return null;
  let m = p.match(/^(\d)(\D.*)$/);
  if (m){ const b = sysName(m[2], 0) || sysName(m[2], 1); if (b) return 'No.' + m[1] + ' ' + lcFirst(b); }
  m = p.match(/^(\D+?)(\d)$/);
  if (m && SYSCODE[m[1]]) return 'No.' + m[2] + ' ' + lcFirst(SYSCODE[m[1]]);
  m = p.match(/^(.+)([PS])$/);
  if (m && SYSCODE[m[1]]) return SYSCODE[m[1]] + (m[2] === 'P' ? ' – Port' : ' – Stbd');
  return null;
}
// rows: [segment, meaning, linkTag]
function decode(tag, rec, has){
  const T = String(tag || '').trim();
  const out = {tag: T, fam: '', rows: []};
  const add = (seg, txt, link) => out.rows.push([seg, txt, link || null]);
  let m = T.match(/^([PS]) (.+)$/);
  if (m){
    out.fam = 'AutoChief 600 tag (one per engine)';
    add(m[1], m[1] === 'P' ? 'Port main engine — AutoChief tags start with the engine letter' : 'Stbd main engine — AutoChief tags start with the engine letter');
    const inner = decode(m[2].replace(/\s+/g, ''), rec, has);
    if (inner.rows.length && /WinGD|instrument/.test(inner.fam)) inner.rows.forEach(r => out.rows.push(r));
    else add(m[2], 'AutoChief signal name — no fixed pattern; read the description');
    return out;
  }
  m = T.match(/^(DPU|SCU|ACP|SEG|IND)(\d{4,5})([A-Z]*)$/);
  if (m){
    out.fam = 'AutoChief 600 system tag';
    add(m[1], UNITNAME[m[1]]);
    add(m[2], 'unit number' + (m[2][1] === '8' ? ' — numbers starting 18 belong to the Stbd ME system' : m[2][1] === '9' ? ' — numbers starting 19 belong to the Port ME system' : ''));
    if (m[3]) add(m[3], UNITSUF[m[3]] || 'point name');
    return out;
  }
  m = T.match(/^([A-Z]{2,4})(\d{4})(?:-(\d{2}))?([A-Z]{0,3})$/);
  if (m){
    const isME = rec && rec.s != null && rec.s <= 11;
    out.fam = isME ? 'WinGD engine tag' : 'Maker’s instrument tag';
    const ia = isME ? isa(m[1]) : null;
    add(m[1], ia || (isME ? 'instrument code (maker’s own letters — the description says what it is)' : 'instrument code from the maker’s list'));
    const g = isME ? WGROUP.get(m[2].slice(0, 2)) : null;
    add(m[2], (isME ? 'point number in the WinGD signal lists' : 'point number in the maker’s list') + (g ? '. Most ' + m[2].slice(0, 2) + 'xx points on these engines are: ' + g : ''));
    if (m[3]) add('-' + m[3], 'covers points ' + m[2] + ' to ' + m[2].slice(0, 2) + m[3] + ' (one tag for a set of identical sensors, e.g. one per cylinder)');
    if (m[4]) add(m[4], isME && WSUF[m[4]] ? WSUF[m[4]] : 'ending letter — the maker’s own meaning; see the description');
    return out;
  }
  m = T.match(/^(SLD|SHD)-(P|S|PR|SR)-(\d+)$/);
  if (m){
    out.fam = 'AutoChief 600 safety channel';
    add(m[1], m[1] === 'SLD' ? 'slowdown channel' : 'shutdown channel');
    add(m[2], {P:'Port ME', S:'Stbd ME', PR:'Port ME channel, as received in the Stbd ME system', SR:'Stbd ME channel, as received in the Port ME system'}[m[2]]);
    add(m[3], 'channel number');
    return out;
  }
  m = T.match(/^(COFD|COFG|CYFD|CYFG)-(\d+)$/);
  if (m){
    out.fam = 'WiCE failure message (WinGD IM 3.1.1.5)';
    add(m[1], WICEF[m[1]]);
    add(m[2], 'failure number in that list');
    return out;
  }
  m = T.match(/^([0-9A-Z]+)-(.+)$/);
  if (m){
    const pre = m[1];
    let rest = m[2], suffix = '';
    const sn = sysName(pre);
    const pi = !sn && /^\d+[A-Z]?$/.test(rest) ? isa(pre) : null;
    if (pi){ out.fam = 'Instrument tag'; add(pre, pi); add(rest, 'instrument number (the description says which unit)'); return out; }
    out.fam = 'Yard alarm-list tag (Kongsberg IAS)';
    add(pre, sn || ('system code in the yard alarm list' + (PREFSYS.get(pre) ? ' — its points belong to: ' + PREFSYS.get(pre) : '')));
    let code = '';
    let mm = rest.match(/^([A-Z]{1,5})-(.+)$/);
    if (mm && isa(mm[1])){ code = mm[1]; add(code, isa(code)); rest = mm[2]; }
    mm = rest.match(/^(.*?)_([A-Za-z0-9]+)$/);
    if (mm){ rest = mm[1]; suffix = mm[2]; }
    if (rest){
      const w = code && /^(MEP|MES)$/.test(pre) && /^\d{4}[A-Z]?$/.test(rest) ? code + rest : '';
      if (w) add(rest, 'WinGD point — together with ' + code + ' it is the engine tag ' + w, has(w) ? w : null);
      else if (/^\d+$/.test(rest)) add(rest, code ? 'instrument number' : 'point number in the IAS' + (/^(MEP|MES)$/.test(pre) ? ' (the IAS point’s own number, not a WinGD number)' : ''));
      else add(rest, 'instrument / point reference as printed in the list');
    }
    if (suffix) add('_' + suffix, SUFFIX[suffix] || 'sub-point name used in this list');
    return out;
  }
  if (rec && (rec.s === 7 || rec.s === 8)){ out.fam = 'AutoChief 600 tag'; add(T, 'AutoChief signal name — no fixed pattern; read the description'); }
  return out;
}

// ---------------- signal types, limits, actions ----------------
function signalPlain(sg){
  if (!sg) return '';
  const s = String(sg);
  const M = {'AI 4-20mA':'a 4–20 mA analogue signal (a measured value on a current loop)', 'AI PT100':'a PT100 resistance thermometer wired straight to the input card',
    'DI N.C':'an on/off contact, normally closed (N.C.)', 'DI N.O':'an on/off contact, normally open (N.O.)', 'DI':'an on/off input',
    'DO':'an on/off output (a command)', 'DO N.O':'an on/off command output (normally open contact)',
    'DI COMM.':'an on/off value received over a data link (not on its own wire)', 'AI COMM.':'a measured value received over a data link (not on its own wire)',
    'DO COMM.':'an on/off command sent over a data link', 'AO 4-20mA':'a 4–20 mA command output (for example a valve set point)',
    'Software tag':'a value made inside the system software — there is no physical sensor', 'Modbus TCP':'a value received over a Modbus TCP (Ethernet) link',
    'DI loop-monitored':'an on/off contact with wire-break monitoring'};
  if (M[s]) return M[s];
  if (/4-20/.test(s)) return 'a 4–20 mA current-loop signal';
  if (/PT100/i.test(s)) return 'a PT100 resistance thermometer';
  if (/COMM|Modbus/i.test(s)) return 'a value received over a data link';
  if (/^DI/.test(s)) return 'an on/off input';
  if (/^DO/.test(s)) return 'an on/off output (a command)';
  if (/^AI/.test(s)) return 'an analogue (measured) input';
  if (/^AO/.test(s)) return 'an analogue output (a command)';
  return '';
}
const LIMNAME = {LL:'low-low', L:'low', H:'high', HH:'high-high'};
const UNIT = u => String(u || '').trim().replace(/^(º|°)?\s*C$|^deg\s*C$|^℃$/i, '°C').replace(/^mpa$/i, 'MPa').replace(/^kpa$/i, 'kPa');
function num(v){
  const s = String(v).replace(/[＜<>≤≥]/g, '').trim();
  const m = s.match(/^(-?\d+(?:\.\d+)?)\s*(.*)$/);
  if (!m || /[\/±;]/.test(s) || s.length > 18) return null;
  return {v: +m[1], u: UNIT(m[2])};
}
// Draws the measuring range as a bar with the alarm limits marked. Returns '' when the values cannot be placed safely.
function limitBar(rec){
  const lim = rec.lim, rg = rec.rg;
  if (!lim || !rg) return '';
  const m = String(rg).match(/^\s*(-?\d+(?:\.\d+)?)\s*(?:…|\.\.\.|~|–|-|to)\s*(-?\d+(?:\.\d+)?)\s*(.*)$/);
  if (!m) return '';
  const lo = +m[1], hi = +m[2], ru = UNIT(m[3]);
  if (!(hi > lo)) return '';
  const marks = [];
  for (const k of ['LL', 'L', 'H', 'HH']){
    if (lim[k] == null) continue;
    const n = num(lim[k]);
    if (!n) return '';
    if (n.u && ru && n.u !== ru && !(n.u === '%' && ru === '%LEL')) return '';
    if (n.v < lo || n.v > hi) return '';
    marks.push({k, v: n.v, p: (n.v - lo) / (hi - lo) * 100});
  }
  if (!marks.length) return '';
  const ps = marks.map(x => x.p);
  if (marks.length > 1 && Math.max(...ps) - Math.min(...ps) < 1.5) return '';
  const pos = k => (marks.find(x => x.k === k) || {}).p;
  const zones = [];
  const z = (a, b, c) => { if (a != null && b != null && b > a) zones.push('<div class="lz ' + c + '" style="left:' + a.toFixed(2) + '%;width:' + (b - a).toFixed(2) + '%"></div>'); };
  const L = pos('L'), LL = pos('LL'), H = pos('H'), HH = pos('HH');
  const lowEdge = L != null ? L : LL, highEdge = H != null ? H : HH;
  z(lowEdge != null ? lowEdge : 0, highEdge != null ? highEdge : 100, 'ok');
  if (L != null) z(LL != null ? LL : 0, L, 'w');
  if (LL != null) z(0, LL, 'd');
  if (H != null) z(H, HH != null ? HH : 100, 'w');
  if (HH != null) z(HH, 100, 'd');
  const sorted = marks.slice().sort((a, b) => a.p - b.p);
  const mk = sorted.map((x, i) => {
    const side = i % 2 ? 'dn' : 'up';
    const al = x.p < 12 ? ' al' : x.p > 88 ? ' ar' : '';
    return '<div class="lmk ' + side + al + '" style="left:' + x.p.toFixed(2) + '%"><span>' + x.k + ' ' + esc(lim[x.k]) + '</span></div>';
  }).join('');
  const sp = String(rec.sp || '');
  const acts = [];
  const re = /\b(SLD|SHD)\s*=\s*(LL|L|HH|H)\b/g;
  let a;
  while ((a = re.exec(sp))) acts.push(a[2] + ' → ' + (a[1] === 'SLD' ? 'slowdown' : 'shutdown'));
  const hasW = L != null || H != null, hasD = LL != null || HH != null;
  return '<div class="lbar" role="img" aria-label="Measuring range ' + esc(rg) + ' with limits ' + esc(marks.map(x => x.k + ' ' + lim[x.k]).join(', ')) + '">' +
    '<div class="ltrack">' + zones.join('') + mk + '</div>' +
    '<div class="lends"><span>' + esc(m[1] + (ru ? ' ' + ru : '')) + '</span><span>' + esc(m[2] + (ru ? ' ' + ru : '')) + '</span></div>' +
    '<div class="lkey"><span><i class="lz ok"></i>normal</span>' + (hasW ? '<span><i class="lz w"></i>first limit (L / H)</span>' : '') +
    (hasD ? '<span><i class="lz d"></i>second limit (LL / HH)</span>' : '') + (acts.length ? '<span><b>' + esc(acts.join(' · ')) + '</b> (set point)</span>' : '') + '</div></div>';
}
function sev(t){
  if (/shut\s?down|\btrip\b(?!.*gas)|^trip|\besd\b|emergency stop|stop\b/i.test(t) && !/gas trip/i.test(t)) return 3;
  if (/slow\s?down|gas trip|gas interlock|interlock/i.test(t)) return 2;
  if (/alarm|\blah\b|\blal\b/i.test(t)) return 1;
  if (/control|standby|start|open|close/i.test(t)) return 0;
  return -1;
}
// Turns "Alarm / Slowdown" into coloured steps. "/" in the lists separates two levels, "+" means together.
function actionChain(ac, fmt){
  if (!ac) return '';
  const s = String(ac);
  if (s.length > 60 || !/[\/+&]/.test(s)) {
    const v = sev(s);
    return v < 0 || s.length > 60 ? fmt(s) : '<span class="act"><span class="st sv' + v + '">' + fmt(s) + '</span></span>';
  }
  const parts = s.split(/\s*([\/+&])\s*/);
  let h = '<span class="act">';
  for (let i = 0; i < parts.length; i++){
    const p = parts[i];
    if (i % 2){ h += '<span class="sep">' + (p === '/' ? '→' : '+') + '</span>'; continue; }
    if (!p) continue;
    const v = sev(p);
    h += '<span class="st sv' + (v < 0 ? 'x' : v) + '">' + fmt(p) + '</span>';
  }
  return h + '</span>';
}
function actionWords(ac){
  if (!ac) return '';
  const s = String(ac);
  if (s.length > 90) return s;
  return s.split(/\s*\/\s*/).map(x => x.replace(/\s*[+&]\s*/g, ' and ').toLowerCase()).join(', then ');
}

// ---------------- glossary ----------------
// [title, explanation, source]. Sources: KT = Kongsberg terminology list 415950/E in the AutoChief 600 manual; app = this app's data.
const GL = {
  IAS:['IAS — Integrated Automation System', 'The Kongsberg K-Chief 700 on this ship. It collects alarms and measurements from the machinery and cargo plant, shows them on the operator stations (the IAS screens) and runs the automatic control functions.', 'KT'],
  AMS:['AMS — Alarm and Monitoring System', 'The alarm part of the IAS. A signal "to AMS" raises an alarm on the IAS screens and the watch-call panels.', 'KT'],
  KCHIEF:['K-Chief 700', 'Kongsberg’s product name for the IAS on this ship.', ''],
  AUTOCHIEF:['AutoChief 600', 'Kongsberg’s main-engine remote control. It turns the bridge / ECR lever order into engine commands and holds the engine safety system (shutdowns and slowdowns). The panel is the CP 600 / ACP.', 'KT'],
  ESS:['ESS — Engine Safety System', 'The protection that stops (shutdown) or slows down (slowdown) the main engine when a critical value is passed. Here its inputs are wired to the AutoChief 600 Engine Safety Units (ESU).', 'KT'],
  ESU:['ESU — Engine Safety Unit', 'AutoChief 600 unit that carries the engine’s shutdown inputs, the emergency stops and the fuel shutdown valve output. DPU 1820 / 1830 / 1835 are on the Stbd ME system, 1920 / 1930 / 1935 on the Port ME system.', 'KT'],
  DPU:['DPU — Distributed Processing Unit', 'A Kongsberg I/O unit fitted in a cabinet. The wires from sensors and valves land on its terminals, and it passes the values to the rest of the system over the CAN bus. In this app the AutoChief units numbered 18xx belong to the Stbd ME and 19xx to the Port ME.', 'KT'],
  SCU:['SCU — Segment Controller Unit', 'The AutoChief 600 controller for one engine’s process segment: SCU 1800 for the Stbd ME, SCU 1900 for the Port ME.', 'KT'],
  RAI:['RAi — Remote Analogue input module', 'A DPU type that reads analogue signals such as 4-20 mA and PT100.', 'KT'],
  RPMU:['RPMU — RPM Unit', 'The AutoChief unit that reads the engine speed pick-ups.', 'KT'],
  ACP:['ACP — AutoChief Control Panel', 'The AutoChief 600 panel (CP 600) on the bridge and in the ECR.', 'KT'],
  OS:['OS — Operator Station', 'An IAS screen with its computer.', 'KT'],
  CAN:['CAN bus', 'The network that links the AutoChief units. It is doubled (CAN 1 and CAN 2), so one broken cable does not stop the system.', 'app'],
  WICE:['WiCE — WinGD integrated Control Electronics', 'The main engine’s own electronic control system (fuel and gas injection, gas admission, exhaust valves, starting). Its failure messages are the COFD / COFG / CYFD / CYFG lists.', ''],
  WECS:['WECS — WinGD Engine Control System', 'The earlier WinGD control-system name (for example WECS-9520). Some lists still use it.', ''],
  DENIS:['DENIS', 'WinGD’s standard set of signals passed between the engine and the ship’s alarm, safety and remote-control systems. The DENIS-WiCE signal list in this app comes from it.', ''],
  GVU:['GVU — Gas Valve Unit', 'The valve station that feeds gas to one main engine and shuts it off on a gas trip.', ''],
  FGSS:['FGSS — Fuel gas supply / gas feed system', 'The system that prepares and supplies fuel gas to the engines (the lists also call it the gas feed system).', ''],
  GCU:['GCU — Gas Combustion Unit', 'Burns boil-off gas that is not used by the engines.', ''],
  PMS:['PMS — Power Management System', 'Starts, stops and shares load between the generators automatically.', 'KT'],
  ESD:['ESD — Emergency Shutdown', 'The cargo / gas safety system: stops pumps and compressors and closes the ESD valves.', 'KT'],
  ICER:['iCER', 'WinGD’s exhaust-gas recirculation on the X-DF engines: part of the exhaust is cooled in the exhaust gas cooler (EGC) and returned to the scavenge air.', ''],
  EGC:['EGC — Exhaust Gas Cooler', 'The cooler in the iCER system that cools the recirculated exhaust gas.', ''],
  SAC:['SAC — Scavenge Air Cooler', 'Cools the charge air after the turbocharger.', ''],
  CCU:['CCU — Cylinder Control Unit', 'The control unit for one cylinder in the engine control system.', 'KT'],
  GAV:['GAV — Gas Admission Valve', 'Lets gas into the cylinder in gas mode.', ''],
  PCO:['PCO — Piston Cooling Oil', 'Oil that cools the piston crown; its flow is watched per cylinder.', 'app'],
  OMD:['OMD — Oil Mist Detector', 'Watches the crankcase for oil mist, an early sign of a hot spot.', ''],
  LEL:['LEL — Lower Explosive Limit', 'Gas detectors read in % of LEL; 100 % LEL is the lowest gas concentration that can burn.', ''],
  BOG:['BOG — Boil-off gas', 'Gas that evaporates from the cargo.', ''],
  IBS:['IBS / I.S. — cargo tank spaces', 'IBS = interbarrier space, I.S. = insulation space of the membrane cargo tanks. Both are kept under nitrogen.', ''],
  VCB:['VCB / ACB — circuit breakers', 'VCB = vacuum circuit breaker (high voltage), ACB = air circuit breaker (low voltage).', ''],
  MCC:['MCC — Motor Control Centre', 'Switchboard section that feeds and starts motors.', 'KT'],
  MSB:['MSB — Main Switchboard', 'The ship’s main electrical switchboard.', 'KT'],
  ESB:['ESB — Emergency Switchboard', 'Switchboard fed by the emergency generator.', 'KT'],
  UPS:['UPS — Uninterruptible Power Supply', 'Battery-backed supply that keeps control systems running during a power failure.', 'KT'],
  VFD:['VFD — Variable Frequency Drive', 'Electronic drive that runs a motor at variable speed.', ''],
  HDLD:['HD / LD compressor', 'High-duty and low-duty cargo vapour compressors.', ''],
  ECR:['ECR / CCR / CCC', 'Engine control room / cargo control room / cargo control console.', 'KT'],
  WC:['WC — Watch call', 'The extension alarm system (WCC600) sends alarms to the duty engineer’s cabin panel, the public panels and the bridge panel when in bridge watch. The alarm group decides where an alarm goes.', 'app'],
  AI:['AI — Analogue Input', 'A measured value coming in, such as a temperature or a pressure.', ''],
  DI:['DI — Digital Input', 'An on/off signal coming in: a switch, a running status or an alarm contact.', ''],
  AO:['AO — Analogue Output', 'A variable command going out, for example a valve opening in %.', ''],
  DO:['DO — Digital Output', 'An on/off command going out: start, stop, open, close.', ''],
  MA:['4-20 mA', 'The standard current loop for measurements: 4 mA = bottom of the range, 20 mA = top. A current far below 4 mA usually means a broken wire, which the system reports as a sensor or loop failure.', ''],
  PT100:['PT100', 'A platinum resistance thermometer: 100 Ω at 0 °C, rising with temperature. It is wired straight to the input card.', ''],
  NC:['N.C. — Normally Closed', 'The contact is closed when all is normal and opens on the event. Used for alarms and shutdowns because a broken wire then also gives the alarm (fail-safe).', 'KT'],
  NO:['N.O. — Normally Open', 'The contact is open when all is normal and closes on the event.', 'KT'],
  COMM:['COMM. — over a data link', 'The value comes over a communication link (serial line, Modbus or network) from another controller, not on its own wire.', ''],
  MODBUS:['Modbus / Modbus TCP', 'A common protocol for passing values between controllers. Modbus TCP runs over Ethernet.', ''],
  SOFT:['Software tag', 'A value made inside the IAS or AutoChief software (calculated value, counter, status). There is no physical sensor behind it.', ''],
  PROMEAS:['Sub-point (ProMeas, Meas1, InClosed …)', 'One K-Chief point has several sub-points. ProMeas carries the point’s value (the measurement, or the on/off state); others carry alarms or feedbacks.', 'app'],
  LIMITS:['L / H / LL / HH — limits', 'L = low, H = high, LL = low-low, HH = high-high. The first level (L / H) normally gives an alarm. The second level (LL / HH) is the more serious one and is often the one linked to a slowdown, shutdown or trip — the Action and Set point fields say which.', ''],
  SETPOINT:['Set point', 'The value at which an alarm or action is triggered, as printed in the source list.', ''],
  DELAY:['Delay', 'How long the condition must last before the alarm or action happens. It stops short spikes from tripping the plant. ESS delays in the WinGD list are maximum values.', 'app'],
  AGROUP:['Alarm group / block group', 'The group an alarm belongs to (for example Block group 2 Propulsion). The extension alarm system reads it to decide whether the alarm goes to the engine or the cargo duty panels.', 'app'],
  SLD:['Slowdown (SLD)', 'The safety system reduces main-engine load and speed to protect it. A cancellable slowdown can be cancelled during its pre-warning time.', 'app'],
  SHD:['Shutdown (SHD)', 'The safety system stops the engine. Cancellable shutdowns have a pre-warning time; non-cancellable ones stop the engine at once. Main bearing oil pressure very low (PS2002S) and overspeed cannot be overridden.', 'app'],
  PREWARN:['Pre-warning', 'The warning time before a cancellable shutdown or slowdown acts. Pressing Cancel SHD / Cancel SLD during this time stops it.', 'app'],
  CANCEL:['Cancellable', 'A shutdown or slowdown that the control position in command may cancel during its pre-warning time. They can also be disabled one by one from the ECR.', 'app'],
  GASTRIP:['Gas trip', 'The gas supply to the engine is shut off (master gas valve closed) and the engine carries on in diesel mode.', 'app'],
  GASIL:['Gas interlock', 'Gas operation is blocked while the condition is active, so the engine cannot change over to gas.', ''],
  INTERLOCK:['Interlock', 'A condition that blocks an action (for example a start) until it is cleared.', ''],
  TRIP:['Trip', 'The equipment is stopped automatically by its protection.', ''],
  // card fields and sections
  FSENSOR:['Sensor', 'The kind of instrument, as given in the source list (temperature element, pressure switch …).', ''],
  FSIGNAL:['Signal', 'How the value reaches the system: a wired analogue signal (AI 4-20 mA, PT100), an on/off contact (DI), a command (DO / AO) or a value over a data link (COMM., Modbus).', ''],
  FRANGE:['Range', 'The span the sensor measures. A 4-20 mA signal is scaled to this span: 4 mA = the low end, 20 mA = the high end.', ''],
  FACTION:['Action', 'What the system does when the limit is passed: alarm, slowdown, shutdown, gas trip, standby pump start … "/" separates two levels (first, then second), "+" means at the same time.', ''],
  FPART:['Part no.', 'The maker’s part or drawing number of the sensor.', ''],
  FEQ:['Equipment', 'The machine or system the signal belongs to.', ''],
  PATH:['Signal path', 'The route of the signal: sensor → terminal box on the engine → Kongsberg DPU (module, channel, terminals) → cabinet → the system that uses it. Follow it when you trace a fault.', ''],
  BOX:['Terminal box', 'Junction box where the sensor cables are gathered before the ship’s cables run to the IAS or AutoChief (E10, E120 … on the engine).', ''],
  IOADDR:['I/O address', 'Where the signal enters or leaves the Kongsberg system: DPU number, module type, channel, terminals and cabinet. Points from the yard list show the row number in that list instead.', ''],
  CHANNEL:['Channel', 'A numbered input or output on a DPU or module. One sensor or one command per channel.', ''],
  TERMINAL:['Terminal', 'The screw terminals where the field wires land, for example X1:71/72/73.', ''],
  CABINET:['Cabinet', 'The panel that holds the DPU (for example GAM 3.1).', ''],
  MODULE:['Module', 'The type of I/O unit (ESU12, RAi_16, RPMU …) or, for yard-list points, the signal type.', ''],
  YARDROW:['Yard list row', 'The point number ("No.") in Jiangnan’s E/R Monitoring and Alarm List 70401004JL. Use it to find the line in that list.', 'app'],
  CFG:['AutoChief safety configuration', 'How the input is set up in the AutoChief safety system: which shutdown or slowdown input, which DPU channel and the pre-warning time.', 'app'],
  SAMEM:['Same measurement', 'Other tags that measure the same thing — the alarm, safety, control and local versions. Compare them to check a suspect reading.', 'app'],
  FOLLOW:['Follow-up tags', 'Tags the source documents name together with this one, for example the common slowdown request it triggers or the local gauge at the same point.', ''],
  LOGIC:['Logic that uses it', 'IAS or AutoChief functions (sequences, interlocks, controllers) that read this signal.', ''],
  SCREEN:['IAS screen', 'The mimic picture on the IAS where the value is shown. The page number is in the K-Chief mimic book 5354211.', ''],
  GUIDES:['Guides', 'Step-by-step help from the manuals: either the guide names this tag, or it covers the action this signal causes (reset a slowdown, gas trip …).', ''],
  ROLES:['A / S / C / L / I', 'Which system uses the signal: A alarm & monitoring (IAS), S safety (shutdown, slowdown, trip, ESD), C control, L local gauge, I indication only.', 'app']
};
const GLGROUPS = [
  ['Systems and units', ['IAS','AMS','KCHIEF','AUTOCHIEF','ESS','ESU','DPU','SCU','RAI','RPMU','ACP','OS','CAN','WICE','WECS','DENIS','GVU','FGSS','GCU','PMS','ESD','ICER','EGC','SAC','CCU','GAV','PCO','OMD','HDLD','MCC','MSB','ESB','UPS','VFD','VCB','IBS','LEL','BOG','ECR','WC']],
  ['Signals', ['AI','DI','AO','DO','MA','PT100','NC','NO','COMM','MODBUS','SOFT','PROMEAS']],
  ['Limits and actions', ['LIMITS','SETPOINT','DELAY','AGROUP','SLD','SHD','PREWARN','CANCEL','GASTRIP','GASIL','INTERLOCK','TRIP']],
  ['Parts of a card', ['ROLES','FSENSOR','FSIGNAL','FRANGE','FACTION','FPART','FEQ','PATH','BOX','IOADDR','CHANNEL','TERMINAL','CABINET','MODULE','YARDROW','CFG','SAMEM','FOLLOW','LOGIC','SCREEN','GUIDES']]
];
// Terms that become tappable when "Explain words" is on. Acronyms are case-sensitive; words are not.
const TERMS_CS = [['IAS','IAS'],['AMS','AMS'],['DPU','DPU'],['SCU','SCU'],['ESU12','ESU'],['ESU','ESU'],['RAi_16','RAI'],['RAi-16xe','RAI'],['RAi','RAI'],
  ['RPMU','RPMU'],['ACP','ACP'],['ESS','ESS'],['WiCE','WICE'],['WICE','WICE'],['WECS','WECS'],['DENIS','DENIS'],['GVU','GVU'],['FGSS','FGSS'],['GCU','GCU'],
  ['PMS','PMS'],['ESD','ESD'],['iCER','ICER'],['ICER','ICER'],['EGC','EGC'],['SAC','SAC'],['CCU','CCU'],['GAV','GAV'],['PCO','PCO'],['OMD','OMD'],['LEL','LEL'],
  ['BOG','BOG'],['IBS','IBS'],['VCB','VCB'],['ACB','VCB'],['MCC','MCC'],['MSB','MSB'],['ESB','ESB'],['UPS','UPS'],['VFD','VFD'],['ECR','ECR'],['CCR','ECR'],
  ['CCC','ECR'],['PT100','PT100'],['4-20 ?mA','MA'],['N\\.C\\.?','NC'],['N\\.O\\.?','NO'],['COMM\\.?','COMM'],['Modbus(?: TCP)?','MODBUS'],
  ['AI','AI'],['DI','DI'],['AO','AO'],['DO','DO'],['LL','LIMITS'],['HH','LIMITS'],['SLD','SLD'],['SHD','SHD'],['ProMeas','PROMEAS'],['AutoChief','AUTOCHIEF'],['K-Chief','KCHIEF']];
const TERMS_CI = [['gas trip','GASTRIP'],['gas interlock','GASIL'],['slow ?down','SLD'],['shut ?down','SHD'],['software tag','SOFT'],['block group','AGROUP'],
  ['alarm group','AGROUP'],['pre-?warning','PREWARN'],['cancellable','CANCEL'],['interlock','INTERLOCK'],['trip','TRIP']];
const RE_CS = new RegExp('(?<![A-Za-z0-9])(' + TERMS_CS.map(x => x[0]).join('|') + ')(?![A-Za-z0-9])', 'g');
const RE_CI = new RegExp('(?<![A-Za-z0-9])(' + TERMS_CI.map(x => x[0]).join('|') + ')(?![A-Za-z0-9])', 'gi');
function termKey(t, list, ci){
  for (const [p, k] of list) if (new RegExp('^(?:' + p + ')$', ci ? 'i' : '').test(t)) return k;
  return null;
}
// Splits text into [{t, k}] where k is a glossary key or null.
function terms(text){
  const s = String(text == null ? '' : text);
  const out = [];
  const pushCI = seg => {
    let last = 0, m;
    RE_CI.lastIndex = 0;
    while ((m = RE_CI.exec(seg))){
      if (m.index > last) out.push({t: seg.slice(last, m.index), k: null});
      out.push({t: m[0], k: termKey(m[0], TERMS_CI, true)});
      last = m.index + m[0].length;
    }
    if (last < seg.length) out.push({t: seg.slice(last), k: null});
  };
  let last = 0, m;
  RE_CS.lastIndex = 0;
  while ((m = RE_CS.exec(s))){
    if (m.index > last) pushCI(s.slice(last, m.index));
    out.push({t: m[0], k: termKey(m[0], TERMS_CS, false)});
    last = m.index + m[0].length;
  }
  if (last < s.length) pushCI(s.slice(last));
  return out;
}

// ---------------- search synonyms ----------------
// Words a person types → words used in the lists. The plain-English text is also searchable, so TEMP, PRESS, M/E … already match.
const SYN = {
  starboard:['stbd','(s)'], stbd:['starboard','(s)'], port:['(p)'], turbo:['t/c','turbocharger'], turbocharger:['t/c','tc '],
  lube:['lub','l.o','lubricat'], lubricating:['lub','l.o'], lubrication:['lub','l.o'], genset:['g/e','generator','dg'],
  generator:['g/e','gen.'], dg:['g/e','generator engine'], emergency:["em'cy",'emcy','emerg'], standby:['st-by','stby'],
  slowdown:['sld','slow down'], shutdown:['shd','shut down'], mist:['omd'], omd:['oil mist'], seawater:['s.w','sea water'],
  freshwater:['f.w','fresh water'], jacket:['j.w','j.c.w'], tank:['t.k','tk '], valve:['vlv','v.v'], boiler:['blr'],
  scavenge:['scav'], compressor:['comp.'], bearing:['bear.'], position:['pos.'], differential:['diff'], pickup:['pick-up','pick up'],
  rpm:['speed'], speed:['rpm']
};
const synonyms = t => SYN[t] || [];

// ---------------- guides ----------------
// Links each signal to the guides that name it, plus guides for the action it causes.
const GUIDE_RULES = [
  [r => r.s <= 11 && /slow\s?down|\bsld\b/i.test((r.ac || '') + ' ' + (r.sp || '') + ' ' + (r.k || '')), ['Reset a slowdown', 'Cancel a cancellable slowdown', 'Tracing an ME shutdown / slowdown', 'ESS rules']],
  [r => r.s <= 11 && /shut\s?down|\bshd\b/i.test((r.ac || '') + ' ' + (r.k || '')), ['Reset a shutdown and restart the main engine', 'Cancel a cancellable shutdown', 'Tracing an ME shutdown / slowdown', 'ESS rules']],
  [r => /gas trip/i.test((r.ac || '') + ' ' + (r.d || '')), ['Gas trip - acknowledge and find the cause']],
  [r => /standby pump|stand-by pump|st-by start|standby start/i.test((r.ac || '') + ' ' + (r.d || '')), ['Standby pump started alarm']],
  [r => /\b(LDC|HDC)\b|LD COMP|HD COMP/i.test((r.ac || '') + ' ' + (r.d || '')) && /trip|shut/i.test((r.ac || '') + ' ' + (r.d || '')), ['How to reset an LD or HD compressor shutdown']],
  [r => r.s <= 11 && /oil mist/i.test(r.d || ''), ['Safety actions during an activated alarm (ME)']],
  [r => /engineers safety|dead ?man|operator fitness/i.test(r.d || ''), ['Reset / test the Operator Fitness']],
  [r => r.s <= 11 && /emerg\.? stop|em'cy stop|emergency stop/i.test(r.d || ''), ['Emergency stop - activate, check status and reset']],
  [r => r.s <= 11 && /overspeed|excessive engine speed/i.test(r.d || ''), ['Overspeed shutdown - cause and reset']]
];
function linkGuides(D){
  const keymap = new Map();
  D.sig.forEach((r, i) => {
    const all = [r.k].concat(r.t || [], (r.io || []).map(x => x.tag));
    for (const t of all) if (t){ const u = String(t).toUpperCase(); if (!keymap.has(u)) keymap.set(u, i); }
  });
  const bySig = new Map(), byGuide = new Map();
  const link = (si, gi) => {
    if (!bySig.has(si)) bySig.set(si, []);
    if (!bySig.get(si).includes(gi)) bySig.get(si).push(gi);
  };
  D.how.forEach((h, gi) => {
    const txt = ((h.title || '') + ' ' + (h.steps || []).join(' ')).toUpperCase();
    const found = new Set();
    for (const m of txt.matchAll(/[A-Z0-9][A-Z0-9_\-\/]{3,}[A-Z0-9]/g)){
      for (const t of [m[0]].concat(m[0].split(/[\/-]/))){
        if (t.length >= 5 && /\d/.test(t) && /[A-Z]/.test(t) && keymap.has(t)) found.add(keymap.get(t));
      }
    }
    if (found.size){ byGuide.set(gi, [...found]); found.forEach(si => link(si, gi)); }
  });
  const titleIdx = prefix => D.how.findIndex(h => (h.title || '').startsWith(prefix));
  const ruleIdx = GUIDE_RULES.map(([test, titles]) => [test, titles.map(titleIdx).filter(i => i >= 0)]);
  D.sig.forEach((r, si) => {
    for (const [test, gs] of ruleIdx){ if (gs.length && test(r)) gs.forEach(gi => link(si, gi)); }
  });
  return {bySig, byGuide};
}

// ---------------- preparation ----------------
function deepUnent(o){
  if (Array.isArray(o)){ for (let i = 0; i < o.length; i++){ const v = o[i]; if (typeof v === 'string'){ if (v.indexOf('&') >= 0) o[i] = unent(v); } else if (v && typeof v === 'object') deepUnent(v); } }
  else if (o && typeof o === 'object'){ for (const k in o){ const v = o[k]; if (typeof v === 'string'){ if (v.indexOf('&') >= 0) o[k] = unent(v); } else if (v && typeof v === 'object') deepUnent(v); } }
}
function prep(D){
  deepUnent(D);
  const SYS = D.sys;
  // most common system per WinGD number group (only ME systems), and per yard-list system code
  const wg = new Map(), pf = new Map();
  for (const r of D.sig){
    const m = r.k.match(/^([A-Z]{2,4})(\d{2})\d{2}(?:-\d{2})?[A-Z]{0,3}$/);
    if (m && r.s != null && r.s <= 11 && !/^(DPU|SCU|ACP|SEG|IND)$/.test(m[1])){
      if (!wg.has(m[2])) wg.set(m[2], new Map());
      const c = wg.get(m[2]); c.set(r.s, (c.get(r.s) || 0) + 1);
    }
    const p = r.k.match(/^([0-9A-Z]+)-/);
    if (p){
      if (!pf.has(p[1])) pf.set(p[1], new Map());
      const c = pf.get(p[1]); c.set(r.s, (c.get(r.s) || 0) + 1);
    }
  }
  const top = (c, minN, minShare) => {
    let best = null, bn = 0, tot = 0;
    c.forEach((n, s) => { tot += n; if (n > bn){ bn = n; best = s; } });
    return tot >= minN && bn / tot >= minShare && SYS[best] && SYS[best] !== 'Other' ? SYS[best] : null;
  };
  WGROUP = new Map(); wg.forEach((c, g) => { const t = top(c, 5, 0.6); if (t) WGROUP.set(g, t); });
  PREFSYS = new Map(); pf.forEach((c, p) => { const t = top(c, 1, 0.5); if (t) PREFSYS.set(p, t); });
  return linkGuides(D);
}

// ---------------- IAS function-module terminals ----------------
// Meaning of the terminal names seen on K-Chief "Show Connection" windows, from the name itself and the PMS KFDD 5354203.
const BTERM = {
  ShutdownLoc:'shutdown from the engine\'s own safety system', ShutdownAVM:'second shutdown input (from IAS logic)',
  AlStartRCS:'alarm start request (variant)', AlStartRCCS:'alarm start request (variant)',
  AddReq:'"alarm start": start the next standby while this generator stays on line', Remote:'generator / breaker in remote control',
  Opened:'breaker open', Closed:'breaker closed', CBTripped:'breaker tripped', CBRemote:'breaker in remote',
  CnctInhib:'connect inhibit', DCnctInhib:'disconnect inhibit', RunRated:'running at rated speed', StartInhib:'start inhibit',
  StbyInhib:'standby inhibit', GenLoad:'generator load (kW)', GenFreq:'generator frequency', Current:'current', Voltage:'voltage',
  LCMaxLoad:'maximum load allowed by load control', LoadshFail:'load-sharing failure', TripCB:'trip the breaker',
  ActOpen:'command: open the breaker', ActClose:'command: close the breaker', ActSync:'command: synchronise and close',
  ActStart:'command: start the engine', ActStop:'command: stop the engine', LoadRef:'load set point', ReduceLoad:'reduce load',
  Running:'running', ActAlarm:'alarm active', TxtLine1:'status text line 1 on the mimic', TxtLine2:'status text line 2 on the mimic',
  TxtLine3:'status text line 3 on the mimic', TxtLine4:'status text line 4 on the mimic', OutGenLoad:'generator load out',
  ReadySt:'ready to start', OutReset:'reset', StartFail:'start failure', Connected:'connected to the bus',
  ProMeas:'value coming in (from an I/O channel or another block)', Meas1:'value going out', AlSuppress:'alarm suppression',
  LimitHH:'high-high limit passed', LimitH:'high limit passed', LimitL:'low limit passed', LimitLL:'low-low limit passed',
  LogOut:'output: ON when any input is ON', LogHist:'output that holds until reset', Reset:'reset input',
  Bus_Abn:'bus abnormal', Bus_Alive:'bus alive', BusAlive:'bus alive', BusFreq:'bus frequency', DG_Online:'generator on line',
  TotDDGNum:'number of DGs on line', BusLowFreq:'bus frequency low', OverCurrent:'over-current', OneSGRun:'only the SG on the bus, no DG',
  DG_ActSync:'sync / close request from the generator block', ActSyncRaw:'sync request passed to the bus logic', ActSyncCMD:'breaker close command out',
  InOpened:'open limit switch', InClosed:'closed limit switch', OutOpened:'breaker open', OutClosed:'breaker closed', OutAvailable:'breaker available / remote',
  NetFreq:'bus frequency', NetVoltage:'bus voltage', Blackout:'blackout', OutColour:'bus alive (also colours the mimic)',
  Freq_HH:'frequency high-high', Freq_LL:'frequency low-low', Volt_HH:'voltage high-high', Volt_LL:'voltage low-low',
  ME_Permission:'main engine permits the SG', SGPermission:'main engine permits the SG', SG_Online:'SG on line', ChangeOverReq:'changeover to DG requested',
  SlowDown_PreW:'ME slowdown pre-warning', CrashAstern:'crash astern', ME_SpdHoldAct:'ME speed hold active', Add_1StandbyDG:'start one standby DG',
  '2ndStandbyDG':'start a second standby DG'
};
// terminals that mean something else on a valve block / in the gas logic (read from the master-gas-valve photos)
const VTERM = {
  Opened:'valve open', Closed:'valve closed', InOpened:'open limit switch (ZSO)', InClosed:'closed limit switch (ZSC)', OutOpened:'valve is open', OutClosed:'valve is closed',
  Open:'open pulse to the solenoid', Close:'close pulse to the solenoid', ControlOpen:'open command from logic (works in Auto)', ControlClose:'close command from logic (works in Auto)',
  Remote:'local / remote switch', OutRemote:'valve in remote', OutCtrMode:'control mode (1 = Auto)', AutoOn:'put the valve in Auto', AutoOff:'put the valve in Manual',
  ShutDownExt:'external shutdown — forces the valve closed while 1', ShutDown:'shutdown input', Interlock:'interlock (blocks the open command while 1)', OutInterlock:'interlocked',
  OutTrip:'tripped', TimeOut:'travel time exceeded', Incons:'feedback inconsistent (both or neither limit switch)', Error:'error', IOError:'I/O error', AckIn:'acknowledge', AckOut:'acknowledged',
  Failure:'valve failure input', Position:'position (analogue)', OpeningControl:'opening control value'
};
const GTERM = {
  NetIn:'data arriving from the other station', NetOut:'data sent to the other station', NetFault:'network link fault', FaultAction:'fault action active', InhibitIn:'inhibit fault action', InhibitOut:'fault action inhibited',
  InOpenCmd:'open request (GMS button)', InCloseCmd:'close request (GMS button)', CtrlFromBMS:'open command from the AutoChief (BMS = bridge manoeuvring system)', GasTripFromBMS:'gas trip from the engine side',
  OpenCmd:'open pulse out', CloseCmd:'close pulse out', Inhibit:'inhibit', ExtFault:'external fault', OkOut:'OK status', Meas2:'second value out', InvMeas1:'inverted value out', HourCount:'running hours',
  Inhibited:'inhibited', ActIn:'number of active inputs', 'Supply ReadyP':'GMS gas ready, Port ME', 'Supply ReadyS':'GMS gas ready, Stbd ME', 'Prepare Req_P':'prepare request from the Port AutoChief',
  'Prepare Req_S':'prepare request from the Stbd AutoChief', TimeOut_P:'gas-ready time-out Port', TimeOut_S:'gas-ready time-out Stbd', GTFFWD:'gas-trip feed-forward to the overpressure valve',
  MGVOP:'master gas valve opened', MGVCL:'master gas valve closed', GasMode:'engine in gas mode', GasTrip:'gas trip', InUse:'in use', InActFlow:'actual gas flow', DelayedFlow:'gas flow one step earlier',
  OutActGasFlow:'actual gas flow out', FwdGasFlow:'forward gas flow', TxtLine:'status text on the mimic', Trip:'trip', MFGV_Closed:'master fuel gas valve closed', 'Open-CMD':'open command (from the AutoChief)',
  Gas_Bar:'gas pressure (bar)', N2_MPa:'nitrogen pressure (MPa)', N2_Opened:'N2 valve opened', COpen:'open command to the valve', CClosed:'close command to the valve', Auto:'put the valve in Auto',
  GFV30Auto:'GFV30 auto', LogOut:'logic output (AND: all inputs ON; OR: any input ON)'
};
const bterm = (t, ty) => (/valve/i.test(ty || '') && VTERM[t]) || BTERM[t] || GTERM[t] || (/^Con\d+$/.test(t) ? 'input ' + t.slice(3) : /^DIG(\d+)$/.test(t) ? 'channel ' + Number(t.slice(3)) : /_Online$/.test(t) ? t.replace(/_Online$/, '') + ' on line' :
  /_Shutdown$/.test(t) ? 'trip ' + t.replace(/_Shutdown$/, '') + ' breaker' : /^GenLoad\d$/.test(t) ? 'load of generator ' + t.slice(-1) : /^(DI|DO|AI|AO)\d+$/.test(t) ? 'spare terminal' : '');

return {_wgroup: () => WGROUP, bterm, esc, plain, same, decode, isa, signalPlain, limitBar, actionChain, actionWords, LIMNAME, GL, GLGROUPS, terms, synonyms, prep, ABBR, ABBR_DOT};
})();
