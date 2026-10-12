(function () {
const ADMIN_PASSWORD = 'admin123'; // ⚠️ غيّر كلمة المرور هنا
const PRODUCTS_STORAGE_KEY = 'sultan-products';

// ========== تسجيل الدخول ==========
const loginForm = document.getElementById('loginForm');
const loginScreen = document.getElementById('loginScreen');
const adminScreen = document.getElementById('adminScreen');
const logoutBtn = document.getElementById('logoutBtn');
const passwordInput = document.getElementById('passwordInput');

function checkLogin() {
  const isLoggedIn = sessionStorage.getItem('adminLoggedIn') === 'true';
  if (isLoggedIn) {
    showAdminPanel();
    loadProducts();
  }
  else showLoginPanel();
}

function showLoginPanel() {
  loginScreen.style.display = 'block';
  adminScreen.classList.add('admin-hidden');
  passwordInput.focus();
}

function showAdminPanel() {
  loginScreen.style.display = 'none';
  adminScreen.classList.remove('admin-hidden');
}

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const pwd = passwordInput.value;
  if (pwd === ADMIN_PASSWORD) {
    sessionStorage.setItem('adminLoggedIn', 'true');
    passwordInput.value = '';
    showAdminPanel();
    await loadProducts();
  } else {
    alert('كلمة المرور غير صحيحة');
    passwordInput.value = '';
  }
});

logoutBtn.addEventListener('click', () => {
  if (dirty && !confirm('توجد تغييرات غير محفوظة. هل تريد تسجيل الخروج دون حفظها؟')) return;
  sessionStorage.removeItem('adminLoggedIn');
  showLoginPanel();
});

// ========== إدارة البيانات ==========
const BADGES = ['', 'جديد', 'الأكثر مبيعاً', 'محدود'];
const CATS = ['رجالي', 'نسائي', 'للجنسين', 'عود'];

let products = [];
let dirty = false;

const rowsEl = document.getElementById('rows');
const previewEl = document.getElementById('preview');
const statusEl = document.getElementById('status');

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));

const finalPrice = p =>
  Math.max(0, Math.round((Number(p.price) || 0) * (1 - (Number(p.discount) || 0) / 100)));

// ========== تحميل المنتجات ==========
async function loadProducts() {
  try {
    statusEl.textContent = 'جاري التحميل...';

    const saved = localStorage.getItem(PRODUCTS_STORAGE_KEY);
    let data;
    if (saved !== null) {
      data = JSON.parse(saved);
    } else {
      const response = await fetch('data/products.json');
      if (!response.ok) throw new Error('تعذّر تحميل ملف المنتجات');
      data = await response.json();
    }
    if (!data || !Array.isArray(data.products)) {
      throw new Error('صيغة بيانات المنتجات غير صالحة');
    }
    products = JSON.parse(JSON.stringify(data.products));
    dirty = false;
    statusEl.textContent = saved === null
      ? '✅ تم تحميل المنتجات الافتراضية'
      : '✅ تم تحميل المنتجات المحفوظة على هذا الجهاز';
    
    renderRows();
    renderPreview();
  } catch (err) {
    statusEl.textContent = '❌ خطأ: ' + err.message;
    console.error(err);
  }
}

function markDirty() {
  dirty = true;
  statusEl.textContent = '⚠️ توجد تغييرات غير محفوظة';
}

window.addEventListener('beforeunload', e => {
  if (!dirty) return;
  e.preventDefault();
  e.returnValue = '';
});

function renderPreview() {
  previewEl.innerHTML = products.length
    ? products.map((p, i) => cardHTML(p, i)).join('')
    : '<p class="empty">لا توجد منتجات بعد.</p>';
}

const field = (label, input) => `<label class="f"><span>${label}</span>${input}</label>`;

function renderRows() {
  rowsEl.innerHTML = products.map((p, i) => {
    const hasImage = !!(p._preview || p.image);
    return `
    <div class="row" data-i="${i}">
      <div class="row__head">
        <strong class="row__title">${esc(p.name) || 'منتج جديد'}</strong>
        <button class="btn btn--ghost btn--sm" type="button" data-act="del">حذف</button>
      </div>
      <div class="fields">
        ${field('اسم العطر', `<input data-k="name" value="${esc(p.name)}" />`)}
        ${field('الوصف (مثل: منعش)', `<input data-k="note" value="${esc(p.note)}" />`)}
        ${field('الحجم (مل)', `<input type="number" min="1" data-k="ml" data-n value="${Number(p.ml) || ''}" />`)}
        ${field('السعر (ج.م)', `<input type="number" min="0" data-k="price" data-n value="${Number(p.price) || 0}" />`)}
        ${field('الخصم (%)', `<input type="number" min="0" max="100" data-k="discount" data-n value="${Number(p.discount) || 0}" />`)}
        ${field('الشارة', `<select data-k="badge">${BADGES.map(b =>
          `<option value="${esc(b)}" ${b === (p.badge || '') ? 'selected' : ''}>${b || 'بدون شارة'}</option>`).join('')}</select>`)}
        ${field('لون الخلفية', `<input type="color" data-k="bg" value="${esc(p.bg || '#ffffff')}" />`)}
        ${hasImage ? '' : field('لون السائل', `<input type="color" data-k="liquid" value="${esc(p.liquid || '#9b8bd6')}" />`)}
        ${field(hasImage ? 'تغيير الصورة' : 'رفع صورة', `<input type="file" accept="image/*" data-img />`)}
      </div>
      <div class="cats">
        ${CATS.map(c => `<label class="chip"><input type="checkbox" data-cat="${c}" ${(p.cats || []).includes(c) ? 'checked' : ''} /> ${c}</label>`).join('')}
      </div>
    </div>`;
  }).join('');
}

// ========== تعديل الحقول ==========
rowsEl.addEventListener('input', e => {
  const el = e.target;
  if (!el.dataset.k) return;
  const row = el.closest('.row');
  const p = products[row.dataset.i];
  p[el.dataset.k] = 'n' in el.dataset ? (Number(el.value) || 0) : el.value;
  if (el.dataset.k === 'name') row.querySelector('.row__title').textContent = el.value || 'منتج جديد';
  markDirty();
  renderPreview();
});

rowsEl.addEventListener('change', async e => {
  const el = e.target;
  const row = el.closest('.row');
  if (!row) return;
  const p = products[row.dataset.i];

  if (el.dataset.cat) {
    p.cats = p.cats || [];
    const on = el.checked;
    p.cats = on ? [...new Set([...p.cats, el.dataset.cat])] : p.cats.filter(c => c !== el.dataset.cat);
    markDirty();
    renderPreview();
  }

  if ('img' in el.dataset && el.files[0]) {
    try {
      await processImage(el.files[0], p);
      renderRows();
      renderPreview();
      markDirty();
    } catch (err) {
      statusEl.textContent = `❌ تعذّرت معالجة الصورة: ${err.message}`;
      console.error(err);
    }
  }
});

rowsEl.addEventListener('click', e => {
  const btn = e.target.closest('[data-act="del"]');
  if (!btn) return;
  const i = btn.closest('.row').dataset.i;
  if (!confirm('هل تريد حذف هذا المنتج؟')) return;
  products.splice(i, 1);
  renderRows();
  renderPreview();
  markDirty();
});

// ========== معالجة الصورة ==========
async function processImage(file, p) {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, 900 / bmp.width);
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * scale);
  c.height = Math.round(bmp.height * scale);
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);

  const toBlob = (type, q) => new Promise(r => c.toBlob(r, type, q));
  let blob = await toBlob('image/webp', 0.85);
  if (!blob || blob.type !== 'image/webp') blob = await toBlob('image/png');
  if (!blob) throw new Error('تعذّر تحويل الصورة إلى صيغة مدعومة');

  if (p._preview) URL.revokeObjectURL(p._preview);
  p._blob = blob;
  p._preview = URL.createObjectURL(blob);
  p.image = await blobToDataURL(blob);
}

// ========== إضافة منتج ==========
document.getElementById('addBtn').addEventListener('click', () => {
  products.unshift({
    id: 'p' + Date.now().toString(36),
    name: '', note: '', ml: 100, price: 0, discount: 0,
    cats: [], badge: '', image: null, bg: '#ece8f7', liquid: '#9b8bd6'
  });
  renderRows();
  renderPreview();
  markDirty();
});

function blobToDataURL(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener('load', () => resolve(reader.result));
    reader.addEventListener('error', () => reject(reader.error || new Error('تعذّرت قراءة الصورة')));
    reader.readAsDataURL(blob);
  });
}

async function getExportData() {
  const exportedProducts = await Promise.all(products.map(async product => {
    const exported = { ...product };
    delete exported._preview;
    delete exported._blob;
    return exported;
  }));
  return { products: exportedProducts };
}

function storageErrorMessage(err) {
  if (err && (err.name === 'QuotaExceededError' || err.name === 'NS_ERROR_DOM_QUOTA_REACHED')) {
    return 'امتلأت مساحة التخزين المحلية. قلّل حجم الصور أو صدّر نسخة احتياطية واحذف بعض المنتجات ثم أعد المحاولة.';
  }
  return err && err.message ? err.message : 'حدث خطأ غير معروف';
}

document.getElementById('saveBtn').addEventListener('click', async () => {
  const saveBtn = document.getElementById('saveBtn');
  saveBtn.disabled = true;
  statusEl.textContent = 'جاري الحفظ على هذا الجهاز...';
  try {
    const data = await getExportData();
    localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(data));
    dirty = false;
    statusEl.textContent = '✅ تم الحفظ على هذا الجهاز فقط';
  } catch (err) {
    statusEl.textContent = '❌ تعذّر الحفظ: ' + storageErrorMessage(err);
    console.error(err);
  } finally {
    saveBtn.disabled = false;
  }
});

document.getElementById('exportBtn').addEventListener('click', async () => {
  try {
    const data = await getExportData();
    const file = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(file);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'sultan-products-backup.json';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    statusEl.textContent = '✅ تم تنزيل النسخة الاحتياطية مع الصور';
  } catch (err) {
    statusEl.textContent = '❌ تعذّر التصدير: ' + storageErrorMessage(err);
    console.error(err);
  }
});

const importFile = document.getElementById('importFile');
document.getElementById('importBtn').addEventListener('click', () => importFile.click());

importFile.addEventListener('change', async () => {
  const file = importFile.files[0];
  importFile.value = '';
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    if (!data || !Array.isArray(data.products) ||
        !data.products.every(p => p && typeof p === 'object' && !Array.isArray(p))) {
      throw new Error('ملف النسخة الاحتياطية لا يحتوي على قائمة منتجات صالحة');
    }
    if (!confirm(`سيتم استبدال المنتجات الحالية بـ ${data.products.length} منتج. هل تريد المتابعة؟`)) return;
    products = data.products.map(p => ({ ...p, _preview: null, _blob: null }));
    renderRows();
    renderPreview();
    markDirty();
    statusEl.textContent = 'تم استيراد النسخة؛ اضغط «حفظ التغييرات» لتخزينها على هذا الجهاز';
  } catch (err) {
    statusEl.textContent = '❌ تعذّر استيراد النسخة: ' + storageErrorMessage(err);
    console.error(err);
  }
});

checkLogin();
})();
