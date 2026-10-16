#!/usr/bin/env python3
"""Render/verify the isolated prototype through official Playwright MCP (no live data).
Start Vite on 4175, then run python3 prototypes/native-ios/verify.py --axe-path PATH.
Chromium executable can be selected with PLAYWRIGHT_MCP_EXECUTABLE_PATH.
"""
import argparse, json, os, pathlib, queue, subprocess, threading
ROOT = pathlib.Path(__file__).resolve().parents[2]
HERE = pathlib.Path(__file__).resolve().parent
parser = argparse.ArgumentParser()
parser.add_argument('--axe-path', type=pathlib.Path)
parser.add_argument('--only', help='Comma-separated capture names; interactions still run')
parser.add_argument('--interactions-only', action='store_true')
a = parser.parse_args()
output = HERE/'evidence'
(output/'screenshots').mkdir(parents=True, exist_ok=True)
args = ['npx','-y','@playwright/mcp@0.0.83','--headless','--isolated']
if os.environ.get('PLAYWRIGHT_MCP_NO_SANDBOX') == '1': args += ['--no-sandbox']
if os.environ.get('PLAYWRIGHT_MCP_EXECUTABLE_PATH'): args += ['--executable-path',os.environ['PLAYWRIGHT_MCP_EXECUTABLE_PATH']]
with open('/tmp/bb-native-prototype-mcp.log','w') as stderr:
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
        init=request('initialize',{'protocolVersion':'2024-11-05','capabilities':{},'clientInfo':{'name':'bb-native-prototype','version':'1.0.0'}})
        proc.stdin.write(json.dumps({'jsonrpc':'2.0','method':'notifications/initialized'})+'\n');proc.stdin.flush()
        listed=request('tools/list',{})
        tool("async(page)=>{ await page.addInitScript(()=>{ const add=window.addEventListener;window.__qaUnload=[];window.addEventListener=function(type,listener,options){if(type==='beforeunload')window.__qaUnload.push(listener);return add.call(this,type,listener,options);}; });return {ready:true}; }")
        (output/'mcp-verification.json').write_text(json.dumps({'server':init.get('serverInfo'),'tools':[t['name'] for t in listed['tools']]},indent=2)+'\n')
        cases=[('members','page=members',''),('marks','page=marks',''),('leader','page=squad&role=leader',''),('settings','page=more','')]
        extras=[('junior','page=marks&section=junior','',320),('filters','page=members',"await page.getByRole('button',{name:'Filter members',exact:true}).click();",390),('editor','page=members',"await page.getByRole('button',{name:'Add member',exact:true}).click();",390),('member-detail','page=members',"await page.getByRole('button',{name:/View Alex Morgan/}).click();",390),('pending','page=marks',"await page.getByRole('button',{name:'Present for Leo Thompson',exact:true}).click();",390),('calendar','page=calendar','',390),('portal','page=mine&role=boy','',390),('workspace','page=more',"await page.getByRole('button',{name:/Switch workspace/}).click();",768)]
        extras += [('save-error','page=marks&simulate=offline',"await page.getByRole('textbox',{name:'Score for Alex Morgan',exact:true}).fill('9.5');await page.getByRole('button',{name:'Save marks',exact:true}).click();await page.getByRole('button',{name:'Try again',exact:true}).waitFor();",390),('focused-marks','page=marks',"await page.getByRole('group',{name:'Marks squad',exact:true}).getByRole('button',{name:'3',exact:true}).click();await page.getByRole('button',{name:'Present for Leo Thompson',exact:true}).click();await page.getByRole('textbox',{name:'Score for Leo Thompson',exact:true}).fill('7.5');await page.evaluate(()=>window.scrollTo(0,0));",390)]
        captures=[(name,query,action,width) for name,query,action in cases for width in [320,375,390,430,768,1024,1440]]+extras
        results=[]
        for name,query,action,width in ([] if a.interactions_only else captures):
            if a.only and name not in a.only.split(','): continue
            axe=f"await page.addScriptTag({{path:{json.dumps(str(a.axe_path.resolve()))}}});" if a.axe_path else ''
            code="""async(page)=>{
              if (!page.__bbQa) { page.__bbQa=true; page.on('dialog',d=>d.accept());await page.context().route('**/*',r=>['127.0.0.1','localhost'].includes(new URL(r.request().url()).hostname)?r.continue():r.abort()); }
              const errors=[];const listener=e=>errors.push(e.message);page.on('pageerror',listener);
              await page.setViewportSize({width:WIDTH,height:844});await page.evaluate(()=>window.__qaUnload?.forEach(fn=>window.removeEventListener('beforeunload',fn)));await page.goto(__URL__);await page.locator('h1:visible').waitFor();await page.evaluate(()=>document.fonts.ready);
              ACTION
              await page.waitForTimeout(300);
              const metrics=await page.evaluate(()=>{
                const visible=e=>!!e.getClientRects().length && getComputedStyle(e).visibility!=='hidden';
                const dialog=document.querySelector('dialog[open]');const scope=dialog||document;
                const controls=[...scope.querySelectorAll('button,input,select,textarea,a,summary')].filter(e=>visible(e)&&!e.classList.contains('skip-link')&&!e.disabled).map(e=>{const r=e.getBoundingClientRect();return {label:e.getAttribute('aria-label')||e.textContent?.trim().slice(0,70)||e.name,width:Math.round(r.width*100)/100,height:Math.round(r.height*100)/100};});
                return {viewport:innerWidth,scrollWidth:document.documentElement.scrollWidth,smallControls:controls.filter(r=>r.width<43.9||r.height<43.9),mainFont:getComputedStyle(document.querySelector('h1:visible')||document.querySelector('h1')).fontFamily};
              });
              AXE
              const violations=await page.evaluate(async()=>window.axe?(await window.axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa']}})).violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))})):[]);
              await page.screenshot({path:SHOT,animations:'disabled'});
              if(WIDTH===390||WIDTH===1440)await page.screenshot({path:FULLSHOT,fullPage:true,animations:'disabled'});
              page.off('pageerror',listener);return {metrics,violations,errors};
            }""".replace('WIDTH',str(width)).replace('__URL__',json.dumps('http://127.0.0.1:4175/?'+query)).replace('ACTION',action).replace('AXE',axe).replace('FULLSHOT',json.dumps(str(output/'screenshots'/f'{name}-{width}-full.png'))).replace('SHOT',json.dumps(str(output/'screenshots'/f'{name}-{width}.png')))
            # querySelector does not support Playwright's :visible pseudo-class.
            code=code.replace("document.querySelector('h1:visible')||document.querySelector('h1')","[...document.querySelectorAll('h1')].find(e=>e.getClientRects().length)")
            try: data=tool(code);results.append({'case':name,'width':width,**data});print(name,width,len(data['violations']),data['metrics']['smallControls'],flush=True)
            except Exception as e: results.append({'case':name,'width':width,'error':str(e)});print(name,width,'ERROR',str(e)[:300],flush=True)
        if not a.interactions_only:
            evidence_file=output/'viewport-validation.json'
            if a.only and evidence_file.exists():
                merged={(r['case'],r['width']):r for r in json.loads(evidence_file.read_text())}
                merged.update({(r['case'],r['width']):r for r in results})
                recorded=list(merged.values())
            else: recorded=results
            evidence_file.write_text(json.dumps(recorded,indent=2)+'\n')
        interaction=tool((HERE/'interaction-checks.js').read_text())
        (output/'interaction-validation.json').write_text(json.dumps(interaction,indent=2)+'\n')
        print('Interactions:',interaction,flush=True)
        failures=[r for r in results if r.get('error') or r.get('errors') or r.get('violations') or r.get('metrics',{}).get('smallControls') or r.get('metrics',{}).get('scrollWidth')!=r['width']]
        if failures: raise SystemExit(f'{len(failures)} capture(s) need review. See evidence/viewport-validation.json')
    finally:
        proc.terminate()
