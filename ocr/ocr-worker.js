/* KËR : lit le texte d'une image de reçu, entièrement sur le téléphone.
   Pilote minimal du moteur tesseract.js-core (Apache 2.0), sans la bibliothèque tesseract.js. */
let M=null, api=null, curId=0;
const post=(id,o)=>self.postMessage(Object.assign({id},o));
self.onmessage=async e=>{
 const {id,type,data}=e.data;
 try{
  if(type==='init'){
   self.importScripts('tesseract-core-lstm.wasm.js');
   M=await self.TesseractCore({ TesseractProgress(p){ post(curId,{progress:Math.max(0,Math.min(1,(p-30)/70))}); } });
   const r=await fetch('fra.traineddata'); if(!r.ok) throw Error('fra.traineddata '+r.status);
   M.FS.writeFile('./fra.traineddata',new Uint8Array(await r.arrayBuffer()));
   api=new M.TessBaseAPI();
   if(api.Init(null,'fra',1)===-1) throw Error('init');
   api.SetVariable('tessedit_pageseg_mode','6');
   post(id,{ok:true});
  } else if(type==='read'){
   curId=id;
   M.FS.writeFile('/input',new Uint8Array(data));
   if(api.SetImageFile(1,0)===1) throw Error('image');
   api.Recognize(null);
   post(id,{ok:true,text:api.GetUTF8Text()});
  }
 }catch(err){ post(id,{error:String((err&&err.message)||err)}); }
};
