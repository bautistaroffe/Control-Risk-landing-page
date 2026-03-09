(function () {
  const header = document.querySelector(".site-header");
  if (!header) {
    return;
  }

  const inner = header.querySelector(".site-header-inner");
  const brand = header.querySelector(".site-brand");
  const nav = header.querySelector(".site-nav");
  const actions = header.querySelector(".site-header-actions");
  const toggle = header.querySelector(".site-menu-toggle");
  const menu = header.querySelector(".site-mobile-menu");
  const menuLinks = menu ? Array.from(menu.querySelectorAll("a")) : [];

  if (!inner || !brand || !nav || !actions || !toggle || !menu) {
    return;
  }

  const collapseBreakpoint = window.matchMedia("(max-width: 767px)");

  function closeMenu() {
    header.classList.remove("is-menu-open");
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", "Abrir menú de navegación");
    const icon = toggle.querySelector(".material-symbols-outlined");
    if (icon) {
      icon.textContent = "menu";
    }
    menu.hidden = true;
  }

  function openMenu() {
    header.classList.add("is-menu-open");
    toggle.setAttribute("aria-expanded", "true");
    toggle.setAttribute("aria-label", "Cerrar menú de navegación");
    const icon = toggle.querySelector(".material-symbols-outlined");
    if (icon) {
      icon.textContent = "close";
    }
    menu.hidden = false;
  }

  function shouldCollapse() {
    if (collapseBreakpoint.matches) {
      return true;
    }

    const gapAllowance = 96;
    const requiredWidth = brand.offsetWidth + nav.scrollWidth + actions.scrollWidth + gapAllowance;
    return requiredWidth > inner.clientWidth;
  }

  function syncCollapsedState() {
    const collapsed = shouldCollapse();
    header.classList.toggle("is-collapsed", collapsed);

    if (!collapsed) {
      closeMenu();
    }
  }

  toggle.addEventListener("click", function () {
    if (menu.hidden) {
      openMenu();
      return;
    }

    closeMenu();
  });

  document.addEventListener("click", function (event) {
    if (menu.hidden) {
      return;
    }

    if (!header.contains(event.target)) {
      closeMenu();
    }
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && !menu.hidden) {
      closeMenu();
    }
  });

  menuLinks.forEach(function (link) {
    link.addEventListener("click", closeMenu);
  });

  if (typeof ResizeObserver === "function") {
    const resizeObserver = new ResizeObserver(syncCollapsedState);
    resizeObserver.observe(inner);
    resizeObserver.observe(nav);
    resizeObserver.observe(actions);
  }

  window.addEventListener("resize", syncCollapsedState);
  syncCollapsedState();
})();
