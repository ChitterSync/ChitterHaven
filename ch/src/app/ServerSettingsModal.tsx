import React, { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faServer,
  faUserShield,
  faUsers,
  faHashtag,
  faScroll,
  faPlug,
  faExclamationTriangle,
} from "@fortawesome/free-solid-svg-icons";

const TABS = [
  { key: "overview", label: "Overview", icon: faServer },
  { key: "roles", label: "Roles & Permissions", icon: faUserShield },
  { key: "members", label: "Members", icon: faUsers },
  { key: "channels", label: "Channels", icon: faHashtag },
  { key: "audit", label: "Audit Log", icon: faScroll },
  { key: "integrations", label: "Integrations", icon: faPlug },
  { key: "danger", label: "Danger Zone", icon: faExclamationTriangle },
];

export default function ServerSettingsModal({
  isOpen,
  onClose,
  havenName,
}: {
  isOpen: boolean;
  onClose: () => void;
  havenName: string;
}) {
  const [tab, setTab] = useState("overview");
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
      <div className="bg-[#18181b] rounded-lg shadow-lg w-full max-w-3xl flex min-h-[520px] relative">
        {/* Sidebar */}
        <nav className="w-56 border-r border-gray-800 flex flex-col py-6 px-2 gap-2 bg-[#23232a]">
          {TABS.map((t) => (
            <button
              key={t.key}
              className={`flex items-center gap-3 px-4 py-2 rounded text-left text-gray-200 hover:bg-[#28283a] transition-colors ${
                tab === t.key ? "bg-[#28283a] text-blue-400" : ""
              }`}
              onClick={() => setTab(t.key)}
            >
              <FontAwesomeIcon icon={t.icon} />
              <span>{t.label}</span>
            </button>
          ))}
        </nav>

        {/* Main Content */}
        <div className="flex-1 p-8 overflow-y-auto">
          <button
            className="absolute top-4 right-4 text-gray-400 hover:text-red-400 text-2xl"
            onClick={onClose}
            title="Close"
          >
            ×
          </button>
          {tab === "overview" && <OverviewTab havenName={havenName} />}
          {tab === "roles" && <RolesTab havenName={havenName} />}
          {tab === "members" && <MembersTab havenName={havenName} />}
          {tab === "channels" && <ChannelsTab havenName={havenName} />}
          {tab === "audit" && <AuditTab havenName={havenName} />}
          {tab === "integrations" && <IntegrationsTab havenName={havenName} />}
          {tab === "danger" && <DangerZoneTab havenName={havenName} />}
        </div>
      </div>
    </div>
  );
}

// --- Overview ---
function OverviewTab({ havenName }: { havenName: string }) {
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState(havenName);
  const [icon, setIcon] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/server-settings?haven=${encodeURIComponent(havenName)}`)
      .then((res) => res.json())
      .then((data) => {
        setName(data.name || havenName);
        setIcon(data.icon || "");
        setDescription(data.description || "");
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [havenName]);

  const handleSave = async () => {
    setStatus(null);
    setLoading(true);
    const res = await fetch("/api/server-settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ haven: havenName, name, icon, description }),
    });
    setLoading(false);
    setStatus(res.ok ? "Saved!" : "Error saving settings");
  };

  return (
    <div className="text-gray-200 max-w-lg mx-auto">
      <h2 className="text-2xl font-bold mb-4">Server Overview</h2>
      {loading ? (
        <div>Loading...</div>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSave();
          }}
          className="flex flex-col gap-4"
        >
          <label className="flex flex-col gap-1">
            <span className="text-sm text-gray-400">Server Name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-[#23232a] border border-gray-700 rounded px-3 py-2 text-white"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm text-gray-400">Icon URL</span>
            <input
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              className="bg-[#23232a] border border-gray-700 rounded px-3 py-2 text-white"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm text-gray-400">Description</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="bg-[#23232a] border border-gray-700 rounded px-3 py-2 text-white"
            />
          </label>
          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white rounded px-4 py-2 mt-2 self-end"
          >
            Save
          </button>
          {status && (
            <div className={status === "Saved!" ? "text-green-400" : "text-red-400"}>
              {status}
            </div>
          )}
        </form>
      )}
    </div>
  );
}

// --- Roles ---
function RolesTab({ havenName }: { havenName: string }) {
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<{ [user: string]: string[] }>({});
  const [rolePerms, setRolePerms] = useState<{ [role: string]: string[] }>({});
  const [status, setStatus] = useState<string | null>(null);
  const [newUser, setNewUser] = useState("");
  const [newRole, setNewRole] = useState("");
  const [editRole, setEditRole] = useState<string | null>(null);
  const [editPerms, setEditPerms] = useState<string[]>([]);

  const PERMISSIONS = [
    "manage_server",
    "manage_roles",
    "manage_channels",
    "manage_messages",
    "pin_messages",
    "send_messages",
    "add_reactions",
    "upload_files",
    "view_channels",
  ];

  useEffect(() => {
    setLoading(true);
    fetch(`/api/permissions?haven=${encodeURIComponent(havenName)}`)
      .then((res) => res.json())
      .then((data) => {
        const perms = data.permissions || {};
        setRoles(perms.members || {});
        setRolePerms(perms.roles || {});
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [havenName]);

  const handleAddRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser || !newRole) return;
    setStatus(null);
    setLoading(true);
    const updatedRoles = { ...roles };
    if (!updatedRoles[newUser]) updatedRoles[newUser] = [];
    if (!updatedRoles[newUser].includes(newRole)) updatedRoles[newUser].push(newRole);
    const res = await fetch("/api/permissions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ haven: havenName, action: "assign-role", user: newUser, role: newRole }),
    });
    setLoading(false);
    if (res.ok) {
      setRoles(updatedRoles);
      setStatus("Saved!");
      setNewUser("");
      setNewRole("");
    } else {
      setStatus("Error saving roles");
    }
  };

  const handleRemoveRole = async (user: string, role: string) => {
    setStatus(null);
    setLoading(true);
    const updatedRoles = { ...roles };
    updatedRoles[user] = (updatedRoles[user] || []).filter((r) => r !== role);
    if (updatedRoles[user].length === 0) delete updatedRoles[user];
    const res = await fetch("/api/permissions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ haven: havenName, action: "revoke-role", user, role }),
    });
    setLoading(false);
    if (res.ok) {
      setRoles(updatedRoles);
      setStatus("Saved!");
    } else {
      setStatus("Error saving roles");
    }
  };

  const handleEditPerms = (role: string) => {
    setEditRole(role);
    setEditPerms(rolePerms[role] || []);
  };

  const handlePermChange = (perm: string) => {
    setEditPerms((prev) => (prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]));
  };

  const handleSavePerms = async () => {
    if (!editRole) return;
    setStatus(null);
    setLoading(true);
    const res = await fetch("/api/permissions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ haven: havenName, action: "define-role", role: editRole, permissions: editPerms }),
    });
    setLoading(false);
    if (res.ok) {
      setRolePerms((prev) => ({ ...prev, [editRole]: editPerms }));
      setStatus("Saved!");
      setEditRole(null);
    } else {
      setStatus("Error saving permissions");
    }
  };

  return (
    <div className="text-gray-200 max-w-lg mx-auto">
      <h2 className="text-2xl font-bold mb-4">Roles & Permissions</h2>
      {loading ? (
        <div>Loading...</div>
      ) : (
        <>
          <form onSubmit={handleAddRole} className="flex flex-col gap-2 mb-4">
            <input
              value={newUser}
              onChange={(e) => setNewUser(e.target.value)}
              placeholder="Username"
              className="bg-[#23232a] border border-gray-700 rounded px-2 py-1 text-white"
            />
            <div className="flex gap-2">
              <input
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                placeholder="Role (e.g. admin)"
                className="bg-[#23232a] border border-gray-700 rounded px-2 py-1 text-white flex-1"
              />
              <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white rounded px-3 py-1">
                Add
              </button>
            </div>
          </form>
          <table className="w-full text-left border-separate border-spacing-y-2 mb-6">
            <thead>
              <tr className="text-gray-400">
                <th className="py-1">User</th>
                <th className="py-1">Roles</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(roles).map(([user, userRoles]) => (
                <tr key={user} className="bg-[#23232a]">
                  <td className="py-1 px-2 font-mono">{user}</td>
                  <td className="py-1 px-2 flex flex-wrap gap-2">
                    {userRoles.map((role) => (
                      <span key={role} className="inline-flex items-center bg-[#28283a] px-2 py-1 rounded text-xs">
                        {role}
                        <button
                          className="ml-2 text-red-400 hover:text-red-600"
                          title="Remove role"
                          onClick={() => handleRemoveRole(user, role)}
                        >
                          ×
                        </button>
                        <button
                          className="ml-2 text-blue-400 hover:text-blue-600"
                          title="Edit permissions"
                          onClick={() => handleEditPerms(role)}
                        >
                          Edit
                        </button>
                      </span>
                    ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {editRole && (
            <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-60 z-50">
              <div className="bg-[#23232a] p-6 rounded-lg shadow-lg w-full max-w-md">
                <h3 className="text-xl font-bold mb-4">
                  Edit Permissions for <span className="text-blue-400">{editRole}</span>
                </h3>
                <div className="flex flex-col gap-2 mb-4">
                  {PERMISSIONS.map((perm) => {
                    const on = editPerms.includes(perm);
                    return (
                      <label key={perm} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={on}
                          onChange={() => handlePermChange(perm)}
                          className="w-4 h-4"
                        />
                        <span>{perm.replace(/_/g, " ")}</span>
                      </label>
                    );
                  })}
                </div>
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setEditRole(null)} className="px-4 py-2 rounded bg-gray-700 text-white">
                    Cancel
                  </button>
                  <button onClick={handleSavePerms} className="px-4 py-2 rounded bg-blue-600 text-white">
                    Save
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
      {status && <div className={status === "Saved!" ? "text-green-400" : "text-red-400"}>{status}</div>}
    </div>
  );
}

// --- Members ---
function MembersTab({ havenName }: { havenName: string }) {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<string[]>([]);
  const [roles, setRoles] = useState<{ [user: string]: string[] }>({});
  const [allRoles, setAllRoles] = useState<string[]>([]);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/permissions?haven=${encodeURIComponent(havenName)}`)
      .then((res) => res.json())
      .then((permData) => {
        const perms = permData.permissions || {};
        const members = perms.members || {};
        setUsers(Object.keys(members));
        setRoles(members);
        setAllRoles(Object.keys(perms.roles || {}));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [havenName]);

  const handleAssignRole = async (user: string, role: string) => {
    setStatus(null);
    setLoading(true);
    const updated = { ...roles };
    if (!updated[user]) updated[user] = [];
    if (!updated[user].includes(role)) updated[user].push(role);
    const res = await fetch("/api/permissions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ haven: havenName, action: "assign-role", user, role }),
    });
    setLoading(false);
    if (res.ok) {
      setRoles(updated);
      setStatus("Saved!");
    } else {
      setStatus("Error assigning role");
    }
  };

  const handleRemoveRole = async (user: string, role: string) => {
    setStatus(null);
    setLoading(true);
    const updated = { ...roles };
    updated[user] = (updated[user] || []).filter((r) => r !== role);
    if (updated[user].length === 0) delete updated[user];
    const res = await fetch("/api/permissions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ haven: havenName, action: "revoke-role", user, role }),
    });
    setLoading(false);
    if (res.ok) {
      setRoles(updated);
      setStatus("Saved!");
    } else {
      setStatus("Error removing role");
    }
  };

  return (
    <div className="text-gray-200">
      <h2 className="text-2xl font-bold mb-4">Members</h2>
      {loading ? (
        <div>Loading...</div>
      ) : (
        <div className="flex flex-col gap-3">
          {users.length === 0 && <div className="text-gray-400">No members found.</div>}
          {users.map((u) => (
            <div key={u} className="bg-[#23232a] border border-gray-800 rounded px-3 py-2">
              <div className="font-mono text-sm mb-2">{u}</div>
              <div className="flex flex-wrap gap-2">
                {(roles[u] || []).map((r) => (
                  <span key={r} className="inline-flex items-center bg-[#28283a] px-2 py-1 rounded text-xs">
                    {r}
                    <button
                      className="ml-2 text-red-400 hover:text-red-600"
                      onClick={() => handleRemoveRole(u, r)}
                      title="Remove role"
                    >
                      ×
                    </button>
                  </span>
                ))}
                <RoleSelect
                  roles={allRoles}
                  onSelect={(r) => handleAssignRole(u, r)}
                  label="Add role"
                />
              </div>
            </div>
          ))}
        </div>
      )}
      {status && <div className={status === "Saved!" ? "text-green-400" : "text-red-400"}>{status}</div>}
    </div>
  );
}

function RoleSelect({ roles, onSelect, label }: { roles: string[]; onSelect: (r: string) => void; label: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        className="text-blue-400 hover:text-blue-200 text-xs underline"
        onClick={() => setOpen((v) => !v)}
      >
        {label}
      </button>
      {open && (
        <div className="absolute z-20 mt-1 bg-[#1f2937] border border-gray-700 rounded shadow-lg p-2">
          {roles.length === 0 && <div className="text-gray-400 text-sm">No roles defined</div>}
          {roles.map((r) => (
            <button
              key={r}
              className="block w-full text-left text-sm text-gray-200 hover:text-blue-400"
              onClick={() => {
                onSelect(r);
                setOpen(false);
              }}
            >
              {r}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// --- Channels ---
function ChannelsTab({ havenName }: { havenName: string }) {
  const [loading, setLoading] = useState(true);
  const [channels, setChannels] = useState<string[]>([]);
  const [newChannel, setNewChannel] = useState("");
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/server-settings?haven=${encodeURIComponent(havenName)}`)
      .then((res) => res.json())
      .then((data) => {
        setChannels(Array.isArray(data.channels) ? data.channels : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [havenName]);

  const saveChannels = async (updated: string[]) => {
    setStatus(null);
    setLoading(true);
    const res = await fetch("/api/server-settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ haven: havenName, channels: updated }),
    });
    setLoading(false);
    if (res.ok) {
      setChannels(updated);
      setStatus("Saved!");
    } else {
      setStatus("Error saving channels");
    }
  };

  const handleAddChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChannel.trim() || channels.includes(newChannel.trim())) return;
    const updated = [...channels, newChannel.trim()];
    await saveChannels(updated);
    setNewChannel("");
  };

  const handleDeleteChannel = async (idx: number) => {
    const updated = channels.filter((_, i) => i !== idx);
    await saveChannels(updated);
  };

  const handleEditChannel = async (idx: number) => {
    if (!editName.trim() || channels.includes(editName.trim())) return;
    const updated = channels.map((ch, i) => (i === idx ? editName.trim() : ch));
    await saveChannels(updated);
    setEditIndex(null);
    setEditName("");
  };

  const handleMove = async (idx: number, dir: -1 | 1) => {
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= channels.length) return;
    const updated = [...channels];
    const [moved] = updated.splice(idx, 1);
    updated.splice(newIdx, 0, moved);
    await saveChannels(updated);
  };

  return (
    <div className="text-gray-200 max-w-lg mx-auto">
      <h2 className="text-2xl font-bold mb-4">Channels</h2>
      {loading ? (
        <div>Loading...</div>
      ) : (
        <>
          <form onSubmit={handleAddChannel} className="flex gap-2 mb-4">
            <input
              value={newChannel}
              onChange={(e) => setNewChannel(e.target.value)}
              placeholder="New channel name"
              className="bg-[#23232a] border border-gray-700 rounded px-2 py-1 text-white flex-1"
            />
            <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white rounded px-3 py-1">
              Add
            </button>
          </form>
          <ul className="flex flex-col gap-2">
            {channels.map((ch, idx) => (
              <li key={ch} className="flex items-center gap-2 bg-[#23232a] px-3 py-2 rounded">
                {editIndex === idx ? (
                  <>
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="bg-[#18181b] border border-gray-700 rounded px-2 py-1 text-white flex-1"
                    />
                    <button onClick={() => handleEditChannel(idx)} className="bg-blue-600 text-white rounded px-2 py-1">
                      Save
                    </button>
                    <button onClick={() => { setEditIndex(null); setEditName(""); }} className="bg-gray-700 text-white rounded px-2 py-1">
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <span className="font-mono flex-1">#{ch}</span>
                    <button onClick={() => { setEditIndex(idx); setEditName(ch); }} className="text-yellow-400 hover:text-yellow-600">
                      Rename
                    </button>
                    <button onClick={() => handleDeleteChannel(idx)} className="text-red-400 hover:text-red-600">
                      Delete
                    </button>
                    <button onClick={() => handleMove(idx, -1)} disabled={idx === 0} className="text-gray-400 hover:text-blue-400">
                      ↑
                    </button>
                    <button onClick={() => handleMove(idx, 1)} disabled={idx === channels.length - 1} className="text-gray-400 hover:text-blue-400">
                      ↓
                    </button>
                  </>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
      {status && <div className={status === "Saved!" ? "text-green-400" : "text-red-400"}>{status}</div>}
    </div>
  );
}

// --- Audit ---
function AuditTab({ havenName }: { havenName: string }) {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setLoading(true);
    fetch("/api/audit-log")
      .then((r) => r.json())
      .then((d) => {
        const arr = Array.isArray(d) ? d : Array.isArray(d?.entries) ? d.entries : [];
        setLogs(arr);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="text-gray-200">
      <h2 className="text-2xl font-bold mb-4">Audit Log</h2>
      {loading ? (
        <div>Loading...</div>
      ) : logs.length === 0 ? (
        <div className="text-gray-400">No audit entries.</div>
      ) : (
        <div className="max-h-80 overflow-auto space-y-2">
          {logs.slice(-100).reverse().map((e, idx) => (
            <div key={idx} className="bg-[#23232a] border border-gray-800 rounded px-3 py-2 text-sm">
              <div className="text-gray-400">{new Date(e.ts || Date.now()).toLocaleString()}</div>
              <div>{e.user || "unknown"}: {e.type || "event"}</div>
              {e.message && <div className="text-gray-300">{e.message}</div>}
            </div>
          ))}
        </div>
      )}
      <div className="text-xs text-gray-500 mt-3">Audit log is global; per-haven scoping not implemented yet.</div>
    </div>
  );
}

// --- Integrations ---
function IntegrationsTab({ havenName }: { havenName: string }) {
  return (
    <div className="text-gray-200 max-w-lg">
      <h2 className="text-2xl font-bold mb-2">Integrations</h2>
      <div className="text-gray-400 text-sm mb-4">
        No integrations are configured yet. Future: webhooks, bots, external service links.
      </div>
      <div className="bg-[#23232a] border border-gray-800 rounded px-3 py-2 text-sm">
        Haven: <span className="text-blue-400">{havenName}</span>
      </div>
    </div>
  );
}

// --- Danger Zone ---
function DangerZoneTab({ havenName }: { havenName: string }) {
  return (
    <div className="text-gray-200">
      <h2 className="text-2xl font-bold mb-4 text-red-400">Danger Zone</h2>
      <div className="bg-[#2a1a1a] border border-red-900 text-sm text-red-100 rounded p-4 space-y-3">
        <div>Delete server and transfer ownership are not implemented yet.</div>
        <div>For now, manage ownership via Roles & Permissions.</div>
        <div className="text-gray-400">Haven: {havenName}</div>
      </div>
    </div>
  );
}
