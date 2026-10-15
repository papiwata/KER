// KËR service worker : l'app fonctionne sans connexion. Changer VERSION à chaque publication déclenche la mise à jour.
const VERSION='ker-v0.7.0';
const FONTS='ker-fonts';
const SHELL=['./','./index.html','./manifest.webmanifest','./icons/icon-192.png','./icons/icon-512.png','./icons/icon-maskable-512.png','./icons/apple-touch-icon.png'];
self.addEventListener('install',e=>{ e.waitUntil(caches.open(VERSION).then(c=>c.addAll(SHELL))); });
self.addEventListener('activate',e=>{
 e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==VERSION && k!==FONTS).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('message',e=>{ if(e.data==='skipWaiting') self.skipWaiting(); });
self.addEventListener('fetch',e=>{
 const req=e.request; if(req.method!=='GET') return;
 const url=new URL(req.url);
 if(url.origin===self.location.origin){
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
