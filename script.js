const root = document.documentElement;
const themeToggle = document.getElementById("themeToggle");
const toastContainer = document.getElementById("toast-container");
const redirectToastStorageKey = "stockflowRedirectToast";
const sharedUsersStorageKey = "users";
const legacyUsersStorageKey = "stockflowUsers";
const sharedProductsStorageKey = "products";
const legacyProductsStorageKeys = ["admin_products", "stockflowProducts"];
const sharedOrdersStorageKey = "orders";
const legacyOrdersStorageKey = "stockflowOrders";

function showToast(message, type = "info") {
    if (!toastContainer || !message) return;

    const toast = document.createElement("div");
    const normalizedType = ["success", "error", "info"].includes(type) ? type : "info";

    toast.className = `toast toast--${normalizedType}`;
    toast.setAttribute("role", "status");
    toast.textContent = message;
    toastContainer.appendChild(toast);

    window.setTimeout(() => {
        toast.classList.add("is-hiding");

        window.setTimeout(() => {
            toast.remove();
        }, 300);
    }, 3000);
}

function setRedirectToast(message, type = "info") {
    sessionStorage.setItem(
        redirectToastStorageKey,
        JSON.stringify({ message, type })
    );
}

function consumeRedirectToast() {
    const rawToast = sessionStorage.getItem(redirectToastStorageKey);

    if (!rawToast) return;

    sessionStorage.removeItem(redirectToastStorageKey);

    try {
        const toast = JSON.parse(rawToast);
        showToast(toast.message, toast.type || "info");
    } catch {
        showToast("Please login first", "info");
    }
}

function getRouteProtectedUser() {
    try {
        const user = JSON.parse(localStorage.getItem("loggedInUser"));
        return user && typeof user === "object" ? user : null;
    } catch {
        return null;
    }
}

function protectDashboardRoute() {
    const currentPage = window.location.pathname.split("/").pop().toLowerCase();
    const protectedAdminPages = new Set([
        "admin_dashboard.html",
        "admin_shop.html",
        "admin_orders.html",
        "admin_suppliers.html",
        "admin_profile.html"
    ]);

    if (!protectedAdminPages.has(currentPage)) {
        if (toastContainer) {
            consumeRedirectToast();
        }

        return;
    }

    const loggedInUser = getRouteProtectedUser();

    if (!loggedInUser || loggedInUser.role !== "admin") {
        setRedirectToast("Please login first", "info");
        window.location.replace("login.html");
        throw new Error("Unauthorized admin dashboard access.");
    }
}

protectDashboardRoute();

// ===== THEME =====
function applyTheme(theme) {
    const isLight = theme === "light";
    root.setAttribute("data-theme", isLight ? "light" : "dark");

    if (!themeToggle) return;

    const themeLabel = themeToggle.querySelector(".theme-toggle__label");

    if (themeLabel) {
        themeLabel.textContent = isLight ? "☀️" : "🌙";
    }

    themeToggle.setAttribute(
        "aria-label",
        isLight ? "Switch to dark mode" : "Switch to light mode"
    );
}

if (themeToggle) {
    const initialTheme =
        localStorage.getItem("theme") === "light" ? "light" : "dark";

    applyTheme(initialTheme);

    themeToggle.addEventListener("click", () => {
        const nextTheme =
            root.getAttribute("data-theme") === "light" ? "dark" : "light";

        localStorage.setItem("theme", nextTheme);
        applyTheme(nextTheme);
    });
}

// ===== COMMON =====
function getStoredArray(storageKey) {
    try {
        const parsedValue = JSON.parse(localStorage.getItem(storageKey));
        return Array.isArray(parsedValue) ? parsedValue : [];
    } catch {
        return [];
    }
}

function saveStoredArray(storageKey, value) {
    localStorage.setItem(storageKey, JSON.stringify(value));
}

function migrateLegacyArray(sharedKey, legacyKeys) {
    const sharedItems = getStoredArray(sharedKey);

    if (sharedItems.length > 0) {
        return sharedItems;
    }

    for (const legacyKey of legacyKeys) {
        const legacyItems = getStoredArray(legacyKey);

        if (legacyItems.length > 0) {
            saveStoredArray(sharedKey, legacyItems);
            return legacyItems;
        }
    }

    return [];
}

function getStoredUsers() {
    const users = migrateLegacyArray(sharedUsersStorageKey, [legacyUsersStorageKey]);
    return users.map((user) => normalizeUserRecord(user));
}

function normalizeUserRecord(user) {
    const normalizedUser = user && typeof user === "object" ? user : {};

    return {
        fullName: String(normalizedUser.fullName || "").trim(),
        email: String(normalizedUser.email || "").trim(),
        password: String(normalizedUser.password || ""),
        role: String(normalizedUser.role || "user"),
        phone: String(normalizedUser.phone || ""),
        profileImage: String(normalizedUser.profileImage || "")
    };
}

function saveUsers(users) {
    saveStoredArray(
        sharedUsersStorageKey,
        users.map((user) => normalizeUserRecord(user))
    );
}

function normalizeSharedProduct(product) {
    const normalizedProduct = product && typeof product === "object" ? product : {};
    const stock = Math.max(0, Number(normalizedProduct.stock || 0));

    return {
        id: String(normalizedProduct.id || `prd-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`),
        name: String(normalizedProduct.name || "").trim(),
        sku: String(normalizedProduct.sku || "").trim(),
        supplier: String(normalizedProduct.supplier || "").trim(),
        price: Math.max(0, Number(normalizedProduct.price || 0)),
        stock: stock,
        status: stock <= 10 ? "Low Stock" : "In Stock"
    };
}

function getStoredSharedProducts() {
    const products = migrateLegacyArray(sharedProductsStorageKey, legacyProductsStorageKeys);
    return products.map((product) => normalizeSharedProduct(product));
}

function saveSharedProducts(products) {
    saveStoredArray(
        sharedProductsStorageKey,
        products.map((product) => normalizeSharedProduct(product))
    );
}

function normalizeSharedOrder(order) {
    const normalizedOrder = order && typeof order === "object" ? order : {};
    const quantity = Math.max(1, Number(normalizedOrder.quantity || 1));
    const totalPrice = Math.max(
        0,
        Number(
            normalizedOrder.totalPrice
            ?? normalizedOrder.total
            ?? ((Number(normalizedOrder.price || 0) || 0) * quantity)
        )
    );
    const dateValue = normalizedOrder.date
        ? new Date(normalizedOrder.date).toISOString()
        : new Date().toISOString();

    return {
        id: String(normalizedOrder.id || `ORD${Date.now()}`),
        productId: String(normalizedOrder.productId || normalizedOrder.id || ""),
        productName: String(
            normalizedOrder.productName
            || (Array.isArray(normalizedOrder.items) && normalizedOrder.items[0]?.name)
            || normalizedOrder.name
            || "Product"
        ).trim(),
        quantity: quantity,
        totalPrice: totalPrice,
        user: String(normalizedOrder.user || normalizedOrder.customer || "").trim(),
        status: normalizeOrderStatus(normalizedOrder.status),
        date: dateValue
    };
}

function ensureDefaultAdminUser() {
    const users = getStoredUsers();
    const adminExists = users.some(
        (user) => typeof user?.email === "string"
            && user.email.toLowerCase() === "admin@gmail.com"
    );

    if (adminExists) return users;

    const updatedUsers = [
        ...users,
        {
            fullName: "Admin",
            email: "admin@gmail.com",
            password: "admin123",
            role: "admin",
            phone: "",
            profileImage: ""
        }
    ];

    saveUsers(updatedUsers);
    return updatedUsers;
}

function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

ensureDefaultAdminUser();

// ===== LOGIN =====
const loginForm = document.getElementById("loginForm");

if (loginForm) {
    const loginEmail = document.getElementById("loginEmail");
    const loginPassword = document.getElementById("loginPassword");
    const loginEmailError = document.getElementById("loginEmailError");
    const loginPasswordError = document.getElementById("loginPasswordError");
    const loginMessage = document.getElementById("loginMessage");

    function setLoginFieldError(input, errorElement, message) {
        errorElement.textContent = message;
        input.classList.toggle("input-error", Boolean(message));
    }

    function clearLoginState() {
        setLoginFieldError(loginEmail, loginEmailError, "");
        setLoginFieldError(loginPassword, loginPasswordError, "");
        loginMessage.textContent = "";
        loginMessage.className = "form-message";
    }

    function setLoginMessage(message, type) {
        loginMessage.textContent = message;
        loginMessage.className = "form-message";
        if (type) {
            loginMessage.classList.add(type === "success" ? "is-success" : "is-error");
        }
    }

    loginEmail.addEventListener("input", clearLoginState);
    loginPassword.addEventListener("input", clearLoginState);

    loginForm.addEventListener("submit", (event) => {
        event.preventDefault();
        clearLoginState();

        const email = loginEmail.value.trim();
        const password = loginPassword.value;
        let hasError = false;

        if (!email) {
            setLoginFieldError(loginEmail, loginEmailError, "Email is required.");
            hasError = true;
        } else if (!validateEmail(email)) {
            setLoginFieldError(loginEmail, loginEmailError, "Enter a valid email address.");
            hasError = true;
        }

        if (!password) {
            setLoginFieldError(loginPassword, loginPasswordError, "Password is required.");
            hasError = true;
        }

        if (hasError) {
            setLoginMessage("Please fix the highlighted fields and try again.", "error");
            return;
        }

        const users = ensureDefaultAdminUser();

        const matchedUser = users.find(
            (user) => user.email.toLowerCase() === email.toLowerCase()
        );

        // ❌ NOT REGISTERED
        if (!matchedUser) {
            setLoginFieldError(loginEmail, loginEmailError, "User not registered.");
            setLoginMessage("Please register first before logging in.", "error");
            return;
        }

        // ❌ WRONG PASSWORD
        if (matchedUser.password !== password) {
            setLoginFieldError(loginPassword, loginPasswordError, "Incorrect password.");
            setLoginMessage("Wrong password. Try again.", "error");
            return;
        }

        // ✅ SUCCESS
        setLoginMessage("", "");
        showToast("Login successful!", "success");

        // ✅ PRINT NAME + EMAIL
        console.log(`Logged in as: ${matchedUser.fullName} (${matchedUser.email})`);

        // OPTIONAL: store session
        localStorage.setItem("isLoggedIn", "true");
        localStorage.setItem("loggedInUser", JSON.stringify(matchedUser));

        setTimeout(() => {
            if (matchedUser.role === "admin") {
                window.location.href = "Admin_dashboard.html";
                return;
            }

            if (matchedUser.role === "shopkeeper") {
                window.location.href = "shop_dashboard.html";
                return;
            }

            window.location.href = "user_dashboard.html";
        }, 800);
    });
}

// ===== SIGNUP =====
const signupForm = document.getElementById("signupForm");

if (signupForm) {
    const formMessage = document.getElementById("formMessage");

    const fields = {
        fullName: {
            input: document.getElementById("fullName"),
            error: document.getElementById("fullNameError")
        },
        email: {
            input: document.getElementById("signupEmail"),
            error: document.getElementById("signupEmailError")
        },
        role: {
            input: document.getElementById("signupRole"),
            error: document.getElementById("signupRoleError")
        },
        password: {
            input: document.getElementById("signupPassword"),
            error: document.getElementById("signupPasswordError")
        },
        confirmPassword: {
            input: document.getElementById("confirmPassword"),
            error: document.getElementById("confirmPasswordError")
        }
    };

    function setSignupFieldError(fieldKey, message) {
        const field = fields[fieldKey];
        field.error.textContent = message;
        field.input.classList.toggle("input-error", Boolean(message));
    }

    function clearSignupState() {
        Object.keys(fields).forEach((key) => setSignupFieldError(key, ""));
        formMessage.textContent = "";
        formMessage.className = "form-message";
    }

    function setSignupMessage(message, type) {
        formMessage.textContent = message;
        formMessage.className = "form-message";
        if (type) {
            formMessage.classList.add(type === "success" ? "is-success" : "is-error");
        }
    }

    function validateName(name) {
        if (!name) return "Full name is required.";
        if (!/^[A-Za-z\s]+$/.test(name)) return "Use letters and spaces only.";
        return "";
    }

    function validatePassword(password) {
        if (!password) return "Password is required.";
        if (password.length < 6) return "Minimum 6 characters.";
        if (!/[A-Z]/.test(password)) return "1 uppercase required.";
        if (!/\d/.test(password)) return "1 number required.";
        return "";
    }

    function validateRole(role) {
        return ["user", "shopkeeper"].includes(role) ? "" : "Select a valid role.";
    }

    function validateConfirmPassword(password, confirm) {
        if (!confirm) return "Confirm your password.";
        if (password !== confirm) return "Passwords do not match.";
        return "";
    }

    Object.values(fields).forEach(({ input }) => {
        input.addEventListener("input", clearSignupState);
    });

    signupForm.addEventListener("submit", (event) => {
        event.preventDefault();
        clearSignupState();

        const fullName = fields.fullName.input.value.trim();
        const email = fields.email.input.value.trim();
        const role = fields.role.input.value;
        const password = fields.password.input.value;
        const confirm = fields.confirmPassword.input.value;

        const errors = {
            fullName: validateName(fullName),
            email: !email
                ? "Email is required."
                : !validateEmail(email)
                    ? "Enter a valid email."
                    : "",
            role: validateRole(role),
            password: validatePassword(password),
            confirmPassword: validateConfirmPassword(password, confirm)
        };

        Object.entries(errors).forEach(([key, msg]) => {
            setSignupFieldError(key, msg);
        });

        if (Object.values(errors).some(Boolean)) {
            setSignupMessage("Please fix the highlighted fields and try again.", "error");
            return;
        }

        const users = ensureDefaultAdminUser();

        if (users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
            setSignupFieldError("email", "Email already registered.");
            setSignupMessage("Use a different email or sign in.", "error");
            return;
        }

        users.push({
            fullName,
            email,
            password,
            role: ["user", "shopkeeper"].includes(role) ? role : "user",
            phone: "",
            profileImage: ""
        });
        saveUsers(users);

        setSignupMessage("", "");
        showToast("Account created successfully. Redirecting...", "success");
        signupForm.reset();
        fields.role.input.value = "user";

        setTimeout(() => {
            window.location.href = "index.html";
        }, 1200);
    });
}

// ===== ADMIN DASHBOARD =====
const sidebar = document.getElementById("sidebar");
const sidebarOverlay = document.getElementById("sidebarOverlay");
const menuToggle = document.getElementById("menuToggle");
const logoutButton = document.querySelector(".logout-button");
const dashboardNavLink = document.getElementById("dashboardNavLink");
const shopNavLink = document.getElementById("shopNavLink");
const ordersNavLink = document.getElementById("ordersNavLink");
const suppliersNavLink = document.getElementById("suppliersNavLink");
const adminProfileCard = document.getElementById("adminProfileCard");
const adminViewProfileButton = document.getElementById("adminViewProfileButton");
const adminSidebarAvatar = document.getElementById("adminSidebarAvatar");
const adminSidebarAvatarLetter = document.getElementById("adminSidebarAvatarLetter");
const adminSidebarName = document.getElementById("adminSidebarName");
const adminSidebarMeta = document.getElementById("adminSidebarMeta");
const adminProfileAvatar = document.getElementById("adminProfileAvatar");
const adminProfileAvatarLetter = document.getElementById("adminProfileAvatarLetter");
const adminProfileName = document.getElementById("adminProfileName");
const adminProfileEmail = document.getElementById("adminProfileEmail");
const adminProfileImageInput = document.getElementById("adminProfileImageInput");
const adminProfileFullNameInput = document.getElementById("adminProfileFullNameInput");
const adminProfileEmailInput = document.getElementById("adminProfileEmailInput");
const adminProfilePhoneInput = document.getElementById("adminProfilePhoneInput");
const adminProfileFeedbackMessage = document.getElementById("adminProfileFeedbackMessage");
const adminSaveProfileButton = document.getElementById("adminSaveProfileButton");
const adminProfileLogoutButton = document.getElementById("adminProfileLogoutButton");
const adminAddProductButton = document.getElementById("adminAddProductButton");
const adminInventorySearchInput = document.getElementById("adminInventorySearchInput");
const adminInventoryFilterSelect = document.getElementById("adminInventoryFilterSelect");
const adminInventoryTableBody = document.getElementById("adminInventoryTableBody");
const adminInventoryEmptyState = document.getElementById("adminInventoryEmptyState");
const adminInventoryEmptyMessage = document.getElementById("adminInventoryEmptyMessage");
const adminProductModalBackdrop = document.getElementById("adminProductModalBackdrop");
const adminProductModalTitle = document.getElementById("adminProductModalTitle");
const adminProductModalClose = document.getElementById("adminProductModalClose");
const adminProductModalCancel = document.getElementById("adminProductModalCancel");
const adminProductForm = document.getElementById("adminProductForm");
const adminProductFormSubmit = document.getElementById("adminProductFormSubmit");
const adminProductFormFeedback = document.getElementById("adminProductFormFeedback");
const adminProductNameInput = document.getElementById("adminProductNameInput");
const adminProductSkuInput = document.getElementById("adminProductSkuInput");
const adminProductSupplierInput = document.getElementById("adminProductSupplierInput");
const adminProductStockInput = document.getElementById("adminProductStockInput");
const adminProductPriceInput = document.getElementById("adminProductPriceInput");
const deleteModal = document.getElementById("deleteModal");
const deleteModalMessage = document.getElementById("deleteModalMessage");
const cancelDelete = document.getElementById("cancelDelete");
const confirmDelete = document.getElementById("confirmDelete");
const suppliersForm = document.getElementById("suppliersForm");
const supplierNameInput = document.getElementById("supplierNameInput");
const supplierSearchInput = document.getElementById("supplierSearchInput");
const supplierErrorMessage = document.getElementById("supplierErrorMessage");
const supplierSuccessMessage = document.getElementById("supplierSuccessMessage");
const ordersSearchInput = document.getElementById("ordersSearchInput");
const ordersFilterSelect = document.getElementById("ordersFilterSelect");
const ordersList = document.getElementById("ordersList");
const ordersEmptyState = document.getElementById("ordersEmptyState");
const ordersEmptyMessage = document.getElementById("ordersEmptyMessage");
const suppliersList = document.getElementById("suppliersList");
const suppliersEmptyState = document.getElementById("suppliersEmptyState");
const suppliersEmptyMessage = document.getElementById("suppliersEmptyMessage");
const sidebarNavLinks = Array.from(
    document.querySelectorAll(".sidebar__nav .nav-link")
);
const ordersStorageKey = sharedOrdersStorageKey;
const suppliersStorageKey = "stockflowSuppliers";
const adminProductsStorageKey = sharedProductsStorageKey;
const defaultSuppliers = [
    "Apple Supplier",
    "Samsung Supply",
    "Logitech Supplier",
    "HP Supplier",
    "Dell Distributors",
    "IKEA Supplier",
    "Boat Supplier",
    "Mi Supplier"
];
const defaultAdminProducts = [
    { id: "prd-1001", name: "Desk Lamp Pro", sku: "LMP-204", supplier: "Luma Supply", stock: 126, price: 49, status: "In Stock" },
    { id: "prd-1002", name: "Vision 4K TV", sku: "TV-811", supplier: "Northwave Media", stock: 18, price: 899, status: "In Stock" },
    { id: "prd-1003", name: "Ergo Office Chair", sku: "CHR-117", supplier: "FurniCore", stock: 64, price: 220, status: "In Stock" },
    { id: "prd-1004", name: "Portable Speaker X", sku: "SPK-392", supplier: "Pulse Audio", stock: 11, price: 129, status: "Low Stock" },
    { id: "prd-1005", name: "Air Purifier Mini", sku: "AIR-550", supplier: "PureNest", stock: 73, price: 159, status: "In Stock" }
];
let suppliers = [];
let adminProductEditingId = null;
let adminProductDeleteId = null;

function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (character) => {
        const entities = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        };

        return entities[character];
    });
}

function normalizeOrderStatus(status) {
    const normalizedStatus = String(status || "").toLowerCase();

    if (
        normalizedStatus === "pending" ||
        normalizedStatus === "approved" ||
        normalizedStatus === "rejected"
    ) {
        return normalizedStatus;
    }

    return "pending";
}

function getStoredOrders() {
    const rawOrders = migrateLegacyArray(ordersStorageKey, [legacyOrdersStorageKey]);
    return rawOrders.map((order) => normalizeSharedOrder(order));
}

function saveOrders(orders) {
    saveStoredArray(
        ordersStorageKey,
        orders.map((order) => normalizeSharedOrder(order))
    );
}

function getOrderStatusConfig(status) {
    const normalizedStatus = normalizeOrderStatus(status);

    if (normalizedStatus === "approved") {
        return {
            value: "approved",
            label: "Approved",
            badgeClass: "status-badge status-badge--success"
        };
    }

    if (normalizedStatus === "rejected") {
        return {
            value: "rejected",
            label: "Rejected",
            badgeClass: "status-badge status-badge--danger"
        };
    }

    return {
        value: "pending",
        label: "Pending",
        badgeClass: "status-badge status-badge--warning"
    };
}

function formatOrderDate(dateValue) {
    const parsedDate = new Date(dateValue);

    if (Number.isNaN(parsedDate.getTime())) {
        return escapeHtml(dateValue || "");
    }

    return parsedDate.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    });
}
function setActiveNavLink(activeLink) {
    if (!sidebarNavLinks.length) return;

    sidebarNavLinks.forEach((link) => {
        const isActive = link === activeLink;
        link.classList.toggle("active", isActive);
        link.classList.toggle("nav-link--active", isActive);

        if (isActive) {
            link.setAttribute("aria-current", "page");
        } else {
            link.removeAttribute("aria-current");
        }
    });
}

function getCurrentPageName() {
    return window.location.pathname.split("/").pop().toLowerCase();
}

function getLoggedInAdminUser() {
    const user = getRouteProtectedUser();
    return user && user.role === "admin" ? normalizeUserRecord(user) : null;
}

function updateAvatarDisplay(container, letterNode, name, profileImage) {
    if (!container) return;

    const displayName = String(name || "Admin").trim() || "Admin";
    const avatarLetter = displayName.charAt(0).toUpperCase();
    let image = container.querySelector("img");

    if (profileImage) {
        if (!image) {
            image = document.createElement("img");
            container.appendChild(image);
        }

        image.src = profileImage;
        image.alt = displayName;

        if (letterNode) {
            letterNode.hidden = true;
        }

        return;
    }

    if (image) {
        image.remove();
    }

    if (letterNode) {
        letterNode.textContent = avatarLetter;
        letterNode.hidden = false;
    }
}

function loadAdminSidebarProfile() {
    const currentUser = getLoggedInAdminUser();

    if (!currentUser) return;

    const fullName = currentUser.fullName || "Admin";
    const email = currentUser.email || "admin@gmail.com";

    if (adminSidebarName) {
        adminSidebarName.textContent = fullName;
    }

    if (adminSidebarMeta) {
        adminSidebarMeta.textContent = email;
    }

    updateAvatarDisplay(
        adminSidebarAvatar,
        adminSidebarAvatarLetter,
        fullName,
        currentUser.profileImage
    );
}

function showAdminProfileFeedback(message, type = "success") {
    if (!adminProfileFeedbackMessage) return;

    adminProfileFeedbackMessage.textContent = message || "";
    adminProfileFeedbackMessage.hidden = !message;
    adminProfileFeedbackMessage.classList.toggle("is-error", type === "error");
}

function loadAdminProfile() {
    const currentUser = getLoggedInAdminUser();

    if (!currentUser) return;

    const fullName = currentUser.fullName || "Admin";
    const email = currentUser.email || "admin@gmail.com";
    const phone = currentUser.phone || "";

    if (adminProfileName) {
        adminProfileName.textContent = fullName;
    }

    if (adminProfileEmail) {
        adminProfileEmail.textContent = email;
    }

    if (adminProfileFullNameInput) {
        adminProfileFullNameInput.value = fullName;
    }

    if (adminProfileEmailInput) {
        adminProfileEmailInput.value = email;
    }

    if (adminProfilePhoneInput) {
        adminProfilePhoneInput.value = phone;
        adminProfilePhoneInput.placeholder = phone || "Not added";
    }

    updateAvatarDisplay(
        adminProfileAvatar,
        adminProfileAvatarLetter,
        fullName,
        currentUser.profileImage
    );

    loadAdminSidebarProfile();
}

function syncActiveNav() {
    const currentPage = getCurrentPageName();
    const matchedLink = sidebarNavLinks.find((link) => {
        const href = (link.getAttribute("href") || "").trim().toLowerCase();

        if (!href || href === "#") {
            return false;
        }

        return href.split("#")[0] === currentPage;
    });

    setActiveNavLink(matchedLink || null);
}

function toggleSidebar(forceOpen) {
    if (!sidebar || !sidebarOverlay) return;

    const shouldOpen =
        typeof forceOpen === "boolean"
            ? forceOpen
            : !sidebar.classList.contains("is-open");

    sidebar.classList.toggle("is-open", shouldOpen);
    sidebarOverlay.classList.toggle("is-visible", shouldOpen);
}

if (menuToggle) {
    menuToggle.addEventListener("click", () => toggleSidebar());
}

if (sidebarOverlay) {
    sidebarOverlay.addEventListener("click", () => toggleSidebar(false));
}

sidebarNavLinks.forEach((link) => {
    link.addEventListener("click", () => {
        toggleSidebar(false);
    });
});

window.addEventListener("resize", () => {
    if (window.innerWidth > 980) {
        toggleSidebar(false);
    }
});

if (sidebarNavLinks.length) {
    syncActiveNav();
}

if (sidebar) {
    if (localStorage.getItem("isLoggedIn") !== "true") {
        window.location.href = "login.html";
    }
}

function logoutCurrentUser() {
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("loggedInUser");
    window.location.href = "login.html";
}

if (logoutButton) {
    logoutButton.addEventListener("click", logoutCurrentUser);
}

function openAdminProfilePage() {
    if (getCurrentPageName() === "admin_profile.html") {
        toggleSidebar(false);
        return;
    }

    window.location.href = "admin_profile.html";
}

if (adminProfileCard) {
    adminProfileCard.addEventListener("click", openAdminProfilePage);
    adminProfileCard.addEventListener("keydown", (event) => {
        if (event.key !== "Enter" && event.key !== " ") {
            return;
        }

        event.preventDefault();
        openAdminProfilePage();
    });
}

if (adminViewProfileButton) {
    adminViewProfileButton.addEventListener("click", (event) => {
        event.stopPropagation();
        openAdminProfilePage();
    });
}

if (adminProfileLogoutButton) {
    adminProfileLogoutButton.addEventListener("click", logoutCurrentUser);
}

function saveAdminProfile() {
    const currentUser = getLoggedInAdminUser();

    if (!currentUser) return;

    const fullName = adminProfileFullNameInput
        ? adminProfileFullNameInput.value.trim()
        : "";
    const email = adminProfileEmailInput
        ? adminProfileEmailInput.value.trim()
        : "";
    const phone = adminProfilePhoneInput
        ? adminProfilePhoneInput.value.trim()
        : "";

    if (!fullName || !email) {
        showAdminProfileFeedback("Name and email are required.", "error");
        return;
    }

    if (!validateEmail(email)) {
        showAdminProfileFeedback("Enter a valid email address.", "error");
        return;
    }

    const users = getStoredUsers();
    const currentEmail = String(currentUser.email || "").toLowerCase();
    const emailExists = users.some((user) =>
        String(user.email || "").toLowerCase() === email.toLowerCase()
        && String(user.email || "").toLowerCase() !== currentEmail
    );

    if (emailExists) {
        showAdminProfileFeedback("Email already exists.", "error");
        return;
    }

    const updatedUser = {
        ...currentUser,
        fullName,
        email,
        phone
    };

    const updatedUsers = users.map((user) =>
        String(user.email || "").toLowerCase() === currentEmail
            ? { ...user, fullName, email, phone }
            : user
    );

    saveUsers(updatedUsers);
    localStorage.setItem("loggedInUser", JSON.stringify(updatedUser));
    loadAdminProfile();
    showAdminProfileFeedback("Profile updated successfully.");
}

function uploadAdminProfileImage(event) {
    const file = event.target.files && event.target.files[0];
    const currentUser = getLoggedInAdminUser();

    if (!file || !currentUser) return;

    if (!file.type.startsWith("image/")) {
        showAdminProfileFeedback("Please choose a valid image file.", "error");
        event.target.value = "";
        return;
    }

    const reader = new FileReader();

    reader.addEventListener("load", () => {
        const imageData = typeof reader.result === "string" ? reader.result : "";
        const users = getStoredUsers();
        const currentEmail = String(currentUser.email || "").toLowerCase();
        const updatedUser = {
            ...currentUser,
            profileImage: imageData
        };
        const updatedUsers = users.map((user) =>
            String(user.email || "").toLowerCase() === currentEmail
                ? { ...user, profileImage: imageData }
                : user
        );

        saveUsers(updatedUsers);
        localStorage.setItem("loggedInUser", JSON.stringify(updatedUser));
        loadAdminProfile();
        showAdminProfileFeedback("Profile image updated successfully.");
        event.target.value = "";
    });

    reader.readAsDataURL(file);
}

if (adminSaveProfileButton) {
    adminSaveProfileButton.addEventListener("click", saveAdminProfile);
}

if (adminProfileImageInput) {
    adminProfileImageInput.addEventListener("change", uploadAdminProfileImage);
}

[adminProfileFullNameInput, adminProfileEmailInput, adminProfilePhoneInput].forEach((input) => {
    if (!input) return;

    input.addEventListener("input", () => {
        showAdminProfileFeedback("");
    });
});

loadAdminSidebarProfile();
loadAdminProfile();

if (adminProfilePhoneInput) {
    adminProfilePhoneInput.addEventListener("input", () => {
        adminProfilePhoneInput.value = adminProfilePhoneInput.value.replace(/[^0-9+\-\s()]/g, "");
    });
}

function normalizeAdminProduct(product) {
    const normalizedStock = Math.max(0, Number(product?.stock || 0));
    const normalizedPrice = Math.max(0, Number(product?.price || 0));

    return {
        id: String(product?.id || `prd-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`),
        name: String(product?.name || "").trim(),
        sku: String(product?.sku || "").trim(),
        supplier: String(product?.supplier || "").trim(),
        stock: normalizedStock,
        price: normalizedPrice,
        status: normalizedStock <= 10 ? "Low Stock" : "In Stock"
    };
}

function getStoredAdminProducts() {
    const rawProducts = getStoredSharedProducts();
    return rawProducts.map((product) => normalizeAdminProduct(product));
}

function saveAdminProducts(products) {
    saveSharedProducts(products.map((product) => normalizeAdminProduct(product)));
}

function ensureAdminProducts() {
    const products = getStoredAdminProducts();

    if (products.length > 0) {
        return products;
    }

    saveAdminProducts(defaultAdminProducts);
    return getStoredAdminProducts();
}

function getAdminProductStatusConfig(stock) {
    const normalizedStock = Math.max(0, Number(stock || 0));

    if (normalizedStock <= 10) {
        return {
            label: "Low Stock",
            className: "status-badge status-badge--warning"
        };
    }

    return {
        label: "In Stock",
        className: "status-badge status-badge--success"
    };
}

function formatAdminPrice(price) {
    return `$${Number(price || 0).toFixed(2)}`;
}

function escapeAdminProductValue(value) {
    return escapeHtml(value);
}

function showAdminProductFormFeedback(message) {
    if (!adminProductFormFeedback) return;

    adminProductFormFeedback.textContent = message || "";
    adminProductFormFeedback.hidden = !message;
}

function setAdminModalOpen(backdrop, isOpen) {
    if (!backdrop) return;

    backdrop.hidden = !isOpen;
    document.body.style.overflow = isOpen ? "hidden" : "";
}

function closeAdminProductModal() {
    adminProductEditingId = null;
    showAdminProductFormFeedback("");

    if (adminProductForm) {
        adminProductForm.reset();
    }

    setAdminModalOpen(adminProductModalBackdrop, false);
}

function openAdminProductModal(mode, product) {
    const isEditMode = mode === "edit" && product;

    adminProductEditingId = isEditMode ? product.id : null;

    if (adminProductModalTitle) {
        adminProductModalTitle.textContent = isEditMode ? "Edit Product" : "Add Product";
    }

    if (adminProductFormSubmit) {
        adminProductFormSubmit.textContent = isEditMode ? "Save Changes" : "Save Product";
    }

    if (adminProductNameInput) {
        adminProductNameInput.value = isEditMode ? product.name : "";
    }

    if (adminProductSkuInput) {
        adminProductSkuInput.value = isEditMode ? product.sku : "";
    }

    if (adminProductSupplierInput) {
        adminProductSupplierInput.value = isEditMode ? product.supplier : "";
    }

    if (adminProductStockInput) {
        adminProductStockInput.value = isEditMode ? String(product.stock) : "";
    }

    if (adminProductPriceInput) {
        adminProductPriceInput.value = isEditMode ? String(product.price) : "";
    }

    showAdminProductFormFeedback("");
    setAdminModalOpen(adminProductModalBackdrop, true);
    adminProductNameInput?.focus();
}

function closeAdminDeleteModal() {
    adminProductDeleteId = null;
    if (deleteModal) {
        deleteModal.hidden = true;
        deleteModal.style.display = "none";
        deleteModal.dataset.id = "";
    }

    document.body.style.overflow = "";
}

function openAdminDeleteModal(product) {
    if (!product) return;

    adminProductDeleteId = product.id;

    if (deleteModalMessage) {
        deleteModalMessage.textContent = `Are you sure you want to delete "${product.name}"?`;
    }

    if (deleteModal) {
        deleteModal.dataset.id = product.id;
        deleteModal.hidden = false;
        deleteModal.style.display = "flex";
    }

    document.body.style.overflow = "hidden";
}

function renderAdminInventory(newlyAddedId) {
    if (!adminInventoryTableBody || !adminInventoryEmptyState) return;

    const searchValue = adminInventorySearchInput
        ? adminInventorySearchInput.value.trim().toLowerCase()
        : "";
    const selectedStatus = adminInventoryFilterSelect
        ? adminInventoryFilterSelect.value
        : "all";
    const products = ensureAdminProducts();
    const filteredProducts = products.filter((product) => {
        const matchesSearch = product.name.toLowerCase().includes(searchValue);
        const matchesFilter = selectedStatus === "all" || product.status === selectedStatus;
        return matchesSearch && matchesFilter;
    });

    adminInventoryTableBody.innerHTML = filteredProducts
        .map((product) => {
            const statusConfig = getAdminProductStatusConfig(product.stock);
            const isNew = newlyAddedId && newlyAddedId === product.id ? " is-new" : "";

            return `
                <tr class="${isNew.trim()}" data-admin-product-id="${escapeAdminProductValue(product.id)}">
                    <td>${escapeAdminProductValue(product.name)}</td>
                    <td>${escapeAdminProductValue(product.sku)}</td>
                    <td>${escapeAdminProductValue(product.supplier)}</td>
                    <td>${product.stock}</td>
                    <td>${formatAdminPrice(product.price)}</td>
                    <td><span class="${statusConfig.className}">${statusConfig.label}</span></td>
                    <td>
                        <div class="table-actions">
                            <button class="table-action table-action--edit" type="button" data-admin-product-action="edit" data-admin-product-id="${escapeAdminProductValue(product.id)}">Edit</button>
                            <button class="table-action table-action--delete" type="button" data-admin-product-action="delete" data-admin-product-id="${escapeAdminProductValue(product.id)}">Delete</button>
                        </div>
                    </td>
                </tr>
            `;
        })
        .join("");

    const hasProducts = filteredProducts.length > 0;
    adminInventoryTableBody.parentElement.parentElement.hidden = !hasProducts;
    adminInventoryEmptyState.hidden = hasProducts;

    if (adminInventoryEmptyMessage) {
        adminInventoryEmptyMessage.textContent =
            searchValue || selectedStatus !== "all"
                ? "No products match your search or filter."
                : "No products available.";
    }
}

function handleAdminProductSubmit(event) {
    event.preventDefault();

    const name = adminProductNameInput ? adminProductNameInput.value.trim() : "";
    const sku = adminProductSkuInput ? adminProductSkuInput.value.trim() : "";
    const supplier = adminProductSupplierInput ? adminProductSupplierInput.value.trim() : "";
    const stock = adminProductStockInput ? Number(adminProductStockInput.value) : NaN;
    const price = adminProductPriceInput ? Number(adminProductPriceInput.value) : NaN;

    if (!name || !sku || !supplier) {
        showAdminProductFormFeedback("Name, SKU, and supplier are required.");
        return;
    }

    if (!Number.isFinite(stock) || stock < 0) {
        showAdminProductFormFeedback("Enter a valid stock value.");
        return;
    }

    if (!Number.isFinite(price) || price < 0) {
        showAdminProductFormFeedback("Enter a valid price.");
        return;
    }

    const products = ensureAdminProducts();
    const normalizedSku = sku.toLowerCase();
    const duplicateSku = products.some((product) =>
        product.sku.toLowerCase() === normalizedSku && product.id !== adminProductEditingId
    );

    if (duplicateSku) {
        showAdminProductFormFeedback("SKU already exists. Use a unique SKU.");
        return;
    }

    const nextProduct = normalizeAdminProduct({
        id: adminProductEditingId || undefined,
        name,
        sku,
        supplier,
        stock,
        price
    });

    const updatedProducts = adminProductEditingId
        ? products.map((product) => (product.id === adminProductEditingId ? nextProduct : product))
        : [nextProduct, ...products];

    saveAdminProducts(updatedProducts);
    closeAdminProductModal();
    renderAdminInventory(adminProductEditingId ? "" : nextProduct.id);
}

function deleteAdminProduct() {
    if (!adminProductDeleteId) return;

    const row = adminInventoryTableBody?.querySelector(
        `[data-admin-product-id="${CSS.escape(adminProductDeleteId)}"]`
    );

    const removeProduct = () => {
        const updatedProducts = ensureAdminProducts().filter(
            (product) => product.id !== adminProductDeleteId
        );
        saveAdminProducts(updatedProducts);
        closeAdminDeleteModal();
        renderAdminInventory();
    };

    if (!row) {
        removeProduct();
        return;
    }

    row.classList.add("is-removing");
    window.setTimeout(removeProduct, 220);
}

if (adminAddProductButton) {
    adminAddProductButton.addEventListener("click", () => {
        openAdminProductModal("add");
    });
}

if (adminProductForm) {
    adminProductForm.addEventListener("submit", handleAdminProductSubmit);
}

if (adminProductModalClose) {
    adminProductModalClose.addEventListener("click", closeAdminProductModal);
}

if (adminProductModalCancel) {
    adminProductModalCancel.addEventListener("click", closeAdminProductModal);
}

if (cancelDelete) {
    cancelDelete.addEventListener("click", closeAdminDeleteModal);
}

if (confirmDelete) {
    confirmDelete.addEventListener("click", () => {
        if (deleteModal?.dataset.id) {
            adminProductDeleteId = deleteModal.dataset.id;
        }

        deleteAdminProduct();
    });
}

if (adminProductModalBackdrop) {
    adminProductModalBackdrop.addEventListener("click", (event) => {
        if (event.target === adminProductModalBackdrop) {
            closeAdminProductModal();
        }
    });
}

if (deleteModal) {
    deleteModal.addEventListener("click", (event) => {
        if (event.target === deleteModal) {
            closeAdminDeleteModal();
        }
    });
}

if (adminInventorySearchInput) {
    adminInventorySearchInput.addEventListener("input", () => {
        renderAdminInventory();
    });
}

if (adminInventoryFilterSelect) {
    adminInventoryFilterSelect.addEventListener("change", () => {
        renderAdminInventory();
    });
}

[
    adminProductNameInput,
    adminProductSkuInput,
    adminProductSupplierInput,
    adminProductStockInput,
    adminProductPriceInput
].forEach((input) => {
    if (!input) return;

    input.addEventListener("input", () => {
        showAdminProductFormFeedback("");
    });
});

if (adminInventoryTableBody) {
    ensureAdminProducts();
    renderAdminInventory();

    adminInventoryTableBody.addEventListener("click", (event) => {
        const actionButton = event.target.closest("[data-admin-product-action]");

        if (!actionButton) return;

        const action = actionButton.getAttribute("data-admin-product-action") || "";
        const productId = actionButton.getAttribute("data-admin-product-id") || "";
        const product = ensureAdminProducts().find((item) => item.id === productId);

        if (!product) return;

        if (action === "edit") {
            openAdminProductModal("edit", product);
            return;
        }

        if (action === "delete") {
            openAdminDeleteModal(product);
        }
    });
}

window.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;

    if (adminProductModalBackdrop && !adminProductModalBackdrop.hidden) {
        closeAdminProductModal();
    }

    if (deleteModal && !deleteModal.hidden) {
        closeAdminDeleteModal();
    }
});

function normalizeSupplierName(name) {
    return name.trim().replace(/\s+/g, " ");
}

function escapeSupplierName(name) {
    return name.replace(/[&<>"']/g, (character) => {
        const entities = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        };

        return entities[character];
    });
}

function getSupplierInitials(name) {
    return name
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part.charAt(0).toUpperCase())
        .join("");
}

function saveSuppliers() {
    localStorage.setItem(suppliersStorageKey, JSON.stringify(suppliers));
}

function loadSuppliers() {
    const rawSuppliers = localStorage.getItem(suppliersStorageKey);

    if (rawSuppliers === null) {
        suppliers = [...defaultSuppliers];
        saveSuppliers();
        return;
    }

    try {
        const storedSuppliers = JSON.parse(rawSuppliers);
        suppliers = Array.isArray(storedSuppliers)
            ? storedSuppliers.filter((supplier) => typeof supplier === "string")
            : [];
    } catch {
        suppliers = [...defaultSuppliers];
        saveSuppliers();
    }
}

function showSupplierMessage(element, message) {
    if (!element) return;

    if (message) {
        element.textContent = message;
        element.hidden = false;
        return;
    }

    element.textContent = "";
    element.hidden = true;
}

function clearSupplierMessages() {
    showSupplierMessage(supplierErrorMessage, "");
    showSupplierMessage(supplierSuccessMessage, "");
}

function renderSuppliers() {
    if (!suppliersList || !suppliersEmptyState) return;

    const searchValue = supplierSearchInput
        ? normalizeSupplierName(supplierSearchInput.value).toLowerCase()
        : "";

    const filteredSuppliers = suppliers.filter((supplier) =>
        supplier.toLowerCase().includes(searchValue)
    );

    suppliersList.innerHTML = filteredSuppliers
        .map((supplier) => {
            const escapedSupplierName = escapeSupplierName(supplier);
            return `
                <article class="supplier-item" data-supplier-name="${escapedSupplierName}">
                    <div class="supplier-item__main">
                        <span class="supplier-item__avatar" aria-hidden="true">${getSupplierInitials(supplier)}</span>
                        <p class="supplier-item__name">${escapedSupplierName}</p>
                    </div>
                    <div class="supplier-item__actions">
                        <button
                            class="table-action table-action--delete"
                            type="button"
                            data-delete-supplier="${escapedSupplierName}"
                        >
                            Delete
                        </button>
                    </div>
                </article>
            `;
        })
        .join("");

    const hasSuppliersToShow = filteredSuppliers.length > 0;
    const hasSearchValue = Boolean(searchValue);
    const shouldShowEmptyState = !hasSuppliersToShow;

    suppliersList.hidden = shouldShowEmptyState;
    suppliersEmptyState.hidden = !shouldShowEmptyState;

    if (suppliersEmptyMessage) {
        suppliersEmptyMessage.textContent =
            suppliers.length === 0
                ? "No suppliers added yet"
                : hasSearchValue
                    ? "No suppliers match your search"
                    : "No suppliers added yet";
    }
}

function addSupplier(name) {
    const normalizedName = normalizeSupplierName(name);

    if (!normalizedName) {
        showSupplierMessage(supplierErrorMessage, "Supplier name is required.");
        showSupplierMessage(supplierSuccessMessage, "");
        supplierNameInput?.focus();
        return;
    }

    const isDuplicate = suppliers.some(
        (supplier) => supplier.toLowerCase() === normalizedName.toLowerCase()
    );

    if (isDuplicate) {
        showSupplierMessage(supplierErrorMessage, "Supplier name already exists.");
        showSupplierMessage(supplierSuccessMessage, "");
        supplierNameInput?.focus();
        return;
    }

    suppliers.unshift(normalizedName);
    saveSuppliers();
    renderSuppliers();
    showSupplierMessage(supplierErrorMessage, "");
    showSupplierMessage(supplierSuccessMessage, "Supplier added successfully.");

    if (supplierNameInput) {
        supplierNameInput.value = "";
        supplierNameInput.focus();
    }
}

function deleteSupplier(name) {
    const supplierName = normalizeSupplierName(name);
    const shouldDelete = window.confirm(`Are you sure you want to delete "${supplierName}"?`);

    if (!shouldDelete) return;

    const supplierCard = suppliersList?.querySelector(
        `[data-supplier-name="${CSS.escape(supplierName)}"]`
    );

    const removeSupplier = () => {
        suppliers = suppliers.filter((supplier) => supplier !== supplierName);
        saveSuppliers();
        renderSuppliers();
        showSupplierMessage(supplierSuccessMessage, "Supplier deleted successfully.");
        showSupplierMessage(supplierErrorMessage, "");
    };

    if (!supplierCard) {
        removeSupplier();
        return;
    }

    supplierCard.classList.add("is-removing");
    window.setTimeout(removeSupplier, 260);
}

if (suppliersForm) {
    loadSuppliers();
    renderSuppliers();

    suppliersForm.addEventListener("submit", (event) => {
        event.preventDefault();
        clearSupplierMessages();
        addSupplier(supplierNameInput?.value || "");
    });
}

if (supplierNameInput) {
    supplierNameInput.addEventListener("input", () => {
        showSupplierMessage(supplierErrorMessage, "");
    });
}

if (supplierSearchInput) {
    supplierSearchInput.addEventListener("input", renderSuppliers);
}

if (suppliersList) {
    suppliersList.addEventListener("click", (event) => {
        const deleteButton = event.target.closest("[data-delete-supplier]");

        if (!deleteButton) return;

        deleteSupplier(deleteButton.getAttribute("data-delete-supplier") || "");
    });
}

function renderOrders() {
    if (!ordersList || !ordersEmptyState) return;

    const searchValue = ordersSearchInput
        ? ordersSearchInput.value.trim().toLowerCase()
        : "";
    const selectedStatus = ordersFilterSelect
        ? ordersFilterSelect.value.toLowerCase()
        : "all";

    const orders = getStoredOrders()
        .slice()
        .reverse()
        .filter((order) => {
            const status = normalizeOrderStatus(order.status);
            const matchesStatus =
                selectedStatus === "all" || status === selectedStatus;
            const searchTarget = [
                order.id,
                order.date,
                status,
                order.totalPrice,
                order.productName,
                order.user
            ]
                .join(" ")
                .toLowerCase();

            return matchesStatus && searchTarget.includes(searchValue);
        });

    ordersList.innerHTML = orders
        .map((order) => {
            const status = getOrderStatusConfig(order.status);
            const isResolved = status.value !== "pending";
            const escapedOrderId = escapeHtml(order.id || "");
            const totalAmount = Number(order.totalPrice || 0).toLocaleString("en-IN");

            return `
                <article class="order-item" data-order-id="${escapedOrderId}">
                    <div class="order-item__content">
                        <div class="order-item__heading">
                            <h4>${escapedOrderId}</h4>
                            <span class="order-item__type">sale</span>
                            <span class="${status.badgeClass}">${status.label}</span>
                        </div>
                        <div class="order-item__meta">
                            <strong>Rs ${totalAmount}</strong>
                            <span>${escapeHtml(order.productName || "Product")} • ${formatOrderDate(order.date)}</span>
                        </div>
                    </div>
                    <div class="order-item__actions">
                        <button
                            class="table-action table-action--neutral"
                            type="button"
                            data-order-action="approve"
                            data-order-id="${escapedOrderId}"
                            ${isResolved ? "disabled" : ""}
                        >
                            Approve
                        </button>
                        <button
                            class="table-action table-action--reject"
                            type="button"
                            data-order-action="reject"
                            data-order-id="${escapedOrderId}"
                            ${isResolved ? "disabled" : ""}
                        >
                            Reject
                        </button>
                    </div>
                </article>
            `;
        })
        .join("");

    const hasOrders = orders.length > 0;
    ordersList.hidden = !hasOrders;
    ordersEmptyState.hidden = hasOrders;

    if (ordersEmptyMessage) {
        ordersEmptyMessage.textContent = searchValue || selectedStatus !== "all"
            ? "No orders match your filters."
            : "No orders available.";
    }
}

function updateOrderStatus(orderId, nextStatus) {
    const normalizedNextStatus = normalizeOrderStatus(nextStatus);
    const orders = getStoredOrders();
    const orderIndex = orders.findIndex((order) => order.id === orderId);

    if (orderIndex === -1) return;

    const currentOrder = orders[orderIndex];

    if (normalizeOrderStatus(currentOrder.status) !== "pending") {
        return;
    }

    if (normalizedNextStatus === "approved") {
        const products = getStoredAdminProducts();
        const productIndex = products.findIndex((product) =>
            product.id === currentOrder.productId
            || product.name === currentOrder.productName
        );

        if (productIndex !== -1) {
            const currentProduct = products[productIndex];
            const reducedStock = Math.max(0, Number(currentProduct.stock || 0) - Number(currentOrder.quantity || 0));

            products[productIndex] = normalizeAdminProduct({
                ...currentProduct,
                stock: reducedStock
            });

            saveAdminProducts(products);
        }
    }

    orders[orderIndex] = {
        ...currentOrder,
        status: normalizedNextStatus
    };

    saveOrders(orders);
    renderOrders();

    const updatedCard = ordersList?.querySelector(
        `[data-order-id="${CSS.escape(orderId)}"]`
    );

    if (updatedCard) {
        updatedCard.classList.add("is-status-updated");
        window.setTimeout(() => {
            updatedCard.classList.remove("is-status-updated");
        }, 550);
    }
}

if (ordersSearchInput) {
    ordersSearchInput.addEventListener("input", renderOrders);
}

if (ordersFilterSelect) {
    ordersFilterSelect.addEventListener("change", renderOrders);
}

if (ordersList) {
    renderOrders();

    ordersList.addEventListener("click", (event) => {
        const actionButton = event.target.closest("[data-order-action]");

        if (!actionButton || actionButton.disabled) return;

        const orderId = actionButton.getAttribute("data-order-id") || "";
        const action = actionButton.getAttribute("data-order-action") || "";

        if (action === "approve") {
            updateOrderStatus(orderId, "approved");
            return;
        }

        if (action === "reject") {
            updateOrderStatus(orderId, "rejected");
        }
    });
}

window.addEventListener("storage", () => {
    location.reload();
});

function createDashboardCharts() {
    if (typeof Chart === "undefined") return;

    const sharedOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                labels: {
                    color: "#c8d1f0",
                    usePointStyle: true,
                    boxWidth: 10
                }
            }
        },
        scales: {
            x: {
                ticks: { color: "#8f9ac0" },
                grid: { color: "rgba(255, 255, 255, 0.05)" }
            },
            y: {
                ticks: { color: "#8f9ac0" },
                grid: { color: "rgba(255, 255, 255, 0.05)" }
            }
        }
    };

    const salesCanvas = document.getElementById("salesPurchasesChart");
    if (salesCanvas) {
        new Chart(salesCanvas, {
            type: "bar",
            data: {
                labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
                datasets: [
                    {
                        label: "Sales",
                        data: [18, 24, 21, 28, 31, 35],
                        backgroundColor: "rgba(136, 92, 255, 0.85)",
                        borderRadius: 10,
                        barThickness: 14
                    },
                    {
                        label: "Purchases",
                        data: [12, 16, 15, 20, 19, 23],
                        backgroundColor: "rgba(24, 200, 255, 0.8)",
                        borderRadius: 10,
                        barThickness: 14
                    }
                ]
            },
            options: sharedOptions
        });
    }

    const revenueCanvas = document.getElementById("revenueTrendChart");
    if (revenueCanvas) {
        new Chart(revenueCanvas, {
            type: "line",
            data: {
                labels: ["Week 1", "Week 2", "Week 3", "Week 4", "Week 5", "Week 6"],
                datasets: [
                    {
                        label: "Revenue",
                        data: [12000, 14800, 13600, 17200, 19400, 22100],
                        borderColor: "#18c8ff",
                        backgroundColor: "rgba(24, 200, 255, 0.18)",
                        fill: true,
                        tension: 0.38,
                        pointRadius: 4,
                        pointHoverRadius: 6,
                        pointBackgroundColor: "#ffffff",
                        pointBorderColor: "#18c8ff",
                        pointBorderWidth: 2
                    }
                ]
            },
            options: sharedOptions
        });
    }

    const categoryCanvas = document.getElementById("categoryDistributionChart");
    if (categoryCanvas) {
        const categoryContext = categoryCanvas.getContext("2d");

        const donutGradientA = categoryContext.createLinearGradient(0, 0, 220, 220);
        donutGradientA.addColorStop(0, "#475569");
        donutGradientA.addColorStop(1, "#334155");

        const donutGradientB = categoryContext.createLinearGradient(0, 0, 220, 220);
        donutGradientB.addColorStop(0, "#4f46e5");
        donutGradientB.addColorStop(1, "#4338ca");

        const donutGradientC = categoryContext.createLinearGradient(0, 0, 220, 220);
        donutGradientC.addColorStop(0, "#0ea5e9");
        donutGradientC.addColorStop(1, "#0284c7");

        const donutGradientD = categoryContext.createLinearGradient(0, 0, 220, 220);
        donutGradientD.addColorStop(0, "#10b981");
        donutGradientD.addColorStop(1, "#059669");

        new Chart(categoryCanvas, {
            type: "doughnut",
            data: {
                labels: ["Electronics", "Fashion", "Groceries", "Accessories"],
                datasets: [
                    {
                        data: [38, 24, 18, 20],
                        backgroundColor: [
                            donutGradientA,
                            donutGradientB,
                            donutGradientC,
                            donutGradientD
                        ],
                        hoverBackgroundColor: [
                            "#526277",
                            "#4f46e5",
                            "#0ea5e9",
                            "#10b981"
                        ],
                        borderWidth: 0,
                        hoverOffset: 6,
                        spacing: 2
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                layout: {
                    padding: {
                        top: 12,
                        right: 16,
                        bottom: 2,
                        left: 16
                    }
                },
                cutout: "75%",
                plugins: {
                    legend: {
                        position: "bottom",
                        align: "center",
                        labels: {
                            color: "#cbd5f5",
                            usePointStyle: true,
                            pointStyle: "circle",
                            boxWidth: 9,
                            boxHeight: 9,
                            padding: 24,
                            font: {
                                size: 11,
                                weight: "500"
                            }
                        }
                    }
                }
            }
        });
    }
}

createDashboardCharts();

function setupRevealSections() {
    const revealSections = document.querySelectorAll(".reveal-section");

    if (!revealSections.length) return;

    if (typeof IntersectionObserver === "undefined") {
        revealSections.forEach((section) => section.classList.add("is-visible"));
        return;
    }

    const revealObserver = new IntersectionObserver(
        (entries, observer) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;

                entry.target.classList.add("is-visible");
                observer.unobserve(entry.target);
            });
        },
        {
            threshold: 0.18,
            rootMargin: "0px 0px -40px 0px"
        }
    );

    revealSections.forEach((section) => revealObserver.observe(section));
}

setupRevealSections();
