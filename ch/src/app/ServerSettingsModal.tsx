
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faServer,
  faUserShield,
  faUsers,
  faHashtag,
  faScroll,
  faPlug,
  faExclamationTriangle,
  faXmark,
  faPen,
  faTrash,
  faChevronUp,
  faChevronDown,
  faCirclePlus,
  faBan,
  faRightFromBracket,
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

const PANEL_CLASS = "rounded-2xl border border-white/5 bg-white/[0.04] p-5 shadow-lg backdrop-blur";
const INPUT_CLASS = "w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-white placeholder:text-white/60 focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400";
const LABEL_CLASS = "text-xs font-semibold uppercase tracking-[0.25em] text-white/50";
const PRIMARY_BUTTON_CLASS = "inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-sky-500 to-indigo-500 px-4 py-2 font-semibold text-white shadow-lg transition hover:brightness-110 disabled:opacity-60";
const SECONDARY_BUTTON_CLASS = "inline-flex items-center gap-2 rounded-2xl border border-white/10 px-4 py-2 text-white/80 transition hover:border-white/30 disabled:opacity-40 disabled:cursor-not-allowed";

const GRADIENTS = [
  "linear-gradient(135deg, #38bdf8, #6366f1)",
  "linear-gradient(135deg, #34d399, #10b981)",
  "linear-gradient(135deg, #f472b6, #f97316)",
  "linear-gradient(135deg, #a855f7, #22d3ee)",
  "linear-gradient(135deg, #fbbf24, #f97316)",
];

const strHash = (value: string) => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
};

const formatInitials = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return "HV";
  const parts = trimmed.split(/[^a-zA-Z0-9]+/).filter(Boolean);
  if (parts.length === 0) return trimmed.slice(0, 2).toUpperCase();
  const [first, second] = parts;
  if (!second) return first.slice(0, 2).toUpperCase();
  return `${first[0]}${second[0]}`.toUpperCase();
};

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
  const badge = useMemo(() => {
    const safe = havenName || "Haven";
    return {
      initials: formatInitials(safe),
      gradient: GRADIENTS[strHash(safe) % GRADIENTS.length],
    };
  }, [havenName]);

  useEffect(() => {
    if (isOpen) setTab((prev) => prev || "overview");
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-3 py-6 sm:px-6">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={onClose} />
      <div className="relative z-10 flex h-full w-full max-w-5xl flex-col gap-4 overflow-hidden">
        <header className="text-sm text-white/60">
          Haven Settings <span className="font-semibold text-white">{havenName}</span>
        </header>
        <div className="relative flex min-h-[60vh] flex-1 flex-col overflow-hidden rounded-[28px] border border-white/10 bg-[#030711]/95 shadow-2xl md:min-h-[560px] md:flex-row">
          <aside className="w-full border-b border-white/5 bg-white/[0.03] p-4 md:w-64 md:border-b-0 md:border-r md:p-5">
            <div className={`${PANEL_CLASS} flex flex-col gap-3 bg-white/[0.05] p-4`}>
              <div
                className="flex h-14 w-14 items-center justify-center rounded-2xl text-lg font-semibold uppercase text-white"
                style={{ backgroundImage: badge.gradient }}
              >
                {badge.initials}
              </div>
              <div>
                <div className="text-xs uppercase tracking-[0.3em] text-white/50">Haven</div>
                <div className="text-lg font-semibold text-white">{havenName}</div>
              </div>
            </div>
            <nav className="mt-6 flex gap-2 overflow-x-auto pb-2 md:flex-col md:pb-0">
              {TABS.map((t) => {
                const active = tab === t.key;
                return (
                  <button
                    key={t.key}
                    className={`flex min-w-[60%] items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition md:min-w-0 ${
                      active ? "bg-white/12 text-sky-300 shadow-lg" : "text-white/60 hover:bg-white/5"
                    }`}
                    onClick={() => setTab(t.key)}
                  >
                    <FontAwesomeIcon icon={t.icon} />
                    <span>{t.label}</span>
                  </button>
                );
              })}
            </nav>
          </aside>
          <div className="relative flex-1 overflow-y-auto bg-transparent p-4 sm:p-6 md:p-10">
            <button
              className="absolute right-4 top-4 text-white/60 transition hover:text-white md:right-6 md:top-6"
              onClick={onClose}
              title="Close settings"
            >
              <FontAwesomeIcon icon={faXmark} size="lg" />
            </button>
            <div className="space-y-6 text-white">
              {tab === "overview" && <OverviewTab havenName={havenName} />}
              {tab === "roles" && <RolesTab havenName={havenName} />}
              {tab === "members" && <MembersTab havenName={havenName} />}
              {tab === "channels" && <ChannelsTab havenName={havenName} />}
              {tab === "audit" && <AuditTab havenName={havenName} />}
              {tab === "integrations" && <IntegrationsTab havenName={havenName} />}
              {tab === "danger" && <DangerZoneTab havenName={havenName} onClose={onClose} />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
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
    <section className={PANEL_CLASS}>
      <header className="mb-6">
        <p className={LABEL_CLASS}>Overview</p>
        <h2 className="text-2xl font-semibold">Server Overview</h2>
        <p className="text-sm text-white/60">Update the icon, name, and summary that appear everywhere else in the app.</p>
      </header>
      {loading ? (
        <div className="text-white/60">Loading...</div>
      ) : (
        <form
          className="space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            handleSave();
          }}
        >
          <label className="flex flex-col gap-2">
            <span className={LABEL_CLASS}>Server Name</span>
            <input value={name} onChange={(e) => setName(e.target.value)} className={INPUT_CLASS} />
          </label>
          <label className="flex flex-col gap-2">
            <span className={LABEL_CLASS}>Icon URL</span>
            <input value={icon} onChange={(e) => setIcon(e.target.value)} className={INPUT_CLASS} />
          </label>
          <label className="flex flex-col gap-2">
            <span className={LABEL_CLASS}>Description</span>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} className={`${INPUT_CLASS} min-h-[120px] resize-none`} />
          </label>
          <div className="flex flex-wrap justify-end gap-3">
            <button type="submit" className={PRIMARY_BUTTON_CLASS}>
              Save Changes
            </button>
            {status && <span className={status === "Saved!" ? "text-emerald-400" : "text-rose-400"}>{status}</span>}
          </div>
        </form>
      )}
    </section>
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
    <section className="space-y-4">
      <div className={PANEL_CLASS}>
        <header className="mb-4">
          <p className={LABEL_CLASS}>Roles</p>
          <h2 className="text-2xl font-semibold">Roles & Permissions</h2>
          <p className="text-sm text-white/60">Manage role assignments and the abilities tied to each role.</p>
        </header>
        {loading ? (
          <div className="text-white/60">Loading...</div>
        ) : (
          <>
            <form onSubmit={handleAddRole} className="flex flex-col gap-3 rounded-2xl border border-white/5 bg-white/[0.02] p-4">
              <div className="flex flex-col gap-2">
                <span className={LABEL_CLASS}>Assign Role</span>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <input value={newUser} onChange={(e) => setNewUser(e.target.value)} placeholder="Username" className={INPUT_CLASS} />
                  <input value={newRole} onChange={(e) => setNewRole(e.target.value)} placeholder="Role (e.g. admin)" className={INPUT_CLASS} />
                  <button type="submit" className={`${PRIMARY_BUTTON_CLASS} whitespace-nowrap`}>
                    <FontAwesomeIcon icon={faCirclePlus} /> Assign
                  </button>
                </div>
              </div>
            </form>
            <div className="space-y-3">
              {Object.entries(roles).map(([user, userRoles]) => (
                <div key={user} className="rounded-2xl border border-white/5 bg-white/[0.02] p-4">
                  <div className="text-sm font-mono text-sky-200">@{user}</div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {userRoles.map((role) => (
                      <span
                        key={role}
                        className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.08] px-3 py-1 text-xs uppercase tracking-wide text-white"
                      >
                        {role}
                        <button
                          type="button"
                          className="text-rose-300 transition hover:text-rose-200"
                          title="Remove role"
                          onClick={() => handleRemoveRole(user, role)}
                        >
                          <FontAwesomeIcon icon={faXmark} />
                        </button>
                        <button
                          type="button"
                          className="text-sky-300 transition hover:text-sky-200"
                          title="Edit permissions"
                          onClick={() => handleEditPerms(role)}
                        >
                          <FontAwesomeIcon icon={faPen} />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              ))}
              {Object.keys(roles).length === 0 && <div className="text-sm text-white/60">No roles assigned yet.</div>}
            </div>
          </>
        )}
        {status && <div className={status === "Saved!" ? "text-emerald-400" : "text-rose-400"}>{status}</div>}
      </div>
      {editRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className={`${PANEL_CLASS} w-full max-w-md`}>
            <h3 className="text-xl font-semibold">
              Edit permissions for <span className="text-sky-300">{editRole}</span>
            </h3>
            <div className="mt-4 grid grid-cols-1 gap-2">
              {PERMISSIONS.map((perm) => (
                <label key={perm} className="flex items-center gap-3 text-sm text-white/80">
                  <input
                    type="checkbox"
                    checked={editPerms.includes(perm)}
                    onChange={() => handlePermChange(perm)}
                    className="h-4 w-4 rounded border-white/20 bg-transparent text-sky-400 focus:ring-sky-500"
                  />
                  <span className="capitalize">{perm.replace(/_/g, " ")}</span>
                </label>
              ))}
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" className={SECONDARY_BUTTON_CLASS} onClick={() => setEditRole(null)}>
                Cancel
              </button>
              <button type="button" className={PRIMARY_BUTTON_CLASS} onClick={handleSavePerms}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
function MembersTab({ havenName }: { havenName: string }) {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<string[]>([]);
  const [roles, setRoles] = useState<{ [user: string]: string[] }>({});
  const [banned, setBanned] = useState<string[]>([]);
  const [kicked, setKicked] = useState<any[]>([]);
  const [query, setQuery] = useState("");
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
        setBanned(Array.isArray(perms.banned) ? perms.banned : []);
        setKicked(Array.isArray(perms.kicked) ? perms.kicked : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [havenName]);

  const mutateRole = async (user: string, role: string, action: "assign-role" | "revoke-role") => {
    setStatus(null);
    setLoading(true);
    const res = await fetch("/api/permissions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ haven: havenName, action, user, role }),
    });
    setLoading(false);
    if (res.ok) {
      setRoles((prev) => {
        const next = { ...prev };
        if (action === "assign-role") {
          if (!next[user]) next[user] = [];
          if (!next[user].includes(role)) next[user].push(role);
        } else {
          next[user] = (next[user] || []).filter((r) => r !== role);
          if (next[user].length === 0) delete next[user];
        }
        return next;
      });
      setStatus("Saved!");
    } else {
      setStatus("Error updating roles");
    }
  };

  const handleKick = async (user: string) => {
    setStatus(null);
    setLoading(true);
    const res = await fetch("/api/permissions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ haven: havenName, action: "kick", user }),
    });
    setLoading(false);
    if (res.ok) {
      setKicked((prev) => [...prev, { user, at: Date.now() }]);
      setStatus("Kicked");
    } else {
      setStatus("Error kicking user");
    }
  };

  const handleBan = async (user: string) => {
    setStatus(null);
    setLoading(true);
    const res = await fetch("/api/permissions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ haven: havenName, action: "ban", user }),
    });
    setLoading(false);
    if (res.ok) {
      setBanned((prev) => Array.from(new Set([...prev, user])));
      setStatus("Banned");
    } else {
      setStatus("Error banning user");
    }
  };

  const handleUnban = async (user: string) => {
    setStatus(null);
    setLoading(true);
    const res = await fetch("/api/permissions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ haven: havenName, action: "unban", user }),
    });
    setLoading(false);
    if (res.ok) {
      setBanned((prev) => prev.filter((u) => u !== user));
      setStatus("Unbanned");
    } else {
      setStatus("Error unbanning user");
    }
  };

  const filtered = users.filter((u) => u.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <section className={PANEL_CLASS}>
      <header className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className={LABEL_CLASS}>Members</p>
          <h2 className="text-2xl font-semibold">Manage members</h2>
          <p className="text-sm text-white/60">Assign roles, moderate membership, and see who is inside this haven.</p>
        </div>
        <div className="text-sm text-white/60">{users.length} members total</div>
      </header>
      {loading ? (
        <div className="text-white/60">Loading...</div>
      ) : (
        <>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search members" className={INPUT_CLASS} />
            <div className="text-xs uppercase tracking-[0.3em] text-white/50">{filtered.length} visible</div>
          </div>
          <div className="max-h-[420px] space-y-3 overflow-y-auto pr-1">
            {filtered.length === 0 && <div className="text-white/60">No members found.</div>}
            {filtered.map((user) => (
              <div key={user} className="rounded-2xl border border-white/5 bg-white/[0.02] p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="font-mono text-sm text-sky-200">@{user}</div>
                  {banned.includes(user) && <span className="rounded-full border border-rose-400/40 bg-rose-500/20 px-2 py-0.5 text-xs text-rose-200">BANNED</span>}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(roles[user] || []).map((role) => (
                    <span key={role} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.08] px-3 py-1 text-xs uppercase text-white/80">
                      {role}
                      <button type="button" title="Remove role" className="text-rose-300" onClick={() => mutateRole(user, role, "revoke-role")}>
                        <FontAwesomeIcon icon={faXmark} />
                      </button>
                    </span>
                  ))}
                  <RoleSelect roles={allRoles} onSelect={(r) => mutateRole(user, r, "assign-role")} label="Add role" />
                </div>
                <div className="mt-4 flex flex-wrap gap-3 text-xs">
                  <button type="button" className={`${SECONDARY_BUTTON_CLASS} text-amber-200`} onClick={() => handleKick(user)}>
                    <FontAwesomeIcon icon={faRightFromBracket} /> Kick
                  </button>
                  {banned.includes(user) ? (
                    <button type="button" className={`${SECONDARY_BUTTON_CLASS} text-emerald-200`} onClick={() => handleUnban(user)}>
                      <FontAwesomeIcon icon={faBan} /> Unban
                    </button>
                  ) : (
                    <button type="button" className={`${SECONDARY_BUTTON_CLASS} text-rose-200`} onClick={() => handleBan(user)}>
                      <FontAwesomeIcon icon={faBan} /> Ban
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
      {status && <div className={status === "Saved!" ? "text-emerald-400" : "text-rose-400"}>{status}</div>}
    </section>
  );
}

function RoleSelect({ roles, onSelect, label }: { roles: string[]; onSelect: (r: string) => void; label: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        className="inline-flex items-center gap-2 rounded-full border border-white/15 px-3 py-1 text-xs uppercase tracking-wide text-sky-200 transition hover:border-white/40"
        onClick={() => setOpen((v) => !v)}
      >
        {label}
      </button>
      {open && (
        <div className="absolute z-20 mt-2 min-w-[160px] rounded-2xl border border-white/10 bg-[#040810] p-2 shadow-xl">
          {roles.length === 0 && <div className="px-2 py-1 text-sm text-white/60">No roles defined</div>}
          {roles.map((r) => (
            <button
              key={r}
              className="block w-full rounded-xl px-3 py-2 text-left text-sm text-white/80 transition hover:bg-white/10"
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
    const trimmed = newChannel.trim().replace(/\s+/g, "-").toLowerCase();
    if (!trimmed || channels.includes(trimmed)) return;
    await saveChannels([...channels, trimmed]);
    setNewChannel("");
  };

  const handleDeleteChannel = async (idx: number) => {
    await saveChannels(channels.filter((_, i) => i !== idx));
  };

  const handleEditChannel = async (idx: number) => {
    const trimmed = editName.trim().replace(/\s+/g, "-").toLowerCase();
    if (!trimmed || channels.includes(trimmed)) return;
    const updated = channels.map((ch, i) => (i === idx ? trimmed : ch));
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
    <section className={PANEL_CLASS}>
      <header className="mb-4">
        <p className={LABEL_CLASS}>Channels</p>
        <h2 className="text-2xl font-semibold">Channel layout</h2>
        <p className="text-sm text-white/60">Add, reorder, and rename the channels members see.</p>
      </header>
      {loading ? (
        <div className="text-white/60">Loading...</div>
      ) : (
        <>
          <form onSubmit={handleAddChannel} className="mb-4 flex flex-col gap-3 sm:flex-row">
            <input value={newChannel} onChange={(e) => setNewChannel(e.target.value)} placeholder="New channel name" className={INPUT_CLASS} />
            <button type="submit" className={`${PRIMARY_BUTTON_CLASS} whitespace-nowrap`}>
              <FontAwesomeIcon icon={faCirclePlus} /> Add channel
            </button>
          </form>
          <div className="space-y-2">
            {channels.map((ch, idx) => (
              <div key={ch} className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/5 bg-white/[0.02] px-4 py-3">
                {editIndex === idx ? (
                  <>
                    <input value={editName} onChange={(e) => setEditName(e.target.value)} className={INPUT_CLASS} />
                    <button type="button" className={PRIMARY_BUTTON_CLASS} onClick={() => handleEditChannel(idx)}>
                      Save
                    </button>
                    <button
                      type="button"
                      className={SECONDARY_BUTTON_CLASS}
                      onClick={() => {
                        setEditIndex(null);
                        setEditName("");
                      }}
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <span className="font-mono text-sm text-white/80">#{ch}</span>
                    <div className="ml-auto flex items-center gap-2">
                      <button
                        type="button"
                        className={SECONDARY_BUTTON_CLASS}
                        onClick={() => {
                          setEditIndex(idx);
                          setEditName(ch);
                        }}
                      >
                        <FontAwesomeIcon icon={faPen} /> Rename
                      </button>
                      <button type="button" className={`${SECONDARY_BUTTON_CLASS} text-rose-300`} onClick={() => handleDeleteChannel(idx)}>
                        <FontAwesomeIcon icon={faTrash} /> Delete
                      </button>
                      <button type="button" disabled={idx === 0} className={SECONDARY_BUTTON_CLASS} onClick={() => handleMove(idx, -1)}>
                        <FontAwesomeIcon icon={faChevronUp} />
                      </button>
                      <button type="button" disabled={idx === channels.length - 1} className={SECONDARY_BUTTON_CLASS} onClick={() => handleMove(idx, 1)}>
                        <FontAwesomeIcon icon={faChevronDown} />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
            {channels.length === 0 && <div className="text-white/60">No channels yet.</div>}
          </div>
        </>
      )}
      {status && <div className={status === "Saved!" ? "text-emerald-400" : "text-rose-400"}>{status}</div>}
    </section>
  );
}
function AuditTab({ havenName }: { havenName: string }) {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/audit-log?haven=${encodeURIComponent(havenName)}`)
      .then((r) => r.json())
      .then((d) => {
        const arr = Array.isArray(d) ? d : Array.isArray(d?.entries) ? d.entries : [];
        setLogs(arr);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [havenName]);

  const clearLog = async () => {
    if (!window.confirm("Clear audit log for this haven?")) return;
    setStatus(null);
    setLoading(true);
    const res = await fetch("/api/audit-log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "clear", haven: havenName }),
    });
    setLoading(false);
    if (res.ok) {
      setLogs([]);
      setStatus("Cleared audit log");
    } else {
      setStatus("Could not clear audit log");
    }
  };

  return (
    <section className={PANEL_CLASS}>
      <header className="mb-4">
        <p className={LABEL_CLASS}>Audit log</p>
        <h2 className="text-2xl font-semibold">Recent actions</h2>
        <p className="text-sm text-white/60">Track the latest moderation and configuration actions taken across this haven.</p>
      </header>
      {loading ? (
        <div className="text-white/60">Loading...</div>
      ) : logs.length === 0 ? (
        <div className="text-white/60">No audit entries.</div>
      ) : (
        <div className="max-h-80 space-y-2 overflow-auto pr-1 text-sm">
          {logs.slice(-100).reverse().map((e, idx) => (
            <div key={idx} className="rounded-2xl border border-white/5 bg-white/[0.03] p-3">
              <div className="text-xs text-white/50">{new Date(e.ts || Date.now()).toLocaleString()}</div>
              <div className="font-semibold text-white/90">{e.user || "unknown"}</div>
              <div className="text-white/70">{e.type || "event"}</div>
              {e.message && <div className="text-white/60">{e.message}</div>}
            </div>
          ))}
        </div>
      )}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button type="button" className={`${SECONDARY_BUTTON_CLASS} text-rose-200`} onClick={clearLog}>
          Clear Audit Log
        </button>
        {status && <span className="text-sm text-white/60">{status}</span>}
      </div>
      <div className="mt-3 text-xs text-white/40">Audit log is global; per-haven scoping is not yet available.</div>
    </section>
  );
}

function IntegrationsTab({ havenName }: { havenName: string }) {
  const [loading, setLoading] = useState(true);
  const [integrations, setIntegrations] = useState<any[]>([]);
  const [newUrl, setNewUrl] = useState("");
  const [newName, setNewName] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/integrations?haven=${encodeURIComponent(havenName)}`)
      .then((r) => r.json())
      .then((d) => {
        setIntegrations(Array.isArray(d?.integrations) ? d.integrations : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [havenName]);

  const addIntegration = async () => {
    if (!newUrl) return setStatus("Missing URL");
    setStatus(null);
    setLoading(true);
    const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const item = { id, type: "webhook", url: newUrl, name: newName || "Webhook" };
    const res = await fetch("/api/integrations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ haven: havenName, action: "add", integration: item }),
    });
    setLoading(false);
    if (res.ok) {
      setIntegrations((prev) => [...prev, item]);
      setNewUrl("");
      setNewName("");
      setStatus("Added");
    } else setStatus("Error adding integration");
  };

  const removeIntegration = async (id: string) => {
    if (!window.confirm("Remove this integration?")) return;
    setStatus(null);
    setLoading(true);
    const res = await fetch("/api/integrations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ haven: havenName, action: "remove", id }),
    });
    setLoading(false);
    if (res.ok) setIntegrations((prev) => prev.filter((i) => (i.id || "") !== id));
    else setStatus("Error removing integration");
  };

  return (
    <section className={PANEL_CLASS}>
      <header className="mb-4">
        <p className={LABEL_CLASS}>Integrations</p>
        <h2 className="text-2xl font-semibold">Webhook access</h2>
        <p className="text-sm text-white/60">Connect lightweight bots or services by creating webhook URLs.</p>
      </header>
      {loading ? (
        <div className="text-white/60">Loading...</div>
      ) : (
        <>
          <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4">
            <div className="mb-3 text-sm text-white/60">
              Haven: <span className="text-sky-300">{havenName}</span>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Name" className={INPUT_CLASS} />
              <input value={newUrl} onChange={(e) => setNewUrl(e.target.value)} placeholder="Webhook URL" className={INPUT_CLASS} />
              <button type="button" className={`${PRIMARY_BUTTON_CLASS} whitespace-nowrap`} onClick={addIntegration}>
                <FontAwesomeIcon icon={faCirclePlus} /> Add
              </button>
            </div>
            {status && <div className="mt-2 text-sm text-white/60">{status}</div>}
          </div>
          <div className="mt-4 space-y-3">
            {integrations.length === 0 ? (
              <div className="text-white/60">No integrations configured.</div>
            ) : (
              integrations.map((it) => (
                <div key={it.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/5 bg-white/[0.03] p-4">
                  <div className="flex-1">
                    <div className="text-lg font-semibold">{it.name}</div>
                    <div className="text-xs text-white/60">
                      {it.type} - {it.url}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" className={SECONDARY_BUTTON_CLASS} onClick={() => navigator.clipboard?.writeText(it.url)}>
                      Copy
                    </button>
                    <button type="button" className={`${SECONDARY_BUTTON_CLASS} text-rose-300`} onClick={() => removeIntegration(it.id)}>
                      Remove
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </section>
  );
}

function DangerZoneTab({ havenName, onClose }: { havenName: string; onClose?: () => void }) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const deleteServer = async () => {
    if (!window.confirm(`Delete server ${havenName}? This cannot be undone.`)) return;
    setStatus(null);
    setLoading(true);
    const res = await fetch("/api/danger", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete-server", haven: havenName }),
    });
    setLoading(false);
    if (res.ok) {
      setStatus("Deleted");
      setTimeout(() => {
        onClose?.();
        try {
          window.location.reload();
        } catch {
          // ignore
        }
      }, 400);
    } else {
      setStatus("Failed to delete");
    }
  };

  return (
    <section className={`${PANEL_CLASS} border-rose-900/60 bg-rose-950/60`}>
      <header className="mb-4">
        <p className={LABEL_CLASS}>Danger</p>
        <h2 className="text-2xl font-semibold text-rose-200">Danger Zone</h2>
        <p className="text-sm text-rose-200/80">Irreversible actions live here. Make sure you know what you are doing.</p>
      </header>
      <div className="space-y-4 text-sm text-rose-100/80">
        <p>Deleting a haven removes every channel, message, and permission set. Ownership transfers should be handled from Roles.</p>
        <div className="text-rose-300">Haven: {havenName}</div>
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" className={`${PRIMARY_BUTTON_CLASS} from-rose-500 to-rose-700`} onClick={deleteServer} disabled={loading}>
            {loading ? "Deleting..." : "Delete Haven"}
          </button>
          {status && <span>{status}</span>}
        </div>
      </div>
    </section>
  );
}
