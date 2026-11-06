#!/usr/bin/env python3
"""rows.json (parsed yard E/R Monitoring and Alarm List 70401004JL) -> extract/er_alarm_list.json (schema records)."""
import json, re, collections
SCR = '/tmp/claude-0/-home-user-IAS-tag-list-alarm-list/f7dd660a-d3c3-58fa-8bdd-148b39e88f46/scratchpad'
R = json.load(open(SCR + '/pdf_er/rows.json'))
BLOCK = {'0': 'Common', '1': 'Power', '2': 'Propulsion', '3': 'Machinery', '4': 'Ballast', '5': 'Cargo', '6': 'Bilge', '7': 'Fire&Gas', '8': 'ESD', '9': 'System',
         '14': 'N2Generator', '15': 'HDCompHeat', '16': 'GCU', '17': 'IGGenerator', '18': 'FirePumps', '19': 'Navigation', '21': 'CTSAlarm', '22': 'CTS',
         '23': 'FOTransfer', '24': 'GasManagement', '26': 'Subcooler'}
DOC = 'Jiangnan 70401004JL E/R Monitoring and Alarm List, H2700-H2705 (final drawing 2024-06-06)'

SYSMAP = {
 'Fire Alarm': 'Fire & gas detection', 'Gas Detection System': 'Fire & gas detection', 'Fire Water And Deck Wash System': 'Fire & gas detection',
 'Valve Remote Control System': 'Cargo system', 'VRC for Cargo': 'Cargo system', 'VRC for Ballast': 'Bilge, ballast & BWTS',
 'Miscellaneous Machinery System': 'Other', 'Miscellaneous Machinery': 'Other', 'Air Lubrication System': 'Other',
 'Subcooler': 'Vapour handling (compressors, vaporizers, heaters)', 'HD Compressor System': 'Vapour handling (compressors, vaporizers, heaters)',
 'LD Compressor System': 'Vapour handling (compressors, vaporizers, heaters)', 'Forcing Vaporizer / Mist Separator And Drain Pot': 'Vapour handling (compressors, vaporizers, heaters)',
 'LNG Vaporizer': 'Vapour handling (compressors, vaporizers, heaters)', 'Fuel Gas Heater': 'Vapour handling (compressors, vaporizers, heaters)',
 'Glycol Water Steam Heater / Electric Heater / Expansion Tank': 'Vapour handling (compressors, vaporizers, heaters)', 'High Duty Compressor': 'Vapour handling (compressors, vaporizers, heaters)',
 'Ballast Pumping System': 'Bilge, ballast & BWTS', 'Bilge': 'Bilge, ballast & BWTS', 'Bilge Level/Pumping System': 'Bilge, ballast & BWTS',
 'GCU': 'GCU', 'Gas Combustion Unbit System': 'GCU',
 'Steam Generating and Service System': 'Boilers, EGE & steam', 'Exhaust Gas Boiler(P)': 'Boilers, EGE & steam', 'Exhaust Gas Boiler(S)': 'Boilers, EGE & steam',
 'N2 Generator': 'Other', 'Inert Gas Generator': 'Other', 'N2 Pressurization In Insulation Space': 'Cargo system', 'N2 Exhaust For Cargo Tank Insulation Space': 'Cargo system', 'N2 Purging System': 'Cargo system',
 'Main / Emergency / Stripping Cargo Pump': 'Cargo system', 'Custody Transfer System (CTS)': 'Cargo system', 'CTS': 'Cargo system', 'Temperature Sensors On Cargo Tank': 'Cargo system',
 'Miscellaneous Cargo System': 'Cargo system', 'Cargo Tank / Insulation Spaces & Atmosphere Pressure': 'Cargo system', 'Fuel Gas Pump': 'Cargo system',
 'Remote Level / Draft Gauging System': 'Cargo system', 'Natural Gas Analyser': 'Cargo system', 'Miscellaneous Deck System': 'Cargo system', 'Cargo Instrument Air': 'Compressed air',
 'Cargo Fresh Water Cooling': 'Sea water & FW cooling', 'Low Voltage Cargo Switchboard': 'Electrical power & switchboards',
 'Emergency Shutdown System': 'ESD system',
 'Fuel Oil Service System': 'Fuel oil transfer & purification', 'FO Transfer and Filling System': 'Fuel oil transfer & purification', 'FO Purifying System': 'Fuel oil transfer & purification', 'Fuel Oil Transfer System': 'Fuel oil transfer & purification',
 'ME & GE & GCU Fuel Gas Service System': 'Gas management (GMS)', 'Compressed Air': 'Compressed air',
 'Steering Gear': 'Steering, navigation & bridge', 'Navigation': 'Steering, navigation & bridge', 'Navigation System': 'Steering, navigation & bridge', 'SSL': 'Steering, navigation & bridge',
 'Main GE System': 'Generators (DG) & PMS',
 'Stern Tube': 'LO transfer & purification', 'Inter Shaft Bearing': 'LO transfer & purification', 'LO Service System': 'ME lubricating oil', 'LO Purifying System': 'LO transfer & purification', 'LO Filling and Transfer System': 'LO transfer & purification',
 'E/R Fresh Water Cooling': 'Sea water & FW cooling', 'Central Cooling Sea Water System': 'Sea water & FW cooling',
 'Ship Performance Monitoring (P)': 'IAS system (OS, DPU, network, alarm handling)', 'Ship Performance Monitoring (S)': 'IAS system (OS, DPU, network, alarm handling)',
 'Main Engine (P) GVU': 'ME fuel gas & GVU', 'Main Engine (S) GVU': 'ME fuel gas & GVU',
}
ME_RULES = [
 (r'SHUTDOWN|SHD|SLOWDOWN|SLD|\bTRIP|EMERG|OVERSPEED|SAFETY', 'ME safety system (shutdown/slowdown)'),
 (r'ICER|EGR|BLEED|SCRUBBER', 'ME iCER / EGR'),
 (r'GVU|\bGAS\b|PILOT|KNOCK|METHANE', 'ME fuel gas & GVU'),
 (r'BEARING|CRANK|PISTON|CYL\.? ?#|LINER|OIL MIST|CROSSHEAD|THRUST|CYL\. ?\d', 'ME bearings, cylinders & crank'),
 (r'LUB|L\.O\.|\bOIL\b|SERVO', 'ME lubricating oil'),
 (r'C\.W\.|COOL|JACKET|WATER', 'ME cooling water'),
 (r'FUEL|F\.O\.', 'ME fuel oil & pilot fuel'),
 (r'\bAIR\b|START', 'ME starting & control air'),
 (r'EXH|SCAV|T/C|TURBO|WASTE GATE', 'ME exhaust, scavenge air & turbocharger'),
 (r'SPEED|RPM|LOAD|FIRING|COMPR\. PR|INJECTION|BALANCING|PROCESS VALUE|MODE|COMMAND|STATUS|FAIL|SIGNAL|MODULE', 'ME engine control (WiCE/WECS)'),
]
def me_system(desc):
    for pat, sysn in ME_RULES:
        if re.search(pat, desc, re.I): return sysn
    return 'ME general'

sys_by_no = collections.defaultdict(collections.Counter)
for r in R:
    if r['sysdesc'] and r['sysdesc'] != '#N/A': sys_by_no[r['sysno']][r['sysdesc']] += 1

def system_of(r):
    sd = r['sysdesc'] if r['sysdesc'] and r['sysdesc'] != '#N/A' else (sys_by_no[r['sysno']].most_common(1)[0][0] if sys_by_no.get(r['sysno']) else '')
    sn = r['sysno']
    if sn in ('MES', 'MEP') or sd == 'Main Propulsion Control System': return me_system(r['desc'])
    if sn.startswith('ICER'): return 'ME iCER / EGR'
    if sn in ('MESGVU', 'MEPGVU'): return 'ME fuel gas & GVU'
    if sd == 'Power Management System':
        if re.match(r'^\dDG$|^DG\d?$', sn) or re.search(r'G/E|GENERATOR|D/G', r['desc']): return 'Generators (DG) & PMS'
        return 'Electrical power & switchboards'
    return SYSMAP.get(sd, 'Other')

SENSOR = {'TE': 'Temperature element', 'TT': 'Temperature transmitter', 'TS': 'Temperature switch', 'PT': 'Pressure transmitter', 'PS': 'Pressure switch',
          'PDT': 'Differential pressure transmitter', 'PDS': 'Differential pressure switch', 'LS': 'Level switch', 'LT': 'Level transmitter', 'FS': 'Flow switch',
          'FT': 'Flow transmitter', 'ZS': 'Position switch', 'ZT': 'Position transmitter', 'ST': 'Speed pickup', 'SE': 'Speed sensor', 'AS': 'Analysis / oil mist detector',
          'XS': 'Status switch', 'YE': 'Vibration / knock sensor', 'CV': 'Control valve / solenoid', 'XV': 'Valve'}
WINGD = re.compile(r'^[A-Z]{1,4}\d{4}[A-Z]\d?$')
ENG = {'MES': 'Stbd', 'MEP': 'Port', 'ICERS': 'Stbd', 'ICERP': 'Port', 'MESGVU': 'Stbd', 'MEPGVU': 'Port', 'SPMS': 'Stbd', 'SPMP': 'Port', 'SGPS': 'Stbd', 'SGPP': 'Port'}

def lim(v, unit): return (v + (' ' + unit if unit else '')).strip()

# group rows by base tag to know which tags have several sub-points
base_count = collections.Counter(r['tag'].rsplit('/', 1)[0] for r in R)
recs = []
for r in R:
    tag_full = r['tag']
    base, suffix = (tag_full.rsplit('/', 1) + [''])[:2] if '/' in tag_full else (tag_full, '')
    desc = re.sub(r'\s+', ' ', r['desc']).strip()
    if suffix and desc.upper().endswith(' ' + suffix.upper()): desc_main = desc[:-len(suffix)].strip()
    else: desc_main = desc
    unit = r['unit']
    limits = {k: lim(r[k], unit) for k in ('LL', 'L', 'H', 'HH') if r[k]}
    txt = (desc + ' ' + r['remark']).upper()
    if re.search(r'SHUTDOWN|\bSHD\b|SLOWDOWN|\bSLD\b|\bTRIP|\bESD\b|EMERGENCY STOP|EMCY STOP', txt): role = 'S'
    elif r['dtype'] in ('DO', 'AO', 'DOLM'): role = 'C'
    elif limits or r['delay']: role = 'A'
    elif re.search(r'ALARM|FAIL|HIGH|\bLOW\b|ABNORMAL|FAULT|OVERLOAD|LEAK|WARNING|ERROR', txt): role = 'A'
    else: role = 'I'
    rec = {'id': f"er_list:{r['no']}", 'kind': 'signal', 'tag': base, 'desc': desc_main, 'system': system_of(r), 'role': role,
           'equipment': r['sysdesc'] if r['sysdesc'] and r['sysdesc'] != '#N/A' else None,
           'refs': [{'doc': DOC, 'page': f"PDF p.{r['page']}", 'section': f"No. {r['no']} · system {r['sysno']}"}]}
    inst = r['inst']
    if inst and WINGD.match(inst): rec['tag_core'] = inst
    if inst: rec['related_tags'] = [inst]
    eng = ENG.get(r['sysno'])
    if not eng and r['sysno'] in ('MES', 'MEP'): eng = ENG[r['sysno']]
    if eng: rec['engine'] = eng
    st = (r['dtype'] + ' ' + r['stype']).strip()
    if st: rec['signal_type'] = st
    if inst:
        m = re.match(r'^([A-Z]{2,3})\d', inst)
        if m and m.group(1) in SENSOR: rec['sensor_type'] = SENSOR[m.group(1)]
    if r['min'] or r['max']: rec['range'] = f"{r['min']}…{r['max']}" + (' ' + unit if unit else '')
    if unit: rec['unit'] = unit
    if limits: rec['limits'] = limits
    if r['delay']: rec['delay'] = r['delay'] + ' s'
    if r['group']: rec['alarm_group'] = f"Block group {r['group']}" + (f" ({BLOCK[r['group']]})" if r['group'] in BLOCK else '')
    if suffix or eng:
        rec['channel'] = '#' + r['no']
        rec['module'] = st or None
    if suffix:
        rec['terminal'] = suffix
        rec['notes'] = f"{suffix}: {desc}" if desc != desc_main else f"Sub-point {suffix}"
    if r['remark']:
        rec['setpoint'] = r['remark'] if re.search(r'\d', r['remark']) and not rec.get('notes') else None
        rec['notes'] = ((rec.get('notes') + ' · ') if rec.get('notes') else '') + 'Remark: ' + r['remark']
    m = re.search(r'\bCYL\.? ?#?(\d+)', desc, re.I)
    if m and eng: rec['cylinder'] = str(int(m.group(1)))
    rec['func_code'] = r['sysno']
    rec = {k: v for k, v in rec.items() if v not in (None, '', [], {})}
    recs.append(rec)

json.dump({'source_id': 'er_list', 'source_title': DOC + ' - 10,221 IAS points, parsed from the PDF text (no OCR)', 'records': recs},
          open(SCR + '/extract/er_alarm_list.json', 'w'), ensure_ascii=False, indent=0)
print('records', len(recs), 'roles', collections.Counter(x['role'] for x in recs), 'systems', collections.Counter(x['system'] for x in recs).most_common(8))
print('linked to WinGD keys', sum(1 for x in recs if x.get('tag_core')), 'multi-point tags', sum(1 for b, c in base_count.items() if c > 1))
