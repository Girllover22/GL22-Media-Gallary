# Portable Storage Policy

- No generated thumbnail image files.
- No generated video preview files.
- No copied source media.
- No cloud or network storage.
- No AppData configuration by design.
- Temporary Electron runtime state remains under `.runtime` in the app folder and is cleared on clean exit.
- Settings and the optional lightweight path index remain under `data`.
