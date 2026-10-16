#!/usr/bin/env python3
"""Render/verify the isolated prototype through official Playwright MCP (no live data).
Build, serve dist on 4181, then run this script with --axe-path PATH.
Chromium executable can be selected with PLAYWRIGHT_MCP_EXECUTABLE_PATH.
"""
import argparse, json, os, pathlib, queue, subprocess, threading
ROOT = pathlib.Path(__file__).resolve().parents[2]
HERE = pathlib.Path(__file__).resolve().parent
parser = argparse.ArgumentParser()
parser.add_argument('--axe-path', type=pathlib.Path)
parser.add_argument('--browser',default='chromium',choices=['chromium','webkit'])
parser.add_argument('--variant', choices=['framework7','native-plus'])
parser.add_argument('--only', help='Comma-separated capture names; interactions still run')
a = parser.parse_args()
output = HERE/'evidence'/a.browser
(output/'screenshots').mkdir(parents=True, exist_ok=True)
args = ['npx','-y','@playwright/mcp@0.0.83','--headless','--isolated']
if a.browser=='webkit': args += ['--browser','webkit']
if os.environ.get('PLAYWRIGHT_MCP_NO_SANDBOX') == '1': args += ['--no-sandbox']
if a.browser=='chromium' and os.environ.get('PLAYWRIGHT_MCP_EXECUTABLE_PATH'): args += ['--executable-path',os.environ['PLAYWRIGHT_MCP_EXECUTABLE_PATH']]
with open('/tmp/bb-ios26-comparison-mcp.log','w') as stderr:
    proc = subprocess.Popen(args,cwd=ROOT,text=True,stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=stderr)
    messages = queue.Queue()
    def read():
        for line in proc.stdout:
            try: messages.put(json.loads(line))
            except json.JSONDecodeError: pass
    threading.Thread(target=read,daemon=True).start()
    seq = 0
    def request(method,params):
        global seq
        seq += 1
        proc.stdin.write(json.dumps({'jsonrpc':'2.0','id':seq,'method':method,'params':params})+'\n');proc.stdin.flush()
        while True:
            r=messages.get(timeout=120)
            if r.get('id')==seq:
                if 'error' in r: raise RuntimeError(r['error'])
                return r['result']
    def tool(code):
        r=request('tools/call',{'name':'browser_run_code_unsafe','arguments':{'code':code}})
        if r.get('isError'): raise RuntimeError(str(r)[:2000])
        text='\n'.join(c.get('text','') for c in r.get('content',[]) if c.get('type')=='text')
        start=text.find('### Result\n')
        if start<0: raise RuntimeError(text[:2000])
        return json.loads(text[start+11:text.find('\n### ',start+11)].strip())
    try:
        init=request('initialize',{'protocolVersion':'2024-11-05','capabilities':{},'clientInfo':{'name':'bb-ios26-comparison','version':'1.0.0'}})
        proc.stdin.write(json.dumps({'jsonrpc':'2.0','method':'notifications/initialized'})+'\n');proc.stdin.flush()
        listed=request('tools/list',{})
        tool("async(page)=>{ await page.addInitScript(()=>{ const add=window.addEventListener;window.__qaUnload=[];window.addEventListener=function(type,listener,options){if(type==='beforeunload')window.__qaUnload.push(listener);return add.call(this,type,listener,options);}; });return {ready:true}; }")
        (output/'mcp-verification.json').write_text(json.dumps({'server':init.get('serverInfo'),'tools':[t['name'] for t in listed['tools']]},indent=2)+'\n')
        measurements=[]
        for variant in ['framework7','native-plus']:
            code="""async(page)=>{await page.evaluate(()=>window.__qaUnload?.forEach(fn=>window.removeEventListener('beforeunload',fn)));await page.setViewportSize({width:390,height:844});await page.goto(URL);await page.locator('.marks-body:visible').waitFor();await page.waitForTimeout(500);const result=await page.evaluate(async()=>{const samples=[];for(let i=0;i<15;i++){const t=performance.now();document.querySelector('[aria-label="'+(i%2?'Present':'Absent')+' for Alex Morgan"]').click();await new Promise(requestAnimationFrame);samples.push(performance.now()-t);await new Promise(requestAnimationFrame);}const n=performance.getEntriesByType('navigation')[0];return {clickToNextFrameMs:samples,domContentLoadedMs:n.domContentLoadedEventEnd,loadEventMs:n.loadEventEnd,fixtureMembers:document.querySelectorAll('.mark-row').length,userAgent:navigator.userAgent};});return result;}""".replace('URL',json.dumps(os.environ.get('IOS26_TEST_ORIGIN','http://127.0.0.1:4181')+'/'+variant+'.html?page=marks'))
            result=tool(code);measurements.append({'variant':variant,**result});print(variant,result,flush=True)
        (output/'performance.json').write_text(json.dumps(measurements,indent=2)+'\n')
    finally:
        proc.terminate()
