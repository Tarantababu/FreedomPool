import { useState, useEffect } from "react";
import { useAccount, useChainId } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import {
  useUserPosition,
  useProtocolStats,
  usePoolsInfo,
  useNextEpoch,
  useYieldInfo,
  usePrizeInfo,
  useFdmBalance,
  useUsdcBalance,
  useUsdcAllowance,
  useApproveUsdc,
  useDeposit,
  useWithdraw,
  useClaimRewards,
} from "./hooks/useContracts";
import { useLanguage } from "./hooks/useLanguage";
import LanguageSwitcher from "./components/LanguageSwitcher";
import { POOL_TIER_INFO } from "./config/contracts";
import { formatCountdown } from "./utils/format";

/* ── Design Tokens ─────────────────────────────────────────────────────── */
const T = {
  bg: "#FAFAFA", white: "#FFFFFF", ink: "#0A0A0A", ink2: "#3D3D3D",
  ink3: "#8A8A8A", ink4: "#C8C8C8", line: "#E8E8E8",
  green: "#00E57A", greenDk: "#00B85F", greenBg: "#00E57A12",
  red: "#FF4444", redBg: "#FF444410", amber: "#FF9500",
};

const YIELDS = [
  { label: "Aave V3", pct: 60, apy: "8.4", emoji: "🏦" },
  { label: "RWA", pct: 20, apy: "11.2", emoji: "🏢" },
  { label: "Staking", pct: 20, apy: "4.8", emoji: "⚡" },
];

export default function App() {
  const { t, fmt, dir, lang } = useLanguage();
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { position, refetch: refetchPosition } = useUserPosition();
  const { stats } = useProtocolStats();
  const { pools } = usePoolsInfo();
  const { secondsUntilNextEpoch } = useNextEpoch();
  const { pendingYield } = useYieldInfo();
  const { freedomPrize, participantCount } = usePrizeInfo();
  const { balance: fdmBalance } = useFdmBalance();
  const { balance: usdcBalance } = useUsdcBalance();
  const { allowance, refetch: refetchAllowance } = useUsdcAllowance();

  const { approve, isPending: approving, isSuccess: approved } = useApproveUsdc();
  const { deposit, isPending: depositing, isSuccess: deposited } = useDeposit();
  const { withdraw, isPending: withdrawing, isSuccess: withdrawn } = useWithdraw();
  const { claim, isPending: claiming, isSuccess: claimed } = useClaimRewards();

  const [screen, setScreen] = useState("home");
  const [selTier, setSelTier] = useState(0);
  const [amount, setAmount] = useState("");
  const [toast, setToast] = useState(null);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    setCountdown(secondsUntilNextEpoch);
    const interval = setInterval(() => setCountdown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(interval);
  }, [secondsUntilNextEpoch]);

  useEffect(() => { if (deposited || withdrawn || claimed) refetchPosition(); }, [deposited, withdrawn, claimed]);
  useEffect(() => { if (approved) refetchAllowance(); }, [approved]);

  const notify = (msg, type = "ok") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const networkName = chainId === 137 ? "Polygon Mainnet" : "Polygon Amoy (Test)";
  const tierInfo = POOL_TIER_INFO[selTier];
  const needsApproval = amount && parseFloat(amount) > allowance;

  function handleDeposit() {
    const a = parseFloat(amount);
    if (!a || a < tierInfo.min || a > tierInfo.max) {
      notify(`${t("toast.invalidAmount")} ${fmt(tierInfo.min)} ${t("toast.and")} ${fmt(tierInfo.max)} USDC`, "err");
      return;
    }
    if (a > usdcBalance) {
      notify(t("toast.insufficientBalance"), "err");
      return;
    }
    if (needsApproval) {
      approve(a);
      notify(t("toast.approvalPending"), "warn");
    } else {
      deposit(selTier, a);
      notify(t("toast.txSent"), "warn");
    }
  }

  return (
    <div dir={dir} style={{ minHeight: "100vh", background: T.bg, color: T.ink, fontFamily: "'Inter','Helvetica Neue',sans-serif" }}>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0}
        button,input{font-family:inherit}
        input{outline:none}
        .card{background:${T.white};border:1.5px solid ${T.line};border-radius:16px;overflow:hidden}
        .btn-primary{background:${T.ink};color:${T.white};border:none;border-radius:10px;padding:13px 26px;font-size:14px;font-weight:600;cursor:pointer}
        .btn-primary:hover{background:#1a1a1a}
        .btn-primary:disabled{opacity:.5;cursor:not-allowed}
        .btn-outline{background:transparent;color:${T.ink2};border:1.5px solid ${T.line};border-radius:10px;padding:12px 22px;font-size:13px;font-weight:500;cursor:pointer}
        .btn-danger{background:${T.redBg};color:${T.red};border:1.5px solid ${T.red}30;border-radius:10px;padding:12px 22px;font-size:13px;font-weight:600;cursor:pointer}
        .btn-green{background:${T.green};color:${T.ink};border:none;border-radius:10px;padding:13px 26px;font-size:14px;font-weight:700;cursor:pointer}
        .inp{width:100%;background:${T.bg};border:1.5px solid ${T.line};border-radius:10px;padding:13px 16px;font-size:16px;color:${T.ink}}
        .inp:focus{border-color:${T.ink};background:${T.white}}
        .pool-opt{border:1.5px solid ${T.line};border-radius:12px;padding:14px 18px;cursor:pointer;background:${T.white}}
        .pool-opt:hover{border-color:${T.ink3}}
        .pool-opt.sel{border-color:${T.ink};background:${T.ink}05}
      `}</style>

      {/* Header */}
      <header style={{ background: T.white, borderBottom: `1.5px solid ${T.line}` }}>
        <div style={{ maxWidth: 960, margin: "0 auto", padding: "0 28px", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-.5px" }}>
              Freedom<span style={{ color: T.green }}>Pool</span>
            </span>
            <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 99, background: T.greenBg, color: T.green, fontWeight: 600 }}>
              {chainId === 137 ? t("header.live") : t("header.testnet")} 🚀
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <LanguageSwitcher />
            <span style={{ fontSize: 12, color: T.ink3 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: T.green, display: "inline-block", marginRight: 6 }} />
              {networkName}
            </span>
            <ConnectButton showBalance={false} chainStatus="icon" accountStatus="avatar" />
          </div>
        </div>
      </header>

      {/* KPI Bar */}
      {stats && (
        <div style={{ background: T.white, borderBottom: `1.5px solid ${T.line}` }}>
          <div style={{ maxWidth: 960, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(5,1fr)" }}>
            {[
              { e: "💰", l: t("kpi.tvl"), v: `$${fmt(stats.totalDeposits)}`, s: `${stats.depositorCount} ${t("kpi.users")}` },
              { e: "📈", l: t("kpi.pendingYield"), v: `$${fmt(pendingYield, 2)}`, s: t("kpi.awaitingHarvest") },
              { e: "🏆", l: t("kpi.freedomPrize"), v: `$${fmt(freedomPrize, 2)}`, s: t("kpi.accumulatedJackpot") },
              { e: "🎲", l: t("kpi.epoch"), v: `#${stats.currentEpoch}`, s: formatCountdown(countdown) },
              { e: "🪙", l: t("kpi.fdmBalance"), v: fmt(fdmBalance, 1), s: t("kpi.governanceToken") },
            ].map((k, i) => (
              <div key={i} style={{ padding: "14px 20px", borderRight: i < 4 ? `1.5px solid ${T.line}` : "none" }}>
                <div style={{ fontSize: 11, color: T.ink3, marginBottom: 4 }}>{k.e} {k.l}</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: T.ink }}>{k.v}</div>
                <div style={{ fontSize: 11, color: T.ink4, marginTop: 3 }}>{k.s}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Content */}
      <main style={{ maxWidth: 960, margin: "0 auto", padding: "28px 28px 80px" }}>
        {!isConnected ? (
          <div className="card" style={{ padding: "60px 32px", textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🌊</div>
            <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 12 }}>{t("home.hero.title")}</h1>
            <p style={{ fontSize: 15, color: T.ink3, maxWidth: 480, margin: "0 auto 28px", lineHeight: 1.8 }}>
              {t("home.hero.subtitle")}
            </p>
            <ConnectButton />
          </div>
        ) : screen === "home" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Active Position */}
            {position ? (
              <div className="card" style={{ padding: "24px 28px", borderColor: T.green + "60", background: `linear-gradient(135deg,${T.green}08,${T.white})` }}>
                <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 12, color: T.ink3, marginBottom: 6 }}>
                      <span style={{ width: 7, height: 7, borderRadius: "50%", background: T.green, display: "inline-block", marginInlineEnd: 6 }} />
                      {t("home.position.active")}
                    </div>
                    <div style={{ fontSize: 32, fontWeight: 800 }}>${fmt(position.amount)} <span style={{ fontSize: 16, color: T.ink3 }}>USDC</span></div>
                    <div style={{ fontSize: 13, color: T.ink3, marginTop: 8, display: "flex", gap: 16 }}>
                      <span>{position.tierInfo.emoji} {position.tierInfo.name} · {position.tierInfo.mult}× {t("home.position.chance")}</span>
                      {position.accumulatedRewards > 0 && (
                        <span style={{ color: T.green, fontWeight: 600 }}>+${fmt(position.accumulatedRewards, 4)} {t("home.position.earned")}</span>
                      )}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    {position.accumulatedRewards > 0 && (
                      <button className="btn-green" onClick={claim} disabled={claiming}>
                        {claiming ? "..." : `${t("home.position.collect")} $${fmt(position.accumulatedRewards, 2)}`}
                      </button>
                    )}
                    <button className="btn-danger" onClick={withdraw} disabled={withdrawing}>
                      {withdrawing ? "..." : t("home.position.withdraw")}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="card" style={{ padding: "40px 32px", textAlign: "center" }}>
                <div style={{ fontSize: 40, marginBottom: 14 }}>🌊</div>
                <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 10 }}>{t("home.noPosition.title")}</h2>
                <p style={{ fontSize: 14, color: T.ink3, marginBottom: 24 }}>{t("home.noPosition.subtitle")}</p>
                <button className="btn-primary" onClick={() => setScreen("deposit")}>{t("home.hero.cta")}</button>
              </div>
            )}

            {/* Pools + Yield Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div className="card">
                <div style={{ padding: "14px 20px", borderBottom: `1.5px solid ${T.line}`, fontSize: 12, fontWeight: 600, color: T.ink2 }}>🏊 {t("home.pools.title")}</div>
                {pools.map((p, i) => (
                  <div key={i} style={{ padding: "14px 20px", borderBottom: i < 2 ? `1.5px solid ${T.line}` : "none" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <span><strong>{p.emoji} {p.name}</strong> <span style={{ fontSize: 12, color: T.ink3 }}>{p.range} USDC</span></span>
                      <span style={{ fontSize: 12, color: T.ink3 }}>{p.userCount} {t("home.pools.people")}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ flex: 1, height: 4, background: T.line, borderRadius: 99 }}>
                        <div style={{ width: `${stats ? (p.totalDeposits / stats.totalDeposits * 100) || 0 : 0}%`, height: "100%", background: T.ink, borderRadius: 99 }} />
                      </div>
                      <span style={{ fontSize: 12, color: T.ink3 }}>${fmt(p.totalDeposits)}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="card">
                <div style={{ padding: "14px 20px", borderBottom: `1.5px solid ${T.line}`, fontSize: 12, fontWeight: 600, color: T.ink2 }}>⚙️ {t("home.yield.title")}</div>
                {YIELDS.map((y, i) => (
                  <div key={i} style={{ padding: "14px 20px", borderBottom: i < 2 ? `1.5px solid ${T.line}` : "none", display: "flex", alignItems: "center", gap: 14 }}>
                    <span style={{ fontSize: 20 }}>{y.emoji}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                        <span style={{ fontSize: 13, fontWeight: 600 }}>{y.label}</span>
                        <span style={{ fontSize: 13, fontWeight: 700 }}>{y.pct}%</span>
                      </div>
                      <div style={{ height: 4, background: T.line, borderRadius: 99 }}>
                        <div style={{ width: y.pct + "%", height: "100%", background: T.green, borderRadius: 99 }} />
                      </div>
                    </div>
                    <div style={{ fontSize: 12, color: T.ink3 }}>APY {y.apy}%</div>
                  </div>
                ))}
                <div style={{ padding: "10px 20px", background: T.greenBg, fontSize: 12, color: T.ink3 }}>
                  {t("home.yield.weightedApy")} <strong style={{ color: T.greenDk }}>7.8%</strong> 🌱
                </div>
              </div>
            </div>

            {/* Transparency Footer */}
            <div style={{ padding: "14px 20px", borderRadius: 12, background: T.white, border: `1.5px solid ${T.line}`, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
              <span style={{ fontSize: 13, color: T.ink3 }}>🔐 {t("home.transparency.safe")}</span>
              <div style={{ display: "flex", gap: 20 }}>
                {[
                  { l: t("home.transparency.platform"), v: "%10" },
                  { l: t("home.transparency.earlyExit"), v: `%5 ${t("home.transparency.penalty")}` },
                  { l: t("home.transparency.freedom"), v: `%30 ${t("home.transparency.ofYield")}` },
                ].map((s, i) => (
                  <div key={i} style={{ textAlign: dir === "rtl" ? "left" : "right" }}>
                    <div style={{ fontSize: 10, color: T.ink4 }}>{s.l}</div>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{s.v}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Deposit Screen */
          <div style={{ maxWidth: 500, margin: "0 auto" }}>
            <button className="btn-outline" style={{ marginBottom: 20, padding: "7px 14px", fontSize: 12 }} onClick={() => setScreen("home")}>{t("deposit.back")}</button>
            <div className="card">
              <div style={{ padding: "22px 28px", borderBottom: `1.5px solid ${T.line}` }}>
                <div style={{ fontSize: 11, color: T.ink3, marginBottom: 6 }}>💳 {t("deposit.newDeposit")}</div>
                <h2 style={{ fontSize: 22, fontWeight: 800 }}>{t("deposit.title")}</h2>
                <p style={{ fontSize: 13, color: T.ink3, marginTop: 6 }}>{t("deposit.balance")}: <strong>${fmt(usdcBalance, 2)} USDC</strong></p>
              </div>
              <div style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: 22 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: T.ink3, marginBottom: 12 }}>{t("deposit.selectPool")}</div>
                  {Object.entries(POOL_TIER_INFO).map(([id, info]) => (
                    <div key={id} className={`pool-opt${selTier === Number(id) ? " sel" : ""}`} onClick={() => setSelTier(Number(id))} style={{ marginBottom: 8 }}>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span><strong>{info.emoji} {info.name}</strong> <span style={{ fontSize: 12, color: T.ink3 }}>{info.range} USDC</span></span>
                        <span style={{ fontSize: 13, fontWeight: 700 }}>{info.mult}× {t("deposit.chance")} ✨</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: T.ink3, marginBottom: 10 }}>{t("deposit.amount")}</div>
                  <input className="inp" type="number" placeholder={`${fmt(tierInfo.min)} – ${fmt(tierInfo.max)} USDC`} value={amount} onChange={(e) => setAmount(e.target.value)} />
                </div>
                <button className="btn-primary" style={{ width: "100%", padding: 15, fontSize: 15 }} onClick={handleDeposit} disabled={depositing || approving}>
                  {approving ? t("deposit.approving") : depositing ? t("deposit.depositing") : needsApproval ? t("deposit.approveAndDeposit") : t("deposit.depositAndJoin")}
                </button>
                <div style={{ fontSize: 11, color: T.ink4, textAlign: "center" }}>
                  {t("deposit.disclaimer")}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", zIndex: 9999, background: T.white, border: `1px solid ${toast.type === "ok" ? T.green : toast.type === "warn" ? T.amber : T.red}40`, boxShadow: "0 4px 24px #0000001A", padding: "12px 20px", borderRadius: 12, fontSize: 13, fontWeight: 500, whiteSpace: "nowrap" }}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
