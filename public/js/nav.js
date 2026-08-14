// nav.js — injects the shared top bar into #siteNav on every page,
// and guards pages that require login. Load before the page's own script
// if that script assumes an authenticated window.storage.
(function () {
  function getToken() { return localStorage.getItem('rh_token'); }

  async function fetchMe() {
    const token = getToken();
    if (!token) return null;
    try {
      const res = await fetch('/api/auth/me', { headers: { Authorization: 'Bearer ' + token } });
      if (!res.ok) return null;
      const data = await res.json();
      return data.user;
    } catch (e) { return null; }
  }

  function render(user, activePage) {
    const mount = document.getElementById('siteNav');
    if (!mount) return;
    const links = [
      { href: '/index.html', label: 'Home', key: 'home' },
      { href: '/matrix.html', label: 'Matrix', key: 'matrix' },
      { href: '/reasoning.html', label: 'Reasoning Lab', key: 'reasoning' },
      { href: '/prep30.html', label: '30-Day Prep', key: 'prep30' }
    ];
    if (user && user.role === 'admin') links.push({ href: '/admin.html', label: 'Admin', key: 'admin' });

    mount.innerHTML =
      '<div class="hub-nav-inner">' +
        '<a class="hub-nav-brand" href="/index.html">Reasoning Hub</a>' +
        '<div class="hub-nav-links">' +
          links.map(function (l) {
            return '<a href="' + l.href + '" class="' + (l.key === activePage ? 'active' : '') + '">' + l.label + '</a>';
          }).join('') +
        '</div>' +
        '<div class="hub-nav-user">' +
          (user ? ('<span class="hub-nav-email">' + user.email + (user.role === 'admin' ? ' <em>admin</em>' : '') + '</span><button id="hubLogoutBtn">Log out</button>') : '<a href="/login.html">Log in</a>') +
        '</div>' +
      '</div>';

    var logoutBtn = document.getElementById('hubLogoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', function () {
        localStorage.removeItem('rh_token');
        location.href = '/login.html';
      });
    }
  }

  window.HubNav = {
    // Call once per page. requireAuth=true redirects to /login.html if not signed in.
    init: async function (activePage, requireAuthFlag) {
      const user = await fetchMe();
      if (requireAuthFlag && !user) {
        const next = encodeURIComponent(location.pathname);
        location.href = '/login.html?next=' + next;
        return null;
      }
      render(user, activePage);
      return user;
    }
  };
})();
