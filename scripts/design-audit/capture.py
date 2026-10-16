#!/usr/bin/env python3
"""Inspect actual components in the synthetic harness through official Playwright MCP.
No third-party Python dependencies. Start the audit Vite server before running.
PLAYWRIGHT_MCP_EXECUTABLE_PATH may select an existing Chromium installation.
"""
import argparse, json, os, pathlib, queue, subprocess, threading
ROOT = pathlib.Path(__file__).resolve().parents[2]
p = argparse.ArgumentParser()
p.add_argument('--axe-path', type=pathlib.Path, help='Optional existing axe.min.js; not a runtime dependency')
p.add_argument('--only', help='Comma-separated case names')
a = p.parse_args()
output = ROOT / 'docs/design-audit'
(output/'screenshots').mkdir(parents=True, exist_ok=True)
(output/'evidence').mkdir(parents=True, exist_ok=True)
args = ['npx','-y','@playwright/mcp@0.0.83','--headless','--isolated']
if os.environ.get('PLAYWRIGHT_MCP_NO_SANDBOX') == '1':
    args += ['--no-sandbox']
if os.environ.get('PLAYWRIGHT_MCP_EXECUTABLE_PATH'):
    args += ['--executable-path',os.environ['PLAYWRIGHT_MCP_EXECUTABLE_PATH']]
with open('/tmp/bb-design-audit-mcp.log','w') as stderr:
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
    def tool(name,arguments):
        r=request('tools/call',{'name':name,'arguments':arguments})
        if r.get('isError'): raise RuntimeError(r)
        return r
    try:
        init=request('initialize',{'protocolVersion':'2024-11-05','capabilities':{},'clientInfo':{'name':'bb-manager-design-audit','version':'1.0.0'}})
        proc.stdin.write(json.dumps({'jsonrpc':'2.0','method':'notifications/initialized'})+'\n');proc.stdin.flush()
        listed=request('tools/list',{})
        (output/'evidence/mcp-verification.json').write_text(json.dumps({'server':init.get('serverInfo'),'tools':[t['name'] for t in listed['tools']]},indent=2)+'\n')
        cases = [('login','login','company','populated',''),('sections','sections','company','populated',''),('home','home','company','populated',''),('junior-home','home','junior','populated',''),('weekly','weeklyMarks','company','populated',''),('junior-weekly','weeklyMarks','junior','populated',''),('dashboard','dashboard','company','populated',''),('member','boyMarks','company','populated',''),('junior-member','boyMarks','junior','populated',''),('settings','settings','company','populated',''),('archives','archives','company','populated',''),('account','accountSettings','company','populated',''),('calendar','companyCalendar','company','populated',''),('access','portalAccess','company','populated',''),('portal','portal','company','populated',''),('portal-calendar','portal','company','populated',"await page.getByRole('button',{name:'Calendar',exact:true}).click();"),('portal-account','portal','company','populated',"await page.getByRole('button',{name:'Account',exact:true}).click();"),('squad','portal','company','populated',"await page.getByRole('button',{name:/Squad dashboard/}).click();"),('setup','setup','company','populated',''),('passkey','passkey','company','populated',''),('empty-home','home','company','empty',''),('empty-dashboard','dashboard','company','empty',''),('empty-weekly','weeklyMarks','company','empty',''),('empty-archives','archives','company','empty',''),('error-calendar','companyCalendar','company','error',''),('error-portal','portal','company','error',''),('loading-portal','portal','company','loading',''),('skeleton','skeleton','company','populated',''),('add-dialog','home','company','populated',"await page.getByRole('button',{name:'Add Boy',exact:true}).click();"),('filter-dialog','home','company','populated',"await page.getByRole('button',{name:'Open sort and filter options'}).click();"),('event-dialog','companyCalendar','company','populated',"await page.getByRole('button',{name:'Add event',exact:true}).click();"),('mobile-menu','home','company','populated',"await page.getByRole('button',{name:'Open main menu'}).click();"),('pdf-dialog','dashboard','company','populated',"await page.getByRole('button',{name:'Generate Master PDF'}).click();"),('session-confirm','settings','company','populated',"await page.getByRole('button',{name:'Start new session',exact:true}).click();")]
        all_results=[]
        for name,view,section,state,action in cases:
            if a.only and name not in a.only.split(','): continue
            results=[]
            widths=[320,375,390,430,768,1024,1440]
            if name=='mobile-menu': widths=widths[:5]
            for width in widths:
                url=f'http://127.0.0.1:4174/scripts/design-audit/harness.html?page={view}&section={section}&state={state}'
                # Block every non-loopback request in the browser. The fixture client is also offline.
                axe=f"await page.addScriptTag({{path:{json.dumps(str(a.axe_path.resolve()))}}});" if a.axe_path else ''
                code="""async (page) => {
                  await page.context().route('**/*', route => { const u=new URL(route.request().url());return ['127.0.0.1','localhost'].includes(u.hostname)?route.continue():route.abort(); });
                  await page.setViewportSize({width:WIDTH,height:900});
                  await page.clock.setFixedTime(new Date('2026-10-16T12:00:00Z'));
                  const errors=[]; const listener=e=>errors.push(e.message);page.on('pageerror',listener);
                  await page.goto(__AUDIT_URL__);await page.locator('#root').waitFor();await page.waitForTimeout(250);
                  ACTION
                  await page.waitForTimeout(150);
                  const metrics=await page.evaluate(()=>{
                   const visible=e=>!!(e.offsetWidth||e.offsetHeight||e.getClientRects().length);
                   const controls=[...document.querySelectorAll('button,input,select,textarea,a')].filter(visible).map(e=>{const r=e.getBoundingClientRect();const s=getComputedStyle(e);return {tag:e.tagName,label:e.getAttribute('aria-label')||e.textContent?.trim().slice(0,70)||e.id,width:Math.round(r.width),height:Math.round(r.height),font:s.fontSize};});
                   return {viewport:innerWidth,scrollWidth:document.documentElement.scrollWidth,bodyHeight:document.body.scrollHeight,headings:[...document.querySelectorAll('h1,h2,h3')].map(e=>({text:e.textContent,font:getComputedStyle(e).fontSize})),smallControls:controls.filter(r=>r.width<44||r.height<44),overflow:[...document.querySelectorAll('main *,[role=dialog] *')].filter(visible).map(e=>{const r=e.getBoundingClientRect();return {tag:e.tagName,class:e.className,left:Math.round(r.left),right:Math.round(r.right)}}).filter(r=>r.right>innerWidth+1||r.left< -1).slice(0,12),text:document.body.innerText.slice(0,180)};
                  });
                  AXE
                  const audit=await page.evaluate(async()=>window.axe? (await window.axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa']}})).violations.map(v=>({id:v.id,impact:v.impact,description:v.description,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))})):[]);
                  await page.screenshot({path:SHOT,fullPage:true,animations:'disabled'});
                  page.off('pageerror',listener);
                  return {metrics,violations:audit,errors};
                }""".replace('WIDTH',str(width)).replace('__AUDIT_URL__',json.dumps(url)).replace('ACTION',action).replace('AXE',axe).replace('SHOT',json.dumps(str(output/'screenshots'/f'{name}-{width}.png')))
                try:
                    r=tool('browser_run_code_unsafe',{'code':code})
                    texts='\n'.join(c.get('text','') for c in r.get('content',[]) if c.get('type')=='text')
                    # MCP serializes return values between Result and Ran Playwright code sections.
                    start=texts.find('### Result\n')
                    data=json.loads(texts[start+11:texts.find('\n### ',start+11)].strip()) if start>=0 else {'raw':texts}
                    results.append({'width':width,**data})
                except Exception as e: results.append({'width':width,'captureError':str(e)[:1500]})
            record={'case':name,'componentView':view,'section':section,'state':state,'results':results}
            (output/'evidence'/f'{name}.json').write_text(json.dumps(record,indent=2)+'\n')
            print(name,[(r['width'],r.get('metrics',{}).get('scrollWidth'),r.get('errors',r.get('captureError',''))) for r in results],flush=True)
            all_results.append(record)
        print('Captured',len(all_results),'cases through Playwright MCP.',flush=True)
    finally:
        try: request('tools/call',{'name':'browser_close','arguments':{}})
        finally: proc.terminate()
