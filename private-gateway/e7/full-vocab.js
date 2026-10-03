/* Full cumulative CEFR vocabulary loader for Cambridge-targeted practice. */
(()=>{
  'use strict';
  if(window.__englishFullVocab)return;
  window.__englishFullVocab=1;

  const SOURCE_COMMIT='016c3ebe83ffd9c3bc7de295f0facdd866f17e3b';
  const BASE='https://cdn.jsdelivr.net/gh/lratusa/wordmaster-wordlists@'+SOURCE_COMMIT+'/english/';
  const FILES={A1:'cefr_a1.json',A2:'cefr_a2.json',B1:'cefr_b1.json',B2:'cefr_b2.json',C1:'cefr_c1.json',C2:'cefr_c2.json'};
  const TARGETS={B1:['A1','A2','B1'],B2:['A1','A2','B1','B2'],C1:['A1','A2','B1','B2','C1'],C2:['A1','A2','B1','B2','C1','C2']};
  const EXPECTED={A1:1063,A2:1352,B1:2354,B2:2691,C1:1009,C2:972};
  const starter={};
  const loadedLevels=new Map();
  const loadedTargets=new Set();
  const loadingTargets=new Map();
  let lastStatus='';

  try{
    for(const level of Object.keys(TARGETS))starter[level]=Array.isArray(CERT_VOCAB?.[level])?CERT_VOCAB[level].slice():[];
  }catch{return;}

  const $=id=>document.getElementById(id);
  const norm=value=>String(value||'').toLowerCase().replace(/[’‘]/g,"'").replace(/\s+/g,' ').trim();
  const currentLevel=()=>String($('certificateSelect')?.value||'C1').toUpperCase();
  const safeId=value=>norm(value).replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,80)||'entry';

  function expectedFor(target){return (TARGETS[target]||[]).reduce((sum,l)=>sum+(EXPECTED[l]||0),0);}
  function statusNode(){
    const row=document.querySelector('.vocabFilterRow');
    if(!row)return null;
    let node=$('fullVocabStatus');
    if(!node){
      node=document.createElement('button');
      node.type='button';node.id='fullVocabStatus';node.className='fullVocabStatus';
      node.title='完整词库状态';
      row.append(node);
      node.onclick=()=>loadTarget(currentLevel(),true);
    }
    if(lastStatus)node.textContent=lastStatus;
    return node;
  }
  function setStatus(text,state=''){
    lastStatus=text;
    const node=statusNode();if(!node)return;
    node.textContent=text;node.dataset.state=state;
  }

  function mapEntry(target,sourceLevel,item){
    const ex=Array.isArray(item?.examples)?item.examples.find(x=>x?.sentence)||item.examples[0]:null;
    const word=String(item?.word||'').trim();
    if(!word)return null;
    return {
      id:target+':cefr:'+sourceLevel+':'+safeId(word),
      word,
      meaning:String(item?.translation_cn||'').trim()||'（待补释义）',
      example:String(ex?.sentence||'').trim(),
      translation:String(ex?.translation_cn||'').trim(),
      chunk:'',
      topic:'CEFR '+sourceLevel,
      phonetic:String(item?.phonetic||'').trim(),
      partOfSpeech:String(item?.part_of_speech||'').trim(),
      cefrLevel:String(item?.cefr_level||sourceLevel),
      source:'WordMaster CEFR / CEFR-J / Octanove'
    };
  }

  async function fetchLevel(level,force=false){
    if(loadedLevels.has(level)&&!force)return loadedLevels.get(level);
    const url=BASE+FILES[level];
    const response=await fetch(url,{cache:force?'reload':'force-cache'});
    if(!response.ok)throw new Error(level+' HTTP '+response.status);
    const data=await response.json();
    const words=Array.isArray(data?.words)?data.words:[];
    if(words.length<Math.max(50,Math.floor((EXPECTED[level]||100)*.7)))throw new Error(level+' 数据不完整');
    loadedLevels.set(level,words);
    return words;
  }

  function mergeTarget(target,parts){
    const map=new Map();
    for(const [sourceLevel,words] of parts){
      for(const raw of words){
        const entry=mapEntry(target,sourceLevel,raw);if(!entry)continue;
        const key=norm(entry.word);if(!key||map.has(key))continue;
        map.set(key,entry);
      }
    }
    for(const local of starter[target]||[]){
      const key=norm(local?.word);if(!key)continue;
      const remote=map.get(key);
      if(remote){
        map.set(key,{...remote,...local,phonetic:remote.phonetic,partOfSpeech:remote.partOfSpeech,cefrLevel:remote.cefrLevel,source:'本地精选卡 + CEFR 完整词库'});
      }else{
        map.set(key,{...local,source:local.source||'本地考试词块'});
      }
    }
    return [...map.values()];
  }

  function enhanceVisibleCard(){
    const word=window.certificateUI?.currentWord?.();
    if(!word)return;
    const meta=[word.partOfSpeech,word.phonetic,word.cefrLevel&&('CEFR '+word.cefrLevel)].filter(Boolean).join(' · ');
    if(!meta)return;
    const root=$('vocabContent');if(!root||root.querySelector('.fullVocabMeta'))return;
    const anchor=root.querySelector('.vocabTerm,.vocabFlowMeta,#vocabMemoryInline')||root.firstElementChild;
    if(!anchor)return;
    const line=document.createElement('div');line.className='small fullVocabMeta';line.textContent=meta;
    anchor.after(line);
  }

  async function loadTarget(target=currentLevel(),force=false){
    target=String(target||'').toUpperCase();
    if(!TARGETS[target])return;
    if(loadedTargets.has(target)&&!force){
      setStatus('📚 完整词库 '+CERT_VOCAB[target].length.toLocaleString()+' 条','ready');
      enhanceVisibleCard();return;
    }
    if(loadingTargets.has(target)&&!force)return loadingTargets.get(target);
    const task=(async()=>{
      setStatus('📥 正在加载 '+target+' 完整词库…','loading');
      try{
        const levels=TARGETS[target];
        const rows=await Promise.all(levels.map(async level=>[level,await fetchLevel(level,force)]));
        const merged=mergeTarget(target,rows);
        if(merged.length<Math.floor(expectedFor(target)*.8))throw new Error('合并后的词库数量异常');
        CERT_VOCAB[target]=merged;
        loadedTargets.add(target);
        setStatus('📚 完整词库 '+merged.length.toLocaleString()+' 条','ready');
        try{window.certificateUI?.renderHero?.();}catch{}
        if(currentLevel()===target&&window.certificateUI?.currentView?.()==='vocab'){
          try{window.certificateUI.refresh();}catch{}
        }
        setTimeout(enhanceVisibleCard,60);
      }catch(error){
        console.warn('[english full vocab]',error);
        CERT_VOCAB[target]=starter[target].slice();
        setStatus('⚠ 完整词库加载失败 · 点我重试','error');
      }finally{loadingTargets.delete(target);}
    })();
    loadingTargets.set(target,task);return task;
  }

  const style=document.createElement('style');
  style.textContent='.fullVocabStatus{border:0;background:transparent;color:#756b80;font:inherit;font-size:12px;padding:4px 0;cursor:pointer}.fullVocabStatus[data-state="ready"]{color:#5d7b66}.fullVocabStatus[data-state="error"]{color:#a85b68}.fullVocabMeta{margin:7px 0;color:#796f82}';
  document.head.append(style);

  const root=$('certBody');
  if(root)new MutationObserver(()=>{statusNode();enhanceVisibleCard();}).observe(root,{subtree:true,childList:true});
  document.addEventListener('change',event=>{if(event.target?.id==='certificateSelect')setTimeout(()=>loadTarget(currentLevel()),0);},true);
  window.addEventListener('online',()=>{if(!loadedTargets.has(currentLevel()))loadTarget(currentLevel());});

  window.englishFullVocab={
    load:loadTarget,
    loaded:level=>loadedTargets.has(String(level||'').toUpperCase()),
    count:level=>CERT_VOCAB?.[String(level||currentLevel()).toUpperCase()]?.length||0,
    sourceCommit:SOURCE_COMMIT
  };

  setTimeout(()=>{statusNode();loadTarget(currentLevel());},40);
})();
