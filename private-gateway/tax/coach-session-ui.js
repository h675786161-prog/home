/* Tax one-to-one lesson UI. Public shell only: no credentials or private study data live here. */
(function(){
  'use strict';
  const UI_ID='taxCoachSessionUI';
  const byId=id=>document.getElementById(id);
  const safe=(fn,fallback=null)=>{try{return fn()}catch{return fallback}};

  function subjectId(){
    const selected=byId('chatSubject')?.value;
    if(selected)return selected;
    if(typeof state!=='undefined'&&state?.coachSubject)return state.coachSubject;
    return safe(()=>guideUnit(ensureStudy().focusUnit)?.subject,'tax1')||'tax1';
  }
  function subjectName(id){return safe(()=>SUBJECTS.find(s=>s.id===id)?.name,id)||id}
  function isDue(memory,g){
    return !!(memory?.seen&&((Number.isFinite(memory.dueAt)&&Date.now()>=memory.dueAt)||(Number.isFinite(memory.dueAttempt)&&Number(g?.attempts||0)>=memory.dueAttempt)));
  }
  function lessonPlan(){
    const sid=subjectId(),g=safe(()=>ensureStudy(),{})||{},units=safe(()=>guideUnits(sid),[])||[],focus=safe(()=>guideUnit(g.focusUnit));
    let chosen=null,reason='按当前阶段继续往前学';
    if(focus&&focus.subject===sid&&safe(()=>guideUnitStatus(focus.id))!=='verified'){chosen=focus;reason='接着你当前正在学的内容'}
    if(!chosen){chosen=units.find(u=>isDue(g.memory?.[u.id],g)&&safe(()=>guideUnitStatus(u.id))!=='verified');if(chosen)reason='这个知识点到复习时间了'}
    if(!chosen){chosen=units.find(u=>safe(()=>guideUnitStatus(u.id))==='weak');if(chosen)reason='这里之前有点卡，先把它讲顺'}
    if(!chosen){chosen=units.find(u=>!g.memory?.[u.id]?.seen);if(chosen)reason='这是当前最合适的新知识点'}
    if(!chosen)chosen=units[0]||null;
    const due=units.filter(u=>isDue(g.memory?.[u.id],g)&&safe(()=>guideUnitStatus(u.id))!=='verified').length;
    const weak=units.filter(u=>safe(()=>guideUnitStatus(u.id))==='weak').length;
    return {name:subjectName(sid),title:chosen?(chosen.title||chosen.section||chosen.chapter||'继续学习'):'继续当前进度',path:chosen?[chosen.chapter,chosen.section].filter(Boolean).join(' · '):subjectName(sid),reason,due,weak};
  }
  function send(text){if(typeof sendChat==='function')sendChat(text)}
  function refresh(){
    const root=byId(UI_ID);if(!root)return;
    const p=lessonPlan(),title=root.querySelector('[data-role=lesson-title]'),meta=root.querySelector('[data-role=lesson-meta]'),reason=root.querySelector('[data-role=lesson-reason]');
    if(title)title.textContent=p.title;
    if(meta)meta.textContent=[p.name,p.path].filter(Boolean).join(' · ');
    if(reason){const bits=[p.reason];if(p.due)bits.push(`${p.due} 个待复习`);if(p.weak)bits.push(`${p.weak} 个薄弱点`);reason.textContent=bits.join(' · ')}
    const start=root.querySelector('[data-action=start]');
    const hasHistory=typeof state!=='undefined'&&Array.isArray(state?.coachChat)&&state.coachChat.length>0;
    if(start)start.textContent=hasHistory?'▶ 继续上课':'▶ 开始上课';
  }
  function mount(){
    const page=byId('page-ai'),chat=page?.querySelector('.coach-chat'),tools=chat?.querySelector('.coach-tools');
    if(!page||!chat||!tools||byId(UI_ID))return;
    const style=document.createElement('style');style.id=UI_ID+'Style';style.textContent=`
      .taxCoachBrief{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:12px;align-items:center;padding:14px 15px;margin-bottom:12px;border:1px solid var(--line);border-radius:17px;background:linear-gradient(135deg,#fffdfd,#f5eef2)}
      .taxCoachAvatar{width:42px;height:42px;border-radius:14px;display:grid;place-items:center;background:var(--accent);color:#fff;font-weight:900;box-shadow:0 8px 24px rgba(88,61,74,.12)}
      .taxCoachBriefText{min-width:0}.taxCoachBriefText b{display:block;font-size:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.taxCoachBriefMeta,.taxCoachBriefReason{font-size:12px;color:var(--muted);margin-top:3px;line-height:1.45}.taxCoachStart{white-space:nowrap}
      .taxCoachReplies{display:flex;gap:8px;flex-wrap:wrap;padding:0 0 12px}.taxCoachReplies button{border:1px solid var(--line);background:#fff;padding:8px 11px;border-radius:999px;color:#665b63;font-size:12px;min-height:38px}.taxCoachReplies button:hover{background:var(--panel2)}.taxCoachReplies button[data-kind=understood]{border-color:#cad9cf;color:#557260;background:#f5faf7}
      #page-ai .coach-tools>.btn{display:none}
      @media(max-width:720px){.taxCoachBrief{grid-template-columns:auto minmax(0,1fr)}.taxCoachStart{grid-column:1/-1;width:100%;min-height:44px}.taxCoachReplies{overflow-x:auto;flex-wrap:nowrap;padding-bottom:10px;scrollbar-width:none}.taxCoachReplies::-webkit-scrollbar{display:none}.taxCoachReplies button{flex:0 0 auto}}
    `;document.head.appendChild(style);
    const brief=document.createElement('div');brief.id=UI_ID;brief.className='taxCoachBrief';brief.innerHTML='<div class="taxCoachAvatar">七</div><div class="taxCoachBriefText"><b data-role="lesson-title">老师正在看你的学习进度…</b><div class="taxCoachBriefMeta" data-role="lesson-meta"></div><div class="taxCoachBriefReason" data-role="lesson-reason"></div></div><button class="btn primary taxCoachStart" type="button" data-action="start">▶ 开始上课</button>';tools.parentNode.insertBefore(brief,tools);
    const replies=document.createElement('div');replies.className='taxCoachReplies';replies.innerHTML='<button type="button" data-action="simpler">没听懂</button><button type="button" data-action="example">举个例子</button><button type="button" data-action="continue">继续讲</button><button type="button" data-action="understood" data-kind="understood">这点懂了 ✓</button>';tools.insertAdjacentElement('afterend',replies);
    brief.querySelector('[data-action=start]').onclick=()=>send('现在开始这节一对一带学。请根据我当前科目、最近学习状态和正在学的内容，主动选最合适的一小步开始讲。先讲一个小知识点，加一个很短的例子，这轮先别出题，等我回应。');
    replies.querySelector('[data-action=simpler]').onclick=()=>send('这里我没听懂。先判断我可能卡在哪个前置概念，再换一种更简单、更生活化的说法讲一次，先别出题。');
    replies.querySelector('[data-action=example]').onclick=()=>send('给我换一个具体的小例子，把刚才这个点套进去讲清楚。不要扩展新知识，先把这一点讲透。');
    replies.querySelector('[data-action=continue]').onclick=()=>send('接着刚才继续讲，仍然一次只走一小步。如果刚才这一点已经讲完，就自然进入最相邻的下一点。');
    replies.querySelector('[data-action=understood]').onclick=()=>send('这点我懂了。根据刚才的对话判断下一步：如果确实需要确认理解，只问我一个很小的问题；如果没必要，就直接衔接下一个最相关的小知识点。');
    byId('chatSubject')?.addEventListener('change',()=>setTimeout(refresh,0));
    document.querySelectorAll('[data-page="ai"]').forEach(btn=>btn.addEventListener('click',()=>setTimeout(refresh,0)));
    const messages=byId('messages');if(messages)new MutationObserver(refresh).observe(messages,{childList:true});
    refresh();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();
