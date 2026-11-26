/* ============================================================
   Estate Kitchen — interactive menu, order bag & WhatsApp orders
   ============================================================ */

(function () {
  "use strict";

  document.documentElement.classList.add("js");

  var WHATSAPP_NUMBER = "233553576121";
  var WHATSAPP_URL = "https://wa.me/" + WHATSAPP_NUMBER;

  var menuItems = Array.prototype.slice.call(document.querySelectorAll("[data-menu-item]"));
  menuItems.forEach(function (card, index) {
    if (!card.dataset.id) card.dataset.id = "dish-" + (index + 1);
  });

  var cart = new Map();

  var bagBtn = document.getElementById("bagBtn");
  var bagCount = document.getElementById("bagCount");
  var cartDrawer = document.getElementById("cartDrawer");
  var drawerOverlay = document.getElementById("drawerOverlay");
  var closeDrawerBtn = document.getElementById("closeDrawer");
  var cartItemsEl = document.getElementById("cartItems");
  var emptyCartEl = document.getElementById("emptyCart");
  var cartTotalEl = document.getElementById("cartTotal");
  var checkoutBtn = document.getElementById("checkoutBtn");
  var orderOptions = document.getElementById("orderOptions");
  var landmarkInput = document.getElementById("landmarkInput");
  var landmarkLabel = document.getElementById("landmarkLabel");
  var landmarkHint = document.getElementById("landmarkHint");
  var toast = document.getElementById("toast");
  var toastText = document.getElementById("toastText");
  var toastView = document.getElementById("toastView");

  var lastFocused = null;
  var toastTimer = null;

  /* ---------- Helpers ---------- */

  function formatGHS(amount) {
    return "GHS " + Number(amount).toFixed(2);
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, function (char) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char];
    });
  }

  function findMenuItem(name) {
    return menuItems.find(function (card) {
      return card.dataset.name === name;
    });
  }

  function openWhatsApp(message) {
    var url = WHATSAPP_URL + (message ? "?text=" + encodeURIComponent(message) : "");
    var newWindow = window.open(url, "_blank");
    if (newWindow) {
      try { newWindow.opener = null; } catch (error) { /* cross-origin window */ }
    } else {
      window.location.href = url;
    }
  }

  function showToast(message) {
    toastText.textContent = message;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toast.classList.remove("show");
    }, 3500);
  }

  function hideToast() {
    clearTimeout(toastTimer);
    toast.classList.remove("show");
  }

  /* ---------- Cart ---------- */

  function addToOrder(name, price, sourceButton) {
    var item = findMenuItem(name);
    var id = item ? item.dataset.id : name;
    var image = item && item.querySelector("img")
      ? item.querySelector("img").getAttribute("src").replace(/w=\d+/, "w=160")
      : "";

    if (cart.has(id)) {
      cart.get(id).qty += 1;
    } else {
      cart.set(id, { id: id, name: name, price: Number(price), image: image, qty: 1 });
    }

    renderCart();
    showToast("Added to your order bag");

    if (sourceButton) {
      var original = sourceButton.dataset.original || sourceButton.textContent;
      sourceButton.dataset.original = original;
      sourceButton.textContent = "✓ Added";
      clearTimeout(sourceButton._addTimer);
      sourceButton._addTimer = setTimeout(function () {
        sourceButton.textContent = original;
      }, 1100);
    }

    bagCount.classList.remove("bump");
    void bagCount.offsetWidth;
    bagCount.classList.add("bump");
  }

  function getTotal() {
    var total = 0;
    cart.forEach(function (item) {
      total += item.price * item.qty;
    });
    return total;
  }

  function getQuantity() {
    var qty = 0;
    cart.forEach(function (item) {
      qty += item.qty;
    });
    return qty;
  }

  function renderCart() {
    cartItemsEl.innerHTML = "";

    cart.forEach(function (item) {
      var row = document.createElement("div");
      row.className = "cart-item";
      row.dataset.id = item.id;
      row.innerHTML =
        '<img class="cart-thumb" src="' + escapeHtml(item.image) + '" alt="" loading="lazy" />' +
        '<div class="cart-info">' +
          '<h4>' + escapeHtml(item.name) + "</h4>" +
          '<p class="cart-unit">' + formatGHS(item.price) + " each</p>" +
          '<div class="qty">' +
            '<button type="button" data-action="dec" aria-label="Decrease quantity of ' + escapeHtml(item.name) + '">−</button>' +
            "<span>" + item.qty + "</span>" +
            '<button type="button" data-action="inc" aria-label="Increase quantity of ' + escapeHtml(item.name) + '">+</button>' +
          "</div>" +
        "</div>" +
        '<div class="cart-item-side">' +
          "<strong>" + formatGHS(item.price * item.qty) + "</strong>" +
          '<button class="remove-btn" type="button" data-action="remove" aria-label="Remove ' + escapeHtml(item.name) + '">Remove</button>' +
        "</div>";
      cartItemsEl.appendChild(row);
    });

    var isEmpty = cart.size === 0;
    emptyCartEl.classList.toggle("show", isEmpty);
    orderOptions.hidden = isEmpty;
    checkoutBtn.disabled = isEmpty;
    var qty = getQuantity();
    cartTotalEl.textContent = formatGHS(getTotal());
    bagCount.textContent = String(qty);
    bagBtn.setAttribute("aria-label", "Order Bag (" + qty + (qty === 1 ? " item" : " items") + ") — open bag");
  }

  /* ---------- Drawer ---------- */

  function openDrawer() {
    hideToast();
    lastFocused = document.activeElement;
    cartDrawer.classList.add("open");
    drawerOverlay.classList.add("open");
    cartDrawer.setAttribute("aria-hidden", "false");
    document.body.classList.add("no-scroll");
    closeDrawerBtn.focus();
  }

  function closeDrawer() {
    cartDrawer.classList.remove("open");
    drawerOverlay.classList.remove("open");
    cartDrawer.setAttribute("aria-hidden", "true");
    document.body.classList.remove("no-scroll");
    if (lastFocused && typeof lastFocused.focus === "function") lastFocused.focus();
  }

  function trapDrawerFocus(event) {
    if (!cartDrawer.classList.contains("open") || event.key !== "Tab") return;
    var focusable = cartDrawer.querySelectorAll(
      'button:not([disabled]), input:not([disabled]), textarea, select, a[href], [tabindex]:not([tabindex="-1"])'
    );
    if (!focusable.length) return;
    var first = focusable[0];
    var last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  /* ---------- Order type ---------- */

  var orderTypeCopy = {
    "Ho Delivery": {
      label: "Delivery landmark / your name",
      placeholder: "e.g. Near Ho Police Station, behind the market",
      hint: "Helps us find you quickly in Ho."
    },
    "Pickup at Alaye St": {
      label: "Your name / pickup note",
      placeholder: "e.g. Ama — I'll arrive around 6pm",
      hint: "We'll have your order ready at Alaye Street."
    },
    "Dine-In": {
      label: "Your name / table note",
      placeholder: "e.g. Ama — table for 4",
      hint: "We'll get a table ready for you."
    }
  };

  function selectedOrderType() {
    var checked = cartDrawer.querySelector('input[name="orderType"]:checked');
    return checked ? checked.value : "Ho Delivery";
  }

  function updateOrderTypeCopy() {
    var type = selectedOrderType();
    var copy = orderTypeCopy[type];
    landmarkLabel.textContent = copy.label;
    landmarkInput.placeholder = copy.placeholder;
    landmarkHint.textContent = copy.hint;

    var options = cartDrawer.querySelectorAll(".type-option");
    options.forEach(function (option) {
      var input = option.querySelector('input[name="orderType"]');
      option.classList.toggle("is-selected", !!input && input.value === type);
    });
  }

  function buildOrderMessage() {
    var type = selectedOrderType();
    var landmark = landmarkInput.value.trim();
    var label = orderTypeCopy[type].label;
    var lines = [];

    lines.push("*New Order — Estate Kitchen*");
    lines.push("Alaye Street, Ho · Volta Region");
    lines.push("");
    lines.push("*Items:*");

    var index = 1;
    cart.forEach(function (item) {
      lines.push(index + ". " + item.name + " × " + item.qty + " — " + formatGHS(item.price * item.qty));
      index += 1;
    });

    lines.push("");
    lines.push("*Order type:* " + type);
    lines.push("*" + label + ":* " + (landmark || "Not provided"));
    lines.push("");
    lines.push("*TOTAL: " + formatGHS(getTotal()) + "*");
    lines.push("");
    lines.push("Please confirm availability and the preparation / delivery time. Thank you!");

    return lines.join("\n");
  }

  /* ---------- Menu filters ---------- */

  var tabs = Array.prototype.slice.call(document.querySelectorAll(".tab"));
  var resultCount = document.getElementById("resultCount");

  function applyFilter(filter) {
    var shown = 0;
    menuItems.forEach(function (card) {
      var match = filter === "all" || card.dataset.category === filter;
      card.classList.toggle("is-hidden", !match);
      if (match) shown += 1;
    });
    resultCount.textContent = shown + (shown === 1 ? " dish" : " dishes");
  }

  /* ---------- Events ---------- */

  document.addEventListener("click", function (event) {
    var addButton = event.target.closest("[data-add]");
    if (addButton) {
      var card = addButton.closest("[data-menu-item]");
      var name = card ? card.dataset.name : addButton.dataset.name;
      var price = card ? card.dataset.price : addButton.dataset.price;
      if (name && price) addToOrder(name, price, addButton);
      return;
    }

    var qtyButton = event.target.closest("[data-action]");
    if (qtyButton && cartItemsEl.contains(qtyButton)) {
      var id = qtyButton.closest(".cart-item").dataset.id;
      var item = cart.get(id);
      if (!item) return;

      if (qtyButton.dataset.action === "inc") item.qty += 1;
      if (qtyButton.dataset.action === "dec") {
        item.qty -= 1;
        if (item.qty < 1) cart.delete(id);
      }
      if (qtyButton.dataset.action === "remove") cart.delete(id);
      renderCart();
    }
  });

  bagBtn.addEventListener("click", openDrawer);
  closeDrawerBtn.addEventListener("click", closeDrawer);
  drawerOverlay.addEventListener("click", closeDrawer);
  toastView.addEventListener("click", openDrawer);

  document.getElementById("emptyBrowse").addEventListener("click", function () {
    closeDrawer();
    document.getElementById("menu").scrollIntoView({ behavior: "smooth", block: "start" });
  });

  cartDrawer.addEventListener("change", function (event) {
    if (event.target.name === "orderType") updateOrderTypeCopy();
  });

  checkoutBtn.addEventListener("click", function () {
    if (cart.size === 0) return;
    if (!landmarkInput.value.trim()) {
      showToast("Please add your name or landmark first");
      landmarkInput.focus();
      return;
    }
    openWhatsApp(buildOrderMessage());
    showToast("Order opened in WhatsApp — send it to confirm");
  });

  tabs.forEach(function (tab, index) {
    tab.addEventListener("click", function () {
      tabs.forEach(function (other) {
        other.classList.toggle("is-active", other === tab);
        other.setAttribute("aria-selected", String(other === tab));
      });
      applyFilter(tab.dataset.filter);
    });

    tab.addEventListener("keydown", function (event) {
      if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
      event.preventDefault();
      var direction = event.key === "ArrowRight" ? 1 : -1;
      var next = tabs[(index + direction + tabs.length) % tabs.length];
      next.focus();
      next.click();
    });
  });

  /* ---------- Mobile navigation ---------- */

  var navToggle = document.getElementById("navToggle");
  var navLinks = document.getElementById("navLinks");

  function closeNav() {
    navLinks.classList.remove("open");
    navToggle.setAttribute("aria-expanded", "false");
    navToggle.setAttribute("aria-label", "Open navigation");
  }

  navToggle.addEventListener("click", function () {
    var open = navLinks.classList.toggle("open");
    navToggle.setAttribute("aria-expanded", String(open));
    navToggle.setAttribute("aria-label", open ? "Close navigation" : "Open navigation");
  });

  navLinks.addEventListener("click", function (event) {
    if (event.target.closest("a")) closeNav();
  });

  document.addEventListener("click", function (event) {
    if (navLinks.classList.contains("open") && !event.target.closest(".navbar")) closeNav();
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
      if (cartDrawer.classList.contains("open")) closeDrawer();
      else if (navLinks.classList.contains("open")) closeNav();
      else hideToast();
    }
    trapDrawerFocus(event);
  });

  /* ---------- Booking form ---------- */

  var bookingForm = document.getElementById("bookingForm");
  var formStatus = document.getElementById("formStatus");
  var bookDate = document.getElementById("bookDate");

  if (bookDate) {
    var today = new Date();
    bookDate.min = [today.getFullYear(), String(today.getMonth() + 1).padStart(2, "0"), String(today.getDate()).padStart(2, "0")].join("-");
  }

  bookingForm.addEventListener("submit", function (event) {
    event.preventDefault();
    if (!bookingForm.reportValidity()) return;

    var data = new FormData(bookingForm);
    var name = String(data.get("name") || "").trim();
    var date = String(data.get("date") || "").trim();
    var guests = String(data.get("guests") || "").trim();
    var type = String(data.get("type") || "Table reservation");
    var note = String(data.get("note") || "").trim();

    var message = [
      "*New Table / Catering Inquiry — Estate Kitchen*",
      "",
      "*Name:* " + name,
      "*Date:* " + date,
      "*Guests:* " + guests,
      "*For:* " + type,
      "*Note:* " + (note || "No additional note"),
      "",
      "Please let me know availability and next steps. Thank you!"
    ].join("\n");

    openWhatsApp(message);
    formStatus.textContent = "Opening WhatsApp — please send the message there to complete your inquiry.";
  });

  bookingForm.addEventListener("input", function () {
    if (formStatus.textContent) formStatus.textContent = "";
  });

  /* ---------- Scroll enhancements ---------- */

  var reveals = Array.prototype.slice.call(document.querySelectorAll(".reveal"));
  if ("IntersectionObserver" in window) {
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("in-view");
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    reveals.forEach(function (el) { revealObserver.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add("in-view"); });
  }

  var navAnchors = Array.prototype.slice.call(navLinks.querySelectorAll('a[href^="#"]'));
  var sections = navAnchors
    .map(function (anchor) { return document.querySelector(anchor.getAttribute("href")); })
    .filter(Boolean);

  if ("IntersectionObserver" in window && sections.length) {
    var sectionObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        navAnchors.forEach(function (anchor) {
          anchor.classList.toggle("active", anchor.getAttribute("href") === "#" + entry.target.id);
        });
      });
    }, { rootMargin: "-35% 0px -55% 0px", threshold: 0 });
    sections.forEach(function (section) { sectionObserver.observe(section); });
  }

  document.getElementById("year").textContent = String(new Date().getFullYear());

  /* ---------- Init ---------- */

  renderCart();
  updateOrderTypeCopy();
})();
