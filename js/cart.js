if (window.__COZY_CART_INITIALIZED__) {
    console.warn('CozyKitchen cart script already initialized; skipping duplicate load.');
} else {
window.__COZY_CART_INITIALIZED__ = true;
/**
 * Shopping Cart Module - CozyKitchen
 * Pure JavaScript implementation for efficient cart management
 */

// Self-invoking function for encapsulation and to avoid polluting the global namespace
const ShoppingCart = (function() {
    // Private cart data structure
    let cart = [];
    // Accessibility / focus management
    let lastFocusedElement = null;
    let focusTrapCleanup = null;
    
    // Load cart from localStorage on initialization
    const init = () => {
        try {
            // Migrate legacy storage key if present and new key empty
            const LEGACY_KEY = 'cozykitchen_cart';
            const KEY = 'cozyKitchenCart';
            const savedCart = localStorage.getItem(KEY);
            if (savedCart) {
                cart = JSON.parse(savedCart);
            } else {
                const legacy = localStorage.getItem(LEGACY_KEY);
                if (legacy) {
                    try {
                        cart = JSON.parse(legacy);
                        localStorage.setItem(KEY, legacy);
                        localStorage.removeItem(LEGACY_KEY);
                    } catch(_) { /* ignore parse errors */ }
                }
            }
        } catch (e) {
            console.error('Error loading cart from localStorage:', e);
            cart = [];
        }
        updateCartDisplay();
    };
    
    // Save cart to localStorage
    const saveCart = () => {
        try {
            localStorage.setItem('cozyKitchenCart', JSON.stringify(cart));
        } catch (e) {
            console.error('Error saving cart to localStorage:', e);
        }
    };
    
    // Add item to cart
    const addItem = (product) => {
        // Helper to normalize for secondary matching
        const norm = (name) => (name || '').toLowerCase().trim().replace(/\s+/g,' ');
        const parsePrice = (p) => {
            if (typeof p === 'number') return p;
            const num = parseFloat((p||'').toString().replace(/[^0-9.\-]+/g,''));
            return isNaN(num) ? 0 : num;
        };
        const targetId = product.id;
        let existingItem = cart.find(item => item.id === targetId);

        if (!existingItem) {
            // Attempt secondary merge by normalized name + numeric price
            const prodName = norm(product.name);
            const prodPrice = parsePrice(product.price);
            existingItem = cart.find(item => norm(item.name) === prodName && parsePrice(item.price) === prodPrice);
            if (existingItem) {
                // Reuse existing ID for consistency in future additions
                product.id = existingItem.id;
            }
        }

        if (existingItem) {
            existingItem.quantity += product.quantity || 1;
        } else {
            product.quantity = product.quantity || 1;
            cart.push(product);
        }
        
        saveCart();
        updateCartDisplay();
        
        // Show feedback
        showCartNotification(`Added ${product.name} to cart`);
        return cart;
    };
    
    // Remove item from cart
    const removeItem = (productId) => {
        cart = cart.filter(item => item.id !== productId);
        saveCart();
        updateCartDisplay();
        return cart;
    };
    
    // Update item quantity
    const updateQuantity = (productId, quantity) => {
        const item = cart.find(item => item.id === productId);
        
        if (item) {
            if (quantity <= 0) {
                // Remove item if quantity is zero or negative
                removeItem(productId);
            } else {
                item.quantity = quantity;
                saveCart();
                updateCartDisplay();
            }
        }
        return cart;
    };
    
    // Utility: currency formatter
    const formatCurrency = (value) => {
        const num = isNaN(value) ? 0 : Number(value);
        return `$${num.toFixed(2)}`;
    };

    // Calculate cart total
    const getTotal = () => {
        return cart.reduce((total, item) => {
            const price = parseFloat(item.price.replace(/[^0-9.-]+/g, ''));
            return total + (price * item.quantity);
        }, 0);
    };
    
    // Update cart UI
    const updateCartDisplay = () => {
        const cartCountElement = document.getElementById('cart-count');
        const cartItemsElement = document.getElementById('cart-items');
        const cartTotalElement = document.getElementById('cart-total');
        
        // Update cart count in header (always visible for clarity / accessibility)
        if (cartCountElement) {
            const totalItems = cart.reduce((count, item) => count + item.quantity, 0);
            cartCountElement.textContent = totalItems;
            cartCountElement.style.display = 'flex';
            cartCountElement.setAttribute('aria-label', `Cart items: ${totalItems}`);
        }
        
        // Update cart dropdown/modal if it exists
        if (cartItemsElement) {
            // Clear current items
            cartItemsElement.innerHTML = '';
            
            if (cart.length === 0) {
                cartItemsElement.innerHTML = '<div class="empty-cart">Your cart is empty</div>';
            } else {
                // Create a document fragment for better performance
                const fragment = document.createDocumentFragment();
                
                cart.forEach(item => {
                    const priceNum = parseFloat(item.price.toString().replace(/[^0-9.-]+/g,'')) || 0;
                    const lineTotal = priceNum * item.quantity;
                    const cartItem = document.createElement('div');
                    cartItem.className = 'cart-item';
                    cartItem.setAttribute('data-id', item.id);
                    cartItem.innerHTML = `
                        <div class="cart-item-image-wrap">
                            <img src="${item.image}" alt="${item.name}" />
                        </div>
                        <div class="cart-item-details">
                            <div class="cart-item-name">${item.name}</div>
                            <div class="cart-item-meta">
                                <span class="cart-item-price" aria-label="Unit price">${formatCurrency(priceNum)}</span>
                                <span class="cart-line-multiply" aria-hidden="true">×</span>
                                <span class="cart-item-qty" aria-label="Quantity">${item.quantity}</span>
                                <span class="cart-line-equals" aria-hidden="true">=</span>
                                <span class="cart-line-total" aria-label="Line total">${formatCurrency(lineTotal)}</span>
                            </div>
                        </div>
                        <div class="cart-item-controls" aria-label="Quantity controls for ${item.name}">
                            <button class="quantity-btn minus" data-action="decrement" data-id="${item.id}" aria-label="Decrease quantity of ${item.name}">−</button>
                            <span class="quantity" aria-live="polite">${item.quantity}</span>
                            <button class="quantity-btn plus" data-action="increment" data-id="${item.id}" aria-label="Increase quantity of ${item.name}">+</button>
                            <button class="remove-btn" data-action="remove" data-id="${item.id}" aria-label="Remove ${item.name} from cart">×</button>
                        </div>
                    `;
                    fragment.appendChild(cartItem);
                });
                
                cartItemsElement.appendChild(fragment);
            }
        }
        
        // Update total
        if (cartTotalElement) {
            const total = getTotal();
            cartTotalElement.textContent = formatCurrency(total);
        }
        // After rendering, adjust heights if cart open
        requestAnimationFrame(adjustCartHeights);
    };
    
    // Event delegation for cart item interactions
    document.addEventListener('click', (e) => {
        const target = e.target;
        if (!(target instanceof HTMLElement)) return;
        if (target.closest('#cart-dropdown')) {
            const action = target.getAttribute('data-action');
            const id = target.getAttribute('data-id');
            if (!action || !id) return;
            const item = cart.find(i => i.id === id);
            if (!item) return;
            if (action === 'increment') {
                updateQuantity(id, item.quantity + 1);
            } else if (action === 'decrement') {
                updateQuantity(id, item.quantity - 1);
            } else if (action === 'remove') {
                removeItem(id);
            }
        }
    });
    
    // Show cart notification
    const showCartNotification = (message) => {
        // Create notification element if it doesn't exist
        let notification = document.getElementById('cart-notification');
        
        if (!notification) {
            notification = document.createElement('div');
            notification.id = 'cart-notification';
            document.body.appendChild(notification);
        }
        
        // Set message and show
        notification.textContent = message;
        notification.classList.add('show');
        
        // Hide after 2 seconds
        setTimeout(() => {
            notification.classList.remove('show');
        }, 2000);
    };
    
    // Toggle cart visibility
    const toggleCart = (show) => {
        const cartDropdown = document.getElementById('cart-dropdown');
        const cartOverlay = document.getElementById('cart-overlay');
        
        if (!cartDropdown) return;
        
        if (show === undefined) {
            // Toggle if no state specified
            cartDropdown.classList.toggle('show');
            if (cartOverlay) cartOverlay.classList.toggle('show');
        } else if (show) {
            cartDropdown.classList.add('show');
            if (cartOverlay) cartOverlay.classList.add('show');
        } else {
            cartDropdown.classList.remove('show');
            if (cartOverlay) cartOverlay.classList.remove('show');
        }
        
        // Also update cart contents when showing
        if (cartDropdown.classList.contains('show')) {
            updateCartDisplay();
            // Disable scrolling on body when cart is open
            document.body.style.overflow = 'hidden';
            // Focus management & trap
            lastFocusedElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
            applyFocusTrap(cartDropdown);
            requestAnimationFrame(adjustCartHeights);
        } else {
            // Re-enable scrolling when cart is closed
            document.body.style.overflow = '';
            if (typeof focusTrapCleanup === 'function') focusTrapCleanup();
            // Restore focus
            setTimeout(() => {
                if (lastFocusedElement && document.contains(lastFocusedElement)) {
                    lastFocusedElement.focus();
                } else {
                    const toggleBtn = document.getElementById('cart-toggle');
                    if (toggleBtn) toggleBtn.focus();
                }
            }, 10);
        }
    };

    // Dynamically size cart items area based on header/footer
    const adjustCartHeights = () => {
        const dropdown = document.getElementById('cart-dropdown');
        if (!dropdown || !dropdown.classList.contains('show')) return;
        const panel = dropdown.querySelector('.cart-panel');
        const items = dropdown.querySelector('.cart-items');
        const header = dropdown.querySelector('.cart-header');
        const footer = dropdown.querySelector('.cart-footer');
        if (!panel || !items) return;
    const isMobile = window.innerWidth <= 600;
    const ratio = isMobile ? 0.9 : 0.92; // allow taller cart on mobile
    const viewportMax = Math.min(window.innerHeight * ratio, window.innerHeight - (isMobile ? 8 : 32));
        dropdown.style.maxHeight = viewportMax + 'px';
        const headerH = header ? header.offsetHeight : 0;
        const footerH = footer ? footer.offsetHeight : 0;
        const panelStyle = getComputedStyle(panel);
        const padTop = parseFloat(panelStyle.paddingTop) || 0;
        const padBottom = parseFloat(panelStyle.paddingBottom) || 0;
        const available = viewportMax - (headerH + footerH + padTop + padBottom);
        if (available > 120) {
            items.style.maxHeight = available + 'px';
        } else {
            items.style.maxHeight = '120px';
        }
    };

    // Apply focus trap within dialog
    const applyFocusTrap = (container) => {
        // Clean any existing trap first
        if (focusTrapCleanup) focusTrapCleanup();
        const FOCUSABLE = 'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';
        const focusables = Array.from(container.querySelectorAll(FOCUSABLE)).filter(el => el.offsetParent !== null);
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        // Initial focus
        if (first) first.focus();
        const handler = (e) => {
            if (e.key === 'Tab') {
                if (focusables.length === 0) {
                    e.preventDefault();
                    return;
                }
                if (e.shiftKey && document.activeElement === first) {
                    e.preventDefault();
                    last.focus();
                } else if (!e.shiftKey && document.activeElement === last) {
                    e.preventDefault();
                    first.focus();
                }
            } else if (e.key === 'Escape') {
                toggleCart(false);
            }
        };
        document.addEventListener('keydown', handler);
        focusTrapCleanup = () => {
            document.removeEventListener('keydown', handler);
            focusTrapCleanup = null;
        };
    };
    
    // Clear cart
    const clearCart = () => {
        cart = [];
        saveCart();
        updateCartDisplay();
    };
    
    // Public API
    return {
        init,
        addItem,
        removeItem,
        updateQuantity,
        getTotal,
        getCart: () => [...cart], // Return a copy of the cart array
        clearCart,
        toggleCart // expose popup toggle
        , openCart: () => toggleCart(true)
        , closeCart: () => toggleCart(false)
    };
})();

// Initialize cart when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const cleanupDuplicates = () => {
        const dropdowns = document.querySelectorAll('#cart-dropdown');
        if (dropdowns.length > 1) dropdowns.forEach((d,i)=>{ if(i>0) d.remove(); });
        const overlays = document.querySelectorAll('#cart-overlay');
        if (overlays.length > 1) overlays.forEach((o,i)=>{ if(i>0) o.remove(); });
    };
    // Initialize via public API
    if (ShoppingCart && typeof ShoppingCart.init === 'function') {
        ShoppingCart.init();
    }
        // Inject cart button if missing (ensures every page has it)
        if (!document.getElementById('cart-toggle')) {
                const headerRow = document.querySelector('.header-row');
                if (headerRow) {
                        const btn = document.createElement('div');
                        btn.id = 'cart-toggle';
                        btn.className = 'header-cart-button';
                        btn.innerHTML = '<span>🛒 Cart</span><span class="header-cart-count" id="cart-count">0</span>';
                        headerRow.appendChild(btn);
                }
        }
        // Inject popup structure if absent
        if (!document.getElementById('cart-dropdown')) {
                const wrapper = document.createElement('div');
                wrapper.innerHTML = `
                    <div class="cart-overlay" id="cart-overlay" tabindex="-1" aria-hidden="true"></div>
                    <div id="cart-dropdown" role="dialog" aria-modal="true" aria-labelledby="cart-title">
                        <div class="cart-panel">
                            <header class="cart-header">
                                <h3 id="cart-title">Your Cart</h3>
                                <button id="close-cart" class="close-btn" aria-label="Close cart">×</button>
                            </header>
                            <div id="cart-items" class="cart-items" aria-live="polite"></div>
                            <footer class="cart-footer" aria-label="Cart summary and checkout">
                                <div class="cart-summary-row">
                                    <span>Subtotal</span>
                                    <span id="cart-total">$0.00</span>
                                </div>
                                <p class="cart-note">Shipping & taxes calculated at checkout.</p>
                                <button id="checkout-btn" class="checkout-btn btn">Checkout</button>
                            </footer>
                        </div>
                    </div>`;
        document.body.appendChild(wrapper);
        cleanupDuplicates();
        }
    
    // Setup cart toggle button
    const cartToggle = document.getElementById('cart-toggle');
    if (cartToggle) {
        cartToggle.addEventListener('click', (e) => {
            e.preventDefault();
            ShoppingCart.toggleCart();
        });
    }
    
    // Setup close cart button
    const closeCartBtn = document.getElementById('close-cart');
    if (closeCartBtn) {
        closeCartBtn.addEventListener('click', () => {
            ShoppingCart.toggleCart(false);
        });
    }
    
    // Setup cart overlay for closing
    const cartOverlay = document.getElementById('cart-overlay');
    if (cartOverlay) {
        cartOverlay.addEventListener('click', () => {
            ShoppingCart.toggleCart(false);
        });
    }
    
    // Add keyboard support (ESC to close)
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            ShoppingCart.toggleCart(false);
        }
    });
    
    // Add event listeners to all "Add to Cart" buttons
    document.querySelectorAll('.add-to-cart').forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Find the product element (could be a card or a detail page)
            const productEl = button.closest('.product-card') || button.closest('.product-page');
            
            if (productEl) {
                // Build a stable ID so multiple clicks aggregate quantity
                let rawId = productEl.getAttribute('data-id') || productEl.getAttribute('data-product-id');
                const nameText = (productEl.getAttribute('data-product-name') || productEl.querySelector('h2, h4').textContent || '').trim();
                const priceText = (productEl.getAttribute('data-product-price') || productEl.querySelector('.price')?.textContent || '').trim();
                if (!rawId) {
                    const slugBase = nameText.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
                    const priceDigits = priceText.replace(/[^0-9]+/g,'');
                    rawId = `prod-${slugBase || 'item'}${priceDigits?'-'+priceDigits:''}`;
                    // Persist the generated id for future clicks
                    productEl.setAttribute('data-product-id', rawId);
                }
                const product = {
                    id: rawId,
                    name: nameText || 'Item',
                    price: priceText || '$0.00',
                    image: productEl.getAttribute('data-product-image') || productEl.querySelector('img')?.getAttribute('src') || '',
                    quantity: 1
                };
                ShoppingCart.addItem(product);
            }
        });
    });
    
    // Add checkout button event listener (final reference resolution inside DOMContentLoaded)
    const attachCheckout = () => {
        const checkoutBtn = document.getElementById('checkout-btn');
        if (checkoutBtn && !checkoutBtn.dataset.bound) {
            checkoutBtn.dataset.bound = '1';
            checkoutBtn.addEventListener('click', () => {
                alert('Thank you for your order!');
                if (typeof ShoppingCart.clearCart === 'function') ShoppingCart.clearCart();
                ShoppingCart.toggleCart(false);
            });
        }
    };
    attachCheckout();
    // Recalculate on resize & orientation changes
    window.addEventListener('resize', () => { if (document.getElementById('cart-dropdown')?.classList.contains('show')) adjustCartHeights(); });
    window.addEventListener('orientationchange', () => { if (document.getElementById('cart-dropdown')?.classList.contains('show')) adjustCartHeights(); });
});
}