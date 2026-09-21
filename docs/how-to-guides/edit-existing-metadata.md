# Edit existing metadata

Use the structured form to revise metadata already stored in a CWL document.

1. Open the local `.cwl` file in VS Code.
2. Run **CWL: Edit CWL Metadata**.
3. Confirm that the form is pre-filled from the document.
4. Change the required fields, repeatable entries, or controlled-vocabulary selections.
5. Review the source-control diff and save the file.

Changes made in the form are written to the active document after a short delay. Changes made directly in that document are sent back to the open form, so you can use the representation that best fits the current edit.

## Work safely with an open form

- Keep the form associated with the file you opened it from. Opening another editor does not retarget the form.
- Use VS Code undo if a form edit was not what you intended.
- Inspect the diff before committing, particularly when the original metadata used unusual scalar or collection formatting.
- Close and reopen the form if the document becomes invalid YAML and cannot be parsed.

## Remove a value

Clear a scalar field or use **Remove** on a repeatable entry. Once the form emits the new model, empty optional values are omitted from the metadata block.

The first license, help entry, and author cannot be removed from the form, but their values can be cleared. Contributor and defined-term lists may be empty.

## Reuse the publisher as an affiliation

Within an author or contributor entry, select **Use publisher affiliation**. The editor copies the publisher name, email, and identifier into that person's affiliation fields. Later edits to the publisher do not automatically replace the copied values.

## Resolve an organization identifier

Enter a publisher or affiliation name and pause briefly. The editor queries ROR and fills an identifier when it finds a match. You may replace the suggested value manually.

An unavailable network or unmatched name does not prevent local metadata editing; enter the identifier yourself or leave the optional field empty.

## Edit metadata and CWL logic together

The extension rewrites only its [supported top-level metadata keys](../reference/metadata-fields.md). It preserves the remaining CWL text byte-for-byte, including comments, compact mappings, and the order of workflow fields. This makes metadata changes suitable for the same branch, review, and commit cycle as changes to inputs, outputs, and commands.
