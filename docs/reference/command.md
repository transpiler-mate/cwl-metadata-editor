# Command and editor behavior

## Command

| Property | Value |
| --- | --- |
| Display name | **CWL: Edit CWL Metadata** |
| Command ID | `cwlMetadataEditor.open` |
| Activation | Running the command |
| Available for | A local file whose name ends in `.cwl` |
| Keyboard shortcut | `Ctrl+K Shift+M` (`⌘K Shift+M` on macOS) |
| Opens in | A webview panel beside the active editor |

The command is available from the Command Palette, the editor title, and the Explorer and editor context menus for `.cwl` resources.
The keyboard shortcut is active only while a local `.cwl` text editor has focus.

Context menu actions use the selected file, even when it is not open. Palette and keyboard actions use the active document.

If there is no selected or active local `.cwl` document, the command shows a warning and does not open the form.

## Synchronization

- On startup, the form reads supported metadata from the document.
- Form input is sent to the extension and applied after a 200 ms debounce.
- A direct change to the bound document reloads the form unless that change originated from the form itself.
- The panel retains its form state when hidden.
- The document is not saved automatically; normal VS Code save and Auto Save settings apply.

Each panel stays bound to the document selected when the command ran.

## Source preservation

On each form update, the editor:

1. parses supported top-level metadata entries;
2. serializes the form model in a stable metadata-key order;
3. places the metadata block at the beginning of the document;
4. appends every unsupported or non-metadata top-level entry using its original source text.

Consequently, CWL logic and its comments or formatting are preserved, but the supported metadata block itself can be normalized and reordered.

## Web access

The form contains bundled controlled-vocabulary data for SPDX licenses, operating systems, Earth Observation keywords, GCMD Science keywords, and CRediT roles. Organization lookup may connect to:

- `https://api.ror.org` for ROR search;

Metadata editing remains local to the active document. A failed lookup does not prevent manual entry.
