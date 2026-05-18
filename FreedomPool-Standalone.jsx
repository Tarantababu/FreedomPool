import { useState, useEffect } from "react";

/* ── TOKENS ──────────────────────────────────────────────────────────────── */
const T = {
  bg:      "#FAFAFA",
  white:   "#FFFFFF",
  ink:     "#0A0A0A",
  ink2:    "#3D3D3D",
  ink3:    "#8A8A8A",
  ink4:    "#C8C8C8",
  line:    "#E8E8E8",
  green:   "#00E57A",
  greenDk: "#00B85F",
  greenBg: "#00E57A12",
  red:     "#FF4444",
  redBg:   "#FF444410",
  amber:   "#FF9500",
};

/* ── INITIAL DATA ─────────────────────────────────────────────────────────── */
const INIT_POOLS = {
  small:   { id:"small",   name:"Koruma",  range:"10 – 500",    min:10,   max:500,   mult:1.0, tvl:24800,  users:124 },
  mid:     { id:"mid",     name:"Büyüme",  range:"500 – 5K",    min:500,  max:5000,  mult:1.5, tvl:87500,  users:43  },
  premium: { id:"premium", name:"Prestij", range:"5K – 100K",   min:5000, max:100000,mult:2.0, tvl:312000, users:18  },
};

const YIELDS = [
  { label:"Aave",    pct:60, apy:"8.4", emoji:"🏦" },
  { label:"RWA",     pct:20, apy:"11.2",emoji:"🏢" },
  { label:"Staking", pct:20, apy:"4.8", emoji:"⚡" },
];

/* ── HELPERS ─────────────────────────────────────────────────────────────── */
function sum(pools){ return Object.values(pools).reduce((a,p)=>a+p.tvl,0); }
function fmt(n,dec=0){ return n.toLocaleString("tr-TR",{minimumFractionDigits:dec,maximumFractionDigits:dec}); }

/* ── MICRO COMPONENTS ────────────────────────────────────────────────────── */
function Pill({ children, color = T.green }){
  return(
    <span style={{
      display:"inline-flex",alignItems:"center",gap:4,
      padding:"3px 10px",borderRadius:99,
      background:color+"18",color,
      fontSize:11,fontWeight:600,letterSpacing:.3
    }}>{children}</span>
  );
}

function Row({ left, right, muted }){
  return(
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:`1px solid ${T.line}`}}>
      <span style={{fontSize:13,color:muted?T.ink3:T.ink2}}>{left}</span>
      <span style={{fontSize:13,fontWeight:600,color:T.ink}}>{right}</span>
    </div>
  );
}

function Toast({ msg, type, onClose }){
  useEffect(()=>{ const t=setTimeout(onClose,3200); return()=>clearTimeout(t); },[]);
  const c = type==="ok"?T.green : type==="warn"?T.amber : T.red;
  return(
    <div style={{
      position:"fixed",bottom:24,left:"50%",transform:"translateX(-50%)",
      zIndex:9999,background:T.white,border:`1px solid ${c}40`,
      boxShadow:`0 4px 24px ${c}20, 0 2px 8px #0000001A`,
      padding:"12px 20px",borderRadius:12,
      fontSize:13,color:T.ink,fontWeight:500,
      display:"flex",alignItems:"center",gap:8,
      whiteSpace:"nowrap",
      animation:"popUp .2s cubic-bezier(.34,1.56,.64,1)"
    }}>
      <span style={{width:6,height:6,borderRadius:"50%",background:c,flexShrink:0,boxShadow:`0 0 8px ${c}`}}/>
      {msg}
    </div>
  );
}

function Modal({ title, emoji, children, onClose }){
  return(
    <div style={{position:"fixed",inset:0,background:"#00000030",zIndex:8000,display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(6px)"}}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{background:T.white,border:`1px solid ${T.line}`,borderRadius:16,width:460,overflow:"hidden",boxShadow:"0 24px 80px #00000020"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"20px 24px",borderBottom:`1px solid ${T.line}`}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            {emoji && <span style={{fontSize:18}}>{emoji}</span>}
            <span style={{fontSize:16,fontWeight:700,color:T.ink}}>{title}</span>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:T.ink3,fontSize:20,lineHeight:1,padding:"0 2px"}}>×</button>
        </div>
        <div style={{padding:24}}>{children}</div>
      </div>
    </div>
  );
}

/* ── APP ─────────────────────────────────────────────────────────────────── */
export default function FreedomPool(){
  const [pools,    setPools]    = useState(INIT_POOLS);
  const [screen,   setScreen]   = useState("home"); // home | deposit
  const [selPool,  setSelPool]  = useState("small");
  const [amount,   setAmount]   = useState("");
  const [userPos,  setUserPos]  = useState({ pool:null, amount:0, depositEpoch:null });
  const [epoch,    setEpoch]    = useState(8);
  const [winner,   setWinner]   = useState(null);
  const [drawing,  setDrawing]  = useState(false);
  const [toast,    setToast]    = useState(null);
  const [modal,    setModal]    = useState(null); // null | "withdraw" | "info" | "admin"

  /* ── Referral & Points State ── */
  const [userPoints,    setUserPoints]    = useState(0);
  const [referralCount, setReferralCount] = useState(0);
  const [pointsDays,    setPointsDays]    = useState(0); // simulated days deposited
  const [refCode]       = useState(() => "userX_" + Math.random().toString(36).slice(2, 8));

  const notify = (msg, type="ok") => setToast({ msg, type });

  const tvl   = sum(pools);
  const yld   = tvl*(7.8/100/52);
  const admin = yld*0.10;
  const net   = yld-admin;
  const prize = net*0.30;
  const wkly  = net-prize;
  const pool  = pools[selPool];
  const totalUsers = Object.values(pools).reduce((a,p)=>a+p.users,0);

  /* ── Lock-up & Epoch Eligibility ── */
  const isLocked       = userPos.pool && userPos.depositEpoch !== null && userPos.depositEpoch >= epoch;
  const isEligible     = userPos.pool && userPos.depositEpoch !== null && userPos.depositEpoch < epoch;
  const eligibleAmount = isEligible ? userPos.amount : 0;
  const lockedAmount   = isLocked   ? userPos.amount : 0;
  const epochsUntilEligible = isLocked ? (userPos.depositEpoch - epoch + 1) : 0;

  /* ── Penalty (dynamic: applies only if locked) ── */
  const penaltyRate = isLocked ? 0.05 : 0;
  const pen   = userPos.amount * penaltyRate;
  const netO  = userPos.amount - pen;

  /* actions */
  function doDeposit(){
    const a = parseFloat(amount);
    if(!a || a<pool.min || a>pool.max){
      notify(`${fmt(pool.min)} – ${fmt(pool.max)} USDC arası gir`, "err"); return;
    }
    setPools(p=>({...p,[selPool]:{...p[selPool],tvl:p[selPool].tvl+a,users:p[selPool].users+1}}));
    setUserPos({ pool:selPool, amount:(userPos.pool===selPool?userPos.amount:0)+a, depositEpoch:epoch });
    // Award instant deposit bonus points (10% of amount)
    const bonusPoints = Math.floor(a * 0.1);
    setUserPoints(prev => prev + bonusPoints);
    setAmount(""); setScreen("home");
    notify(`🎉 ${fmt(a)} USDC yatırıldı — ${pools[selPool].name} havuzu · +${bonusPoints} bonus puan · Epoch #${epoch+1}'de çekilişe katılırsın`);
  }

  function doWithdraw(){
    if(isLocked){
      notify(`⚠️ Fonların kilitli! Epoch #${userPos.depositEpoch+1}'e kadar bekle veya %5 ceza öde.`, "warn");
    }
    setPools(p=>({...p,[userPos.pool]:{...p[userPos.pool],tvl:Math.max(0,p[userPos.pool].tvl-netO),users:Math.max(0,p[userPos.pool].users-1)}}));
    const penMsg = pen > 0 ? ` · ${fmt(pen,2)} USDC ceza havuza eklendi` : "";
    setUserPos({pool:null,amount:0,depositEpoch:null}); setModal(null);
    notify(`${fmt(netO,2)} USDC gönderildi${penMsg}`, pen > 0 ? "warn" : "ok");
  }

  function doDraw(){
    setDrawing(true); setWinner(null);

    /* ── Quadratic Fairness Lottery ──
       ticket_power = √(avg_deposit_per_user) × multiplier × user_count
       This gives smaller pools a fairer chance vs whale-dominated pools.
    */
    const poolEntries = Object.values(pools).filter(p => p.users > 0);
    const weights = poolEntries.map(p => {
      const avgDeposit = p.tvl / p.users;
      return Math.sqrt(avgDeposit) * p.mult * p.users;
    });
    const totalWeight = weights.reduce((a, w) => a + w, 0);

    // Weighted random selection of winning pool
    let rand = Math.random() * totalWeight;
    let winningPool = poolEntries[0];
    for (let i = 0; i < poolEntries.length; i++) {
      rand -= weights[i];
      if (rand <= 0) { winningPool = poolEntries[i]; break; }
    }

    // Simulate a random winner address from that pool
    const addrs = ["0x4F2A…B3E1","0x9C1D…F847","0x2B8E…A219","0x7F3C…D560","0xA1E8…C4F2","0x6D9B…E703"];
    const addr = addrs[Math.floor(Math.random() * addrs.length)];

    setTimeout(() => {
      setWinner({ addr, pool: winningPool.name, total: fmt(wkly + prize, 2) });
      setEpoch(e => e + 1); setDrawing(false);
      notify(`🏆 Epoch #${epoch} bitti — Kazanan seçildi!`);
    }, 2000);
  }

  /* ── Quadratic Fairness Calculations (for UI) ── */
  const poolFairness = (() => {
    const entries = Object.values(pools).filter(p => p.users > 0);
    const weights = entries.map(p => {
      const avgDeposit = p.tvl / Math.max(p.users, 1);
      return { id: p.id, weight: Math.sqrt(avgDeposit) * p.mult * p.users };
    });
    const total = weights.reduce((a, w) => a + w.weight, 0);
    const result = {};
    weights.forEach(w => { result[w.id] = total > 0 ? (w.weight / total * 100) : 0; });
    return result;
  })();

  /* ── Point Farming Simulation ── */
  // Accrue points: 1 point per USDC per day, +10% bonus per referral
  useEffect(() => {
    if (!userPos.pool || userPos.amount <= 0) return;
    const interval = setInterval(() => {
      setPointsDays(d => d + 1);
      const basePoints = userPos.amount; // 1 point per USDC per "day"
      const referralBonus = referralCount > 0 ? basePoints * 0.10 * referralCount : 0;
      setUserPoints(prev => prev + basePoints + referralBonus);
    }, 5000); // Simulate 1 "day" every 5 seconds for demo
    return () => clearInterval(interval);
  }, [userPos.pool, userPos.amount, referralCount]);

  // Points multiplier tier
  const pointsMultiplier = userPoints >= 50000 ? 3.0 : userPoints >= 20000 ? 2.5 : userPoints >= 10000 ? 2.0 : userPoints >= 5000 ? 1.5 : 1.0;
  const multiplierLabel = pointsMultiplier >= 3.0 ? "💎 Diamond" : pointsMultiplier >= 2.5 ? "🥇 Gold" : pointsMultiplier >= 2.0 ? "🥈 Silver" : pointsMultiplier >= 1.5 ? "🥉 Bronze" : "🌱 Starter";
  // Simulated global rank
  const globalRank = Math.max(1, Math.floor(500 - (userPoints / 100)));

  function shareReferral() {
    const link = `https://freedompool.io/?ref=${refCode}`;
    navigator.clipboard.writeText(link).then(() => {
      notify(`📋 Referans linkin kopyalandı! Paylaş ve bonus kazan.`);
      // Simulate a referral joining after share
      setTimeout(() => {
        setReferralCount(c => c + 1);
        notify(`🎉 Yeni referans katıldı! Toplam: ${referralCount + 1} · +%10 puan bonusu aktif`, "ok");
      }, 3000);
    }).catch(() => {
      notify(`Link: ${link}`, "ok");
    });
  }

  /* ── RENDER ── */
  return(
    <div style={{ minHeight:"100vh", background:T.bg, color:T.ink, fontFamily:"'Geist','Inter','Helvetica Neue',sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=Inter:wght@400;500;600;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        button,input{font-family:inherit}
        input{outline:none}
        @keyframes popUp{from{transform:translateX(-50%) scale(.9);opacity:0}to{transform:translateX(-50%) scale(1);opacity:1}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:.3}}
        .screen{animation:fadeUp .18s ease}
        .btn-primary{
          display:inline-flex;align-items:center;justify-content:center;gap:8px;
          background:${T.ink};color:${T.white};border:none;border-radius:10px;
          padding:13px 26px;font-size:14px;font-weight:600;cursor:pointer;
          transition:all .15s;letter-spacing:.2px;
        }
        .btn-primary:hover{background:#1a1a1a;transform:translateY(-1px);box-shadow:0 4px 16px #0000002A}
        .btn-primary:active{transform:translateY(0)}
        .btn-outline{
          display:inline-flex;align-items:center;justify-content:center;
          background:transparent;color:${T.ink2};border:1.5px solid ${T.line};border-radius:10px;
          padding:12px 22px;font-size:13px;font-weight:500;cursor:pointer;transition:all .15s;
        }
        .btn-outline:hover{border-color:${T.ink3};color:${T.ink}}
        .btn-danger{
          display:inline-flex;align-items:center;justify-content:center;
          background:${T.redBg};color:${T.red};border:1.5px solid ${T.red}30;border-radius:10px;
          padding:12px 22px;font-size:13px;font-weight:600;cursor:pointer;transition:all .15s;
        }
        .btn-danger:hover{background:${T.red}20}
        .btn-green{
          display:inline-flex;align-items:center;justify-content:center;gap:8px;
          background:${T.green};color:${T.ink};border:none;border-radius:10px;
          padding:13px 26px;font-size:14px;font-weight:700;cursor:pointer;transition:all .15s;
        }
        .btn-green:hover{background:${T.greenDk};transform:translateY(-1px);box-shadow:0 4px 20px ${T.green}50}
        .btn-green:active{transform:translateY(0)}
        .card{background:${T.white};border:1.5px solid ${T.line};border-radius:16px;overflow:hidden;transition:box-shadow .2s}
        .card:hover{box-shadow:0 4px 20px #00000008}
        .pool-opt{
          border:1.5px solid ${T.line};border-radius:12px;padding:14px 18px;
          cursor:pointer;transition:all .15s;background:${T.white};
        }
        .pool-opt:hover{border-color:${T.ink3}}
        .pool-opt.sel{border-color:${T.ink};background:${T.ink}05}
        .inp{
          width:100%;background:${T.bg};border:1.5px solid ${T.line};border-radius:10px;
          padding:13px 16px;font-size:16px;color:${T.ink};transition:border-color .15s;
        }
        .inp:focus{border-color:${T.ink};background:${T.white}}
        ::-webkit-scrollbar{width:3px}
        ::-webkit-scrollbar-thumb{background:${T.line}}
      `}</style>

      {/* ── HEADER ─────────────────────────────────────────────────────── */}
      <header style={{ background:T.white, borderBottom:`1.5px solid ${T.line}` }}>
        <div style={{ maxWidth:920, margin:"0 auto", padding:"0 28px", height:58, display:"flex", alignItems:"center", justifyContent:"space-between" }}>

          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <span style={{ fontFamily:"'Syne',sans-serif", fontSize:20, fontWeight:800, letterSpacing:"-.5px" }}>
              Freedom<span style={{ color:T.green }}>Pool</span>
            </span>
            <Pill>Beta 🚀</Pill>
          </div>

          <div style={{ display:"flex", alignItems:"center", gap:16 }}>
            <button className="btn-outline" style={{ padding:"7px 14px", fontSize:12, borderRadius:8 }} onClick={()=>setModal("admin")}>
              📊 Admin
            </button>
            <div style={{ display:"flex", alignItems:"center", gap:6 }}>
              <span style={{ width:6, height:6, borderRadius:"50%", background:T.green, display:"inline-block", animation:"blink 2s infinite" }}/>
              <span style={{ fontSize:12, color:T.ink3 }}>Polygon · Simülasyon</span>
            </div>
          </div>
        </div>
      </header>

      {/* ── KPI BAR ────────────────────────────────────────────────────── */}
      <div style={{ background:T.white, borderBottom:`1.5px solid ${T.line}` }}>
        <div style={{ maxWidth:920, margin:"0 auto", display:"grid", gridTemplateColumns:"repeat(4,1fr)" }}>
          {[
            { e:"💰", l:"Toplam Havuz",     v:`$${fmt(tvl/1000,0)}K`,       s:"3 aktif havuz" },
            { e:"📈", l:"Haftalık Getiri",  v:`$${fmt(yld,0)}`,             s:"APY 7.8%" },
            { e:"👥", l:"Katılımcı",        v:fmt(totalUsers),              s:"aktif kullanıcı" },
            { e:"🎲", l:"Epoch",            v:`#${epoch}`,                  s:"Her Pazartesi" },
          ].map((k,i)=>(
            <div key={i} style={{ padding:"16px 24px", borderRight:i<3?`1.5px solid ${T.line}`:"none" }}>
              <div style={{ fontSize:11, color:T.ink3, marginBottom:6, display:"flex", alignItems:"center", gap:5 }}>
                <span>{k.e}</span> {k.l}
              </div>
              <div style={{ fontFamily:"'Syne',sans-serif", fontSize:24, fontWeight:800, color:T.ink, lineHeight:1 }}>{k.v}</div>
              <div style={{ fontSize:11, color:T.ink4, marginTop:5 }}>{k.s}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── MAIN ───────────────────────────────────────────────────────── */}
      <main style={{ maxWidth:920, margin:"0 auto", padding:"28px 28px 80px" }}>

        {/* ══ HOME ══════════════════════════════════════════════════════ */}
        {screen==="home" && (
          <div className="screen" style={{ display:"flex", flexDirection:"column", gap:16 }}>

            {/* Hero / Pozisyon */}
            {userPos.pool ? (
              <div className="card" style={{ padding:"24px 28px", borderColor:T.green+"60", background:`linear-gradient(135deg,${T.green}08,${T.white})` }}>
                <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", flexWrap:"wrap", gap:12 }}>
                  <div>
                    <div style={{ fontSize:12, color:T.ink3, marginBottom:6, display:"flex", alignItems:"center", gap:6 }}>
                      <span style={{ width:7, height:7, borderRadius:"50%", background:isEligible?T.green:T.amber, display:"inline-block" }}/> Aktif Pozisyon
                      {isLocked && <Pill color={T.amber}>🔒 Kilitli</Pill>}
                      {isEligible && <Pill color={T.green}>✓ Çekilişe Uygun</Pill>}
                    </div>
                    <div style={{ fontFamily:"'Syne',sans-serif", fontSize:32, fontWeight:800, color:T.ink, lineHeight:1 }}>
                      ${fmt(userPos.amount)} <span style={{ fontSize:16, color:T.ink3, fontFamily:"inherit" }}>USDC</span>
                    </div>
                    <div style={{ fontSize:13, color:T.ink3, marginTop:8, display:"flex", gap:16, flexWrap:"wrap" }}>
                      <span>🏊 {pools[userPos.pool]?.name} Havuzu · {pools[userPos.pool]?.mult}× şans</span>
                      <span style={{ color:T.green, fontWeight:600 }}>+${fmt(userPos.amount*0.0015,2)} / hafta</span>
                    </div>

                    {/* Eligible / Locked Balance Breakdown */}
                    <div style={{ marginTop:12, display:"flex", gap:12, flexWrap:"wrap" }}>
                      <div style={{ padding:"8px 14px", borderRadius:10, background:isEligible?T.greenBg:T.bg, border:`1.5px solid ${isEligible?T.green+"30":T.line}` }}>
                        <div style={{ fontSize:10, color:T.ink4, marginBottom:2 }}>Çekilişe Uygun Bakiye</div>
                        <div style={{ fontSize:14, fontWeight:700, color:isEligible?T.greenDk:T.ink3 }}>${fmt(eligibleAmount)} USDC</div>
                      </div>
                      <div style={{ padding:"8px 14px", borderRadius:10, background:isLocked?T.redBg:T.bg, border:`1.5px solid ${isLocked?T.red+"30":T.line}` }}>
                        <div style={{ fontSize:10, color:T.ink4, marginBottom:2 }}>Kilitli / Bekleyen Bakiye</div>
                        <div style={{ fontSize:14, fontWeight:700, color:isLocked?T.red:T.ink3 }}>${fmt(lockedAmount)} USDC</div>
                      </div>
                      <div style={{ padding:"8px 14px", borderRadius:10, background:T.bg, border:`1.5px solid ${T.line}` }}>
                        <div style={{ fontSize:10, color:T.ink4, marginBottom:2 }}>Yatırım Epoch'u</div>
                        <div style={{ fontSize:14, fontWeight:700, color:T.ink }}>#{userPos.depositEpoch} → #{userPos.depositEpoch+1}</div>
                      </div>
                    </div>

                    {isLocked && (
                      <div style={{ marginTop:10, padding:"8px 12px", background:T.amber+"12", border:`1.5px solid ${T.amber}30`, borderRadius:8, fontSize:12, color:T.ink2, lineHeight:1.6 }}>
                        ⏳ Fonların Epoch #{userPos.depositEpoch+1}'de çekilişe uygun olacak. Şu an çekersen %5 erken çıkış cezası uygulanır.
                      </div>
                    )}
                  </div>
                  <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                    <button className="btn-green" style={{ borderRadius:10, padding:"10px 16px", fontSize:12 }} onClick={shareReferral}>🔗 Referans Paylaş</button>
                    <button className="btn-outline" style={{ borderRadius:10 }} onClick={()=>setScreen("deposit")}>+ Ekle</button>
                    <button className="btn-danger" onClick={()=>setModal("withdraw")}>Çek</button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="card" style={{ padding:"40px 32px", textAlign:"center" }}>
                <div style={{ fontSize:40, marginBottom:14 }}>🌊</div>
                <div style={{ fontFamily:"'Syne',sans-serif", fontSize:26, fontWeight:800, marginBottom:10, color:T.ink }}>
                  Paranı çalıştır. Çekilişe katıl.
                </div>
                <div style={{ fontSize:14, color:T.ink3, maxWidth:440, margin:"0 auto 24px", lineHeight:1.8 }}>
                  Anaparan her zaman güvende. Kazanılan faiz ödül havuzuna girer.
                  Her hafta kazananlar <strong>anapara + ödül</strong> alır.
                </div>
                <div style={{ display:"flex", gap:10, justifyContent:"center", flexWrap:"wrap" }}>
                  <button className="btn-primary" onClick={()=>setScreen("deposit")}>Yatırım Yap →</button>
                  <button className="btn-outline" onClick={()=>setModal("info")}>Nasıl çalışır? 💡</button>
                  <button className="btn-green" style={{ padding:"12px 20px", fontSize:13 }} onClick={shareReferral}>🔗 Referans Linki Al</button>
                </div>
              </div>
            )}

            {/* 2 kolon */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>

              {/* Havuzlar */}
              <div className="card">
                <div style={{ padding:"14px 20px", borderBottom:`1.5px solid ${T.line}`, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <span>🏊</span>
                    <span style={{ fontSize:12, fontWeight:600, color:T.ink2, letterSpacing:.5 }}>HAVUZLAR</span>
                  </div>
                  <Pill color={T.green}>√x Quadratic</Pill>
                </div>
                {Object.values(pools).map((p,i)=>{
                  const pct = (p.tvl/tvl*100).toFixed(0);
                  const fairPct = poolFairness[p.id] || 0;
                  return(
                    <div key={p.id} style={{ padding:"14px 20px", borderBottom:i<2?`1.5px solid ${T.line}`:"none" }}>
                      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
                        <div>
                          <span style={{ fontWeight:700, fontSize:14 }}>{p.name}</span>
                          <span style={{ fontSize:12, color:T.ink3, marginLeft:8 }}>{p.range} USDC</span>
                        </div>
                        <span style={{ fontSize:12, color:T.ink3 }}>{p.users} kişi</span>
                      </div>
                      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:6 }}>
                        <div style={{ flex:1, height:4, background:T.line, borderRadius:99 }}>
                          <div style={{ width:pct+"%", height:"100%", background:T.ink, borderRadius:99, transition:"width .6s" }}/>
                        </div>
                        <span style={{ fontSize:12, color:T.ink3, minWidth:58, textAlign:"right" }}>${fmt(p.tvl/1000,0)}K</span>
                      </div>
                      {/* Fairness Index */}
                      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                        <div style={{ flex:1, height:3, background:T.line, borderRadius:99 }}>
                          <div style={{ width:fairPct.toFixed(0)+"%", height:"100%", background:T.green, borderRadius:99, transition:"width .6s" }}/>
                        </div>
                        <span style={{ fontSize:11, color:T.greenDk, fontWeight:600, minWidth:70, textAlign:"right" }}>🎯 %{fairPct.toFixed(1)} şans</span>
                      </div>
                    </div>
                  );
                })}
                {/* Quadratic fairness explanation */}
                <div style={{ padding:"10px 20px", background:T.greenBg, borderTop:`1.5px solid ${T.line}`, fontSize:11, color:T.ink3, lineHeight:1.6 }}>
                  ⚖️ <strong style={{ color:T.greenDk }}>Quadratic Fairness</strong> — Küçük tasarrufçuları balina dominasyonundan korumak için √x bilet sistemi kullanılır. Kazanma şansı = √(miktar) × çarpan.
                </div>
              </div>

              {/* Getiri */}
              <div className="card">
                <div style={{ padding:"14px 20px", borderBottom:`1.5px solid ${T.line}`, display:"flex", alignItems:"center", gap:8 }}>
                  <span>⚙️</span>
                  <span style={{ fontSize:12, fontWeight:600, color:T.ink2, letterSpacing:.5 }}>PARANIN GİTTİĞİ YER</span>
                </div>
                {YIELDS.map((y,i)=>(
                  <div key={i} style={{ padding:"14px 20px", borderBottom:i<2?`1.5px solid ${T.line}`:"none", display:"flex", alignItems:"center", gap:14 }}>
                    <span style={{ fontSize:20 }}>{y.emoji}</span>
                    <div style={{ flex:1 }}>
                      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                        <span style={{ fontSize:13, fontWeight:600 }}>{y.label}</span>
                        <span style={{ fontSize:13, fontWeight:700 }}>{y.pct}%</span>
                      </div>
                      <div style={{ height:4, background:T.line, borderRadius:99 }}>
                        <div style={{ width:y.pct+"%", height:"100%", background:T.green, borderRadius:99 }}/>
                      </div>
                    </div>
                    <div style={{ fontSize:12, color:T.ink3, minWidth:50, textAlign:"right" }}>APY {y.apy}%</div>
                  </div>
                ))}
                <div style={{ padding:"10px 20px", background:T.greenBg, borderTop:`1.5px solid ${T.line}`, fontSize:12, color:T.ink3 }}>
                  Ağırlıklı ort. APY&nbsp;<strong style={{ color:T.greenDk }}>7.8%</strong> 🌱
                </div>
              </div>
            </div>

            {/* Çekiliş */}
            <div className="card">
              <div style={{ padding:"14px 20px", borderBottom:`1.5px solid ${T.line}`, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <span>🎲</span>
                  <span style={{ fontSize:12, fontWeight:600, color:T.ink2, letterSpacing:.5 }}>EPOCH #{epoch} · HAFTALIK ÇEKİLİŞ</span>
                </div>
                <button className="btn-outline" style={{ padding:"5px 12px", fontSize:11, borderRadius:8 }} onClick={()=>setModal("info")}>Nasıl çalışır?</button>
              </div>

              <div style={{ padding:"20px 24px", display:"flex", alignItems:"center", gap:0, flexWrap:"wrap" }}>
                {[
                  { e:"💸", l:"Haftalık Ödül",      v:`$${fmt(wkly,2)}` },
                  { e:"🏆", l:"Freedom Prize",      v:`$${fmt(prize,2)}` },
                  { e:"🔒", l:"Platform Ücreti",    v:`$${fmt(admin,2)}` },
                  { e:"💎", l:"Toplam Dağıtılacak", v:`$${fmt(wkly+prize,2)}` },
                ].map((k,i)=>(
                  <div key={i} style={{ flex:"1 1 120px", padding:"0 20px", borderRight:i<3?`1.5px solid ${T.line}`:"none", marginBottom:8 }}>
                    <div style={{ fontSize:11, color:T.ink3, marginBottom:4, display:"flex", alignItems:"center", gap:5 }}>
                      <span>{k.e}</span>{k.l}
                    </div>
                    <div style={{ fontFamily:"'Syne',sans-serif", fontSize:20, fontWeight:800, color:T.ink }}>{k.v}</div>
                  </div>
                ))}
                <div style={{ paddingLeft:20 }}>
                  <button className="btn-green" onClick={doDraw} disabled={drawing} style={{ opacity:drawing?.65:1, cursor:drawing?"not-allowed":"pointer" }}>
                    {drawing
                      ? <><span style={{ width:14,height:14,borderRadius:"50%",border:`2px solid ${T.ink}30`,borderTop:`2px solid ${T.ink}`,display:"inline-block",animation:"spin .7s linear infinite" }}/> Çekiliyor…</>
                      : "🎲 Çekilişi Başlat"}
                  </button>
                </div>
              </div>

              {winner && (
                <div style={{ padding:"12px 24px", borderTop:`1.5px solid ${T.line}`, background:T.greenBg, display:"flex", alignItems:"center", gap:12, flexWrap:"wrap" }}>
                  <Pill>🏆 Kazanan</Pill>
                  <span style={{ fontSize:13, fontFamily:"monospace", color:T.ink2 }}>{winner.addr}</span>
                  <span style={{ fontSize:13, color:T.ink3 }}>{winner.pool} Havuzu</span>
                  <span style={{ marginLeft:"auto", fontSize:14, fontWeight:700, color:T.greenDk }}>+${winner.total} USDC 🎉</span>
                </div>
              )}
            </div>

            {/* ── Airdrop Phase 1: Point Dashboard ── */}
            <div className="card" style={{ background:`linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)`, border:"none", color:T.white }}>
              <div style={{ padding:"16px 20px", borderBottom:"1px solid #ffffff15", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <span>🪂</span>
                  <span style={{ fontSize:12, fontWeight:700, letterSpacing:.5, color:"#ffffff" }}>AIRDROP PHASE 1 · PUAN FARMING</span>
                </div>
                <span style={{ fontSize:11, padding:"3px 10px", borderRadius:99, background:"#00E57A20", color:T.green, fontWeight:600 }}>Aktif 🟢</span>
              </div>

              <div style={{ padding:"20px 24px", display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:16 }}>
                {/* Total Points */}
                <div style={{ textAlign:"center" }}>
                  <div style={{ fontSize:10, color:"#ffffff80", marginBottom:6, textTransform:"uppercase", letterSpacing:.5 }}>Toplam Puan</div>
                  <div style={{ fontFamily:"'Syne',sans-serif", fontSize:26, fontWeight:800, color:T.green, lineHeight:1 }}>{fmt(Math.floor(userPoints))}</div>
                  <div style={{ fontSize:11, color:"#ffffff50", marginTop:4 }}>{pointsDays} gün farming</div>
                </div>

                {/* Multiplier */}
                <div style={{ textAlign:"center" }}>
                  <div style={{ fontSize:10, color:"#ffffff80", marginBottom:6, textTransform:"uppercase", letterSpacing:.5 }}>Çarpan Seviyesi</div>
                  <div style={{ fontFamily:"'Syne',sans-serif", fontSize:26, fontWeight:800, color:"#ffffff", lineHeight:1 }}>{pointsMultiplier}×</div>
                  <div style={{ fontSize:11, color:"#ffffff50", marginTop:4 }}>{multiplierLabel}</div>
                </div>

                {/* Global Rank */}
                <div style={{ textAlign:"center" }}>
                  <div style={{ fontSize:10, color:"#ffffff80", marginBottom:6, textTransform:"uppercase", letterSpacing:.5 }}>Global Sıralama</div>
                  <div style={{ fontFamily:"'Syne',sans-serif", fontSize:26, fontWeight:800, color:"#ffffff", lineHeight:1 }}>#{globalRank}</div>
                  <div style={{ fontSize:11, color:"#ffffff50", marginTop:4 }}>/ 500 kullanıcı</div>
                </div>

                {/* Referrals */}
                <div style={{ textAlign:"center" }}>
                  <div style={{ fontSize:10, color:"#ffffff80", marginBottom:6, textTransform:"uppercase", letterSpacing:.5 }}>Referanslar</div>
                  <div style={{ fontFamily:"'Syne',sans-serif", fontSize:26, fontWeight:800, color:"#ffffff", lineHeight:1 }}>{referralCount}</div>
                  <div style={{ fontSize:11, color:referralCount>0?T.green:"#ffffff50", marginTop:4 }}>{referralCount>0?`+%${referralCount*10} bonus`:"Henüz yok"}</div>
                </div>
              </div>

              {/* Progress to next tier */}
              <div style={{ padding:"12px 24px 16px", borderTop:"1px solid #ffffff10" }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                  <span style={{ fontSize:11, color:"#ffffff60" }}>Sonraki seviye: {pointsMultiplier < 1.5 ? "🥉 Bronze (5K)" : pointsMultiplier < 2.0 ? "🥈 Silver (10K)" : pointsMultiplier < 2.5 ? "🥇 Gold (20K)" : pointsMultiplier < 3.0 ? "💎 Diamond (50K)" : "🏆 MAX"}</span>
                  <span style={{ fontSize:11, color:T.green, fontWeight:600 }}>{fmt(Math.floor(userPoints))} pts</span>
                </div>
                <div style={{ height:4, background:"#ffffff15", borderRadius:99 }}>
                  <div style={{ width:`${Math.min(100, (userPoints / (pointsMultiplier < 1.5 ? 5000 : pointsMultiplier < 2.0 ? 10000 : pointsMultiplier < 2.5 ? 20000 : 50000)) * 100)}%`, height:"100%", background:`linear-gradient(90deg, ${T.green}, #00B85F)`, borderRadius:99, transition:"width .6s" }}/>
                </div>
              </div>

              {/* Info footer */}
              <div style={{ padding:"10px 24px 14px", display:"flex", alignItems:"center", gap:12, flexWrap:"wrap" }}>
                <span style={{ fontSize:11, color:"#ffffff50", lineHeight:1.6 }}>
                  💡 1 USDC = 1 puan/gün · Referans başına +%10 bonus · Puanlar gelecek $FDM airdrop'unda kullanılacak
                </span>
                <button className="btn-green" style={{ marginLeft:"auto", padding:"8px 14px", fontSize:11, borderRadius:8 }} onClick={shareReferral}>
                  🔗 Paylaş & Kazan
                </button>
              </div>
            </div>

            {/* Şeffaflık footer */}
            <div style={{ padding:"14px 20px", borderRadius:12, background:T.white, border:`1.5px solid ${T.line}`, display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:12 }}>
              <span style={{ fontSize:13, color:T.ink3 }}>
                🔐 Anaparan güvende. Platform ücreti sadece faizden alınır. ⚖️ √x Quadratic Fairness aktif.
              </span>
              <div style={{ display:"flex", gap:20 }}>
                {[{l:"Platform",v:"%10"},{l:"Erken Çıkış",v:"%5 ceza"},{l:"Kilit Süresi",v:"1 Epoch"},{l:"Adalet",v:"√x Quadratic"},{l:"Freedom",v:"Faizin %30'u"}].map((s,i)=>(
                  <div key={i} style={{ textAlign:"right" }}>
                    <div style={{ fontSize:10, color:T.ink4 }}>{s.l}</div>
                    <div style={{ fontSize:13, fontWeight:700, color:T.ink }}>{s.v}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ══ DEPOSIT ═══════════════════════════════════════════════════ */}
        {screen==="deposit" && (
          <div className="screen" style={{ maxWidth:500, margin:"0 auto" }}>
            <button className="btn-outline" style={{ marginBottom:20, padding:"7px 14px", fontSize:12 }} onClick={()=>setScreen("home")}>← Geri</button>

            <div className="card" style={{ borderRadius:16 }}>
              <div style={{ padding:"22px 28px", borderBottom:`1.5px solid ${T.line}` }}>
                <div style={{ fontSize:11, color:T.ink3, marginBottom:6 }}>💳 YENİ YATIRIM</div>
                <div style={{ fontFamily:"'Syne',sans-serif", fontSize:22, fontWeight:800, color:T.ink }}>Havuza Para Yatır</div>
                <div style={{ fontSize:13, color:T.ink3, marginTop:6, lineHeight:1.7 }}>
                  Anaparanız her zaman güvende. Sadece kazanılan faiz ödül havuzuna katılır.
                </div>
              </div>

              <div style={{ padding:"24px 28px", display:"flex", flexDirection:"column", gap:22 }}>

                <div>
                  <div style={{ fontSize:11, fontWeight:600, color:T.ink3, letterSpacing:.5, marginBottom:12 }}>HAVUZ SEÇ</div>
                  <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                    {Object.values(pools).map(p=>(
                      <div key={p.id} className={"pool-opt"+(selPool===p.id?" sel":"")} onClick={()=>setSelPool(p.id)}>
                        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                          <div>
                            <span style={{ fontWeight:700, fontSize:14 }}>{p.name}</span>
                            <span style={{ fontSize:12, color:T.ink3, marginLeft:10 }}>{p.range} USDC</span>
                          </div>
                          <div style={{ textAlign:"right" }}>
                            <div style={{ fontSize:13, fontWeight:700, color:selPool===p.id?T.ink:T.ink3 }}>{p.mult}× şans ✨</div>
                            <div style={{ fontSize:11, color:T.ink4 }}>{p.users} katılımcı</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize:11, fontWeight:600, color:T.ink3, letterSpacing:.5, marginBottom:10 }}>MİKTAR (USDC)</div>
                  <input className="inp" type="number"
                    placeholder={`${fmt(pool.min)} – ${fmt(pool.max)} USDC`}
                    value={amount} onChange={e=>setAmount(e.target.value)} />
                  {amount && parseFloat(amount)>=pool.min && (
                    <div style={{ marginTop:10, padding:"12px 14px", background:T.greenBg, border:`1.5px solid ${T.green}30`, borderRadius:10, fontSize:13, color:T.ink2, lineHeight:1.7 }}>
                      🌱 Haftalık tahmini faiz:&nbsp;
                      <strong style={{ color:T.greenDk }}>+${fmt(parseFloat(amount)*0.0015,2)} USDC</strong><br/>
                      <span style={{ fontSize:12, color:T.ink3 }}>Anaparan güvende: ${fmt(parseFloat(amount))} USDC</span>
                    </div>
                  )}
                </div>

                <button className="btn-primary" style={{ width:"100%", padding:15, fontSize:15, borderRadius:12 }} onClick={doDeposit}>
                  Yatır ve Çekilişe Katıl 🚀
                </button>
                <div style={{ fontSize:11, color:T.ink4, textAlign:"center", lineHeight:1.7 }}>
                  ⏳ 1 Epoch kilit süresi — Epoch #{epoch+1}'de çekilişe katılırsın<br/>
                  Erken çıkışta %5 ceza uygulanır · Ceza diğer katılımcılara aktarılır
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ── WITHDRAW MODAL ──────────────────────────────────────────────── */}
      {modal==="withdraw" && (
        <Modal title="Para Çekme" emoji="💸" onClose={()=>setModal(null)}>
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>

            {/* Lock status banner */}
            {isLocked && (
              <div style={{ padding:"12px 14px", background:T.amber+"12", border:`1.5px solid ${T.amber}40`, borderRadius:10, fontSize:12, color:T.ink2, lineHeight:1.7 }}>
                🔒 <strong>Kilit Süresi Aktif</strong> — Epoch #{userPos.depositEpoch}'de yatırdın. Epoch #{userPos.depositEpoch+1}'e kadar beklemen gerekiyor. Şimdi çekersen <strong>%5 erken çıkış cezası</strong> uygulanır.
              </div>
            )}
            {isEligible && (
              <div style={{ padding:"12px 14px", background:T.greenBg, border:`1.5px solid ${T.green}30`, borderRadius:10, fontSize:12, color:T.ink2, lineHeight:1.7 }}>
                ✅ <strong>Kilit süresi doldu</strong> — Fonların serbest. Cezasız çekebilirsin.
              </div>
            )}

            <div style={{ background:T.bg, borderRadius:12, padding:16, display:"flex", flexDirection:"column", gap:10 }}>
              {[
                { l:"Yatırılan",  v:`$${fmt(userPos.amount)} USDC`, c:T.ink },
                { l:`Ceza (${isLocked?"%5 — kilitli":"Yok — serbest"})`, v: pen > 0 ? `− $${fmt(pen,2)} USDC` : "$0 USDC", c: pen > 0 ? T.red : T.greenDk },
                { l:"Sana dönen", v:`$${fmt(netO,2)} USDC`,         c:T.greenDk },
              ].map((r,i)=>(
                <div key={i} style={{ display:"flex", justifyContent:"space-between", paddingBottom:i<2?10:0, borderBottom:i<2?`1.5px solid ${T.line}`:"none" }}>
                  <span style={{ fontSize:13, color:T.ink3 }}>{r.l}</span>
                  <span style={{ fontSize:14, fontWeight:700, color:r.c }}>{r.v}</span>
                </div>
              ))}
            </div>

            {/* Epoch info row */}
            <div style={{ display:"flex", justifyContent:"space-between", padding:"10px 14px", background:T.bg, borderRadius:10, fontSize:12 }}>
              <span style={{ color:T.ink3 }}>Yatırım Epoch'u</span>
              <span style={{ fontWeight:600 }}>#{userPos.depositEpoch}</span>
            </div>
            <div style={{ display:"flex", justifyContent:"space-between", padding:"10px 14px", background:T.bg, borderRadius:10, fontSize:12 }}>
              <span style={{ color:T.ink3 }}>Mevcut Epoch</span>
              <span style={{ fontWeight:600 }}>#{epoch}</span>
            </div>
            <div style={{ display:"flex", justifyContent:"space-between", padding:"10px 14px", background:T.bg, borderRadius:10, fontSize:12 }}>
              <span style={{ color:T.ink3 }}>Durum</span>
              <span style={{ fontWeight:600, color:isLocked?T.amber:T.greenDk }}>{isLocked?"🔒 Kilitli":"✅ Serbest"}</span>
            </div>

            {pen > 0 && (
              <div style={{ fontSize:12, color:T.ink3, lineHeight:1.7, padding:"10px 14px", background:T.redBg, borderRadius:10 }}>
                ⚠️ {fmt(pen,2)} USDC ceza diğer katılımcıların ödül havuzuna eklenir.
              </div>
            )}
            <div style={{ display:"flex", gap:10, marginTop:4 }}>
              <button className="btn-outline" style={{ flex:1 }} onClick={()=>setModal(null)}>Vazgeç</button>
              <button className="btn-danger" style={{ flex:1 }} onClick={doWithdraw}>
                {isLocked ? "⚠️ Cezalı Çek" : "Onayla ve Çek"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── INFO MODAL ──────────────────────────────────────────────────── */}
      {modal==="info" && (
        <Modal title="Nasıl Çalışır?" emoji="💡" onClose={()=>setModal(null)}>
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            {[
              { e:"1️⃣", t:"Para Yat",      d:"USDC yatırırsın. Anaparan güvende. Sadece faizini riske atarsın." },
              { e:"2️⃣", t:"1 Epoch Bekle",  d:"Flash-loan koruması: Yatırdığın epoch'ta çekilişe katılamazsın. Bir sonraki epoch'ta uygun olursun." },
              { e:"3️⃣", t:"Faiz Kazan",    d:"Para Aave, RWA ve Staking'e dağıtılır. Haftada ~%0.15 faiz üretilir." },
              { e:"4️⃣", t:"Çekilişe Gir",  d:"Her Pazartesi faizden ödül havuzu oluşur. Sadece uygun bakiyeler katılır." },
              { e:"5️⃣", t:"√x Adalet",     d:"Quadratic Fairness: Bilet gücü = √(miktar) × çarpan. Balinalar domine edemez, küçük tasarrufçular korunur." },
              { e:"6️⃣", t:"Freedom Prize", d:"Birikmiş büyük ödül — haftalık ödül + Freedom Prize birlikte kazanılır! 🏆" },
            ].map((s,i)=>(
              <div key={i} style={{ display:"flex", gap:14, paddingBottom:14, borderBottom:i<5?`1.5px solid ${T.line}`:"none" }}>
                <span style={{ fontSize:22, flexShrink:0 }}>{s.e}</span>
                <div>
                  <div style={{ fontWeight:700, fontSize:14, marginBottom:4 }}>{s.t}</div>
                  <div style={{ fontSize:13, color:T.ink3, lineHeight:1.6 }}>{s.d}</div>
                </div>
              </div>
            ))}
          </div>
        </Modal>
      )}

      {/* ── ADMIN MODAL ─────────────────────────────────────────────────── */}
      {modal==="admin" && (
        <Modal title="Platform Şeffaflığı" emoji="📊" onClose={()=>setModal(null)}>
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            <div style={{ background:T.bg, borderRadius:12, overflow:"hidden" }}>
              <Row left="Platform Ücreti Oranı"         right="%10 (sabit, değiştirilemez)" />
              <Row left={`Epoch #${epoch} Ücreti`}      right={`$${fmt(admin,2)} USDC`} />
              <Row left={`Toplam Birikmiş (${epoch} ep)`}right={`$${fmt(admin*epoch,2)} USDC`} />
              <Row left="Ücret Cüzdanı"                 right="0xDead…F00d 🔐" muted />
            </div>
            <div style={{ padding:"12px 14px", background:T.greenBg, borderRadius:10, fontSize:12, color:T.ink3, lineHeight:1.7 }}>
              ✅ Tüm transferler blockchain'de herkese açık görüntülenebilir.<br/>
              ✅ Kullanıcı fonlarına admin erişimi yoktur.
            </div>
            <div style={{ fontWeight:700, fontSize:13, color:T.ink, marginTop:4 }}>Büyüme Projeksiyonu 🚀</div>
            {[
              {tvl:"$500K",   weekly:fmt(500000*0.078/52*0.1,0)},
              {tvl:"$1M",     weekly:fmt(1000000*0.078/52*0.1,0)},
              {tvl:"$5M",     weekly:fmt(5000000*0.078/52*0.1,0)},
              {tvl:"$10M",    weekly:fmt(10000000*0.078/52*0.1,0)},
            ].map((r,i)=>(
              <div key={i} style={{ display:"flex", justifyContent:"space-between", padding:"8px 0", borderBottom:i<3?`1.5px solid ${T.line}`:"none" }}>
                <span style={{ fontSize:13, color:T.ink3 }}>{r.tvl} TVL</span>
                <span style={{ fontSize:13, fontWeight:700 }}>${r.weekly}/hafta</span>
              </div>
            ))}
          </div>
        </Modal>
      )}

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={()=>setToast(null)} />}
    </div>
  );
}
