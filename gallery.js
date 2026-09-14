/* Photo globe. Web-sized previews and full images are configured in photos.js. */
(() => {
  'use strict';
  const gallery=document.querySelector('.gallery');
  const container=document.querySelector('#photos');
  const viewer=document.querySelector('#viewer');
  const fullPhoto=document.querySelector('#full-photo');
  const caption=document.querySelector('#caption');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const mobile=matchMedia('(max-width: 600px)');
  const swipePreview=document.createElement('img');
  swipePreview.className='swipe-preview';swipePreview.alt='';swipePreview.hidden=true;
  swipePreview.setAttribute('aria-hidden','true');fullPhoto.before(swipePreview);
  fullPhoto.draggable=false;
  let swipe=null,swipeBusy=false,swipeAnimations=[];
  const photos=window.GALLERY_PHOTOS||[];
  const orbit=window.PhotoOrbit;
  const cards=[];
  let keyboardInput=false;
  function setInputMode(keyboard){keyboardInput=keyboard;gallery.dataset.input=keyboard?'keyboard':'pointer';}
  setInputMode(false);
  document.addEventListener('pointerdown',()=>setInputMode(false),true);
  document.addEventListener('keydown',e=>{
    if(!e.altKey&&!e.ctrlKey&&!e.metaKey&&['Tab','Enter',' ','ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))setInputMode(true);
  },true);
  const orientation={yaw:.35,pitch:.18};
  const velocity={yaw:0,pitch:0};
  const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
  let width=1,height=1,active=null,frame=0,last=0,current=0,priorFocus=null;
  let paused=reduced.matches,opening=false,closing=false,photoAnimation=null,closeAnimation=null,viewerRevision=0;

  orbit.slots.forEach((slot,i)=>{
    if(!photos.length)return;
    const data=photos[i%photos.length];
    const el=document.createElement('button');
    el.type='button';el.className='photo';
    el.setAttribute('aria-label',`Enlarge ${data.alt}`);
    el.setAttribute('aria-haspopup','dialog');
    const img=document.createElement('img');
    img.src=data.thumb||data.src;img.alt=data.alt;img.draggable=false;
    img.decoding='async';
    if(data.width&&data.height){img.width=data.width;img.height=data.height;}
    el.append(img);container.append(el);
    const card={el,img,slot,index:i%photos.length,ratio:data.height/data.width||slot.ratio,lift:0,held:false};
    cards.push(card);
    // Pointer taps use pointerup because the gallery owns pointer capture.
    // Keyboard and accessibility activations use the native button click.
    el.addEventListener('click',e=>{if(e.detail===0&&!active&&!viewer.open)open(card);});
  });
  function measure(){
    width=gallery.clientWidth;height=gallery.clientHeight;
    cards.forEach(card=>{
      card.w=(width<600?104:clamp(width*.15,144,200))*card.slot.size;
      card.h=card.w*card.ratio;
      const maxHeight=width<600?160:252;
      if(card.h>maxHeight){card.w*=maxHeight/card.h;card.h=maxHeight;}
      card.el.style.setProperty('--w',`${card.w}px`);
      card.el.style.setProperty('--h',`${card.h}px`);
    });
    paint(0);
  }
  function stopVelocity(){velocity.yaw=velocity.pitch=0;}
  function paint(dt){
    const focused=keyboardInput&&(gallery.matches(':focus-visible')||container.querySelector(':focus-visible'));
    if(focused)stopVelocity();
    if(!active&&!viewer.open&&!focused){
      if(!paused)orientation.yaw+=dt*orbit.autoSpeed;
      if(!paused&&!reduced.matches){
        for(const axis of ['yaw','pitch']){
          const step=orbit.coast(velocity[axis],dt);
          orientation[axis]+=step.delta;velocity[axis]=step.velocity;
        }
        orientation.pitch=clamp(orientation.pitch,-.85,.85);
      }
    }
    cards.forEach(card=>{
      const p=orbit.project(card.slot,orientation,width,height);
      const target=card.held?1:0;
      card.lift+=(target-card.lift)*(reduced.matches?1:1-Math.exp(-dt/95));
      const scale=p.scale+(1.7-p.scale)*card.lift;
      card.el.style.transform=`translate(${p.x-card.w/2}px,${p.y-card.h/2}px) rotate(${p.tilt*(1-card.lift)}deg) scale(${scale})`;
      card.el.style.zIndex=card.held||card.lift>.05?100:10+Math.round(p.depth*70);
      card.el.dataset.depthLayer=String(p.layer+1);
      card.el.style.filter=`blur(${p.blur*(1-card.lift)}px)`;
      card.el.style.opacity=String(p.opacity+(1-p.opacity)*card.lift);
    });
  }
  function tick(time){const dt=last?Math.min(time-last,50):16;last=time;if(!viewer.open)paint(dt);frame=requestAnimationFrame(tick);}
  function begin(e){
    if(active||viewer.open||!e.isPrimary||e.button!==0)return;
    const button=e.target.closest('.photo');
    const card=cards.find(c=>c.el===button)||null;
    stopVelocity();
    active={id:e.pointerId,card,startX:e.clientX,startY:e.clientY,lastX:e.clientX,lastY:e.clientY,lastTime:e.timeStamp,moved:false};
    if(card){card.held=true;card.el.classList.add('is-held');}
    gallery.classList.add('is-dragging');
    gallery.setPointerCapture(e.pointerId);
  }
  function move(e){
    if(!active||e.pointerId!==active.id)return;
    const distance=Math.hypot(e.clientX-active.startX,e.clientY-active.startY);
    if(distance>6)active.moved=true;
    if(!active.moved)return;
    e.preventDefault();
    const dt=Math.max(8,e.timeStamp-active.lastTime);
    const dx=(e.clientX-active.lastX)*3.2/width;
    const dy=(e.clientY-active.lastY)*2.1/height;
    orientation.yaw+=dx;
    orientation.pitch=clamp(orientation.pitch+dy,-.85,.85);
    velocity.yaw=clamp(dx/dt,-.007,.007);
    velocity.pitch=clamp(dy/dt,-.004,.004);
    active.lastX=e.clientX;active.lastY=e.clientY;active.lastTime=e.timeStamp;
  }
  function release(cancelled=false,e){
    if(!active||(e&&e.pointerId!==active.id))return;
    const gesture=active;
    active=null;
    if(gesture.card){gesture.card.held=false;gesture.card.el.classList.remove('is-held');}
    gallery.classList.remove('is-dragging');
    if(cancelled||paused||reduced.matches||!gesture.moved||(e&&e.timeStamp-gesture.lastTime>100))stopVelocity();
    if(gallery.hasPointerCapture(gesture.id))gallery.releasePointerCapture(gesture.id);
    if(!cancelled&&!gesture.moved&&gesture.card)open(gesture.card);
  }
  gallery.addEventListener('pointerdown',begin);
  gallery.addEventListener('pointermove',move);
  gallery.addEventListener('pointerup',e=>release(false,e));
  gallery.addEventListener('pointercancel',e=>release(true,e));
  gallery.addEventListener('lostpointercapture',e=>release(true,e));
  gallery.addEventListener('dragstart',e=>e.preventDefault());
  gallery.addEventListener('keydown',e=>{
    if(viewer.open)return;
    const directions={ArrowLeft:['yaw',-.16],ArrowRight:['yaw',.16],ArrowUp:['pitch',-.12],ArrowDown:['pitch',.12]};
    const step=directions[e.key];
    if(step){e.preventDefault();stopVelocity();orientation[step[0]]+=step[1];orientation.pitch=clamp(orientation.pitch,-.85,.85);paint(0);}
  });

  function show(index,useThumbnail=false){
    current=(index+photos.length)%photos.length;
    const p=photos[current];
    fullPhoto.src=useThumbnail?(p.thumb||p.src):p.src;fullPhoto.alt=p.alt;
    if(p.width&&p.height){fullPhoto.width=p.width;fullPhoto.height=p.height;}
    caption.textContent=p.caption||'';
    caption.hidden=!p.caption;
    viewer.setAttribute('aria-label',p.caption||p.alt);
    for(const delta of [-1,1]){const img=new Image();img.src=photos[(current+delta+photos.length)%photos.length].src;img.decode().catch(()=>{});}
  }
  function animateFrom(rect){
    if(reduced.matches)return;
    const end=fullPhoto.getBoundingClientRect();
    if(!rect.width||!end.width||!end.height)return;
    photoAnimation?.cancel();
    photoAnimation=fullPhoto.animate([
      {transformOrigin:'0 0',transform:`translate(${rect.left-end.left}px,${rect.top-end.top}px) scale(${rect.width/end.width},${rect.height/end.height})`,borderRadius:'24px'},
      {transformOrigin:'0 0',transform:'none',borderRadius:'24px'}
    ],{duration:300,easing:'cubic-bezier(.2,.75,.2,1)'});
  }
  async function open(card){
    if(viewer.open||opening)return;
    opening=true;
    stopVelocity();priorFocus=card.el;
    const start=card.el.getBoundingClientRect();
    const revision=++viewerRevision;
    const p=photos[card.index];
    const sharp=new Image();sharp.src=p.src;
    const ready=sharp.decode().then(()=>true,()=>false);
    // Decode the selected, cached thumbnail before exposing the reused image.
    // Otherwise browsers may briefly paint the previously opened photo.
    show(card.index,true);
    await fullPhoto.decode().catch(()=>{});
    if(revision!==viewerRevision){opening=false;return;}
    viewer.showModal();document.body.style.overflow='hidden';opening=false;
    animateFrom(start);
    // Upgrade only after decoding, without delaying or restarting the opening.
    if(await ready){
      if(viewer.open&&!closing&&revision===viewerRevision)fullPhoto.src=p.src;
    }
  }
  async function close(){
    if(closing||!viewer.open)return;
    closing=true;++viewerRevision;resetSwipe();photoAnimation?.cancel();
    if(!reduced.matches){
      const from=fullPhoto.getBoundingClientRect();
      const matching=cards.find(c=>c.index===current&&c.el===priorFocus)||cards.find(c=>c.index===current);
      const to=matching?.el.getBoundingClientRect();
      if(to?.width&&from.width){
        const animation=closeAnimation=fullPhoto.animate([
          {transformOrigin:'0 0',transform:'none',opacity:1},
          {transformOrigin:'0 0',transform:`translate(${to.left-from.left}px,${to.top-from.top}px) scale(${to.width/from.width},${to.height/from.height})`,opacity:.3}
        ],{duration:260,easing:'cubic-bezier(.4,0,.2,1)',fill:'forwards'});
        await animation.finished.catch(()=>{});animation.cancel();closeAnimation=null;
      }
    }
    viewer.close();closing=false;
  }
  document.querySelector('.close').addEventListener('click',close);
  viewer.addEventListener('click',e=>{
    // Empty figure space and captions are also outside the photo.
    // Preserve image gestures and explicit navigation controls.
    if(e.target.closest('button')||e.target===fullPhoto||e.target===swipePreview||swipe||swipeBusy)return;
    close();
  });
  viewer.addEventListener('cancel',e=>{e.preventDefault();close();});
  viewer.addEventListener('close',()=>{++viewerRevision;resetSwipe();photoAnimation?.cancel();document.body.style.overflow='';priorFocus?.focus({preventScroll:true});});
  function resetSwipe(){
    const gesture=swipe;swipe=null;swipeBusy=false;
    if(gesture&&fullPhoto.hasPointerCapture(gesture.id))fullPhoto.releasePointerCapture(gesture.id);
    swipeAnimations.forEach(a=>a.cancel());swipeAnimations=[];
    fullPhoto.style.transform='';fullPhoto.style.opacity='';swipePreview.hidden=true;
    swipePreview.style.transform='';swipePreview.style.opacity='';
  }
  function preview(delta){
    const next=photos[(current+delta+photos.length)%photos.length];
    if(swipePreview.getAttribute('src')!==next.src)swipePreview.src=next.src;
    swipePreview.hidden=false;
  }
  async function finishSwipe(delta,dx=0,dy=0){
    if(swipeBusy||closing||!viewer.open)return;
    swipeBusy=true;const revision=++viewerRevision;photoAnimation?.cancel();
    const turn=reduced.matches?0:clamp(dx/innerWidth*18,-16,16);
    if(delta){preview(delta);swipePreview.decode().catch(()=>{});}
    if(!reduced.matches){
      const start=`translate(${dx}px,${dy}px) rotate(${turn}deg)`;
      const end=delta?`translate(${-delta*(innerWidth+fullPhoto.clientWidth)}px,${dy}px) rotate(${-delta*18}deg)`:'none';
      const animation=fullPhoto.animate([{transform:start,opacity:1},{transform:end,opacity:delta?0:1}],{duration:delta?300:280,easing:'cubic-bezier(.2,.8,.2,1)',fill:'forwards'});
      const under=swipePreview.animate([{transform:swipePreview.style.transform||'scale(.94)',opacity:swipePreview.style.opacity||'0'},{transform:delta?'scale(1)':'scale(.94)',opacity:delta?1:0}],{duration:300,easing:'cubic-bezier(.2,.8,.2,1)',fill:'forwards'});
      swipeAnimations=[animation,under];await animation.finished.catch(()=>{});
    }
    if(revision!==viewerRevision||!viewer.open||closing)return;
    if(delta){
      show(current+delta);
      // Keep the already-visible incoming card over the image while it decodes.
      await fullPhoto.decode().catch(()=>{});
      if(revision!==viewerRevision||!viewer.open||closing)return;
    }
    resetSwipe();
  }
  fullPhoto.addEventListener('pointerdown',e=>{
    if((!mobile.matches&&e.pointerType!=='touch')||!viewer.open||closing||swipeBusy||swipe||!e.isPrimary||e.button!==0)return;
    ++viewerRevision;photoAnimation?.cancel();
    swipe={id:e.pointerId,x:e.clientX,y:e.clientY,dx:0,dy:0,lastX:e.clientX,lastTime:e.timeStamp,speed:0};
    fullPhoto.setPointerCapture(e.pointerId);
  });
  fullPhoto.addEventListener('pointermove',e=>{
    if(!swipe||e.pointerId!==swipe.id)return;e.preventDefault();
    swipe.dx=e.clientX-swipe.x;swipe.dy=clamp((e.clientY-swipe.y)*.25,-45,45);
    swipe.speed=(e.clientX-swipe.lastX)/Math.max(8,e.timeStamp-swipe.lastTime);
    swipe.lastX=e.clientX;swipe.lastTime=e.timeStamp;
    const progress=clamp(Math.abs(swipe.dx)/(innerWidth*.35),0,1);
    preview(swipe.dx<=0?1:-1);
    fullPhoto.style.transform=`translate(${swipe.dx}px,${swipe.dy}px) rotate(${reduced.matches?0:clamp(swipe.dx/innerWidth*18,-16,16)}deg)`;
    swipePreview.style.transform=`scale(${.94+progress*.06})`;swipePreview.style.opacity=String(progress);
  });
  function releaseSwipe(e,cancelled=false){
    if(!swipe||e.pointerId!==swipe.id)return;
    const g=swipe;swipe=null;
    if(fullPhoto.hasPointerCapture(g.id))fullPhoto.releasePointerCapture(g.id);
    const fast=e.timeStamp-g.lastTime<100&&Math.abs(g.speed)>.5&&Math.abs(g.dx)>24&&Math.sign(g.speed)===Math.sign(g.dx);
    const commit=!cancelled&&(Math.abs(g.dx)>Math.min(innerWidth*.22,110)||fast);
    finishSwipe(commit?(g.dx<0?1:-1):0,g.dx,g.dy);
  }
  fullPhoto.addEventListener('pointerup',e=>releaseSwipe(e));
  fullPhoto.addEventListener('pointercancel',e=>releaseSwipe(e,true));
  fullPhoto.addEventListener('lostpointercapture',e=>releaseSwipe(e,true));
  fullPhoto.addEventListener('dragstart',e=>e.preventDefault());
  function navigate(delta){if(closing||swipeBusy||swipe)return;finishSwipe(delta);}
  let wheelAmount=0,wheelLast=0,wheelLocked=false;
  viewer.addEventListener('wheel',e=>{
    if(mobile.matches||!viewer.open||e.ctrlKey)return;
    e.preventDefault();
    const now=performance.now();
    // Require a fresh gesture after momentum settles, not just animation end.
    if(now-wheelLast>220){wheelAmount=0;wheelLocked=false;}
    wheelLast=now;
    if(wheelLocked||swipeBusy||closing)return;
    const delta=(Math.abs(e.deltaY)>=Math.abs(e.deltaX)?e.deltaY:e.deltaX)*(e.deltaMode===1?16:e.deltaMode===2?innerHeight:1);
    if(Math.sign(delta)!==Math.sign(wheelAmount))wheelAmount=0;
    wheelAmount+=delta;
    if(Math.abs(wheelAmount)>=45){wheelLocked=true;navigate(wheelAmount>0?1:-1);wheelAmount=0;}
  },{passive:false});
  viewer.addEventListener('close',()=>{wheelAmount=0;wheelLast=0;wheelLocked=false;});
  document.querySelector('#previous').addEventListener('click',()=>navigate(-1));
  document.querySelector('#next').addEventListener('click',()=>navigate(1));
  viewer.addEventListener('keydown',e=>{if(e.key==='ArrowRight'){e.preventDefault();navigate(1);}if(e.key==='ArrowLeft'){e.preventDefault();navigate(-1);}});
  const pauseButton=document.querySelector('#pause');
  function syncPause(){pauseButton.textContent=paused?'Play':'Pause';pauseButton.setAttribute('aria-pressed',String(paused));}
  pauseButton.addEventListener('click',()=>{paused=!paused;stopVelocity();syncPause();});
  reduced.addEventListener('change',()=>{
    ++viewerRevision;resetSwipe();
    paused=reduced.matches;stopVelocity();syncPause();
    if(reduced.matches){photoAnimation?.cancel();closeAnimation?.cancel();}
  });
  syncPause();
  mobile.addEventListener('change',()=>{++viewerRevision;resetSwipe();measure();});
  new ResizeObserver(measure).observe(gallery);
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden){release(true);stopVelocity();cancelAnimationFrame(frame);last=0;}
    else frame=requestAnimationFrame(tick);
  });
  measure();frame=requestAnimationFrame(tick);
})();
