// KËR service worker : l'app fonctionne sans connexion. Changer VERSION à chaque publication déclenche la mise à jour.
const VERSION='ker-v0.11.0';
const FONTS='ker-fonts';
const SNAP='ker-snapshot'; // instantané écrit par l'app pour les alertes en arrière-plan
const SHELL=['./','./index.html','./manifest.webmanifest','./icons/icon-192.png','./icons/icon-512.png','./icons/icon-maskable-512.png','./icons/apple-touch-icon.png'];
self.addEventListener('install',e=>{ e.waitUntil(caches.open(VERSION).then(c=>c.addAll(SHELL))); });
self.addEventListener('activate',e=>{
 e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==VERSION && k!==FONTS && k!==SNAP).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('message',e=>{ if(e.data==='skipWaiting') self.skipWaiting(); });
self.addEventListener('fetch',e=>{
 const req=e.request; if(req.method!=='GET') return;
 const url=new URL(req.url);
 if(url.origin===self.location.origin){
  if(url.pathname.endsWith('/ker-snapshot.json') || url.pathname.endsWith('/ker-sw-sent.json')) return;
  if(req.mode==='navigate'){
   e.respondWith(caches.open(VERSION).then(c=>c.match('./index.html')).then(r=>r||fetch(req)));
   return;
  }
  e.respondWith(caches.match(req).then(r=>r||fetch(req).then(res=>{ if(res.ok){ const cp=res.clone(); caches.open(VERSION).then(c=>c.put(req,cp)); } return res; })));
  return;
 }
 if(url.hostname==='fonts.googleapis.com' || url.hostname==='fonts.gstatic.com'){
  e.respondWith(caches.open(FONTS).then(c=>c.match(req).then(r=>r||fetch(req).then(res=>{ c.put(req,res.clone()); return res; }))));
 }
});

// ---- Alertes en arrière-plan (Android, app installée, quand le navigateur accorde la synchro périodique) ----
const SW_TXT={
 fr:{h1:'Il te reste environ 1 heure à ce rythme',hn:'Il te reste environ {n} heures à ce rythme',out:'Ton crédit est sans doute épuisé',body:'Estimation depuis ton dernier 801. Ouvre KËR pour vérifier ou recharger.'},
 en:{h1:'About 1 hour left at this rate',hn:'About {n} hours left at this rate',out:'Your credit has probably run out',body:'Estimate from your last 801. Open KËR to check or top up.'},
 wo:{h1:'Lu tollu ci benn waxtu moo la des, su nga wéyee nii',hn:'Lu tollu ci {n} waxtu moo la des, su nga wéyee nii',out:'Sa crédit mën na am ne jeex na',body:'Lu jege, dale ko ci sa 801 bu mujj. Ubbil KËR ngir xool walla yokk crédit.'}
};
async function checkSnapshot(){
 const c=await caches.open(SNAP);
 const r=await c.match('./ker-snapshot.json'); if(!r) return;
 const s=await r.json(); if(!s.notify) return;
 const sr=await c.match('./ker-sw-sent.json'); const sent=sr?await sr.json():{};
 const L=SW_TXT[s.lang]||SW_TXT.fr, now=Date.now();
 for(const m of (s.meters||[])){
  if(!(m.burnPerDay>0) || !m.balTs) continue;
  const kwh=m.creditKwh - m.burnPerDay*(now-Date.parse(m.asOf))/86400000;
  const hours=kwh/(m.burnPerDay/24);
  let key=null, title;
  if(hours<=0.5){ key='out:'+m.balTs; title=L.out; }
  else if(hours<=3){ key='h3:'+m.balTs; const h=Math.max(1,Math.round(hours)); title=h<2?L.h1:L.hn.replace('{n}',h); }
  else if(hours<24){ key='h24:'+m.balTs; title=L.hn.replace('{n}',Math.round(hours)); }
  if(!key) continue;
  const full=m.id+':'+key;
  if(sent[full] || (s.sent&&s.sent[full])) continue;
  sent[full]=now;
  await self.registration.showNotification((s.multi?m.label+' · ':'')+title,{body:L.body,tag:full,icon:'icons/icon-192.png',badge:'icons/icon-192.png'});
 }
 await c.put('./ker-sw-sent.json',new Response(JSON.stringify(sent),{headers:{'content-type':'application/json'}}));
}
self.addEventListener('periodicsync',e=>{ if(e.tag==='ker-check') e.waitUntil(checkSnapshot()); });
self.addEventListener('notificationclick',e=>{
 e.notification.close();
 e.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(ws=>{ for(const w of ws){ if('focus' in w) return w.focus(); } return self.clients.openWindow('./'); }));
});
