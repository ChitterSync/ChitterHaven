from pathlib import Path
lines = Path("src/app/Main.tsx").read_text().splitlines()
needle = "const list = Array.from(new Set(callParticipants.length ? callParticipants : (dm ? dm.users : [])));"
for idx, line in enumerate(lines):
    if line.strip() == needle:
        indent = line[:len(line) - len(line.lstrip())]
        lines[idx] = f"{indent}const fallback = (dm ? dm.users : []).map(user => ({{ user, status: 'ringing' as const }}));"
        lines.insert(idx + 1, f"{indent}const participantCards = (callParticipants.length ? callParticipants : fallback).filter(p => !!p.user);")
        break
else:
    raise SystemExit('needle not found')
Path("src/app/Main.tsx").write_text("\n".join(lines))
