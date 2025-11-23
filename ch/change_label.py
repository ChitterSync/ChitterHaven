from pathlib import Path
path = Path("src/app/Main.tsx")
text = path.read_text()
old = "const label = callState === 'calling' ? 'Calling.' : 'In call';"
if old not in text:
    raise SystemExit('label snippet not found')
text = text.replace(old, "const label = callState === 'calling' ? 'Calling…' : 'In call';", 1)
path.write_text(text)
