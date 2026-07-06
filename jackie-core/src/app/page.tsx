"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import styles from "./page.module.css";

type Role = "assistant" | "user";

type Message = {
  id: string;
  role: Role;
  content: string;
};

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    const run = async () => {
      const res = await fetch("/api/bootstrap");
      const data = await res.json();
      setMessages([
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: data.message,
        },
      ]);
    };
    run();
  }, []);

  const canSend = useMemo(() => input.trim().length > 0 && !isSending, [input, isSending]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isSending) return;

    const nextUser: Message = { id: crypto.randomUUID(), role: "user", content: trimmed };
    const history = [...messages, nextUser];
    setMessages(history);
    setInput("");
    setIsSending(true);

    const assistantId = crypto.randomUUID();
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
    <main className={styles.main}>
      <header className={styles.header}>
        <h1>jackie-core</h1>
        <p>Persistent orchestrator • iPhone Safari ready</p>
      </header>

      <section className={styles.messages}>
        {messages.map((m) => (
          <article key={m.id} className={`${styles.message} ${m.role === "user" ? styles.user : styles.assistant}`}>
            <p>{m.content}</p>
          </article>
        ))}
      </section>

      <form className={styles.form} onSubmit={onSubmit}>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Message Jackie... (/pod, /raw, /confirm)"
          rows={2}
        />
        <button type="submit" disabled={!canSend}>
          {isSending ? "Sending..." : "Send"}
        </button>
      </form>
    </main>
  );
}
