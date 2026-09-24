# Autocomplete Text Row

An entities-card row for Home Assistant that turns an `input_text` / `text` field into a text box with live suggestions. Pick a suggestion, or type something new.

[![GitHub Release][releases-shield]][releases]
[![License][license-shield]](LICENSE)
[![HACS][hacs-shield]][hacs]
[![Validate][validate-shield]][validate]
[![Buy Me a Coffee][bmac-shield]][bmac]

![Autocomplete Text Row][screenshot]

---

## Overview

A plain text field lets people type the same thing five different ways ("Al Fakher", "al fakher", "AlFakher"). A select only allows values that already exist. This row sits between the two. It suggests what is already known, filters the suggestions as you type, and still accepts a new value when nothing fits. The value is saved with `input_text.set_value` or `text.set_value`.

Typical uses:

- Brand, author, location or category fields in forms, where most entries repeat but new ones keep appearing
- Free-text helpers where you want consistent spelling without locking the list
- Fields inside popups (for example browser_mod) that feed a script

Features:

- Suggestions read live from any entity attribute that holds a list, a fixed list in the row's configuration, or both
- Multi-word matching in any order (`grey earl` matches *Earl Grey*)
- Case- and accent-insensitive matching (`creme` matches *Crème Brûlée*)
- A typed variant of an existing suggestion is saved in that suggestion's spelling (`al fakher` is saved as *Al Fakher*)
- A "Use “…”" item for a value that is not in the list yet
- Leaving the field keeps what was typed, as a normal text field does; Esc discards it
- Keyboard navigation: ↑ / ↓ to move, Enter to choose, Esc to close the list without closing a surrounding dialog
- Respects the entity's `max` length, and offers a clear button when an empty value is allowed
- Styled entirely with Home Assistant theme variables; no dependency on Home Assistant frontend internals
- No build step and no runtime dependencies

Looking for a searchable picker that only allows existing options? See [Searchable Select Row][select-row].

---

## Installation

### HACS (recommended)

The row is not yet in the default HACS store. Add it as a custom repository:

1. Open HACS in Home Assistant.
2. Open the menu (⋮) → **Custom repositories**.
3. Enter `https://github.com/Otixa/autocomplete-text-row`, select type **Dashboard**, and click **Add**.
4. Search for **Autocomplete Text Row** and click **Download**.
5. Reload the browser.

HACS registers the dashboard resource automatically.

### Manual

1. Download `autocomplete-text-row.js` from the [latest release][releases].
2. Copy it to `<config>/www/autocomplete-text-row.js`.
3. Add a dashboard resource, either in **Settings → Dashboards → ⋮ → Resources** (type **JavaScript module**) or in YAML:

```yaml
resources:
  - url: /local/autocomplete-text-row.js?v=1.0.1
    type: module
```

4. Reload the browser.

Change the `?v=` value whenever the file is updated so that browsers do not keep a cached copy.

---

## Configuration

The row is used inside an `entities` card, or anywhere else that accepts entity rows. Configuration is YAML-only; the entities card editor does not expose options for custom rows.

### Minimal example

Suggestions from a fixed list:

```yaml
type: entities
entities:
  - type: custom:autocomplete-text-row
    entity: input_text.tea_blend
    options:
      - Assam
      - Earl Grey
      - Sencha
```

### Live suggestions from another entity

Any attribute that holds a list of strings works. A template sensor is a convenient way to keep one up to date, for example the distinct brands in a library:

```yaml
type: entities
title: New tea
entities:
  - type: custom:autocomplete-text-row
    entity: input_text.tea_brand
    name: Brand
    icon: mdi:label
    options_entity: sensor.tea_library
    options_attribute: brands
    placeholder: Pick or type a brand…
```

```yaml
# The matching attribute on a template sensor
attributes:
  brands: "{{ teas | map(attribute='brand') | unique | sort | list }}"
```

The options of an `input_select` or `select` entity can also be used as suggestions, since `options_attribute` defaults to `options`:

```yaml
- type: custom:autocomplete-text-row
  entity: input_text.room_note
  options_entity: input_select.rooms
```

---

## Options

| Name                | Type   | Required     | Description                                                | Default              |
| ------------------- | ------ | ------------ | ---------------------------------------------------------- | -------------------- |
| `type`              | string | **Required** | `custom:autocomplete-text-row`                             |                      |
| `entity`            | string | **Required** | An `input_text.*` or `text.*` entity ID                    |                      |
| `name`              | string | **Optional** | Label shown above the field                                | Entity friendly name |
| `icon`              | string | **Optional** | MDI icon (e.g. `mdi:tea`)                                  | Entity icon          |
| `options`           | list   | **Optional** | Fixed suggestions, listed before any from `options_entity` |                      |
| `options_entity`    | string | **Optional** | Entity whose attribute supplies suggestions, read live     |                      |
| `options_attribute` | string | **Optional** | Attribute of `options_entity` that holds the list          | `options`            |
| `placeholder`       | string | **Optional** | Hint text shown in an empty field                          | `Type or pick…`      |

Suggestions are trimmed; blank entries and exact duplicates are dropped. Values that are not strings are converted to text.

---

## Behaviour

- Focusing the field selects its text and lists every suggestion, with the current value ticked. Typing replaces the text and filters the list.
- The highlighted item is what Enter saves. While typing, that is the best match; the "Use “…”" item comes last, so reach it with ↑ or a tap. If no suggestion matches, it is the only item.
- Enter on a field you have not typed in saves nothing.
- Leaving the field (tapping elsewhere, Tab) saves the typed text as it is. Esc discards it and restores the saved value.
- Text that differs from a suggestion only in case or accents is saved in the suggestion's spelling. Surrounding spaces are trimmed.
- The clear button (×) saves an empty value. It is hidden when the entity's `min` length is above zero.
- If Home Assistant rejects a value (too long, or not matching the entity's pattern), the field goes back to the saved value and the error is logged to the browser console.
- The list opens inline and pushes the rows below it down, rather than floating above them. This avoids clipping inside cards and dialogs that hide overflow.
- If the entity is `unavailable`, the row is disabled. If the entity does not exist, the row displays an error label.

### Theming

The row reads these standard theme variables:

| Variable                        | Used for                                  |
| ------------------------------- | ----------------------------------------- |
| `--primary-color`               | Focus underline, label, highlights, tick  |
| `--primary-text-color`          | Field and option text                     |
| `--secondary-text-color`        | Label, placeholder, buttons               |
| `--ha-color-form-background`    | Field background                          |
| `--ha-color-form-background-hover` | Field background on hover              |
| `--ha-color-border-neutral-loud` | Field underline                          |
| `--input-fill-color`            | Field background on older frontends       |
| `--input-idle-line-color`       | Field underline on older frontends        |
| `--secondary-background-color`  | Last-resort field background, button hover |
| `--card-background-color`       | List background                           |
| `--divider-color`               | List border                               |
| `--state-icon-color`            | Row icon                                  |
| `--error-color`                 | Missing-entity label                      |

---

## Developer Guide

### Prerequisites

| Tool    | Minimum version | Notes                         |
| ------- | --------------- | ----------------------------- |
| Node.js | 20              | Tests only; nothing is built  |

The file in the repository root is the file that ships. There are no dependencies to install.

### Available scripts

| Command         | Description                                              |
| --------------- | -------------------------------------------------------- |
| `npm run check` | Syntax-check `autocomplete-text-row.js`                  |
| `npm test`      | Run the unit tests for matching and suggestions          |

### Project structure

```
autocomplete-text-row.js   # The row element and its pure matching helpers
test/                      # node:test unit tests
demo/index.html            # Standalone demo with a stub hass object
assets/                    # README images
```

### Demo

`demo/index.html` renders the row with a stub `hass` object and Home Assistant's default dark theme values. Serve the repository root over HTTP and open `/demo/index.html`; append `?state=open` to render the list open, as in the screenshot.

```bash
python -m http.server 8765
# http://127.0.0.1:8765/demo/index.html?state=open
```

### Releasing

1. Update `VERSION` in `autocomplete-text-row.js` and `version` in `package.json`.
2. Add a section for the version to `CHANGELOG.md`.
3. Push a tag `v<version>`.

The release workflow validates the tag, checks that the three versions agree, runs the tests, and publishes a GitHub release with `autocomplete-text-row.js` attached.

### Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

---

## Troubleshooting

**Row shows as a red error card, or `Custom element doesn't exist: autocomplete-text-row`**
The resource is not loaded. Check that it is listed under dashboard resources as a JavaScript module, then clear the browser cache or hard-reload (`Ctrl+Shift+R` / `Cmd+Shift+R`).

**An older version is still shown after updating**
The browser is using a cached copy. For manual installs, change the `?v=` value on the resource. For HACS installs, reload the browser after the download completes.

**`entity must be an input_text or text`**
The row only supports those two domains. For `input_select` / `select`, use [Searchable Select Row][select-row].

**No suggestions appear**
Check that `options_entity` exists and that `options_attribute` names an attribute holding a list (**Developer tools → States**). A comma-separated string is not split into suggestions.

**General dashboard plugin troubleshooting**
See the [thomasloven wiki][troubleshooting].

---

## Support

Bug reports and feature requests are handled through [GitHub issues][issues].

If this project is useful to you, you can support its development:

<a href="https://buymeacoffee.com/otixa"><img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me a Coffee" width="180"></a>

---

## License

Released under the [MIT License](LICENSE).

<!-- References -->

[screenshot]: https://raw.githubusercontent.com/Otixa/autocomplete-text-row/main/assets/screenshot.png
[releases-shield]: https://img.shields.io/github/release/Otixa/autocomplete-text-row.svg?style=for-the-badge
[releases]: https://github.com/Otixa/autocomplete-text-row/releases
[license-shield]: https://img.shields.io/github/license/Otixa/autocomplete-text-row.svg?style=for-the-badge
[hacs-shield]: https://img.shields.io/badge/HACS-Custom-orange.svg?style=for-the-badge
[hacs]: https://hacs.xyz
[validate-shield]: https://img.shields.io/github/actions/workflow/status/Otixa/autocomplete-text-row/validate.yml?branch=main&style=for-the-badge&label=validate
[validate]: https://github.com/Otixa/autocomplete-text-row/actions/workflows/validate.yml
[bmac-shield]: https://img.shields.io/badge/buy%20me%20a%20coffee-support-ffdd00.svg?style=for-the-badge&logo=buymeacoffee&logoColor=black
[bmac]: https://buymeacoffee.com/otixa
[issues]: https://github.com/Otixa/autocomplete-text-row/issues
[select-row]: https://github.com/Otixa/searchable-select-row
[troubleshooting]: https://github.com/thomasloven/hass-config/wiki/Lovelace-Plugins
