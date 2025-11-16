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
      <div className="bg-[#18181b] rounded-lg shadow-lg w-full max-w-3xl flex min-h-[500px]">
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

// --- Tab Components (stubs, to be implemented) ---
function OverviewTab({ havenName }: { havenName: string }) {
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState(havenName);
  const [icon, setIcon] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/server-settings?haven=${encodeURIComponent(havenName)}`)
      .then(res => res.json())
      .then(data => {
        setName(data.name || havenName);
        setIcon(data.icon || "");
        setDescription(data.description || "");
        setLoading(false);
      });
  }, [havenName]);

  const handleSave = async () => {
    setStatus(null);
    setLoading(true);
    const res = await fetch("/api/server-settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ haven: havenName, name, icon, description })
    });
    setLoading(false);
    if (res.ok) setStatus("Saved!");
    else setStatus("Error saving settings");
  };

  return (
    <div className="text-gray-200 max-w-lg mx-auto">
      <h2 className="text-2xl font-bold mb-4">Server Overview</h2>
      {loading ? <div>Loading...</div> : (
        <form onSubmit={e => { e.preventDefault(); handleSave(); }} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-sm text-gray-400">Server Name</span>
            <input value={name} onChange={e => setName(e.target.value)} className="bg-[#23232a] border border-gray-700 rounded px-3 py-2 text-white" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm text-gray-400">Icon URL</span>
            <input value={icon} onChange={e => setIcon(e.target.value)} className="bg-[#23232a] border border-gray-700 rounded px-3 py-2 text-white" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm text-gray-400">Description</span>
            <textarea value={description} onChange={e => setDescription(e.target.value)} className="bg-[#23232a] border border-gray-700 rounded px-3 py-2 text-white" />
          </label>
          <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white rounded px-4 py-2 mt-2 self-end">Save</button>
          {status && <div className={status === "Saved!" ? "text-green-400" : "text-red-400"}>{status}</div>}
        </form>
      )}
    </div>
  );
}
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
    "view_channels"
  ];

  useEffect(() => {
    setLoading(true);
    fetch(`/api/permissions?haven=${encodeURIComponent(havenName)}`)
      .then(res => res.json())
      .then(data => {
        const perms = data.permissions || {};
        setRoles(perms.members || {});
        setRolePerms(perms.roles || {});
        setLoading(false);
      });
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
      body: JSON.stringify({ haven: havenName, action: 'assign-role', user: newUser, role: newRole })
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
    updatedRoles[user] = updatedRoles[user].filter(r => r !== role);
    if (updatedRoles[user].length === 0) delete updatedRoles[user];
    const res = await fetch("/api/permissions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ haven: havenName, action: 'revoke-role', user, role })
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
    setEditPerms((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]
    );
  };

  const handleSavePerms = async () => {
    if (!editRole) return;
    setStatus(null);
    setLoading(true);
    const updatedRolePerms = { ...rolePerms, [editRole]: editPerms };
    const res = await fetch("/api/permissions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ haven: havenName, action: 'define-role', role: editRole, permissions: editPerms })
    });
    setLoading(false);
    if (res.ok) {
      setRolePerms(updatedRolePerms);
      setStatus("Saved!");
      setEditRole(null);
    } else {
      setStatus("Error saving permissions");
    }
  };

  return (
    <div className="text-gray-200 max-w-lg mx-auto">
      <h2 className="text-2xl font-bold mb-4">Roles & Permissions</h2>
      {loading ? <div>Loading...</div> : (
        <>
          <form onSubmit={handleAddRole} className="flex gap-2 mb-4">
            <input
              value={newUser}
              onChange={e => setNewUser(e.target.value)}
              placeholder="Username"
              className="bg-[#23232a] border border-gray-700 rounded px-2 py-1 text-white flex-1"
            />
            <input
              value={newRole}
              onChange={e => setNewRole(e.target.value)}
              placeholder="Role (e.g. admin)"
              className="bg-[#23232a] border border-gray-700 rounded px-2 py-1 text-white flex-1"
            />
            <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white rounded px-3 py-1">Add</button>
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
                          ⚙️
                        </button>
                      </span>
                    ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {/* Edit permissions modal */}
          {editRole && (
            <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-60 z-50">
              <div className="bg-[#23232a] p-6 rounded-lg shadow-lg w-full max-w-md">
                <h3 className="text-xl font-bold mb-4">Edit Permissions for <span className="text-blue-400">{editRole}</span></h3>
                <div className="flex flex-col gap-2 mb-4">
                  {PERMISSIONS.map((perm) => {
                    const on = editPerms.includes(perm);
                    const offset = on ? 14 : 0;
                    return (
                      <label key={perm} className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handlePermChange(perm)}
                          className="relative inline-flex items-center justify-start"
                          style={{ padding: 2, borderRadius: 999, border: `1px solid ${on ? '#22c55e' : '#4b5563'}`, background: '#020617', width: 32, height: 18 }}
                        >
                          <span
                            style={{
                              position: 'absolute',
                              left: 2,
                              top: 2,
                              width: 14,
                              height: 14,
                              borderRadius: 999,
                              background: on ? '#16a34a' : '#4b5563',
                              color: '#0b1120',
                              fontSize: 10,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transform: `translateX(${offset}px)`,
                              transition: 'transform 140ms ease-out'
                            }}
                          >
                            {on ? '✔' : '✕'}
                          </span>
                        </button>
                        <span>{perm.replace(/_/g, " ")}</span>
                      </label>
                    );
                  })}
                </div>
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setEditRole(null)} className="px-4 py-2 rounded bg-gray-700 text-white">Cancel</button>
                  <button onClick={handleSavePerms} className="px-4 py-2 rounded bg-blue-600 text-white">Save</button>
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
function MembersTab({ havenName }: { havenName: string }) {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<string[]>([]);
  const [roles, setRoles] = useState<{ [user: string]: string[] }>({});
  const [allRoles, setAllRoles] = useState<string[]>([]);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch("/api/users-restore.json").then(res => res.json()),
      fetch(`/api/permissions?haven=${encodeURIComponent(havenName)}`).then(res => res.json())
    ]).then(([userData, permData]) => {
      setUsers(userData.users.map((u: any) => u.username));
      const perms = permData.permissions || {};
      setRoles(perms.members || {});
      setAllRoles(Object.keys(perms.roles || {}));
      setLoading(false);
    });
  }, [havenName]);

  const handleAssignRole = async (user: string, role: string) => {
    setStatus(null);
    setLoading(true);
    const updatedRoles = { ...roles };
    if (!updatedRoles[user]) updatedRoles[user] = [];
    if (!updatedRoles[user].includes(role)) updatedRoles[user].push(role);
    const res = await fetch("/api/permissions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ haven: havenName, action: 'assign-role', user, role })
    });
    setLoading(false);
    if (res.ok) {
      setRoles(updatedRoles);
      setStatus("Saved!");
    } else {
      setStatus("Error assigning role");
    }
  };

  const handleRemoveRole = async (user: string, role: string) => {
    setStatus(null);
    setLoading(true);
    const updatedRoles = { ...roles };
    updatedRoles[user] = updatedRoles[user].filter(r => r !== role);
    if (updatedRoles[user].length === 0) delete updatedRoles[user];
    const res = await fetch("/api/permissions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ haven: havenName, action: 'revoke-role', user, role })
    });
    setLoading(false);
    if (res.ok) {
      setRoles(updatedRoles);
      setStatus("Saved!");
    } else {
      setStatus("Error removing role");
    }
  };

  const handleSetOwner = async (user: string) => {
    if (!user) return;
    const confirmText = `Transfer ownership of ${havenName} to ${user}?`;
    // eslint-disable-next-line no-alert
    const ok = typeof window !== 'undefined' ? window.confirm(confirmText) : true;
    if (!ok) return;
    setStatus(null);
    setLoading(true);
    const res = await fetch("/api/permissions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ haven: havenName, action: 'set-owner', user })
    });
    setLoading(false);
    if (res.ok) {
      setRoles(prev => ({ ...prev, [user]: Array.from(new Set([...(prev[user] || []), 'Owner'])) }));
      setStatus("Saved!");
    } else {
      setStatus("Error setting owner");
    }
  };

  // UI for kick/ban (no backend yet)
  const handleKick = (user: string) => {
    alert(`Kick user: ${user} (not implemented)`);
  };
  const handleBan = (user: string) => {
    alert(`Ban user: ${user} (not implemented)`);
  };

  return (
    <div className="text-gray-200 max-w-lg mx-auto">
      <h2 className="text-2xl font-bold mb-4">Members</h2>
      {loading ? <div>Loading...</div> : (
        <table className="w-full text-left border-separate border-spacing-y-2">
          <thead>
            <tr className="text-gray-400">
              <th className="py-1">User</th>
              <th className="py-1">Roles</th>
              <th className="py-1">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user} className="bg-[#23232a]">
                <td className="py-1 px-2 font-mono">{user}</td>
                <td className="py-1 px-2 flex flex-wrap gap-2">
                  {(roles[user] || []).map(role => (
                    <span key={role} className="inline-flex items-center bg-[#28283a] px-2 py-1 rounded text-xs">
                      {role}
                      <button
                        className="ml-2 text-red-400 hover:text-red-600"
                        title="Remove role"
                        onClick={() => handleRemoveRole(user, role)}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  <select
                    className="ml-2 bg-[#23232a] border border-gray-700 rounded px-2 py-1 text-xs text-white"
                    value=""
                    onChange={e => handleAssignRole(user, e.target.value)}
                  >
                    <option value="">+ Add role</option>
                    {allRoles.filter(r => !(roles[user] || []).includes(r)).map(role => (
                      <option key={role} value={role}>{role}</option>
                    ))}
                  </select>
                </td>
                <td className="py-1 px-2 flex gap-2">
                  <button onClick={() => handleSetOwner(user)} className="text-blue-400 hover:text-blue-600">Set Owner</button>
                  <button onClick={() => handleKick(user)} className="text-yellow-400 hover:text-yellow-600">Kick</button>
                  <button onClick={() => handleBan(user)} className="text-red-400 hover:text-red-600">Ban</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {status && <div className={status === "Saved!" ? "text-green-400" : "text-red-400"}>{status}</div>}
    </div>
  );
}
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
      .then(res => res.json())
      .then(data => {
        setChannels(data.channels || []);
        setLoading(false);
      });
  }, [havenName]);

  const saveChannels = async (updated: string[]) => {
    setStatus(null);
    setLoading(true);
    const res = await fetch("/api/server-settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ haven: havenName, channels: updated })
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
      {loading ? <div>Loading...</div> : (
        <>
          <form onSubmit={handleAddChannel} className="flex gap-2 mb-4">
            <input
              value={newChannel}
              onChange={e => setNewChannel(e.target.value)}
              placeholder="New channel name"
              className="bg-[#23232a] border border-gray-700 rounded px-2 py-1 text-white flex-1"
            />
            <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white rounded px-3 py-1">Add</button>
          </form>
          <ul className="flex flex-col gap-2">
            {channels.map((ch, idx) => (
              <li key={ch} className="flex items-center gap-2 bg-[#23232a] px-3 py-2 rounded">
                {editIndex === idx ? (
                  <>
                    <input
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      className="bg-[#18181b] border border-gray-700 rounded px-2 py-1 text-white flex-1"
                    />
                    <button onClick={() => handleEditChannel(idx)} className="bg-blue-600 text-white rounded px-2 py-1">Save</button>
                    <button onClick={() => { setEditIndex(null); setEditName(""); }} className="bg-gray-700 text-white rounded px-2 py-1">Cancel</button>
                  </>
                ) : (
                  <>
                    <span className="font-mono">#{ch}</span>
                    <button onClick={() => { setEditIndex(idx); setEditName(ch); }} className="text-yellow-400 hover:text-yellow-600">Rename</button>
                    <button onClick={() => handleDeleteChannel(idx)} className="text-red-400 hover:text-red-600">Delete</button>
                    <button onClick={() => handleMove(idx, -1)} disabled={idx === 0} className="text-gray-400 hover:text-blue-400">↑</button>
                    <button onClick={() => handleMove(idx, 1)} disabled={idx === channels.length - 1} className="text-gray-400 hover:text-blue-400">↓</button>
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
function AuditTab({ havenName }: { havenName: string }) {
  return <div className="text-gray-200">Audit log for <b>{havenName}</b></div>;
}
function IntegrationsTab({ havenName }: { havenName: string }) {
  return <div className="text-gray-200">Integrations for <b>{havenName}</b></div>;
}
function DangerZoneTab({ havenName }: { havenName: string }) {
  return <div className="text-gray-200">Danger Zone (delete server, transfer ownership, etc.) for <b>{havenName}</b></div>;
}
