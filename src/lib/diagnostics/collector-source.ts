/**
 * The browser-diagnostics collector bundle (docs/design/diagnostics.md),
 * served as plain JS from `/widget-diagnostics.js` and loaded by the widget
 * loader ONLY when the Product has diagnostics enabled. Budget: <= 4 KB
 * gzip (DX-17); the source is written compactly to stay inside it.
 *
 * Constraints enforced by tests:
 *  - The static ban gate (DX-05) scans the shipped source for banned
 *    identifiers (storage, headers, bodies, serialisation, low-level console
 *    hooks). Do not add them, not even in comments.
 *  - The parity test (DX-06) runs the fixture corpus through `redactText`
 *    below and through `src/lib/diagnostics/redact.ts`, requiring identical
 *    output. Change both together.
 *
 * Plain ES5-style JS like the loader: no template literals, no backticks, no
 * dollar-brace sequences (String.raw keeps regex backslashes intact).
 */

export const COLLECTOR_JS = String.raw`
(function (global) {
 'use strict';

 var URL_RE=/https?:\/\/[^\s"'\x60<>]+/g, EMAIL_RE=/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g,
  EMAIL_TEST=/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/, JWT_RE=/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,
  AUTH2=/\bAuthorization\s*:\s*\S+(?:\s+[A-Za-z0-9._~+/=-]+)?/gi, AUTH1=/\b(?:Bearer|Basic)\s+[A-Za-z0-9._~+/=-]+/gi,
  CARD=/(?:\d[ -]?){12,18}\d/g, HEX=/(?<![0-9A-Za-z_-])[0-9A-Fa-f]{32,}(?![0-9A-Za-z_-])/g, MIXED=/(?<![A-Za-z0-9_-])[A-Za-z0-9_-]{24,}(?![A-Za-z0-9_-])/g,
  UUID=/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/,
  KK=/(?<![A-Za-z0-9_.-])([A-Za-z0-9_.-]{1,64})(\s*[:=]\s*)/g, KV=/^("[^"]*"|'[^']*'|\[[^\]\s]*\]?|[^\s,;{}[\]"']+)/,
  JKV=/"([A-Za-z0-9_.-]{1,64})"(\s*:\s*)"([^"]*)"/g, CTRL=/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g,
  SENS=/(password|passwd|pwd|secret|token|api[_-]?key|access[_-]?key|auth|session|cookie|card|cvv|cvc|iban|ssn)/i;
 function luhn(d){var s=0,x=false;for(var i=d.length-1;i>=0;i--){var v=d.charCodeAt(i)-48;if(x){v*=2;if(v>9)v-=9;}s+=v;x=!x;}return s%10===0;}
 function hot(v){return /^[0-9A-Fa-f]{32,}$/.test(v)||(v.length>=24&&/[A-Za-z]/.test(v)&&/\d/.test(v));}
 function shrink(u){try{var p=new URL(u);return p.origin+p.pathname;}catch(e){return u;}}
 function scrub(u){
  var s=u.indexOf('://');if(s===-1)return u;
  var p=u.indexOf('/',s+3);if(p===-1)return u;
  var head=u.slice(0,p),seg=u.slice(p).split('/');
  for(var i=0;i<seg.length;i++){var g=seg[i];if(!g)continue;
   if(EMAIL_TEST.test(g)){seg[i]='[email]';continue;}
   if(UUID.test(g)||hot(g))seg[i]='[token]';}
  return head+seg.join('/');
 }
 function kvPass(t){
  var out='',copied=0,m;
  KK.lastIndex=0;
  while((m=KK.exec(t))!==null){
   if(!SENS.test(m[1]))continue;
   var vs=m.index+m[0].length;
   var v=KV.exec(t.slice(vs));
   out+=t.slice(copied,m.index)+m[1]+m[2]+'[redacted]';
   copied=vs+(v?v[0].length:0);
  }
  return copied===0?t:out+t.slice(copied);
 }
 function redactText(t){
  t=String(t).replace(URL_RE,shrink).replace(AUTH2,'Bearer [redacted]').replace(AUTH1,'Bearer [redacted]').replace(JWT_RE,'[token]');
  t=t.replace(JKV,function(w,k,s){return SENS.test(k)?'"'+k+'"'+s+'"[redacted]"':w;});
  t=kvPass(t);
  t=t.replace(EMAIL_RE,'[email]').replace(CARD,function(c){var d=c.replace(/\D/g,'');return d.length>=13&&d.length<=19&&luhn(d)?'[card]':c;})
   .replace(HEX,'[token]').replace(MIXED,function(c){return /[A-Za-z]/.test(c)&&/\d/.test(c)?'[token]':c;})
   .replace(URL_RE,scrub);
  return t.replace(CTRL,'');
 }
 // stack parsing: at most 20 frames of fn, file, line, col
 var F2=/^(.*):(\d+):(\d+)$/, F1=/^(.*):(\d+)$/;
 function frame(line){
  var r=line,fn='';
  var a=/^at\s+/.exec(r);if(a)r=r.slice(a[0].length);
  var o=r.lastIndexOf('('),c=r.lastIndexOf(')'),loc='';
  if(o!==-1&&c>o){fn=r.slice(0,o).trim();loc=r.slice(o+1,c);}
  else{var s=r.indexOf('@');if(s!==-1){fn=r.slice(0,s).trim();loc=r.slice(s+1);}else loc=r;}
  var m=F2.exec(loc)||F1.exec(loc);
  return {fn:redactText(fn).slice(0,100),file:redactText(m?m[1]:loc).slice(0,300),
   line:m&&+m[2]>0?+m[2]:0,col:m&&m[3]&&+m[3]>0?+m[3]:0};
 }
 function parseStack(st){
  var out=[],ls=String(st||'').split('\n');
  for(var i=0;i<ls.length&&out.length<20;i++){
   var l=ls[i].trim();
   if(l&&(/^at\s/.test(l)||l.indexOf('@')!==-1))out.push(frame(l));
  }
  return out;
 }
 // escape-aware size estimate (the client may not serialise)
 function est(s){var n=2;for(var i=0;i<s.length;i++){var c=s.charCodeAt(i);n+=c===34||c===92?2:1;}return n;}
 function estEv(e){
  var t=128;function add(v){if(typeof v==='string')t+=est(v);}
  add(e.name);add(e.message);add(e.pagePath);add(e.method);add(e.url);
  if(e.frames)for(var i=0;i<e.frames.length;i++){add(e.frames[i].fn);add(e.frames[i].file);}
  return t;
 }
 // ring buffer: last 50 distinct events, dedupe by kind+message+top frame
 var LIMIT=50, WIN=1800000, EST_MAX=24576;
 function key(e){
  var top=e.frames&&e.frames.length?e.frames[0].file+':'+e.frames[0].line:'';
  if(e.kind==='network')return 'n|'+e.method+'|'+e.url+'|'+e.status;
  return e.kind+'|'+(e.message||'')+'|'+top;
 }
 function createBuffer(limit){
  limit=limit||LIMIT;
  var evs=[],dropped=0,sent=0;
  return {
   push:function(e){
    var k=key(e);
    for(var i=evs.length-1;i>=0;i--)if(evs[i].key===k){evs[i].count++;evs[i].lastSeen=e.lastSeen;return;}
    e.key=k;evs.push(e);
    if(evs.length>limit){evs.shift();dropped++;if(sent>0)sent--;}
   },
   unsent:function(now){
    var out=[];
    for(var i=sent;i<evs.length;i++){if(now-evs[i].lastSeen<=WIN)out.push(evs[i]);else dropped++;}
    return out;
   },
   markAllSent:function(){sent=evs.length;},
   takeDropped:function(){var d=dropped;dropped=0;return d;},
   clear:function(){evs=[];sent=0;},
   size:function(){return evs.length;}
  };
 }
 function createCollector(opts){
  var w=opts.window,so=opts.serviceOrigin||'',buf=createBuffer(LIMIT),paused=!!opts.startPaused,dead=false;
  function fail(e){dead=true;try{if(opts.onError)opts.onError(e);}catch(x){}}
  function path(){try{return redactText(w.location.pathname).slice(0,300);}catch(e){return '';}}
  function rec(e){if(dead||paused)return;var n=Date.now();e.firstSeen=n;e.lastSeen=n;e.count=1;try{buf.push(e);}catch(x){fail(x);}}
  function recErr(kind,name,msg,stack){
   rec({kind:kind,name:redactText(String(name||'Error')).slice(0,200),message:redactText(String(msg||'')).slice(0,500),
    frames:parseStack(stack),pagePath:path()});
  }
  function recNet(method,url,status){
   rec({kind:'network',method:String(method||'GET').toUpperCase().slice(0,10),url:redactText(String(url||'')).slice(0,300),status:status|0});
  }
  function svc(url){if(!so)return false;try{return new URL(url,w.location.href).origin===so;}catch(e){return false;}}
  function abort(e){return !!(e&&typeof e==='object'&&e.name==='AbortError');}
  function mark(f){try{Object.defineProperty(f,'__ss',{value:true});}catch(e){}}
  function install(){
   try{
    w.addEventListener('error',function(ev){
     try{
      if(ev.target&&ev.target!==w)return;
      var e=ev.error;
      if(e&&typeof e==='object')recErr('js_error',e.name,e.message,e.stack);
      else recErr('js_error','Error',ev.message,'at '+(ev.filename||'')+':'+(ev.lineno||0)+':'+(ev.colno||0));
     }catch(x){fail(x);}
    });
    w.addEventListener('unhandledrejection',function(ev){
     try{
      var r=ev.reason;
      if(r&&typeof r==='object'&&typeof r.message==='string')recErr('promise_rejection',r.name||'UnhandledRejection',r.message,r.stack);
      else if(typeof r==='string')recErr('promise_rejection','UnhandledRejection',r,'');
      else recErr('promise_rejection','UnhandledRejection','[non-error rejection: '+typeof r+']','');
     }catch(x){fail(x);}
    });
    var con=w.console;
    if(con)['warn','error'].forEach(function(lv){
     var o=con[lv];if(typeof o!=='function'||o.__ss)return;
     var f=function(){
      try{
       if(!dead&&!paused){
        var parts=[];
        for(var i=0;i<arguments.length&&i<5;i++){
         var a=arguments[i];
         if(typeof a==='string'||typeof a==='number'||typeof a==='boolean')parts.push(String(a));
         else if(a&&typeof a==='object'&&typeof a.name==='string'&&typeof a.message==='string')parts.push(a.name+': '+a.message);
         else parts.push('[object]');
        }
        rec({kind:'warning',message:redactText(parts.join(' ')).slice(0,500),pagePath:path()});
       }
      }catch(x){fail(x);}
      return o.apply(con,arguments);
     };
     mark(f);con[lv]=f;
    });
    var of=w.fetch;
    if(typeof of==='function'&&!of.__ss){
     var wf=function(){
      var m='GET',u='';
      try{
       var i=arguments[0],n=arguments[1];
       u=typeof i==='string'?i:(i&&i.url)?i.url:'';
       m=(n&&n.method)||(i&&i.method)||'GET';
      }catch(e){}
      var p;
      try{p=of.apply(this,arguments);}
      catch(err){try{if(!abort(err)&&u&&!svc(u))recNet(m,u,0);}catch(x){fail(x);}throw err;}
      return p.then(
       function(r){try{if(u&&!svc(u)&&(r.status===0||r.status>=400))recNet(m,u,r.status);}catch(x){fail(x);}return r;},
       function(err){try{if(!abort(err)&&u&&!svc(u))recNet(m,u,0);}catch(x){fail(x);}throw err;}
      );
     };
     mark(wf);w.fetch=wf;
    }
    var xp=w.XMLHttpRequest&&w.XMLHttpRequest.prototype;
    if(xp&&xp.open&&xp.send&&!xp.open.__ss){
     var oo=xp.open,os=xp.send;
     var wo=function(m,u){try{this.__sm=String(m||'GET');this.__su=String(u||'');}catch(e){}return oo.apply(this,arguments);};
     var ws=function(){
      try{
       var x=this,u=x.__su;
       if(u&&!svc(u))x.addEventListener('loadend',function(){
        try{var s=x.status;if(s===0||s>=400)recNet(x.__sm,u,s);}catch(e){fail(e);}
       });
      }catch(e){}
      return os.apply(this,arguments);
     };
     mark(wo);mark(ws);xp.open=wo;xp.send=ws;
    }
   }catch(e){fail(e);}
  }
  install();
  return {
   snapshot:function(){
    if(dead||paused)return null;
    try{
     var now=Date.now(),evs=buf.unsent(now),dropped=buf.takeDropped(),size=0,i;
     for(i=0;i<evs.length;i++)size+=estEv(evs[i]);
     while(evs.length>0&&size>EST_MAX){size-=estEv(evs[0]);evs.shift();dropped++;}
     buf.markAllSent();
     if(evs.length===0)return null;
     var l=w.location;
     return {
      schemaVersion:1,
      environment:{pageUrl:redactText(l.origin+l.pathname).slice(0,300),viewportWidth:w.innerWidth|0,
       viewportHeight:w.innerHeight|0,devicePixelRatio:w.devicePixelRatio||1},
      events:evs.map(function(e){
       var o={kind:e.kind,firstSeen:e.firstSeen,lastSeen:e.lastSeen,count:e.count};
       if(e.name!==undefined)o.name=e.name;
       if(e.message!==undefined)o.message=e.message;
       if(e.frames)o.frames=e.frames;
       if(e.pagePath!==undefined)o.pagePath=e.pagePath;
       if(e.method!==undefined)o.method=e.method;
       if(e.url!==undefined)o.url=e.url;
       if(e.status!==undefined)o.status=e.status;
       return o;
      }),
      droppedCount:dropped
     };
    }catch(e){fail(e);return null;}
   },
   pause:function(){paused=true;buf.clear();},
   resume:function(){paused=false;}
  };
 }
 function autoStart(){
  if(global.__ssDiag)return global.__ssDiag;
  var s=global.document&&global.document.currentScript,so='';
  try{so=(s&&s.getAttribute('data-service-origin'))||(global.__ssDiagConfig&&global.__ssDiagConfig.serviceOrigin)||'';}catch(e){}
  global.__ssDiag=createCollector({window:global,serviceOrigin:so,
   startPaused:!!(global.__ssDiagConfig&&global.__ssDiagConfig.startPaused)});
  return global.__ssDiag;
 }
 if(typeof module!=='undefined'&&module.exports){
  module.exports={redactText:redactText,parseStack:parseStack,parseFrameLine:frame,estimateEvent:estEv,
   estimateString:est,dedupeKey:key,createBuffer:createBuffer,createCollector:createCollector,
   LIMITS:{BUFFER_LIMIT:LIMIT,WINDOW_MS:WIN,CLIENT_ESTIMATE_LIMIT:EST_MAX}};
 } else autoStart();
})(typeof window!=='undefined'?window:globalThis);
`;
