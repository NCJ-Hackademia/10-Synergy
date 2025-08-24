import React, { useEffect, useRef, useState } from "react";

/**
 * ONE-FILE JSX VERSION (no TypeScript, no Tailwind).
 * - Shows MetaMask login first.
 * - After login, shows a Puter-style desktop with a left dock,
 *   draggable app windows, taskbar, and a trash icon.
 */

export default function App() {
  const [account, setAccount] = useState(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState(null);

  // windows
  const [wins, setWins] = useState([]);
  const [zCounter, setZ] = useState(10);
  const [clock, setClock] = useState("");

  useEffect(() => {
    setClock(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    const t = setInterval(() => {
      setClock(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    }, 5000);
    return () => clearInterval(t);
  }, []);

  // restore previous session if any
  useEffect(() => {
    const last = localStorage.getItem("mm_account");
    if (last) setAccount(last);
  }, []);

  async function connectWallet() {
    setError(null);
    setConnecting(true);
    try {
      const { ethereum } = window;
      if (!ethereum) throw new Error("MetaMask not found. Install the extension and refresh.");
      const accounts = await ethereum.request({ method: "eth_requestAccounts" });
      const acc = accounts && accounts[0];
      if (!acc) throw new Error("No account returned.");
      setAccount(acc);
      localStorage.setItem("mm_account", acc);

      ethereum.removeAllListeners && ethereum.removeAllListeners("accountsChanged");
      ethereum.on &&
        ethereum.on("accountsChanged", (accs) => {
          const a = accs && accs[0];
          if (a) {
            setAccount(a);
            localStorage.setItem("mm_account", a);
          } else {
            setAccount(null);
            localStorage.removeItem("mm_account");
          }
        });
    } catch (e) {
      setError(e?.message || "Connection failed");
    } finally {
      setConnecting(false);
    }
  }

  function disconnect() {
    localStorage.removeItem("mm_account");
    setAccount(null);
  }

  // Window management
  const appTitles = {
    files: "Files",
    browser: "Browser",
    code: "VS Code",
    settings: "Settings",
    notes: "Notes",
    music: "Music Player",
  };

  function openApp(app) {
    setWins((prev) => {
      const existing = [...prev].sort((a, b) => b.z - a.z).find((w) => w.app === app && !w.minimized);
      if (existing) return focusWindow(existing.id, prev);
      const id = `${app}-${Date.now()}`;
      const z = zCounter + 1;
      setZ(z);
      return [
        ...prev,
        {
          id,
          app,
          title: appTitles[app],
          x: 160 + Math.random() * 60,
          y: 120 + Math.random() * 40,
          w: 720,
          h: 460,
          z,
        },
      ];
    });
  }

  function focusWindow(id, base) {
    const list = base ? [...base] : [...wins];
    const z = zCounter + 1;
    setZ(z);
    const updated = list.map((w) => (w.id === id ? { ...w, z } : w));
    if (!base) setWins(updated);
    return updated;
  }

  function closeWindow(id) {
    setWins((prev) => prev.filter((w) => w.id !== id));
  }

  function minimizeWindow(id) {
    setWins((prev) => prev.map((w) => (w.id === id ? { ...w, minimized: true } : w)));
  }

  function restoreWindow(id) {
    setWins((prev) => prev.map((w) => (w.id === id ? { ...w, minimized: false } : w)));
  }

  // dragging
  const dragInfo = useRef(null);
  useEffect(() => {
    function onMove(e) {
      if (!dragInfo.current) return;
      e.preventDefault();
      setWins((prev) =>
        prev.map((w) =>
          w.id === dragInfo.current.id
            ? {
                ...w,
                x: Math.max(64, Math.min(window.innerWidth - 80, e.clientX - dragInfo.current.dx)),
                y: Math.max(48, Math.min(window.innerHeight - 80, e.clientY - dragInfo.current.dy)),
              }
            : w
        )
      );
    }
    function onUp() {
      dragInfo.current = null;
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  function startDrag(id, e) {
    const target = wins.find((w) => w.id === id);
    if (!target) return;
    dragInfo.current = { id, dx: e.clientX - target.x, dy: e.clientY - target.y };
    focusWindow(id);
  }

  const dockApps = [
    { key: "files", label: "Files", emoji: "📁" },
    { key: "browser", label: "Browser", emoji: "🌐" },
    { key: "code", label: "Code", emoji: "🧑‍💻" },
    { key: "settings", label: "Settings", emoji: "⚙️" },
    { key: "notes", label: "Notes", emoji: "📝" },
    { key: "music", label: "Music", emoji: "🎵" },
  ];

  // Login screen
  if (!account) {
    return (
      <div className="wallpaper">
        <div className="login-center">
          <div className="login-card">
            <div className="login-head">
              <div className="fox">🦊</div>
              <div className="title">Sign in with MetaMask</div>
            </div>
            <div className="subtitle">Connect your wallet to enter your web desktop.</div>
            {error && <div className="error">{error}</div>}
            <button className="primary" onClick={connectWallet} disabled={connecting}>
              {connecting ? "Connecting…" : "Connect MetaMask"}
            </button>
            <div className="helper">Don’t have MetaMask? Install the extension and refresh.</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="wallpaper">
      {/* left dock */}
      <aside className="dock">
        {dockApps.map((a) => (
          <button key={a.key} className="dock-btn" title={a.label} onClick={() => openApp(a.key)}>
            <span className="dock-emoji" aria-hidden>
              {a.emoji}
            </span>
          </button>
        ))}
        <div className="dock-account">{account.slice(0, 6)}…{account.slice(-4)}</div>
      </aside>

      {/* desktop icon (trash) */}
      <div className="desktop-area">
        <div className="desktop-icon">
          <div className="icon-square">🗑️</div>
          <div className="icon-label">Trash</div>
        </div>
      </div>

      {/* windows */}
      {wins.filter((w) => !w.minimized).map((w) => (
        <div
          key={w.id}
          className="window"
          style={{ left: w.x, top: w.y, width: w.w, height: w.h, zIndex: w.z }}
          onMouseDown={() => focusWindow(w.id)}
        >
          <div className="titlebar" onMouseDown={(e) => startDrag(w.id, e)}>
            <div className="title-left">
              <span className="dot red" onClick={() => closeWindow(w.id)} />
              <span className="dot yellow" onClick={() => minimizeWindow(w.id)} />
              <span className="dot green" />
              <span className="title">{w.title}</span>
            </div>
            <div className="title-right">{account.slice(0, 6)}…{account.slice(-4)}</div>
          </div>
          <div className="content">
            <AppSurface app={w.app} />
          </div>
        </div>
      ))}

      {/* taskbar */}
      <div className="taskbar">
        <button className="task-start" onClick={() => openApp("files")}>🪟</button>
        <div className="search">
          <span className="magnify">🔎</span>
          <input className="search-input" placeholder="Search" />
        </div>
        <div className="task-pins">
          {dockApps.slice(0, 4).map((a) => (
            <button key={a.key} className="pin" onClick={() => openApp(a.key)}>{a.emoji}</button>
          ))}
        </div>
        <div className="task-minimized">
          {wins.filter((w) => w.minimized).map((w) => (
            <button key={w.id} className="mini" onClick={() => restoreWindow(w.id)}>{w.title}</button>
          ))}
        </div>
        <div className="spacer" />
        <div className="clock">{clock}</div>
        <button className="disconnect" onClick={disconnect}>Disconnect</button>
      </div>
    </div>
  );
}

/* ---------- App Surfaces (simple demo contents) ---------- */

function AppSurface({ app }) {
  if (app === "files") return <FilesApp />;
  if (app === "browser") return <BrowserApp />;
  if (app === "code") return <CodeApp />;
  if (app === "settings") return <SettingsApp />;
  if (app === "notes") return <NotesApp />;
  if (app === "music") return <MusicApp />;
  return null;
}

function Wrap({ children }) {
  return <div className="wrap">{children}</div>;
}

function FilesApp() {
  const items = Array.from({ length: 12 }).map((_, i) => ({
    name: i % 3 === 0 ? `Screenshot ${i + 1}.png` : i % 3 === 1 ? `Document ${i + 1}.pdf` : `Music ${i + 1}.mp3`,
    icon: i % 3 === 0 ? "🖼️" : i % 3 === 1 ? "📄" : "🎵",
  }));
  return (
    <Wrap>
      <div className="flex-between">
        <div className="muted">Quick access</div>
        <div className="muted">{items.length} items</div>
      </div>
      <div className="grid">
        {items.map((f, idx) => (
          <div key={idx} className="file-card">
            <div className="file-ico">{f.icon}</div>
            <div className="file-name">{f.name}</div>
          </div>
        ))}
      </div>
    </Wrap>
  );
}

function BrowserApp() {
  return (
    <Wrap>
      <div className="browser">
        <div className="bar"><span>🌐</span><input className="url" defaultValue="https://puter.com" /><button className="go">Go</button></div>
        <div className="page">(Demo) Imagine the Puter homepage here ✨</div>
      </div>
    </Wrap>
  );
}

function CodeApp() {
  const sample = `function hello(){
  console.log('Hello, world!');
}`;
  return (
    <Wrap>
      <div className="code">
        <div className="filetab">App.js</div>
        <pre className="editor"><code>{sample}</code></pre>
      </div>
    </Wrap>
  );
}

function SettingsApp() {
  const who = (typeof window !== "undefined" && localStorage.getItem("mm_account")) || "unknown";
  return (
    <Wrap>
      <div className="settings">
        <div className="side">
          <div className="head">System</div>
          <ul>
            <li>Appearance</li>
            <li>Network</li>
            <li>Accounts</li>
            <li>About</li>
          </ul>
        </div>
        <div className="main">
          <div className="head">Wallet</div>
          <div>Connected as <span className="mono">{who}</span></div>
          <div className="muted small">You can disconnect from the taskbar.</div>
        </div>
      </div>
    </Wrap>
  );
}

function NotesApp() {
  return (
    <Wrap>
      <textarea className="notes" placeholder="Write your notes here…" />
    </Wrap>
  );
}

function MusicApp() {
  return (
    <Wrap>
      <div className="player">
        <div className="big">🎧</div>
        <div>
          <div className="bold">Lo-fi Beats</div>
          <div className="muted small">(Demo) Music player UI</div>
        </div>
        <div className="controls">
          <button>⏮️</button>
          <button>▶️</button>
          <button>⏭️</button>
        </div>
      </div>
    </Wrap>
  );
}
