from pathlib import Path
text = Path("src/app/Main.tsx").read_text()
start = text.find("const list = Array.from(new Set(callParticipants.length ? callParticipants : (dm ? dm.users : [])))")
print(start)
print(repr(text[start:start+150]))
