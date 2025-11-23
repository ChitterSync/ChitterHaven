from pathlib import Path
text = Path("src/app/Main.tsx").read_text()
old = "const list = Array.from(new Set(callParticipants.length ? callParticipants : (dm ? dm.users : [])));\n            const label = callState === 'calling' ? 'Calling.' : 'In call';\n"
print('found', old in text)
start = text.find("const list = Array.from")
print(repr(text[start:start+len(old)]))
