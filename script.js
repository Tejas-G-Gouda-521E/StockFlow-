const root = document.documentElement;
const themeToggle = document.getElementById("themeToggle");

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
function getStoredUsers() {
    try {
        const users = JSON.parse(localStorage.getItem("stockflowUsers"));
        return Array.isArray(users) ? users : [];
    } catch {
        return [];
    }
}

function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

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

        const users = getStoredUsers();

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
        setLoginMessage("Login successful!", "success");

        // ✅ PRINT NAME + EMAIL
        console.log(`Logged in as: ${matchedUser.fullName} (${matchedUser.email})`);

        // OPTIONAL: store session
        localStorage.setItem("isLoggedIn", "true");
        localStorage.setItem("loggedInUser", email);

        setTimeout(() => {
            window.location.href = "Admin_dashboard.html";
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
        const password = fields.password.input.value;
        const confirm = fields.confirmPassword.input.value;

        const errors = {
            fullName: validateName(fullName),
            email: !email
                ? "Email is required."
                : !validateEmail(email)
                    ? "Enter a valid email."
                    : "",
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

        const users = getStoredUsers();

        if (users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
            setSignupFieldError("email", "Email already registered.");
            setSignupMessage("Use a different email or sign in.", "error");
            return;
        }

        users.push({ fullName, email, password });
        localStorage.setItem("stockflowUsers", JSON.stringify(users));

        setSignupMessage("Account created successfully. Redirecting...", "success");
        signupForm.reset();

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
const inventorySection = document.getElementById("inventorySection");
const ordersSection = document.getElementById("ordersSection");
const suppliersSection = document.getElementById("suppliersSection");
const suppliersForm = document.getElementById("suppliersForm");
const supplierNameInput = document.getElementById("supplierNameInput");
const supplierSearchInput = document.getElementById("supplierSearchInput");
const supplierErrorMessage = document.getElementById("supplierErrorMessage");
const supplierSuccessMessage = document.getElementById("supplierSuccessMessage");
const suppliersList = document.getElementById("suppliersList");
const suppliersEmptyState = document.getElementById("suppliersEmptyState");
const suppliersEmptyMessage = document.getElementById("suppliersEmptyMessage");
const sidebarNavLinks = Array.from(
    document.querySelectorAll(".sidebar__nav .nav-link")
);
const suppliersStorageKey = "stockflowSuppliers";
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
let suppliers = [];
const sectionNavItems = [
    {
        key: "shop",
        link: shopNavLink,
        section: inventorySection,
        sectionId: "inventorySection",
        matches: ["shop", "inventory"]
    },
    {
        key: "orders",
        link: ordersNavLink,
        section: ordersSection,
        sectionId: "ordersSection",
        matches: ["orders"]
    },
    {
        key: "suppliers",
        link: suppliersNavLink,
        section: suppliersSection,
        sectionId: "suppliersSection",
        matches: ["suppliers", "supplier"]
    }
];

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

function getPathMatchLink() {
    const currentPath = window.location.pathname.toLowerCase();

    if (!currentPath || currentPath.endsWith("/")) {
        return null;
    }

    const matchedItem = sectionNavItems.find(({ matches }) =>
        matches.some((keyword) => currentPath.includes(keyword))
    );

    if (matchedItem?.link) {
        return matchedItem.link;
    }

    const pageMatchedLink = sidebarNavLinks.find((link) => {
        const page = link.dataset.page;
        return page && currentPath.includes(page);
    });

    return pageMatchedLink || null;
}

function updateActiveNavFromScroll() {
    if (!dashboardNavLink) return;

    const triggerOffset = window.innerHeight * 0.35;
    let activeLink = dashboardNavLink;

    sectionNavItems.forEach(({ link, section }) => {
        if (!link || !section) return;

        if (section.getBoundingClientRect().top <= triggerOffset) {
            activeLink = link;
        }
    });

    setActiveNavLink(activeLink);
}

function syncActiveNav() {
    const currentHash = window.location.hash;
    const pathMatchLink = getPathMatchLink();

    if (pathMatchLink) {
        setActiveNavLink(pathMatchLink);
        return;
    }

    if (currentHash) {
        const hashMatchedItem = sectionNavItems.find(
            ({ sectionId }) => `#${sectionId}` === currentHash
        );

        if (hashMatchedItem?.link) {
            setActiveNavLink(hashMatchedItem.link);
            return;
        }
    }

    updateActiveNavFromScroll();
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

if (dashboardNavLink) {
    dashboardNavLink.addEventListener("click", (event) => {
        event.preventDefault();
        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });
        history.replaceState(null, "", window.location.pathname);
        setActiveNavLink(dashboardNavLink);
        toggleSidebar(false);
    });
}

if (shopNavLink && inventorySection) {
    shopNavLink.addEventListener("click", (event) => {
        event.preventDefault();
        inventorySection.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
        history.replaceState(null, "", "#inventorySection");
        setActiveNavLink(shopNavLink);
        toggleSidebar(false);
    });
}

if (ordersNavLink && ordersSection) {
    ordersNavLink.addEventListener("click", (event) => {
        event.preventDefault();
        ordersSection.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
        history.replaceState(null, "", "#ordersSection");
        setActiveNavLink(ordersNavLink);
        toggleSidebar(false);
    });
}

if (suppliersNavLink && suppliersSection) {
    suppliersNavLink.addEventListener("click", (event) => {
        event.preventDefault();
        suppliersSection.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
        history.replaceState(null, "", "#suppliersSection");
        setActiveNavLink(suppliersNavLink);
        toggleSidebar(false);
    });
}

window.addEventListener("resize", () => {
    if (window.innerWidth > 980) {
        toggleSidebar(false);
    }
});

if (sidebarNavLinks.length) {
    syncActiveNav();
    window.addEventListener("scroll", updateActiveNavFromScroll, { passive: true });
    window.addEventListener("hashchange", syncActiveNav);
}

if (sidebar) {
    if (localStorage.getItem("isLoggedIn") !== "true") {
        window.location.href = "login.html";
    }
}

if (logoutButton) {
    logoutButton.addEventListener("click", () => {
        localStorage.removeItem("isLoggedIn");
        localStorage.removeItem("loggedInUser");
        window.location.href = "login.html";
    });
}

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
