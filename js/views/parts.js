// Verbaute Teile an einem Serviceheft-Eintrag: Eingabe-Block und Anzeige.
// Felder angelehnt an Teile-Shops (z. B. Artikel-Nr., Vergleichs-/VW-Nr., Hersteller).
import { esc, eurExact } from '../format.js';
import { parseNumber } from '../logic/fuel.js';

const FIELDS = [
  ['name', 'Teil', 'z. B. Faltenbalg Schaltstange hinten', 'full'],
  ['maker', 'Hersteller', 'z. B. JP Group', ''],
  ['oe', 'Vergleichs-Nr. (VW)', 'z. B. 251711167F', ''],
  ['shop', 'Shop', 'z. B. TK-Carparts', ''],
  ['sku', 'Artikel-Nr. im Shop', 'z. B. 21792.2024', ''],
  ['qty', 'Menge', '1', 'num'],
  ['price', 'Preis je Stück €', '0,00', 'num'],
  ['url', 'Link (optional)', 'https://…', 'full'],
  ['note', 'Hinweis (optional)', 'z. B. Nachbau, Gummi etwas weicher', 'full'],
];

function partBlock(p = {}) {
  return `<div class="part-edit" data-part>
    <div class="part-grid">${FIELDS.map(([k, label, ph, cls]) => {
      const val = k === 'price' && p.price != null ? String(p.price).replace('.', ',') : p[k] ?? '';
      const mode = k === 'qty' ? 'numeric' : k === 'price' ? 'decimal' : k === 'url' ? 'url' : 'text';
      return `<label class="pf ${cls}"><span>${label}</span><input name="p-${k}" value="${esc(val)}" placeholder="${esc(ph)}" inputmode="${mode}" autocomplete="off"${k === 'oe' || k === 'sku' ? ' autocapitalize="characters"' : ''}></label>`;
    }).join('')}</div>
    <button type="button" class="danger-link" data-remove-part>Teil entfernen</button>
  </div>`;
}

/** Eingabe-Bereich für Teile. lastParts: Teile vom letzten Mal (zum Übernehmen). */
export function partsEditor(parts = [], lastParts = []) {
  return `<div class="field"><label>Verbaute Teile</label>
    <div id="parts">${parts.map(partBlock).join('')}</div>
    <div class="part-actions">
      <button type="button" class="add" id="add-part">+ Teil</button>
      ${lastParts.length && !parts.length ? `<button type="button" class="add" id="copy-parts">Teile vom letzten Mal (${lastParts.length})</button>` : ''}
    </div></div>`;
}

/** Knöpfe im Teile-Bereich verdrahten. Rückgabe: Funktion, die die eingegebenen Teile liest. */
export function wireParts(form, lastParts = []) {
  const list = form.querySelector('#parts');
  form.querySelector('#add-part').onclick = () => {
    list.insertAdjacentHTML('beforeend', partBlock());
    list.lastElementChild.querySelector('input').focus();
  };
  const copy = form.querySelector('#copy-parts');
  if (copy) copy.onclick = () => {
    list.insertAdjacentHTML('beforeend', lastParts.map(partBlock).join(''));
    copy.remove();
  };
  list.addEventListener('click', (e) => {
    if (e.target.closest('[data-remove-part]')) e.target.closest('[data-part]').remove();
  });
  return () => [...list.querySelectorAll('[data-part]')].map((row) => {
    const v = (k) => row.querySelector(`[name=p-${k}]`).value.trim();
    const qty = v('qty') ? parseNumber(v('qty')) : 1;
    const price = v('price') ? parseNumber(v('price')) : null;
    return {
      name: v('name'), maker: v('maker'), oe: v('oe').toUpperCase(), shop: v('shop'), sku: v('sku'),
      qty: qty > 0 ? qty : 1, price: price >= 0 ? price : null, url: v('url'), note: v('note'),
    };
  }).filter((p) => p.name || p.oe || p.sku);
}

/** Summe der Teilepreise (nur Teile mit Preis). */
export const partsTotal = (parts = []) => parts.reduce((a, p) => a + (p.price != null ? p.price * (p.qty || 1) : 0), 0);

/** Kompakte Anzeige der Teile, z. B. in der Wartungsansicht. */
export function partsList(parts = []) {
  if (!parts.length) return '';
  return `<ul class="parts">${parts.map((p) => {
    const nums = [p.oe ? `VW ${esc(p.oe)}` : '', p.sku ? `${esc(p.shop || 'Shop')} ${esc(p.sku)}` : ''].filter(Boolean).join(' · ');
    const link = /^https?:\/\//.test(p.url || '') ? ` <a href="${esc(p.url)}" target="_blank" rel="noopener">Shop öffnen</a>` : '';
    return `<li><b>${p.qty && p.qty !== 1 ? p.qty + ' × ' : ''}${esc(p.name || p.oe || p.sku)}</b>${p.maker ? ` <span class="faint">(${esc(p.maker)})</span>` : ''}${p.price != null ? ` · ${eurExact(p.price * (p.qty || 1))}` : ''}
      ${nums ? `<br><span class="faint">${nums}</span>` : ''}${p.note ? `<br><span class="faint">${esc(p.note)}</span>` : ''}${link}</li>`;
  }).join('')}</ul>`;
}
