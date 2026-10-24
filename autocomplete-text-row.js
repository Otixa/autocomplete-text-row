// autocomplete-text-row: a Home Assistant entities-card row for input_text and
// text entities that suggests values as you type, but still accepts anything.
// Suggestions are read live from an entity attribute and/or a fixed list.
//
//   type: entities
//   entities:
//     - type: custom:autocomplete-text-row
//       entity: input_text.tea_brand
//       options_entity: sensor.tea_library
//       options_attribute: brands
//
// https://github.com/Otixa/autocomplete-text-row

export const VERSION = "1.0.2";

// Lower-cased with diacritics removed, so "creme" finds "Crème".
export const normalise = (s) =>
  String(s).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Every whitespace-separated word of the query must appear somewhere in the
// option, in any order. Results keep the options' own order within three ranks:
// the whole query is a prefix, the first word starts a word, anything else.
// Returns [{ option, ranges }] where ranges are [start, end) of each word's
// first match, in normalised-string coordinates.
export function matchOptions(options, query) {
  const q = normalise(query || "").trim();
  if (!q) return options.map((option) => ({ option, ranges: [] }));

  const tokens = q.split(/\s+/);
  const wordStart = new RegExp(`(^|\\s)${escapeRegExp(tokens[0])}`);
  const out = [];
  for (const option of options) {
    const n = normalise(option);
    const ranges = [];
    for (const t of tokens) {
      const at = n.indexOf(t);
      if (at < 0) break;
      ranges.push([at, at + t.length]);
    }
    if (ranges.length !== tokens.length) continue;
    const rank = n.startsWith(q) ? 0 : wordStart.test(n) ? 1 : 2;
    out.push({ option, ranges, rank });
  }
  return out
    .sort((a, b) => a.rank - b.rank) // Array.prototype.sort is stable
    .map(({ option, ranges }) => ({ option, ranges }));
}

export function mergeRanges(ranges) {
  return [...ranges]
    .sort((a, b) => a[0] - b[0])
    .reduce((acc, r) => {
      const last = acc[acc.length - 1];
      if (last && r[0] <= last[1]) last[1] = Math.max(last[1], r[1]);
      else acc.push([...r]);
      return acc;
    }, []);
}

// Splits an option into [{ text, match }] runs for highlighting. Normalising can
// change a string's length for some scripts; in that case the ranges no longer
// line up with the original, so nothing is highlighted rather than the wrong
// characters.
export function highlightParts(option, ranges) {
  if (!ranges.length || normalise(option).length !== option.length) {
    return [{ text: option, match: false }];
  }
  const parts = [];
  let pos = 0;
  for (const [s, e] of mergeRanges(ranges)) {
    if (s > pos) parts.push({ text: option.slice(pos, s), match: false });
    parts.push({ text: option.slice(s, e), match: true });
    pos = e;
  }
  if (pos < option.length) parts.push({ text: option.slice(pos), match: false });
  return parts;
}

// The suggestion list: the fixed `options` first, then the attribute's values.
// Non-string values are stringified, blanks dropped, exact duplicates removed.
export function collectOptions(fixed, attribute) {
  const seen = new Set();
  const out = [];
  for (const list of [fixed, attribute]) {
    if (!Array.isArray(list)) continue;
    for (const v of list) {
      if (v == null) continue;
      const s = String(v).trim();
      if (!s || seen.has(s)) continue;
      seen.add(s);
      out.push(s);
    }
  }
  return out;
}

// What typed text becomes when committed: trimmed, and if it is a suggestion
// in different case or accents, that suggestion's own spelling.
export function canonical(options, text) {
  const t = String(text ?? "").trim();
  const n = normalise(t);
  return options.find((o) => normalise(o) === n) ?? t;
}

// The list shown under the field: matching suggestions, then a "use what I
// typed" item unless the text already is one of the suggestions. A suggestion
// equal to the typed text (ignoring case and accents) is moved to the top.
// Returns [{ option, ranges }] and optionally a final { custom: text }.
export function listItems(options, query) {
  const items = matchOptions(options, query);
  const typed = String(query ?? "").trim();
  if (!typed) return items;
  const n = normalise(typed);
  const exact = items.findIndex((it) => normalise(it.option) === n);
  if (exact > 0) items.unshift(...items.splice(exact, 1));
  else if (exact < 0) items.push({ custom: typed });
  return items;
}

const STYLE = `
  :host { display: block; padding: 4px 0 12px; }
  .row { display: flex; align-items: flex-start; }
  .row > ha-icon { color: var(--state-icon-color, var(--paper-item-icon-color)); flex: none;
                   width: 40px; height: 56px; display: flex; align-items: center;
                   justify-content: center; --mdc-icon-size: 20px; }
  .field ha-icon { --mdc-icon-size: 20px; }
  .main { flex: 1; min-width: 0; }
  .field { position: relative; display: flex; align-items: center; box-sizing: border-box;
           height: 56px; padding: 0 4px 0 16px; border-radius: 4px 4px 0 0; cursor: text;
           background: var(--ha-color-form-background, var(--mdc-text-field-fill-color,
                       var(--input-fill-color, var(--secondary-background-color)))); }
  .field:hover { background: var(--ha-color-form-background-hover, var(--ha-color-form-background,
                             var(--mdc-text-field-fill-color, var(--input-fill-color,
                             var(--secondary-background-color))))); }
  .field::after { content: ""; position: absolute; left: 0; right: 0; bottom: 0; height: 1px;
                  pointer-events: none;
                  background: var(--ha-color-border-neutral-loud, var(--input-idle-line-color,
                              var(--secondary-text-color))); }
  .field.focused::after { height: 2px; background: var(--primary-color); }
  .field.disabled { opacity: 0.5; cursor: default; }
  .text { flex: 1; min-width: 0; }
  label { display: block; font-size: var(--ha-font-size-xs, 10px); line-height: 12px;
          color: var(--secondary-text-color); }
  .field.focused label { color: var(--primary-color); }
  input { all: unset; display: block; width: 100%; font: inherit;
          font-size: var(--ha-font-size-m, 14px); line-height: 20px;
          color: var(--primary-text-color); }
  input::placeholder { color: var(--secondary-text-color); opacity: 0.7; }
  button { all: unset; cursor: pointer; display: flex; padding: 8px; border-radius: 50%;
           color: var(--secondary-text-color); }
  button:hover { background: var(--secondary-background-color); }
  button[hidden] { display: none; }
  ul { list-style: none; margin: 4px 0 0; padding: 4px 0; max-height: 240px; overflow-y: auto;
       background: var(--card-background-color, var(--ha-card-background));
       border: 1px solid var(--divider-color); border-radius: 8px;
       box-shadow: 0 4px 12px rgba(0,0,0,.25); }
  ul[hidden] { display: none; }
  li { padding: 10px 12px; cursor: pointer; display: flex; align-items: center; gap: 8px;
       color: var(--primary-text-color); }
  li.active { background: color-mix(in srgb, var(--primary-color) 18%, transparent); }
  li .name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  li b { color: var(--primary-color); font-weight: 650; }
  li ha-icon { color: var(--primary-color); --mdc-icon-size: 18px; }
  li.custom { color: var(--secondary-text-color); }
  li.custom + li, li + li.custom { border-top: 1px solid var(--divider-color); }
  li.custom q { color: var(--primary-text-color); }
  .missing .field { display: none; }
  .missing label { color: var(--error-color); }
`;

const TEMPLATE = `
  <style>${STYLE}</style>
  <div class="row">
    <ha-icon></ha-icon>
    <div class="main">
      <div class="field">
        <div class="text">
          <label></label>
          <input type="text" autocomplete="off" autocorrect="off" autocapitalize="off"
                 spellcheck="false" role="combobox" aria-autocomplete="list" aria-expanded="false">
        </div>
        <button class="clear" title="Clear" aria-label="Clear"><ha-icon icon="mdi:close"></ha-icon></button>
      </div>
      <ul role="listbox" hidden></ul>
    </div>
  </div>`;

// Lets the pure helpers above be imported outside a browser (tests).
const Base = globalThis.HTMLElement ?? class {};

export class AutocompleteTextRow extends Base {
  setConfig(config) {
    if (!config || !config.entity) throw new Error("entity is required");
    const domain = config.entity.split(".")[0];
    if (domain !== "input_text" && domain !== "text") {
      throw new Error("entity must be an input_text or text");
    }
    if (config.options != null && !Array.isArray(config.options)) {
      throw new Error("options must be a list");
    }
    this._config = {
      placeholder: "Type or pick…",
      options_attribute: "options",
      ...config,
    };
    this._domain = domain;
    this._built = false;
  }

  set hass(hass) {
    this._hass = hass;
    const stateObj = hass.states[this._config.entity];
    if (!this._built) this._build();
    if (!stateObj) {
      this._root.classList.add("missing");
      this._label.textContent = `Entity not available: ${this._config.entity}`;
      return;
    }
    this._root.classList.remove("missing");

    const source = this._config.options_entity && hass.states[this._config.options_entity];
    const options = collectOptions(
      this._config.options,
      source?.attributes[this._config.options_attribute],
    );
    const optionsChanged =
      !this._options ||
      options.length !== this._options.length ||
      options.some((o, i) => o !== this._options[i]);
    const valueChanged = stateObj.state !== this._value;
    this._options = options;
    this._value = stateObj.state;
    this._min = Number(stateObj.attributes.min ?? 0);

    const unavailable = stateObj.state === "unavailable";
    this._input.disabled = unavailable;
    this._field.classList.toggle("disabled", unavailable);
    const max = Number(stateObj.attributes.max);
    if (max > 0) this._input.maxLength = max;
    else this._input.removeAttribute("maxlength");
    this._label.textContent =
      this._config.name ?? stateObj.attributes.friendly_name ?? this._config.entity;
    this._icon.icon = this._config.icon || stateObj.attributes.icon || "mdi:form-textbox";
    this._updateClear();

    if (!this._focused && valueChanged) this._showValue();
    if (this._open && optionsChanged) this._renderList();
  }

  _hasValue() {
    return !!this._value && this._value !== "unknown" && this._value !== "unavailable";
  }

  _build() {
    const shadow = this.shadowRoot || this.attachShadow({ mode: "open" });
    shadow.innerHTML = TEMPLATE;
    this._root = shadow.querySelector(".row");
    this._icon = shadow.querySelector(".row > ha-icon");
    this._field = shadow.querySelector(".field");
    this._label = shadow.querySelector("label");
    this._input = shadow.querySelector("input");
    this._clear = shadow.querySelector(".clear");
    this._list = shadow.querySelector("ul");
    this._input.placeholder = this._config.placeholder;

    // Keep focus in the input while tapping the list or the clear button, so blur
    // does not close the list before the click lands. mousedown (not pointerdown)
    // so that scrolling the list by touch is left alone.
    for (const el of [this._list, this._clear]) {
      el.addEventListener("mousedown", (e) => e.preventDefault());
    }
    this._field.addEventListener("click", (e) => {
      if (!this._clear.contains(e.target)) this._input.focus();
    });
    this._input.addEventListener("focus", () => this._onFocus());
    this._input.addEventListener("blur", () => this._onBlur());
    this._input.addEventListener("input", () => {
      this._query = this._input.value;
      this._dirty = true;
      this._renderList(true);
    });
    this._input.addEventListener("keydown", (e) => this._onKey(e));
    this._clear.addEventListener("click", (e) => {
      e.stopPropagation();
      this._commit("");
    });
    this._list.addEventListener("click", (e) => {
      const li = e.target.closest("li[data-value]");
      if (li) this._commit(li.dataset.value);
    });
    this._built = true;
  }

  // Clearing sets an empty value, so only offer it when the entity allows one.
  _updateClear() {
    this._clear.hidden = !this._hasValue() || this._min > 0;
  }

  _showValue() {
    this._input.value = this._hasValue() ? this._value : "";
  }

  _onFocus() {
    this._focused = true;
    this._dirty = false;
    this._field.classList.add("focused");
    this._query = "";
    this._input.select();
    this._renderList(true);
  }

  // Leaving the field keeps what was typed, like a plain text field would.
  _onBlur() {
    const typed = this._dirty ? this._input.value : null;
    this._focused = false;
    this._dirty = false;
    this._field.classList.remove("focused");
    this._setOpen(false);
    if (typed != null) this._commit(typed);
    else this._showValue();
  }

  // Blur doesn't fire when the window is in the background (or the input never
  // had focus), so finish the job by hand if it didn't.
  _close() {
    this._input.blur();
    if (this._focused || this._open) this._onBlur();
  }

  _setOpen(open) {
    this._open = open;
    this._list.hidden = !open;
    this._input.setAttribute("aria-expanded", String(open));
  }

  _renderList(resetActive = false) {
    const items = listItems(this._options || [], this._query);
    this._shown = items.map((it) => it.custom ?? it.option);
    // With nothing typed, start on the current value, or on nothing if it is not
    // a suggestion, so Enter on an untouched field never changes it.
    if (resetActive || this._active == null || this._active >= this._shown.length) {
      this._active = this._query ? 0 : this._shown.indexOf(this._value);
    }
    this._list.replaceChildren();
    // Nothing to suggest: no list at all, rather than an empty box.
    this._setOpen(this._focused && items.length > 0);
    items.forEach((it, i) => {
      const li = document.createElement("li");
      li.dataset.value = it.custom ?? it.option;
      li.setAttribute("role", "option");
      if (i === this._active) li.classList.add("active");
      const name = document.createElement("span");
      name.className = "name";
      if (it.custom != null) {
        li.classList.add("custom");
        const plus = document.createElement("ha-icon");
        plus.icon = "mdi:plus";
        const q = document.createElement("q");
        q.textContent = it.custom;
        name.append("Use ", q);
        li.append(plus, name);
      } else {
        for (const { text, match } of highlightParts(it.option, it.ranges)) {
          if (!match) { name.append(text); continue; }
          const b = document.createElement("b");
          b.textContent = text;
          name.append(b);
        }
        li.append(name);
        if (it.option === this._value) {
          const check = document.createElement("ha-icon");
          check.icon = "mdi:check";
          li.append(check);
        }
      }
      this._list.append(li);
    });
    this._scrollActive();
  }

  _scrollActive() {
    const el = this._list.children[this._active];
    if (el) el.scrollIntoView({ block: "nearest" });
  }

  _moveActive(delta) {
    if (!this._shown || !this._shown.length) return;
    const items = this._list.children;
    items[this._active]?.classList.remove("active");
    const n = this._shown.length;
    this._active = this._active < 0 && delta < 0 ? n - 1 : (this._active + delta + n) % n;
    items[this._active]?.classList.add("active");
    this._scrollActive();
  }

  _onKey(e) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (this._open) this._moveActive(1);
      else this._renderList(true);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      this._moveActive(-1);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const pick = this._open && this._shown && this._active >= 0 ? this._shown[this._active] : null;
      this._commit(pick ?? this._input.value);
    } else if (e.key === "Escape" && this._focused) {
      // Throw away the typing, close the list, and keep the dialog around it open.
      e.preventDefault();
      e.stopPropagation();
      this._dirty = false;
      this._close();
    }
  }

  _commit(text) {
    const value = canonical(this._options || [], text);
    this._dirty = false;
    if (value !== this._value) {
      const previous = this._value;
      this._value = value; // optimistic, so the field doesn't flicker back
      Promise.resolve(
        this._hass.callService(this._domain, "set_value", {
          entity_id: this._config.entity,
          value,
        }),
      ).catch((err) => {
        // Rejected (too long, pattern mismatch…): show what the entity really holds.
        console.warn("autocomplete-text-row:", err?.message ?? err);
        this._value = previous;
        if (!this._focused) this._showValue();
        this._updateClear();
      });
    }
    this._close();
    this._showValue();
    this._updateClear();
  }
}

if (globalThis.customElements && !customElements.get("autocomplete-text-row")) {
  customElements.define("autocomplete-text-row", AutocompleteTextRow);
  console.info(
    `%c autocomplete-text-row %c ${VERSION} `,
    "background:#e3a857;color:#15121a;font-weight:600",
    "",
  );
}
