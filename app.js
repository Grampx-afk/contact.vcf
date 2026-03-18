// ─────────────────────────────────────────
// 🔧 REPLACE THESE WITH YOUR SUPABASE CREDENTIALS
const SUPABASE_URL      = 'https://avtcnkrwuldohuaoxjhk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2dGNua3J3dWxkb2h1YW94amhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4Njk0MjYsImV4cCI6MjA4OTQ0NTQyNn0.xTQ0oMdyfxo5PVjcdrN5C_OB8_xC166atv7xF1uH_Uo';
// ─────────────────────────────────────────

const ADMIN_EMAIL   = 'olamhidhe001@gmail.com';
const COOLDOWN_DAYS = 7;
const COOLDOWN_MS   = COOLDOWN_DAYS * 24 * 60 * 60 * 1000;

const { createClient } = supabase;
let sb, currentUser, allContacts = [];

// ── INIT ──
function initSupabase() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    const b = document.getElementById('config-banner');
    if (b) b.style.display = 'block';
    return false;
  }
  sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return true;
}

window.addEventListener('DOMContentLoaded', async () => {
  if (!initSupabase()) return;
  const { data } = await sb.auth.getSession();
  if (data.session) {
    handleUserAccess(data.session.user);
  }
});

// ── HANDLE ACCESS CHECK ──
function handleUserAccess(user) {
  // Admin always gets in
  if (user.email === ADMIN_EMAIL) {
    enterApp(user);
    return;
  }

  const createdAt = new Date(user.created_at).getTime();
  const elapsed   = Date.now() - createdAt;

  if (elapsed > COOLDOWN_MS) {
    // 7 days have passed — access expired
    sb.auth.signOut();
    showExpiredScreen();
    return;
  }

  // Within 7 days — allow in
  enterApp(user);
}

// ── EXPIRED SCREEN ──
function showExpiredScreen() {
  document.getElementById('auth-screen').style.display    = 'none';
  document.getElementById('app-screen').style.display     = 'none';

  let el = document.getElementById('expired-screen');
  if (!el) {
    el = document.createElement('div');
    el.id = 'expired-screen';
    el.style.cssText = 'display:flex;align-items:center;justify-content:center;min-height:100vh;padding:2rem;';
    el.innerHTML = `
      <div class="expired-card">
        <div class="expired-icon">🔒</div>
        <div class="expired-title">Access Expired</div>
        <div class="expired-msg">
          Your 7-day access window has ended.<br>
          Please contact the administrator to regain access.
        </div>
        <button class="btn btn-ghost" style="width:100%" onclick="backToLogin()">← Back to Login</button>
      </div>`;
    document.body.appendChild(el);
  }

  el.style.display = 'flex';
}

function backToLogin() {
  document.getElementById('expired-screen').style.display = 'none';
  document.getElementById('auth-screen').style.display    = 'flex';
}

// ── AUTH TABS ──
function switchTab(tab) {
  document.getElementById('login-form').style.display  = tab === 'login'  ? 'block' : 'none';
  document.getElementById('signup-form').style.display = tab === 'signup' ? 'block' : 'none';
  document.querySelectorAll('.auth-tab').forEach((t, i) => {
    t.classList.toggle('active',
      (i === 0 && tab === 'login') || (i === 1 && tab === 'signup')
    );
  });
  clearAuthMsg();
}

function showAuthMsg(msg, type) {
  const el = document.getElementById('auth-message');
  el.innerHTML  = msg;
  el.className  = 'auth-msg ' + type;
}

function clearAuthMsg() {
  const el = document.getElementById('auth-message');
  el.className = 'auth-msg';
  el.innerHTML = '';
}

// ── SIGN IN ──
async function login() {
  if (!initSupabase()) {
    showAuthMsg('Supabase not configured yet. Add your credentials to app.js.', 'error');
    return;
  }
  const email    = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  if (!email || !password) { showAuthMsg('Please fill in all fields.', 'error'); return; }

  document.getElementById('login-btn-text').innerHTML = '<span class="spinner"></span>';
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  document.getElementById('login-btn-text').textContent = 'Sign In';

  if (error) { showAuthMsg(error.message, 'error'); return; }

  handleUserAccess(data.user);
}

// ── SIGN UP ──
async function signup() {
  if (!initSupabase()) {
    showAuthMsg('Supabase not configured yet.', 'error');
    return;
  }
  const email    = document.getElementById('signup-email').value.trim();
  const password = document.getElementById('signup-password').value;
  if (!email || !password) { showAuthMsg('Please fill in all fields.', 'error'); return; }
  if (password.length < 6)  { showAuthMsg('Password must be at least 6 characters.', 'error'); return; }

  document.getElementById('signup-btn-text').innerHTML = '<span class="spinner"></span>';
  const { data, error } = await sb.auth.signUp({ email, password });
  document.getElementById('signup-btn-text').textContent = 'Create Account';

  if (error) { showAuthMsg(error.message, 'error'); return; }

  if (data.user && !data.session) {
    // Email confirmation flow
    showAuthMsg(
      `✓ Account created! Please confirm your email.<br><br>
       You have <strong>7 days</strong> from today to use the app.`,
      'success'
    );
  } else if (data.session) {
    handleUserAccess(data.user);
  }
}

// ── SIGN OUT ──
async function logout() {
  await sb.auth.signOut();
  currentUser = null;
  allContacts = [];
  document.getElementById('app-screen').style.display  = 'none';
  document.getElementById('auth-screen').style.display = 'flex';
}

// ── ENTER APP ──
function enterApp(user) {
  currentUser = user;
  document.getElementById('auth-screen').style.display = 'none';
  document.getElementById('app-screen').style.display  = 'block';
  document.getElementById('user-email-display').textContent = user.email;

  // Show export button only for admin
  const exportBtn = document.getElementById('export-btn');
  if (exportBtn) {
    exportBtn.style.display = user.email === ADMIN_EMAIL ? 'inline-flex' : 'none';
  }

  // Show days remaining badge for non-admin
  if (user.email !== ADMIN_EMAIL) {
    const createdAt  = new Date(user.created_at).getTime();
    const elapsed    = Date.now() - createdAt;
    const remaining  = COOLDOWN_MS - elapsed;
    const daysLeft   = Math.ceil(remaining / (1000 * 60 * 60 * 24));
    const badge      = document.createElement('span');
    badge.className  = daysLeft <= 2 ? 'access-badge expiring' : 'access-badge active';
    badge.textContent = `${daysLeft}d left`;
    const emailEl    = document.getElementById('user-email-display');
    emailEl.after(badge);
  }

  loadContacts();
}

// ── LOAD CONTACTS ──
async function loadContacts() {
  document.getElementById('contacts-body').innerHTML =
    '<div class="loading-state"><span class="spinner"></span></div>';

  const { data, error } = await sb
    .from('contacts')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) { showToast('Error loading contacts'); return; }
  allContacts = data || [];
  renderContacts(allContacts);
}

// ── RENDER CONTACTS ──
function renderContacts(list) {
  updateCounter(list.length);

  if (list.length === 0) {
    document.getElementById('contacts-body').innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📇</div>
        <p>No contacts yet. Add your first one above.</p>
      </div>`;
    return;
  }

  const rows = list.map((c, i) => `
    <tr class="row-animate" style="animation-delay:${i * 0.04}s">
      <td><div class="contact-name">${escHtml(c.name)}</div></td>
      <td><div class="contact-phone">${escHtml(c.phone)}</div></td>
      <td><div class="contact-date">${formatDate(c.created_at)}</div></td>
      <td><button class="btn btn-danger" onclick="deleteContact('${c.id}')">Delete</button></td>
    </tr>`).join('');

  document.getElementById('contacts-body').innerHTML = `
    <table>
      <thead><tr>
        <th>Name</th><th>Phone</th><th>Added</th><th></th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
}


// ── ADD CONTACT ──
async function addContact() {
  const name     = document.getElementById('input-name').value.trim();
  const rawPhone = document.getElementById('input-phone').value.trim().replace(/\s+/g, '');

  if (!name) { showToast('Name is required'); return; }
  if (!rawPhone) { showToast('Phone number is required'); return; }

  if (!rawPhone.startsWith('234')) {
    showToast('Phone must start with 234 (e.g. 2348012345678)');
    return;
  }

  if (!/^234\d{10}$/.test(rawPhone)) {
    showToast('Enter a valid number: 234 + 10 digits (e.g. 2348012345678)');
    return;
  }

  const duplicate = allContacts.find(c => c.phone === rawPhone);
  if (duplicate) {
    showToast('Already saved under "' + duplicate.name + '"');
    return;
  }

  document.getElementById('add-btn-text').innerHTML = '<span class="spinner"></span>';

  const { data: existing } = await sb
    .from('contacts')
    .select('id, name')
    .eq('phone', rawPhone)
    .maybeSingle();

  if (existing) {
    document.getElementById('add-btn-text').textContent = 'Add Contact';
    showToast('This number already exists in the system');
    return;
  }

  const { data, error } = await sb
    .from('contacts')
    .insert([{ user_id: currentUser.id, name, phone: rawPhone }])
    .select()
    .single();

  document.getElementById('add-btn-text').textContent = 'Add Contact';

  if (error) { showToast('Error: ' + error.message); return; }

  allContacts.unshift(data);
  document.getElementById('input-name').value   = '';
  document.getElementById('input-phone').value  = '';
  document.getElementById('search-input').value = '';
  renderContacts(allContacts);
  showToast('Contact added');
}

// ── DELETE CONTACT ──
async function deleteContact(id) {
  const { error } = await sb.from('contacts').delete().eq('id', id);
  if (error) { showToast('Error deleting contact'); return; }

  allContacts = allContacts.filter(c => c.id !== id);
  const search   = document.getElementById('search-input').value.toLowerCase();
  const filtered = search
    ? allContacts.filter(c =>
        c.name.toLowerCase().includes(search) || c.phone.includes(search))
    : allContacts;
  renderContacts(filtered);
  showToast('Contact removed');
}

// ── SEARCH / FILTER ──
function filterContacts() {
  const q        = document.getElementById('search-input').value.toLowerCase();
  const filtered = q
    ? allContacts.filter(c =>
        c.name.toLowerCase().includes(q) || c.phone.includes(q))
    : allContacts;
  renderContacts(filtered);
}

// ── EXPORT VCF (admin only) ──
function exportVCF() {
  if (allContacts.length === 0) { showToast('No contacts to export'); return; }

  const vcf = allContacts.map(c => {
    const parts = c.name.trim().split(' ');
    const last  = parts.length > 1 ? parts.pop() : '';
    const first = parts.join(' ');
    return [
      'BEGIN:VCARD',
      'VERSION:3.0',
      `FN:${c.name}`,
      `N:${last};${first};;;`,
      `TEL;TYPE=CELL:${c.phone}`,
      'END:VCARD'
    ].join('\r\n');
  }).join('\r\n');

  const blob = new Blob([vcf], { type: 'text/vcard;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = 'contacts.vcf';
  a.click();
  URL.revokeObjectURL(url);
  showToast(`Exported ${allContacts.length} contacts as VCF ✓`);
}

// ── UTILS ──
function updateCounter(n) {
  document.getElementById('contact-count').textContent =
    `${n} contact${n !== 1 ? 's' : ''}`;
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric'
  });
}

function escHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;');
}

let toastTimer;
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 3000);
}
