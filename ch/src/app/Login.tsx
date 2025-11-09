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
    <form
      onSubmit={handleSubmit}
      className="glass w-full max-w-[360px] mx-auto mt-6 p-6 rounded-2xl"
    >
      <h2 className="text-xl font-semibold mb-4">
        {mode === "login" ? "Welcome back" : "Create your account"}
      </h2>
      <div className="space-y-3">
        <input
          value={username}
          onChange={e => setUsername(e.target.value)}
          placeholder="Username"
          className="input-dark w-full px-3 py-2"
        />
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="Password"
          className="input-dark w-full px-3 py-2"
        />
      </div>
      {error && <div className="text-red-400 text-sm mt-3">{error}</div>}
      <button type="submit" className="btn-primary w-full mt-4 py-2 text-sm font-medium">
        {mode === "login" ? "Sign in" : "Create account"}
      </button>
      <div className="text-center mt-4 text-sm">
        {mode === "login" ? (
          <button
            type="button"
            className="text-indigo-400 hover:text-indigo-300"
            onClick={() => { setMode("register"); setError(""); }}
          >
            Create an account
          </button>
        ) : (
          <button
            type="button"
            className="text-indigo-400 hover:text-indigo-300"
            onClick={() => { setMode("login"); setError(""); }}
          >
            Back to login
          </button>
        )}
      </div>
    </form>
  );
}
