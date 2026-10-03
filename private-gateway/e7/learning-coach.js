/* Proactive learning coach: turns progress + exam plan into one concrete next route. */
(()=>{
  'use strict';
  if(window.__englishLearningCoach)return;
  window.__englishLearningCoach=1;

  const INTENSITY={
    low:{label:'脑子死了',newCap:8,reviewCap:12,note:'今天只保住手感，不追求英雄事迹。'},
    normal:{label:'正常',newCap:22,reviewCap:24,note:'新内容和回流各吃一点，别让任何一边发霉。'},
    high:{label:'狠狠塞',newCap:45,reviewCap:40,note:'量可以上去，但错词仍然优先，禁止无脑刷数量。'}
  };
  const KEY='lazyEnglishCoachIntensity';
  const $=id=>document.getElementById(id);
  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const goal=()=>{try{return typeof getGoal==='function'?getGoal():String($('certificateSelect')?.value||'C1');}catch{return 'C1';}};
  const todayKey=()=>new Date().toLocaleDateString('sv-SE');
  const intensity=()=>INTENSITY[localStorage.getItem(KEY)]?localStorage.getItem(KEY):'normal';

  function examPlan(){
    try{return typeof loadExamPlan==='function'?(loadExamPlan()||{}):{};}catch{return {};}
  }
  function daysLeft(date){
    if(!date)return null;
    try{return typeof daysUntil==='function'?daysUntil(date):Math.ceil((new Date(date+'T00:00:00')-new Date().setHours(0,0,0,0))/86400000);}catch{return null;}
  }
  function progress(){
    const level=goal();
    const bank=Array.isArray(CERT_VOCAB?.[level])?CERT_VOCAB[level]:[];
    const p=state?.certificates?.[level]||{};
    const learned=p.learned||{},review=p.review||{};
    const known=bank.reduce((n,w)=>n+(learned[w.id]?1:0),0);
    const due=bank.reduce((n,w)=>n+(review[w.id]?1:0),0);
    const seenIds=new Set(Object.keys(state?.smartPractice?.items||{}).filter(k=>k.startsWith(level+':')).map(k=>k.slice(level.length+1)));
    const practiced=bank.reduce((n,w)=>n+(seenIds.has(w.id)?1:0),0);
    const today=Object.keys(state?.dailyDone?.[todayKey()]||{}).length;
    const fullReady=!!(window.englishFullVocab?.loaded?.(level)||bank.length>100);
    return {level,bank,total:bank.length,known,due,practiced,today,fullReady,p};
  }
  function weakWords(s){
    const items=state?.smartPractice?.items||{};
    const prefix=s.level+':';
    const ranked=Object.entries(items)
      .filter(([k,r])=>k.startsWith(prefix)&&Number(r?.wrong||0)>0)
      .sort((a,b)=>(Number(b[1]?.wrong||0)-Number(a[1]?.wrong||0))||((Number(b[1]?.last||0))-(Number(a[1]?.last||0))))
      .slice(0,3)
      .map(([k])=>{
        const id=k.slice(prefix.length);return s.bank.find(w=>w.id===id)?.word||'';
      }).filter(Boolean);
    return ranked;
  }
  function route(s){
    const mode=INTENSITY[intensity()];const plan=examPlan();const left=daysLeft(plan.targetDate);
    const remaining=Math.max(0,s.total-s.known);
    let newTarget=mode.newCap;
    if(left!==null&&left>0&&s.fullReady){
      const learningDays=Math.max(1,Math.floor(left*.65));
      newTarget=Math.min(mode.newCap,Math.max(4,Math.ceil(remaining/learningDays)));
    }
    const reviewTarget=Math.min(mode.reviewCap,s.due);
    const weak=weakWords(s);
    const steps=[];
    if(reviewTarget>0)steps.push({icon:'🧠',title:'先回流 '+reviewTarget+' 个',sub:'把待复习清掉一截，避免旧洞越滚越大。'});
    else steps.push({icon:'🌊',title:'先刷 '+newTarget+' 个新内容',sub:s.fullReady?'从完整词库里扩覆盖，不准又围着二十几个词打转。':'完整词库还在后台补，先维持手感。'});
    steps.push({icon:'🎧',title:'补一轮听写',sub:'把“眼熟”逼成“耳朵也认得”，防止只会看不会听。'});
    if(plan.registered||((left??999)<=60))steps.push({icon:'📝',title:'加一段考试输出',sub:'临近考试不能只刷词，至少碰一次模拟题或写作。'});
    else steps.push({icon:'🧩',title:'做句型槽位 / 易混专项',sub:'让词回到句子里，不然词表背完也只是仓库盘点。'});
    return {mode,plan,left,newTarget,reviewTarget,weak,steps};
  }

  function install(){
    if($('learningCoach'))return $('learningCoach');
    const nav=document.querySelector('.learningNav');if(!nav)return null;
    const box=document.createElement('section');box.id='learningCoach';box.className='learningCoach';nav.after(box);return box;
  }
  function openGoalPlanner(){
    const panel=$('goalPanel');if(panel){panel.classList.add('show');panel.scrollIntoView({behavior:'smooth',block:'start'});}
  }
  function openVocab(){
    const tab=document.querySelector('#learningTabs [data-view="vocab"]');tab?.click();
  }
  function startMain(s,r){
    openVocab();
    setTimeout(()=>{
      const api=window.englishSmartPractice;
      if(api?.openLazy){api.openLazy();return;}
      const flow=document.querySelector('[data-vocab-mode="flow"]');flow?.click();
      try{toast?.('先从词流开始，专项模块加载好后会自动出现');}catch{}
    },80);
  }
  function bind(box,s,r){
    box.querySelectorAll('[data-intensity]').forEach(button=>button.onclick=()=>{
      localStorage.setItem(KEY,button.dataset.intensity);render(true);
    });
    box.querySelector('[data-coach-start]')?.addEventListener('click',()=>startMain(s,r));
    box.querySelector('[data-coach-dictation]')?.addEventListener('click',()=>{openVocab();setTimeout(()=>window.englishSmartPractice?.openDictation?.(),80);});
    box.querySelector('[data-coach-plan]')?.addEventListener('click',openGoalPlanner);
    box.querySelector('[data-coach-refresh]')?.addEventListener('click',()=>render(true));
    const details=box.querySelector('.coachDetails');
    if(details)details.ontoggle=()=>localStorage.setItem('lazyEnglishCoachExpanded',details.open?'1':'0');
  }
  function render(force=false){
    const box=install();if(!box)return;
    const s=progress(),r=route(s),modeKey=intensity();
    const coverage=s.total?Math.round(s.known/s.total*100):0;
    const exam=r.plan.targetDate?(r.left===null?'考试日已设':r.left>0?'距考试 '+r.left+' 天':r.left===0?'今天考试':'考试日期已过'):'还没锁考试日';
    const weak=r.weak.length?'最近最该收拾：'+r.weak.join(' · '):'暂时没有形成明显的顽固错词。';
    const signature=[s.level,s.total,s.known,s.due,s.today,r.left,r.plan.registered,modeKey,r.weak.join('|'),window.englishFullVocab?.loaded?.(s.level)].join(':');
    if(!force&&box.dataset.signature===signature)return;box.dataset.signature=signature;
    const expanded=box.querySelector('.coachDetails')?.open??(localStorage.getItem('lazyEnglishCoachExpanded')==='1');
    box.innerHTML=`
      <div class="coachHead"><div><b>🧭 七的学习教练</b><span>${esc(s.level)} · ${esc(exam)}</span></div><button type="button" class="coachGhost" data-coach-refresh aria-label="刷新今日学习路线">↻</button></div>
      <div class="coachCompact"><p><strong>${s.total.toLocaleString()} 个词 / 词块</strong><span>待复习 ${s.due} · 已熟悉 ${coverage}% · 今天 ${s.today} 项</span></p><button type="button" class="btn primary" data-coach-start>开始 10 分钟</button></div>
      <details class="coachDetails" ${expanded?'open':''}><summary>今日路线 / 学习强度 <span>${esc(r.mode.label)}</span></summary>
      <div class="coachIntensity"><span>今天强度</span>${Object.entries(INTENSITY).map(([k,v])=>`<button type="button" data-intensity="${k}" class="${k===modeKey?'active':''}">${esc(v.label)}</button>`).join('')}</div>
      <p class="coachNote">${esc(r.mode.note)} ${esc(weak)}</p>
      <div class="coachRoute">${r.steps.map((x,i)=>`<div class="coachStep"><i>${i+1}</i><span>${x.icon}</span><div><b>${esc(x.title)}</b><small>${esc(x.sub)}</small></div></div>`).join('')}</div>
      <div class="coachActions"><button type="button" class="btn" data-coach-dictation>🎧 直接听写</button><button type="button" class="btn" data-coach-plan>${r.plan.targetDate?'📅 调整考试计划':'📅 先定考试日'}</button></div>
      <div class="coachFoot">${s.fullReady?'完整词库已接入今日规划。':'词库正在补全，先练当前内容。'}</div></details>`;
    bind(box,s,r);
  }

  const style=document.createElement('style');style.textContent=`
    .learningCoach{background:linear-gradient(145deg,rgba(255,255,255,.96),rgba(246,240,253,.96));border:1px solid #eadff2;border-radius:20px;padding:14px;margin:0 0 13px;box-shadow:0 8px 24px rgba(70,48,95,.07)}
    .coachHead{display:flex;justify-content:space-between;align-items:flex-start;gap:10px}.coachHead b{display:block;font-size:15px}.coachHead span{display:block;color:var(--muted);font-size:11px;margin-top:3px}.coachGhost{border:0;background:#f1eaf7;color:#705786;border-radius:999px;width:34px;height:34px;font-size:14px}
    .coachSummary{display:grid;grid-template-columns:repeat(4,1fr);gap:7px;margin:11px 0}.coachSummary div{background:#fff;border:1px solid #eee7f4;border-radius:12px;padding:8px;text-align:center}.coachSummary strong{display:block;font-size:14px}.coachSummary span{display:block;font-size:10px;color:var(--muted);margin-top:2px}
    .coachIntensity{display:flex;align-items:center;gap:6px;flex-wrap:wrap}.coachIntensity>span{font-size:11px;color:var(--muted);margin-right:2px}.coachIntensity button{border:1px solid #e6dced;background:#fff;color:#6c5878;border-radius:999px;padding:7px 9px;font:inherit;font-size:11px}.coachIntensity button.active{background:#765a92;color:#fff;border-color:#765a92}.coachNote{font-size:11px!important;line-height:1.55!important;color:#74677d;margin:9px 0!important}
    .coachRoute{display:grid;gap:7px}.coachStep{display:grid;grid-template-columns:25px 24px 1fr;align-items:center;gap:7px;background:rgba(255,255,255,.72);border:1px solid #eee7f4;border-radius:13px;padding:8px}.coachStep i{width:24px;height:24px;border-radius:50%;display:grid;place-items:center;background:#eee5f7;color:#6b5182;font:700 11px system-ui;font-style:normal}.coachStep>span{font-size:18px}.coachStep b{display:block;font-size:12px}.coachStep small{display:block;color:var(--muted);font-size:10px;line-height:1.4;margin-top:2px}
    .coachActions{display:flex;gap:7px;flex-wrap:wrap;margin-top:10px}.coachActions .btn{min-height:40px;padding:8px 10px;font-size:11px;flex:1;min-width:120px}.coachFoot{font-size:10px;color:#8a7d91;margin-top:8px}
    .coachHead span{font-size:13px}.coachGhost{width:40px;height:40px}.coachCompact{display:flex;align-items:center;gap:14px;margin:8px 0}.coachCompact p{margin:0!important;flex:1;line-height:1.6!important;font-size:14px!important}.coachCompact strong,.coachCompact span{display:block}.coachCompact span{color:var(--muted);font-size:13px}.coachCompact .btn{font-size:14px;min-height:44px;white-space:nowrap}
    .coachDetails{border-top:1px solid #eadff2;margin-top:10px}.coachDetails summary{cursor:pointer;min-height:42px;padding:10px 0;font-size:14px;color:#675078}.coachDetails summary>span{float:right;color:var(--muted);font-size:13px}.coachDetails .coachIntensity{margin-top:7px}.coachIntensity button{font-size:14px;min-height:40px}.coachIntensity>span{font-size:14px}.coachNote{font-size:14px!important}.coachStep b{font-size:14px}.coachStep small{font-size:13px;line-height:1.6}.coachActions .btn{font-size:14px;min-height:44px}.coachFoot{font-size:12px}
    @media(max-width:520px){.coachSummary{grid-template-columns:1fr 1fr}.coachActions .btn{min-width:45%}}
  `;document.head.append(style);

  document.addEventListener('click',event=>{
    if(event.target.closest?.('#vocabKnown,#vocabReview,#vocabFlowNext,.vocabSwipeChoice,#smartCheck,#smartLazyNext,#mockSubmit,#registerExam,#chooseExam'))setTimeout(()=>render(true),350);
  },true);
  document.addEventListener('change',event=>{if(event.target?.id==='certificateSelect')setTimeout(()=>render(true),180);},true);
  window.addEventListener('online',()=>setTimeout(()=>render(true),600));
  window.addEventListener('englishvocabularchange',()=>render(true));
  setInterval(()=>render(false),5000);
  setTimeout(()=>render(true),250);
})();
