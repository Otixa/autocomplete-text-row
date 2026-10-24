# Changelog

All notable changes to this project are documented in this file. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project follows [Semantic Versioning](https://semver.org/).

## [1.0.2](https://github.com/Otixa/autocomplete-text-row/compare/v1.0.1...v1.0.2) (2026-10-24)

### Changed

- The row is now in the default HACS store. The installation steps lead with a plain HACS search and keep the custom repository steps as a fallback. No code changes.

## [1.0.1](https://github.com/Otixa/autocomplete-text-row/compare/v1.0.0...v1.0.1) (2026-09-24)

### Fixed

- The field now matches Home Assistant's own text inputs (2026.x): 56px tall, flush against the icon column, 16px inset, smaller label, and the form background, hover and underline colours from the theme (`--ha-color-form-background`, `--ha-color-form-background-hover`, `--ha-color-border-neutral-loud`). Older frontends fall back to the previous variables. Before, the row sat about 10px to the right of neighbouring rows and could show a different background.

## [1.0.0](https://github.com/Otixa/autocomplete-text-row/releases/tag/v1.0.0) (2026-09-24)

Initial release.

### Features

- Entity row for `input_text` and `text` entities with live suggestions that filter as the user types.
- Suggestions from a fixed `options` list, from any list attribute of another entity (`options_entity`, `options_attribute`), or both.
- Any value can be saved: a "Use “…”" item offers text that is not a suggestion, and leaving the field keeps what was typed.
- Text that matches a suggestion apart from case or accents is saved in the suggestion's spelling.
- Multi-word matching in any order, ignoring case and accents; exact and prefix matches ranked first, then word-start matches.
- Keyboard navigation: arrow keys, Enter to choose, Esc to discard typing without closing a surrounding dialog.
- Clear button when the entity allows an empty value; the entity's `max` length is enforced in the field.
- A value that Home Assistant rejects is reverted in the field and logged to the console.
