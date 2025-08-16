// Symbols used in the reels
    const SYMBOLS = ['🍒','🍋','🔔','⭐️','🍊','💎'];

    // Payout multipliers for 3-of-a-kind
    const PAYOUTS = { '🍒':5, '🍋':3, '🔔':10, '⭐️':20, '🍊':4, '💎':15 };

    // State
    let balance = 1000;
    let auto = false;

    // DOM
    const balanceEl = document.getElementById('balance');
    const betInput = document.getElementById('bet');
    const betValueEl = document.getElementById('betValue');
    const spinBtn = document.getElementById('spinBtn');
    const autoBtn = document.getElementById('autoBtn');
    const resetBtn = document.getElementById('resetBtn');
    const message = document.getElementById('message');

    const reels = [
      {el:document.getElementById('reel1'), strip:document.getElementById('strip1')},
      {el:document.getElementById('reel2'), strip:document.getElementById('strip2')},
      {el:document.getElementById('reel3'), strip:document.getElementById('strip3')}
    ];

    // WebAudio setup (simple tone effects)
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    function playTone(freq, duration=0.12, type='sine', gain=0.12){
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.type = type; o.frequency.value = freq; g.gain.value = gain;
      o.connect(g); g.connect(audioCtx.destination);
      o.start(); g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);
      setTimeout(()=>o.stop(), duration*1000+50);
    }
    function playSpinSound(){playTone(220,0.05,'square',0.06);}
    function playStopSound(){playTone(440,0.12,'sine',0.12);}
    function playWinSound(){playTone(880,0.25,'sawtooth',0.16); setTimeout(()=>playTone(660,0.18,'sine',0.12),160);}    

    // Build strips with repeated symbols for nice animation
    function buildStrip(stripEl){
      stripEl.innerHTML = '';
      // create a long strip of symbols for continuous animation
      for(let i=0;i<20;i++){
        const sym = SYMBOLS[Math.floor(Math.random()*SYMBOLS.length)];
        const div = document.createElement('div'); div.className='symbol'; div.textContent = sym;
        stripEl.appendChild(div);
      }
    }

    function init(){
      reels.forEach(r=>buildStrip(r.strip));
      updateUI();
    }

    function updateUI(){
      balanceEl.textContent = `R$ ${balance.toFixed(2)}`;
      betValueEl.textContent = `R$ ${Number(betInput.value || 0).toFixed(2)}`;
    }

    // Random pick helper
    function pickSymbol(){ return SYMBOLS[Math.floor(Math.random()*SYMBOLS.length)]; }

    // Spin logic: animate by translating the strip then snapping to result
    async function spin(){
      const bet = Math.max(1, Math.floor(Number(betInput.value) || 1));
      if(bet > balance){ message.textContent='Saldo insuficiente.'; return; }
      balance -= bet; updateUI(); message.textContent='GIRANDO...';
      // Unlock audio context if suspended
      if(audioCtx.state === 'suspended') audioCtx.resume();

      spinBtn.disabled = true;

      // prepare results
      const results = [pickSymbol(), pickSymbol(), pickSymbol()];

      // animate each reel with increasing durations
      const baseDuration = 1000 + Math.random()*400; // ms
      const stopDelays = [0, 220 + Math.random()*120, 480 + Math.random()*160];

      // Start spinning visuals (CSS transform)
      reels.forEach(r=>{ r.el.classList.add('spinning'); r.strip.style.transition = 'none'; r.strip.style.transform = 'translateY(0px)'; });

      // quick visual flicker while 'spinning'
      const spinIntervals = reels.map((r,i)=>setInterval(()=>{ // shuffle some symbols visually
        const syms = r.strip.querySelectorAll('.symbol');
        syms.forEach(s=>s.textContent = SYMBOLS[Math.floor(Math.random()*SYMBOLS.length)]);
        playSpinSound();
      },70));

      // stop reels one by one
      for(let i=0;i<reels.length;i++){
        await new Promise(res=>setTimeout(res, stopDelays[i]+baseDuration*i*0.08));
        clearInterval(spinIntervals[i]);
        // Set final center symbol for this reel
        const centerIndex = 2; // we'll put result at the center of the visible window
        // Rebuild a short strip with result in center
        const r = reels[i];
        r.strip.innerHTML = '';
        for(let k=0;k<7;k++){
          const div = document.createElement('div'); div.className='symbol';
          const sym = (k===3) ? results[i] : SYMBOLS[Math.floor(Math.random()*SYMBOLS.length)];
          div.textContent = sym; r.strip.appendChild(div);
        }
        // Position strip above so it can slide to center
        r.strip.style.transition = 'transform 700ms cubic-bezier(.08,.79,.17,1)';
        r.el.classList.remove('spinning');
        // start from -200px and move to 0
        r.strip.style.transform = 'translateY(-160px)';
        // force reflow
        void r.strip.offsetWidth;
        r.strip.style.transform = 'translateY(0px)';
        playStopSound();
        // small pause after each reel
        await new Promise(res=>setTimeout(res, 240));
      }

      // determine payout
      const [a,b,c] = results;
      let payout = 0;
      if(a===b && b===c){ // three of a kind
        payout = bet * (PAYOUTS[a] || 2);
      } else if(a===b || a===c || b===c){ payout = bet * 1.5; }

      if(payout > 0){
        balance += payout;
        message.textContent = `Você ganhou R$ ${payout.toFixed(2)}! (${results.join(' ')})`;
        playWinSound();
        // visual win
        balanceEl.classList.add('big-win'); setTimeout(()=>balanceEl.classList.remove('big-win'),900);
      } else {
        message.textContent = `Perdeu. Resultado: ${results.join(' ')}.`;
      }

      updateUI();
      spinBtn.disabled = false;

      // if auto mode, schedule next spin
      if(auto && balance >= Number(betInput.value)){
        setTimeout(()=>spin(), 700);
      } else if(auto){ auto = false; autoBtn.textContent='Auto'; }
    }

    // Event listeners
    spinBtn.addEventListener('click', ()=>spin());
    autoBtn.addEventListener('click', ()=>{
      auto = !auto; autoBtn.textContent = auto ? 'Auto (ON)' : 'Auto'; if(auto) spin();
    });

    betInput.addEventListener('input', ()=>{ updateUI(); });
    resetBtn.addEventListener('click', ()=>{ balance = 1000; updateUI(); message.textContent='Saldo resetado para R$ 1000'; });

    // init UI and create ambient subtle animation
    init();

    // Accessibility: keyboard shortcut S to spin
    document.addEventListener('keydown', (e)=>{ if(e.key.toLowerCase()==='s') spin(); });

