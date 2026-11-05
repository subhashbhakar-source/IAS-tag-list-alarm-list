#!/usr/bin/env python3
"""Encrypt the app data and write the final single-file page.

usage: encrypt_build.py DATA.json TEMPLATE.html OUT.html ACCESS_CODE [--repo]
  - data is gzip-compressed, then AES-256-GCM encrypted with a key derived from the
    access code by PBKDF2-HMAC-SHA256 (310,000 iterations, random 16-byte salt).
  - the page decrypts in the browser (WebCrypto + DecompressionStream) and keeps
    the derived key in localStorage so the code is asked for only once per device.
  - --repo keeps the <link rel="manifest"> for the GitHub Pages / offline build;
    without it the link is removed (the claude.ai artifact has no manifest file).
"""
import base64, gzip, hashlib, json, os, re, sys
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

ITER = 310000

def main():
    data_path, tpl_path, out_path, code = sys.argv[1:5]
    repo = '--repo' in sys.argv[5:]
    raw = open(data_path, 'rb').read()
    json.loads(raw)  # must be valid JSON
    gz = gzip.compress(raw, compresslevel=9, mtime=0)
    norm = re.sub(r'[^a-z0-9]', '', code.lower()).encode()
    salt = os.urandom(16)
    iv = os.urandom(12)
    key = hashlib.pbkdf2_hmac('sha256', norm, salt, ITER, 32)
    ct = AESGCM(key).encrypt(iv, gz, None)
    blob = {"v": 1, "iter": ITER, "salt": base64.b64encode(salt).decode(),
            "iv": base64.b64encode(iv).decode(), "ct": base64.b64encode(ct).decode()}
    html = open(tpl_path, encoding='utf-8').read()
    full = repo or '--full' in sys.argv[5:]
    if not repo:
        html = html.replace('<link rel="manifest" href="manifest.webmanifest">\n', '')
    if full:  # stand-alone document (GitHub Pages / local file): add the skeleton the artifact host normally adds
        html = ('<!doctype html>\n<html lang="en"><head><meta charset="utf-8">\n'
                '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n'
                '<style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}</style>\n'
                + html + '\n</html>\n')
    assert '__ENCRYPTED_DATA__' in html
    html = html.replace('__ENCRYPTED_DATA__', json.dumps(blob, separators=(',', ':')))
    open(out_path, 'w', encoding='utf-8').write(html)
    # self-test: decrypt again
    pt = AESGCM(hashlib.pbkdf2_hmac('sha256', norm, salt, ITER, 32)).decrypt(iv, ct, None)
    assert gzip.decompress(pt) == raw
    print(f'data {len(raw)/1e6:.2f} MB -> gzip {len(gz)/1e6:.2f} MB -> page {len(html)/1e6:.2f} MB  ({out_path})')

if __name__ == '__main__':
    main()
