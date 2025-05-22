"use client";
import { useState } from "react";

export default function Login({ onLogin }: { onLogin: (username: string) => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [mode, setMode] = useState<"login" | "register">("login");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const endpoint = mode === "login" ? "/api/login" : "/api/register";
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (data.success) {
      onLogin(username);
    } else {
      setError(data.error || (mode === "login" ? "Login failed" : "Registration failed"));
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: 320, margin: "2rem auto", background: "#23232a", padding: 24, borderRadius: 8, color: "#fff", border: "1px solid #333" }}>
      <h2 style={{ marginBottom: 16 }}>{mode === "login" ? "Login" : "Create Account"}</h2>
      <input
        value={username}
        onChange={e => setUsername(e.target.value)}
        placeholder="Username"
        style={{ width: "100%", marginBottom: 12, padding: 8, background: "#18181b", color: "#fff", border: "1px solid #333", borderRadius: 4 }}
      />
      <input
        type="password"
        value={password}
        onChange={e => setPassword(e.target.value)}
        placeholder="Password"
        style={{ width: "100%", marginBottom: 12, padding: 8, background: "#18181b", color: "#fff", border: "1px solid #333", borderRadius: 4 }}
      />
      {error && <div style={{ color: "#f87171", marginBottom: 8 }}>{error}</div>}
      <button type="submit" style={{ width: "100%", background: "#333", color: "#fff", border: "none", borderRadius: 4, padding: 8, marginBottom: 8 }}>
        {mode === "login" ? "Login" : "Create Account"}
      </button>
      <div style={{ textAlign: "center" }}>
        {mode === "login" ? (
          <span style={{ cursor: "pointer", color: "#60a5fa" }} onClick={() => { setMode("register"); setError(""); }}>Create an account</span>
        ) : (
          <span style={{ cursor: "pointer", color: "#60a5fa" }} onClick={() => { setMode("login"); setError(""); }}>Back to login</span>
        )}
      </div>
    </form>
  );
}
