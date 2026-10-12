// رقم واتساب بالصيغة الدولية بدون + (غيّره هنا فقط)
const WA_NUMBER = '200000000000';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));

// السعر بعد الخصم
const finalPrice = p =>
  Math.max(0, Math.round((Number(p.price) || 0) * (1 - (Number(p.discount) || 0) / 100)));

const bottleSVG = (liquid, dark, id) => `
<svg viewBox="0 -30 120 210" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <defs>
    <clipPath id="clip-${id}"><rect x="20" y="46" width="80" height="120" rx="8"/></clipPath>
  </defs>

  <!-- رذاذ العطر -->
  <circle class="mist" cx="60" cy="2" r="5" fill="${liquid}" style="--dx:-14px;animation-delay:0s"/>
  <circle class="mist" cx="60" cy="2" r="4" fill="${liquid}" style="--dx:10px;animation-delay:.9s"/>
  <circle class="mist" cx="60" cy="2" r="6" fill="${liquid}" style="--dx:-2px;animation-delay:1.8s"/>

  <rect x="46" y="8" width="28" height="22" rx="4" fill="${dark ? '#c7c7c7' : '#202020'}"/>
  <rect x="52" y="30" width="16" height="10" fill="${dark ? '#bdbdbd' : '#555555'}"/>
  <rect x="14" y="40" width="92" height="132" rx="12" fill="rgba(255,255,255,${dark ? '.14' : '.55'})" stroke="${dark ? '#c7c7c7' : '#333333'}" stroke-width="1.5"/>

  <!-- السائل المتموّج -->
  <g clip-path="url(#clip-${id})">
    <path class="wave wave--back" d="M20 88 q20 -8 40 0 t40 0 t40 0 t40 0 t40 0 V170 H20 Z" fill="${liquid}" opacity=".45"/>
    <path class="wave" d="M20 92 q20 -8 40 0 t40 0 t40 0 t40 0 t40 0 V170 H20 Z" fill="${liquid}" opacity=".9"/>
  </g>

  <rect x="38" y="104" width="44" height="30" rx="4" fill="rgba(255,255,255,.85)"/>
  <rect x="44" y="114" width="32" height="3" fill="#333"/>
  <rect x="48" y="122" width="24" height="3" fill="#838383"/>
  <rect class="shine" x="22" y="48" width="6" height="110" rx="3" fill="#fff" opacity=".35"/>
</svg>`;

const isDark = hex => {
  const n = parseInt(String(hex || '#ffffff').slice(1), 16);
  const r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  return (r * 299 + g * 587 + b * 114) / 1000 < 90;
};

// بطاقة المنتج — تُستخدم في صفحة الزبائن ومعاينة صفحة التحكم
function cardHTML(p, i) {
  const discount = Number(p.discount) || 0;
  const sale = discount > 0;
  const src = p._preview || p.image;

  const visual = src
    ? `<div class="photo"><img src="${esc(src)}" alt="${esc(p.name)}" /></div>
       <div class="puffs" aria-hidden="true">
         <span class="puff" style="--dx:-18px;animation-delay:0s"></span>
         <span class="puff" style="--dx:14px;animation-delay:.9s"></span>
         <span class="puff" style="--dx:-2px;animation-delay:1.8s"></span>
       </div>`
    : bottleSVG(p.liquid || '#9b8bd6', isDark(p.bg), i);

  const meta = [p.note, p.ml ? `${p.ml} مل` : ''].filter(Boolean).join(' · ');
  const msg = `مرحباً، أريد طلب عطر: ${p.name} (${p.ml} مل)`;

  return `
    <article class="item">
      <div class="card" style="background:${esc(p.bg || '#ffffff')}">
        ${p.badge ? `<span class="badge ${i % 2 ? 'badge--alt' : ''}">${esc(p.badge)}</span>` : ''}
        ${sale ? `<span class="badge badge--sale">خصم ${discount}%</span>` : ''}
        ${visual}
      </div>
      <div class="item__row">
        <div>
          <div class="item__name">${esc(p.name) || 'بدون اسم'}</div>
          <div class="item__meta">${esc(meta)}</div>
        </div>
        <div class="item__prices">
          <div class="item__price">${finalPrice(p)} ج.م</div>
          ${sale ? `<div class="item__old">${Number(p.price) || 0} ج.م</div>` : ''}
        </div>
      </div>
      <a class="btn btn--ghost" target="_blank" rel="noopener"
         href="https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(msg)}">اطلب عبر واتساب</a>
    </article>`;
}