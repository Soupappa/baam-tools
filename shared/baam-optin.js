/* ═══ BAAM-OPTIN v1 ══════════════════════════════════════════════════════════
   Bloc partagé par tous les BAAM Tools. Source canonique : shared/baam-optin.js.
   Une copie IDENTIQUE est injectée dans chaque tool (shared/inject-optin.js) ;
   à servir un jour comme fichier commun côté portail.

   Principe : l'outil reste gratuit, sans compte. Un BONUS se débloque contre un
   e-mail, proposé APRÈS l'usage (carte discrète), jamais avant. Un CTA mène vers
   l'univers BAAM concerné (studio.baam.pro, agence.baam.pro…).

   Leads — rien n'est envoyé tant qu'aucune destination n'est configurée :
     window.BAAM_LEADS = { endpoint:"https://…", privacyUrl:"https://…" }   // POST JSON
     window.BAAM_LEADS = { netlifyForm:"bonus", privacyUrl:"https://…" }    // Netlify Forms
   Lu dans la page OU dans la page parente (tool encadré en iframe).
   Corps envoyé : { email, newsletter, tool, bonus, page, at }.
   Le bonus se débloque même si l'envoi échoue. Un déblocage vaut pour tous les tools.
═══════════════════════════════════════════════════════════════════════════════ */
const BaamOptin=(()=>{
  const KEY="baam.tools.bonus-unlocked";
  let o=null, session=false, dismissed=false, busy=false;
  const el={};
  const conf=()=>{ let p={}; try{ if(window.parent && window.parent!==window && window.parent.BAAM_LEADS) p=window.parent.BAAM_LEADS; }catch(_){}
    return Object.assign({ endpoint:null, netlifyForm:null, privacyUrl:"https://tools.baam.pro/confidentialite/" }, p, window.BAAM_LEADS||{}); };
  const unlocked=()=>{ if(session) return true; try{ return localStorage.getItem(KEY)==="1"; }catch(_){ return false; } };
  const mk=(tag,cls,html)=>{ const e=document.createElement(tag); if(cls) e.className=cls; if(html!=null) e.innerHTML=html; return e; };
  const UI='system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif';
  const INK='var(--ink,#17150f)', LINE='var(--line,#ddd8cd)', MUTED='var(--muted,#8a867c)', ACC='var(--accent,#00a847)', MONO='var(--mono,ui-monospace,SFMono-Regular,Menlo,Consolas,monospace)';
  const CSS=`
.bo-card,.bo-modal,.bo-studio{--bo-ui:${UI};}
.bo-card[hidden],.bo-modal[hidden],.bo-gate[hidden],.bo-bonus[hidden],.bo-host[hidden],.bo-progress[hidden],.bo-done[hidden]{display:none!important;}
.bo-card{display:flex;gap:14px;align-items:flex-start;background:#fff;border:1px solid ${LINE};border-left:3px solid ${ACC};border-radius:10px;padding:12px 14px;margin:8px auto 0;max-width:760px;font-family:${MONO};color:${INK};animation:bo-rise .25s ease;box-sizing:border-box;}
@keyframes bo-rise{from{opacity:0;transform:translateY(6px);}to{opacity:1;transform:none;}}
.bo-body p{margin:0;font-family:var(--bo-ui);font-size:13.5px;line-height:1.45;}
.bo-ok{color:${ACC};font-weight:700;}
.bo-row{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px;align-items:center;}
.bo-btn{font-family:${MONO};font-size:11px;text-transform:uppercase;letter-spacing:.05em;background:#fff;color:${INK};border:1px solid ${LINE};border-radius:7px;padding:8px 12px;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center;gap:6px;line-height:1.2;}
.bo-btn:hover{border-color:${MUTED};}
.bo-btn.on{border-color:${ACC};color:${ACC};}
.bo-primary{background:${INK};color:#fff;border-color:${INK};}
.bo-primary:hover{background:${ACC};border-color:${ACC};color:#fff;}
.bo-btn:disabled{opacity:.45;cursor:default;}
.bo-x{margin-left:auto;border:none;background:none;font-size:19px;color:${MUTED};cursor:pointer;line-height:1;padding:0 4px;}
.bo-studio{text-align:center;font-family:var(--bo-ui);font-size:13px;color:${MUTED};margin:12px 0 18px;}
.bo-studio a{color:${INK};font-weight:600;text-decoration:none;border-bottom:1.5px solid ${ACC};}
.bo-studio a:hover{color:${ACC};}
.bo-modal{position:fixed;inset:0;background:rgba(23,21,15,.42);display:flex;align-items:center;justify-content:center;padding:16px;z-index:1000;}
.bo-dialog{background:#fff;border-radius:14px;width:min(580px,100%);max-height:92vh;overflow:auto;padding:20px 22px;box-shadow:0 24px 60px -20px rgba(0,0,0,.45);font-family:${MONO};font-size:13px;color:${INK};box-sizing:border-box;}
.bo-dialog h2{font-family:var(--bo-ui);font-size:20px;margin:0 0 6px;letter-spacing:-.01em;}
.bo-lead{font-family:var(--bo-ui);font-size:14px;color:#4a473f;margin:0 0 14px;line-height:1.45;}
.bo-f{display:block;font-size:10px;text-transform:uppercase;letter-spacing:.1em;color:${MUTED};margin:14px 0 6px;}
.bo-f b{color:${INK};}
.bo-dialog input[type=email],.bo-dialog input[type=text]{width:100%;box-sizing:border-box;font-family:var(--bo-ui);font-size:15px;border:1px solid ${LINE};border-radius:8px;padding:10px 12px;outline:none;}
.bo-dialog input[type=email]:focus,.bo-dialog input[type=text]:focus{border-color:${ACC};}
.bo-err{color:#c62828;font-family:var(--bo-ui);font-size:12.5px;margin-top:6px;min-height:1em;}
.bo-choice{border:0;padding:0;margin:16px 0 0;min-width:0;}
.bo-choice legend{font-family:${MONO};font-size:10px;text-transform:uppercase;letter-spacing:.1em;color:${MUTED};padding:0;margin:0 0 7px;}
.bo-choice-card{display:flex;gap:10px;align-items:flex-start;border:1px solid ${LINE};border-radius:9px;padding:11px 12px;margin-top:7px;cursor:pointer;font-family:var(--bo-ui);line-height:1.35;transition:border-color .16s,background .16s,transform .16s;}
.bo-choice-card:hover{border-color:${MUTED};transform:translateY(-1px);}
.bo-choice-card:has(input:checked){border-color:${ACC};background:color-mix(in srgb,${ACC} 7%,#fff);}
.bo-choice-card input{margin:3px 0 0;accent-color:${ACC};flex:0 0 auto;}
.bo-choice-card span{display:flex;flex-direction:column;gap:3px;}
.bo-choice-card b{font-size:13.5px;color:${INK};}
.bo-choice-card small{font-size:11.5px;color:${MUTED};}
.bo-choice-yes{border-left:3px solid ${ACC};}
.bo-choice-badge{display:inline-flex!important;width:max-content;font-family:${MONO};font-size:9px!important;text-transform:uppercase;letter-spacing:.08em;color:${ACC}!important;}
.bo-legal{font-family:var(--bo-ui);font-size:11.5px;color:${MUTED};margin:12px 0 0;line-height:1.5;}
.bo-legal a{color:inherit;}
.bo-chips{display:flex;gap:6px;flex-wrap:wrap;align-items:center;}
.bo-range{width:100%;accent-color:${ACC};}
.bo-progress{height:6px;background:${LINE};border-radius:3px;overflow:hidden;margin-top:14px;}
.bo-progress i{display:block;height:100%;width:0;background:${ACC};transition:width .15s linear;}
.bo-host{margin-top:12px;border-radius:10px;overflow:hidden;border:1px solid ${LINE};background:#f6f4ef;display:flex;justify-content:center;}
.bo-host canvas{max-width:100%;max-height:260px;display:block;}
.bo-done{font-family:var(--bo-ui);font-size:14px;margin-top:12px;line-height:1.5;}
.bo-done b{color:${ACC};}
.bo-done a{color:${INK};}
.bo-code{width:100%;box-sizing:border-box;min-height:200px;font-family:${MONO};font-size:12px;line-height:1.5;border:1px solid ${LINE};border-radius:8px;padding:10px 12px;background:#fbfaf7;resize:vertical;outline:none;color:${INK};}
.bo-note{font-family:var(--bo-ui);font-size:12px;color:${MUTED};margin:8px 0 0;line-height:1.45;}
`;
  const api={ close:()=>close(), setBusy:v=>{ busy=!!v; }, studioUrl:()=>o.studio.url, studioPitch:()=>o.studio.pitch||o.studio.label };

  function init(opts){
    o=opts;
    const st=mk("style"); st.textContent=CSS; document.head.appendChild(st);
    el.card=mk("div","bo-card"); el.card.hidden=true;
    el.card.innerHTML=`<div class="bo-body"><p><span class="bo-ok">✓ ${o.okLabel||"C'est prêt."}</span> <span class="bo-txt"></span></p>`+
      `<div class="bo-row"><button type="button" class="bo-btn bo-primary bo-get">${o.getLabel}</button>`+
      `<a class="bo-btn" target="_blank" rel="noopener" href="${o.studio.url}">${o.studio.cardLabel}</a></div></div>`+
      `<button type="button" class="bo-x" aria-label="Fermer">×</button>`;
    o.anchor.after(el.card);
    el.studio=mk("p","bo-studio",`${o.studio.line} <a target="_blank" rel="noopener" href="${o.studio.url}">${o.studio.label}</a>`);
    (o.studioAnchor||el.card).after(el.studio);
    el.card.querySelector(".bo-get").onclick=open;
    el.card.querySelector(".bo-x").onclick=()=>{ el.card.hidden=true; dismissed=true; };
    el.modal=mk("div","bo-modal"); el.modal.hidden=true;
    el.modal.innerHTML=`<div class="bo-dialog" role="dialog" aria-modal="true" aria-label="${o.bonusTitle}">`+
      `<section class="bo-gate"><h2>${o.bonusTitle}</h2><p class="bo-lead">${o.bonusPitch}</p>`+
      `<form novalidate><label class="bo-f" for="bo-email">Ton e-mail</label>`+
      `<input type="email" id="bo-email" autocomplete="email" placeholder="toi@exemple.com" required><div class="bo-err"></div>`+
      `<fieldset class="bo-choice"><legend>Et pour la suite ?</legend>`+
      `<label class="bo-choice-card bo-choice-yes"><input type="radio" name="bo-news-choice" value="yes"> <span><i class="bo-choice-badge">Le meilleur de BAAM</i><b>Oui — je veux les nouveaux tools, guides et bonus</b><small>Avant-premières · 1 à 2 e-mails par mois · désinscription en un clic</small></span></label>`+
      `<label class="bo-choice-card"><input type="radio" name="bo-news-choice" value="no"> <span><b>Non — je veux seulement ce bonus</b><small>Aucun e-mail éditorial ne sera envoyé</small></span></label></fieldset>`+
      `<div class="bo-err bo-choice-err"></div>`+
      `<p class="bo-legal">Ton e-mail débloque les bonus BAAM Tools sur cet appareil. Ton choix newsletter est enregistré séparément. <a class="bo-priv" target="_blank" rel="noopener">Confidentialité</a></p>`+
      `<div class="bo-row"><button type="submit" class="bo-btn bo-primary bo-submit">${o.unlockLabel}</button><button type="button" class="bo-btn bo-close">Annuler</button></div></form></section>`+
      `<section class="bo-bonus" hidden></section></div>`;
    document.body.appendChild(el.modal);
    el.modal.addEventListener("click",e=>{ if(e.target===el.modal || e.target.closest(".bo-close")) close(); });
    window.addEventListener("keydown",e=>{ if(e.key==="Escape" && !el.modal.hidden) close(); });
    el.modal.querySelector("form").addEventListener("submit",submit);
  }
  function after(){ if(dismissed || !o) return; el.card.querySelector(".bo-txt").textContent = unlocked() ? (o.doneUnlocked||"") : (o.doneLocked||""); el.card.hidden=false; }
  function open(){
    el.modal.querySelector(".bo-priv").href=conf().privacyUrl;
    el.modal.hidden=false;
    const u=unlocked(); el.modal.querySelector(".bo-gate").hidden=u; el.modal.querySelector(".bo-bonus").hidden=!u;
    if(u) renderBonus(); else setTimeout(()=>{ const i=el.modal.querySelector("#bo-email"); if(i) i.focus(); },30);
  }
  function renderBonus(){ const b=el.modal.querySelector(".bo-bonus"); b.innerHTML=""; o.renderBonus(b,api); }
  function close(){ if(busy) return; el.modal.hidden=true; }
  async function submit(e){
    e.preventDefault();
    const f=e.target, input=f.querySelector("#bo-email"), email=input.value.trim(), err=f.querySelector(".bo-err"), choiceErr=f.querySelector(".bo-choice-err"), choice=f.querySelector('input[name="bo-news-choice"]:checked'), btn=f.querySelector(".bo-submit");
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)){ err.textContent="Cette adresse ne semble pas valide."; input.focus(); return; }
    err.textContent="";
    if(!choice){ choiceErr.textContent="Choisis l'une des deux options pour continuer."; f.querySelector('input[name="bo-news-choice"]').focus(); return; }
    choiceErr.textContent=""; btn.disabled=true; const label=btn.textContent; btn.textContent="Un instant…";
    await send(email, choice.value==="yes");
    session=true; try{ localStorage.setItem(KEY,"1"); }catch(_){}
    btn.disabled=false; btn.textContent=label;
    el.modal.querySelector(".bo-gate").hidden=true; el.modal.querySelector(".bo-bonus").hidden=false; renderBonus();
  }
  async function send(email,newsletter){
    const c=conf(), body={ email, newsletter, tool:o.tool, bonus:o.bonusId, page:location.href.split("#")[0], at:new Date().toISOString() };
    try{
      if(c.endpoint){ await fetch(c.endpoint,{ method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(body) }); return true; }
      if(c.netlifyForm){ await fetch("/",{ method:"POST", headers:{"Content-Type":"application/x-www-form-urlencoded"},
        body:new URLSearchParams({ "form-name":c.netlifyForm, "bot-field":"", email, newsletter:newsletter?"oui":"non", tool:o.tool, bonus:o.bonusId, page:body.page }).toString() }); return true; }
      console.info("[BAAM Tools] Aucune destination de leads configurée — e-mail non envoyé.", body); return false;
    }catch(_){ return false; }
  }
  return { init, after, open, unlocked, api };
})();

/* Vidéo : rendu image par image d'un SVG fourni par le tool, enregistré en MP4
   (ou WebM selon le navigateur). Le temps de l'animation suit l'horloge réelle,
   donc la vitesse est juste quelle que soit la cadence obtenue. */
const BaamVideo=(()=>{
  const FORMATS=[["1080x1080","Carré 1080"],["1920x1080","Paysage 1920×1080"],["1080x1350","Portrait 1080×1350"]];
  const BGS=[["#ffffff","blanc"],["#f1efe9","crème"],["#17150f","noir"]];
  function mime(){ for(const m of ["video/mp4;codecs=avc1.42E01E","video/mp4;codecs=avc1","video/mp4","video/webm;codecs=vp9","video/webm;codecs=vp8","video/webm"]){
    try{ if(window.MediaRecorder && MediaRecorder.isTypeSupported(m)) return m; }catch(_){} } return null; }
  function download(blob,name){ const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download=name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(a.href),3000); }
  async function record(v, svgAt, onProgress, host){
    const m=mime(); if(!m) throw new Error("unsupported");
    const w=v.w, h=v.h, k=Math.min(w*v.scale/v.box.w, h*v.scale/v.box.h);
    const dw=Math.round(v.view.w*k), dh=Math.round(v.view.h*k), dx=Math.round((w-dw)/2), dy=Math.round((h-dh)/2);
    const c=document.createElement("canvas"); c.width=w; c.height=h; if(host){ host.innerHTML=""; host.appendChild(c); host.hidden=false; }
    const ctx=c.getContext("2d");
    const rec=new MediaRecorder(c.captureStream(30),{ mimeType:m, videoBitsPerSecond:Math.round(Math.min(16e6,w*h*6)) });
    const chunks=[]; rec.ondataavailable=e=>{ if(e.data && e.data.size) chunks.push(e.data); };
    const stopped=new Promise(r=>rec.onstop=r);
    const drawAt=async t=>{ const url=URL.createObjectURL(new Blob([svgAt(t,dw,dh)],{type:"image/svg+xml"})), img=new Image();
      try{ await new Promise((ok,ko)=>{ img.onload=ok; img.onerror=ko; img.src=url; }); ctx.fillStyle=v.bg; ctx.fillRect(0,0,w,h); ctx.drawImage(img,dx,dy,dw,dh); }
      finally{ URL.revokeObjectURL(url); } };
    await drawAt(0); rec.start(250);
    const start=performance.now();
    for(;;){ const t=(performance.now()-start)/1000; if(t>=v.seconds) break; await drawAt(t); if(onProgress) onProgress(t/v.seconds); }
    if(onProgress) onProgress(1); rec.stop(); await stopped;
    return { blob:new Blob(chunks,{type:m.split(";")[0]}), ext:m.includes("mp4")?"mp4":"webm" };
  }
  // Panneau complet dans la fenêtre bonus. cfg : { subject, view(), box(), svgAt(t,dw,dh,prep), prepare(), fileBase(), bg }
  function panel(host, api, cfg){
    const v={ w:1080, h:1080, bg:cfg.bg||"#ffffff", seconds:6, scale:cfg.scale||0.62 };
    host.innerHTML=`<h2>Ta vidéo</h2><p class="bo-lead">Elle reprend exactement l'animation de l'aperçu.</p>`+
      `<label class="bo-f">Format</label><div class="bo-chips bo-fmt"></div>`+
      `<label class="bo-f">Fond</label><div class="bo-chips bo-bg"></div>`+
      `<label class="bo-f">Durée</label><div class="bo-chips bo-dur"></div>`+
      `<label class="bo-f">Taille ${cfg.subject||"du sujet"} <b class="bo-sv"></b></label><input type="range" class="bo-range" min="0.35" max="0.95" step="0.01">`+
      `<div class="bo-host" hidden></div><div class="bo-progress" hidden><i></i></div><div class="bo-done" hidden></div>`+
      `<div class="bo-row"><button type="button" class="bo-btn bo-primary bo-go">Générer la vidéo</button><button type="button" class="bo-btn bo-close">Fermer</button></div>`;
    const q=s=>host.querySelector(s);
    const chips=(sel,items,isOn,set)=>{ const box=q(sel); box.innerHTML="";
      items.forEach(([val,label])=>{ const b=document.createElement("button"); b.type="button"; b.className="bo-btn"+(isOn(val)?" on":""); b.innerHTML=label; b.onclick=()=>{ set(val); draw(); }; box.appendChild(b); });
      return box; };
    function draw(){
      chips(".bo-fmt",FORMATS,f=>f===`${v.w}x${v.h}`,f=>{ const p=f.split("x").map(Number); v.w=p[0]; v.h=p[1]; });
      const bg=chips(".bo-bg",BGS.map(([c,n])=>[c,`<span style="width:12px;height:12px;border-radius:3px;border:1px solid #ccc;background:${c};display:inline-block"></span>${n}`]),c=>c===v.bg,c=>{ v.bg=c; });
      const p=document.createElement("input"); p.type="color"; p.value=v.bg; p.title="Fond personnalisé";
      p.style.cssText="width:34px;height:28px;padding:0;border:1px solid #ddd8cd;border-radius:6px;cursor:pointer;background:#fff";
      p.oninput=()=>{ v.bg=p.value; }; p.onchange=draw; bg.appendChild(p);
      chips(".bo-dur",[[4,"4 s"],[6,"6 s"],[10,"10 s"]],d=>d===v.seconds,d=>{ v.seconds=d; });
      q(".bo-range").value=v.scale; q(".bo-sv").textContent=Math.round(v.scale*100)+" %";
    }
    draw();
    q(".bo-range").addEventListener("input",e=>{ v.scale=parseFloat(e.target.value); q(".bo-sv").textContent=Math.round(v.scale*100)+" %"; });
    q(".bo-go").onclick=async()=>{
      const done=q(".bo-done"), go=q(".bo-go");
      if(!mime()){ done.hidden=false; done.textContent="Ton navigateur ne sait pas enregistrer de vidéo. Essaie Chrome, Edge ou Firefox — l'export SVG reste disponible."; return; }
      api.setBusy(true); go.disabled=true; go.textContent="Enregistrement…"; done.hidden=true;
      const prog=q(".bo-progress"), bar=prog.querySelector("i"); prog.hidden=false; bar.style.width="0%";
      try{
        const prep=cfg.prepare ? await cfg.prepare() : null;
        const res=await record({ ...v, view:cfg.view(), box:cfg.box() }, (t,dw,dh)=>cfg.svgAt(t,dw,dh,prep), p=>{ bar.style.width=Math.round(p*100)+"%"; }, q(".bo-host"));
        download(res.blob,`${cfg.fileBase()}-baam-${v.w}x${v.h}.${res.ext}`);
        done.hidden=false;
        done.innerHTML=`<b>✓ Vidéo prête</b> (${res.ext.toUpperCase()}, ${v.w}×${v.h}, ${v.seconds} s).`+
          (res.ext==="webm" ? " Ton navigateur l'a encodée en WebM : la plupart des réseaux l'acceptent, sinon un convertisseur la passe en MP4." : "")+
          `<br>Envie d'aller plus loin ? <a href="${api.studioUrl()}" target="_blank" rel="noopener">${api.studioPitch()}</a>`;
      }catch(_){ done.hidden=false; done.textContent="L'enregistrement a échoué — réessaie, ou utilise l'export SVG."; }
      finally{ api.setBusy(false); go.disabled=false; go.textContent="Générer à nouveau"; }
    };
  }
  return { mime, record, panel, download };
})();
/* ═══ fin BAAM-OPTIN v1 ═══ */
