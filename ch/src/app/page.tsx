


"use client";
import { useState } from "react";
import Login from "./Login";
import ChatDemo from "./ChatDemo";

export default function Home() {
  const [user, setUser] = useState<string | null>(null);
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8">
      <h1 className="text-3xl font-bold mb-6">ChitterHaven Community</h1>
      {user ? <ChatDemo username={user} /> : <Login onLogin={setUser} />}
      <footer className="mt-10 text-center text-xs text-gray-400">
        <p>ChitterSync &copy; {new Date().getFullYear()}</p>
        <p>This is a Temporary Demo Version of ChitterHaven, do not expect your messages or login information to be saved after this demo is no longer retained. we may lose access to data during this process.</p>
      </footer>
    </div>
  );
}
