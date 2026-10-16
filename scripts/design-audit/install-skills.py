#!/usr/bin/env python3
"""Reinstall the audited skills using OpenAI's supported skill installer.
Installs outside the application into CODEX_HOME/skills (or ~/.codex/skills).
Existing installations are never overwritten by the upstream installer.
"""
import json, pathlib, subprocess, sys, tempfile, urllib.request
root = pathlib.Path(__file__).resolve().parents[2]
manifest = json.loads((root/'docs/design-audit/evidence/tool-versions.json').read_text())
with tempfile.TemporaryDirectory(prefix='bb-skill-installer-') as directory:
    dest = pathlib.Path(directory)
    revision = manifest['installerRevision']
    for filename in ['install-skill-from-github.py', 'github_utils.py']:
        url = f'https://raw.githubusercontent.com/openai/skills/{revision}/skills/.system/skill-installer/scripts/{filename}'
        (dest/filename).write_bytes(urllib.request.urlopen(url).read())
    for skill in manifest['skills']:
        subprocess.run([sys.executable,str(dest/'install-skill-from-github.py'),'--repo',skill['repository'],'--ref',skill['revision'],'--path',skill['path']],check=True)
print('Skills installed. Start a new Codex turn/session to refresh automatic discovery.')
