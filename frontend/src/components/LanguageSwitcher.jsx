import { useState, useRef, useEffect } from "react";
import { useLanguage } from "../hooks/useLanguage";

/**
 * Language switcher dropdown component.
 * Shows current language flag + name, opens a dropdown to select others.
 */
export default function LanguageSwitcher() {
  const { lang, setLang, languages } = useLanguage();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Close on outside click
  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const current = languages[lang];

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-block" }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "6px 12px",
          borderRadius: 8,
          border: "1.5px solid #E8E8E8",
          background: "#FFFFFF",
          cursor: "pointer",
          fontSize: 12,
          fontWeight: 500,
          color: "#3D3D3D",
          transition: "border-color .15s",
        }}
        aria-label="Change language"
        aria-expanded={open}
      >
        <span style={{ fontSize: 16 }}>{current.flag}</span>
        <span>{current.name}</span>
        <span style={{ fontSize: 10, opacity: 0.5 }}>▼</span>
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            right: 0,
            background: "#FFFFFF",
            border: "1.5px solid #E8E8E8",
            borderRadius: 12,
            boxShadow: "0 8px 32px #00000012",
            zIndex: 9000,
            minWidth: 160,
            overflow: "hidden",
            animation: "fadeIn .12s ease",
          }}
          role="listbox"
          aria-label="Language options"
        >
          {Object.entries(languages).map(([code, info]) => (
            <button
              key={code}
              role="option"
              aria-selected={code === lang}
              onClick={() => { setLang(code); setOpen(false); }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                width: "100%",
                padding: "10px 16px",
                border: "none",
                background: code === lang ? "#00E57A12" : "transparent",
                cursor: "pointer",
                fontSize: 13,
                fontWeight: code === lang ? 600 : 400,
                color: code === lang ? "#0A0A0A" : "#3D3D3D",
                textAlign: "left",
                transition: "background .1s",
              }}
              onMouseEnter={(e) => { if (code !== lang) e.currentTarget.style.background = "#FAFAFA"; }}
              onMouseLeave={(e) => { if (code !== lang) e.currentTarget.style.background = "transparent"; }}
            >
              <span style={{ fontSize: 18 }}>{info.flag}</span>
              <span>{info.name}</span>
              {code === lang && <span style={{ marginLeft: "auto", color: "#00E57A" }}>✓</span>}
            </button>
          ))}
        </div>
      )}

      <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </div>
  );
}
