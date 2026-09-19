/* View router. Login → citizen or officer dashboard, all in one document so state
   survives navigation without using browser storage. */
(function () {
  const S = window.STORE;
  S.seed();
  const views = {
    login: document.getElementById('view-login'),
    civilian: document.getElementById('view-civilian'),
    admin: document.getElementById('view-admin')
  };

  function show(name) {
    Object.entries(views).forEach(([k, el]) => { el.hidden = k !== name; });
    window.scrollTo(0, 0);
  }

  function signIn(user) {
    S.signIn(user);
    if (user.role === 'admin') { show('admin'); window.ADMIN.mount(views.admin, user); }
    else { show('civilian'); window.CIVILIAN.mount(views.civilian, user); }
  }

  function signOut() { S.signOut(); show('login'); window.AUTH.mount(views.login); }

  window.ROUTER = { signIn, signOut, show };
  show('login');
  window.AUTH.mount(views.login);
})();
