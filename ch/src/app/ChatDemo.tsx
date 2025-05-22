"use client";

import { useEffect, useRef, useState } from "react";
import io, { Socket } from "socket.io-client";
import ReactMarkdown from "react-markdown";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faReply, faEdit, faTrash, faGear } from "@fortawesome/free-solid-svg-icons";
import ServerSettingsModal from "./ServerSettingsModal";

type Message = {
  id: string;
  user: string;
  text: string;
  timestamp: number;
  edited?: boolean;
};

export default function ChatDemo({ username }: { username: string }) {
  const [showServerSettings, setShowServerSettings] = useState(false);
  // Havens: { [havenName]: string[] (channels) }
  const [havens, setHavens] = useState<{ [key: string]: string[] }>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("havens");
      if (saved) return JSON.parse(saved);
    }
    return { "ChitterHaven": ["general", "random"] };
  });
  const [selectedHaven, setSelectedHaven] = useState<string>("ChitterHaven");
  const [selectedChannel, setSelectedChannel] = useState<string>("general");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [newChannel, setNewChannel] = useState("");
  const [newHaven, setNewHaven] = useState("");
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);

  // Persist havens to localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("havens", JSON.stringify(havens));
    }
  }, [havens]);

  // Load messages for selected channel
  useEffect(() => {
    let ignore = false;
    if (!socketRef.current) {
      socketRef.current = io({ path: "/api/socketio" });
    }
    const room = `${selectedHaven}__${selectedChannel}`;
    socketRef.current.emit("join-room", room);
    // Fetch all messages for the room
    fetch(`/api/history?room=${encodeURIComponent(room)}`)
      .then(res => res.json())
      .then(data => {
        if (!ignore) setMessages(data.messages || []);
      });

    // Handler to add new messages only if they are not already present
    const handleSocketMessage = (msg: Message) => {
      setMessages((prev) => {
        // Prevent duplicates (by id)
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    };
    socketRef.current.on("message", handleSocketMessage);
    return () => {
      ignore = true;
      socketRef.current?.off("message", handleSocketMessage);
    };
  }, [selectedHaven, selectedChannel]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const room = `${selectedHaven}__${selectedChannel}`;
    const handleTyping = (data: { user: string; room: string }) => {
      if (data.room !== room || data.user === username) return;
      setTypingUsers((prev) => {
        if (!prev.includes(data.user)) return [...prev, data.user];
        return prev;
      });
      setTimeout(() => {
        setTypingUsers((prev) => prev.filter((u) => u !== data.user));
      }, 2500);
    };
    socketRef.current?.on("typing", handleTyping);
    return () => {
      socketRef.current?.off("typing", handleTyping);
    };
  }, [selectedHaven, selectedChannel, username]);

  const sendMessage = () => {
    if (input.trim()) {
      const room = `${selectedHaven}__${selectedChannel}`;
      const msg = { user: username, text: input };
      fetch("/api/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ room, msg })
      })
        .then(res => res.json())
        .then(data => {
          if (data.message) {
            socketRef.current?.emit("message", data.message);
            setMessages((prev) => [...prev, data.message]);
          }
        });
      setInput("");
    }
  };

  const handleDelete = (id: string) => {
    const room = `${selectedHaven}__${selectedChannel}`;
    fetch("/api/history", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ room, action: "delete", messageId: id })
    }).then(res => {
      if (res.ok) setMessages((prev) => prev.filter((m) => m.id !== id));
    });
  };

  const [editId, setEditId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const handleEdit = (id: string, text: string) => {
    setEditId(id);
    setEditText(text);
  };
  const handleEditSubmit = (id: string) => {
    const room = `${selectedHaven}__${selectedChannel}`;
    fetch("/api/history", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ room, action: "edit", messageId: id, newText: editText })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success && data.message) {
          setMessages((prev) => prev.map((m) => m.id === id ? data.message : m));
          setEditId(null);
          setEditText("");
        }
      });
  };

  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const handleReply = (msg: Message) => {
    setReplyTo(msg);
    setInput(`@${msg.user} `);
  };

  const handleHavenChange = (haven: string) => {
    setSelectedHaven(haven);
    // Default to first channel in haven
    setSelectedChannel(havens[haven][0] || "");
  };

  const handleChannelChange = (channel: string) => {
    setSelectedChannel(channel);
  };

  const handleCreateChannel = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newChannel.trim().replace(/\s+/g, "-").toLowerCase();
    if (name && !havens[selectedHaven].includes(name)) {
      setHavens(prev => ({
        ...prev,
        [selectedHaven]: [...prev[selectedHaven], name]
      }));
      setNewChannel("");
      setSelectedChannel(name);
    }
  };

  const handleCreateHaven = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newHaven.trim().replace(/\s+/g, "-").replace(/[^a-zA-Z0-9-_]/g, "").slice(0, 24);
    if (name && !havens[name]) {
      setHavens(prev => ({ ...prev, [name]: ["general"] }));
      setSelectedHaven(name);
      setSelectedChannel("general");
      setNewHaven("");
    }
  };

  // Typing event handler
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
    const room = `${selectedHaven}__${selectedChannel}`;
    socketRef.current?.emit("typing", { user: username, room });
  };

  return (
    <div
      style={{
        display: "flex",
        height: "70vh",
        width: "100%",
        maxWidth: 1100,
        minWidth: 320,
        margin: "2rem auto",
        border: "1px solid #333",
        borderRadius: 8,
        background: "#23232a",
        boxShadow: "0 2px 16px #0004"
      }}
    >
      {/* Havens sidebar */}
      <aside style={{
        width: 120,
        background: "#15151a",
        borderRight: "1px solid #333",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: 0
      }}>
        <div style={{ padding: 12, borderBottom: "1px solid #333", color: "#fff", fontWeight: 600, fontSize: 16, display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
          <span>Havens</span>
          <button
            title="Server Settings"
            style={{ background: "none", border: "none", color: "#60a5fa", cursor: "pointer", padding: 0, marginLeft: 8, fontSize: 18, display: "flex", alignItems: "center" }}
            onClick={() => setShowServerSettings(true)}
          >
            <FontAwesomeIcon icon={faGear} />
          </button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", width: "100%" }}>
          {Object.keys(havens).map(haven => (
            <div
              key={haven}
              onClick={() => handleHavenChange(haven)}
              style={{
                padding: "12px 0",
                textAlign: "center",
                cursor: "pointer",
                background: selectedHaven === haven ? "#333" : "#15151a",
                color: selectedHaven === haven ? "#60a5fa" : "#fff",
                fontWeight: selectedHaven === haven ? 700 : 400,
                borderLeft: selectedHaven === haven ? "4px solid #60a5fa" : "4px solid transparent"
              }}
            >
              {haven}
            </div>
          ))}
        </div>
        <form onSubmit={handleCreateHaven} style={{ padding: 10, borderTop: "1px solid #333", background: "#15151a", width: "100%" }}>
          <input
            value={newHaven}
            onChange={e => setNewHaven(e.target.value)}
            placeholder="New haven..."
            style={{
              width: "100%",
              background: "#23232a",
              color: "#fff",
              border: "1px solid #333",
              borderRadius: 4,
              padding: 6,
              fontSize: 13
            }}
          />
        </form>
      </aside>
      {/* Channels sidebar */}
      <aside style={{
        width: 180,
        background: "#18181b",
        borderRight: "1px solid #333",
        display: "flex",
        flexDirection: "column",
        padding: 0
      }}>
        <div style={{ padding: 16, borderBottom: "1px solid #333", color: "#fff", fontWeight: 600, fontSize: 16 }}>
          Channels
        </div>
        <div style={{ flex: 1, overflowY: "auto" }}>
          {havens[selectedHaven]?.map((ch) => (
            <div
              key={ch}
              onClick={() => handleChannelChange(ch)}
              style={{
                padding: "10px 16px",
                cursor: "pointer",
                background: selectedChannel === ch ? "#333" : "#18181b",
                color: selectedChannel === ch ? "#60a5fa" : "#fff",
                fontWeight: selectedChannel === ch ? 700 : 400
              }}
            >
              #{ch}
            </div>
          ))}
        </div>
        <form onSubmit={handleCreateChannel} style={{ padding: 12, borderTop: "1px solid #333", background: "#18181b" }}>
          <input
            value={newChannel}
            onChange={e => setNewChannel(e.target.value)}
            placeholder="New channel..."
            style={{
              width: "100%",
              background: "#23232a",
              color: "#fff",
              border: "1px solid #333",
              borderRadius: 4,
              padding: 6,
              fontSize: 14
            }}
          />
        </form>
      </aside>
      {/* Main chat area */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <div style={{ padding: 16, borderBottom: "1px solid #333", color: "#fff", fontWeight: 600, fontSize: 18 }}>
          {selectedHaven} <span style={{ color: "#60a5fa" }}>/ #{selectedChannel}</span>
        </div>
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            background: "#18181b",
            padding: 16,
            color: "#fff",
            borderRadius: 0,
            minHeight: 0,
          }}
        >
          {messages.map((msg, idx) => (
            <div key={msg.id || `${msg.user}-${msg.timestamp}-${idx}`} style={{ marginBottom: 16, position: "relative", padding: 8, borderRadius: 6, background: "#23232a", transition: "background 0.2s" }}>
              {/* Action buttons, only show on hover or focus */}
              <div style={{
                position: "absolute", top: -32, right: 0, display: "flex", gap: 8, opacity: 0.7,
                zIndex: 2
              }} className="msg-actions">
                <button onClick={() => handleReply(msg)} style={{ background: "#23232a", color: "#60a5fa", border: "none", borderRadius: 4, padding: "2px 8px", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }} title="Reply">
                  <FontAwesomeIcon icon={faReply} />
                </button>
                {msg.user === username && (
                  <>
                    <button onClick={() => handleEdit(msg.id, msg.text)} style={{ background: "#23232a", color: "#facc15", border: "none", borderRadius: 4, padding: "2px 8px", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }} title="Edit">
                      <FontAwesomeIcon icon={faEdit} />
                    </button>
                    <button onClick={() => handleDelete(msg.id)} style={{ background: "#23232a", color: "#f472b6", border: "none", borderRadius: 4, padding: "2px 8px", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }} title="Delete">
                      <FontAwesomeIcon icon={faTrash} />
                    </button>
                  </>
                )}
              </div>
              <div style={{ fontSize: 13, color: "#a1a1aa", marginBottom: 2, wordBreak: "break-word", whiteSpace: "pre-line" }}>
                <span style={{ color: "#60a5fa", fontWeight: 600 }}>{msg.user}</span>
                <span style={{ marginLeft: 8, fontSize: 11, color: "#666" }}>{new Date(msg.timestamp).toLocaleTimeString()}</span>
                {msg.edited && <span style={{ marginLeft: 6, fontSize: 10, color: "#facc15" }}>(edited)</span>}
              </div>
              {editId === msg.id ? (
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    value={editText}
                    onChange={e => setEditText(e.target.value)}
                    style={{ flex: 1, background: "#18181b", color: "#fff", border: "1px solid #333", borderRadius: 4, padding: 4, fontSize: 14 }}
                  />
                  <button onClick={() => handleEditSubmit(msg.id)} style={{ background: "#60a5fa", color: "#fff", border: "none", borderRadius: 4, padding: "2px 8px", cursor: "pointer" }}>Save</button>
                  <button onClick={() => setEditId(null)} style={{ background: "#23232a", color: "#fff", border: "none", borderRadius: 4, padding: "2px 8px", cursor: "pointer" }}>Cancel</button>
                </div>
              ) : (
                <div style={{ wordBreak: "break-word", whiteSpace: "pre-line" }}>
                  <ReactMarkdown
                  components={{
                    a: (props) => <a {...props} style={{ color: "#60a5fa" }} />,
                    code: (props) => <code {...props} style={{ background: "#23232a", color: "#facc15", padding: "2px 4px", borderRadius: 4 }} />,
                    strong: (props) => <strong {...props} style={{ color: "#f472b6" }} />,
                    em: (props) => <em {...props} style={{ color: "#a3e635" }} />,
                    blockquote: (props) => <blockquote {...props} style={{ borderLeft: "3px solid #60a5fa", margin: 0, paddingLeft: 12, color: "#a1a1aa" }} />,
                    li: (props) => <li {...props} style={{ marginLeft: 16 }} />,
                  }}
                >
                  {msg.text}
                </ReactMarkdown>
                </div>
              )}
            </div>
          ))}
          {typingUsers.length > 0 && (
            <div style={{ color: "#60a5fa", fontSize: 13, margin: "8px 0 0 16px" }}>
              {typingUsers.join(", ")} {typingUsers.length === 1 ? "is" : "are"} typing...
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        <form
          onSubmit={e => { e.preventDefault(); sendMessage(); }}
          style={{
            display: "flex",
            alignItems: "center",
            borderTop: "1px solid #333",
            padding: 12,
            background: "#23232a"
          }}
        >
          <input
            value={input}
            onChange={handleInputChange}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder={`Message #${selectedChannel}`}
            style={{
              flex: 1,
              marginRight: 8,
              background: "#18181b",
              color: "#fff",
              border: "1px solid #333",
              borderRadius: 4,
              padding: 8,
              fontSize: 16
            }}
          />
          <button
            type="submit"
            style={{
              width: 80,
              background: "#333",
              color: "#fff",
              border: "none",
              borderRadius: 4,
              padding: "8px 0",
              fontSize: 16
            }}
          >
            Send
          </button>
        </form>
      </div>
      {showServerSettings && (
        <ServerSettingsModal
          isOpen={showServerSettings}
          onClose={() => setShowServerSettings(false)}
          havenName={selectedHaven}
        />
      )}
    </div>
  );
}
