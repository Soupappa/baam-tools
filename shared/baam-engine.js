/* ═══ BAAM-ENGINE v1 ══════════════════════════════════════════════════════════
   Moteur BAAM partagé par les tools animés. Source canonique : shared/baam-engine.js.
   Une copie IDENTIQUE est injectée dans chaque tool (node shared/inject.js) ;
   ne pas modifier une copie : modifier la source puis relancer le script.
   Chaîne : 4 axes macro → 10 paramètres BAAM → R = B + SPAN·(M·U) → runtime (8)
   → image à l'instant t (frame) → filtre SVG (feTurbulence / feDisplacementMap / flou).
   Tout est pur et déterministe, sans IA ni DOM (sauf baamApplier, qui pose une image sur le DOM).
══════════════════════════════════════════════════════════════════════════════ */
// Ordres vectoriels de référence (NE JAMAIS changer).
const BAAM_ORDER=["alive","tension","flow","grain","clarity","impulse","persistence","spread","jitter","hysteresis"];
const RT_ORDER=["noiseFrequency","noiseDetail","displacementPeak","cycleDuration","displacementFloor","temporalVariation","effectExtent","returnBias"];
// Sensibilité de chaque param runtime : les poids matriciels [-1..1] y sont multipliés.
const SPAN=[0.25,3,46,6,22,220,0.5,0.45];
const MACRO_ORDER=["energy","constraint","continuity","texture"];
const MACRO_LABEL={energy:"Énergie",constraint:"Contrainte",continuity:"Continuité",texture:"Texture"};
// 4 axes → 10 BAAM, en déviation signée : macro à 0.5 partout ⇒ BAAM à 0.5 partout (neutralité).
const PROJECTION={ alive:[0.7,0,0.2,0.1], tension:[0.2,0.8,0,0], flow:[0,-0.3,0.7,0], grain:[0.2,0,0,0.8], clarity:[0,0.3,0.2,-0.5],
  impulse:[0.7,0,0,0.2], persistence:[0,0.3,0.5,0], spread:[0.4,0,0.3,0.2], jitter:[0.3,0.2,0,0.6], hysteresis:[0,0.4,0.5,0] };
const clamp=(v,a,b)=> v<a?a : v>b?b : v, clamp01=v=>clamp(v,0,1);
function macroToBaam(m){ const ms=MACRO_ORDER.map(k=>2*m[k]-1), b={}; for(const p of BAAM_ORDER){ const w=PROJECTION[p]; let s=0; for(let i=0;i<4;i++) s+=w[i]*ms[i]; b[p]=clamp01(0.5+0.5*s); } return b; }
// Matrice générique 10×8 (lignes = BAAM_ORDER, colonnes = RT_ORDER), mise à l'échelle par les opérateurs doux.
const G=[[0.05,0,0.10,0.10,0.30,0.25,0,0],[0.05,0.10,0.70,-0.20,0.05,0.10,0,0.10],[-0.10,-0.20,0,0.60,0.05,-0.10,0.10,0],[0.60,0.50,0.10,-0.10,0,0.10,0,0],
  [-0.20,-0.40,-0.50,0.10,0,-0.20,0,-0.05],[0.05,0,0.60,-0.50,-0.10,0.30,0,0.15],[-0.05,0,0.10,0.50,0.40,-0.05,0.05,0.20],[0,0,0.10,0,0.05,0,0.90,0],[0.40,0.20,0.15,-0.30,0,0.70,0,0.10],[0,0,0.05,0.20,0.30,-0.10,0,0.85]];
const scaleM=(m,k)=>m.map(r=>r.map(v=>v*k));
// Matrice officielle de « fulguration » (SPECS_OPERATEUR_BAAM.md §11).
const M_FULGURATION=[[0.20,0.10,0.10,-0.20,0,0.90,0,0.10],[0.10,0,0.95,-0.10,0.10,0.10,0,0.20],[-0.10,0,0.10,0.80,0,-0.10,0.10,0],[0.95,0.40,0.10,-0.10,0,0.20,0,0],
  [-0.30,-0.80,-0.35,0.10,0,-0.20,0,-0.10],[0,0,0.80,-0.75,-0.20,0.20,0,0.20],[-0.10,0,0.10,0.45,0.85,0.10,0.10,0.20],[0,0,0.10,0,0,0,1,0],[0.80,0.20,0.15,-0.85,0,0.95,0,0.15],[0,0,0.10,0.10,0.30,0,0,0.95]];
const TWO_PI=Math.PI*2;
// Angle d'un mouvement : libre (D absent) ou calé sur une boucle de D secondes (nombre entier de tours).
const ang=(om,t,D)=> D ? TWO_PI*Math.max(1,Math.round(om*D/TWO_PI))*t/D : om*t;
const lt=(t,D)=> D ? ((t%D)+D)%D : t;
// Opérateurs : base (runtime neutre) + matrice + frame(rt,t,D) → l'image à l'instant t.
// D (secondes) cale tous les mouvements sur une boucle parfaite (vidéo) ; sans D, mouvement libre (aperçu).
const OPERATORS={
  souffle:{ label:"Souffle", sub:"flotte — de la brise à la tempête", base:[0.010,1,24,5.0,6,20,0.5,0.50], matrix:scaleM(G,0.8),
    // Grandes ondes (1 octave, basse fréquence) : ça déforme sans plier ; translation et cisaillement lents : ça flotte.
    frame(rt,t,D){ const cyc=Math.max(rt.cycleDuration,2.2), br=0.45+0.55*Math.sin(ang(TWO_PI/cyc,t,D)), A=rt.displacementPeak*0.75;
      return { oct:1, bf:(0.006+0.012*clamp01(rt.noiseFrequency/0.1)).toFixed(4), scale:rt.displacementFloor+(rt.displacementPeak-rt.displacementFloor)*br, blur:0,
        transform:`translate(${(A*Math.sin(ang(0.5,t,D))).toFixed(1)} ${(A*0.5*Math.sin(ang(0.37,t,D)+1.3)).toFixed(1)}) skewX(${(2.4*Math.sin(ang(0.43,t,D))).toFixed(2)})`, seed:Math.floor(lt(t,D)*0.9) }; } },
  mirage:{ label:"Mirage", sub:"la matière se brouille, des ondes la déforment", base:[0.050,2,30,2.4,10,170,0.6,0.50], matrix:scaleM(G,1.0),
    // Déformation interne : des ondes qui dérivent gonflent la matière, un flou respirant la brouille.
    frame(rt,t,D){ const b=rt.noiseFrequency;
      return { oct:Math.max(2,rt.noiseDetail), bf:`${(b*(1.1+0.25*Math.sin(ang(0.5,t,D)))).toFixed(4)} ${(b*(0.8+0.25*Math.cos(ang(0.4,t,D)))).toFixed(4)}`,
        scale:rt.displacementFloor+(rt.displacementPeak-rt.displacementFloor)*(0.55+0.45*Math.sin(ang(1.3,t,D))), blur:0.6+1.4*(0.5+0.5*Math.sin(ang(1.1,t,D))), transform:null,
        seed:Math.floor(lt(t,D)*rt.temporalVariation*0.0137) }; } },
  fulguration:{ label:"Fulguration", sub:"matière fulgurée, puis détente", base:[0.08,4,48,1.2,1,150,0.6,0.22], matrix:M_FULGURATION,
    // Calme, frappe sèche (8 % du cycle) avec crépitement, puis détente exponentielle (returnBias règle le relâchement).
    frame(rt,t,D){ let cyc=Math.max(rt.cycleDuration,0.6); if(D) cyc=D/Math.max(1,Math.round(D/cyc));
      const ph=(lt(t,D)%cyc)/cyc, spike=0.08; let env; if(ph<spike) env=ph/spike; else { const k=3+(1-rt.returnBias)*7; env=Math.exp(-((ph-spike)/(1-spike))*k); }
      const j=rt.displacementPeak*0.12;
      return { oct:Math.min(6,rt.noiseDetail+(env>0.4?2:0)), bf:(rt.noiseFrequency*(1+3.5*env)).toFixed(4), scale:rt.displacementFloor+(rt.displacementPeak-rt.displacementFloor)*env, blur:0,
        transform: env>0.6 ? `translate(${((Math.random()-0.5)*j).toFixed(1)} ${((Math.random()-0.5)*j).toFixed(1)})` : null, seed:Math.floor(lt(t,D)*rt.temporalVariation*0.012) }; } }
};
// Bornes runtime (SPECS §8.2).
function clampRuntime(raw){ const r={ noiseFrequency:clamp(raw[0],0.001,1.2), noiseDetail:Math.round(clamp(raw[1],1,6)), displacementPeak:clamp(raw[2],0,80),
  cycleDuration:clamp(raw[3],0.2,20), displacementFloor:clamp(raw[4],0,40), temporalVariation:clamp(raw[5],0,500), effectExtent:clamp(raw[6],0,1), returnBias:clamp(raw[7],0,1) };
  if(r.displacementFloor>r.displacementPeak) r.displacementFloor=r.displacementPeak; return r; }
// R = B + SPAN·(M × U_signed), U = les 10 BAAM recentrés en [-1..1].
function resolveRuntime(op,baam){ const U=BAAM_ORDER.map(k=>2*baam[k]-1), out=op.base.slice();
  for(let c=0;c<RT_ORDER.length;c++){ let d=0; for(let r=0;r<U.length;r++) d+=op.matrix[r][c]*U[r]; out[c]+=SPAN[c]*d; } return clampRuntime(out); }
// Marge de la région du filtre (en %), selon effectExtent.
const baamPad=R=>Math.round(25+R.effectExtent*75);
// Une image figée : les primitives du filtre pour l'image p = frame(rt,t,D). src = entrée du déplacement.
function baamFilterPrims(p,src){
  return `<feTurbulence type="fractalNoise" baseFrequency="${p.bf}" numOctaves="${p.oct}" seed="${p.seed}" result="noise"/>`+
    `<feDisplacementMap in="${src||"SourceGraphic"}" in2="noise" xChannelSelector="R" yChannelSelector="G" scale="${p.scale.toFixed(2)}" result="dsp"/>`+
    (p.blur>0?`<feGaussianBlur in="dsp" stdDeviation="${p.blur.toFixed(2)}"/>`:"");
}
// Durée de boucle naturelle de chaque opérateur (s) : sert quand un visuel doit boucler sans couture.
const BAAM_LOOP={ souffle:12, mirage:6, fulguration:6 };
// Le même opérateur joué par le navigateur, sans script (SMIL) : durées calées sur l'aperçu vivant.
// Avec D (s), chaque durée devient un diviseur exact de D, au centième près : l'animation entière
// boucle en D secondes (c'est ce que le convertisseur détecte pour un GIF ou des sprites sans saut).
// → { prims : primitives du filtre, move : animations à placer dans le groupe qui porte le sujet }.
function baamSmil(opId,R,src,D){
  const f=n=>Number(n).toFixed(2), lo=f(R.displacementFloor), hi=f(R.displacementPeak), seedMax=Math.max(1,Math.round(R.temporalVariation/12));
  const C=D?Math.round(D*100):0;
  const dur=d=>{ if(!C) return f(d); const want=Math.max(1,Math.round(D/d)); let n=1;
    for(let k=1;k<=C;k++) if(C%k===0 && Math.abs(k-want)<Math.abs(n-want)) n=k; return f(C/n/100); };
  let turbAttrs, turbKids="", dispAnim, blurEl="", move="";
  if(opId==="souffle"){
    const cyc=dur(Math.max(R.cycleDuration,2.2)), A=f(R.displacementPeak*0.75), Ah=f(R.displacementPeak*0.375);
    turbAttrs=`baseFrequency="${(0.006+0.012*clamp01(R.noiseFrequency/0.1)).toFixed(4)}" numOctaves="1" seed="1"`;
    dispAnim=`<animate attributeName="scale" values="${lo};${hi};${lo}" dur="${cyc}s" repeatCount="indefinite"/>`;
    move=`<animateTransform attributeName="transform" type="translate" additive="sum" values="-${A} -${Ah};${A} ${Ah};-${A} -${Ah}" dur="${dur(12.6)}s" calcMode="spline" keyTimes="0;0.5;1" keySplines="0.4 0 0.6 1;0.4 0 0.6 1" repeatCount="indefinite"/>`+
      `<animateTransform attributeName="transform" type="skewX" additive="sum" values="-2.4;2.4;-2.4" dur="${dur(14.6)}s" calcMode="spline" keyTimes="0;0.5;1" keySplines="0.4 0 0.6 1;0.4 0 0.6 1" repeatCount="indefinite"/>`;
  } else if(opId==="mirage"){
    turbAttrs=`baseFrequency="${(R.noiseFrequency*1.1).toFixed(4)} ${(R.noiseFrequency*0.8).toFixed(4)}" numOctaves="${Math.max(2,R.noiseDetail)}" seed="1"`;
    turbKids=R.temporalVariation>0?`<animate attributeName="seed" values="0;${seedMax}" dur="${dur(Math.max(R.cycleDuration,1))}s" repeatCount="indefinite"/>`:"";
    dispAnim=`<animate attributeName="scale" values="${lo};${hi};${lo}" dur="${dur(4.8)}s" repeatCount="indefinite"/>`;
    blurEl=`<feGaussianBlur in="dsp" stdDeviation="0.6"><animate attributeName="stdDeviation" values="0.6;2;0.6" dur="${dur(5.7)}s" repeatCount="indefinite"/></feGaussianBlur>`;
  } else {
    const bf=R.noiseFrequency.toFixed(4), bfHi=(R.noiseFrequency*4).toFixed(4), cyc=dur(Math.max(R.cycleDuration,0.6)), oct=Math.min(6,R.noiseDetail+1);
    turbAttrs=`baseFrequency="${bf}" numOctaves="${oct}" seed="1"`;
    turbKids=`<animate attributeName="baseFrequency" values="${bf};${bfHi};${bf}" keyTimes="0;0.08;1" dur="${cyc}s" repeatCount="indefinite"/>`+(R.temporalVariation>0?`<animate attributeName="seed" values="0;${seedMax}" dur="${cyc}s" repeatCount="indefinite"/>`:"");
    dispAnim=`<animate attributeName="scale" values="${lo};${hi};${lo}" keyTimes="0;0.08;1" dur="${cyc}s" calcMode="spline" keySplines="0.2 0 0 1;0.5 0 0.9 1" repeatCount="indefinite"/>`;
  }
  const prims=`<feTurbulence type="fractalNoise" ${turbAttrs} result="noise">${turbKids}</feTurbulence>`+
    `<feDisplacementMap in="${src||"SourceGraphic"}" in2="noise" xChannelSelector="R" yChannelSelector="G" scale="${lo}"${blurEl?' result="dsp"':""}>${dispAnim}</feDisplacementMap>${blurEl}`;
  return { prims, move };
}
// Pose une image sur le filtre vivant de l'aperçu. els = { turb, disp, blur, move } (move porte la transformation).
function baamApplier(els){
  let lastSeed=-1;
  return p=>{
    els.turb.setAttribute("numOctaves",p.oct); els.turb.setAttribute("baseFrequency",p.bf);
    els.disp.setAttribute("scale",p.scale.toFixed(2)); els.blur.setAttribute("stdDeviation",p.blur.toFixed(2));
    if(p.transform) els.move.setAttribute("transform",p.transform); else els.move.removeAttribute("transform");
    if(p.seed!==lastSeed){ els.turb.setAttribute("seed",p.seed); lastSeed=p.seed; }
  };
}
/* ═══ fin BAAM-ENGINE v1 ═══ */
