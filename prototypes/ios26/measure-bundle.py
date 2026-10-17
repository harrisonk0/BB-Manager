"""Measure per-entry built assets, including shared imports, with gzip level 9.
Images, the optional non-Apple font fallback and HTML are reported separately.
"""
import gzip,json,pathlib
here=pathlib.Path(__file__).resolve().parent
root=here/'dist'
manifest=json.loads((root/'.vite/manifest.json').read_text())
results={}
for entry in ['framework7.html','native-plus.html']:
    visited=set();files=set()
    def walk(key):
        if key in visited:return
        visited.add(key);value=manifest[key];files.add(value['file']);files.update(value.get('css',[]))
        for dependency in value.get('imports',[]):walk(dependency)
    walk(entry)
    results[entry]={'files':sorted(files),'javascriptGzipBytes':sum(len(gzip.compress((root/f).read_bytes(),mtime=0)) for f in files if f.endswith('.js')),'cssGzipBytes':sum(len(gzip.compress((root/f).read_bytes(),mtime=0)) for f in files if f.endswith('.css'))}
results['notes']={'compression':'gzip level 9; includes shared entry imports; not full network transfer','font':'Inter fallback 352240 bytes WOFF2, used when earlier system fonts are unavailable; no Apple fonts shipped','images':'official BB assets load where referenced; excluded from JS/CSS figures'}
(here/'evidence/bundle.json').write_text(json.dumps(results,indent=2)+'\n')
print(json.dumps(results,indent=2))
