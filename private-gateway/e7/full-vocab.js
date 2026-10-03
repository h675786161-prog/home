/* Generated compatibility alias. */
/* Complete CEFR bank. Source: myself; home is a generated mirror. */
(()=>{
  'use strict';
  if(window.__englishFullVocabV3)return;
  const API='https://ibpffxzdjvgydnhmvmvc.supabase.co/functions/v1/english';
  const FILES={A1:'cefr_a1.json',A2:'cefr_a2.json',B1:'cefr_b1.json',B2:'cefr_b2.json',C1:'cefr_c1.json',C2:'cefr_c2.json'};
  const TARGETS={B1:['A1','A2','B1'],B2:['A1','A2','B1','B2'],C1:['A1','A2','B1','B2','C1'],C2:['A1','A2','B1','B2','C1','C2']};
  const EXPECTED={A1:1063,A2:1352,B1:2354,B2:2691,C1:1009,C2:972};
  const starter={},levels=new Map(),pendingLevels=new Map(),pendingTargets=new Map(),targets={};
  const diagnostic=window.__englishFullVocabV3={version:'3.2',state:'booting',levels:{},targets,refreshes:[],events:[]};
  const $=id=>document.getElementById(id),norm=v=>String(v||'').toLowerCase().replace(/[’‘]/g,"'").replace(/\s+/g,' ').trim();
  const current=()=>String($('certificateSelect')?.value||'C1').toUpperCase();
  const safe=v=>norm(v).replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,80)||'entry';
  function record(stage,target,detail){diagnostic.events.push({stage,target,detail,at:Date.now()});diagnostic.events=diagnostic.events.slice(-20);}
  try{for(const t of Object.keys(TARGETS)){if(!Array.isArray(CERT_VOCAB[t]))throw new Error('Missing base bank '+t);starter[t]=CERT_VOCAB[t].slice();targets[t]={state:'idle',count:starter[t].length};}}
  catch(error){diagnostic.state='no-base-bank';diagnostic.error=String(error.message||error);console.error('[english vocab]',error);return;}
  function snapshot(){return {...diagnostic,load:undefined,count:undefined,loaded:undefined,snapshot:undefined,selected:current(),counts:Object.fromEntries(Object.keys(TARGETS).map(t=>[t,CERT_VOCAB[t].length])),progress:Object.fromEntries(Object.keys(TARGETS).map(t=>{const p=state.certificates?.[t]||{};return [t,{learned:Object.keys(p.learned||{}).length,review:Object.keys(p.review||{}).length,writes:p.writes||0,attempts:p.attempts?.length||0}];})),ui:{view:window.certificateUI?.currentView?.(),pool:document.querySelector('.vocabPoolCount')?.textContent||'',hero:$('certFocus')?.textContent||''}};}
  function publish(){
    const t=current(),s=targets[t];diagnostic.state=s?.state||'idle';diagnostic.lastCount=CERT_VOCAB[t]?.length||0;
    const row=document.querySelector('.vocabFilterRow');
    if(row){let b=$('fullVocabStatus');if(!b){b=document.createElement('button');b.id='fullVocabStatus';b.type='button';b.style.cssText='border:0;background:transparent;padding:4px 0;color:#756b80;font:inherit;font-size:12px;cursor:pointer';b.onclick=()=>load(current(),true);row.append(b);}
      const text=s?.state==='ready'?'📚 完整词库 '+s.count.toLocaleString()+' 条':s?.state==='error'?'⚠ 完整词库加载失败 · 点我重试':'📥 正在补全 '+t+' 词库…';
      if(b.textContent!==text)b.textContent=text;b.dataset.state=s?.state||'idle';}
    let node=$('englishVocabDiagnostics');if(!node){node=document.createElement('script');node.type='application/json';node.id='englishVocabDiagnostics';document.body.append(node);}
    const json=JSON.stringify(snapshot());if(node.textContent!==json)node.textContent=json;
  }
  function entry(target,source,item){
    const word=String(item?.word||'').trim();if(!word)return null;
    const ex=Array.isArray(item?.examples)?item.examples.find(x=>x?.sentence)||item.examples[0]:null;
    return {id:target+':cefr:'+source+':'+safe(word),word,meaning:String(item?.translation_cn||item?.translation||'').trim()||'（待补释义）',example:String(ex?.sentence||item?.example||'').trim(),translation:String(ex?.translation_cn||ex?.translation||'').trim(),chunk:'',topic:'CEFR '+source,phonetic:String(item?.phonetic||'').trim(),partOfSpeech:String(item?.part_of_speech||'').trim(),cefrLevel:String(item?.cefr_level||source),source:'WordMaster CEFR / CEFR-J / Octanove'};
  }
  async function fetchLevel(level,force){
    if(pendingLevels.has(level))return pendingLevels.get(level);if(levels.has(level)&&!force)return levels.get(level);
    const task=(async()=>{let error;for(let attempt=1;attempt<=2;attempt++){
      const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
      try{const response=await fetch(API+'?asset=cefr&file='+FILES[level],{cache:force?'reload':'force-cache',signal:controller.signal});diagnostic.levels[level]={status:response.status,attempt};if(!response.ok)throw new Error(level+' HTTP '+response.status);
        const data=await response.json(),words=Array.isArray(data?.words)?data.words:[];if(words.length<Math.max(50,Math.floor(EXPECTED[level]*.7)))throw new Error(level+' 数据不完整，仅 '+words.length+' 条');
        diagnostic.levels[level].count=words.length;levels.set(level,words);record('level-ready',level,words.length);publish();return words;
      }catch(e){error=e;record('level-error',level,String(e.message||e));}finally{clearTimeout(timer);}}
      throw error;})();pendingLevels.set(level,task);try{return await task;}finally{pendingLevels.delete(level);}
  }
  function merge(target,parts){
    const map=new Map();for(const [source,words] of parts)for(const raw of words){const w=entry(target,source,raw),key=norm(w?.word);if(w&&key&&!map.has(key))map.set(key,w);}
    // Keep IDs referenced by learned, review, flow and four-pass progress.
    for(const local of starter[target]){const key=norm(local.word);if(!key)continue;const remote=map.get(key);map.set(key,remote?{...remote,...local,phonetic:remote.phonetic,partOfSpeech:remote.partOfSpeech,cefrLevel:remote.cefrLevel,source:'本地精选卡 + CEFR 完整词库'}:{...local,source:local.source||'本地考试词块'});}return [...map.values()];
  }
  function refresh(target){
    if(current()!==target)return;const result={target,at:Date.now(),called:false,ok:false};diagnostic.refreshes.push(result);diagnostic.refreshes=diagnostic.refreshes.slice(-10);
    try{if(typeof window.certificateUI?.refresh!=='function')throw new Error('certificateUI.refresh unavailable');result.called=true;window.certificateUI.refresh();result.ok=true;}
    catch(error){result.error=String(error.message||error);console.error('[english vocab] UI refresh failed',error);}
    publish();window.dispatchEvent(new CustomEvent('englishvocabularchange',{detail:{target,count:CERT_VOCAB[target].length}}));
  }
  async function load(target=current(),force=false){
    target=String(target).toUpperCase();if(!TARGETS[target])return;if(pendingTargets.has(target))return pendingTargets.get(target);if(targets[target].state==='ready'&&!force){publish();return;}
    const task=(async()=>{targets[target]={...targets[target],state:'loading',error:null};record('target-start',target,starter[target].length);publish();
      try{const parts=await Promise.all(TARGETS[target].map(async l=>[l,await fetchLevel(l,force)])),merged=merge(target,parts);const floor=Math.max(500,Math.floor(Math.max(...TARGETS[target].map(l=>EXPECTED[l]))*.45));if(merged.length<floor)throw new Error('合并后仅 '+merged.length+' 条');
        CERT_VOCAB[target]=merged;targets[target]={state:'ready',count:merged.length};record('target-ready',target,merged.length);refresh(target);
      }catch(error){targets[target]={state:CERT_VOCAB[target].length>starter[target].length?'ready':'error',count:CERT_VOCAB[target].length,error:String(error.message||error)};record('target-error',target,targets[target].error);console.error('[english vocab]',error);publish();}
    })();pendingTargets.set(target,task);try{return await task;}finally{pendingTargets.delete(target);}
  }
  Object.assign(diagnostic,{load,count:()=>CERT_VOCAB[current()]?.length||0,loaded:t=>targets[String(t||current()).toUpperCase()]?.state==='ready',snapshot});window.englishFullVocab=diagnostic;
  // Explicit render events replace the self-triggering DOM observer.
  window.addEventListener('englishcertificaterender',()=>{publish();if(targets[current()]?.state==='idle')load(current());});
  document.addEventListener('change',e=>{if(e.target?.id==='certificateSelect')setTimeout(()=>load(current()),0);},true);
  window.addEventListener('online',()=>load(current()));publish();load(current());
})();
