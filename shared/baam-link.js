/* ═══ BAAM-LINK v1 ═══════════════════════════════════════════════════════════
   La passerelle entre BAAM Tools. Source canonique : shared/baam-link.js.
   Une copie IDENTIQUE est injectée dans chaque tool (node shared/inject.js).

   Contrat de module — chaque tool se déclare :
     BaamLink.init({
       id: "fonds-vivants",                       // = son id de page (/baam-tools/<id>/)
       anchor: élément sous lequel poser la rangée « Continuer avec »,
       offers:  { palette: ()=>({ colors, base }), svg: { to:["convertisseur"], get: async ()=>({ svg, name }) } },
       accepts: { palette: data=>{…}, svg: data=>{…} }
     });
   Une offre est une fonction, ou { get, to:[ids] } pour limiter les destinations proposées.
   Un tool OFFRE un résultat ; la rangée propose les tools qui l'ACCEPTENT. Le clic
   dépose le résultat dans le navigateur (localStorage, même domaine) et ouvre l'autre
   tool, qui le consomme au chargement (valable 15 min, une seule fois).

   Types de résultat :
     palette — { colors:["#rrggbb", …], base:"#rrggbb" }
     svg     — { svg:"<svg…>", name:"fichier.svg" }   (statique ou animé)

   Adresses : /baam-tools/<id>/ par défaut ; en local (file://), les fichiers voisins.
   Surcharge possible : window.BAAM_LINKS = { urls:{ "<id>":"…" } } (page ou page parente).
═══════════════════════════════════════════════════════════════════════════════ */
const BaamLink=(()=>{
  const KEY="baam.tools.handoff", TTL=15*60*1000;
  // Ce que chaque tool sait recevoir : c'est ce qui décide des destinations proposées.
  const CATALOG={
    "color-picker":    { label:"Color Picker",      accepts:[] },
    "operateur-texte": { label:"Opérateur Texte",   accepts:["palette"] },
    "animateur-logo":  { label:"Animateur de logo", accepts:["palette","svg"] },
    "fonds-vivants":   { label:"Fonds vivants",     accepts:["palette"] },
    "convertisseur":   { label:"Convertisseur",     accepts:["svg"] },
    "mindmap":         { label:"Mindmap",           accepts:[] }
  };
  const SENT={ palette:"la palette", svg:"le visuel" };
  const GOT={ palette:"Palette reçue", svg:"Visuel reçu" };
  // Pourquoi aller là-bas, en quelques mots (affiché au survol).
  const WHY={ "palette>operateur-texte":"colorer ton mot", "palette>animateur-logo":"teinter ton logo", "palette>fonds-vivants":"habiller une trame",
    "svg>convertisseur":"en GIF, MP4, PNG, favicon…", "svg>animateur-logo":"l'animer avec un opérateur BAAM" };
  const FILES={ "operateur-texte":"tools-src/operateur-texte/index.html" };
  let self=null;

  const conf=()=>{ let p={}; try{ if(window.parent && window.parent!==window && window.parent.BAAM_LINKS) p=window.parent.BAAM_LINKS; }catch(_){}
    return Object.assign({ urls:{} }, p, window.BAAM_LINKS||{}); };
  function urlOf(id){
    const u=conf().urls||{}; if(u[id]) return u[id];
    if(location.protocol==="file:"){ const up=/\/tools-src\//.test(location.pathname) ? "../../" : ""; return up+(FILES[id]||id+".html"); }
    return `/baam-tools/${id}/`;
  }
  // Le tool peut être encadré (iframe du portail, même domaine) : on change la page entière.
  function go(url){ try{ if(window.top!==window){ window.top.location.href=new URL(url,location.href).href; return; } }catch(_){} location.href=url; }

  const CSS=`
.bl-row{display:flex;flex-wrap:wrap;gap:6px;align-items:center;justify-content:center;margin:10px auto 0;max-width:760px;font-family:var(--mono,ui-monospace,SFMono-Regular,Menlo,Consolas,monospace);}
.bl-row[hidden]{display:none!important;}
.bl-k{font-size:10px;text-transform:uppercase;letter-spacing:.1em;color:var(--muted,#8a867c);margin-right:2px;}
.bl-go{font-family:inherit;font-size:11px;letter-spacing:.03em;background:transparent;color:var(--ink,#17150f);border:1px dashed var(--line,#ddd8cd);border-radius:7px;padding:6px 10px;cursor:pointer;line-height:1.2;}
.bl-go:hover{border-style:solid;border-color:var(--accent,#00a847);color:var(--accent,#00a847);}
.bl-go:disabled{opacity:.45;cursor:default;}
.bl-note{position:fixed;left:50%;top:14px;transform:translate(-50%,-8px);opacity:0;background:var(--ink,#17150f);color:#fff;border-radius:8px;padding:9px 14px;font:12px/1.3 var(--mono,ui-monospace,Menlo,Consolas,monospace);z-index:1001;transition:opacity .2s,transform .2s;pointer-events:none;max-width:calc(100% - 32px);}
.bl-note.on{opacity:1;transform:translate(-50%,0);}
.bl-note b{color:var(--accent-live,#00f058);}`;
  function style(){ if(document.getElementById("bl-style")) return; const s=document.createElement("style"); s.id="bl-style"; s.textContent=CSS; document.head.appendChild(s); }
  let noteT=null;
  function note(html){ style(); let n=document.querySelector(".bl-note"); if(!n){ n=document.createElement("div"); n.className="bl-note"; n.setAttribute("role","status"); document.body.appendChild(n); }
    n.innerHTML=html; requestAnimationFrame(()=>n.classList.add("on")); clearTimeout(noteT); noteT=setTimeout(()=>n.classList.remove("on"),3200); }
  const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));

  // Les destinations possibles pour ce tool : [kind, id] pour chaque résultat offert.
  const getter=o=>typeof o==="function" ? o : o.get;
  function targets(){ const out=[]; for(const [kind,o] of Object.entries(self.offers||{})){ const only=typeof o==="object" && o.to;
    for(const [id,t] of Object.entries(CATALOG)) if(id!==self.id && t.accepts.includes(kind) && (!only || only.includes(id))) out.push([kind,id]); } return out; }

  // Deux couleurs lisibles ensemble, tirées d'une palette : la base en encre, la plus contrastée en fond
  // (contraste WCAG) ; si rien ne contraste assez, un fond crème ou nuit selon la base.
  function lum(hex){ const n=parseInt(hex.slice(1),16), ch=v=>{ v/=255; return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4); };
    return 0.2126*ch(n>>16&255)+0.7152*ch(n>>8&255)+0.0722*ch(n&255); }
  const contrast=(a,b)=>{ const x=lum(a), y=lum(b); return (Math.max(x,y)+0.05)/(Math.min(x,y)+0.05); };
  function pair(d){ const ok=c=>/^#[0-9a-f]{6}$/i.test(c||""), cs=(d.colors||[]).filter(ok).map(c=>c.toLowerCase());
    const ink=ok(d.base)?d.base.toLowerCase():(cs[0]||"#17150f"); let paper=null, best=0;
    for(const c of cs){ const k=contrast(ink,c); if(c!==ink && k>best){ best=k; paper=c; } }
    if(!paper || best<3) paper=lum(ink)>0.35 ? "#17150f" : "#f1efe9";
    return { ink, paper }; }

  async function send(kind,to,btn){
    if(btn) btn.disabled=true;
    try{
      const data=await getter(self.offers[kind])();
      if(!data){ note("Rien à envoyer pour l'instant."); return; }
      try{ localStorage.setItem(KEY,JSON.stringify({ v:1, kind, from:self.id, to, at:Date.now(), data })); }
      catch(_){ note("Envoi impossible : ton navigateur bloque le stockage local (navigation privée ?)."); return; }
      go(urlOf(to));
    } catch(_){ note("L'envoi a échoué — réessaie."); }
    finally{ if(btn) btn.disabled=false; }
  }
  function take(){
    let h=null; try{ h=JSON.parse(localStorage.getItem(KEY)||"null"); }catch(_){ return; }
    if(!h || h.v!==1 || h.to!==self.id) return;
    try{ localStorage.removeItem(KEY); }catch(_){}
    if(Date.now()-h.at>TTL || !self.accepts || !self.accepts[h.kind]) return;
    try{ self.accepts[h.kind](h.data,h); note(`${GOT[h.kind]||"Reçu"} depuis <b>${esc((CATALOG[h.from]||{}).label||h.from)}</b>`); }
    catch(_){ note("Le contenu reçu n'a pas pu être chargé."); }
  }
  function row(){
    const list=targets(); if(!list.length || !self.anchor) return;
    style();
    const r=document.createElement("div"); r.className="bl-row"; r.innerHTML=`<span class="bl-k">Continuer avec</span>`;
    for(const [kind,id] of list){ const b=document.createElement("button"); b.type="button"; b.className="bl-go";
      b.textContent=CATALOG[id].label+" →"; b.title=`Envoyer ${SENT[kind]} vers ${CATALOG[id].label}`+(WHY[kind+">"+id]?` — ${WHY[kind+">"+id]}`:"");
      b.onclick=()=>send(kind,id,b); r.appendChild(b); }
    self.anchor.after(r);
  }
  function init(o){ self=o; take(); row(); }
  return { init, send, urlOf, pair, catalog:()=>CATALOG };
})();
/* ═══ fin BAAM-LINK v1 ═══ */
