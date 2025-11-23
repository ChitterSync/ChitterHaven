# -*- coding: utf-8 -*-
from pathlib import Path
path = Path("src/app/Main.tsx")
lines = path.read_text(encoding="utf-8").splitlines()
target_idx = 2005
lines[target_idx] = "            const fallback = (dm ? dm.users : []).map(user => ({ user, status: 'ringing' as const }));"
lines.insert(target_idx + 1, "            const participantCards = (callParticipants.length ? callParticipants : fallback).filter(p => !!p.user);")
lines[target_idx + 2] = "            const label = callState === 'calling' ? 'Calling\u2026' : 'In call';"
path.write_text('\n'.join(lines), encoding="utf-8")
