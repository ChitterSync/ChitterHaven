const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'src', 'app', 'components', 'Dropdown.tsx');
try {
  const src = fs.readFileSync(file, 'utf8');
  const okLive = /aria-live\s*=\s*"polite"/.test(src);
  const okLabel = /aria-label\s*=/.test(src);
  if (!okLive) {
    console.error('Accessibility check failed: aria-live="polite" not found in Dropdown.tsx');
    process.exit(2);
  }
  if (!okLabel) {
    console.error('Accessibility check failed: aria-label not found on action buttons in Dropdown.tsx');
    process.exit(3);
  }
  console.log('Accessibility checks passed for Dropdown.tsx');
  process.exit(0);
} catch (e) {
  console.error('Could not read Dropdown.tsx', e && e.message);
  process.exit(1);
}
