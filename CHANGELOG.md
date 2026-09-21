# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

### Changed

### Deprecated

### Removed

### Fixed

### Security

## [0.2.0] - 2026-09-21

### Changed

- Serialize single-line YAML string values with double quotes, including dates, nested fields, and list items.
- Serialize multiline strings as literal blocks (`|`), preserving line breaks, indentation, and trailing newlines.

### Fixed

- Preserve numeric, boolean, and null types when serializing YAML list items and root values.

## [0.1.0] - 2026-08-XX

### Added

- Initial version

[unreleased]: https://github.com/eoap/cwl-metadata-editor/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/eoap/cwl-metadata-editor/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/eoap/cwl-metadata-editor/releases/tag/v0.1.0
