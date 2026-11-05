# IAS Alarm & Tag Finder

Offline, phone-friendly search of the Al Areef IAS (Kongsberg K-Chief 700), AutoChief 600 / ESU safety system and
WinGD X72DF-2.1 engine signals, built for troubleshooting alarms.

For any tag or alarm text it shows:

- the tag as printed in each manual, its description, sensor type, signal type and range
- alarm limits (LL / L / H / HH), set point, action (alarm, slowdown, shutdown, standby start ...) and delay
- the **signal path**: sensor location → engine box → Kongsberg DPU, module, channel and terminal → cabinet → system
- the **sensor group**: every sensor that measures the same thing, counted per system
  (alarm system A, safety system S, control system C, local L), so you can cross-check a suspect reading
- follow-up tags, the IAS / AutoChief logic that uses the signal and the IAS mimic screen it belongs to
- the manual and PDF page for every value

## Status

First build (5 Nov 2026): all sources extracted, **verification deferred** at the owner's request. The numbers have not yet been
re-checked line by line against the source pages. Treat every value as "check on the page before acting" until the verified build replaces this one.

## Files

| File | What it is |
|---|---|
| `index.html` | The app. All data is inside it, **encrypted** (AES-256-GCM, key from the access code by PBKDF2-SHA256, 310,000 rounds). Without the access code the page shows nothing. |
| `sw.js`, `manifest.webmanifest`, `icon.svg` | Offline support when the page is served over https (e.g. GitHub Pages): open it once with signal, then it works with none. |
| `build/` | The scripts that turn the extracted manual data into `index.html`. The extracted data itself is **not** in this repository, because the manuals are Kongsberg / WinGD proprietary documents. |

## Use

1. Open `index.html` from an https address (GitHub Pages, or the private claude.ai page).
2. Enter the access code once per device.
3. Search a tag (`PS2002S`, `S TE2101A`), words (`main bearing oil`), a DPU (`DPU 1820`), a cabinet, a screen name or a set-point word (`slowdown`).
   Filter by Alarm / Safety / Control / Local, sensor groups, logic, IAS screens, units & cables or guides, and pick ME Port or ME Stbd.

## Sources

Kongsberg: KFDD 5354199 (Common), 5354200 (Machinery & Ballast), 5354202 (Cargo), 5354203 (PMS), 5354204 (ESD),
5354205 (Vapour handling), 5354206 (GMS), 5354208 (General description), 5354209 (External interface), 5354210 (SPM),
5355814 (IMS), MIMIC book 5354211 (screen titles), AutoChief 600 installation manual 5314542 for H2701 with
the project tag database 5314700/C (IO instrument list, connection arrangement, project parameters, cable list).
WinGD / CSSC-MES: WiCE control signal list DAAD139037, DENIS-WiCE signal list DAAD139034 (scanned, read by OCR),
list of instruments 50089765, control & safety block diagram, engine control diagram, IM X72DF-2.1 (failure IDs).
Pentatech: Al Rahba (H2701) machinery operating manual 2025.

Al Rahba (H2701) is Al Areef's sister ship. Addresses and set points can differ between hulls; always confirm on the
ship's own IAS and on the source page before acting on a value. Values read by OCR are marked in the app.

## Rebuild

```
python3 build/merge.py        # extract/*.json  -> data_raw.json
python3 build/finalize.py     # adds footer and examples -> data.json
python3 build/encrypt_build.py data.json build/template.html index.html "<access code>" --repo
```
