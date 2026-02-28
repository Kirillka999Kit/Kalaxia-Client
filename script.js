// ========================================
// KALAXIA CLIENT - JavaScript с регистрацией и админ-панелью
// ========================================

// Глобальное состояние
let currentUser = null;
let selectedPlan = 'month';
let selectedAmount = 249;

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    initMobileMenu();
    initScrollAnimations();
    initStatsAnimation();
});

// ========================================
// Авторизация
// ========================================

function checkAuth() {
    const user = localStorage.getItem('kalaxia_user');
    if (user) {
        currentUser = JSON.parse(user);
        updateNavAuth();
        if (currentUser.isAdmin) {
            showAdminButton();
        }
    }
}

function updateNavAuth() {
    const navAuth = document.querySelector('.nav-auth');
    if (currentUser) {
        navAuth.innerHTML = `
            <span style="color: var(--text-secondary); display: flex; align-items: center; gap: 8px;">
                <i class="fas fa-user-circle" style="color: var(--primary);"></i>
                ${currentUser.username}
            </span>
            <button class="btn btn-outline btn-sm" onclick="logout()">
                <i class="fas fa-sign-out-alt"></i> Выход
            </button>
        `;
    } else {
        navAuth.innerHTML = `
            <button class="btn btn-outline btn-sm" onclick="openModal('loginModal')">
                <i class="fas fa-sign-in-alt"></i> Вход
            </button>
            <button class="btn btn-primary btn-sm" onclick="openModal('registerModal')">
                <i class="fas fa-user-plus"></i> Регистрация
            </button>
        `;
    }
}

function showAdminButton() {
    const navAuth = document.querySelector('.nav-auth');
    const adminBtn = document.createElement('button');
    adminBtn.className = 'btn btn-outline btn-sm';
    adminBtn.innerHTML = '<i class="fas fa-cog"></i> Админ';
    adminBtn.onclick = openAdminPanel;
    navAuth.appendChild(adminBtn);
}

function register() {
    const username = document.getElementById('regUsername').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const password = document.getElementById('regPassword').value;
    const passwordConfirm = document.getElementById('regPasswordConfirm').value;

    if (!username || !email || !password) {
        showToast('Заполните все поля', 'error');
        return;
    }

    if (password !== passwordConfirm) {
        showToast('Пароли не совпадают', 'error');
        return;
    }

    if (password.length < 6) {
        showToast('Пароль должен быть не менее 6 символов', 'error');
        return;
    }

    // Получаем пользователей
    const users = JSON.parse(localStorage.getItem('kalaxia_users') || '[]');

    // Проверка на существующего пользователя
    if (users.find(u => u.email === email)) {
        showToast('Email уже зарегистрирован', 'error');
        return;
    }

    if (users.find(u => u.username === username)) {
        showToast('Username уже занят', 'error');
        return;
    }

    // Создаём пользователя
    const newUser = {
        id: Date.now(),
        username,
        email,
        password, // В реальном проекте нужно хешировать!
        createdAt: new Date().toISOString(),
        subscription: null,
        isAdmin: false
    };

    users.push(newUser);
    localStorage.setItem('kalaxia_users', JSON.stringify(users));

    // Автоматический вход
    currentUser = newUser;
    localStorage.setItem('kalaxia_user', JSON.stringify(newUser));
    updateNavAuth();

    showToast('Регистрация успешна!', 'success');
    closeModal('registerModal');

    // Очищаем форму
    document.getElementById('regUsername').value = '';
    document.getElementById('regEmail').value = '';
    document.getElementById('regPassword').value = '';
    document.getElementById('regPasswordConfirm').value = '';
}

function login() {
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;

    if (!email || !password) {
        showToast('Введите email и пароль', 'error');
        return;
    }

    const users = JSON.parse(localStorage.getItem('kalaxia_users') || '[]');
    const user = users.find(u => u.email === email && u.password === password);

    if (!user) {
        showToast('Неверный email или пароль', 'error');
        return;
    }

    currentUser = user;
    localStorage.setItem('kalaxia_user', JSON.stringify(user));
    updateNavAuth();

    if (user.isAdmin) {
        showAdminButton();
    }

    showToast(`С возвращением, ${user.username}!`, 'success');
    closeModal('loginModal');

    // Очищаем форму
    document.getElementById('loginEmail').value = '';
    document.getElementById('loginPassword').value = '';
}

function logout() {
    currentUser = null;
    localStorage.removeItem('kalaxia_user');
    updateNavAuth();
    showToast('Вы вышли из аккаунта', 'info');
}

// ========================================
// Модальные окна
// ========================================

function openModal(modalId) {
    document.getElementById(modalId).classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
    document.body.style.overflow = '';
}

function switchModal(fromId, toId) {
    closeModal(fromId);
    setTimeout(() => openModal(toId), 300);
}

function openBuyModal(plan, amount) {
    selectedPlan = plan;
    selectedAmount = amount;

    const planNames = {
        '1day': '1 День',
        '7day': '7 Дней',
        '14day': '14 Дней',
        '30day': '30 Дней',
        'lifetime': 'Life-Time'
    };

    document.getElementById('buyPlanName').textContent = planNames[plan] || plan;
    document.getElementById('buyPlanPrice').textContent = amount;
    document.getElementById('payAmount').textContent = amount;

    // Предзаполняем email если пользователь авторизован
    if (currentUser) {
        document.getElementById('buyEmail').value = currentUser.email;
        document.getElementById('buyDiscord').value = currentUser.discord || '';
    }

    openModal('buyModal');
}

function processPayment() {
    const discord = document.getElementById('buyDiscord').value.trim();
    const email = document.getElementById('buyEmail').value.trim();

    if (!discord || !email) {
        showToast('Заполните Discord и Email', 'error');
        return;
    }

    if (!currentUser) {
        showToast('Сначала зарегистрируйтесь или войдите', 'error');
        closeModal('buyModal');
        setTimeout(() => openModal('registerModal'), 500);
        return;
    }

    // Создаём подписку
    const users = JSON.parse(localStorage.getItem('kalaxia_users') || '[]');
    const userIndex = users.findIndex(u => u.id === currentUser.id);

    if (userIndex === -1) {
        showToast('Пользователь не найден', 'error');
        return;
    }

    const planDurations = {
        '1day': 1,
        '7day': 7,
        '14day': 14,
        '30day': 30,
        'lifetime': 99999
    };

    const endDate = new Date();
    endDate.setDate(endDate.getDate() + planDurations[selectedPlan]);

    users[userIndex].subscription = {
        plan: selectedPlan,
        amount: selectedAmount,
        discord,
        startDate: new Date().toISOString(),
        endDate: endDate.toISOString(),
        status: 'active'
    };

    localStorage.setItem('kalaxia_users', JSON.stringify(users));
    currentUser = users[userIndex];
    localStorage.setItem('kalaxia_user', JSON.stringify(currentUser));

    showToast(`Подписка "${selectedPlan}" активирована!`, 'success');
    closeModal('buyModal');

    // Очищаем форму
    document.getElementById('buyDiscord').value = '';
    document.getElementById('buyEmail').value = '';
}

// ========================================
// Уведомления (Toasts)
// ========================================

function showToast(message, type = 'info') {
    const container = document.querySelector('.toast-container') || createToastContainer();
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        info: 'fa-info-circle'
    };

    toast.innerHTML = `
        <i class="fas ${icons[type]}"></i>
        <span class="toast-message">${message}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100px)';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function createToastContainer() {
    const container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
    return container;
}

// ========================================
// Админ панель
// ========================================

function openAdminPanel() {
    const adminPanel = document.getElementById('adminPanel');
    if (!adminPanel) {
        createAdminPanel();
    }
    document.getElementById('adminPanel').classList.add('active');
    document.body.style.overflow = 'hidden';
    loadAdminData();
}

function closeAdminPanel() {
    document.getElementById('adminPanel').classList.remove('active');
    document.body.style.overflow = '';
}

function createAdminPanel() {
    const panel = document.createElement('div');
    panel.id = 'adminPanel';
    panel.className = 'admin-panel';
    panel.innerHTML = `
        <div class="admin-header">
            <h1><i class="fas fa-cog"></i> Админ панель</h1>
            <button class="admin-close" onclick="closeAdminPanel()">
                <i class="fas fa-times"></i> Закрыть
            </button>
        </div>
        <div class="admin-content">
            <div class="admin-stats">
                <div class="admin-stat-card">
                    <div class="admin-stat-icon">
                        <i class="fas fa-users"></i>
                    </div>
                    <div class="admin-stat-info">
                        <h3 id="statUsers">0</h3>
                        <p>Пользователей</p>
                    </div>
                </div>
                <div class="admin-stat-card">
                    <div class="admin-stat-icon">
                        <i class="fas fa-crown"></i>
                    </div>
                    <div class="admin-stat-info">
                        <h3 id="statSubscriptions">0</h3>
                        <p>Активных подписок</p>
                    </div>
                </div>
                <div class="admin-stat-card">
                    <div class="admin-stat-icon">
                        <i class="fas fa-ruble-sign"></i>
                    </div>
                    <div class="admin-stat-info">
                        <h3 id="statRevenue">0 ₽</h3>
                        <p>Доход</p>
                    </div>
                </div>
                <div class="admin-stat-card">
                    <div class="admin-stat-icon">
                        <i class="fas fa-calendar"></i>
                    </div>
                    <div class="admin-stat-info">
                        <h3 id="statToday">0</h3>
                        <p>За сегодня</p>
                    </div>
                </div>
            </div>

            <div class="admin-section">
                <h2><i class="fas fa-users"></i> Пользователи</h2>
                <table class="admin-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Username</th>
                            <th>Email</th>
                            <th>Подписка</th>
                            <th>Статус</th>
                            <th>Действия</th>
                        </tr>
                    </thead>
                    <tbody id="usersTableBody">
                    </tbody>
                </table>
            </div>
        </div>
    `;
    document.body.appendChild(panel);
}

function loadAdminData() {
    const users = JSON.parse(localStorage.getItem('kalaxia_users') || '[]');
    
    // Статистика
    const totalUsers = users.length;
    const activeSubscriptions = users.filter(u => u.subscription && u.subscription.status === 'active').length;
    const totalRevenue = users.reduce((sum, u) => sum + (u.subscription?.amount || 0), 0);
    
    const today = new Date().toDateString();
    const todayUsers = users.filter(u => new Date(u.createdAt).toDateString() === today).length;

    document.getElementById('statUsers').textContent = totalUsers;
    document.getElementById('statSubscriptions').textContent = activeSubscriptions;
    document.getElementById('statRevenue').textContent = totalRevenue.toLocaleString() + ' ₽';
    document.getElementById('statToday').textContent = todayUsers;

    // Таблица пользователей
    const tbody = document.getElementById('usersTableBody');
    tbody.innerHTML = users.map(user => {
        const sub = user.subscription;
        const statusClass = sub && sub.status === 'active' && new Date(sub.endDate) > new Date() 
            ? 'status-active' 
            : 'status-expired';
        const statusText = sub 
            ? (new Date(sub.endDate) > new Date() ? 'Активна' : 'Истекла')
            : 'Нет';

        return `
            <tr>
                <td>${user.id}</td>
                <td>${user.username}</td>
                <td>${user.email}</td>
                <td>${sub ? sub.plan : '—'}</td>
                <td><span class="status ${statusClass}"><i class="fas fa-circle"></i> ${statusText}</span></td>
                <td>
                    <button class="admin-btn admin-btn-edit" onclick="editUser(${user.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="admin-btn admin-btn-delete" onclick="deleteUser(${user.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

function editUser(userId) {
    const users = JSON.parse(localStorage.getItem('kalaxia_users') || '[]');
    const user = users.find(u => u.id === userId);
    
    if (!user) return;

    const newEmail = prompt('Новый email:', user.email);
    if (newEmail && newEmail !== user.email) {
        user.email = newEmail;
        localStorage.setItem('kalaxia_users', JSON.stringify(users));
        showToast('Email обновлён', 'success');
        loadAdminData();
    }
}

function deleteUser(userId) {
    if (!confirm('Вы уверены, что хотите удалить этого пользователя?')) return;

    let users = JSON.parse(localStorage.getItem('kalaxia_users') || '[]');
    users = users.filter(u => u.id !== userId);
    localStorage.setItem('kalaxia_users', JSON.stringify(users));
    
    showToast('Пользователь удалён', 'success');
    loadAdminData();
}

// ========================================
// Анимации и эффекты
// ========================================

function initMobileMenu() {
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const navLinks = document.querySelector('.nav-links');

    if (mobileMenuBtn && navLinks) {
        mobileMenuBtn.addEventListener('click', () => {
            navLinks.classList.toggle('active');
            mobileMenuBtn.innerHTML = navLinks.classList.contains('active') 
                ? '<i class="fas fa-times"></i>' 
                : '<i class="fas fa-bars"></i>';
        });

        document.querySelectorAll('.nav-links a').forEach(link => {
            link.addEventListener('click', () => {
                navLinks.classList.remove('active');
                mobileMenuBtn.innerHTML = '<i class="fas fa-bars"></i>';
            });
        });
    }
}

function initScrollAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);

    document.querySelectorAll('.feature-card, .module-category, .pricing-card').forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
    });
}

function initStatsAnimation() {
    const statNumbers = document.querySelectorAll('.stat-number');
    let statsAnimated = false;

    function animateValue(element, start, end, duration) {
        let startTimestamp = null;
        const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            
            if (element.textContent.includes('+')) {
                element.textContent = Math.floor(progress * (end - start) + start).toLocaleString() + '+';
            } else if (element.textContent.includes('%')) {
                element.textContent = (progress * (end - start) + start).toFixed(1) + '%';
            } else {
                element.textContent = Math.floor(progress * (end - start) + start) + '+';
            }
            
            if (progress < 1) {
                window.requestAnimationFrame(step);
            }
        };
        window.requestAnimationFrame(step);
    }

    const statsObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && !statsAnimated) {
                statsAnimated = true;
                animateValue(statNumbers[0], 0, 15000, 2000);
                animateValue(statNumbers[1], 0, 99.9, 2000);
                animateValue(statNumbers[2], 0, 50, 2000);
            }
        });
    }, { threshold: 0.5 });

    const heroStats = document.querySelector('.hero-stats');
    if (heroStats) {
        statsObserver.observe(heroStats);
    }
}

// Плавный скролл
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Анимация навбара
window.addEventListener('scroll', () => {
    const navbar = document.querySelector('.navbar');
    if (window.scrollY > 50) {
        navbar.style.background = 'rgba(15, 15, 26, 0.98)';
    } else {
        navbar.style.background = 'rgba(15, 15, 26, 0.9)';
    }
});

// Закрытие модального окна по ESC
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.remove('active');
        });
        document.body.style.overflow = '';
    }
});

// Консольное сообщение
console.log('%c KALAXIA CLIENT ', 'background: #6366f1; color: white; font-size: 20px; padding: 10px 20px;');
console.log('%c Лучший HVH чит для Minecraft ', 'color: #a1a1aa; font-size: 14px;');
