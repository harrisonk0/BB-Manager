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
parser.add_argument('--phone',action='store_true',help='Use Playwright iPhone 13 emulation; not physical Safari')
parser.add_argument('--browser',default='chromium',choices=['chromium','webkit'])
parser.add_argument('--merge',action='store_true')
parser.add_argument('--variant', choices=['framework7','native-plus'])
parser.add_argument('--only', help='Comma-separated capture names; interactions still run')
a = parser.parse_args()
output = pathlib.Path(os.environ.get('IOS26_EVIDENCE_DIR',str(HERE/'evidence')))/(a.browser+'-phone' if a.phone else a.browser)
(output/'screenshots').mkdir(parents=True, exist_ok=True)
args = ['npx','-y','@playwright/mcp@0.0.83','--headless','--isolated']
if a.browser=='webkit': args += ['--browser','webkit']
if a.phone: args += ['--device','iPhone 13']
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
        checks=json.loads((output/'interactions.json').read_text()) if a.merge and (output/'interactions.json').exists() else []
        scenarios={
          'search-preserved': r"""await page.getByRole('searchbox',{name:'Search members'}).fill('Alex');await page.waitForTimeout(150);check(await page.locator('.roster-row:visible').count()===2,'two matching names');await tab('Marks');await tab('Members');check(await page.getByRole('searchbox',{name:'Search members'}).inputValue()==='Alex','search retained across tabs');""",
          'sheet-detents': r"""await page.getByRole('button',{name:'Filter members',exact:true}).click();await page.getByRole('dialog').waitFor();await page.waitForTimeout(700);const start=await page.locator('.sheet-header:visible').evaluate(e=>e.getBoundingClientRect().top);const expand=await page.getByRole('button',{name:'Expand',exact:true}).count()>0;await page.getByRole('button',{name:expand?'Expand':'Compact',exact:true}).click();await page.waitForFunction(({start,expand})=>{const end=document.querySelector('.sheet-header').getBoundingClientRect().top;return expand?end<start-60:end>start+60;},{start,expand},{timeout:3000});const end=await page.locator('.sheet-header:visible').evaluate(e=>e.getBoundingClientRect().top);check(expand?end<start-60:end>start+60,'accessible detent changes sheet position: '+start+' → '+end);await page.getByRole('button',{name:expand?'Compact':'Expand',exact:true}).click();await page.waitForFunction(start=>Math.abs(document.querySelector('.sheet-header').getBoundingClientRect().top-start)<5,start,{timeout:3000});const returned=await page.locator('.sheet-header:visible').evaluate(e=>e.getBoundingClientRect().top);check(Math.abs(returned-start)<5,'detent returns to initial position: '+start+' → '+returned);""",
          'filter-and-focus': r"""await page.getByRole('button',{name:'Filter members',exact:true}).click();await page.getByRole('dialog').waitFor({state:'visible'});check(await page.locator('[role=dialog]:visible').count()===1,'one modal');await page.getByRole('group',{name:'Filter by squad',exact:true}).getByRole('button',{name:'1',exact:true}).click();await page.getByRole('button',{name:'Show 6 members',exact:true}).click();await page.waitForTimeout(400);check(await page.locator('.roster-row:visible').count()===6,'filtered roster');await page.waitForFunction(()=>document.activeElement?.getAttribute('aria-label')==='Filter members',{},{timeout:2000});check(await page.evaluate(()=>document.activeElement?.getAttribute('aria-label'))==='Filter members','focus restored');""",
          'editor-rank-and-delete': r"""await page.getByRole('button',{name:'Add member',exact:true}).click();await page.waitForTimeout(400);await page.getByLabel('Name',{exact:true}).fill('Zephyr Preview');check(await page.getByLabel('NCO rank',{exact:true}).isDisabled(),'younger member rank disabled');await page.getByLabel('School year',{exact:true}).selectOption('11');await page.getByLabel('NCO rank',{exact:true}).selectOption('Corporal');await page.getByRole('dialog').getByRole('button',{name:'Add member',exact:true}).click();await page.waitForTimeout(500);await page.getByRole('searchbox',{name:'Search members'}).fill('Zephyr');await page.locator('.roster-row:visible').filter({hasText:'Zephyr Preview'}).click();await page.waitForTimeout(500);await page.locator('.profile-header:visible').getByText('Zephyr Preview',{exact:false}).waitFor();check(await page.locator('.profile-header:visible').textContent().then(s=>s.includes('Zephyr Preview')&&s.includes('Corporal')),'new ranked member details');await page.getByRole('button',{name:'Remove member',exact:true}).click();await page.waitForTimeout(400);await page.getByRole('dialog').getByRole('button',{name:'Remove member',exact:true}).click();await page.waitForTimeout(600);check(await page.locator('.roster-row:visible').count()===0,'confirmed removal');""",
          'marks-validation-save': r"""await tab('Marks');const score=page.getByRole('textbox',{name:'Score for Alex Morgan',exact:true});await score.fill('11');await page.getByRole('button',{name:'Save marks',exact:true}).click();check(await score.getAttribute('aria-invalid')==='true','out-of-range rejected');await score.fill('9.5');await page.getByRole('button',{name:'Save marks',exact:true}).click();await page.waitForTimeout(600);check(await page.getByRole('button',{name:'Saved',exact:true}).count()===1,'explicit saved state');check(await score.inputValue()==='9.5','decimal retained');""",
          'attendance-three-states': r"""await tab('Marks');const score=page.getByRole('textbox',{name:'Score for Alex Morgan',exact:true});await page.getByRole('button',{name:'Absent for Alex Morgan',exact:true}).click();check(await score.isDisabled(),'absent disables score');await page.getByRole('button',{name:'Not recorded for Alex Morgan',exact:true}).click();check(await page.getByRole('button',{name:'Not recorded for Alex Morgan',exact:true}).getAttribute('aria-pressed')==='true','unrecorded distinct from absent');await page.getByRole('button',{name:'Present for Alex Morgan',exact:true}).click();await score.fill('');await page.getByRole('button',{name:'Save marks',exact:true}).click();await page.waitForTimeout(600);check(await score.inputValue()==='0','present blank normalizes zero');""",
          'offline-retains-draft': r"""await tab('Marks');const score=page.getByRole('textbox',{name:'Score for Alex Morgan',exact:true});await score.fill('9.5');await page.getByRole('button',{name:'Save marks',exact:true}).click();await page.waitForTimeout(600);check(await page.getByRole('button',{name:'Try again',exact:true}).count()===1,'failed save exposes retry');check(await score.inputValue()==='9.5','failed save keeps draft');await tab('More');await page.getByRole('button',{name:'EW, Preview options',exact:true}).click();await page.waitForTimeout(400);await page.locator('.native-switch').filter({has:page.getByLabel('Simulate offline',{exact:true})}).locator('label').click();await page.getByRole('button',{name:'Close sheet',exact:true}).click();await page.waitForTimeout(400);await tab('Marks');await page.getByRole('button',{name:'Try again',exact:true}).click();await page.waitForTimeout(600);check(await page.getByRole('button',{name:'Saved',exact:true}).count()===1,'retry succeeds');""",
          'junior-validation': r"""await tab('Marks');const field=page.getByRole('textbox',{name:'Behaviour for Alex Morgan',exact:true});await field.fill('6');await page.getByRole('button',{name:'Save marks',exact:true}).click();check(await field.getAttribute('aria-invalid')==='true','Junior behaviour max five');await page.waitForTimeout(60);check(await page.evaluate(()=>document.activeElement?.getAttribute('aria-label'))==='Behaviour for Alex Morgan','focus moves to the invalid Junior field');await field.fill('.5');await page.getByRole('button',{name:'Save marks',exact:true}).click();await page.waitForTimeout(600);check(await page.getByRole('button',{name:'Saved',exact:true}).count()===1,'leading-dot decimal accepted');""",
          'empty-date-guard': r"""await tab('Marks');await page.locator('.meeting-label:visible').click();await page.getByRole('dialog').waitFor();await page.locator('input[name=meeting-date]').fill('');check(await page.getByRole('button',{name:'Choose date',exact:true}).isDisabled(),'empty date cannot crash task');await page.locator('input[name=meeting-date]').fill('2026-10-23');await page.getByRole('button',{name:'Choose date',exact:true}).click();await page.waitForTimeout(600);check((await page.locator('.marks-body:visible').innerText()).includes('23 October'),'valid date remains selectable');""",
          'dirty-date-guard': r"""await tab('Marks');await page.getByRole('textbox',{name:'Score for Alex Morgan',exact:true}).fill('9.5');await page.getByRole('button',{name:'Next meeting',exact:true}).click();await page.waitForTimeout(400);check(await page.getByRole('button',{name:'Discard changes',exact:true}).count()===1,'dirty date change asks');await page.getByRole('button',{name:'Stay here',exact:true}).click();await page.waitForTimeout(400);check(await page.getByRole('textbox',{name:'Score for Alex Morgan',exact:true}).inputValue()==='9.5','stay retains draft');""",
          'switch-touch-hitarea': r"""await tab('More');const wrap=page.locator('.native-switch').filter({has:page.getByLabel('Reduce motion',{exact:true})});const box=await wrap.locator('label').boundingBox();await page.touchscreen.tap(box.x+box.width/2,box.y-4);await page.waitForFunction(()=>document.documentElement.classList.contains('reduce-motion'),{},{timeout:2000});check(await page.getByLabel('Reduce motion',{exact:true}).isChecked(),'switch accepts touch outside its visual track');""",
          'switch-keyboard': r"""await tab('More');const control=page.getByRole('checkbox',{name:'Reduce motion',exact:true});await control.focus();await control.press('Space');await page.waitForFunction(()=>document.documentElement.classList.contains('reduce-motion'),{},{timeout:2000});check(await control.isChecked(),'keyboard changes native checkbox');check(await control.locator('..').evaluate(e=>getComputedStyle(e).outlineStyle)!=='none','switch has visible keyboard focus');""",
          'settings-preferences': r"""await tab('More');await page.locator('.native-switch').filter({has:page.getByLabel('Reduce motion',{exact:true})}).locator('label').click();await page.locator('.native-switch').filter({has:page.getByLabel('Solid navigation',{exact:true})}).locator('label').click();await page.waitForTimeout(100);check(await page.evaluate(()=>document.documentElement.classList.contains('reduce-motion')),'motion preference');check(await page.evaluate(()=>getComputedStyle(document.querySelector('.native-tabs .toolbar-pane,.navigation-pane')).backdropFilter)==='none','opaque navigation');""",
          'leader-contextual-back': r"""await page.locator('.report-row:visible').first().click();await page.waitForTimeout(500);check(await page.getByRole('button',{name:'Remove member',exact:true}).count()===0,'no staff actions in leader detail');const back=page.locator('.back-control:visible,.navbar .back:visible').first();check((await back.innerText()).includes('Squad'),'contextual squad back label');await back.click();await page.waitForTimeout(600);check(await page.locator('.report-row:visible').count()===6,'back restores dated squad roster');""",
          'leader-scope': r"""check(await page.locator('.report-row:visible').count()===6,'own squad dated roster');check(await page.getByRole('group',{name:'Reporting squad',exact:true}).count()===0,'no other squad selector');check(await page.locator('.native-tabs').innerText().then(s=>!s.includes('Marks')&&!s.includes('Members')),'no staff tabs');""",
          'boy-scope': r"""check(await page.locator('.report-row:visible').count()===0,'no teammate marks');check(await page.locator('.native-tabs').innerText().then(s=>!s.includes('Squad')&&!s.includes('Marks')&&!s.includes('Members')),'personal tabs only');"""
        }
        for variant in ([a.variant] if a.variant else ['framework7','native-plus']):
          for name,action in scenarios.items():
            if a.only and name not in a.only.split(','):continue
            if name=='switch-touch-hitarea' and not a.phone:continue
            query='page=members'+('&offline=1' if name=='offline-retains-draft' else '&section=junior' if name=='junior-validation' else '&role=leader' if name in ['leader-scope','leader-contextual-back'] else '&role=boy' if name=='boy-scope' else '')
            code="""async(page)=>{await page.evaluate(()=>window.__qaUnload?.forEach(fn=>window.removeEventListener('beforeunload',fn)));await page.setViewportSize({width:390,height:844});await page.goto(URL);await page.locator('.screen-body:visible').first().waitFor();await page.waitForTimeout(250);const assertions=[];const check=(v,message)=>{if(!v)throw Error(message);assertions.push(message);};const tab=async(name)=>{await page.locator('.native-tabs').getByText(name,{exact:true}).click();await page.waitForTimeout(180);};ACTION return {assertions};}""".replace('URL',json.dumps(os.environ.get('IOS26_TEST_ORIGIN','http://127.0.0.1:4181')+'/'+variant+'.html?'+query)).replace('ACTION',action)
            if a.phone:code=code.replace('.click()', '.tap()').replace('.tap();','.tap();await page.waitForTimeout(180);')
            try:result=tool(code);checks=[r for r in checks if (r['variant'],r['scenario'])!=(variant,name)];checks.append({'variant':variant,'scenario':name,'passed':True,**result});print(variant,name,'PASS',flush=True)
            except Exception as e:checks=[r for r in checks if (r['variant'],r['scenario'])!=(variant,name)];checks.append({'variant':variant,'scenario':name,'passed':False,'error':str(e)});print(variant,name,str(e)[:300],flush=True)
            (output/'interactions.json').write_text(json.dumps(checks,indent=2)+'\n')
    finally:
        proc.terminate()
