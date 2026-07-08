"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import styles from "./page.module.css";

type Role = "assistant" | "user";
type Density = "compact" | "balanced" | "relaxed";
type Theme = "obsidian" | "midnight" | "neon" | "aurora";
type Background = "grid" | "nebula" | "matrix" | "sunset";
type Accessory = "minimap" | "status" | "navigator" | "inspector";

type Message = {
  id: string;
  role: Role;
  content: string;
};

const TERMINAL_TOOLS = [
  { name: "Workspace", detail: "Project root + command graph" },
  { name: "Sessions", detail: "Command history + snapshots" },
  { name: "Agent Router", detail: "Task routing and model lane" },
  { name: "Diff Lens", detail: "Change impact and rollback view" },
  { name: "Vault", detail: "Knowledge and memory pods" },
  { name: "Deploy", detail: "Release checks and guards" },
] as const;

const QUICK_COMMANDS = [
  "status --full",
  "scan security --strict",
  "optimize context --compression auto",
  "route grok --mode research",
  "session snapshot create",
] as const;

const ACCESSORY_LABELS: Record<Accessory, string> = {
  minimap: "Layout Minimap",
  status: "Live Status HUD",
  navigator: "Tab Navigator",
  inspector: "Context Inspector",
};

function makeId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [theme, setTheme] = useState<Theme>("obsidian");
  const [background, setBackground] = useState<Background>("grid");
  const [density, setDensity] = useState<Density>("balanced");
  const [fontScale, setFontScale] = useState(15);
  const [transparency, setTransparency] = useState(64);
  const [accessories, setAccessories] = useState<Record<Accessory, boolean>>({
    minimap: true,
    status: true,
    navigator: true,
    inspector: false,
  });

  useEffect(() => {
    const run = async () => {
      const res = await fetch("/api/bootstrap");
      const data = await res.json();
      setMessages([
        {
          id: makeId(),
          role: "assistant",
          content: data.message,
        },
      ]);
    };
    run();
  }, []);

  const canSend = useMemo(() => input.trim().length > 0 && !isSending, [input, isSending]);

  const wrapperStyle = useMemo(
    () => ({
      "--terminal-font-size": `${fontScale}px`,
      "--terminal-alpha": `${transparency / 100}`,
    }) as React.CSSProperties,
    [fontScale, transparency],
  );

  const commandTrail = useMemo(() => {
    return messages
      .filter((m) => m.role === "user")
      .slice(-5)
      .map((m) => m.content);
  }, [messages]);

  function toggleAccessory(accessory: Accessory) {
    setAccessories((prev) => ({ ...prev, [accessory]: !prev[accessory] }));
  }

  function applyQuickCommand(command: string) {
    setInput(command);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isSending) return;

    const nextUser: Message = { id: makeId(), role: "user", content: trimmed };
    const history = [...messages, nextUser];
    setMessages(history);
    setInput("");
    setIsSending(true);

    const assistantId = makeId();
    setMessages((prev) => [...prev, { id: assistantId, role: "assistant", content: "" }]);

    try {
      const resp = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: history.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (!resp.body) {
        const text = await resp.text();
        setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, content: text } : m)));
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let finalText = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        finalText += chunk;
        setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, content: finalText } : m)));
      }
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId ? { ...m, content: "Jackie here— Request failed. Try again." } : m,
        ),
      );
    } finally {
      setIsSending(false);
    }
  }

  return (
    <main
      className={`${styles.main} ${styles[`theme_${theme}`]} ${styles[`bg_${background}`]} ${styles[`density_${density}`]}`}
      style={wrapperStyle}
    >
      <section className={styles.hero}>
        <div>
          <h1>Jackie Global Terminal</h1>
          <p>High-detail workstation shell with adaptive control surface, tool deck, and live orchestration flow.</p>
        </div>
        <div className={styles.heroMeta}>
          <span>Mode: Ultra</span>
          <span>Session: Active</span>
          <span>iPhone-ready</span>
        </div>
      </section>

      <section className={styles.controls}>
        <article className={styles.controlCard}>
          <h2>Visual Stack</h2>
          <label>
            Theme
            <select value={theme} onChange={(e) => setTheme(e.target.value as Theme)}>
              <option value="obsidian">Obsidian</option>
              <option value="midnight">Midnight Glass</option>
              <option value="neon">Neon Forge</option>
              <option value="aurora">Aurora Prism</option>
            </select>
          </label>
          <label>
            Background
            <select value={background} onChange={(e) => setBackground(e.target.value as Background)}>
              <option value="grid">Quantum Grid</option>
              <option value="nebula">Nebula Drift</option>
              <option value="matrix">Matrix Rain</option>
              <option value="sunset">Prism Sunset</option>
            </select>
          </label>
          <label>
            Density
            <select value={density} onChange={(e) => setDensity(e.target.value as Density)}>
              <option value="compact">Compact</option>
              <option value="balanced">Balanced</option>
              <option value="relaxed">Relaxed</option>
            </select>
          </label>
        </article>

        <article className={styles.controlCard}>
          <h2>Pro Tuning</h2>
          <label>
            Font scale ({fontScale}px)
            <input
              type="range"
              min={13}
              max={19}
              step={1}
              value={fontScale}
              onChange={(e) => setFontScale(Number(e.target.value))}
            />
          </label>
          <label>
            Glass transparency ({transparency}%)
            <input
              type="range"
              min={35}
              max={90}
              step={1}
              value={transparency}
              onChange={(e) => setTransparency(Number(e.target.value))}
            />
          </label>
          <div className={styles.pills}>
            {QUICK_COMMANDS.map((command) => (
              <button key={command} type="button" onClick={() => applyQuickCommand(command)}>
                {command}
              </button>
            ))}
          </div>
        </article>

        <article className={styles.controlCard}>
          <h2>Accessories</h2>
          <div className={styles.toggleGrid}>
            {(Object.keys(ACCESSORY_LABELS) as Accessory[]).map((accessory) => (
              <label key={accessory} className={styles.toggleItem}>
                <input
                  type="checkbox"
                  checked={accessories[accessory]}
                  onChange={() => toggleAccessory(accessory)}
                />
                {ACCESSORY_LABELS[accessory]}
              </label>
            ))}
          </div>
        </article>
      </section>

      <section className={styles.workspace}>
        <article className={styles.terminalShell}>
          <header className={styles.shellHeader}>
            <span className={styles.dotRed} />
            <span className={styles.dotAmber} />
            <span className={styles.dotGreen} />
            <p>jackie@global:~/workspace</p>
          </header>

          <div className={styles.messages}>
            {messages.map((m) => (
              <article key={m.id} className={`${styles.message} ${m.role === "user" ? styles.user : styles.assistant}`}>
                <p>{m.role === "user" ? `$ ${m.content}` : m.content}</p>
              </article>
            ))}
          </div>

          <form className={styles.form} onSubmit={onSubmit}>
            <span className={styles.prompt}>jackie@global %</span>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Run command or message Jackie... (/pod, /raw, /confirm)"
              rows={2}
            />
            <button type="submit" disabled={!canSend}>
              {isSending ? "Streaming..." : "Execute"}
            </button>
          </form>
        </article>

        <aside className={styles.sideDeck}>
          <article className={styles.panel}>
            <h3>Tool Deck</h3>
            <ul>
              {TERMINAL_TOOLS.map((tool) => (
                <li key={tool.name}>
                  <strong>{tool.name}</strong>
                  <span>{tool.detail}</span>
                </li>
              ))}
            </ul>
          </article>

          {accessories.status && (
            <article className={styles.panel}>
              <h3>Live Status HUD</h3>
              <div className={styles.metricRow}><span>Latency</span><b>42ms</b></div>
              <div className={styles.metricRow}><span>Context</span><b>94%</b></div>
              <div className={styles.metricRow}><span>Memory Pods</span><b>Online</b></div>
              <div className={styles.metricRow}><span>Compression</span><b>Adaptive</b></div>
            </article>
          )}

          {accessories.navigator && (
            <article className={styles.panel}>
              <h3>Command Trail</h3>
              <ol>
                {commandTrail.length === 0 ? (
                  <li>No commands yet.</li>
                ) : (
                  commandTrail.map((entry, index) => <li key={`${entry}-${index}`}>{entry}</li>)
                )}
              </ol>
            </article>
          )}

          {accessories.minimap && (
            <article className={styles.panel}>
              <h3>Layout Minimap</h3>
              <div className={styles.minimap}>
                <span className={styles.mapHero}>hero</span>
                <span className={styles.mapControls}>controls</span>
                <span className={styles.mapShell}>shell</span>
                <span className={styles.mapDeck}>deck</span>
              </div>
            </article>
          )}

          {accessories.inspector && (
            <article className={styles.panel}>
              <h3>Context Inspector</h3>
              <p>Theme: {theme}</p>
              <p>Background: {background}</p>
              <p>Density: {density}</p>
              <p>Shell font: {fontScale}px</p>
            </article>
          )}
        </aside>
      </section>
    </main>
  );
}
