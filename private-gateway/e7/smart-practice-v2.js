/* Diversity-balanced loader for the adaptive English practice layer. */
(async()=>{
  'use strict';
  if(window.__englishSmartPractice)return;
  const BASE='https://raw.githack.com/h675786161-prog/home/3785b1f7de48df5b020739a19d636bb66bf0eff6/private-gateway/e7/smart-practice.js';
  try{
    const response=await fetch(BASE,{cache:'no-store'});
    if(!response.ok)throw new Error('smart practice '+response.status);
    let source=await response.text();
    const from=`  function score(w){
    const r=smart().items[keyFor(w)]||{};
    let value=(Number(r.wrong)||0)*7-(Number(r.correct)||0)*1.5;
    if(progress().review[w.id])value+=10;
    if(r.nextAt&&r.nextAt<=now())value+=12;
    if(!progress().learned[w.id])value+=2;
    value+=Math.random()*3;
    return value;
  }
  function pickWeighted(list=bank(),exclude=''){
    const pool=list.filter(w=>w?.id&&w.id!==exclude);
    if(!pool.length)return list[0]||null;
    const sorted=[...pool].sort((a,b)=>score(b)-score(a));
    const top=sorted.slice(0,Math.max(3,Math.ceil(sorted.length*.35)));
    return top[Math.floor(Math.random()*top.length)]||sorted[0];
  }`;
    const to=`  let smartRecent=[];
  function score(w){
    const r=smart().items[keyFor(w)]||{};
    const p=progress();
    let value=(Number(r.wrong)||0)*4-(Number(r.correct)||0)*.8;
    if(!r.last)value+=11;
    if(p.review[w.id])value+=7;
    if(r.nextAt&&r.nextAt<=now())value+=8;
    if(!p.learned[w.id])value+=4;
    if(r.last)value+=Math.min(6,Math.max(0,(now()-r.last)/(6*60*60e3)));
    value+=Math.random()*4;
    return value;
  }
  function pickWeighted(list=bank(),exclude=''){
    const pool=list.filter(w=>w?.id&&w.id!==exclude);
    if(!pool.length)return list[0]||null;
    const recentLimit=Math.min(8,Math.max(3,Math.floor(list.length*.28)));
    const fresh=pool.filter(w=>!smartRecent.includes(w.id));
    const candidates=fresh.length>=Math.min(3,pool.length)?fresh:pool;
    const sorted=[...candidates].sort((a,b)=>score(b)-score(a));
    const top=sorted.slice(0,Math.max(5,Math.ceil(sorted.length*.65)));
    const chosen=top[Math.floor(Math.random()*top.length)]||sorted[0];
    if(chosen?.id){smartRecent.push(chosen.id);smartRecent=smartRecent.slice(-recentLimit);}
    return chosen;
  }`;
    if(!source.includes(from))throw new Error('adaptive selector patch point missing');
    source=source.replace(from,to);
    eval(source);
  }catch(error){
    console.error('[english smart practice]',error);
  }
})();
