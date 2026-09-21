// Database Products
    const products = [
      {
        id: 1,
        title: "Camiseta Cyber Neon 2088",
        category: "cyber",
        price: 99.90,
        oldPrice: 129.90,
        tag: "Bestseller",
        tagClass: "badge-purple",
        shirtColor: "#181a24",
        grad: "linear-gradient(135deg, #6366f1, #06b6d4)",
        printText: "CYBER<br>2088"
      },
      {
        id: 2,
        title: "Camiseta Tokyo Street Kanryu",
        category: "streetwear",
        price: 109.90,
        oldPrice: 139.90,
        tag: "Lançamento",
        tagClass: "badge-rose",
        shirtColor: "#0f172a",
        grad: "linear-gradient(135deg, #f43f5e, #fb923c)",
        printText: "東京<br>STREET"
      },
      {
        id: 3,
        title: "Camiseta Aesthetic Minimal Sphere",
        category: "minimal",
        price: 89.90,
        oldPrice: null,
        tag: "100% Algodão",
        tagClass: "badge-purple",
        shirtColor: "#f8fafc",
        grad: "linear-gradient(135deg, #1e293b, #475569)",
        printText: "ESSENTIAL<br>FORM",
        textColor: "#fff"
      },
      {
        id: 4,
        title: "Camiseta Mecha EVA Unit-01",
        category: "anime",
        price: 119.90,
        oldPrice: 149.90,
        tag: "Edição Limitada",
        tagClass: "badge-rose",
        shirtColor: "#111827",
        grad: "linear-gradient(135deg, #a855f7, #22c55e)",
        printText: "SYSTEM<br>OVERRIDE"
      },
      {
        id: 5,
        title: "Camiseta Retro Synthwave Sunset",
        category: "cyber",
        price: 94.90,
        oldPrice: 119.90,
        tag: "Destaque",
        tagClass: "badge-purple",
        shirtColor: "#1e1b4b",
        grad: "linear-gradient(135deg, #ec4899, #eab308)",
        printText: "OUTRUN<br>80S"
      },
      {
        id: 6,
        title: "Camiseta Botanical Skull Engraving",
        category: "minimal",
        price: 99.90,
        oldPrice: null,
        tag: "Autoral",
        tagClass: "badge-purple",
        shirtColor: "#18181b",
        grad: "linear-gradient(135deg, #d4d4d8, #a1a1aa)",
        printText: "NATURE<br>MEMENTO",
        textColor: "#111"
      }
    ];

    // State Variables
    let cart = [];
    let discountApplied = false;
    let selectedSizes = {};

    // Initialize Page
    document.addEventListener("DOMContentLoaded", () => {
      renderProducts(products);
      setupPromptGenerator();
    });

    // Render Products Grid
    function renderProducts(items) {
      const grid = document.getElementById("productGrid");
      grid.innerHTML = "";

      items.forEach(product => {
        // Default size selected: M
        if (!selectedSizes[product.id]) {
          selectedSizes[product.id] = 'M';
        }

        const card = document.createElement("div");
        card.className = "product-card";
        card.innerHTML = `
          <div class="product-thumb">
            <span class="badge ${product.tagClass} product-tag">${product.tag}</span>
            <div class="tshirt-wrapper" style="width:180px; height:200px;">
              <svg class="tshirt-svg" viewBox="0 0 300 320" fill="${product.shirtColor}">
                <path d="M95 20 C 120 40, 180 40, 205 20 L 280 65 L 245 125 L 215 110 L 215 290 L 85 290 L 85 110 L 55 125 L 20 65 Z" stroke="rgba(255,255,255,0.1)" stroke-width="2"/>
              </svg>
              <div class="tshirt-print-area" style="background-image: ${product.grad}; width:44%; height:45%;">
                <div class="tshirt-print-text" style="${product.textColor ? 'color:' + product.textColor : ''}">${product.printText}</div>
              </div>
            </div>
          </div>
          <div class="product-info">
            <span class="product-category">${product.category}</span>
            <h3 class="product-title">${product.title}</h3>
            <div class="product-price-row">
              <span class="product-price">R$ ${product.price.toFixed(2).replace('.', ',')}</span>
              ${product.oldPrice ? `<span class="product-old-price">R$ ${product.oldPrice.toFixed(2).replace('.', ',')}</span>` : ''}
            </div>

            <div style="margin-bottom:8px; font-size:0.75rem; color:var(--text-muted);">Tamanho:</div>
            <div class="size-selector">
              ${['P', 'M', 'G', 'GG'].map(size => `
                <button class="size-btn ${selectedSizes[product.id] === size ? 'active' : ''}" onclick="selectProductSize(${product.id}, '${size}', this)">${size}</button>
              `).join('')}
            </div>

            <div class="card-actions">
              <button class="btn btn-primary" onclick="addToCart(${product.id})">
                <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4"/></svg>
                Adicionar
              </button>
            </div>
          </div>
        `;
        grid.appendChild(card);
      });
    }

    // Size Selector Function
    function selectProductSize(productId, size, btn) {
      selectedSizes[productId] = size;
      const parent = btn.parentElement;
      parent.querySelectorAll('.size-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    }

    // Filter Products
    function filterCatalog(category, tabBtn) {
      document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
      tabBtn.classList.add('active');

      if (category === 'all') {
        renderProducts(products);
      } else {
        const filtered = products.filter(p => p.category === category);
        renderProducts(filtered);
      }
    }

    // Sort Catalog
    function sortCatalog() {
      const val = document.getElementById("sortSelect").value;
      let sorted = [...products];

      if (val === 'price-asc') {
        sorted.sort((a, b) => a.price - b.price);
      } else if (val === 'price-desc') {
        sorted.sort((a, b) => b.price - a.price);
      }
      renderProducts(sorted);
    }

    // Hero Mockup Color Changer
    function changeHeroShirtColor(color, dotElem) {
      document.getElementById("tshirtVector").setAttribute("fill", color);
      document.querySelectorAll(".color-picker-row .color-dot").forEach(d => d.classList.remove("active"));
      dotElem.classList.add("active");
    }

    // AI Prompt Generator Logic
    function setupPromptGenerator() {
      const input = document.getElementById("promptConcept");
      input.addEventListener("input", updatePromptGenerator);
    }

    function updatePromptGenerator() {
      const concept = document.getElementById("promptConcept").value || "Design gráfico autoral";
      const style = document.getElementById("promptStyle").value;
      const activeChips = Array.from(document.querySelectorAll("#promptChips .chip.active"))
                              .map(c => c.innerText.toLowerCase());

      const chipsString = activeChips.length ? activeChips.join(", ") + ", " : "";
      const generated = `/imagine prompt: ${concept}, ${style} style, ${chipsString}graphic t-shirt design, vector illustration, high contrast, DTG print template --v 6.0`;

      document.getElementById("finalPromptText").innerText = generated;

      // Update Hero Live Mockup Print Area Text
      const words = concept.split(" ");
      const shortText = words.slice(0, 2).join("<br>").toUpperCase() || "CAMISETA<br>EXCLUSIVA";
      document.getElementById("heroPrintText").innerHTML = shortText;
    }

    function toggleChip(chip) {
      chip.classList.toggle("active");
      updatePromptGenerator();
    }

    function copyPrompt() {
      const text = document.getElementById("finalPromptText").innerText;
      navigator.clipboard.writeText(text);
      showToast("Prompt copiado para a área de transferência!");
    }

    // Add Custom T-Shirt to Cart from Prompt Studio
    function addCustomShirtToCart() {
      const concept = document.getElementById("promptConcept").value || "Estampa Customizada IA";
      const customItem = {
        cartId: Date.now(),
        id: 999,
        title: `Camiseta IA: "${concept.substring(0, 20)}..."`,
        price: 99.90,
        size: 'M',
        shirtColor: '#181a24'
      };
      cart.push(customItem);
      updateCartUI();
      openCart();
      showToast("Camiseta customizada adicionada ao carrinho!");
    }

    // Cart Management
    function addToCart(productId) {
      const product = products.find(p => p.id === productId);
      const size = selectedSizes[productId] || 'M';

      const cartItem = {
        cartId: Date.now(),
        ...product,
        size: size
      };

      cart.push(cartItem);
      updateCartUI();
      showToast(`${product.title} (${size}) adicionada!`);
    }

    function removeFromCart(cartId) {
      cart = cart.filter(item => item.cartId !== cartId);
      updateCartUI();
    }

    function updateCartUI() {
      const countElems = [document.getElementById("cartCount"), document.getElementById("cartDrawerCount")];
      countElems.forEach(el => el.innerText = cart.length);

      const itemsList = document.getElementById("cartItemsList");
      if (cart.length === 0) {
        itemsList.innerHTML = `
          <div style="text-align:center; padding: 40px 0; color: var(--text-muted);">
            <svg width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24" style="margin-bottom:12px; opacity:0.5;"><path d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/></svg>
            <p>Seu carrinho está vazio.</p>
          </div>
        `;
      } else {
        itemsList.innerHTML = cart.map(item => `
          <div class="cart-item">
            <div class="cart-item-thumb">
              <svg width="40" height="40" viewBox="0 0 300 320" fill="${item.shirtColor || '#181a24'}">
                <path d="M95 20 C 120 40, 180 40, 205 20 L 280 65 L 245 125 L 215 110 L 215 290 L 85 290 L 85 110 L 55 125 L 20 65 Z" stroke="rgba(255,255,255,0.2)"/>
              </svg>
            </div>
            <div class="cart-item-details">
              <div class="cart-item-title">${item.title}</div>
              <div class="cart-item-meta">Tamanho: ${item.size} | 100% Algodão</div>
              <div class="cart-item-price">R$ ${item.price.toFixed(2).replace('.', ',')}</div>
            </div>
            <button class="remove-item-btn" onclick="removeFromCart(${item.cartId})" aria-label="Remover">✕</button>
          </div>
        `).join('');
      }

      // Calculations
      let subtotal = cart.reduce((sum, item) => sum + item.price, 0);
      let discount = discountApplied ? subtotal * 0.10 : 0;
      let total = subtotal - discount;

      document.getElementById("cartSubtotal").innerText = `R$ ${subtotal.toFixed(2).replace('.', ',')}`;
      if (discountApplied) {
        document.getElementById("discountRow").style.display = "flex";
        document.getElementById("cartDiscount").innerText = `-R$ ${discount.toFixed(2).replace('.', ',')}`;
      } else {
        document.getElementById("discountRow").style.display = "none";
      }
      document.getElementById("cartTotal").innerText = `R$ ${total.toFixed(2).replace('.', ',')}`;
    }

    function applyCoupon() {
      const code = document.getElementById("couponInput").value.trim().toUpperCase();
      if (code === "CAMISA10") {
        discountApplied = true;
        updateCartUI();
        showToast("Cupom de 10% OFF aplicado!");
      } else if (code === "") {
        showToast("Digite um código de cupom.");
      } else {
        showToast("Cupom inválido. Tente CAMISA10");
      }
    }

    // Cart Open/Close Controls
    document.getElementById("cartOpenBtn").addEventListener("click", openCart);
    function openCart() {
      document.getElementById("cartDrawer").classList.add("active");
      document.getElementById("cartOverlay").classList.add("active");
    }
    function closeCart() {
      document.getElementById("cartDrawer").classList.remove("active");
      document.getElementById("cartOverlay").classList.remove("active");
    }

    // Checkout Modal
    function openCheckoutModal() {
      if (cart.length === 0) {
        showToast("Adicione pelo menos um item ao carrinho!");
        return;
      }
      closeCart();
      document.getElementById("checkoutModal").classList.add("active");
      goToStep(1);
    }
    function closeCheckoutModal() {
      document.getElementById("checkoutModal").classList.remove("active");
    }

    function goToStep(step) {
      [1, 2, 3, 4].forEach(s => {
        const content = document.getElementById(`stepContent${s}`);
        const indicator = document.getElementById(`stepIndicator${s}`);
        if (content) content.style.display = (s === step) ? 'block' : 'none';

        if (indicator) {
          if (s < step) {
            indicator.className = 'step-item completed';
          } else if (s === step) {
            indicator.className = 'step-item active';
          } else {
            indicator.className = 'step-item';
          }
        }
      });
    }

    function finishOrder() {
      const orderNum = "#CM-" + Math.floor(10000 + Math.random() * 90000);
      document.getElementById("orderNumber").innerText = orderNum;
      cart = [];
      discountApplied = false;
      updateCartUI();
      goToStep(4);
    }

    // Toast Function
    function showToast(message) {
      const toast = document.getElementById("toast");
      document.getElementById("toastMsg").innerText = message;
      toast.classList.add("show");
      setTimeout(() => {
        toast.classList.remove("show");
      }, 3000);
    }