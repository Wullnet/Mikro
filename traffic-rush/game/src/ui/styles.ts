/** Stili i UI-së (injektohet një herë në <head>). Gjithçka nën `.tru`. */
export const CSS = `
.tru{--acc:#ff5a2e;--acc2:#ff8a66;--gold:#ffc933;--sign:#0e6a40;--red:#ff4545;--ok:#38d27a;--blue:#3b82ff;
--txt:#f4f1e8;--mut:#a3abb5;--pan:rgba(14,17,22,.86);--pan2:rgba(26,31,39,.94);--bd:rgba(255,255,255,.13);--bd2:rgba(255,255,255,.22);
--fd:"Saira Extra Condensed","Arial Narrow","Roboto Condensed",sans-serif;--fb:Barlow,"Helvetica Neue",Arial,sans-serif;
--sat:env(safe-area-inset-top,0px);--sab:env(safe-area-inset-bottom,0px);--sal:env(safe-area-inset-left,0px);--sar:env(safe-area-inset-right,0px);
--u:min(1vmin,6.4px);--g:max(10px,calc(2.8*var(--u)));--mm:clamp(104px,33vmin,190px);--sp:clamp(68px,19vw,120px);--lim:38px;
font:500 16px/1.3 var(--fb);color:var(--txt);font-variant-numeric:tabular-nums;-webkit-font-smoothing:antialiased;-webkit-text-size-adjust:100%}
@media (orientation:landscape){.tru{--sp:clamp(84px,26vh,134px);--lim:44px}}
.tru *,.tru *::before,.tru *::after{box-sizing:border-box}
.tru .ic{width:1.2em;height:1.2em;flex:none;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.tru button{font:inherit;color:inherit;background:none;border:0;padding:0;margin:0;cursor:pointer;-webkit-tap-highlight-color:transparent;touch-action:manipulation;text-align:inherit}
.tru h1,.tru h2,.tru h3,.tru h4,.tru p{margin:0}
.tru .btn{pointer-events:auto;display:flex;align-items:center;justify-content:center;gap:.45em;min-height:50px;padding:0 18px;border-radius:14px;
 background:rgba(255,255,255,.07);border:1px solid var(--bd2);font:800 1.3rem/1 var(--fd);letter-spacing:.05em;text-transform:uppercase;color:var(--txt);
 text-align:center;transition:transform .12s,background-color .15s,opacity .15s;white-space:nowrap}
.tru .btn:active{transform:scale(.97);background-color:rgba(255,255,255,.15)}
.tru .btn.pri{background:var(--acc);border-color:var(--acc2);color:#fff;box-shadow:0 10px 26px -10px rgba(255,90,46,.8)}
.tru .btn.pri:active{background:#e5481f}
.tru .btn.gold{background:var(--gold);border-color:#ffe28f;color:#1d1606}
.tru .btn.grn{background:var(--sign);border-color:#2d9b69;color:#fff}
.tru .btn.dng{color:#ff9585;border-color:rgba(255,110,90,.45)}
.tru .btn.big{min-height:62px;font-size:1.9rem;border-radius:16px}
.tru .btn:disabled{opacity:.45;pointer-events:none}
.tru .btn .ic{width:1.05em;height:1.05em;stroke-width:2.4}
.tru .btn small{font:700 .8rem/1 var(--fb);letter-spacing:.02em;text-transform:none;opacity:.85}
.tru .ibtn{pointer-events:auto;flex:none;width:48px;height:48px;border-radius:14px;display:grid;place-items:center;background:var(--pan);border:1px solid var(--bd2);transition:transform .12s}
.tru .ibtn:active{transform:scale(.93)}
.tru .ibtn .ic{width:24px;height:24px}
.tru .panel{background:var(--pan);border:1px solid var(--bd);border-radius:18px}
.tru .chip{display:inline-flex;align-items:center;gap:6px;height:38px;padding:0 13px;border-radius:19px;background:var(--pan);border:1px solid var(--bd);
 font:800 1.25rem/1 var(--fd);letter-spacing:.02em;white-space:nowrap;flex:none}
.tru .chip .ic{width:18px;height:18px}
.tru .coin{color:var(--gold)}
.tru .eb{font:700 .72rem/1.1 var(--fb);letter-spacing:.16em;text-transform:uppercase;color:var(--mut)}
.tru .lvb{display:inline-grid;place-items:center;min-width:30px;height:30px;padding:0 6px;border-radius:9px;background:var(--gold);color:#1d1606;font:800 1.15rem/1 var(--fd)}

/* ---------- Ekranet ---------- */
.tru .scr{position:absolute;inset:0;display:none;pointer-events:none}
.tru .scr.on{display:block;animation:tru-in .22s ease-out}
.tru .scr.cen.on{display:grid;place-items:center}
.tru .scr.page.on{display:flex;flex-direction:column}
.tru .scr.blk{pointer-events:auto}
.tru .dim{background:rgba(6,8,11,.62)}
.tru .opq{background:radial-gradient(130% 90% at 50% 0%,#1b222c 0%,#11151b 55%,#0c0f13 100%)}
@keyframes tru-in{from{opacity:0}to{opacity:1}}
@keyframes tru-up{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
@keyframes tru-pop{0%{transform:scale(.6);opacity:0}60%{transform:scale(1.08);opacity:1}100%{transform:scale(1)}}
@keyframes tru-blink{to{opacity:.45}}
@keyframes tru-breath{0%,100%{opacity:.45}50%{opacity:1}}
@keyframes tru-pol{0%,49%{color:#ff4545}50%,100%{color:#4d8dff}}
@keyframes tru-polb{0%,49%{border-color:#ff4545;box-shadow:0 0 0 3px #ff4545,0 12px 30px rgba(0,0,0,.5)}50%,100%{border-color:#4d8dff;box-shadow:0 0 0 3px #4d8dff,0 12px 30px rgba(0,0,0,.5)}}
@keyframes tru-lvl{0%{opacity:0;transform:translateX(-50%) scale(.5)}12%{opacity:1;transform:translateX(-50%) scale(1.06)}20%{transform:translateX(-50%) scale(1)}85%{opacity:1}100%{opacity:0;transform:translateX(-50%) translateY(-20px)}}
@keyframes tru-spin{to{transform:rotate(360deg)}}
@keyframes tru-float{0%{opacity:0;transform:translateY(4px)}15%{opacity:1}100%{opacity:0;transform:translateY(-26px)}}
@keyframes tru-star{0%{transform:scale(0) rotate(-40deg);opacity:0}70%{transform:scale(1.25) rotate(8deg);opacity:1}100%{transform:scale(1) rotate(0)}}
.tru .hdr{flex:none;display:flex;align-items:center;gap:12px;padding:calc(var(--sat) + 10px) calc(var(--sar) + 14px) 10px calc(var(--sal) + 14px);pointer-events:auto}
.tru .hdr h2{flex:1;min-width:0;font:800 2rem/1 var(--fd);letter-spacing:.05em;text-transform:uppercase;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tru .body{flex:1;min-height:0;overflow-y:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;touch-action:pan-y;pointer-events:auto;
 padding:4px calc(var(--sar) + 14px) calc(var(--sab) + 20px) calc(var(--sal) + 14px)}
.tru .sec{font:800 1.05rem/1 var(--fd);letter-spacing:.14em;text-transform:uppercase;color:var(--mut);margin:18px 2px 10px;display:flex;align-items:center;gap:8px}
.tru .sec::after{content:"";flex:1;height:1px;background:var(--bd)}

/* ---------- Titulli ---------- */
.tru .s-title{background:radial-gradient(120% 75% at 50% 42%,rgba(8,10,14,.05) 0%,rgba(8,10,14,.5) 62%,rgba(8,10,14,.9) 100%);cursor:pointer}
.tru .wm{position:absolute;left:0;right:0;top:27%;display:flex;flex-direction:column;align-items:center;text-align:center;animation:tru-up .6s ease-out}
.tru .wm h1{font:800 clamp(3.6rem,18vw,8rem)/.82 var(--fd);letter-spacing:.015em;transform:skewX(-7deg);text-shadow:0 4px 0 rgba(0,0,0,.35),0 14px 40px rgba(0,0,0,.55);white-space:nowrap}
.tru .wm h1 em{font-style:normal;color:var(--acc)}
.tru .wm .bar{height:5px;width:min(62vw,430px);margin:14px 0 18px;background:linear-gradient(90deg,transparent,var(--acc) 18%,var(--gold) 50%,var(--acc) 82%,transparent);transform:skewX(-30deg)}
.tru .plate{display:inline-block;padding:7px calc(24px - .3em) 8px 24px;background:var(--sign);border:3px solid #fff;border-radius:10px;box-shadow:0 0 0 4px var(--sign),0 14px 30px rgba(0,0,0,.45);
 font:800 clamp(1.5rem,7vw,2.6rem)/1 var(--fd);letter-spacing:.3em;color:#fff}
.tru .tap{position:absolute;left:0;right:0;bottom:calc(var(--sab) + 11vh);text-align:center;font:700 1.05rem var(--fb);letter-spacing:.2em;text-transform:uppercase;animation:tru-breath 1.8s ease-in-out infinite;text-shadow:0 2px 8px #000}
.tru .ver{position:absolute;right:calc(var(--sar) + 14px);bottom:calc(var(--sab) + 10px);font:600 .75rem var(--fb);color:var(--mut);opacity:.7}

/* ---------- Menuja ---------- */
.tru .s-menu{background:linear-gradient(180deg,rgba(8,10,14,.55) 0%,rgba(8,10,14,0) 26%,rgba(8,10,14,0) 46%,rgba(8,10,14,.75) 100%)}
.tru .mtop{position:absolute;top:calc(var(--sat) + 12px);left:calc(var(--sal) + 14px);right:calc(var(--sar) + 14px);display:flex;justify-content:space-between;gap:8px;pointer-events:auto}
.tru .prof{display:flex;align-items:center;gap:9px;height:46px;padding:0 14px 0 8px;border-radius:23px;background:var(--pan);border:1px solid var(--bd)}
.tru .prof .xpw{display:flex;flex-direction:column;gap:5px;min-width:84px}
.tru .prof .xpw span{font:700 .7rem/1 var(--fb);letter-spacing:.1em;text-transform:uppercase;color:var(--mut)}
.tru .xpb{display:block;width:84px;height:6px;border-radius:3px;background:rgba(255,255,255,.13);overflow:hidden}
.tru .xpb>i{display:block;height:100%;width:100%;background:linear-gradient(90deg,#f5a623,var(--gold));transform-origin:0 50%;transform:scaleX(0);transition:transform .4s}
.tru .mtop .chip{height:46px;border-radius:23px;font-size:1.45rem}
.tru .mlogo{position:absolute;top:calc(var(--sat) + 74px);left:0;right:0;text-align:center}
.tru .mlogo b{display:block;font:800 2.6rem/.85 var(--fd);transform:skewX(-7deg);text-shadow:0 3px 18px rgba(0,0,0,.6)}
.tru .mlogo b em{font-style:normal;color:var(--acc)}
.tru .mlogo span{display:inline-block;margin-top:8px;padding:3px 10px 4px calc(10px + .3em);background:var(--sign);border:2px solid #fff;border-radius:6px;font:800 .95rem/1 var(--fd);letter-spacing:.3em}
.tru .mpan{position:absolute;left:calc(var(--sal) + 14px);right:calc(var(--sar) + 14px);bottom:calc(var(--sab) + 14px);margin:0 auto;max-width:520px;padding:14px;
 display:flex;flex-direction:column;gap:10px;pointer-events:auto;animation:tru-up .35s ease-out}
.tru .mcar{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:0 4px}
.tru .mcar b{display:block;font:800 1.5rem/1.05 var(--fd);letter-spacing:.03em}
.tru .mgrid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.tru .tile{pointer-events:auto;display:flex;align-items:center;gap:10px;min-height:56px;padding:0 14px;border-radius:14px;background:rgba(255,255,255,.06);border:1px solid var(--bd);
 font:800 1.2rem/1 var(--fd);letter-spacing:.06em;text-transform:uppercase;transition:transform .12s,background-color .15s}
.tru .tile:active{transform:scale(.97);background-color:rgba(255,255,255,.13)}
.tru .tile .ic{width:24px;height:24px;color:var(--acc)}
.tru .inc{animation:tru-pop .4s ease-out}
@media (orientation:landscape){
 .tru .mlogo{display:none}
 .tru .mpan{right:auto;left:calc(var(--sal) + 14px);top:calc(var(--sat) + 12px);bottom:calc(var(--sab) + 12px);width:min(380px,46vw);margin:0;justify-content:flex-end;overflow:auto}
 .tru .mpan .mhead{display:block}
 .tru .mtop{left:auto}
 .tru .s-menu{background:linear-gradient(90deg,rgba(8,10,14,.7) 0%,rgba(8,10,14,.3) 40%,rgba(8,10,14,0) 60%)}
}
.tru .mhead{display:none;margin:0 2px 4px}
.tru .mhead b{display:block;font:800 2.4rem/.85 var(--fd);transform:skewX(-7deg);transform-origin:left}
.tru .mhead b em{font-style:normal;color:var(--acc)}
.tru .mhead span{display:inline-block;margin-top:7px;padding:3px 9px 4px calc(9px + .3em);background:var(--sign);border:2px solid #fff;border-radius:6px;font:800 .9rem/1 var(--fd);letter-spacing:.3em}
@media (orientation:landscape) and (max-height:430px){.tru .mpan{gap:8px;padding:12px}.tru .tile{min-height:48px}.tru .btn.big{min-height:54px}.tru .mhead b{font-size:2rem}}

/* ---------- HUD ---------- */
.tru .hud{position:absolute;inset:0;display:none;pointer-events:none}
.tru[data-hud] .hud{display:block}
.tru:not([data-s=play]) .hud .pe{pointer-events:none!important}
.tru:not([data-s=play]) .pbtn{visibility:hidden}
.tru .htop{position:absolute;top:calc(var(--sat) + var(--g));left:calc(var(--sal) + var(--g));right:calc(var(--sar) + var(--g));display:grid;column-gap:var(--g);row-gap:8px;align-items:start;
 grid-template-columns:var(--mm) minmax(0,1fr) auto;grid-template-rows:auto auto 1fr;grid-template-areas:"mm mis hr" "mm mis wan" "mm mis ."}
.tru .mmw{grid-area:mm;width:var(--mm);pointer-events:auto;cursor:pointer}
.tru .mm{position:relative;width:var(--mm);height:var(--mm);border-radius:24%;overflow:hidden;background:#10151b;border:1.5px solid rgba(255,255,255,.28);box-shadow:0 8px 22px rgba(0,0,0,.4)}
.tru .mm canvas{position:absolute;inset:0;width:100%;height:100%;display:block}
.tru .loc{margin-top:6px;display:flex;align-items:center;justify-content:space-between;gap:6px;padding:0 3px;text-shadow:0 1px 3px #000,0 0 8px rgba(0,0,0,.7)}
.tru .loc b{font:800 1.05rem/1 var(--fd);letter-spacing:.06em;text-transform:uppercase;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}
.tru .loc span{display:flex;align-items:center;gap:4px;font:700 .9rem/1 var(--fd);letter-spacing:.04em;flex:none}
.tru .loc .ic{width:14px;height:14px;color:var(--gold)}
.tru .hr{grid-area:hr;justify-self:end;display:flex;align-items:flex-start;gap:8px}
.tru .wal{position:relative;display:flex;flex-direction:column;align-items:flex-end;gap:6px;padding:7px 12px 8px;border-radius:14px;background:var(--pan);border:1px solid var(--bd)}
.tru .money{display:flex;align-items:center;gap:6px;font:800 1.5rem/1 var(--fd);letter-spacing:.02em;white-space:nowrap}
.tru .money .ic{width:18px;height:18px}
.tru .lvr{display:flex;align-items:center;gap:7px;font:800 .85rem/1 var(--fd);letter-spacing:.08em;color:var(--mut)}
.tru .lvr .xpb{width:70px}
.tru .lvr b{color:var(--gold);font-size:1rem}
.tru .mfl{position:absolute;right:10px;top:100%;display:flex;flex-direction:column;align-items:flex-end;pointer-events:none}
.tru .mfl span{font:800 1.2rem/1.1 var(--fd);color:var(--ok);text-shadow:0 1px 4px #000;animation:tru-float 1.6s ease-out forwards}
.tru .mfl span.neg{color:var(--red)}
.tru .pbtn{width:48px;height:48px}
.tru .wan{grid-area:wan;justify-self:end;display:none;flex-direction:column;align-items:flex-end;gap:5px}
.tru .wan.on{display:flex}
.tru .stars{display:flex;gap:1px;padding:5px 8px;border-radius:12px;background:var(--pan);border:1px solid var(--bd)}
.tru .stars .ic{width:19px;height:19px;color:rgba(255,255,255,.2)}
.tru .stars .ic.f{color:#fff;animation:tru-pol .6s infinite}
.tru .bust{position:relative;width:118px;height:20px;border-radius:10px;overflow:hidden;background:var(--pan);border:1px solid rgba(255,80,80,.55);font:800 .72rem/18px var(--fd);letter-spacing:.16em;text-align:center;display:none}
.tru .bust.on{display:block}
.tru .bust>i{position:absolute;inset:0;background:linear-gradient(90deg,#b81717,#ff4545);transform-origin:0 50%;transform:scaleX(0)}
.tru .bust>span{position:relative}
.tru .mis{grid-area:mis;position:relative;justify-self:center;width:min(100%,440px);padding:9px 12px 10px;display:none;pointer-events:none}
.tru .mis.on{display:block;animation:tru-up .3s ease-out}
.tru .mis-h{display:flex;align-items:center;gap:7px;min-height:24px}
.tru .mis-h .ic{width:18px;height:18px;color:var(--acc)}
.tru .mis-k{flex:1;min-width:0;font:700 .72rem/1.1 var(--fb);letter-spacing:.13em;text-transform:uppercase;color:var(--acc);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tru .mis-tm{display:none;align-items:center;gap:4px;font:800 1.55rem/1 var(--fd);letter-spacing:.02em}
.tru .mis-tm.on{display:flex}
.tru .mis-tm .ic{width:16px;height:16px;color:var(--mut)}
.tru .mis-tm.low{color:var(--red);animation:tru-blink .5s infinite alternate}
.tru .mis-tm.low .ic{color:var(--red)}
.tru .mis-o{margin-top:4px;font:700 1rem/1.22 var(--fb);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.tru .mis-p{margin-top:5px;display:flex;justify-content:space-between;align-items:baseline;gap:10px;font:600 .82rem/1.1 var(--fb);color:var(--mut)}
.tru .mis-p b{font:800 1.05rem/1 var(--fd);letter-spacing:.03em;color:var(--txt)}
.tru .mis-p:empty{display:none}
.tru .pas{margin-top:7px;padding-top:7px;border-top:1px solid var(--bd);display:none;align-items:center;gap:8px;font:700 .88rem/1 var(--fb)}
.tru .pas.on{display:flex}
.tru .face{width:26px;height:26px;flex:none}
.tru .pas-n{max-width:45%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tru .pbar{flex:1;height:6px;border-radius:3px;background:rgba(255,255,255,.12);overflow:hidden}
.tru .pbar>i{display:block;height:100%;width:100%;transform-origin:0 50%;transition:transform .4s,background-color .4s}
.tru .bub{position:absolute;left:12px;right:12px;top:calc(100% + 9px);padding:8px 12px;border-radius:14px;background:#f6f3ea;color:#15181d;font:600 .9rem/1.25 var(--fb);
 opacity:0;transform:translateY(-5px);transition:opacity .35s,transform .35s;box-shadow:0 8px 20px rgba(0,0,0,.35)}
.tru .bub::before{content:"";position:absolute;top:-7px;left:20px;border:7px solid transparent;border-top:0;border-bottom-color:#f6f3ea}
.tru .bub.on{opacity:1;transform:none}
.tru .bc{position:absolute;left:50%;bottom:calc(var(--sab) + max(8px,2.2*var(--u)));transform:translateX(-50%);display:flex;align-items:center;gap:10px}
.tru .spd{position:relative;width:var(--sp);height:var(--sp);flex:none}
.tru .spd svg{position:absolute;inset:0;width:100%;height:100%;overflow:visible}
.tru .lim{width:var(--lim);height:var(--lim);border-radius:50%;background:#fff;border:calc(var(--lim)*.13) solid #d71f26;display:none;place-items:center;color:#121212;
 font:800 calc(var(--lim)*.44)/1 var(--fd);letter-spacing:-.02em;box-shadow:0 4px 12px rgba(0,0,0,.45);flex:none}
.tru .lim.on{display:grid}
.tru .lim.over{animation:tru-pop .6s ease-in-out infinite alternate}
.tru .dmg{position:absolute;right:-6px;top:-4px;width:28px;height:28px;border-radius:50%;background:var(--pan);border:1px solid var(--bd2);display:none;place-items:center}
.tru .dmg.on{display:grid}
.tru .dmg .ic{width:17px;height:17px}
.tru .feed{position:absolute;left:50%;top:calc(var(--sat) + 37vh);transform:translateX(-50%);width:min(90vw,460px);display:flex;flex-direction:column;align-items:center;gap:8px;pointer-events:none}
.tru .nm{display:none;font:800 2.2rem/1 var(--fd);letter-spacing:.04em;color:var(--gold);transform:skewX(-8deg);text-shadow:0 2px 0 #6b4300,0 6px 18px rgba(0,0,0,.6);white-space:nowrap}
.tru .nm b{color:#fff;margin-left:.2em}
.tru .nm.on{display:block}
.tru .nm.pop{animation:tru-pop .35s cubic-bezier(.2,1.5,.4,1)}
.tru .sign{display:flex;flex-direction:column;align-items:center;padding:8px 24px 9px;border-radius:10px;background:var(--sign);color:#fff;border:2.5px solid #fff;
 box-shadow:0 0 0 3px var(--sign),0 12px 30px rgba(0,0,0,.5);font:800 2rem/1 var(--fd);letter-spacing:.07em;text-transform:uppercase;animation:tru-pop .4s ease-out;text-align:center}
.tru .sign small{display:flex;align-items:center;gap:5px;font:700 .72rem/1 var(--fb);letter-spacing:.16em;opacity:.9;margin-bottom:5px}
.tru .sign small .ic{width:14px;height:14px}
.tru .sign.lock{background:#8e1d1d;box-shadow:0 0 0 3px #8e1d1d,0 12px 30px rgba(0,0,0,.5)}
.tru .sign.bust{background:#0f1318;font-size:2.6rem;animation:tru-pop .4s ease-out,tru-polb .5s infinite}
.tru .sign.out{opacity:0;transition:opacity .4s}
.tru .lvup{position:absolute;left:50%;top:calc(var(--sat) + 20vh);transform:translateX(-50%);display:none;flex-direction:column;align-items:center;pointer-events:none;z-index:5}
.tru .lvup.on{display:flex;animation:tru-lvl 3.4s ease-out forwards}
.tru .lvup::before{content:"";position:absolute;left:50%;top:50%;width:340px;height:340px;margin:-170px 0 0 -170px;border-radius:50%;
 background:repeating-conic-gradient(rgba(255,201,51,.22) 0 9deg,transparent 9deg 18deg);-webkit-mask:radial-gradient(circle,#000 20%,transparent 68%);mask:radial-gradient(circle,#000 20%,transparent 68%);animation:tru-spin 12s linear infinite}
.tru .lvup em{position:relative;font:800 1.15rem/1 var(--fd);font-style:normal;letter-spacing:.3em;padding-left:.3em;text-shadow:0 2px 8px #000}
.tru .lvup b{position:relative;font:800 6.5rem/.9 var(--fd);color:var(--gold);text-shadow:0 4px 0 #7a4b00,0 10px 30px rgba(0,0,0,.6)}
.tru .lvup span{position:relative;font:700 .95rem var(--fb);text-shadow:0 2px 6px #000}
.tru .toasts{position:absolute;left:50%;transform:translateX(-50%);top:calc(var(--sat) + 72px);width:min(92vw,440px);display:flex;flex-direction:column;align-items:center;gap:6px;pointer-events:none;z-index:6}
.tru[data-s=play] .toasts,.tru[data-s=pause] .toasts{top:calc(var(--sat) + 52vh)}
.tru .toast{display:flex;align-items:center;gap:8px;padding:9px 15px;border-radius:12px;background:rgba(14,17,22,.92);border:1px solid var(--bd2);font:700 .95rem/1.25 var(--fb);text-align:center;
 animation:tru-up .25s ease-out;transition:opacity .35s,transform .35s;max-width:100%}
.tru .toast .ic{width:18px;height:18px}
.tru .toast.good{border-color:rgba(56,210,122,.6);box-shadow:inset 4px 0 0 var(--ok)}
.tru .toast.good .ic{color:var(--ok)}
.tru .toast.bad{border-color:rgba(255,69,69,.6);box-shadow:inset 4px 0 0 var(--red)}
.tru .toast.bad .ic{color:var(--red)}
.tru .toast.out{opacity:0;transform:translateY(-8px)}
@media (orientation:portrait){
 .tru .htop{grid-template-columns:var(--mm) minmax(0,1fr);grid-template-rows:auto auto auto 1fr;grid-template-areas:"mm hr" "mm wan" "mm mis" "mm ."}
 .tru .mmw{grid-row:1/-1}
 .tru .mis{justify-self:stretch;width:auto}
 .tru .bc{flex-direction:column;gap:7px}
}
@media (orientation:landscape){
 .tru .mmw{grid-row:1/-1}
 .tru .feed{top:calc(var(--sat) + 43vh);width:min(52vw,460px)}
 .tru[data-s=play] .toasts,.tru[data-s=pause] .toasts{top:calc(var(--sat) + 43vh)}
 .tru .nm{font-size:1.9rem}
 .tru .sign{font-size:1.7rem;padding:6px 20px 7px}
 .tru .lvup{top:calc(var(--sat) + 10vh)}
}

/* ---------- Mbivendosjet (pauzë, brifing, rezultat) ---------- */
.tru .card{width:min(92vw,420px);max-height:calc(100vh - var(--sat) - var(--sab) - 24px);overflow:auto;padding:20px;display:flex;flex-direction:column;gap:10px;
 background:var(--pan2);border:1px solid var(--bd2);border-radius:22px;box-shadow:0 24px 60px rgba(0,0,0,.55);pointer-events:auto;animation:tru-up .3s ease-out;overscroll-behavior:contain}
.tru .card h3{font:800 2.3rem/1 var(--fd);letter-spacing:.05em;text-transform:uppercase}
.tru .pgrid{display:grid;grid-template-columns:1fr;gap:10px}
.tru .pinfo{display:flex;justify-content:space-between;align-items:center;gap:10px;color:var(--mut);font:600 .9rem var(--fb)}
.tru .btn.warn{border-color:#ff5a2e;color:#fff;background:rgba(255,90,46,.18)}
.tru .bkind{display:flex;align-items:center;gap:10px}
.tru .bkind i{display:grid;place-items:center;width:46px;height:46px;border-radius:14px;background:var(--acc);color:#fff;flex:none}
.tru .bkind i .ic{width:26px;height:26px}
.tru .bkind h3{font-size:2rem;line-height:.95}
.tru .btxt{font:500 1rem/1.4 var(--fb);color:#d9dde2}
.tru .tags{display:flex;flex-wrap:wrap;gap:6px}
.tru .tag{display:inline-flex;align-items:center;gap:5px;height:26px;padding:0 10px;border-radius:13px;background:rgba(255,255,255,.08);border:1px solid var(--bd);font:700 .78rem/1 var(--fb);letter-spacing:.04em}
.tru .tag i{width:9px;height:9px;border-radius:50%}
.tru .rew{display:flex;gap:10px}
.tru .rew>div{flex:1;padding:10px 12px;border-radius:14px;background:rgba(255,255,255,.05);border:1px solid var(--bd)}
.tru .rew b{display:flex;align-items:center;gap:6px;font:800 1.7rem/1.05 var(--fd);letter-spacing:.02em}
.tru .rew b .ic{width:20px;height:20px}
.tru .brow{display:grid;grid-template-columns:1fr 1.4fr;gap:10px;margin-top:4px}
.tru .res h3{text-align:center}
.tru .res.win h3{color:var(--gold)}
.tru .res.fail h3{color:#ff6b5b}
.tru .rst{display:flex;justify-content:center;gap:6px;margin:4px 0}
.tru .rst .ic{width:52px;height:52px;color:rgba(255,255,255,.14)}
.tru .rst .ic.f{color:var(--gold);animation:tru-star .5s cubic-bezier(.2,1.4,.4,1) both;filter:drop-shadow(0 4px 10px rgba(255,201,51,.45))}
.tru .rtitle{text-align:center;font:600 1rem var(--fb);color:var(--mut)}
.tru .rlines{display:flex;flex-direction:column;gap:2px;padding:6px 0;border-top:1px solid var(--bd);border-bottom:1px solid var(--bd)}
.tru .rlines div{display:flex;justify-content:space-between;gap:10px;font:600 .92rem/1.6 var(--fb);color:#d9dde2}
@media (orientation:landscape){
 .tru .card{width:min(88vw,560px);padding:16px 18px}
 .tru .pgrid{grid-template-columns:1fr 1fr}
 .tru .pgrid .wide{grid-column:1/-1}
 .tru .card h3{font-size:2rem}
 .tru .rst .ic{width:42px;height:42px}
}

/* ---------- Harta ---------- */
.tru .s-map{background:#0e1217}
.tru .s-map canvas{position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none;pointer-events:auto}
.tru .s-map .hdr{position:absolute;left:0;right:0;top:0;background:linear-gradient(180deg,rgba(10,12,16,.85),rgba(10,12,16,0));padding-bottom:22px;pointer-events:none}
.tru .s-map .hdr>*{pointer-events:auto}
.tru .s-map .hdr h2{pointer-events:none}
.tru .mzoom{position:absolute;right:calc(var(--sar) + 14px);top:50%;transform:translateY(-50%);display:flex;flex-direction:column;gap:8px}
.tru .mleg{position:absolute;left:calc(var(--sal) + 14px);bottom:calc(var(--sab) + 14px);display:flex;flex-wrap:wrap;gap:6px 12px;padding:8px 12px;max-width:calc(100% - 28px - var(--sal) - var(--sar));
 border-radius:12px;background:var(--pan);border:1px solid var(--bd);font:700 .76rem/1 var(--fb);pointer-events:none}
.tru .mleg span{display:flex;align-items:center;gap:5px;white-space:nowrap}
.tru .mleg i{width:10px;height:10px;border-radius:50%;border:1.5px solid #fff}
.tru .wpt{position:absolute;left:50%;transform:translateX(-50%);bottom:calc(var(--sab) + 62px);display:none;align-items:center;gap:10px;padding:6px 6px 6px 14px;border-radius:16px;
 background:var(--pan2);border:1px solid var(--bd2);pointer-events:auto;max-width:calc(100% - 28px);box-shadow:0 10px 26px rgba(0,0,0,.4)}
.tru .wpt.on{display:flex;animation:tru-up .25s ease-out}
.tru .wpt .ic{width:20px;height:20px;color:var(--acc)}
.tru .wpt div{min-width:0}
.tru .wpt b{display:block;font:800 1.1rem/1.1 var(--fd);letter-spacing:.03em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tru .wpt span{font:600 .8rem var(--fb);color:var(--mut)}
.tru .wpt .btn{min-height:44px;padding:0 14px;font-size:1.05rem}
@media (orientation:landscape){.tru .wpt{bottom:calc(var(--sab) + 14px);left:auto;right:calc(var(--sar) + 76px);transform:none}.tru .mleg{max-width:46vw}}

/* ---------- Garazhi ---------- */
.tru .s-gar{display:none}
.tru .s-gar.on{display:grid;grid-template-columns:100%;grid-template-rows:auto minmax(150px,36vh) auto minmax(0,1fr);grid-template-areas:"hdr" "prev" "strip" "det"}
.tru .s-gar .hdr{grid-area:hdr}
.tru .gprev{grid-area:prev;position:relative;overflow:hidden;background:radial-gradient(70% 70% at 50% 62%,#3a2a24 0%,#1c1f26 55%,#11151b 100%);pointer-events:auto;touch-action:none;
 margin:0 calc(var(--sar) + 14px) 0 calc(var(--sal) + 14px);border-radius:20px;border:1px solid var(--bd)}
.tru .gprev canvas{position:absolute;inset:0;width:100%;height:100%;display:block}
.tru .gname{position:absolute;left:14px;top:12px;right:14px;pointer-events:none}
.tru .gname b{display:block;font:800 2rem/1 var(--fd);letter-spacing:.03em;text-shadow:0 2px 10px rgba(0,0,0,.6)}
.tru .gname span{font:600 .85rem/1.3 var(--fb);color:#c9ced5;display:block;max-width:420px;text-shadow:0 1px 4px #000}
.tru .grot{position:absolute;right:12px;bottom:10px;font:600 .72rem var(--fb);color:var(--mut);letter-spacing:.06em;pointer-events:none}
.tru .gstrip{grid-area:strip;display:flex;gap:10px;overflow-x:auto;overscroll-behavior:contain;touch-action:pan-x;pointer-events:auto;scrollbar-width:none;
 padding:12px calc(var(--sar) + 14px) 6px calc(var(--sal) + 14px);scroll-padding:0 14px}
.tru .gstrip::-webkit-scrollbar{display:none}
.tru .gc{flex:none;width:148px;padding:10px 11px;border-radius:14px;background:rgba(255,255,255,.05);border:1px solid var(--bd);display:flex;flex-direction:column;gap:6px;pointer-events:auto;transition:border-color .15s,background-color .15s}
.tru .gc.on{border-color:var(--acc);background:rgba(255,90,46,.12);box-shadow:inset 0 0 0 1px var(--acc)}
.tru .gc b{font:800 1.12rem/1 var(--fd);letter-spacing:.03em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tru .gc .st{display:flex;align-items:center;gap:5px;font:700 .78rem/1 var(--fb);color:var(--mut);min-height:16px}
.tru .gc .st .ic{width:14px;height:14px}
.tru .gc .st.own{color:var(--ok)}
.tru .gc .st.cur{color:var(--acc)}
.tru .gc .st.pr{color:var(--gold);font:800 1rem/1 var(--fd)}
.tru .mini{display:grid;grid-template-columns:1fr 1fr;gap:4px 6px}
.tru .mini i{display:block;height:4px;border-radius:2px;background:rgba(255,255,255,.12);overflow:hidden}
.tru .mini i>i{height:100%;background:var(--acc2);border-radius:2px}
.tru .gdet{grid-area:det;min-height:0;overflow-y:auto;overscroll-behavior:contain;touch-action:pan-y;pointer-events:auto;padding:4px calc(var(--sar) + 14px) calc(var(--sab) + 20px) calc(var(--sal) + 14px)}
.tru .gact{display:flex;gap:10px;margin-top:6px}
.tru .gact .btn{flex:1}
.tru .stats{display:grid;gap:9px}
.tru .srow{display:grid;grid-template-columns:96px 1fr 34px;align-items:center;gap:10px;font:700 .85rem/1 var(--fb)}
.tru .srow span:last-child{text-align:right;font:800 1rem/1 var(--fd);color:var(--mut)}
.tru .sbar{position:relative;height:8px;border-radius:4px;background:rgba(255,255,255,.1);overflow:hidden}
.tru .sbar i{position:absolute;left:0;top:0;bottom:0;border-radius:4px}
.tru .sbar i.b{background:linear-gradient(90deg,var(--acc),#ff8a52)}
.tru .sbar i.x{background:var(--gold);opacity:.85}
.tru .sw{display:grid;grid-template-columns:repeat(auto-fill,minmax(44px,1fr));gap:8px}
.tru .sw button{aspect-ratio:1;min-height:44px;border-radius:12px;border:2px solid rgba(255,255,255,.18);pointer-events:auto;transition:transform .12s;box-shadow:inset 0 -8px 14px rgba(0,0,0,.25),inset 0 6px 10px rgba(255,255,255,.18)}
.tru .sw button.on{border-color:#fff;box-shadow:0 0 0 2px var(--acc),inset 0 -8px 14px rgba(0,0,0,.25)}
.tru .sw button:active{transform:scale(.92)}
.tru .ups{display:grid;gap:8px}
.tru .up{display:grid;grid-template-columns:40px 1fr auto;align-items:center;gap:10px;padding:8px 8px 8px 10px;border-radius:14px;background:rgba(255,255,255,.05);border:1px solid var(--bd)}
.tru .up>.ic{width:26px;height:26px;color:var(--acc);justify-self:center}
.tru .up b{display:block;font:800 1.15rem/1 var(--fd);letter-spacing:.04em}
.tru .pips{display:flex;gap:4px;margin-top:6px}
.tru .pips i{width:22px;height:6px;border-radius:3px;background:rgba(255,255,255,.14)}
.tru .pips i.f{background:var(--gold)}
.tru .up .btn{min-height:44px;padding:0 12px;font-size:1.1rem}
.tru .note{font:600 .85rem/1.35 var(--fb);color:var(--mut)}
@media (orientation:landscape){
 .tru .s-gar.on{grid-template-columns:minmax(0,1.08fr) minmax(0,1fr);grid-template-rows:auto minmax(0,1fr) auto;grid-template-areas:"hdr hdr" "prev det" "strip det"}
 .tru .gprev{margin-right:0}
 .tru .gdet{padding-left:14px}
 .tru .gstrip{padding-right:0;padding-bottom:calc(var(--sab) + 10px)}
 .tru .gc{width:132px;padding:8px 10px;gap:5px}
 .tru .s-gar .hdr{padding-top:calc(var(--sat) + 8px);padding-bottom:8px}
 .tru .gname b{font-size:1.6rem}
}
@media (orientation:landscape) and (max-height:430px){.tru .gc .mini{display:none}.tru .gname span{display:none}}

/* ---------- Bizneset ---------- */
.tru .bsum{display:flex;align-items:center;gap:12px;padding:12px 12px 12px 16px;margin-bottom:12px;border-radius:16px;background:linear-gradient(90deg,rgba(255,201,51,.16),rgba(255,201,51,.04));border:1px solid rgba(255,201,51,.35)}
.tru .bsum>div{flex:1;min-width:0}
.tru .bsum b{display:block;font:800 1.6rem/1.05 var(--fd);color:var(--gold)}
.tru .bsum span{font:600 .85rem var(--fb);color:#d8d2bf}
.tru .bgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,300px),1fr));gap:12px}
.tru .bc2{position:relative;padding:14px;border-radius:18px;background:rgba(255,255,255,.05);border:1px solid var(--bd);display:flex;flex-direction:column;gap:10px}
.tru .bc2.own{border-color:rgba(56,210,122,.45);background:linear-gradient(160deg,rgba(56,210,122,.1),rgba(255,255,255,.03) 60%)}
.tru .bh{display:flex;gap:12px;align-items:center}
.tru .bh>i{display:grid;place-items:center;width:46px;height:46px;border-radius:14px;flex:none;color:#fff}
.tru .bh>i .ic{width:26px;height:26px}
.tru .bh b{display:block;font:800 1.35rem/1.05 var(--fd);letter-spacing:.02em}
.tru .bh span{font:600 .8rem var(--fb);color:var(--mut)}
.tru .bstat{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.tru .bstat div{padding:8px 10px;border-radius:12px;background:rgba(0,0,0,.25)}
.tru .bstat small{display:block;font:700 .66rem/1 var(--fb);letter-spacing:.12em;text-transform:uppercase;color:var(--mut);margin-bottom:4px}
.tru .bstat b{font:800 1.25rem/1 var(--fd);letter-spacing:.02em}
.tru .perk{display:flex;gap:8px;align-items:flex-start;font:600 .88rem/1.3 var(--fb);color:#dfe3e8}
.tru .perk .ic{width:18px;height:18px;color:var(--gold);margin-top:1px}
.tru .owned{display:flex;align-items:center;justify-content:center;gap:6px;min-height:46px;border-radius:14px;background:rgba(56,210,122,.12);color:var(--ok);font:800 1.15rem/1 var(--fd);letter-spacing:.08em;text-transform:uppercase}
.tru .owned .ic{width:20px;height:20px}

/* ---------- Cilësimet ---------- */
.tru .sgrid{display:grid;grid-template-columns:1fr;gap:0 22px;max-width:980px;margin:0 auto}
.tru .opts{display:grid;gap:10px}
.tru .opt{display:grid;grid-template-columns:48px 1fr 24px;align-items:center;gap:12px;padding:12px 14px;border-radius:16px;background:rgba(255,255,255,.05);border:1px solid var(--bd);pointer-events:auto;transition:border-color .15s,background-color .15s}
.tru .opt>.ic{width:34px;height:34px;justify-self:center;color:var(--mut)}
.tru .opt b{display:block;font:800 1.3rem/1.05 var(--fd);letter-spacing:.03em}
.tru .opt span{display:block;font:500 .85rem/1.3 var(--fb);color:var(--mut);margin-top:3px}
.tru .opt .rad{width:22px;height:22px;border-radius:50%;border:2px solid var(--bd2)}
.tru .opt.on{border-color:var(--acc);background:rgba(255,90,46,.1)}
.tru .opt.on>.ic{color:var(--acc)}
.tru .opt.on .rad{border:7px solid var(--acc)}
.tru .seg{display:grid;grid-auto-flow:column;grid-auto-columns:1fr;gap:4px;padding:4px;border-radius:14px;background:rgba(255,255,255,.05);border:1px solid var(--bd)}
.tru .seg button{min-height:44px;border-radius:10px;font:800 1.05rem/1.05 var(--fd);letter-spacing:.04em;text-transform:uppercase;color:var(--mut);text-align:center;padding:0 6px;pointer-events:auto}
.tru .seg button.on{background:var(--acc);color:#fff}
.tru .row{display:flex;align-items:center;gap:12px;min-height:56px;padding:6px 14px;border-radius:14px;background:rgba(255,255,255,.05);border:1px solid var(--bd);margin-bottom:8px}
.tru .row>.ic{width:24px;height:24px;color:var(--mut)}
.tru .row>div{flex:1;min-width:0}
.tru .row b{display:block;font:700 1rem/1.2 var(--fb)}
.tru .row small{display:block;font:600 .8rem var(--fb);color:var(--mut)}
.tru .row output{font:800 1.15rem/1 var(--fd);color:var(--gold);min-width:44px;text-align:right}
.tru .sld{display:block;padding:10px 14px 14px;border-radius:14px;background:rgba(255,255,255,.05);border:1px solid var(--bd);margin-bottom:8px}
.tru .sld .row{background:none;border:0;padding:0;min-height:36px;margin:0}
.tru .sld.off{opacity:.45}
.tru input[type=range]{-webkit-appearance:none;appearance:none;width:100%;height:32px;background:transparent;pointer-events:auto;touch-action:pan-x;margin:4px 0 0}
.tru input[type=range]::-webkit-slider-runnable-track{height:6px;border-radius:3px;background:linear-gradient(90deg,var(--acc) var(--p,50%),rgba(255,255,255,.15) var(--p,50%))}
.tru input[type=range]::-moz-range-track{height:6px;border-radius:3px;background:linear-gradient(90deg,var(--acc) var(--p,50%),rgba(255,255,255,.15) var(--p,50%))}
.tru input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:28px;height:28px;margin-top:-11px;border-radius:50%;background:#fff;border:0;box-shadow:0 2px 8px rgba(0,0,0,.5)}
.tru input[type=range]::-moz-range-thumb{width:28px;height:28px;border-radius:50%;background:#fff;border:0}
.tru .tg{position:relative;width:54px;height:32px;border-radius:16px;background:rgba(255,255,255,.16);flex:none;transition:background-color .2s;pointer-events:auto}
.tru .tg::after{content:"";position:absolute;left:3px;top:3px;width:26px;height:26px;border-radius:50%;background:#fff;transition:transform .2s;box-shadow:0 2px 6px rgba(0,0,0,.4)}
.tru .tg.on{background:var(--sign)}
.tru .tg.on::after{transform:translateX(22px)}
@media (orientation:landscape){.tru .sgrid{grid-template-columns:1fr 1fr}}

@media (prefers-reduced-motion:reduce){.tru *,.tru *::before,.tru *::after{animation-duration:.001s!important;animation-iteration-count:1!important;transition-duration:.001s!important}}
`;
