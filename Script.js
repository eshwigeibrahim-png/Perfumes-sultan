const grid = document.getElementById('grid');
const PRODUCTS_STORAGE_KEY = 'sultan-products';

let products = PRODUCTS;
let activeFilter = 'all';
try {
  const saved = localStorage.getItem(PRODUCTS_STORAGE_KEY);
  if (saved !== null) {
    const data = JSON.parse(saved);
    if (!data || !Array.isArray(data.products)) {
      throw new Error('صيغة بيانات المنتجات المحفوظة غير صالحة');
    }
    products = data.products;
  }
} catch (err) {
  console.error('تعذّر تحميل المنتجات المحفوظة محليًا:', err);
}

function render(filter = 'all') {
  activeFilter = filter;
  let list;
  if (filter === 'all') list = products;
  else if (filter === 'sale') list = products.filter(p => Number(p.discount) > 0);
  else list = products.filter(p => (p.cats || []).includes(filter));

  grid.innerHTML = list.length
    ? list.map((p, i) => cardHTML(p, i)).join('')
    : '<p class="empty">لا توجد منتجات في هذا التصنيف حالياً.</p>';
}

window.addEventListener('storage', e => {
  if (e.key !== PRODUCTS_STORAGE_KEY && e.key !== null) return;
  try {
    if (e.newValue === null) {
      products = PRODUCTS;
    } else {
      const data = JSON.parse(e.newValue);
      if (!data || !Array.isArray(data.products)) {
        throw new Error('صيغة بيانات المنتجات المحفوظة غير صالحة');
      }
      products = data.products;
    }
    render(activeFilter);
  } catch (err) {
    console.error('تعذّر تحديث المنتجات المحفوظة محليًا:', err);
  }
});

document.getElementById('tabs').addEventListener('click', e => {
  const tab = e.target.closest('.tab');
  if (!tab) return;
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('tab--active'));
  tab.classList.add('tab--active');
  render(tab.dataset.filter);
});

// روابط واتساب العامة (الفوتر والفقاعة) من رقم واحد في card.js
document.querySelectorAll('[data-wa]').forEach(a => {
  a.href = `https://wa.me/${WA_NUMBER}`;
});

render();