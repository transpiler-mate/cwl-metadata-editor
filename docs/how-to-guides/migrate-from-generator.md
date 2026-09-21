# Move from the online generator

If you previously used the Transpiler Mate online metadata generator, you can keep the same authoring model and remove the manual transfer step.

## Use an existing generated file

1. Open the `.cwl` file that contains the generator output.
2. Run **CWL: Edit CWL Metadata**.
3. Confirm that the existing software, license, help, publisher, people, roles, and keyword values appear in the form.
4. Continue editing. Changes now go straight to the file.

There is no import operation: the CWL document is the editor's input and output.

## Replace the browser workflow

| Online generator | VS Code extension |
| --- | --- |
| Open a separate web page | Open the form beside the active `.cwl` file |
| Populate an empty form or load an example | Load current metadata from the file automatically |
| Inspect the Generated YAML pane | Inspect the real document or its diff |
| Copy a metadata snippet | Changes are already in the document |
| Download a minimal CWL file | Continue with the existing CWL file |
| Return to the generator for later changes | Reopen the form on any development iteration |

## Keep the same metadata capabilities

The extension retains the generator's metadata fields and supporting data:

- Schema.org `SoftwareApplication` identity and description;
- Semantic Versioning input;
- SPDX license selection;
- help links;
- ROR-assisted organizations and affiliations;
- authors and contributors with CRediT roles;
- operating-system choices;
- free-text, Earth Observation, and GCMD Science keywords.

The visual theme, standalone output preview, validation summary, example loader, copy action, and download action are not reproduced as separate controls. Their workflow responsibilities are handled by VS Code, the active document, and source control. See [Relationship to Transpiler Mate](../explanation/transpiler-mate.md) for the precise parity boundary.

## Continue with publication outputs

The extension does not replace Transpiler Mate's conversion and publication commands. After editing the annotated CWL, use Transpiler Mate to produce formats such as CodeMeta, DataCite, or OGC API Records.
