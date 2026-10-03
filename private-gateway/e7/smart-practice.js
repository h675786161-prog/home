/* Adaptive practice layer: spaced resurfacing, confusion drills, slot drills, dictation and a 10-minute lazy session. */
(()=>{
  'use strict';
  if(window.__englishSmartPractice)return;
  window.__englishSmartPractice=1;

  const $=id=>document.getElementById(id);
  const esc=value=>typeof escapeHtml==='function'?escapeHtml(String(value??'')):String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const now=()=>Date.now();
  const norm=value=>String(value||'').toLowerCase().replace(/[’‘]/g,"'").replace(/[^a-z0-9' ]+/g,' ').replace(/\s+/g,' ').trim();
  const level=()=>String($('certificateSelect')?.value||'C1');
  const allBank=()=>Object.values(typeof CERT_VOCAB==='object'&&CERT_VOCAB||{}).flat().filter(Boolean);
  const bank=()=>Array.isArray(CERT_VOCAB?.[level()])?CERT_VOCAB[level()]:[];
  const wordByText=text=>allBank().find(w=>norm(w.word)===norm(text));
  const shuffle=list=>{const a=[...list];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};

  function smart(){
    state.smartPractice=state.smartPractice||{items:{},confusions:{},stats:{}};
    state.smartPractice.items=state.smartPractice.items||{};
    state.smartPractice.confusions=state.smartPractice.confusions||{};
    state.smartPractice.stats=state.smartPractice.stats||{};
    return state.smartPractice;
  }
  function persist(){try{save();}catch{}}
  const keyFor=w=>level()+':'+w.id;
  function progress(){
    state.certificates=state.certificates||{};
    const p=state.certificates[level()]=state.certificates[level()]||{};
    p.learned=p.learned||{};p.review=p.review||{};return p;
  }
  function record(w,ok,mode='practice',wrongText=''){
    if(!w?.id)return;
    const s=smart(),key=keyFor(w),r=s.items[key]=s.items[key]||{correct:0,wrong:0,streak:0,last:0,nextAt:0,modes:{}};
    r.last=now();r.modes[mode]=(Number(r.modes[mode])||0)+1;
    const p=progress();
    if(ok){
      r.correct=(Number(r.correct)||0)+1;r.streak=(Number(r.streak)||0)+1;
      const gaps=[10*60e3,24*60*60e3,3*24*60*60e3,7*24*60*60e3,14*24*60*60e3];
      r.nextAt=now()+gaps[Math.min(r.streak-1,gaps.length-1)];
      if(r.streak>=2)delete p.review[w.id];
    }else{
      r.wrong=(Number(r.wrong)||0)+1;r.streak=0;r.nextAt=now()+3*60e3;
      p.review[w.id]=true;delete p.learned[w.id];
      const wrong=norm(wrongText);
      if(wrong&&wrong!==norm(w.word)){
        const pair=[String(w.word||'').trim(),String(wrongText||'').trim()].sort((a,b)=>a.localeCompare(b));
        const pairKey=pair.join('\u0000');
        const c=s.confusions[pairKey]=s.confusions[pairKey]||{a:pair[0],b:pair[1],count:0,last:0};
        c.count++;c.last=now();
      }
    }
    persist();updateBadge();
  }
  function promoteDue(){
    const s=smart(),p=progress(),prefix=level()+':',t=now();let changed=false;
    for(const [key,r] of Object.entries(s.items)){
      if(!key.startsWith(prefix)||!r?.nextAt||r.nextAt>t)continue;
      const id=key.slice(prefix.length);
      if(!p.review[id]){p.review[id]=true;changed=true;}
    }
    if(changed)persist();updateBadge();
  }
  function dueCount(){
    const p=progress();return Object.keys(p.review||{}).length;
  }

  let smartRecent=[];
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
  }
  function distractors(w,field,count=3){
    return shuffle(bank().filter(x=>x.id!==w.id&&String(x?.[field]||'').trim()).map(x=>String(x[field]).trim()).filter((v,i,a)=>a.indexOf(v)===i)).slice(0,count);
  }

  const curated=[
    ['affect','effect','affect 常作动词“影响”；effect 常作名词“效果 / 影响”。'],
    ['advice','advise','advice 是名词“建议”；advise 是动词“建议”。'],
    ['accept','except','accept 是“接受”；except 是“除……之外”。'],
    ['borrow','lend','borrow 是“借入”；lend 是“借出”。'],
    ['raise','rise','raise 通常要接宾语；rise 通常是不及物的“上升”。'],
    ['economic','economical','economic 偏“经济的”；economical 偏“节省的 / 实惠的”。'],
    ['sensible','sensitive','sensible 是“明智的”；sensitive 是“敏感的”。'],
    ['compliment','complement','compliment 是“赞美”；complement 是“补充 / 相配”。']
  ];
  const curatedMeaning={
    affect:'影响（动词）',effect:'效果；影响（名词）',advice:'建议（名词）',advise:'建议（动词）',accept:'接受',except:'除……之外',borrow:'借入',lend:'借出',raise:'提高；举起（及物）',rise:'上升（不及物）',economic:'经济的',economical:'节省的；实惠的',sensible:'明智的',sensitive:'敏感的',compliment:'赞美',complement:'补充；相配'
  };
  function confusionPool(){
    const dynamic=Object.values(smart().confusions||{}).sort((a,b)=>(b.count||0)-(a.count||0)).map(c=>[c.a,c.b,'你最近把这两个选项混过，先把差别压实。']);
    const merged=[...dynamic,...curated];
    const seen=new Set();return merged.filter(pair=>{const k=[norm(pair[0]),norm(pair[1])].sort().join('|');if(seen.has(k))return false;seen.add(k);return true;});
  }
  function meaningOf(term){return wordByText(term)?.meaning||curatedMeaning[norm(term)]||'查看上下文判断';}

  function ensureDialog(){
    let d=$('smartPracticeDialog');if(d)return d;
    d=document.createElement('dialog');d.id='smartPracticeDialog';d.className='smartPracticeDialog';document.body.append(d);return d;
  }
  function closeDialog(){const d=$('smartPracticeDialog');if(d?.open)d.close();window.englishSpeech?.stop?.();}
  function shell(title,sub=''){
    const d=ensureDialog();d.innerHTML='<div class="smartTop"><div><h3>'+esc(title)+'</h3>'+(sub?'<p>'+esc(sub)+'</p>':'')+'</div><button class="btn" id="smartClose">关闭</button></div><div id="smartBody"></div>';d.showModal();$('smartClose').onclick=closeDialog;return $('smartBody');
  }
  function speak(text,kind='sentence'){window.englishSpeech?.speak?.(text,{kind});}

  function openDictation(){
    let kind=localStorage.getItem('lazyEnglishDictationKind')||'word',current=null;
    const body=shell('🎧 听写模式','只给声音，不先给答案。写对自动下一条。');
    const render=()=>{
      const list=bank().filter(w=>kind==='word'?String(w.word||'').trim().split(/\s+/).length===1:kind==='phrase'?String(w.word||'').trim().split(/\s+/).length>1:!!w.example);
      current=pickWeighted(list,current?.id);if(!current){body.innerHTML='<p>这一类暂时没内容。</p>';return;}
      const target=kind==='sentence'?current.example:current.word,meaning=kind==='sentence'?current.translation:current.meaning;
      body.innerHTML='<div class="smartChips"><button data-k="word">单词</button><button data-k="phrase">短语</button><button data-k="sentence">句子</button></div><div class="smartPrompt">🔊 听完写下来</div><p class="smartHint">'+esc(meaning||'先听，不偷看文字')+'</p><div class="smartActions"><button class="btn primary" id="smartPlay">▶ 播放</button><button class="btn" id="smartSlow">再听一次</button></div><input class="certInput smartInput" id="smartInput" placeholder="输入你听到的英文" autocomplete="off" autocapitalize="off" spellcheck="false"><button class="btn primary smartFull" id="smartCheck">核对</button><div id="smartFeedback" class="smartFeedback" hidden></div>';
      body.querySelectorAll('[data-k]').forEach(b=>{b.classList.toggle('active',b.dataset.k===kind);b.onclick=()=>{kind=b.dataset.k;localStorage.setItem('lazyEnglishDictationKind',kind);current=null;render();};});
      $('smartPlay').onclick=()=>speak(target,kind==='sentence'?'sentence':'word');$('smartSlow').onclick=$('smartPlay').onclick;
      const check=()=>{
        const actual=$('smartInput').value.trim();if(!actual)return;
        const ok=norm(actual)===norm(target),fb=$('smartFeedback');fb.hidden=false;fb.className='smartFeedback '+(ok?'good':'bad');
        if(ok){fb.textContent='✓ 对上了，下一条。';record(current,true,'dictation');setTimeout(render,500);}
        else{fb.innerHTML='没对上。答案：<b>'+esc(target)+'</b><div class="smartActions"><button class="btn" id="smartReplay">再听</button><button class="btn primary" id="smartNext">下一条</button></div>';record(current,false,'dictation');$('smartReplay').onclick=()=>speak(target,kind==='sentence'?'sentence':'word');$('smartNext').onclick=render;}
      };
      $('smartCheck').onclick=check;$('smartInput').onkeydown=e=>{if(e.key==='Enter'&&!e.isComposing)check();};
      setTimeout(()=>$('smartPlay')?.click(),120);
    };render();
  }

  function openSlots(){
    const items=bank().filter(w=>w.word&&w.example&&String(w.example).toLowerCase().includes(String(w.word).toLowerCase()));let current=null;
    const body=shell('🧩 句型槽位','把词 / 短语塞回真实句子里，答对自动下一条。');
    const render=()=>{
      current=pickWeighted(items,current?.id);if(!current){body.innerHTML='<p>当前词库里还没有足够的可挖空例句。</p>';return;}
      const re=new RegExp(String(current.word).replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'i');
      const prompt=String(current.example).replace(re,'_____');
      const opts=shuffle([current.word,...distractors(current,'word',3)]).slice(0,4);
      body.innerHTML='<div class="smartPrompt smartSentence">'+esc(prompt)+'</div><p class="smartHint">'+esc(current.translation||'')+'</p><div class="smartOptions">'+opts.map(x=>'<button data-answer="'+esc(x)+'">'+esc(x)+'</button>').join('')+'</div><div id="smartFeedback" class="smartFeedback" hidden></div>';
      body.querySelectorAll('[data-answer]').forEach(b=>b.onclick=()=>{
        const ok=norm(b.dataset.answer)===norm(current.word),fb=$('smartFeedback');fb.hidden=false;b.classList.add(ok?'correct':'wrong');
        if(ok){fb.textContent='✓ '+current.example;record(current,true,'slot');body.querySelectorAll('[data-answer]').forEach(x=>x.disabled=true);setTimeout(render,650);}
        else{fb.textContent='再看一眼句型槽位，不急着猜。';record(current,false,'slot',b.dataset.answer);}
      });
    };render();
  }

  function openConfusion(){
    const pairs=confusionPool();let index=0;
    const body=shell('⚡ 易混专项','优先练你自己混过的词，再补一组常见易混项。');
    const render=()=>{
      const pair=pairs[index++%pairs.length],target=Math.random()<.5?pair[0]:pair[1],other=target===pair[0]?pair[1]:pair[0],opts=shuffle([target,other]);
      body.innerHTML='<div class="smartPrompt">哪个是「'+esc(meaningOf(target))+'」？</div><div class="smartOptions">'+opts.map(x=>'<button data-answer="'+esc(x)+'">'+esc(x)+'</button>').join('')+'</div><div id="smartFeedback" class="smartFeedback" hidden></div>';
      body.querySelectorAll('[data-answer]').forEach(b=>b.onclick=()=>{
        const ok=norm(b.dataset.answer)===norm(target),fb=$('smartFeedback');fb.hidden=false;b.classList.add(ok?'correct':'wrong');
        if(ok){fb.innerHTML='✓ '+esc(pair[2]||'');body.querySelectorAll('[data-answer]').forEach(x=>x.disabled=true);const w=wordByText(target);if(w)record(w,true,'confusion');setTimeout(render,750);}
        else{fb.innerHTML='<b>'+esc(target)+'</b>：'+esc(meaningOf(target))+'<br><b>'+esc(other)+'</b>：'+esc(meaningOf(other))+'<br>'+esc(pair[2]||'');const w=wordByText(target);if(w)record(w,false,'confusion',b.dataset.answer);}
      });
    };render();
  }

  function openLazy(){
    const duration=10*60e3,end=now()+duration;let current=null,correct=0,wrong=0,total=0,timer=null;
    const body=shell('💤 10 分钟懒人刷','不用选模块，我来混着塞。');
    const render=()=>{
      if(now()>=end){finish();return;}
      current=pickWeighted(bank(),current?.id);if(!current){body.innerHTML='<p>当前没有可练内容。</p>';return;}
      total++;
      const types=['en-zh','zh-en','listen','slot'],type=types[(total-1)%types.length];
      let prompt='',answer='',opts=[],sub='';
      if(type==='en-zh'){prompt=current.word;answer=current.meaning;opts=shuffle([answer,...distractors(current,'meaning',3)]).slice(0,4);sub='英文 → 中文';}
      if(type==='zh-en'){prompt=current.meaning;answer=current.word;opts=shuffle([answer,...distractors(current,'word',3)]).slice(0,4);sub='中文 → 英文';}
      if(type==='listen'){prompt='🔊 听一下，选你听到的内容';answer=current.word;opts=shuffle([answer,...distractors(current,'word',3)]).slice(0,4);sub='听音识别';}
      if(type==='slot'){
        const ok=current.word&&current.example&&String(current.example).toLowerCase().includes(String(current.word).toLowerCase());
        if(!ok){total--;current=null;return render();}
        const re=new RegExp(String(current.word).replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'i');prompt=String(current.example).replace(re,'_____');answer=current.word;opts=shuffle([answer,...distractors(current,'word',3)]).slice(0,4);sub='句型槽位';
      }
      body.innerHTML='<div class="smartSessionMeta"><span id="smartTimer">10:00</span><span>✓ '+correct+' · ✗ '+wrong+'</span></div><div class="smartMiniLabel">'+esc(sub)+'</div><div class="smartPrompt '+(type==='slot'?'smartSentence':'')+'">'+esc(prompt)+'</div>'+(type==='listen'?'<button class="btn primary smartFull" id="smartLazyPlay">▶ 播放</button>':'')+'<div class="smartOptions">'+opts.map(x=>'<button data-answer="'+esc(x)+'">'+esc(x)+'</button>').join('')+'</div><div id="smartFeedback" class="smartFeedback" hidden></div>';
      if(type==='listen'){ $('smartLazyPlay').onclick=()=>speak(current.word,'word');setTimeout(()=>$('smartLazyPlay')?.click(),100); }
      body.querySelectorAll('[data-answer]').forEach(b=>b.onclick=()=>{
        const ok=String(b.dataset.answer)===String(answer),fb=$('smartFeedback');fb.hidden=false;b.classList.add(ok?'correct':'wrong');
        if(ok){correct++;record(current,true,'lazy');body.querySelectorAll('[data-answer]').forEach(x=>x.disabled=true);fb.textContent='✓';setTimeout(render,420);}
        else{wrong++;const wrongTerm=['zh-en','listen','slot'].includes(type)?b.dataset.answer:'';record(current,false,'lazy',wrongTerm);fb.innerHTML='答案：<b>'+esc(answer)+'</b><div class="smartActions"><button class="btn primary" id="smartLazyNext">下一张 →</button></div>';$('smartLazyNext').onclick=render;}
      });
      tick();
    };
    const tick=()=>{const node=$('smartTimer');if(!node)return;const left=Math.max(0,Math.ceil((end-now())/1000));node.textContent=Math.floor(left/60)+':'+String(left%60).padStart(2,'0');if(!left)finish();};
    const finish=()=>{clearInterval(timer);body.innerHTML='<div class="smartFinish"><b>这轮收工 ✓</b><p>做了 '+total+' 张 · 对 '+correct+' · 错 '+wrong+'</p><button class="btn primary" id="smartAgain">再来 10 分钟</button></div>';$('smartAgain').onclick=()=>{closeDialog();openLazy();};};
    timer=setInterval(tick,1000);ensureDialog().addEventListener('close',()=>clearInterval(timer),{once:true});render();
  }

  function updateBadge(){const badge=$('smartAdaptiveBadge');if(badge){const text='🧠 自适应回流 · 待复习 '+dueCount();if(badge.textContent!==text)badge.textContent=text;}}
  function installBar(){
    if(window.certificateUI?.currentView?.()!=='vocab')return;
    const row=document.querySelector('.vocabFilterRow');if(!row||$('smartPracticeBar'))return;
    const bar=document.createElement('div');bar.id='smartPracticeBar';bar.className='smartPracticeBar';
    bar.innerHTML='<button class="btn primary" id="smartLazy">💤 10分钟懒刷</button><button class="btn" id="smartDictation">🎧 听写</button><button class="btn" id="smartSlots">🧩 句型槽位</button><button class="btn" id="smartConfusion">⚡ 易混专项</button><span id="smartAdaptiveBadge">🧠 自适应回流</span>';
    row.after(bar);$('smartLazy').onclick=openLazy;$('smartDictation').onclick=openDictation;$('smartSlots').onclick=openSlots;$('smartConfusion').onclick=openConfusion;updateBadge();
  }

  document.addEventListener('click',event=>{
    const w=window.certificateUI?.currentWord?.();if(!w)return;
    const choice=event.target.closest?.('.vocabSwipeChoice');
    if(choice){const ok=choice.dataset.correct==='true';const wrong=ok?'':choice.textContent.replace(/^\s*(?:←\s*左|右\s*→)\s*/,'').trim();record(w,ok,'flow',wrong);return;}
    if(event.target.closest?.('#vocabReview')){record(w,false,'manual-review');return;}
    if(event.target.closest?.('#vocabKnown')){record(w,true,'known');return;}
    if(event.target.closest?.('#vocabCheck')){
      const id=w.id;setTimeout(()=>{const current=window.certificateUI?.currentWord?.();if(current?.id!==id)return;const fb=$('vocabFeedback');if(!fb||fb.hidden)return;if(fb.classList.contains('good'))record(w,true,'spell');else if(fb.classList.contains('bad'))record(w,false,'spell');},450);
    }
  },true);

  const style=document.createElement('style');style.textContent=`
  .smartPracticeBar{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:10px 0 14px}.smartPracticeBar .btn{min-height:38px}.smartPracticeBar span{font-size:12px;color:#756b80;margin-left:auto}
  .smartPracticeDialog{width:min(680px,calc(100vw - 24px));max-height:min(82vh,760px);border:0;border-radius:22px;padding:0;background:#fbf9fd;color:inherit;box-shadow:0 24px 80px rgba(42,26,58,.25)}.smartPracticeDialog::backdrop{background:rgba(35,24,44,.34);backdrop-filter:blur(3px)}
  .smartTop{display:flex;justify-content:space-between;gap:14px;align-items:flex-start;padding:18px 18px 10px}.smartTop h3{margin:0;font-size:20px}.smartTop p{margin:5px 0 0;color:#796e82;font-size:13px}#smartBody{padding:8px 18px 20px}
  .smartPrompt{font-size:clamp(26px,6vw,42px);font-weight:750;line-height:1.3;text-align:center;padding:28px 12px 16px}.smartPrompt.smartSentence{font-size:clamp(20px,4.2vw,30px);text-align:left}.smartHint{text-align:center;color:#7a6f82;min-height:22px}.smartMiniLabel{text-align:center;font-size:12px;color:#7a6f82;margin-top:8px}
  .smartOptions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:14px}.smartOptions button,.smartChips button{border:1px solid rgba(126,96,158,.18);background:#fff;color:inherit;border-radius:14px;padding:13px 12px;font:inherit}.smartOptions button.correct{background:#edf8ef;border-color:#8cc69a}.smartOptions button.wrong{background:#fff0f2;border-color:#dc9da8}.smartOptions button:disabled{opacity:.78}.smartChips{display:flex;gap:8px;flex-wrap:wrap}.smartChips button{padding:8px 12px;border-radius:999px}.smartChips button.active{background:#805ad5;color:#fff;border-color:#805ad5}
  .smartActions{display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin:12px 0}.smartFull{width:100%;margin-top:10px}.smartInput{margin-top:10px}.smartFeedback{margin-top:12px;padding:12px;border-radius:14px;background:#f1edf5}.smartFeedback.good{background:#edf8ef}.smartFeedback.bad{background:#fff0f2}.smartSessionMeta{display:flex;justify-content:space-between;color:#6f6477;font-size:13px}.smartFinish{text-align:center;padding:30px 8px}.smartFinish b{font-size:24px}
  @media(max-width:540px){.smartOptions{grid-template-columns:1fr}.smartPracticeBar span{width:100%;margin-left:0}.smartPracticeDialog{border-radius:18px}}
  `;document.head.append(style);

  window.englishSmartPractice={openLazy,openDictation,openSlots,openConfusion,promoteDue,dueCount};
  window.addEventListener('englishcertificaterender',()=>{installBar();promoteDue();});
  setInterval(promoteDue,60000);setTimeout(()=>{promoteDue();installBar();},120);
})();

