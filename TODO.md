# ChitterHaven Update TODO

## Critical
- Run a full build and verify `UserSettingsModal.tsx` compiles cleanly.
- Visual pass at 1920x1080 and a smaller viewport to confirm sidebar/content scrolling.

## Recommended
- Verify Browser tab permission requests trigger prompts (notifications, mic, camera, location).
- Confirm Connections lock overlay behavior on desktop + mobile.
- End-to-end settings flow: open modal, switch tabs, scroll, save.

## Nice-to-have
- Replace the Connections lock alert with an in-app modal.
- Add a "Refresh permissions" button in Browser tab.
- Extract repeated styles in `UserSettingsModal.tsx` into small shared components.
