(() => {
"use strict";
const $ = id => document.getElementById(id);
const state = {file:null,img:null,rotation:0,flipX:false,flipY:false,ratio:null,format:"jpeg",crop:{x:0,y:0,w:1,h:1},result:null,url:null,drag:null};
const el = id => $(id);
const fileInput=el("file"), choose=el("choose"), work=el("work"), empty=el("empty");
function note(msg){const n=el("notice");if(n){n.textContent=msg;n.hidden=false;clearTimeout(note.t);note.t=setTimeout(()=>n.hidden=true,4000)}}
function fmt(bytes){return bytes<1024?bytes+" B":(bytes/1024).toFixed(1)+" KB"}
function showWork(){empty.hidden=true;work.hidden=false}
function resetCrop(){state.crop={x:0,y:0,w:1,h:1};drawCrop()}
function drawCrop(){const c=el("crop");if(!c)return;const a=state.crop;c.style.left=(a.x*100)+"%";c.style.top=(a.y*100)+"%";c.style.width=(a.w*100)+"%";c.style.height=(a.h*100)+"%"}
function updatePhoto(){const photo=el("photo");if(!photo||!state.img)return;photo.src=state.img.src;photo.style.transform=`rotate(${state.rotation}deg) scale(${state.flipX?-1:1},${state.flipY?-1:1})`;photo.style.transformOrigin="center";drawCrop();el("selReadout").textContent=state.file?state.file.name:""}
function loadFile(file){if(!file||!file.type.startsWith("image/")){note("Choose a supported image file.");return}
const url=URL.createObjectURL(file),img=new Image();img.onload=()=>{if(state.url)URL.revokeObjectURL(state.url);state.url=url;state.file=file;state.img=img;state.rotation=0;state.flipX=false;state.flipY=false;state.result=null;showWork();updatePhoto();el("oSize").textContent=fmt(file.size);el("oDim").textContent=img.naturalWidth+" × "+img.naturalHeight;el("rSize").textContent="—";el("rDim").textContent="";el("download").disabled=true;el("saving").textContent="Ready to compress";el("barfill").style.width="0%";el("note").hidden=true;el("previewWrap").hidden=true;el("frame").hidden=false;resetCrop();};img.onerror=()=>{URL.revokeObjectURL(url);note("This image format is not supported by your browser.")};img.src=url}
choose?.addEventListener("click",()=>fileInput.click());
fileInput?.addEventListener("change",()=>{if(fileInput.files[0])loadFile(fileInput.files[0]);fileInput.value=""});
document.addEventListener("dragover",e=>{if(e.dataTransfer?.types?.includes("Files"))e.preventDefault()});
document.addEventListener("drop",e=>{if(e.dataTransfer?.files?.length){e.preventDefault();loadFile(e.dataTransfer.files[0])}});
document.addEventListener("paste",e=>{const f=[...(e.clipboardData?.items||[])].find(x=>x.type.startsWith("image/"));if(f)loadFile(f.getAsFile())});
function transformedCanvas(){const im=state.img,swap=Math.abs(state.rotation)%180===90,w=swap?im.naturalHeight:im.naturalWidth,h=swap?im.naturalWidth:im.naturalHeight,c=document.createElement("canvas");c.width=w;c.height=h;const x=c.getContext("2d");x.translate(w/2,h/2);x.rotate(state.rotation*Math.PI/180);x.scale(state.flipX?-1:1,state.flipY?-1:1);x.drawImage(im,-im.naturalWidth/2,-im.naturalHeight/2);return c}
function cropCanvas(){const src=transformedCanvas(),a=state.crop,x=Math.round(a.x*src.width),y=Math.round(a.y*src.height),w=Math.max(1,Math.round(a.w*src.width)),h=Math.max(1,Math.round(a.h*src.height)),side=Number(el("side")?.value||0),scale=side?Math.min(1,side/Math.max(w,h)):1,c=document.createElement("canvas");c.width=Math.max(1,Math.round(w*scale));c.height=Math.max(1,Math.round(h*scale));c.getContext("2d").drawImage(src,x,y,w,h,0,0,c.width,c.height);return c}
function mime(){return state.format==="jpeg"?"image/jpeg":state.format==="webp"?"image/webp":"image/png"}
function blobOf(canvas,q){return new Promise(resolve=>canvas.toBlob(resolve,mime(),state.format==="png"?undefined:q))}
async function compress(){if(!state.img){note("Add an image first.");return}const btn=el("download"),saving=el("saving"),bar=el("barfill");saving.textContent="Compressing…";bar.style.width="20%";btn.disabled=true;
try{const canvas=cropCanvas(),target=el("limit")?.checked?Math.max(5,Number(el("limitKB").value)||100)*1024:0;let q=Number(el("quality").value||80)/100,blob=await blobOf(canvas,q);
if(target&&state.format!=="png"&&blob&&blob.size>target){let lo=.03,hi=q,best=null;for(let i=0;i<9;i++){const mid=(lo+hi)/2,b=await blobOf(canvas,mid);if(b&&b.size<=target){best=b;lo=mid}else hi=mid}if(best)blob=best;
if(blob.size>target){let scale=.9;for(let i=0;i<12&&blob.size>target;i++){const c=document.createElement("canvas");c.width=Math.max(1,Math.round(canvas.width*scale));c.height=Math.max(1,Math.round(canvas.height*scale));c.getContext("2d").drawImage(canvas,0,0,c.width,c.height);const b=await blobOf(c,.72);if(b.size<=target){blob=b;break}blob=b;scale*=.82}}
}
if(!blob)throw Error("Export failed");
if(state.result?.url)URL.revokeObjectURL(state.result.url);const url=URL.createObjectURL(blob);state.result={blob,url,width:canvas.width,height:canvas.height};el("rSize").textContent=fmt(blob.size);el("rDim").textContent=canvas.width+" × "+canvas.height;el("saving").textContent=target&&blob.size>target?"Closest result (target not reached)":"Compression complete";el("barfill").style.width="100%";btn.disabled=false;btn.onclick=()=>{const a=document.createElement("a");a.href=url;a.download=(state.file.name.replace(/\.[^.]+$/,"")||"image")+"-compressed."+({jpeg:"jpg",webp:"webp",png:"png"}[state.format]);a.click()};el("result").src=url;el("note").textContent=target&&blob.size>target?"The target could not be reached without more aggressive resizing.":"Saved locally in your browser.";el("note").hidden=false;
}catch(e){saving.textContent="Could not compress this image";note(e.message||"Compression failed")}finally{btn.disabled=!state.result}}
el("compress")?.addEventListener("click",compress);
el("quality")?.addEventListener("input",()=>el("qVal").textContent=el("quality").value);
el("limit")?.addEventListener("change",()=>{el("limitKB").disabled=!el("limit").checked});
el("limitKB")&&(el("limitKB").disabled=true);
el("fmtSeg")?.addEventListener("click",e=>{const b=e.target.closest("[data-f]");if(!b)return;state.format=b.dataset.f;el("fmtSeg").querySelectorAll("button").forEach(x=>x.setAttribute("aria-pressed",String(x===b)));el("qSec").style.opacity=state.format==="png"?.5:1});
el("chips")?.addEventListener("click",e=>{const b=e.target.closest("[data-k]");if(!b)return;const k=b.dataset.k;state.ratio=k==="Free"?null:k==="Original"?(state.img.naturalWidth/state.img.naturalHeight):({ "1:1":1,"4:3":4/3,"3:4":3/4,"3:2":3/2,"2:3":2/3,"16:9":16/9,"9:16":9/16})[k];el("chips").querySelectorAll("button").forEach(x=>x.setAttribute("aria-pressed",String(x===b)));if(state.ratio){const r=state.ratio;let w=1,h=1;if(r>1)h=1/r;else w=r;state.crop={x:(1-w)/2,y:(1-h)/2,w,h}}else resetCrop();drawCrop()});
el("resetCrop")?.addEventListener("click",resetCrop);
el("rotL")?.addEventListener("click",()=>{state.rotation=(state.rotation+270)%360;updatePhoto()});
el("rotR")?.addEventListener("click",()=>{state.rotation=(state.rotation+90)%360;updatePhoto()});
el("flipH")?.addEventListener("click",()=>{state.flipX=!state.flipX;updatePhoto()});
el("flipV")?.addEventListener("click",()=>{state.flipY=!state.flipY;updatePhoto()});

el("vCrop")?.addEventListener("click",()=>{el("frame").hidden=false;el("previewWrap").hidden=true;el("vCrop").setAttribute("aria-pressed","true");el("vPrev").setAttribute("aria-pressed","false")});
el("vPrev")?.addEventListener("click",()=>{if(!state.result){compress().then(()=>{if(state.result)showPreview()});return}showPreview()});
function showPreview(){el("frame").hidden=true;el("previewWrap").hidden=false;el("vCrop").setAttribute("aria-pressed","false");el("vPrev").setAttribute("aria-pressed","true")}
const crop=el("crop"),frame=el("frame");
crop?.addEventListener("pointerdown",e=>{if(!state.img)return;e.preventDefault();const handle=e.target.dataset.h||"",rect=frame.getBoundingClientRect();state.drag={handle,startX:e.clientX,startY:e.clientY,rect,initial:{...state.crop}};crop.setPointerCapture(e.pointerId)});
crop?.addEventListener("pointermove",e=>{if(!state.drag)return;const d=state.drag,dx=(e.clientX-d.startX)/d.rect.width,dy=(e.clientY-d.startY)/d.rect.height,a={...d.initial},min=.04;if(!d.handle){a.x=Math.max(0,Math.min(1-a.w,d.initial.x+dx));a.y=Math.max(0,Math.min(1-a.h,d.initial.y+dy))}
else{if(d.handle.includes("e"))a.w=Math.max(min,Math.min(1-a.x,d.initial.w+dx));if(d.handle.includes("s"))a.h=Math.max(min,Math.min(1-a.y,d.initial.h+dy));if(d.handle.includes("w")){const right=d.initial.x+d.initial.w;a.x=Math.max(0,Math.min(right-min,d.initial.x+dx));a.w=right-a.x}if(d.handle.includes("n")){const bottom=d.initial.y+d.initial.h;a.y=Math.max(0,Math.min(bottom-min,d.initial.y+dy));a.h=bottom-a.y}}
state.crop=a;drawCrop()});
crop?.addEventListener("pointerup",()=>state.drag=null);crop?.addEventListener("pointercancel",()=>state.drag=null);
document.addEventListener("keydown",e=>{if(!state.img||document.activeElement!==crop)return;const step=e.shiftKey?.05:.01,a=state.crop;if(e.key==="ArrowLeft")a.x=Math.max(0,a.x-step);else if(e.key==="ArrowRight")a.x=Math.min(1-a.w,a.x+step);else if(e.key==="ArrowUp")a.y=Math.max(0,a.y-step);else if(e.key==="ArrowDown")a.y=Math.min(1-a.h,a.y+step);else return;e.preventDefault();drawCrop()});
})();