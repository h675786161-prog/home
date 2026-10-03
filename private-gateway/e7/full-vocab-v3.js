/* Concurrent cumulative CEFR vocabulary loader for the English study site. */
(()=>{
  'use strict';
  if(window.__englishFullVocabV3)return;
  window.__englishFullVocabV3={version:'3.1',state:'booting'};

  const BASE='https://ibpffxzdjvgydnhmvmvc.supabase.co/functions/v1/english?asset=cefr&file=';
  const BEACON='https://ibpffxzdjvgydnhmvmvc.supabase.co/functions/v1/english?asset=vocab-beacon';
  const FILES={A1:'cefr_a1.json',A2:'cefr_a2.json',B1:'cefr_b1.json',B2:'cefr_b2.json',C1:'cefr_c1.json',C2:'cefr_c2.json'};
  const TARGETS={B1:['A1','A2','B1'],B2:['A1','A2','B1','B2'],C1:['A1','A2','B1','B2','C1'],C2:['A1','A2','B1','B2','C1','C2']};
  const EXPECTED={A1:1063,A2:1352,B1:2354,B2:2691,C1:1009,C2:972};
  const starter={},loadedLevels=new Map(),loadedTargets=new Set(),loadingTargets=new Map();
  let lastStatus='';

  const beacon=(event,target,count=0,detail='')=>{
    try{fetch(BEACON+'&event='+encodeURIComponent(event)+'&target='+encodeURIComponent(target||'')+'&count='+encodeURIComponent(String(count||0))+'&detail='+encodeURIComponent(String(detail||'').slice(0,120))+'&t='+Date.now(),{cache:'no-store'}).catch(()=>{});}catch{}
  };

  try{
    for(const level of Object.keys(TARGETS))starter[level]=Array.isArray(CERT_VOCAB?.[level])?CERT_VOCAB[level].slice():[];
  }catch(error){
    console.error('[english vocab v3.1] CERT_VOCAB unavailable',error);
    window.__englishFullVocabV3.state='no-base-bank';
    beacon('no-base-bank','',0,String(error?.message||error));
    return;
  }

  const byId=id=>document.getElementById(id);
  const norm=value=>String(value||'').toLowerCase().replace(/[’‘]/g,"'").replace(/\s+/g,' ').trim();
  const currentLevel=()=>String(byId('certificateSelect')?.value||'C1').toUpperCase();
  const safeId=value=>norm(value).replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,80)||'entry';

  function statusNode(){
    const row=document.querySelector('.vocabFilterRow');
    if(!row)return null;
    let node=byId('fullVocabStatus');
    if(!node){
      node=document.createElement('button');
      node.type='button';node.id='fullVocabStatus';node.className='fullVocabStatus';
      node.style.cssText='border:0;background:transparent;padding:4px 0;color:#756b80;font:inherit;font-size:12px;cursor:pointer;white-space:nowrap';
      node.title='完整词库状态 · 点按重新加载';
      node.onclick=()=>loadTarget(currentLevel(),true);
      row.append(node);
    }
    if(lastStatus)node.textContent=lastStatus;
    return node;
  }
  function setStatus(message,state=''){
    lastStatus=message;
    window.__englishFullVocabV3.state=state||message;
    const node=statusNode();
    if(node){
      node.textContent=message;node.dataset.state=state;
      node.style.color=state==='ready'?'#4f785d':state==='error'?'#a84e63':'#756b80';
    }
  }
  function mapEntry(target,sourceLevel,item){
    const ex=Array.isArray(item?.examples)?(item.examples.find(x=>x?.sentence)||item.examples[0]):null;
    const word=String(item?.word||'').trim();
    if(!word)return null;
    return {
      id:target+':cefr:'+sourceLevel+':'+safeId(word),word,
      meaning:String(item?.translation_cn||item?.translation||'').trim()||'（待补释义）',
      example:String(ex?.sentence||item?.example||'').trim(),translation:String(ex?.translation_cn||ex?.translation||'').trim(),chunk:'',topic:'CEFR '+sourceLevel,
      phonetic:String(item?.phonetic||'').trim(),partOfSpeech:String(item?.part_of_speech||'').trim(),cefrLevel:String(item?.cefr_level||sourceLevel),
      source:'WordMaster CEFR / CEFR-J / Octanove'
    };
  }
  async function fetchLevel(level,force=false){
    if(loadedLevels.has(level)&&!force)return loadedLevels.get(level);
    let lastError;
    for(let attempt=0;attempt<2;attempt++){
      const controller=new AbortController();
      const timer=setTimeout(()=>controller.abort(),15000);
      try{
        const response=await fetch(BASE+encodeURIComponent(FILES[level])+'&rev=31'+(force?'&force='+Date.now():''),{
          cache:force?'reload':'force-cache',signal:controller.signal
        });
        if(!response.ok)throw new Error('HTTP '+response.status);
        const data=await response.json();
        const words=Array.isArray(data?.words)?data.words:[];
        if(words.length<Math.max(50,Math.floor((EXPECTED[level]||100)*.7)))throw new Error('数据不完整，仅 '+words.length+' 条');
        loadedLevels.set(level,words);
        beacon('level-ready',level,words.length);
        return words;
      }catch(error){
        lastError=error;
        console.warn('[english vocab v3.1] '+level+' attempt '+(attempt+1)+' failed',error);
      }finally{clearTimeout(timer);}
      await new Promise(resolve=>setTimeout(resolve,350));
    }
    throw new Error(level+' 加载失败：'+String(lastError?.message||lastError||'未知错误'));
  }
  function mergeTarget(target,parts){
    const map=new Map();
    for(const [sourceLevel,words] of parts){
      for(const raw of words){
        const entry=mapEntry(target,sourceLevel,raw);
        if(!entry)continue;
        const key=norm(entry.word);
        if(!key||map.has(key))continue;
        map.set(key,entry);
      }
    }
    for(const local of starter[target]||[]){
      const key=norm(local?.word);
      if(!key)continue;
      const remote=map.get(key);
      if(remote)map.set(key,{...remote,...local,phonetic:remote.phonetic,partOfSpeech:remote.partOfSpeech,cefrLevel:remote.cefrLevel,source:'本地精选卡 + CEFR 完整词库'});
      else map.set(key,{...local,source:local.source||'本地考试词块'});
    }
    return [...map.values()];
  }
  function patchHero(target,count){
    const focus=byId('certFocus');
    if(!focus)return;
    const before=String(focus.textContent||'').split(' · ')[0];
    focus.textContent=before+' · '+count.toLocaleString()+' 个可练词 / 词块';
  }
  async function loadTarget(target=currentLevel(),force=false){
    target=String(target||'').toUpperCase();
    if(!TARGETS[target])return;
    if(loadedTargets.has(target)&&!force){
      const count=CERT_VOCAB[target]?.length||0;
      setStatus('📚 完整词库 '+count.toLocaleString()+' 条','ready');
      patchHero(target,count);
      return;
    }
    if(loadingTargets.has(target)&&!force)return loadingTargets.get(target);
    const task=(async()=>{
      const levels=TARGETS[target];
      setStatus('📥 正在补全 '+target+' 词库 0 / '+levels.length,'loading');
      beacon('target-start',target,starter[target]?.length||0);
      try{
        let done=0;
        const settled=await Promise.all(levels.map(async level=>{
          const words=await fetchLevel(level,force);
          done+=1;
          if(currentLevel()===target)setStatus('📥 正在补全 '+target+' 词库 '+done+' / '+levels.length,'loading');
          return [level,words];
        }));
        setStatus('📥 正在合并 '+target+' 词库…','loading');
        const merged=mergeTarget(target,settled);
        // CEFR files overlap heavily. Validate each source above, then only require a sane unique-word floor here.
        const maxExpected=Math.max(...levels.map(level=>EXPECTED[level]||0));
        const floor=Math.max(500,Math.floor(maxExpected*.45));
        if(merged.length<floor)throw new Error('合并后只有 '+merged.length+' 条，低于去重安全阈值 '+floor);
        CERT_VOCAB[target]=merged;
        loadedTargets.add(target);
        window.__englishFullVocabV3.lastCount=merged.length;
        setStatus('📚 完整词库 '+merged.length.toLocaleString()+' 条','ready');
        patchHero(target,merged.length);
        beacon('target-ready',target,merged.length);
        try{window.certificateUI?.renderHero?.();}catch{}
        patchHero(target,merged.length);
        if(currentLevel()===target&&window.certificateUI?.currentView?.()==='vocab'){
          setTimeout(()=>{
            try{window.certificateUI?.refresh?.();}catch(error){console.warn('[english vocab v3.1] refresh failed',error);}
            setTimeout(()=>{
              statusNode();
              setStatus('📚 完整词库 '+merged.length.toLocaleString()+' 条','ready');
              patchHero(target,merged.length);
            },80);
          },0);
        }
      }catch(error){
        console.error('[english vocab v3.1]',error);
        if(!loadedTargets.has(target))CERT_VOCAB[target]=starter[target].slice();
        setStatus('⚠ 完整词库加载失败 · 点我重试','error');
        window.__englishFullVocabV3.error=String(error?.message||error);
        beacon('target-error',target,0,String(error?.message||error));
      }finally{loadingTargets.delete(target);}
    })();
    loadingTargets.set(target,task);
    return task;
  }

  const body=byId('certBody');
  if(body)new MutationObserver(()=>{
    statusNode();
    const level=currentLevel();
    if(loadedTargets.has(level))patchHero(level,CERT_VOCAB[level]?.length||0);
  }).observe(body,{subtree:true,childList:true});
  document.addEventListener('change',event=>{
    if(event.target?.id==='certificateSelect')setTimeout(()=>loadTarget(currentLevel()),60);
  },true);
  window.addEventListener('online',()=>loadTarget(currentLevel(),false));

  window.__englishFullVocabV3.load=loadTarget;
  window.__englishFullVocabV3.count=()=>CERT_VOCAB?.[currentLevel()]?.length||0;
  window.__englishFullVocabV3.loaded=level=>loadedTargets.has(String(level||currentLevel()).toUpperCase());
  window.englishFullVocab=window.__englishFullVocabV3;

  setTimeout(()=>{statusNode();loadTarget(currentLevel());},80);
})();
