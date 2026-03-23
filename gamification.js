/* Chess Playbook — Gamification Layer */
(function(){
'use strict';
window.Gami = {};
var LEVELS = [
  {name:'Pawn',xp:0,emoji:'\u265F'},{name:'Knight',xp:100,emoji:'\u265E'},
  {name:'Bishop',xp:250,emoji:'\u265D'},{name:'Rook',xp:500,emoji:'\u265C'},
  {name:'Queen',xp:1000,emoji:'\u265B'},{name:'King',xp:2000,emoji:'\u265A'}
];
var XP_REWARDS = {
  pageVisit:5,markRead:10,markLearned:25,winGame:15,loseGame:3,
  quizCorrect:10,quizComplete:20,trainerDrill:15,dailyLogin:5,streakBonus:10
};
/* Helpers */
function $(sel,ctx){return (ctx||document).querySelector(sel);}
function today(){return new Date().toISOString().slice(0,10);}
function lsGet(k,def){try{var v=localStorage.getItem(k);return v?JSON.parse(v):def;}catch(e){return def;}}
function lsSet(k,v){try{localStorage.setItem(k,JSON.stringify(v));}catch(e){}}
/* State accessors */
function getXP(){return lsGet('chess-gami-xp',0);}
function setXP(n){lsSet('chess-gami-xp',n);}
function getLevelIdx(){return lsGet('chess-gami-level',0);}
function setLevelIdx(n){lsSet('chess-gami-level',n);}
function getStreak(){return lsGet('chess-gami-streak',{current:0,longest:0,lastDate:''});}
function setStreak(s){lsSet('chess-gami-streak',s);}
function getProgress(){return lsGet('chess-gami-progress',{});}
function setProgress(p){lsSet('chess-gami-progress',p);}
function getDaily(){return lsGet('chess-gami-daily',{date:'',pages:[],xpEarned:0});}
function setDaily(d){lsSet('chess-gami-daily',d);}
function getStats(){return lsGet('chess-gami-stats',{totalWins:0,totalLosses:0,gamesPlayed:0,quizzesDone:0});}
function setStats(s){lsSet('chess-gami-stats',s);}

function currentPage(){
  var p = location.pathname.replace(/^\//,'').replace(/\.html$/,'');
  return p || 'playbook';
}
function currentLevel(){return LEVELS[getLevelIdx()]||LEVELS[0];}
function nextLevel(){var i=getLevelIdx();return i<LEVELS.length-1?LEVELS[i+1]:null;}

/* XP System */
function addXP(amount){
  var xp = getXP()+amount; setXP(xp);
  var d=getDaily();d.xpEarned+=amount;setDaily(d);
  showToast('+'+amount+' XP');
  var cur=getLevelIdx();
  for(var i=LEVELS.length-1;i>=0;i--){
    if(xp>=LEVELS[i].xp){if(i>cur){setLevelIdx(i);triggerLevelUp(LEVELS[i]);}break;}
  }
}
Gami.addXP = addXP;

/* Streak */
function checkStreak(){
  var s=getStreak(),t=today();
  if(s.lastDate===t) return;
  var y=new Date();y.setDate(y.getDate()-1);var yStr=y.toISOString().slice(0,10);
  if(s.lastDate===yStr){
    s.current++;addXP(XP_REWARDS.dailyLogin);
    if(s.current>3) addXP(XP_REWARDS.streakBonus*(s.current-3));
  } else { s.current=1;addXP(XP_REWARDS.dailyLogin); }
  if(s.current>s.longest) s.longest=s.current;
  s.lastDate=t;setStreak(s);
  var d=getDaily();if(d.date!==t) setDaily({date:t,pages:[],xpEarned:0});
}

/* Page Visit Tracking */
function trackPageVisit(){
  var page=currentPage(),prog=getProgress(),d=getDaily();
  if(d.date!==today()) d={date:today(),pages:[],xpEarned:0};
  if(!prog[page]) prog[page]='visited';
  if(d.pages.indexOf(page)===-1){d.pages.push(page);addXP(XP_REWARDS.pageVisit);}
  setProgress(prog);setDaily(d);
}

/* Bear Mascot */
var bearSVG='<svg viewBox="0 0 60 60" width="36" height="36" xmlns="http://www.w3.org/2000/svg">'
  +'<circle cx="16" cy="16" r="10" fill="#6B4F12"/><circle cx="44" cy="16" r="10" fill="#6B4F12"/>'
  +'<circle cx="16" cy="16" r="6" fill="#8B6914"/><circle cx="44" cy="16" r="6" fill="#8B6914"/>'
  +'<circle cx="30" cy="33" r="20" fill="#8B6914"/>'
  +'<circle cx="22" cy="29" r="2.5" fill="#1a1a1a"/><circle cx="38" cy="29" r="2.5" fill="#1a1a1a"/>'
  +'<ellipse cx="30" cy="37" rx="4" ry="3" fill="#6B4F12"/>'
  +'<path d="M25 42 Q30 46 35 42" stroke="#1a1a1a" stroke-width="1.5" fill="none" stroke-linecap="round"/></svg>';
var panelOpen=false,bubbleTimer=null;

function injectBear(){
  var bear=document.createElement('div');bear.className='gami-bear';bear.innerHTML=bearSVG;
  bear.addEventListener('click',togglePanel);document.body.appendChild(bear);
  var bubble=document.createElement('div');bubble.className='gami-bubble';document.body.appendChild(bubble);
  var panel=document.createElement('div');panel.className='gami-panel';document.body.appendChild(panel);
}
function showBubble(msg){
  var b=$('.gami-bubble');if(!b)return;
  b.textContent=msg;b.classList.add('show');
  clearTimeout(bubbleTimer);bubbleTimer=setTimeout(function(){b.classList.remove('show');},8000);
}
function hideBubble(){var b=$('.gami-bubble');if(b)b.classList.remove('show');}
function togglePanel(){
  panelOpen=!panelOpen;hideBubble();var p=$('.gami-panel');if(!p)return;
  if(panelOpen){updatePanel();p.classList.add('show');}else{p.classList.remove('show');}
}
function updatePanel(){
  var p=$('.gami-panel');if(!p)return;
  var xp=getXP(),lvl=currentLevel(),nxt=nextLevel(),s=getStreak(),st=getStats(),prog=getProgress();
  var mastered=0;for(var k in prog){if(prog[k]==='mastered')mastered++;}
  var pct=nxt?Math.min(100,Math.round((xp-lvl.xp)/(nxt.xp-lvl.xp)*100)):100;
  var xpLbl=nxt?(xp+' / '+nxt.xp+' XP'):(xp+' XP \u2014 MAX');
  p.innerHTML='<button class="gami-panel-close">&times;</button>'
    +'<div class="gami-panel-level">'+lvl.emoji+' '+lvl.name+'</div>'
    +'<div class="gami-panel-streak">'+s.current+'</div>'
    +'<div class="gami-panel-streak-label">day streak</div>'
    +'<div class="gami-xp-bar"><div class="fill" style="width:'+pct+'%"></div></div>'
    +'<div class="gami-xp-label"><span>'+xpLbl+'</span><span>'+lvl.emoji+(nxt?' &rarr; '+nxt.emoji:'')+'</span></div>'
    +'<div class="gami-panel-stats">'
    +'<div class="gami-panel-stat"><div class="val">'+st.gamesPlayed+'</div><div class="lbl">Games</div></div>'
    +'<div class="gami-panel-stat"><div class="val">'+mastered+'</div><div class="lbl">Mastered</div></div>'
    +'<div class="gami-panel-stat"><div class="val">'+s.longest+'</div><div class="lbl">Best Streak</div></div>'
    +'<div class="gami-panel-stat"><div class="val">'+st.quizzesDone+'</div><div class="lbl">Quizzes</div></div>'
    +'</div>';
  p.querySelector('.gami-panel-close').addEventListener('click',function(e){e.stopPropagation();togglePanel();});
}

/* Bear Messages */
function pickBearMessage(){
  var page=currentPage(),s=getStreak(),prog=getProgress();
  if(s.current>=5) return 'Day '+s.current+'! You\'re building a habit!';
  if(s.current===1&&s.longest>2) return 'Welcome back! Let\'s get that streak going again.';
  var total=0;for(var k in prog)total++;
  if(total<=1) return 'Welcome! Start with Board & Notation \uD83D\uDC4B';
  if(page.indexOf('ch-')===0){
    var st=prog[page];
    if(st==='mastered') return 'You\'ve mastered this one! Review is still good.';
    if(st==='read') return 'You\'ve read this before \u2014 ready to master it?';
    return 'Take your time with this one!';
  }
  if(page==='play') return 'Let\'s get a win!';
  if(page==='quiz'||page==='dynamic-quiz') return 'Test what you\'ve learned!';
  if(page==='trainer') return 'Drill those openings!';
  if(page==='calendar') return 'Look at that streak calendar!';
  if(page.indexOf('stage')===0) return 'Training mode \u2014 let\'s level up.';
  return 'Good to see you again!';
}

/* "Got It" Button */
function injectGotIt(){
  var page=currentPage();if(page.indexOf('ch-')!==0) return;
  var wrap=$('.wrap');if(!wrap) return;
  var prog=getProgress(),state=prog[page]||'visited';
  var btn=document.createElement('button');
  btn.className='gami-gotit'+(state==='read'?' read':'')+(state==='mastered'?' mastered':'');
  btn.textContent=state==='mastered'?'Mastered \u2713':(state==='read'?'I\'ve Got This!':'Mark as Read');
  btn.addEventListener('click',function(){
    var p=getProgress(),cur=p[page]||'visited';
    if(cur==='visited'){
      p[page]='read';btn.textContent='I\'ve Got This!';btn.className='gami-gotit read pop';
      addXP(XP_REWARDS.markRead);
    } else if(cur==='read'){
      p[page]='mastered';btn.textContent='Mastered \u2713';btn.className='gami-gotit mastered pop';
      addXP(XP_REWARDS.markLearned);fireConfetti();showWin();
    }
    setProgress(p);updateNavDots();
    setTimeout(function(){btn.classList.remove('pop');},400);
  });
  wrap.appendChild(btn);
}

/* Nav Progress Dots */
function injectNavDots(){
  var links=document.querySelectorAll('.nav-link');
  if(!links.length){setTimeout(injectNavDots,200);return;}
  var prog=getProgress();
  for(var i=0;i<links.length;i++){
    var href=links[i].getAttribute('href');if(!href)continue;
    var id=href.replace(/^\//,'').replace(/\.html$/,'')||'playbook';
    if(links[i].querySelector('.gami-dot'))continue;
    var dot=document.createElement('span');
    dot.className='gami-dot '+(prog[id]||'unvisited');
    dot.setAttribute('data-gami-page',id);
    links[i].style.display='flex';links[i].style.alignItems='center';
    links[i].style.justifyContent='space-between';
    links[i].appendChild(dot);
  }
}
function updateNavDots(){
  var dots=document.querySelectorAll('.gami-dot'),prog=getProgress();
  for(var i=0;i<dots.length;i++){
    var id=dots[i].getAttribute('data-gami-page');
    dots[i].className='gami-dot '+(prog[id]||'unvisited');
  }
}

/* Confetti */
function fireConfetti(){
  var canvas=document.createElement('canvas');canvas.className='gami-confetti';
  canvas.width=window.innerWidth;canvas.height=window.innerHeight;
  document.body.appendChild(canvas);
  var ctx=canvas.getContext('2d'),colors=['#769656','#1A6B5A','#DAB82B','#fff','#4A90D9'],pts=[];
  for(var i=0;i<80;i++) pts.push({
    x:Math.random()*canvas.width,y:Math.random()*-canvas.height*0.5,
    w:Math.random()*8+4,h:Math.random()*6+2,
    color:colors[Math.floor(Math.random()*colors.length)],
    vy:Math.random()*3+2,vx:(Math.random()-0.5)*2,
    rot:Math.random()*360,rv:Math.random()*6-3
  });
  var start=Date.now();
  (function frame(){
    var elapsed=Date.now()-start;
    if(elapsed>3000){canvas.remove();return;}
    ctx.clearRect(0,0,canvas.width,canvas.height);
    var fade=elapsed>2000?1-(elapsed-2000)/1000:1;
    for(var i=0;i<pts.length;i++){
      var p=pts[i];p.y+=p.vy;p.x+=p.vx;p.rot+=p.rv;
      ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.rot*Math.PI/180);
      ctx.globalAlpha=fade;ctx.fillStyle=p.color;
      ctx.fillRect(-p.w/2,-p.h/2,p.w,p.h);ctx.restore();
    }
    requestAnimationFrame(frame);
  })();
}
Gami.fireConfetti=fireConfetti;

/* XP Toast */
function showToast(msg){
  var ex=$('.gami-toast');if(ex)ex.remove();
  var t=document.createElement('div');t.className='gami-toast';t.textContent=msg;
  document.body.appendChild(t);
  requestAnimationFrame(function(){t.classList.add('show');});
  setTimeout(function(){t.classList.remove('show');setTimeout(function(){t.remove();},300);},2000);
}

/* Win Celebration */
function showWin(){
  var pulse=document.createElement('div');pulse.className='gami-green-pulse show';
  document.body.appendChild(pulse);setTimeout(function(){pulse.remove();},600);
  var nice=document.createElement('div');nice.className='gami-nice show';nice.textContent='Nice!';
  document.body.appendChild(nice);setTimeout(function(){nice.remove();},1300);
}
Gami.showWin=showWin;

/* Level Up Animation */
function triggerLevelUp(lvl){
  fireConfetti();
  var el=document.createElement('div');el.className='gami-levelup';
  el.innerHTML='<div class="emoji">'+lvl.emoji+'</div><div class="title">Level Up!</div><div class="name">'+lvl.name+'</div>';
  document.body.appendChild(el);
  requestAnimationFrame(function(){el.classList.add('show');});
  setTimeout(function(){el.classList.remove('show');setTimeout(function(){el.remove();},400);},3000);
  showBubble('You reached '+lvl.name+'!');
}

/* Page-Specific Hooks */
function setupPageHooks(){
  var page=currentPage();
  if(page==='play'){
    var lastCount=(lsGet('chess-played-games',[])||[]).length;
    setInterval(function(){
      var games=lsGet('chess-played-games',[])||[];
      if(games.length>lastCount){
        var latest=games[games.length-1],st=getStats();st.gamesPlayed++;
        if(latest&&latest.result==='win'){st.totalWins++;addXP(XP_REWARDS.winGame);showWin();}
        else if(latest&&latest.result==='loss'){st.totalLosses++;addXP(XP_REWARDS.loseGame);}
        else{addXP(XP_REWARDS.loseGame);}
        setStats(st);lastCount=games.length;
      }
    },2000);
  }
  if(page==='quiz'||page==='dynamic-quiz'){
    new MutationObserver(function(){
      var el=document.querySelector('.quiz-score,.score-display,[data-quiz-score]');
      if(el&&!el.getAttribute('data-gami-counted')){
        el.setAttribute('data-gami-counted','1');
        var st=getStats();st.quizzesDone++;setStats(st);addXP(XP_REWARDS.quizComplete);
      }
    }).observe(document.body,{childList:true,subtree:true});
  }
  if(page==='trainer'){
    var tc=lsGet('chess-trainer-count',0);
    setInterval(function(){
      var c=lsGet('chess-trainer-count',0);
      if(c>tc){addXP(XP_REWARDS.trainerDrill*(c-tc));tc=c;}
    },2000);
  }
}

/* Auto-Sync Check */
function autoSyncCheck(){
  var lastSync=lsGet('chess-last-sync',0);
  if(Date.now()-lastSync<7200000) return;
  var username=lsGet('chess-com-username','')||'happery';if(!username) return;
  fetch('https://api.chess.com/pub/player/'+username+'/games/archives')
    .then(function(r){return r.json();})
    .then(function(d){
      if(!d.archives||!d.archives.length) return;
      return fetch(d.archives[d.archives.length-1]);
    })
    .then(function(r){return r?r.json():null;})
    .then(function(d){
      if(!d||!d.games) return;
      lsSet('chess-synced-games',d.games);lsSet('chess-last-sync',Date.now());
    }).catch(function(){});
}

/* Init */
function init(){
  checkStreak();injectBear();trackPageVisit();
  setTimeout(function(){injectNavDots();injectGotIt();setupPageHooks();},300);
  setTimeout(function(){showBubble(pickBearMessage());},1500);
  autoSyncCheck();
}
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init);
else init();
})();
