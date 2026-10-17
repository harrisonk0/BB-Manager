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
parser.add_argument('--merge',action='store_true',help='Replace selected cases in an existing full matrix')
parser.add_argument('--variant', choices=['framework7','native-plus'])
parser.add_argument('--widths',help='Comma-separated widths; default seven target sizes')
parser.add_argument('--only', help='Comma-separated capture names; interactions still run')
a = parser.parse_args()
output = HERE/'evidence'/(a.browser+'-phone' if a.phone else a.browser)
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
        variants=[a.variant] if a.variant else ['framework7','native-plus']
        cases=[('roster','members',''),('filters','members',"await page.getByRole('button',{name:'Filter members',exact:true}).click();"),('detail','members',"await page.locator('.roster-row:visible').first().click();"),('marks-save','marks',"await page.getByRole('textbox',{name:'Score for Alex Morgan',exact:true}).fill('9.5');await page.getByRole('textbox',{name:'Score for Alex Morgan',exact:true}).blur();"),('marks-focused','marks',"await page.getByRole('textbox',{name:'Score for Alex Morgan',exact:true}).fill('9.5');"),('squad','squad&role=leader',''),('settings','settings',''),('workspace','members',"await page.getByRole('button',{name:/Switch workspace/}).filter({visible:true}).click();"),('editor','members',"await page.getByRole('button',{name:'Add member',exact:true}).click();"),('destructive','members',"await page.locator('.roster-row:visible').first().click();await page.getByRole('button',{name:'Remove member',exact:true}).click();")]
        results=json.loads((output/'matrix.json').read_text()) if a.merge and (output/'matrix.json').exists() else []
        for variant in variants:
          for name,screen,action in cases:
            if a.only and name not in a.only.split(','):continue
            for width in ([int(w) for w in a.widths.split(',')] if a.widths else [320,375,390,430,768,1024,1440]):
              code="""async(page)=>{
                if(!page.__route){page.__route=true;await page.context().route('**/*',r=>['127.0.0.1','localhost'].includes(new URL(r.request().url()).hostname)?r.continue():r.abort());}
                await page.evaluate(()=>window.__qaUnload?.forEach(fn=>window.removeEventListener('beforeunload',fn)));
                await page.setViewportSize({width:WIDTH,height:844});const errors=[];const listener=e=>errors.push(e.message);page.on('pageerror',listener);
                const started=Date.now();await page.goto(__URL__);await page.locator('.screen-body:visible').first().waitFor();await page.waitForTimeout(200);
                ACTION
                await page.waitForTimeout(500);await page.evaluate(()=>document.fonts.ready);
                const metrics=await page.evaluate(()=>{
                  const activeDialog=[...document.querySelectorAll('[role=dialog],.sheet-modal')].find(e=>e.getBoundingClientRect().height>0&&getComputedStyle(e).display!=='none'&&getComputedStyle(e).visibility!=='hidden'&&(e.classList.contains('modal-in')||e.hasAttribute('data-vaul-drawer')));
                  const scope=activeDialog||document;
                  const visible=e=>!!e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden'&&!e.closest('[hidden],.view:not(.tab-active),.page-previous,.page-next')&&!e.classList.contains('sr-only')&&!e.classList.contains('skip-link');
                  const controls=[...scope.querySelectorAll('button,a,input,select')].filter(e=>visible(e)&&!e.disabled).map(e=>{const r=e.getBoundingClientRect();return {label:e.getAttribute('aria-label')||e.textContent?.trim().slice(0,55)||e.name,width:+r.width.toFixed(1),height:+r.height.toFixed(1)};});
                  const scroller=document.querySelector('.view.tab-active .page-current .page-content,.plus-page:not([hidden]) .plus-scroll,.plus-detail .plus-scroll');
                  return {viewport:innerWidth,documentWidth:document.documentElement.scrollWidth,contentWidth:scroller?.scrollWidth,smallControls:controls.filter(e=>e.width<43.9||e.height<43.9),backdropSupported:CSS.supports('backdrop-filter','blur(10px)'),navigationFilter:getComputedStyle(document.querySelector('.toolbar-pane,.navigation-pane')||document.body).backdropFilter};
                });
                __AXE__
                const violations=await page.evaluate(async()=>window.axe?(await window.axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa']}})).violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))})):[]);
                await page.screenshot({path:__SHOT__,animations:'disabled'});page.off('pageerror',listener);return {metrics,violations,errors,fixtureLoadMs:Date.now()-started};
              }""".replace('WIDTH',str(width)).replace('__URL__',json.dumps('http://127.0.0.1:4181/'+variant+'.html?page='+screen)).replace('ACTION',action).replace('__AXE__',f"await page.addScriptTag({{path:{json.dumps(str(a.axe_path.resolve()))}}});" if a.axe_path else '').replace('__SHOT__',json.dumps(str(output/'screenshots'/f'{variant}-{name}-{width}.png')))
              # Playwright supports visible filtering through CSS, not filter({visible}).
              code=code.replace("page.getByRole('button',{name:/Switch workspace/}).filter({visible:true})", "page.locator('button.workspace-control:visible').last()")
              try:
                data=tool(code);results=[r for r in results if (r['variant'],r['case'],r['width'])!=(variant,name,width)];results.append({'variant':variant,'case':name,'width':width,**data});print(variant,name,width,'axe',len(data['violations']),'small',len(data['metrics']['smallControls']),flush=True)
              except Exception as e:results=[r for r in results if (r['variant'],r['case'],r['width'])!=(variant,name,width)];results.append({'variant':variant,'case':name,'width':width,'error':str(e)});print(variant,name,width,str(e)[:450],flush=True)
              (output/'matrix.json').write_text(json.dumps(results,indent=2)+'\n')
        print('Matrix entries',len(results),flush=True)
    finally:
        proc.terminate()
