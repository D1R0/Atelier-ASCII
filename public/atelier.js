(function(){
"use strict";
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const clamp=(v,a,b)=>v<a?a:v>b?b:v;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const reduceMotion=matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ================= constants ================= */
const CLASSIC="$@B%8&WM#*oahkbdpqwmZO0QLCJUYXzcvunxrjft/\\|()1{}[]?-_+~<>i!lI;:,\"^`'. ";
const STANDARD=" .:-=+*#%@", DETAILED=Array.from(CLASSIC).reverse().join(""), BLOCKS=" ░▒▓█";
const SHAPE_SET=Array.from(" !\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~");
const PRESETS=[["Standard",STANDARD],["Detailed",DETAILED],["Blocks",BLOCKS],["Minimal"," .oO@"],["Dots"," ·•●"],["Lines"," -=≡"],["Binary"," 01"],["Letters"," ilcoeaxkbdMW"]];
const MODE_NAMES={tone:"Tones",shape:"Shape",text:"Text portrait",bw:"1-bit",braille:"Braille",edges:"Edges"};
const MODE_HINTS={
  tone:"Each character is a shade of gray. The more characters in the palette, the smoother the gradients.",
  shape:"Each cell is matched to the glyph whose outline fits it best, so edges and curves follow the image.",
  text:"The image is drawn with your own words. Letters are placed only where the image is dense enough.",
  bw:"Just two states: the first and last character of the palette. The threshold decides what turns white; dithering simulates the grays.",
  braille:"Each character holds 2×4 dots, so 8 times more detail. Looks best in modern terminals.",
  edges:"Finds edges and draws them with / \\ | - by direction. Works well on silhouettes and drawings."
};
const THEMES={paper:{bg:"#F6F6F1",ink:"#16181C"},phosphor:{bg:"#0E0F11",ink:"#FFB547"},cyan:{bg:"#173679",ink:"#EEF2FF"}};
const TONE_DEF={bright:0,contrast:0,gamma:1,sharpen:0,invert:false,autoLevels:true};
const DEF={cols:110,aspect:.5,...TONE_DEF,mode:"tone",threshold:.5,edgeThresh:.3,edgeFill:true,dither:"none",palette:STANDARD,color:false,theme:"paper",textMsg:"ATELIER ASCII ",textCut:.12,textShade:true,shapeFull:true};
const LOOKS=[
  {id:"hand",name:"Hand-drawn",set:{mode:"shape",shapeFull:true,contrast:20,sharpen:60,color:false}},
  {id:"portrait",name:"Portrait",set:{mode:"tone",palette:DETAILED,contrast:25,sharpen:100,dither:"none",color:false}},
  {id:"words",name:"Text portrait",set:{mode:"text",textShade:true,textCut:.12,contrast:15,color:false,theme:"phosphor"}},
  {id:"blocks",name:"Soft blocks",set:{mode:"tone",palette:BLOCKS,contrast:10,dither:"fs",color:false}},
  {id:"print",name:"Print",set:{mode:"bw",palette:" █",threshold:.5,contrast:15,sharpen:60,dither:"atkinson",color:false}},
  {id:"braille",name:"Fine Braille",set:{mode:"braille",threshold:.5,contrast:10,sharpen:40,dither:"fs",color:false}},
  {id:"sketch",name:"Sketch",set:{mode:"edges",edgeThresh:.22,edgeFill:false,sharpen:40,contrast:10,color:false}},
  {id:"neon",name:"Color phosphor",set:{mode:"tone",palette:STANDARD,contrast:20,dither:"none",color:true,theme:"phosphor"}}
];
const HKEYS=Object.keys(DEF), VIEW=new Set(["zoom","fit","compare","split","tool","brushChar"]);
const fmt={
  bright:v=>(v>0?"+":"")+Math.round(v),contrast:v=>(v>0?"+":"")+Math.round(v),gamma:v=>(+v).toFixed(2),
  sharpen:v=>Math.round(v)+"%",threshold:v=>Math.round(v*100)+"%",edgeThresh:v=>Math.round(v*100)+"%",textCut:v=>Math.round(v*100)+"%",
  cols:v=>`${v}<small>chars</small>`,aspect:v=>(+v).toFixed(2)
};
const hex=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));
const mix=(a,b,t)=>[0,1,2].map(i=>Math.round(a[i]+(b[i]-a[i])*t));
const lum=c=>.2126*c[0]+.7152*c[1]+.0722*c[2];
function esc(s){return s.replace(/[&<>]/g,m=>m==="&"?"&amp;":m==="<"?"&lt;":"&gt;");}

/* ================= font metrics ================= */
let CW=.6,BW=.6,FAM='"JetBrains Mono", monospace';
function measureFont(){
  FAM=getComputedStyle($("#out")).fontFamily;
  const c=document.createElement("canvas").getContext("2d");c.font=`100px ${FAM}`;
  CW=c.measureText("M").width/100||.6;BW=c.measureText("\u28FF").width/100||CW;
}

/* ================= demo imagery ================= */
function makeSample(){
  const c=document.createElement("canvas");c.width=720;c.height=540;const g=c.getContext("2d");
  let bg=g.createLinearGradient(0,0,0,540);bg.addColorStop(0,"#f6d9a8");bg.addColorStop(.55,"#e98f6a");bg.addColorStop(1,"#3b3f6e");
  g.fillStyle=bg;g.fillRect(0,0,720,540);
  g.fillStyle="#2a2d52";g.fillRect(0,405,720,135);
  let sh=g.createRadialGradient(390,425,10,390,425,200);sh.addColorStop(0,"rgba(0,0,0,.6)");sh.addColorStop(1,"rgba(0,0,0,0)");
  g.fillStyle=sh;g.beginPath();g.ellipse(390,425,200,38,0,0,Math.PI*2);g.fill();
  g.fillStyle="#f4efe2";g.beginPath();g.moveTo(70,415);g.lineTo(165,230);g.lineTo(195,420);g.fill();
  g.fillStyle="#8e6c62";g.beginPath();g.moveTo(165,230);g.lineTo(195,420);g.lineTo(265,402);g.fill();
  let sp=g.createRadialGradient(300,200,12,360,275,165);sp.addColorStop(0,"#ffffff");sp.addColorStop(.22,"#a8dcee");sp.addColorStop(.7,"#2f6f96");sp.addColorStop(1,"#0b1c33");
  g.fillStyle=sp;g.beginPath();g.arc(360,270,150,0,Math.PI*2);g.fill();
  g.strokeStyle="rgba(255,255,255,.85)";g.lineWidth=7;g.beginPath();g.ellipse(360,270,215,48,-.28,.15,Math.PI-.15,true);g.stroke();
  return c;
}
function drawScene(g,w,h,t){
  let bg=g.createLinearGradient(0,0,0,h);bg.addColorStop(0,"#1b1d2e");bg.addColorStop(.62,"#6b5a7a");bg.addColorStop(1,"#efc9a0");
  g.fillStyle=bg;g.fillRect(0,0,w,h);
  const cx=w*.5,cy=h*.47,r=h*.3;
  for(let i=0;i<40;i++){const sx=(i*97.3)%w,sy=(i*53.7)%(h*.5),tw=.5+.5*Math.sin(t*2+i);g.fillStyle=`rgba(255,255,255,${.25+.6*tw})`;g.fillRect(sx,sy,2,2);}
  g.fillStyle="#12131c";g.fillRect(0,h*.84,w,h*.16);
  const mx=cx+Math.cos(t*.9)*r*1.7,my=cy+Math.sin(t*.9)*r*.35,front=Math.sin(t*.9)>0;
  const moon=()=>{let mg=g.createRadialGradient(mx-8,my-8,2,mx,my,r*.22);mg.addColorStop(0,"#fff");mg.addColorStop(1,"#6f7890");g.fillStyle=mg;g.beginPath();g.arc(mx,my,r*.2,0,Math.PI*2);g.fill();};
  const ring=(back)=>{g.save();g.translate(cx,cy);g.rotate(-.35);g.strokeStyle="rgba(255,236,210,.9)";g.lineWidth=h*.022;g.beginPath();
    g.ellipse(0,0,r*1.45,r*.32,0,back?Math.PI:0,back?Math.PI*2:Math.PI);g.stroke();g.restore();};
  if(!front)moon();
  ring(true);
  const lx=cx+Math.cos(t*.6)*r*.55,ly=cy-r*.35+Math.sin(t*.6)*r*.2;
  let sp=g.createRadialGradient(lx,ly,r*.05,cx,cy,r*1.05);sp.addColorStop(0,"#ffffff");sp.addColorStop(.25,"#ffd9a6");sp.addColorStop(.7,"#b0504a");sp.addColorStop(1,"#1c0f1a");
  g.fillStyle=sp;g.beginPath();g.arc(cx,cy,r,0,Math.PI*2);g.fill();
  ring(false);
  if(front)moon();
  let shd=g.createRadialGradient(cx,h*.9,5,cx,h*.9,r*1.3);shd.addColorStop(0,"rgba(0,0,0,.7)");shd.addColorStop(1,"rgba(0,0,0,0)");
  g.fillStyle=shd;g.beginPath();g.ellipse(cx,h*.9,r*1.3,r*.18,0,0,Math.PI*2);g.fill();
}

/* ================= conversion core ================= */
const work=document.createElement("canvas"),wctx=work.getContext("2d",{willReadFrequently:true});
const midc=document.createElement("canvas"),mctx=midc.getContext("2d");
function sample(src,w,h){
  work.width=w;work.height=h;
  wctx.setTransform(1,0,0,1,0,0);wctx.fillStyle="#fff";wctx.fillRect(0,0,w,h);
  wctx.imageSmoothingEnabled=true;wctx.imageSmoothingQuality="high";
  if(src.mirror){wctx.translate(w,0);wctx.scale(-1,1);}
  if(src.w>w*4){
    midc.width=w*2;midc.height=h*2;mctx.imageSmoothingQuality="high";mctx.drawImage(src.el,0,0,midc.width,midc.height);
    wctx.drawImage(midc,0,0,w,h);
  } else wctx.drawImage(src.el,0,0,w,h);
  wctx.setTransform(1,0,0,1,0,0);
  return wctx.getImageData(0,0,w,h).data;
}
function tones(src,w,h,S){
  const d=sample(src,w,h),n=w*h,v=new Float32Array(n);
  for(let i=0,j=0;i<n;i++,j+=4)v[i]=(.2126*d[j]+.7152*d[j+1]+.0722*d[j+2])/255;
  if(S.autoLevels){
    const hist=new Uint32Array(256);for(let i=0;i<n;i++)hist[(v[i]*255)|0]++;
    let lo=0,hi=255,acc=0;const cut=n*.005;
    for(;lo<255;lo++){acc+=hist[lo];if(acc>cut)break;}
    acc=0;for(;hi>0;hi--){acc+=hist[hi];if(acc>cut)break;}
    if(hi>lo){const a=lo/255,r=(hi-lo)/255;for(let i=0;i<n;i++)v[i]=(v[i]-a)/r;}
  }
  const C=S.contrast*2.55,f=259*(C+255)/(255*(259-C)),b=S.bright/200,gi=1/S.gamma;
  for(let i=0;i<n;i++){let t=(v[i]-.5)*f+.5+b;t=t<0?0:t>1?1:t;v[i]=gi===1?t:Math.pow(t,gi);}
  if(S.sharpen>0){
    const amt=S.sharpen/100,s=new Float32Array(v);
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){
      let sum=0,c=0;
      for(let dy=-1;dy<=1;dy++){const yy=y+dy;if(yy<0||yy>=h)continue;
        for(let dx=-1;dx<=1;dx++){const xx=x+dx;if(xx<0||xx>=w)continue;sum+=s[yy*w+xx];c++;}}
      const i=y*w+x,t=s[i]+amt*(s[i]-sum/c);v[i]=t<0?0:t>1?1:t;
    }
  }
  if(S.invert)for(let i=0;i<n;i++)v[i]=1-v[i];
  return {v,d};
}
const BAYER=[0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5];
function quantize(a,w,h,levels,method){
  const q=levels-1,o=new Uint16Array(w*h);
  if(method==="none"){for(let i=0;i<a.length;i++){const t=Math.round(a[i]*q);o[i]=t<0?0:t>q?q:t;}return o;}
  if(method==="bayer"){
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=y*w+x,off=(BAYER[(y&3)*4+(x&3)]+.5)/16-.5,t=Math.round(a[i]*q+off);o[i]=t<0?0:t>q?q:t;}
    return o;
  }
  const e=new Float32Array(a);
  const K=method==="fs"?[[1,0,7/16],[-1,1,3/16],[0,1,5/16],[1,1,1/16]]:[[1,0,1/8],[2,0,1/8],[-1,1,1/8],[0,1,1/8],[1,1,1/8],[0,2,1/8]];
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const i=y*w+x,old=e[i];let t=Math.round(old*q);t=t<0?0:t>q?q:t;o[i]=t;
    const err=old-t/q;
    for(const [dx,dy,k] of K){const xx=x+dx,yy=y+dy;if(xx>=0&&xx<w&&yy<h)e[yy*w+xx]+=err*k;}
  }
  return o;
}
let gCache={};
function glyphs(aspect,chars){
  const key=aspect.toFixed(2)+"|"+chars.join("")+"|"+FAM+"|"+CW.toFixed(4);
  if(gCache[key])return gCache[key];
  const gw=6,gh=Math.max(6,Math.round(gw/aspect)),sc=6,cw=gw*sc,ch=gh*sc,len=gw*gh;
  const c=document.createElement("canvas");c.width=cw;c.height=ch;const x=c.getContext("2d",{willReadFrequently:true});
  x.font=`${cw/CW}px ${FAM}`;x.textBaseline="middle";x.fillStyle="#000";
  const data=new Float32Array(chars.length*len);let maxMean=0;
  chars.forEach((chr,gi)=>{
    x.clearRect(0,0,cw,ch);x.fillText(chr,0,ch/2);const px=x.getImageData(0,0,cw,ch).data;let sum=0;
    for(let gy=0;gy<gh;gy++)for(let gx=0;gx<gw;gx++){
      let s=0;for(let yy=0;yy<sc;yy++){const row=((gy*sc+yy)*cw+gx*sc)*4+3;for(let xx=0;xx<sc;xx++)s+=px[row+xx*4];}
      const v=s/(sc*sc*255);data[gi*len+gy*gw+gx]=v;sum+=v;}
    maxMean=Math.max(maxMean,sum/len);
  });
  if(maxMean>0)for(let i=0;i<data.length;i++)data[i]/=maxMean;
  const means=new Float32Array(chars.length);
  for(let g=0;g<chars.length;g++){let s=0;for(let i=0;i<len;i++)s+=data[g*len+i];means[g]=s/len;}
  return gCache[key]={chars,gw,gh,len,data,means};
}
function rowsFor(cols,S,src){
  return S.mode==="braille"?Math.max(1,Math.ceil(cols*2*src.h/src.w*2*S.aspect/4)):Math.max(1,Math.round(cols*src.h/src.w*S.aspect));
}
function convert(src,S,edits){
  const P=Array.from(S.palette),pal=P.length>=2?P:[" ","@"];
  const TH=THEMES[S.theme],paper=S.theme==="paper",cols=S.cols,a=S.aspect,mode=S.mode,rows=rowsFor(cols,S,src);
  const cells=[];let toneGrid,tw,th,rgb=null,colors=null;
  if(mode==="braille"){
    const pw=cols*2,ph=rows*4;const {v}=tones(src,pw,ph,S);toneGrid=v;tw=pw;th=ph;
    const b=new Float32Array(v.length);
    for(let i=0;i<v.length;i++){const t=v[i]-S.threshold+.5;b[i]=paper?1-t:t;}
    const q=quantize(b,pw,ph,2,S.dither),BIT=[[1,8],[2,16],[4,32],[64,128]];
    for(let r=0;r<rows;r++){const line=[];
      for(let c=0;c<cols;c++){let code=0;
        for(let dy=0;dy<4;dy++)for(let dx=0;dx<2;dx++)if(q[(r*4+dy)*pw+c*2+dx])code|=BIT[dy][dx];
        line.push(String.fromCharCode(0x2800+code));}
      cells.push(line);}
    if(S.color)rgb=sample(src,cols,rows);
  } else if(mode==="shape"){
    const G=glyphs(a,S.shapeFull?SHAPE_SET:[...new Set(pal)]);
    const pw=cols*G.gw,ph=rows*G.gh;const {v}=tones(src,pw,ph,S);toneGrid=v;tw=pw;th=ph;
    const len=G.len,n=G.chars.length,vec=new Float32Array(len),D=G.data,M=G.means,LAM=2.5*len,ramp=S.shapeFull?Array.from(STANDARD):pal;
    for(let r=0;r<rows;r++){const line=[];
      for(let c=0;c<cols;c++){
        let k=0,mv=0;
        for(let gy=0;gy<G.gh;gy++){const base=(r*G.gh+gy)*pw+c*G.gw;for(let gx=0;gx<G.gw;gx++){const t=v[base+gx],q=paper?1-t:t;vec[k++]=q;mv+=q;}}
        mv/=len;
        let vr=0;for(let i=0;i<len;i++){const e=vec[i]-mv;vr+=e*e;}
        if(vr/len<.004){line.push(ramp[clamp(Math.round(mv*(ramp.length-1)),0,ramp.length-1)]);continue;}
        let best=0,bd=Infinity;
        for(let g=0;g<n;g++){const dm=mv-M[g];let d=LAM*dm*dm;if(d>=bd)continue;const o=g*len;for(let i=0;i<len;i++){const e=vec[i]-D[o+i];d+=e*e;if(d>=bd)break;}if(d<bd){bd=d;best=g;}}
        line.push(G.chars[best]);}
      cells.push(line);}
    if(S.color)rgb=sample(src,cols,rows);
  } else {
    const {v,d}=tones(src,cols,rows,S);toneGrid=v;tw=cols;th=rows;rgb=d;
    const n=v.length,dens=new Float32Array(n);
    if(mode==="bw"){
      for(let i=0;i<n;i++){const t=v[i]-S.threshold+.5;dens[i]=paper?1-t:t;}
      const q=quantize(dens,cols,rows,2,S.dither),lo=pal[0],hi=pal[pal.length-1];
      for(let r=0;r<rows;r++){const line=[];for(let c=0;c<cols;c++)line.push(q[r*cols+c]?hi:lo);cells.push(line);}
    } else if(mode==="text"){
      let msg=Array.from((S.textMsg||"").replace(/\s+/g," "));if(!msg.some(ch=>ch!==" "))msg=Array.from("ASCII ");
      const shade=S.textShade&&!S.color,bg=hex(TH.bg),ink=hex(TH.ink),cut=S.textCut;let k=0;
      if(shade)colors=[];
      for(let r=0;r<rows;r++){const line=[],crow=[];
        for(let c=0;c<cols;c++){const t=paper?1-v[r*cols+c]:v[r*cols+c];
          if(t<cut||t<=0.02){line.push(" ");if(shade)crow.push(ink);}
          else{line.push(msg[k%msg.length]);k++;if(shade)crow.push(mix(bg,ink,.22+.78*Math.min(1,(t-cut)/Math.max(.05,1-cut))));}}
        cells.push(line);if(shade)colors.push(crow);}
    } else {
      for(let i=0;i<n;i++)dens[i]=paper?1-v[i]:v[i];
      const q=quantize(dens,cols,rows,pal.length,mode==="edges"?"none":S.dither);
      for(let r=0;r<rows;r++){const line=[];for(let c=0;c<cols;c++)line.push(pal[q[r*cols+c]]);cells.push(line);}
      if(mode==="edges"){
        const T=S.edgeThresh,at=(x,y)=>v[(y<0?0:y>=rows?rows-1:y)*cols+(x<0?0:x>=cols?cols-1:x)];
        for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){
          const gx=-at(x-1,y-1)-2*at(x-1,y)-at(x-1,y+1)+at(x+1,y-1)+2*at(x+1,y)+at(x+1,y+1);
          const gy=-at(x-1,y-1)-2*at(x,y-1)-at(x+1,y-1)+at(x-1,y+1)+2*at(x,y+1)+at(x+1,y+1);
          if(Math.hypot(gx,gy)/4>T){let ang=Math.atan2(gy,gx)*180/Math.PI;if(ang<0)ang+=180;
            cells[y][x]=ang<22.5||ang>=157.5?"|":ang<67.5?"/":ang<112.5?"-":"\\";}
          else if(!S.edgeFill)cells[y][x]=" ";
        }
      }
    }
  }
  if(S.color&&rgb&&!colors)colors=cells.map((line,r)=>line.map((_,c)=>{const j=(r*cols+c)*4;return [rgb[j],rgb[j+1],rgb[j+2]];}));
  if(edits&&edits.size)for(const [key,ch] of edits){const i=key.indexOf(","),r=+key.slice(0,i),c=+key.slice(i+1);if(r<rows&&c<cols)cells[r][c]=ch;}
  return {cells,colors,cols,rows,mode,theme:S.theme,aspect:S.aspect,toneGrid,tw,th};
}
function toHTML(f){
  const {cells,colors}=f;
  if(!colors)return esc(cells.map(l=>l.join("")).join("\n"));
  const o=[];
  for(let r=0;r<cells.length;r++){
    let cur=null,buf="";
    for(let c=0;c<cells[r].length;c++){
      const [R,G,B]=colors[r][c],key=`${R&0xf0|8},${G&0xf0|8},${B&0xf0|8}`;
      if(key!==cur){if(buf)o.push(`<span style="color:rgb(${cur})">${esc(buf)}</span>`);cur=key;buf="";}
      buf+=cells[r][c];
    }
    if(buf)o.push(`<span style="color:rgb(${cur})">${esc(buf)}</span>`);
    if(r<cells.length-1)o.push("\n");
  }
  return o.join("");
}
const plainText=f=>f.cells.map(l=>l.join("").replace(/\s+$/,"")).join("\n");
function fitPre(pre,box,f,maxFs){
  const cs=getComputedStyle(box);
  const W=box.clientWidth-parseFloat(cs.paddingLeft)-parseFloat(cs.paddingRight),H=box.clientHeight-parseFloat(cs.paddingTop)-parseFloat(cs.paddingBottom);
  const lh=CW/f.aspect;let fs=W/(f.cols*CW);if(H>20)fs=Math.min(fs,H/(f.rows*lh));
  fs=clamp(Math.floor(fs*8)/8,2,maxFs||30);
  pre.style.fontSize=fs+"px";pre.style.lineHeight=lh;pre.style.letterSpacing=f.mode==="braille"?(CW-BW).toFixed(4)+"em":"0";
}

/* ================= toast, files, clipboard ================= */
let toastT=0;
function toast(m){const t=$("#toast");t.textContent=m;t.classList.add("show");clearTimeout(toastT);toastT=setTimeout(()=>t.classList.remove("show"),2800);}
let downloads=null;
(async()=>{try{if(window.claude&&typeof window.claude.use==="function")downloads=await window.claude.use("downloads");}catch(e){}})();
async function saveFile(name,data,mime){
  if(downloads){
    try{await downloads.save({filename:name,data});toast(`Saved ${name}`);}
    catch(e){const code=e&&e.code;if(code==="declined")return;
      if(code==="rate_limited")toast("A save is already in progress. Try again in a moment.");
      else if(code==="too_large")toast("That file is too large. Try a smaller width or a shorter clip.");
      else toast("The save didn't go through.");}
    return;
  }
  const blob=data instanceof Blob?data:new Blob([data],{type:mime||"application/octet-stream"});
  const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(a.href),5000);toast(`Downloaded ${name}`);
}
async function copyText(txt,msg){
  try{await navigator.clipboard.writeText(txt);toast(msg||"Copied to clipboard");return;}catch(e){}
  const ta=document.createElement("textarea");ta.value=txt;ta.style.position="fixed";ta.style.opacity="0";document.body.appendChild(ta);ta.select();
  let ok=false;try{ok=document.execCommand("copy");}catch(e){}ta.remove();
  toast(ok?(msg||"Copied to clipboard"):"The browser blocked copying. Select the text manually.");
}
async function copyRich(html,plain){
  try{await navigator.clipboard.write([new ClipboardItem({"text/html":new Blob([html],{type:"text/html"}),"text/plain":new Blob([plain],{type:"text/plain"})})]);toast("Copied with formatting");}
  catch(e){copyText(html,"HTML copied to clipboard");}
}

/* ================= camera ================= */
async function openCamera(){
  if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){toast("This browser can't open a camera.");return null;}
  try{
    const stream=await navigator.mediaDevices.getUserMedia({video:{width:{ideal:1280},height:{ideal:720},facingMode:"user"},audio:false});
    const v=document.createElement("video");v.muted=true;v.playsInline=true;v.srcObject=stream;await v.play();
    return {kind:"camera",el:v,w:v.videoWidth||1280,h:v.videoHeight||720,name:"Camera",mirror:true,stream};
  }catch(e){toast("Camera access was blocked. Allow it in your browser settings, or load a video instead.");return null;}
}
function stopSource(s){
  if(!s)return;
  if(s.stream)s.stream.getTracks().forEach(t=>t.stop());
  if(s.kind==="video"){s.el.pause();if(s.url)URL.revokeObjectURL(s.url);}
}

/* ================= router ================= */
let view="";
function route(){
  const v=location.hash==="#studio"?"studio":"home";
  if(v===view)return;view=v;
  $("#home").hidden=v!=="home";$("#studio").hidden=v!=="studio";
  document.body.classList.toggle("in-studio",v==="studio");
  document.title=v==="studio"?"Studio | Atelier ASCII":"Atelier ASCII: ASCII art that looks drawn by hand";
  if(v==="studio"){
    if(heroCam){const c=heroCam;heroCam=null;syncHeroCam();setSource(c);}
    else if(!src){const s=makeSample();setSource({kind:"image",el:s,w:s.width,h:s.height,name:"Demo image"});}
    requestAnimationFrame(()=>{measureFont();drawSwatches();styleOut();schedule();});
    window.scrollTo(0,0);
  } else {
    closeExport();stopRec(false);
    requestAnimationFrame(renderSamples);
  }
}
window.addEventListener("hashchange",route);

/* ================= landing ================= */
const HS={...DEF,cols:84,theme:"phosphor",palette:STANDARD,contrast:10,edgeFill:false,textMsg:"ATELIER ASCII ",textCut:.1};
const heroCanvas=document.createElement("canvas");heroCanvas.width=480;heroCanvas.height=360;
const heroScene={kind:"scene",el:heroCanvas,w:480,h:360};
let heroCam=null,heroLast=0,heroFrame=0;
function heroTick(t){
  if(t-heroLast<1000/(HS.mode==="shape"?15:22))return;heroLast=t;heroFrame++;
  const s=heroCam||heroScene;
  if(!heroCam)drawScene(heroCanvas.getContext("2d"),480,360,t/1000);
  else if(heroCam.el.readyState<2)return;
  const f=convert(s,HS,null),pre=$("#heroOut");
  if(f.colors)pre.innerHTML=toHTML(f);else pre.textContent=plainText(f);
  fitPre(pre,$("#heroScreen"),f,16);
  if(heroFrame%2===0){
    const vs=$('[data-sample="video"]');
    if(vs){const g=convert(s,{...DEF,cols:64,mode:"braille",theme:"cyan",dither:"fs",contrast:10},null);vs.textContent=plainText(g);fitPre(vs,vs.parentElement,g,14);}
  }
}
$$("#heroKeys .key").forEach(k=>k.addEventListener("click",()=>{
  HS.mode=k.dataset.m;$$("#heroKeys .key").forEach(x=>x.setAttribute("aria-checked",String(x===k)));heroLast=0;
}));
function syncHeroCam(){
  $("#heroCam span").textContent=heroCam?"Stop camera":"Try it with your camera";
  $("#heroLive").textContent=heroCam?"Your camera, live":"Live demo";
}
$("#heroCam").addEventListener("click",async()=>{
  if(heroCam){stopSource(heroCam);heroCam=null;syncHeroCam();return;}
  const c=await openCamera();if(c){heroCam=c;syncHeroCam();toast("Open the studio to record a clip from your camera");}
});
function renderSamples(){
  const still=makeSample(),src={kind:"image",el:still,w:720,h:540};
  const defs={
    shape:{...DEF,cols:72,mode:"shape",contrast:20,sharpen:60},
    text:{...DEF,cols:72,mode:"text",theme:"phosphor",textMsg:"MADE OF WORDS ",textShade:true,contrast:15,textCut:.1},
    edit:{...DEF,cols:72,mode:"edges",edgeFill:false,sharpen:40,contrast:10,edgeThresh:.22}
  };
  const stamp=new Map();const put=(r,c,s)=>Array.from(s).forEach((ch,i)=>stamp.set(r+","+(c+i),ch));
  put(3,4,"~ edited by hand ~");put(4,4,"==================");put(24,52,"hello, world <3");
  $$("[data-sample]").forEach(pre=>{
    const k=pre.dataset.sample;if(!defs[k])return;
    const f=convert(src,defs[k],k==="edit"?stamp:null);
    if(f.colors)pre.innerHTML=toHTML(f);else pre.textContent=plainText(f);
    fitPre(pre,pre.parentElement,f,14);
  });
}

/* ================= studio state ================= */
const state={...DEF,zoom:9,fit:true,compare:false,split:.5,tool:"none",brushChar:"#"};
let src=null,last=null,activeLook=null,pendingReveal=true;
let edits=new Map(),editStack=[],lastAction="state",cursor=null;
let clip=null,rec=null,paused=false,fpsCount=0,fpsT=0,liveFps=0;
const vp=$("#vp"),frame=$("#frame"),out=$("#out");
const isAnim=()=>src&&(src.kind==="video"||src.kind==="camera");

function setSource(s){
  if(src&&src!==s)stopSource(src);
  src=s;pendingReveal=true;edits=new Map();editStack=[];cursor=null;clip=null;stopRec(false);paused=false;
  drawThumbSrc();drawOverlay();
  $("#srcMeta").textContent=`${s.name}, ${s.w} × ${s.h}${s.kind==="image"?" px":s.kind==="camera"?", live":", video"}`;
  $("#transport").hidden=!isAnim();$("#playBtn").hidden=s.kind!=="video";$("#fps").textContent="";
  syncPlay();$("#camBtn").textContent=s.kind==="camera"?"Stop camera":"Camera";
  showCursor();schedule();
}
function loadFile(f){
  if(!f)return;
  if(f.type&&f.type.startsWith("video/")){
    const url=URL.createObjectURL(f),v=document.createElement("video");v.muted=true;v.loop=true;v.playsInline=true;v.preload="auto";
    v.onloadeddata=()=>{setSource({kind:"video",el:v,w:v.videoWidth,h:v.videoHeight,name:f.name||"Video",url});v.play().catch(()=>{});toast("Video loaded. Press R to record a clip.");};
    v.onerror=()=>toast("This browser can't play that video format. Try MP4 or WebM.");
    v.src=url;return;
  }
  if(!f.type||!f.type.startsWith("image/")){toast("That file isn't an image or video.");return;}
  const url=URL.createObjectURL(f),im=new Image();
  im.onload=()=>{setSource({kind:"image",el:im,w:im.naturalWidth,h:im.naturalHeight,name:f.name||"Pasted image"});toast("Image loaded");};
  im.onerror=()=>toast("The image couldn't be read.");
  im.src=url;
}
function drawThumbSrc(){
  if(!src)return;const c=$("#thumbSrc"),tw=320,th=Math.max(1,Math.round(tw*src.h/src.w));
  if(c.width!==tw||c.height!==th){c.width=tw;c.height=th;}
  const x=c.getContext("2d");x.save();x.fillStyle="#fff";x.fillRect(0,0,tw,th);if(src.mirror){x.translate(tw,0);x.scale(-1,1);}x.drawImage(src.el,0,0,tw,th);x.restore();
}
function drawOverlay(){
  if(!src)return;const ov=$("#ov"),ow=Math.min(src.w,isAnim()?640:1400),oh=Math.round(ow*src.h/src.w);
  if(ov.width!==ow||ov.height!==oh){ov.width=ow;ov.height=oh;}
  const o=ov.getContext("2d");o.save();o.fillStyle="#fff";o.fillRect(0,0,ow,oh);if(src.mirror){o.translate(ow,0);o.scale(-1,1);}o.drawImage(src.el,0,0,ow,oh);o.restore();
}

function render(){
  if(!src||view!=="studio")return;
  if(isAnim()&&src.el.readyState<2)return;
  const f=convert(src,state,edits);last=f;
  styleOut();
  if(pendingReveal&&!isAnim()){pendingReveal=false;reveal();}else{pendingReveal=false;paintContent();}
  drawThumbTone(f.toneGrid,f.tw,f.th);drawHist(f.toneGrid);
  $("#dims").textContent=`${f.cols} × ${f.rows}`;
  $("#modeName").textContent=MODE_NAMES[state.mode]+(state.dither!=="none"&&["tone","bw","braille"].includes(state.mode)?", dithered":"");
  if(isAnim()){
    fpsCount++;if(fpsCount%8===0)drawThumbSrc();if(state.compare)drawOverlay();
    if(rec)recordFrame(f);
  }
}
let revealRaf=0;
function paintContent(){cancelAnimationFrame(revealRaf);if(last)out.innerHTML=toHTML(last);}
function reveal(){
  if(reduceMotion){paintContent();return;}
  cancelAnimationFrame(revealRaf);
  const {cells,cols,rows}=last,R=new Float32Array(cols*rows).map(()=>Math.random()),G=Array.from("░▒▓#@%*+=-:."),t0=performance.now(),D=750;
  const step=now=>{
    const t=(now-t0)/D;if(t>=1){paintContent();return;}
    const tick=(now/45)|0,lines=[];
    for(let r=0;r<rows;r++){let s="";
      for(let c=0;c<cols;c++){const i=r*cols+c,th=(c/cols)*.62+R[i]*.38;
        s+=t>th?cells[r][c]:(t>th-.25?G[(((R[i]*997)|0)+tick)%G.length]:" ");}
      lines.push(s);}
    out.textContent=lines.join("\n");revealRaf=requestAnimationFrame(step);
  };
  revealRaf=requestAnimationFrame(step);
}
function styleOut(){
  if(!last)return;
  const lh=CW/state.aspect;let fs=state.zoom;
  out.style.letterSpacing=last.mode==="braille"?(CW-BW).toFixed(4)+"em":"0";
  if(state.fit){
    const W=vp.clientWidth-48-56,H=vp.clientHeight-48-56;
    fs=Math.min(W/(last.cols*CW),H/(last.rows*lh));
    fs=Math.max(2.5,Math.min(30,Math.floor(fs*4)/4));state.zoom=fs;
  }
  out.style.fontSize=fs+"px";out.style.lineHeight=lh;
  const zv=$("#zoomVal");zv.textContent=state.fit?"Fit":(Math.round(fs*10)/10)+" px";zv.setAttribute("aria-pressed",String(state.fit));
  frame.style.setProperty("--split",state.split);frame.classList.toggle("cmp",state.compare);
  frame.classList.toggle("draw",!state.compare&&(state.tool==="brush"||state.tool==="erase"));
  frame.classList.toggle("type",!state.compare&&state.tool==="type");
  $("#cmpBtn").setAttribute("aria-pressed",String(state.compare));
  $("#split").setAttribute("aria-valuenow",Math.round(state.split*100));
  $("#brushChar").hidden=state.tool!=="brush";$("#clearEdits").hidden=state.tool==="none"&&!edits.size;
  vp.dataset.theme=state.theme;
  showCursor();
}
function drawThumbTone(v,w,h){
  const c=$("#thumbTone");if(c.width!==w||c.height!==h){c.width=w;c.height=h;}c.style.aspectRatio=`${src.w}/${src.h}`;
  const x=c.getContext("2d"),img=x.createImageData(w,h);
  for(let i=0,j=0;i<v.length;i++,j+=4){const g=v[i]*255;img.data[j]=img.data[j+1]=img.data[j+2]=g;img.data[j+3]=255;}
  x.putImageData(img,0,0);
}
function cssv(n){return getComputedStyle(document.documentElement).getPropertyValue(n).trim();}
function drawHist(v){
  const c=$("#hist"),dpr=window.devicePixelRatio||1,W=c.clientWidth||340,H=44;
  if(c.width!==W*dpr){c.width=W*dpr;c.height=H*dpr;}
  const x=c.getContext("2d");x.setTransform(dpr,0,0,dpr,0,0);x.clearRect(0,0,W,H);
  const bins=new Uint32Array(72);for(let i=0;i<v.length;i++)bins[Math.min(71,(v[i]*72)|0)]++;
  let max=1;for(const b of bins)if(b>max)max=b;const bw=W/72;
  x.fillStyle=cssv("--groove");x.fillRect(0,H-1,W,1);
  x.fillStyle=cssv("--accent");
  for(let i=0;i<72;i++){const hh=Math.sqrt(bins[i]/max)*(H-6);x.globalAlpha=.35+.65*(i/71);x.fillRect(i*bw+.5,H-1-hh,Math.max(1,bw-1.2),hh);}
  x.globalAlpha=1;
  if(state.mode==="bw"||state.mode==="braille"){x.fillStyle=cssv("--ink");x.fillRect(state.threshold*W-1,0,2,H);}
  if(state.mode==="text"){x.fillStyle=cssv("--ink");const p=state.theme==="paper"?1-state.textCut:state.textCut;x.fillRect(p*W-1,0,2,H);}
}
function drawSwatches(){
  const m=cssv("--ink").match(/[0-9a-f]{2}/gi)||["16","18","1c"],[r,g,b]=m.map(h=>parseInt(h,16));
  $$(".dith canvas").forEach(c=>{
    const w=c.width=96,h=c.height=14,a=new Float32Array(w*h);
    for(let y=0;y<h;y++)for(let x=0;x<w;x++)a[y*w+x]=x/(w-1);
    const q=quantize(a,w,h,2,c.dataset.m),ctx=c.getContext("2d"),img=ctx.createImageData(w,h);
    for(let i=0;i<q.length;i++)if(q[i]){img.data[i*4]=r;img.data[i*4+1]=g;img.data[i*4+2]=b;img.data[i*4+3]=255;}
    ctx.putImageData(img,0,0);
  });
}
let raf=0;function schedule(){if(!raf)raf=requestAnimationFrame(()=>{raf=0;render();});}

/* ================= main loop ================= */
let lastTick=0;
function loop(t){
  requestAnimationFrame(loop);
  if(view==="home"){heroTick(t);return;}
  if(view==="studio"&&isAnim()&&!paused){
    if(t-lastTick<1000/24)return;lastTick=t;render();
    if(t-fpsT>1000){liveFps=Math.round(fpsCount*1000/(t-fpsT||1));fpsCount=0;fpsT=t;$("#fps").textContent=`${liveFps} fps`;}
  }
}

/* ================= knobs ================= */
const KNOBS={};
function polar(a,r){const t=a*Math.PI/180;return [32+r*Math.sin(t),32-r*Math.cos(t)];}
function arcPath(a0,a1,r){
  if(Math.abs(a1-a0)<.5)return "";
  const [x0,y0]=polar(a0,r),[x1,y1]=polar(a1,r);
  return `M${x0.toFixed(2)} ${y0.toFixed(2)}A${r} ${r} 0 ${a1-a0>180?1:0} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
}
function makeKnob(host){
  const k=host.dataset.k,min=+host.dataset.min,max=+host.dataset.max,step=+host.dataset.step,def=+host.dataset.def,label=host.dataset.label;
  const center=host.dataset.center!==undefined?+host.dataset.center:min;
  host.innerHTML=`<div class="kn" role="slider" tabindex="0" aria-label="${label}" aria-valuemin="${min}" aria-valuemax="${max}"><svg viewBox="0 0 64 64" aria-hidden="true"><path class="trk" d="${arcPath(-135,135,28)}"/><path class="val"/><circle class="cap" cx="32" cy="32" r="19"/><circle class="capr" cx="32" cy="32" r="18.5"/><line class="ptr"/></svg></div><span class="kval"></span><span class="klabel">${label}</span>`;
  const kn=host.querySelector(".kn"),val=host.querySelector(".val"),ptr=host.querySelector(".ptr"),ov=host.querySelector(".kval");
  const ang=v=>-135+(v-min)/(max-min)*270;
  function draw(){
    const v=state[k],a=ang(v),a0=ang(center);
    val.setAttribute("d",arcPath(Math.min(a0,a),Math.max(a0,a),28));
    const [x1,y1]=polar(a,7),[x2,y2]=polar(a,15.5);
    ptr.setAttribute("x1",x1);ptr.setAttribute("y1",y1);ptr.setAttribute("x2",x2);ptr.setAttribute("y2",y2);
    ov.textContent=fmt[k](v);kn.setAttribute("aria-valuenow",v);kn.setAttribute("aria-valuetext",fmt[k](v));
  }
  function set(v){v=Math.round(v/step)*step;v=+Math.min(max,Math.max(min,v)).toFixed(4);if(v===state[k])return;state[k]=v;draw();changed(k);}
  let drag=false,sy=0,sv=0;
  kn.addEventListener("pointerdown",e=>{drag=true;sy=e.clientY;sv=state[k];kn.setPointerCapture(e.pointerId);kn.classList.add("on");kn.focus();e.preventDefault();});
  kn.addEventListener("pointermove",e=>{if(!drag)return;set(sv+(sy-e.clientY)/(e.shiftKey?700:170)*(max-min));});
  const end=()=>{drag=false;kn.classList.remove("on");};
  kn.addEventListener("pointerup",end);kn.addEventListener("pointercancel",end);
  kn.addEventListener("dblclick",()=>set(def));
  kn.addEventListener("keydown",e=>{
    const m=e.shiftKey?10:1,map={ArrowUp:step*m,ArrowRight:step*m,ArrowDown:-step*m,ArrowLeft:-step*m,PageUp:step*10,PageDown:-step*10};
    if(e.key in map){set(state[k]+map[e.key]);e.preventDefault();e.stopPropagation();}
    else if(e.key==="Home"){set(min);e.preventDefault();}else if(e.key==="End"){set(max);e.preventDefault();}
  });
  KNOBS[k]=draw;draw();
}
$$(".knob").forEach(makeKnob);

/* ================= sync ================= */
function syncRanges(){
  $$(".rng").forEach(r=>{const p=(r.value-r.min)/(r.max-r.min)*100;r.style.setProperty("--p",p+"%");});
  $$("output[data-for]").forEach(o=>{o.innerHTML=fmt[o.dataset.for](state[o.dataset.for]);});
}
function syncMode(){
  $$("[data-show]").forEach(el=>el.hidden=!el.dataset.show.split(" ").includes(state.mode));
  $("#modeHint").textContent=MODE_HINTS[state.mode];
  const unused=state.mode==="braille"||state.mode==="text"||(state.mode==="shape"&&state.shapeFull);
  $("#charsMod").style.opacity=unused?.5:1;
  $("#palHint").textContent=state.mode==="braille"?"Braille uses its own characters, so the palette doesn't apply.":
    state.mode==="text"?"Text portraits use your own words, so the palette doesn't apply.":
    state.mode==="shape"&&state.shapeFull?"Shape mode is using the full ASCII set. Turn that off to match against this palette.":
    state.mode==="bw"?"In 1-bit only the first and last characters are used.":
    "The first character goes in light areas, the last in dark ones.";
}
function syncPalette(){
  const inp=$("#palette");if(inp!==document.activeElement)inp.value=state.palette;
  const chars=Array.from(state.palette);
  $("#ramp").innerHTML=chars.slice(0,40).map(ch=>`<span>${esc(ch===" "?"\u00a0":ch)}</span>`).join("");
  $("#mini").textContent=state.mode==="text"?state.textMsg:chars.join("");
  $$(".pal").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.p===state.palette)));
}
function syncLooks(){$$(".look").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.id===activeLook)));}
function syncAll(){
  Object.values(KNOBS).forEach(d=>d());
  $$("[data-k]").forEach(el=>{const k=el.dataset.k;
    if(el.type==="checkbox")el.checked=!!state[k];
    else if(el.type==="radio")el.checked=el.value===String(state[k]);
    else if(el.type==="range")el.value=state[k];
    else if(el!==document.activeElement)el.value=state[k];});
  syncRanges();syncMode();syncPalette();syncLooks();
}
function changed(k){
  if(VIEW.has(k)){if(k==="tool"&&state.tool!=="type")cursor=null;styleOut();return;}
  activeLook=null;syncLooks();
  if(k==="mode"||k==="shapeFull")syncMode();
  if(k==="palette"||k==="textMsg"||k==="mode")syncPalette();
  if(k==="cols"||k==="aspect")syncRanges();
  schedule();commit();
}
function setK(k,v){state[k]=v;syncAll();changed(k);}
$$("[data-k]").forEach(el=>{
  const ev=el.type==="radio"||el.type==="checkbox"?"change":"input";
  el.addEventListener(ev,()=>{
    const k=el.dataset.k;
    if(el.type==="checkbox")state[k]=el.checked;
    else if(el.type==="range")state[k]=parseFloat(el.value);
    else if(el.type==="radio"){if(!el.checked)return;state[k]=el.value;}
    else state[k]=el.value;
    changed(k);
  });
});
$("#brushChar").addEventListener("input",e=>{state.brushChar=Array.from(e.target.value)[0]||"#";});

/* ================= history ================= */
let hist=[],hi=-1,commitT=0;
function snap(){const o={};HKEYS.forEach(k=>o[k]=state[k]);return JSON.stringify(o);}
function commitNow(){clearTimeout(commitT);commitT=0;const s=snap();if(s===hist[hi])return;hist=hist.slice(0,hi+1);hist.push(s);if(hist.length>100)hist.shift();hi=hist.length-1;lastAction="state";syncUndo();}
function commit(){clearTimeout(commitT);commitT=setTimeout(commitNow,350);}
function syncUndo(){$("#undo").disabled=hi<=0&&!editStack.length;$("#redo").disabled=hi>=hist.length-1;}
function restore(s){Object.assign(state,JSON.parse(s));activeLook=null;syncAll();schedule();syncUndo();}
function undo(){
  if(commitT)commitNow();
  if(lastAction==="edit"&&editStack.length){edits=editStack.pop();if(!editStack.length)lastAction="state";renderEdits();syncUndo();toast("Edit undone");return;}
  if(hi>0){hi--;restore(hist[hi]);toast("Undone");}
}
function redo(){if(hi<hist.length-1){hi++;restore(hist[hi]);toast("Redone");}}
$("#undo").addEventListener("click",undo);$("#redo").addEventListener("click",redo);

/* ================= editing ================= */
function pushEdit(){editStack.push(new Map(edits));if(editStack.length>60)editStack.shift();lastAction="edit";syncUndo();}
let editRaf=0;
function renderEdits(){
  if(!last)return;
  if(isAnim()){styleOut();return;}
  if(!editRaf)editRaf=requestAnimationFrame(()=>{editRaf=0;render();});
}
function setEdit(r,c,ch){
  edits.set(r+","+c,ch);
  if(last&&last.cells[r]){last.cells[r][c]=ch;if(!isAnim()&&!editRaf)editRaf=requestAnimationFrame(()=>{editRaf=0;paintContent();});}
  $("#clearEdits").hidden=false;
}
function cellAt(e){
  const r=frame.getBoundingClientRect();
  return {c:clamp(Math.floor((e.clientX-r.left)/r.width*last.cols),0,last.cols-1),r:clamp(Math.floor((e.clientY-r.top)/r.height*last.rows),0,last.rows-1)};
}
function showCursor(){
  const el=$("#tcur");
  if(!cursor||state.tool!=="type"||!last){el.hidden=true;return;}
  el.hidden=false;el.style.left=(cursor.c/last.cols*100)+"%";el.style.top=(cursor.r/last.rows*100)+"%";
  el.style.width=(100/last.cols)+"%";el.style.height=(100/last.rows)+"%";
}
$("#clearEdits").addEventListener("click",()=>{if(!edits.size)return;pushEdit();edits=new Map();renderEdits();toast("Edits cleared");$("#clearEdits").hidden=state.tool==="none";});
let splitDrag=false,painting=false,lastCell=null;
function splitAt(e){const r=frame.getBoundingClientRect();state.split=clamp((e.clientX-r.left)/r.width,0,1);styleOut();}
function paintAt(e){
  const p=cellAt(e),ch=state.tool==="erase"?" ":state.brushChar;
  const pts=[];
  if(lastCell){const n=Math.max(Math.abs(p.c-lastCell.c),Math.abs(p.r-lastCell.r));for(let i=1;i<=n;i++)pts.push({c:Math.round(lastCell.c+(p.c-lastCell.c)*i/n),r:Math.round(lastCell.r+(p.r-lastCell.r)*i/n)});}
  else pts.push(p);
  pts.forEach(q=>setEdit(q.r,q.c,ch));lastCell=p;
}
frame.addEventListener("pointerdown",e=>{
  if(!last)return;
  if(state.compare){splitDrag=true;frame.setPointerCapture(e.pointerId);splitAt(e);return;}
  if(state.tool==="brush"||state.tool==="erase"){pushEdit();painting=true;lastCell=null;frame.setPointerCapture(e.pointerId);paintAt(e);e.preventDefault();return;}
  if(state.tool==="type"){const p=cellAt(e);pushEdit();cursor={r:p.r,c:p.c,c0:p.c};showCursor();e.preventDefault();}
});
frame.addEventListener("pointermove",e=>{if(splitDrag)splitAt(e);else if(painting)paintAt(e);});
const endPtr=()=>{splitDrag=false;painting=false;lastCell=null;};
frame.addEventListener("pointerup",endPtr);frame.addEventListener("pointercancel",endPtr);
$("#split").addEventListener("keydown",e=>{
  const d={ArrowLeft:-.05,ArrowRight:.05}[e.key];
  if(d){state.split=clamp(state.split+d,0,1);styleOut();e.preventDefault();e.stopPropagation();}
});

/* ================= recording ================= */
function syncPlay(){
  $("#playBtn").innerHTML=paused?'<svg viewBox="0 0 24 24"><path d="M7 5l12 7-12 7z"/></svg>':'<svg viewBox="0 0 24 24"><path d="M8 5v14M16 5v14"/></svg>';
  $("#playBtn").setAttribute("aria-label",paused?"Play":"Pause");
}
$("#playBtn").addEventListener("click",()=>{if(!src||src.kind!=="video")return;paused=!paused;paused?src.el.pause():src.el.play().catch(()=>{});syncPlay();});
function startRec(){
  if(!isAnim()){toast("Load a video or turn on the camera to record a clip.");return;}
  if(paused){paused=false;src.el.play().catch(()=>{});syncPlay();}
  rec={frames:[],fps:12,lastT:0,t0:performance.now(),cols:null,rows:null};
  $("#recBtn").classList.add("on");$("#recLbl").textContent="Stop (0.0 s)";
}
function recordFrame(f){
  const now=performance.now();
  if(rec.frames.length&&now-rec.lastT<1000/rec.fps-4)return;
  if(rec.cols===null){rec.cols=f.cols;rec.rows=f.rows;}
  if(f.cols!==rec.cols||f.rows!==rec.rows){stopRec(true);toast("Recording stopped because the size changed.");return;}
  rec.lastT=now;rec.frames.push({cells:f.cells,colors:f.colors,cols:f.cols,rows:f.rows,mode:f.mode,theme:f.theme,aspect:f.aspect});
  $("#recLbl").textContent=`Stop (${(rec.frames.length/rec.fps).toFixed(1)} s)`;
  if(rec.frames.length>=rec.fps*10)stopRec(true);
}
function stopRec(keep){
  if(!rec)return;const r=rec;rec=null;
  $("#recBtn").classList.remove("on");$("#recLbl").textContent="Record clip";
  if(keep&&r.frames.length>=2){
    clip={frames:r.frames,fps:r.fps,cols:r.cols,rows:r.rows,theme:r.frames[0].theme,aspect:r.frames[0].aspect,mode:r.frames[0].mode};
    toast(`Clip recorded: ${r.frames.length} frames`);openExport("gif");
  } else if(keep)toast("That clip was too short.");
}
$("#recBtn").addEventListener("click",()=>rec?stopRec(true):startRec());

/* ================= encoders ================= */
function drawFrame(x,f,fs,pad,TH){
  const cw=CW*fs,lh=cw/f.aspect;
  x.fillStyle=TH.bg;x.fillRect(0,0,x.canvas.width,x.canvas.height);
  x.font=`${fs}px ${FAM}`;x.textBaseline="middle";let cur="";
  for(let r=0;r<f.rows;r++)for(let c=0;c<f.cols;c++){
    const ch=f.cells[r][c];if(ch===" "||ch==="\u2800")continue;
    const col=f.colors?`rgb(${f.colors[r][c].join(",")})`:TH.ink;
    if(col!==cur){x.fillStyle=col;cur=col;}
    x.fillText(ch,pad+c*cw,pad+r*lh+lh/2);
  }
}
function canvasFor(f,fs){
  const cw=CW*fs,lh=cw/f.aspect,pad=Math.round(fs*1.6),c=document.createElement("canvas");
  c.width=Math.ceil(f.cols*cw+pad*2);c.height=Math.ceil(f.rows*lh+pad*2);
  return {c,pad};
}
async function makePNG(f){
  try{await document.fonts.load(`20px ${FAM}`);}catch(e){}
  const fs=clamp(2400/(f.cols*CW),12,28),{c,pad}=canvasFor(f,fs);
  drawFrame(c.getContext("2d"),f,fs,pad,THEMES[f.theme]);
  return await new Promise(res=>c.toBlob(res,"image/png"));
}
function makeSVG(f){
  const fs=14,cw=CW*fs,lh=cw/f.aspect,pad=24,TH=THEMES[f.theme];
  const W=Math.ceil(f.cols*cw+pad*2),H=Math.ceil(f.rows*lh+pad*2);
  let body="";
  f.cells.forEach((l,r)=>{
    const y=(pad+r*lh+lh/2).toFixed(2);let inner="";
    if(f.colors){let cur=null,buf="";const flush=()=>{if(buf)inner+=`<tspan fill="rgb(${cur})">${esc(buf)}</tspan>`;};
      l.forEach((ch,c)=>{const k=f.colors[r][c].join(",");if(k!==cur){flush();cur=k;buf="";}buf+=ch;});flush();}
    else inner=esc(l.join(""));
    body+=`<text x="${pad}" y="${y}" textLength="${(f.cols*cw).toFixed(2)}" lengthAdjust="spacing">${inner}</text>\n`;
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">\n<rect width="100%" height="100%" fill="${TH.bg}"/>\n<g font-family="JetBrains Mono, Menlo, Consolas, monospace" font-size="${fs}" fill="${TH.ink}" dominant-baseline="central" xml:space="preserve">\n${body}</g>\n</svg>\n`;
}
class ByteWriter{
  constructor(){this.b=new Uint8Array(1<<20);this.n=0;}
  grow(k){if(this.n+k>this.b.length){let L=this.b.length*2;while(L<this.n+k)L*=2;const nb=new Uint8Array(L);nb.set(this.b.subarray(0,this.n));this.b=nb;}}
  byte(v){this.grow(1);this.b[this.n++]=v;}
  bytes(a,len){this.grow(len);for(let i=0;i<len;i++)this.b[this.n++]=a[i];}
  word(v){this.byte(v&255);this.byte((v>>8)&255);}
  str(s){for(const ch of s)this.byte(ch.charCodeAt(0));}
  result(){return this.b.slice(0,this.n);}
}
function lzw(minSize,data,bw){
  bw.byte(minSize);
  const clear=1<<minSize,eoi=clear+1;let codeSize=minSize+1,next=eoi+1;
  const dict=new Map(),block=new Uint8Array(255);let bl=0,cur=0,bits=0;
  const emit=code=>{cur|=code<<bits;bits+=codeSize;while(bits>=8){block[bl++]=cur&255;cur>>>=8;bits-=8;if(bl===255){bw.byte(255);bw.bytes(block,255);bl=0;}}};
  emit(clear);
  let prefix=data[0];
  for(let i=1;i<data.length;i++){
    const k=data[i],key=prefix*256+k,f=dict.get(key);
    if(f!==undefined){prefix=f;continue;}
    emit(prefix);
    if(next>=4096){emit(clear);codeSize=minSize+1;next=eoi+1;dict.clear();}
    else{if(next>=(1<<codeSize))codeSize++;dict.set(key,next++);}
    prefix=k;
  }
  emit(prefix);emit(eoi);
  if(bits>0){block[bl++]=cur&255;if(bl===255){bw.byte(255);bw.bytes(block,255);bl=0;}}
  if(bl){bw.byte(bl);bw.bytes(block,bl);}
  bw.byte(0);
}
async function makeGIF(cl,onProg){
  try{await document.fonts.load(`12px ${FAM}`);}catch(e){}
  const fs=clamp(720/(cl.cols*CW),5,14),{c,pad}=canvasFor(cl,fs),W=c.width,H=c.height,x=c.getContext("2d",{willReadFrequently:true});
  const TH=THEMES[cl.theme],bg=hex(TH.bg),ink=hex(TH.ink),colored=cl.frames.some(f=>f.colors);
  let bits,pal,map;
  if(!colored){
    bits=1;pal=new Uint8Array(12);pal.set(bg,0);pal.set(ink,3);
    const lb=lum(bg),li=lum(ink),dn=li-lb||1;map=(r,g,b)=>((.2126*r+.7152*g+.0722*b-lb)/dn>.5?1:0);
  } else {
    bits=7;pal=new Uint8Array(768);
    for(let i=0;i<256;i++){pal[i*3]=Math.round(((i>>5)&7)*255/7);pal[i*3+1]=Math.round(((i>>2)&7)*255/7);pal[i*3+2]=(i&3)*85;}
    map=(r,g,b)=>(r&0xE0)|((g&0xE0)>>3)|(b>>6);
  }
  const bw=new ByteWriter();
  bw.str("GIF89a");bw.word(W);bw.word(H);bw.byte(0x80|(bits<<4)|bits);bw.byte(0);bw.byte(0);bw.bytes(pal,pal.length);
  bw.byte(0x21);bw.byte(0xFF);bw.byte(11);bw.str("NETSCAPE2.0");bw.byte(3);bw.byte(1);bw.word(0);bw.byte(0);
  const delay=Math.round(100/cl.fps),idx=new Uint8Array(W*H),minCode=Math.max(2,bits+1);
  for(let i=0;i<cl.frames.length;i++){
    drawFrame(x,cl.frames[i],fs,pad,TH);
    const d=x.getImageData(0,0,W,H).data;
    for(let p=0,j=0;p<idx.length;p++,j+=4)idx[p]=map(d[j],d[j+1],d[j+2]);
    bw.byte(0x21);bw.byte(0xF9);bw.byte(4);bw.byte(0);bw.word(delay);bw.byte(0);bw.byte(0);
    bw.byte(0x2C);bw.word(0);bw.word(0);bw.word(W);bw.word(H);bw.byte(0);
    lzw(minCode,idx,bw);
    onProg((i+1)/cl.frames.length);await sleep(0);
  }
  bw.byte(0x3B);
  return new Blob([bw.result()],{type:"image/gif"});
}
async function makeVideo(cl,onProg){
  if(!window.MediaRecorder||!HTMLCanvasElement.prototype.captureStream)throw new Error("unsupported");
  try{await document.fonts.load(`14px ${FAM}`);}catch(e){}
  const fs=clamp(1280/(cl.cols*CW),6,22),{c,pad}=canvasFor(cl,fs);
  if(c.width%2)c.width++;if(c.height%2)c.height++;
  const x=c.getContext("2d"),TH=THEMES[cl.theme];
  const types=["video/mp4;codecs=avc1","video/mp4","video/webm;codecs=vp9","video/webm"];
  const mime=types.find(t=>MediaRecorder.isTypeSupported(t))||"";
  drawFrame(x,cl.frames[0],fs,pad,TH);
  const stream=c.captureStream(cl.fps),mr=new MediaRecorder(stream,mime?{mimeType:mime,videoBitsPerSecond:5e6}:{}),chunks=[];
  mr.ondataavailable=e=>{if(e.data&&e.data.size)chunks.push(e.data);};
  const done=new Promise(r=>mr.onstop=r);
  mr.start(250);
  const loops=Math.max(1,Math.ceil(3*cl.fps/cl.frames.length)),total=cl.frames.length*loops;
  for(let i=0;i<total;i++){drawFrame(x,cl.frames[i%cl.frames.length],fs,pad,TH);onProg((i+1)/total);await sleep(1000/cl.fps);}
  await sleep(200);mr.stop();await done;stream.getTracks().forEach(t=>t.stop());
  const type=(mr.mimeType||mime||"video/webm").split(";")[0];
  return {blob:new Blob(chunks,{type}),ext:type.includes("mp4")?"mp4":"webm"};
}
function makePlayer(cl){
  const TH=THEMES[cl.theme],frames=cl.frames.map(f=>toHTML(f)),lh=(.6/cl.aspect).toFixed(3),vw=(100/(cl.cols*.6)*.92).toFixed(3);
  return `<!DOCTYPE html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ASCII clip</title>\n<style>html,body{margin:0;height:100%;background:${TH.bg};color:${TH.ink}}body{display:grid;place-items:center}pre{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:min(${vw}vw,12px);line-height:${lh};margin:0}</style></head>\n<body><pre id="p"></pre>\n<script>const F=${JSON.stringify(frames).replace(/</g,"\\u003c")};let i=0;const p=document.getElementById("p");function t(){p.innerHTML=F[i];i=(i+1)%F.length}t();setInterval(t,${Math.round(1000/cl.fps)});<\/script>\n</body></html>\n`;
}
function ansi(f){
  if(!f.colors)return plainText(f)+"\n";
  const E="\x1b[";
  return f.cells.map((l,r)=>{let s="",cur="";l.forEach((ch,c)=>{const k=f.colors[r][c].join(";");if(ch!==" "&&k!==cur){s+=E+"38;2;"+k+"m";cur=k;}s+=ch;});return s.replace(/\s+$/,"")+E+"0m";}).join("\n")+"\n";
}
function embedHTML(f,fs){
  const TH=THEMES[f.theme],lh=(.6/f.aspect).toFixed(3);
  return `<pre style="font-family:ui-monospace,Menlo,Consolas,monospace;font-size:${fs}px;line-height:${lh};background:${TH.bg};color:${TH.ink};padding:16px;margin:0;display:inline-block;border-radius:6px;white-space:pre">${toHTML(f)}</pre>`;
}


/* ================= loop effects ================= */
const NOISE=Array.from("░▒▓#@%*+=-:.");
const EFFECTS=[["decode","Decode"],["type","Typewriter"],["scan","Scan"],["rain","Rain"],["wave","Wave"],["shimmer","Shimmer"],["breathe","Breathe"],["drift","Drift"],["glitch","Glitch"]];
const EFFECT_HINTS={decode:"Characters resolve out of noise, hold, then dissolve.",type:"Typed out cell by cell with a blinking cursor.",scan:"A glowing band sweeps down the image.",
  rain:"Falling streams reveal the image, Matrix style.",wave:"Rows sway in a gentle sine wave.",shimmer:"Characters flicker to their neighbours like film grain.",
  breathe:"Contrast and brightness pulse slowly.",drift:"A slow pan and zoom, like a documentary shot.",glitch:"Occasional slices tear sideways in color."};
const anim={effect:"decode",len:3,useClip:false,boomerang:true};
let animCache=null,animKey="",animTok=0;
function rng(seed){return function(){seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const frac=x=>x-Math.floor(x);
async function getAnim(prog){
  const key=JSON.stringify([anim,snap(),[...edits],src&&src.name,src&&src.kind,clip?clip.frames.length:0]);
  if(animCache&&animKey===key&&!isAnim())return animCache;
  let A;
  if(anim.useClip&&clip){let fr=clip.frames;if(anim.boomerang&&fr.length>2)fr=fr.concat(fr.slice(1,-1).reverse());A={...clip,frames:fr};}
  else A=await buildEffect(anim.effect,anim.len,prog);
  animCache=A;animKey=key;return A;
}
async function buildEffect(eff,len,prog){
  const fps=12,n=Math.round(fps*len),TAU=Math.PI*2;
  const sw=Math.min(src.w,1600),sh=Math.round(sw*src.h/src.w),still=document.createElement("canvas");still.width=sw;still.height=sh;
  still.getContext("2d").drawImage(src.el,0,0,sw,sh);
  const S0={kind:"image",el:still,w:sw,h:sh,mirror:!!src.mirror},base=convert(S0,state,edits);
  const {cols,rows}=base,TH=THEMES[state.theme],ink=hex(TH.ink),bg=hex(TH.bg),glow=state.theme==="paper"?[255,79,26]:[255,255,255];
  const pal=Array.from(state.palette),pidx=new Map(pal.map((ch,j)=>[ch,j]));
  const r0=rng(7),R=new Float32Array(cols*rows).map(()=>r0()),colSp=new Float32Array(cols).map(()=>r0()<.55?1:2),colOff=new Float32Array(cols).map(()=>r0());
  const col=(r,c)=>base.colors?base.colors[r][c]:ink;
  const blank=ch=>ch===" "||ch==="\u2800";
  const dc=document.createElement("canvas");dc.width=sw;dc.height=sh;const dctx=dc.getContext("2d");
  const frames=[];
  for(let i=0;i<n;i++){
    const t=i/n;let cells,colors=base.colors;
    if(eff==="decode"){
      const p=t<.4?t/.4:t<.75?1:1-(t-.75)/.25;
      cells=base.cells.map((l,r)=>l.map((ch,c)=>{const k=R[r*cols+c],th=(c/cols)*.6+k*.4;
        return p>=th?ch:(p>th-.2?NOISE[(((k*997)|0)+i)%NOISE.length]:" ");}));
    } else if(eff==="type"){
      const total=rows*cols,k=t<.7?Math.floor(t/.7*total):t<.92?total:-1;
      cells=base.cells.map((l,r)=>l.map((ch,c)=>{const idx=r*cols+c;return idx<k?ch:(idx===k&&i%4<2?"█":" ");}));
    } else if(eff==="scan"){
      const B=Math.max(3,rows*.14),y=t*(rows+2*B)-B;colors=[];
      cells=base.cells.map((l,r)=>{const d=Math.abs(r-y),w=d<B?1-d/B:0,crow=[];
        const line=l.map((ch,c)=>{crow.push(w>0?mix(col(r,c),glow,w*.9):col(r,c));return blank(ch)&&w>.8?(base.mode==="braille"?"⠤":"·"):ch;});
        colors.push(crow);return line;});
    } else if(eff==="rain"){
      const T=Math.max(5,rows*.55);cells=[];colors=[];
      for(let r=0;r<rows;r++){const line=[],crow=[];
        for(let c=0;c<cols;c++){let best=0;
          for(const d of [0,.5]){const pos=frac(t*colSp[c]+colOff[c]+d)*(rows+T),dist=pos-r;if(dist>=0&&dist<T)best=Math.max(best,1-dist/T);}
          if(best<=0){line.push(" ");crow.push(bg);continue;}
          const ch=base.cells[r][c],head=best>.93;
          line.push(!blank(ch)?ch:(head?NOISE[((R[r*cols+c]*12)|0)%NOISE.length]:" "));
          crow.push(head?glow:mix(bg,col(r,c),.25+.75*best));}
        cells.push(line);colors.push(crow);}
    } else if(eff==="wave"){
      const A=Math.max(1,Math.round(cols*.025)),lam=Math.max(6,rows*.7);cells=[];colors=base.colors?[]:null;
      for(let r=0;r<rows;r++){const dx=Math.round(A*Math.sin(TAU*(t+r/lam))),line=[],crow=[];
        for(let c=0;c<cols;c++){const sc=c-dx,ok=sc>=0&&sc<cols;line.push(ok?base.cells[r][sc]:" ");if(colors)crow.push(ok?base.colors[r][sc]:ink);}
        cells.push(line);if(colors)colors.push(crow);}
    } else if(eff==="shimmer"){
      cells=base.cells.map((l,r)=>l.map((ch,c)=>{
        if(blank(ch))return ch;const k=R[r*cols+c];if(Math.sin(TAU*(2*t+k))<.8)return ch;
        if(base.mode==="braille")return String.fromCharCode(0x2800|((ch.charCodeAt(0)-0x2800)^(1<<((k*8)|0))));
        const j=pidx.get(ch);if(j!==undefined&&pal.length>2)return pal[clamp(j+(k>.5?1:-1),1,pal.length-1)];
        return NOISE[((k*50)|0)%NOISE.length];}));
    } else if(eff==="breathe"){
      const w=Math.sin(TAU*t),f=convert(S0,{...state,contrast:clamp(state.contrast+28*w,-100,100),bright:clamp(state.bright+14*w,-100,100)},edits);
      cells=f.cells;colors=f.colors;
    } else if(eff==="drift"){
      const z=1.14+.08*Math.sin(TAU*t),cx=.5+.05*Math.cos(TAU*t),cy=.5+.05*Math.sin(TAU*t),w=sw/z,h=sh/z;
      dctx.drawImage(still,clamp(cx*sw-w/2,0,sw-w),clamp(cy*sh-h/2,0,sh-h),w,h,0,0,sw,sh);
      const f=convert({kind:"image",el:dc,w:sw,h:sh,mirror:!!src.mirror},state,edits);cells=f.cells;colors=f.colors;
    } else {
      const g=rng(1000+Math.floor(i/2));cells=base.cells.map(l=>l.slice());colors=base.colors?base.colors.map(l=>l.slice()):null;
      if(g()<.4){
        colors=colors||cells.map(l=>l.map(()=>ink));
        const bands=1+Math.floor(g()*3);
        for(let b=0;b<bands;b++){
          const rs=Math.floor(g()*rows),h=1+Math.floor(g()*Math.max(1,rows*.12)),dx=Math.round((g()-.5)*cols*.16)||2,tint=g()<.5?[255,79,26]:[60,200,255];
          for(let r=rs;r<Math.min(rows,rs+h);r++)for(let c=0;c<cols;c++){
            const sc=c-dx;cells[r][c]=sc>=0&&sc<cols?base.cells[r][sc]:" ";
            if(g()<.12)cells[r][c]=NOISE[Math.floor(g()*NOISE.length)];colors[r][c]=tint;}
        }
      }
    }
    frames.push({cells,colors:colors||null,cols,rows,mode:base.mode,theme:base.theme,aspect:base.aspect});
    if(i%3===2){prog&&prog((i+1)/n);await sleep(0);}
  }
  return {frames,fps,cols,rows,theme:base.theme,aspect:base.aspect,mode:base.mode};
}
function buildCtl(d){
  const el=$("#expCtl");
  let h='<div class="chips" role="radiogroup" aria-label="Animation">';
  if(clip)h+=`<button type="button" class="chip" data-eff="clip" aria-pressed="${anim.useClip}">Recorded clip</button>`;
  EFFECTS.forEach(([id,name])=>{h+=`<button type="button" class="chip" data-eff="${id}" aria-pressed="${!anim.useClip&&anim.effect===id}">${name}</button>`;});
  h+='</div><div class="erow">';
  if(anim.useClip&&clip)h+=`<label class="sw">Boomerang loop<input type="checkbox" id="boomer"${anim.boomerang?" checked":""}></label><span class="sub">Plays forward then backward, so any clip loops without a jump.</span>`;
  else h+=`<span class="sub">Length</span><div class="tseg">${[2,3,5].map(v=>`<label><input type="radio" name="alen" value="${v}"${anim.len===v?" checked":""}>${v} s</label>`).join("")}</div><span class="sub">${EFFECT_HINTS[anim.effect]}</span>`;
  h+='</div>';el.innerHTML=h;
  el.querySelectorAll(".chip").forEach(b=>b.addEventListener("click",()=>{
    if(b.dataset.eff==="clip")anim.useClip=true;else{anim.useClip=false;anim.effect=b.dataset.eff;}selectDest(d.id);}));
  el.querySelectorAll('input[name=alen]').forEach(r=>r.addEventListener("change",()=>{anim.len=+r.value;selectDest(d.id);}));
  const bo=el.querySelector("#boomer");if(bo)bo.addEventListener("change",()=>{anim.boomerang=bo.checked;selectDest(d.id);});
}

/* ================= export modal ================= */
const DESTS=[
  {id:"github",g:"Paste into",name:"GitHub README",rec:100,desc:"Wrapped in a code block so spacing survives Markdown. Around 100 columns reads well on desktop; GitHub adds a scrollbar past that.",text:f=>"```text\n"+plainText(f)+"\n```"},
  {id:"discord",name:"Discord",rec:44,limit:2000,desc:"Messages are capped at 2,000 characters including the code fences, so keep it small. About 44 columns fits on phones without wrapping.",text:f=>"```\n"+plainText(f)+"\n```"},
  {id:"slack",name:"Slack",rec:72,desc:"Posted as a code block. Under about 80 columns it won't wrap in the normal message layout.",text:f=>"```\n"+plainText(f)+"\n```"},
  {id:"terminal",name:"Terminal (ANSI)",rec:80,file:"ascii-ansi.txt",desc:"24-bit color escape codes for cat, login banners and CLI splash screens. Turn on colored characters for color; without it you get plain text.",text:ansi,plainPreview:true},
  {id:"email",name:"Email signature",rec:48,desc:"Inline-styled HTML. Copy it and paste into your mail app's signature editor. Keep it narrow so it doesn't dominate the email.",text:f=>embedHTML(f,6),rich:true},
  {id:"embed",name:"Web embed",file:"ascii-embed.html",desc:"A single self-contained <pre> element with inline styles. Drop it into any website or CMS that accepts HTML.",text:f=>embedHTML(f,10),rendered:true},
  {id:"png",g:"Download",name:"PNG image",desc:"A sharp raster image on your chosen background, about 2,400 pixels wide."},
  {id:"svg",name:"SVG vector",desc:"Scalable vector text, crisp at any size. The best choice for print and posters."},
  {id:"txt",name:"Plain text",file:"ascii.txt",desc:"The raw characters, trailing spaces trimmed.",text:f=>plainText(f)+"\n"},
  {id:"gif",g:"Animated",name:"GIF",anim:true,desc:"A seamless looping GIF. Pick an effect to animate your image, or use a clip recorded from video or camera. Mono loops use two colors and stay small."},
  {id:"video",name:"Video file",anim:true,desc:"The same loop as a video file, MP4 where the browser supports it, otherwise WebM. Short loops repeat to at least three seconds so they play well on social."},
  {id:"player",name:"HTML player",anim:true,file:"ascii-player.html",desc:"A tiny web page that plays the loop as real text. Selectable, searchable and far smaller than a video, and it loops forever."}
];
let expOpen=false,expId="github",pvTimer=0,pvUrl=null;
function openExport(id){
  if(!last){toast("Load an image first.");return;}
  expOpen=true;expId=id||expId;anim.useClip=!!clip&&(anim.useClip||id==="gif");buildList();selectDest(expId);$("#exp").hidden=false;$("#expClose").focus();
}
function closeExport(){expOpen=false;animTok++;$("#exp").hidden=true;clearInterval(pvTimer);if(pvUrl){URL.revokeObjectURL(pvUrl);pvUrl=null;}}
function buildList(){
  let h="";
  DESTS.forEach(d=>{if(d.g)h+=`<h4>${d.g}</h4>`;h+=`<button class="dest" type="button" data-id="${d.id}">${esc(d.name)}</button>`;});
  h+=`<p class="mnote">${clip?"Your recorded clip is ready under Animated.":"Animated exports loop any image with an effect. Record from a video or your camera to use real motion."}</p>`;
  $("#expList").innerHTML=h;
  $$(".dest").forEach(b=>b.addEventListener("click",()=>selectDest(b.dataset.id)));
}
function pill(txt,cls){return `<span class="pill ${cls||""}">${txt}</span>`;}
function actBtn(label,cls,fn){const b=document.createElement("button");b.type="button";b.className="btn "+(cls||"");b.textContent=label;b.addEventListener("click",()=>fn(b));$("#expActs").appendChild(b);return b;}
function previewPre(f,txt,html){
  const pv=$("#expPv"),TH=THEMES[f.theme];pv.innerHTML="";pv.style.background="";
  const pre=document.createElement("pre");
  if(html!==undefined){pre.innerHTML=html;pv.style.background=TH.bg;pre.style.color=TH.ink;}else pre.textContent=txt;
  pv.appendChild(pre);
  requestAnimationFrame(()=>{const cs=getComputedStyle(pv),W=pv.clientWidth-parseFloat(cs.paddingLeft)*2,widest=Math.max(...(txt!==undefined?txt.split("\n"):[""]).map(l=>Array.from(l).length),f.cols);
    pre.style.fontSize=clamp(W/(widest*CW),3,11)+"px";pre.style.letterSpacing=f.mode==="braille"?(CW-BW).toFixed(4)+"em":"0";});
  return pre;
}
async function selectDest(id){
  let d=DESTS.find(x=>x.id===id);if(!d)d=DESTS[0];
  expId=d.id;clearInterval(pvTimer);if(pvUrl){URL.revokeObjectURL(pvUrl);pvUrl=null;}
  $$(".dest").forEach(b=>b.setAttribute("aria-current",String(b.dataset.id===d.id)));
  $("#expTitle").textContent=d.name;$("#expDesc").textContent=d.desc;$("#expActs").innerHTML="";
  const f=last,stats=[];
  $("#expCtl").hidden=!d.anim;
  if(d.anim){
    buildCtl(d);
    const tok=++animTok,pv=$("#expPv");pv.style.background="";pv.innerHTML='<p class="sub">Preparing the loop…</p>';$("#expStats").innerHTML="";
    const A=await getAnim(p=>{if(tok===animTok&&pv.firstChild)pv.firstChild.textContent=`Preparing the loop… ${Math.round(p*100)}%`;});
    if(tok!==animTok||expId!==d.id||!expOpen)return;
    const fr=A.frames,pre=previewPre(A,undefined,toHTML(fr[0]));let i=0;
    pvTimer=setInterval(()=>{pre.innerHTML=toHTML(fr[i]);i=(i+1)%fr.length;},1000/A.fps);
    requestAnimationFrame(()=>{pre.style.fontSize=clamp(Math.min((pv.clientWidth-32)/(A.cols*CW),(pv.clientHeight-32)/(A.rows*CW/A.aspect)),2.5,11)+"px";pre.style.lineHeight=CW/A.aspect;});
    stats.push(pill(`${A.cols} × ${A.rows}`),pill(`${fr.length} frames`),pill(`${(fr.length/A.fps).toFixed(1)} s loop at ${A.fps} fps`));
    const enc=async(b,label,fn)=>{b.disabled=true;try{await fn(p=>{b.textContent=`${label} ${Math.round(p*100)}%`;});}catch(e){toast(e&&e.message==="unsupported"?"This browser can't record video. Try the GIF instead.":"Encoding failed.");}b.disabled=false;b.textContent=label;};
    if(d.id==="gif")actBtn("Download GIF","go",b=>enc(b,"Download GIF",async pr=>{const blob=await makeGIF(A,pr);await saveFile("ascii.gif",blob,"image/gif");}));
    if(d.id==="video")actBtn("Make video","go",b=>enc(b,"Make video",async pr=>{const r=await makeVideo(A,pr);await saveFile(`ascii.${r.ext}`,r.blob,r.blob.type);}));
    if(d.id==="player")actBtn("Download HTML","go",()=>saveFile(d.file,makePlayer(A),"text/html"));
    if(anim.useClip&&clip)actBtn("Discard clip","",()=>{clip=null;anim.useClip=false;animCache=null;buildList();selectDest(d.id);toast("Clip discarded");});
    $("#expStats").innerHTML=stats.join("");
    return;
  } else if(d.id==="png"){
    $("#expPv").innerHTML="";$("#expPv").style.background="";
    makePNG(f).then(blob=>{if(expId!=="png")return;pvUrl=URL.createObjectURL(blob);const img=new Image();img.src=pvUrl;img.alt="PNG preview";$("#expPv").innerHTML="";$("#expPv").appendChild(img);
      $("#expStats").insertAdjacentHTML("beforeend",pill(`${Math.round(blob.size/1024)} KB`));});
    stats.push(pill(`${f.cols} × ${f.rows}`));
    actBtn("Download PNG","go",async()=>saveFile("ascii.png",await makePNG(f),"image/png"));
  } else if(d.id==="svg"){
    const svg=makeSVG(f);pvUrl=URL.createObjectURL(new Blob([svg],{type:"image/svg+xml"}));
    const img=new Image();img.src=pvUrl;img.alt="SVG preview";$("#expPv").innerHTML="";$("#expPv").style.background="";$("#expPv").appendChild(img);
    stats.push(pill(`${f.cols} × ${f.rows}`),pill(`${Math.round(svg.length/1024)} KB`));
    actBtn("Download SVG","go",()=>saveFile("ascii.svg",svg,"image/svg+xml"));
  } else {
    const txt=d.text(f);
    if(d.rendered||d.rich)previewPre(f,plainText(f),toHTML(f));
    else previewPre(f,d.plainPreview?plainText(f):txt);
    const count=Array.from(txt).length;
    stats.push(pill(`${f.cols} × ${f.rows}`),pill(`${count.toLocaleString("en-US")} characters`));
    if(d.limit)stats.push(count<=d.limit?pill(`Fits the ${d.limit.toLocaleString("en-US")} limit`,"ok"):pill(`Over the limit by ${(count-d.limit).toLocaleString("en-US")}`,"warn"));
    if(d.id==="terminal"&&!f.colors)stats.push(pill("No color: turn on colored characters","warn"));
    if(d.rich)actBtn("Copy for email","go",()=>copyRich(txt,plainText(f)));
    else actBtn("Copy","go",()=>copyText(txt));
    if(d.file)actBtn("Download","",()=>saveFile(d.file,txt,d.file.endsWith(".html")?"text/html":"text/plain"));
    if(d.limit&&count>d.limit)actBtn("Shrink to fit","",()=>{
      let c=state.cols;while(c>20&&rowsFor(c,state,src)*(c+1)+8>d.limit)c--;
      setK("cols",c);render();selectDest(d.id);});
    if(d.rec&&state.cols!==d.rec)actBtn(`Use ${d.rec} columns`,"",()=>{setK("cols",d.rec);render();selectDest(d.id);});
  }
  $("#expStats").innerHTML=stats.join("");
}
$("#expClose").addEventListener("click",closeExport);
$("#exp").addEventListener("click",e=>{if(e.target===$("#exp"))closeExport();});
$("#expBtn").addEventListener("click",()=>openExport());
$("#animBtn").addEventListener("click",()=>openExport("gif"));

/* ================= ui wiring ================= */
LOOKS.forEach(l=>{
  const b=document.createElement("button");b.type="button";b.className="look";b.textContent=l.name;b.dataset.id=l.id;
  b.addEventListener("click",()=>{Object.assign(state,TONE_DEF,l.set);activeLook=l.id;syncAll();schedule();commitNow();});
  $("#looks").appendChild(b);
});
PRESETS.forEach(([name,p])=>{
  const b=document.createElement("button");b.type="button";b.className="pal";b.dataset.p=p;
  b.innerHTML=`<span class="c">${esc(p.replace(/^ /,"·").slice(0,24))}</span><span class="nm">${name}, ${Array.from(p).length} characters</span>`;
  b.addEventListener("click",()=>{state.palette=p;syncPalette();changed("palette");});
  $("#pals").appendChild(b);
});
$("#sortDensity").addEventListener("click",async()=>{
  try{await document.fonts.load(`40px ${FAM}`);}catch(e){}
  const chars=[...new Set(Array.from(state.palette))],c=document.createElement("canvas");c.width=c.height=56;
  const x=c.getContext("2d",{willReadFrequently:true});x.font=`40px ${FAM}`;x.textAlign="center";x.textBaseline="middle";
  const d=chars.map(ch=>{x.clearRect(0,0,56,56);x.fillStyle="#000";x.fillText(ch,28,28);
    const px=x.getImageData(0,0,56,56).data;let s=0;for(let i=3;i<px.length;i+=4)s+=px[i];return [ch,s];});
  d.sort((p,q)=>p[1]-q[1]);state.palette=d.map(p=>p[0]).join("");syncPalette();changed("palette");
  toast("Palette sorted by how much ink each character uses");
});
$("#reversePal").addEventListener("click",()=>{state.palette=Array.from(state.palette).reverse().join("");syncPalette();changed("palette");});
$("#resetTone").addEventListener("click",()=>{Object.assign(state,TONE_DEF);syncAll();changed("bright");});
$$(".fileIn").forEach(inp=>inp.addEventListener("change",e=>{loadFile(e.target.files[0]);e.target.value="";}));
$("#demo").addEventListener("click",()=>{const s=makeSample();setSource({kind:"image",el:s,w:s.width,h:s.height,name:"Demo image"});});
$("#camBtn").addEventListener("click",async()=>{
  if(src&&src.kind==="camera"){const s=makeSample();setSource({kind:"image",el:s,w:s.width,h:s.height,name:"Demo image"});return;}
  const c=await openCamera();if(c){setSource(c);toast("Camera on. Press R to record a clip.");}
});
$("#copy").addEventListener("click",()=>{if(last)copyText(plainText(last),"Text copied to clipboard");});

function zoomBy(f){state.fit=false;state.zoom=clamp(Math.round(state.zoom*f*4)/4,2.5,40);styleOut();}
$("#zIn").addEventListener("click",()=>zoomBy(1.18));
$("#zOut").addEventListener("click",()=>zoomBy(1/1.18));
$("#zoomVal").addEventListener("click",()=>{state.fit=true;styleOut();});
$("#cmpBtn").addEventListener("click",()=>{state.compare=!state.compare;if(state.compare)drawOverlay();styleOut();});
new ResizeObserver(()=>{if(state.fit&&view==="studio")styleOut();}).observe(vp);
let rsT=0;window.addEventListener("resize",()=>{clearTimeout(rsT);rsT=setTimeout(()=>{if(view==="home")renderSamples();},150);});

const kb=$("#kb");
function toggleKb(force){const open=force!==undefined?force:kb.hidden;kb.hidden=!open;$("#kbBtn").setAttribute("aria-expanded",String(open));}
$("#kbBtn").addEventListener("click",e=>{e.stopPropagation();toggleKb();});
document.addEventListener("click",e=>{if(!kb.hidden&&!kb.contains(e.target))toggleKb(false);});

window.addEventListener("keydown",e=>{
  if(!$("#exp").hidden){if(e.key==="Escape")closeExport();return;}
  if(view!=="studio")return;
  const t=e.target;if(t.matches&&t.matches("input[type=text],textarea"))return;
  const mod=e.ctrlKey||e.metaKey,k=e.key;
  if(state.tool==="type"&&cursor&&!mod&&!e.altKey){
    if(k.length===1||Array.from(k).length===1){setEdit(cursor.r,cursor.c,k);cursor.c=Math.min(last.cols-1,cursor.c+1);showCursor();e.preventDefault();return;}
    const mv={ArrowLeft:[0,-1],ArrowRight:[0,1],ArrowUp:[-1,0],ArrowDown:[1,0]}[k];
    if(mv){cursor.r=clamp(cursor.r+mv[0],0,last.rows-1);cursor.c=clamp(cursor.c+mv[1],0,last.cols-1);showCursor();e.preventDefault();return;}
    if(k==="Backspace"){cursor.c=Math.max(0,cursor.c-1);setEdit(cursor.r,cursor.c," ");showCursor();e.preventDefault();return;}
    if(k==="Enter"){cursor.r=Math.min(last.rows-1,cursor.r+1);cursor.c=cursor.c0;showCursor();e.preventDefault();return;}
    if(k==="Escape"){cursor=null;showCursor();e.preventDefault();return;}
  }
  if(mod&&k.toLowerCase()==="z"){e.preventDefault();e.shiftKey?redo():undo();return;}
  if(mod&&k.toLowerCase()==="y"){e.preventDefault();redo();return;}
  if(mod||e.altKey)return;
  const modes=["tone","shape","text","bw","braille","edges"],lk=k.toLowerCase();
  if(k.length===1&&"123456".includes(k))setK("mode",modes[+k-1]);
  else if(lk==="i")setK("invert",!state.invert);
  else if(lk==="c"){state.compare=!state.compare;if(state.compare)drawOverlay();styleOut();}
  else if(lk==="f"){state.fit=true;styleOut();}
  else if(lk==="b")setK("tool",state.tool==="brush"?"none":"brush");
  else if(lk==="e")setK("tool",state.tool==="erase"?"none":"erase");
  else if(lk==="t")setK("tool",state.tool==="type"?"none":"type");
  else if(lk==="x")openExport();
  else if(lk==="a")openExport("gif");
  else if(lk==="r")rec?stopRec(true):startRec();
  else if(k==="+"||k==="=")zoomBy(1.18);
  else if(k==="-"||k==="_")zoomBy(1/1.18);
  else if(k==="[")setK("cols",Math.max(20,state.cols-10));
  else if(k==="]")setK("cols",Math.min(300,state.cols+10));
  else if(k==="?")toggleKb();
  else if(k==="Escape"){toggleKb(false);if(state.tool!=="none")setK("tool","none");}
  else return;
  e.preventDefault();
});

let dragDepth=0;
window.addEventListener("dragenter",e=>{if(e.dataTransfer&&[...e.dataTransfer.types].includes("Files")){dragDepth++;document.body.classList.add("dropping");}});
window.addEventListener("dragover",e=>e.preventDefault());
window.addEventListener("dragleave",()=>{dragDepth=Math.max(0,dragDepth-1);if(!dragDepth)document.body.classList.remove("dropping");});
window.addEventListener("drop",e=>{
  e.preventDefault();dragDepth=0;document.body.classList.remove("dropping");
  const f=e.dataTransfer.files[0];if(!f)return;
  if(view!=="studio"){location.hash="#studio";setTimeout(()=>loadFile(f),30);}else loadFile(f);
});
window.addEventListener("paste",e=>{
  const it=[...(e.clipboardData?.items||[])].find(i=>i.type.startsWith("image/"));
  if(!it)return;e.preventDefault();const f=it.getAsFile();
  if(view!=="studio"){location.hash="#studio";setTimeout(()=>loadFile(f),30);}else loadFile(f);
});
matchMedia("(prefers-color-scheme: dark)").addEventListener("change",()=>{drawSwatches();schedule();});

/* ================= GitHub stars ================= */
(function repoStars(){
  const links=$$("[data-repo]");if(!links.length)return;
  const m=(links[0].getAttribute("href")||"").match(/github\.com\/([^/]+)\/([^/#?]+)/);
  if(!m||m[1]==="YOUR-USERNAME")return;
  const key="atelier-stars:"+m[1]+"/"+m[2];
  const show=n=>links.forEach(a=>{const s=a.querySelector(".stars");if(!s)return;s.textContent=n>=1000?(n/1000).toFixed(1).replace(/\.0$/,"")+"k":String(n);s.hidden=false;});
  try{const c=sessionStorage.getItem(key);if(c!==null){show(+c);return;}}catch(e){}
  fetch(`https://api.github.com/repos/${m[1]}/${m[2].replace(/\.git$/,"")}`).then(r=>r.ok?r.json():null).then(j=>{
    if(j&&typeof j.stargazers_count==="number"){show(j.stargazers_count);try{sessionStorage.setItem(key,String(j.stargazers_count));}catch(e){}}
  }).catch(()=>{});
})();

/* ================= init ================= */
measureFont();syncAll();drawSwatches();commitNow();
route();
requestAnimationFrame(loop);
if(document.fonts&&document.fonts.ready)document.fonts.ready.then(()=>{measureFont();gCache={};drawSwatches();if(view==="home")renderSamples();else{styleOut();schedule();}});
})();
