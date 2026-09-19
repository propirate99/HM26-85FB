/* Login controller. Simulated OAuth + email sign-in, role-routed. */
window.AUTH = (function () {
  const S = window.STORE;
  let role = 'civilian', root = null, wardSel = null;
  const $ = s => root.querySelector(s);

  const COPY = {
    civilian: { h: 'Sign in to your citizen dashboard', s: 'Track every complaint you file and get an email the moment its status moves.', btn: 'Continue to citizen dashboard' },
    admin: { h: 'Sign in to the MCC operations console', s: 'Work the ward complaint queue against SLA clocks, dispatch crews and open the 600 TPD logistics simulator.', btn: 'Continue to operations console' }
  };

  function setRole(r) {
    role = r;
      root.querySelectorAll('.role-seg button').forEach(b => {
      const on = b.dataset.role === r;
      b.classList.toggle('on', on); b.setAttribute('aria-selected', String(on));
    });
    $('#authTitle').textContent = COPY[r].h;
    $('#authSub').textContent = COPY[r].s;
    $('#go').textContent = COPY[r].btn;
    $('#wardWrap').hidden = r === 'admin';
    $('#codeWrap').hidden = r !== 'admin';
    $('#notify').closest('.chk').hidden = r === 'admin';
    $('#err').hidden = true;
  }


  function enter(user) { window.ROUTER.signIn(user); }

  function fail(msg) { const e = $('#err'); e.textContent = msg; e.hidden = false; }

  /* simulated OAuth: brief handshake delay, then a provider-shaped identity */
  function wireOauth() {
  root.querySelectorAll('.oauth-btn').forEach(btn => btn.addEventListener('click', () => {
    const p = btn.dataset.provider;
    const typed = $('#email').value.trim();
    const email = typed || (role === 'admin'
      ? (p === 'google' ? 'swm.officer@mysuru.gov.in' : 'swm.officer@icloud.com')
      : (p === 'google' ? 'citizen.mysuru@gmail.com' : 'citizen.mysuru@icloud.com'));
    btn.dataset.busy = '1';
    btn.textContent = 'Redirecting to ' + (p === 'google' ? 'Google' : 'Apple') + '…';
    setTimeout(() => enter({
      role, email, provider: p,
      name: $('#name').value.trim() || (role === 'admin' ? 'SWM Duty Officer' : 'Mysuru Citizen'),
      ward: role === 'admin' ? null : wardSel.value,
      code: role === 'admin' ? ($('#code').value.trim() || 'MCC-SWM-204') : null,
      notify: $('#notify').checked, at: new Date().toISOString()
    }), 650);
  }));
  }

  function wireForm() {
  $('#emailForm').addEventListener('submit', e => {
    e.preventDefault();
    const email = $('#email').value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(email)) return fail('Enter a valid email address — status updates are sent there.');
    if (role === 'admin' && !/^MCC[-\s]?/i.test($('#code').value.trim() || 'MCC-')) return fail('Officer code should start with MCC-.');
    enter({
      role, email, provider: 'email',
      name: $('#name').value.trim() || email.split('@')[0].replace(/[._]/g, ' '),
      ward: role === 'admin' ? null : wardSel.value,
      code: role === 'admin' ? ($('#code').value.trim() || 'MCC-SWM-204') : null,
      notify: $('#notify').checked, at: new Date().toISOString()
    });
  });

  root.querySelectorAll('[data-demo]').forEach(b => b.addEventListener('click', () => {
    const r = b.dataset.demo;
    setRole(r);
    $('#email').value = b.textContent.trim();
    $('#name').value = r === 'admin' ? 'SWM Duty Officer' : 'Anitha R';
    if (r === 'admin') $('#code').value = 'MCC-SWM-204';
  }));
  }

  function mount(el) {
    root = el;
    wardSel = $('#ward');
    wardSel.length = 0;
    S.WARD_NAMES.forEach(w => wardSel.add(new Option(w, w)));
    root.querySelectorAll('.role-seg button').forEach(b => b.addEventListener('click', () => setRole(b.dataset.role)));
    wireOauth(); wireForm();
    setRole('civilian');
  }
  return { mount };
})();
