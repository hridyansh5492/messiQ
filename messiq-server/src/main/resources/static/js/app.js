/**
 * messiQ - Real-Time Messenger Application Client Engine
 * Implements:
 * - Exact Figma Design (3-Column Layout: Icon Rail, Messages List, Chat Canvas)
 * - Light Mode (Warm Ivory & Celadon Green) / Dark Mode (Obsidian & Forest)
 * - Algorithm 1: User Registration
 * - Algorithm 2: User Login
 * - Algorithm 3: Send Message (WebSocket STOMP + REST)
 * - Algorithm 4: Retrieve Message History
 * - Algorithm 5: Online/Offline Status Tracking
 */

// Global State
let currentUser = null;
let authToken = null;
let activePeer = null;
let stompClient = null;
let isConnected = false;

let allUsers = [];
let recentConversations = [];
let activeSubscription = null;
let activeTypingSubscription = null;
let pendingMediaFile = null;
let typingTimeout = null;
let currentView = 'messages'; // 'messages' or 'contacts'
let currentMessagesFilter = 'conversations'; // 'conversations' or 'unread'
let currentContactsFilter = 'all'; // 'all' or 'online'

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    updateTopbarDate();
    checkStoredSession();
});

// =========================================================
// THEME SWITCHER (LIGHT / DARK MODE)
// =========================================================

function initTheme() {
    const savedTheme = localStorage.getItem('messiq_theme') || 'theme-light';
    applyTheme(savedTheme);
}

function toggleTheme() {
    const currentTheme = document.body.classList.contains('theme-dark') ? 'theme-dark' : 'theme-light';
    const newTheme = currentTheme === 'theme-light' ? 'theme-dark' : 'theme-light';
    applyTheme(newTheme);
    localStorage.setItem('messiq_theme', newTheme);
}

function applyTheme(theme) {
    document.body.classList.remove('theme-light', 'theme-dark');
    document.body.classList.add(theme);

    const themeIcon = document.getElementById('themeIcon');
    if (themeIcon) {
        if (theme === 'theme-dark') {
            themeIcon.className = 'fa-solid fa-sun';
            themeIcon.parentElement.title = 'Switch to Light Mode (Figma Warm Celadon)';
        } else {
            themeIcon.className = 'fa-solid fa-moon';
            themeIcon.parentElement.title = 'Switch to Dark Mode (Obsidian & Forest)';
        }
    }

    // Sync theme toggle icons on Home Page as well
    const homeThemeIcons = document.querySelectorAll('.home-theme-icon');
    homeThemeIcons.forEach(icon => {
        icon.className = theme === 'theme-dark' ? 'fa-solid fa-sun home-theme-icon' : 'fa-solid fa-moon home-theme-icon';
    });
}

function updateTopbarDate() {
    const dateEl = document.getElementById('topbarDate');
    if (dateEl) {
        const options = { weekday: 'short', month: 'long', day: 'numeric' };
        dateEl.textContent = new Date().toLocaleDateString('en-US', options);
    }
}

// =========================================================
// VIEW & SCREEN TRANSITIONS (HOME / AUTH / LOADING / APP)
// =========================================================

function showHomeScreen() {
    const home = document.getElementById('homeScreen');
    const auth = document.getElementById('authScreen');
    const loading = document.getElementById('loadingScreen');
    const topbar = document.getElementById('appTopbar');
    const main = document.getElementById('mainScreen');

    if (home) home.classList.remove('hidden');
    if (auth) auth.classList.add('hidden');
    if (loading) loading.classList.add('hidden');
    if (topbar) topbar.classList.add('hidden');
    if (main) main.classList.add('hidden');
}

function openAuthModal(tab = 'login') {
    switchAuthTab(tab);
    const alert = document.getElementById('authAlert');
    if (alert) alert.classList.add('hidden');
    const auth = document.getElementById('authScreen');
    if (auth) auth.classList.remove('hidden');
}

function closeAuthModal() {
    const auth = document.getElementById('authScreen');
    if (auth) auth.classList.add('hidden');
}

function handleAuthOverlayClick(e) {
    if (e.target.id === 'authScreen') {
        closeAuthModal();
    }
}

function scrollToTop() {
    const home = document.getElementById('homeScreen');
    if (home) {
        home.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

function scrollToSection(e, sectionId) {
    if (e) e.preventDefault();
    const el = document.getElementById(sectionId);
    if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

/**
 * 1-Click Quick Demo Login from the Landing Page
 */
function quickDemoLogin(username) {
    fillDemo(username, 'messiq123');
    openAuthModal('login');
    executeLogin(username, 'messiq123');
}

/**
 * Display full-screen white background loading screen with centered spinner
 * before revealing the messiQ workspace dashboard
 */
function showLoadingAndLaunchDashboard(user, isInitialLoad = false) {
    const loadingScreen = document.getElementById('loadingScreen');
    const statusText = document.getElementById('loadingStatusText');
    const homeScreen = document.getElementById('homeScreen');
    const appTopbar = document.getElementById('appTopbar');
    const mainScreen = document.getElementById('mainScreen');
    const authScreen = document.getElementById('authScreen');

    if (authScreen) authScreen.classList.add('hidden');

    const displayName = user ? (user.displayName || user.username) : 'User';
    if (statusText) {
        statusText.textContent = isInitialLoad
            ? `Welcome back, ${displayName}! Preparing workspace...`
            : `Welcome, ${displayName}! Loading your chats...`;
    }

    if (loadingScreen) {
        loadingScreen.classList.remove('hidden');
        loadingScreen.classList.remove('fade-out');
    }

    // Initialize the background data: user profile, avatar, websocket & contacts
    initMessengerDashboard();

    // Display duration for the pristine white loading animation
    const displayDuration = isInitialLoad ? 800 : 1200;

    setTimeout(() => {
        // Transition: Hide home, reveal messenger dashboard
        if (homeScreen) homeScreen.classList.add('hidden');
        if (appTopbar) appTopbar.classList.remove('hidden');
        if (mainScreen) mainScreen.classList.remove('hidden');

        // Smoothly fade out loading screen
        if (loadingScreen) {
            loadingScreen.classList.add('fade-out');
            setTimeout(() => {
                loadingScreen.classList.add('hidden');
                loadingScreen.classList.remove('fade-out');
            }, 350);
        }
    }, displayDuration);
}

function checkStoredSession() {
    const storedUser = localStorage.getItem('messiq_user');
    const storedToken = localStorage.getItem('messiq_token');
    if (storedUser && storedToken) {
        try {
            currentUser = JSON.parse(storedUser);
            authToken = storedToken;
            showLoadingAndLaunchDashboard(currentUser, true);
            return;
        } catch (e) {
            localStorage.clear();
        }
    }
    // Show clean Home Page without any popup overlay on first visit
    showHomeScreen();
}

// =========================================================
// AUTHENTICATION LOGIC
// =========================================================

function switchAuthTab(tab) {
    const loginForm = document.getElementById('loginForm');
    const regForm = document.getElementById('registerForm');
    const tabLogin = document.getElementById('tabLogin');
    const tabRegister = document.getElementById('tabRegister');
    const authAlert = document.getElementById('authAlert');

    authAlert.classList.add('hidden');

    if (tab === 'login') {
        loginForm.classList.remove('hidden');
        regForm.classList.add('hidden');
        tabLogin.classList.add('active');
        tabRegister.classList.remove('active');
    } else {
        loginForm.classList.add('hidden');
        regForm.classList.remove('hidden');
        tabLogin.classList.remove('active');
        tabRegister.classList.add('active');
    }
}

function fillDemo(username, password) {
    document.getElementById('loginIdentifier').value = username;
    document.getElementById('loginPassword').value = password;
}

function showAuthAlert(msg, isSuccess = false) {
    const alert = document.getElementById('authAlert');
    alert.textContent = msg;
    alert.className = `auth-alert ${isSuccess ? 'success' : 'error'}`;
    alert.classList.remove('hidden');
}

/**
 * Shared Login Execution Logic
 */
async function executeLogin(identifier, password) {
    const btn = document.getElementById('loginBtn');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Authenticating...`;
    }

    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ usernameOrEmail: identifier, password: password })
        });
        const data = await response.json();

        if (response.ok && data.success) {
            currentUser = data.user;
            authToken = data.token;
            localStorage.setItem('messiq_user', JSON.stringify(currentUser));
            localStorage.setItem('messiq_token', authToken);

            // Close auth pop-up and show white background loading sequence
            closeAuthModal();
            showLoadingAndLaunchDashboard(currentUser, false);
        } else {
            showAuthAlert(data.message || 'Invalid username or password', false);
        }
    } catch (err) {
        showAuthAlert('Unable to connect to messiQ server on port 8080.', false);
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = `<span>Sign In</span> <i class="fa-solid fa-arrow-right"></i>`;
        }
    }
}

/**
 * Algorithm 2 - User Login
 */
async function handleLogin(e) {
    e.preventDefault();
    const identifier = document.getElementById('loginIdentifier').value.trim();
    const password = document.getElementById('loginPassword').value;
    await executeLogin(identifier, password);
}

/**
 * Algorithm 1 - User Registration
 */
async function handleRegister(e) {
    e.preventDefault();
    const username = document.getElementById('regUsername').value.trim();
    const displayName = document.getElementById('regDisplayName').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const password = document.getElementById('regPassword').value;

    const btn = document.getElementById('registerBtn');
    btn.disabled = true;
    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Registering...`;

    try {
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: username,
                displayName: displayName,
                email: email,
                password: password
            })
        });
        const data = await response.json();

        if (response.ok && data.success) {
            showAuthAlert('Registration Successful! Starting workspace...', true);
            setTimeout(() => {
                currentUser = data.user;
                authToken = data.token;
                localStorage.setItem('messiq_user', JSON.stringify(currentUser));
                localStorage.setItem('messiq_token', authToken);

                closeAuthModal();
                showLoadingAndLaunchDashboard(currentUser, false);
            }, 600);
        } else {
            showAuthAlert(data.message || 'User already exists', false);
        }
    } catch (err) {
        showAuthAlert('Registration failed: Connection error', false);
    } finally {
        btn.disabled = false;
        btn.innerHTML = `<span>Create Account</span> <i class="fa-solid fa-user-plus"></i>`;
    }
}

function handleLogout() {
    if (confirm('Are you sure you want to sign out of messiQ?')) {
        // Broadcast offline status
        if (stompClient && isConnected && currentUser) {
            try {
                stompClient.send('/app/user.status', {}, JSON.stringify({
                    userId: currentUser.id,
                    username: currentUser.username,
                    status: 'OFFLINE'
                }));
                stompClient.disconnect();
            } catch (e) {
                console.warn('Disconnect error:', e);
            }
        }
        localStorage.removeItem('messiq_user');
        localStorage.removeItem('messiq_token');
        currentUser = null;
        authToken = null;
        activePeer = null;

        // Transition back to clean Home Page
        showHomeScreen();
        scrollToTop();
    }
}

// =========================================================
// WEBSOCKET & STOMP REAL-TIME ENGINE
// =========================================================

function connectWebSocket() {
    if (!currentUser) return;

    const topWsDot = document.getElementById('topWsDot');
    const topWsText = document.getElementById('topWsText');
    if (topWsDot) topWsDot.className = 'status-indicator-dot offline';
    if (topWsText) topWsText.textContent = 'Connecting...';

    // Pass credentials in query params for Principal authentication
    const socket = new SockJS(`/ws?userId=${currentUser.id}&username=${encodeURIComponent(currentUser.username)}`);
    stompClient = Stomp.over(socket);
    stompClient.debug = null; // suppress frame logs

    stompClient.connect({
        username: currentUser.username,
        userId: currentUser.id
    }, (frame) => {
        isConnected = true;
        if (topWsDot) topWsDot.className = 'status-indicator-dot online';
        if (topWsText) topWsText.textContent = 'All systems connected';

        // 1. Subscribe to presence broadcasts (Algorithm 5)
        stompClient.subscribe('/topic/status', (msg) => {
            try {
                const statusUpdate = JSON.parse(msg.body);
                handlePresenceUpdate(statusUpdate);
            } catch (e) {}
        });

        // 2. Personal real-time direct message channel (Guaranteed instantaneous delivery)
        stompClient.subscribe(`/topic/user.${currentUser.id}`, (msg) => {
            try {
                const chatMessage = JSON.parse(msg.body);
                handleIncomingMessage(chatMessage);
            } catch (e) {
                console.error('Failed to parse incoming direct message', e);
            }
        });

        // 3. User direct queue fallback (Spring UserDestination)
        stompClient.subscribe('/user/queue/messages', (msg) => {
            try {
                const chatMessage = JSON.parse(msg.body);
                handleIncomingMessage(chatMessage);
            } catch (e) {}
        });

        // 4. If a conversation is already open, subscribe immediately
        if (activePeer) {
            subscribeToConversationChannels();
        }

        // 5. Broadcast that current user is ONLINE
        stompClient.send('/app/user.status', {}, JSON.stringify({
            userId: currentUser.id,
            username: currentUser.username,
            status: 'ONLINE'
        }));
    }, (error) => {
        isConnected = false;
        if (topWsDot) topWsDot.className = 'status-indicator-dot offline';
        if (topWsText) topWsText.textContent = 'Disconnected';
        setTimeout(connectWebSocket, 4000);
    });
}

/**
 * Algorithm 5 - Handle Live Presence Updates
 */
function handlePresenceUpdate(statusUpdate) {
    if (!statusUpdate || !statusUpdate.userId) return;

    if (activePeer && activePeer.id === statusUpdate.userId) {
        activePeer.status = statusUpdate.status;
        updateActiveHeaderStatus();
    }

    const foundUser = allUsers.find(u => u.id === statusUpdate.userId);
    if (foundUser) {
        foundUser.status = statusUpdate.status;
    }

    const foundConv = recentConversations.find(c => c.user && c.user.id === statusUpdate.userId);
    if (foundConv && foundConv.user) {
        foundConv.user.status = statusUpdate.status;
    }

    renderSidebarList();
}

/**
 * Instantaneous real-time message handler without page refresh
 */
function handleIncomingMessage(chatMessage) {
    if (!currentUser) return;

    // Check if message belongs to the currently active conversation
    const isCurrentActive = activePeer && (chatMessage.senderId === activePeer.id || chatMessage.receiverId === activePeer.id);

    if (isCurrentActive) {
        // If message was sent by the peer, append it directly to the active chat feed
        if (chatMessage.senderId === activePeer.id) {
            appendMessageBubble(chatMessage);
            scrollFeedToBottom();
            fetch(`/api/messages/read?receiverId=${currentUser.id}&senderId=${activePeer.id}`, { method: 'POST' });
        }
    }

    // Always update sidebar conversations list in real time
    updateConversationInList(chatMessage);
}

/**
 * Update conversations list in memory and re-render sidebar instantaneously
 */
function updateConversationInList(chatMessage) {
    if (!currentUser) return;

    const isFromMe = chatMessage.senderId === currentUser.id;
    const otherUserId = isFromMe ? chatMessage.receiverId : chatMessage.senderId;
    const otherUsername = isFromMe ? chatMessage.receiverUsername : chatMessage.senderUsername;

    let convIndex = recentConversations.findIndex(c => c.user && c.user.id === otherUserId);

    if (convIndex >= 0) {
        const conv = recentConversations[convIndex];
        conv.lastMessage = chatMessage;
        if (!isFromMe && (!activePeer || activePeer.id !== otherUserId)) {
            conv.unreadCount = (conv.unreadCount || 0) + 1;
        } else if (activePeer && activePeer.id === otherUserId) {
            conv.unreadCount = 0;
        }
        // Move to the top of recent conversations
        recentConversations.splice(convIndex, 1);
        recentConversations.unshift(conv);
    } else {
        const foundUser = allUsers.find(u => u.id === otherUserId) || {
            id: otherUserId,
            username: otherUsername,
            displayName: otherUsername,
            avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${otherUsername}`,
            status: 'ONLINE'
        };
        recentConversations.unshift({
            user: foundUser,
            lastMessage: chatMessage,
            unreadCount: (!isFromMe && (!activePeer || activePeer.id !== otherUserId)) ? 1 : 0
        });
    }

    updateSidebarCount();
    if (currentView === 'messages') {
        renderSidebarList();
    }
}

// =========================================================
// DASHBOARD & NAVIGATION FLOW
// =========================================================

function initMessengerDashboard() {
    document.getElementById('authScreen').classList.add('hidden');

    const avatarUrl = currentUser.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${currentUser.username}`;
    document.getElementById('topbarUserAvatar').src = avatarUrl;
    document.getElementById('railUserAvatar').src = avatarUrl;

    // DO NOT open any default chat! Start with clean empty state
    activePeer = null;
    document.getElementById('chatActiveContainer').classList.add('hidden');
    document.getElementById('chatEmptyState').classList.remove('hidden');

    connectWebSocket();
    loadConversationsList();
    loadDirectoryList();
    switchToMessagesView();
}

function switchToMessagesView() {
    currentView = 'messages';
    const railMsg = document.getElementById('railBtnMessages');
    const railContacts = document.getElementById('railBtnContacts');
    if (railMsg) railMsg.classList.add('active');
    if (railContacts) railContacts.classList.remove('active');

    const title = document.getElementById('sidebarTitle');
    const label = document.getElementById('sectionLabel');
    const searchInput = document.getElementById('userSearchInput');
    const msgFilter = document.getElementById('messagesFilterRow');
    const contactsFilter = document.getElementById('contactsFilterRow');

    if (title) title.textContent = 'Messages';
    if (label) label.textContent = 'RECENT CONVERSATIONS';
    if (searchInput) searchInput.placeholder = 'Search messages (⌘ K)...';
    if (msgFilter) msgFilter.classList.remove('hidden');
    if (contactsFilter) contactsFilter.classList.add('hidden');

    updateSidebarCount();
    renderSidebarList();
}

function switchToContactsView() {
    currentView = 'contacts';
    const railMsg = document.getElementById('railBtnMessages');
    const railContacts = document.getElementById('railBtnContacts');
    if (railMsg) railMsg.classList.remove('active');
    if (railContacts) railContacts.classList.add('active');

    const title = document.getElementById('sidebarTitle');
    const label = document.getElementById('sectionLabel');
    const searchInput = document.getElementById('userSearchInput');
    const msgFilter = document.getElementById('messagesFilterRow');
    const contactsFilter = document.getElementById('contactsFilterRow');

    if (title) title.textContent = 'Contacts';
    if (label) label.textContent = 'ALL REGISTERED USERS';
    if (searchInput) searchInput.placeholder = 'Search contacts or @handle...';
    if (msgFilter) msgFilter.classList.add('hidden');
    if (contactsFilter) contactsFilter.classList.remove('hidden');

    updateSidebarCount();
    renderSidebarList();
}

function switchMessagesTab(tab) {
    currentMessagesFilter = tab;
    const chipAll = document.getElementById('chipAll');
    const chipUnread = document.getElementById('chipUnread');
    if (chipAll) chipAll.classList.toggle('active', tab === 'conversations');
    if (chipUnread) chipUnread.classList.toggle('active', tab === 'unread');
    renderSidebarList();
}

function switchContactsTab(tab) {
    currentContactsFilter = tab;
    const chipAllContacts = document.getElementById('chipAllContacts');
    const chipOnlineContacts = document.getElementById('chipOnlineContacts');
    if (chipAllContacts) chipAllContacts.classList.toggle('active', tab === 'all');
    if (chipOnlineContacts) chipOnlineContacts.classList.toggle('active', tab === 'online');
    renderSidebarList();
}

function updateSidebarCount() {
    const badge = document.getElementById('conversationCountBadge');
    if (!badge) return;
    if (currentView === 'messages') {
        badge.textContent = recentConversations.length;
    } else {
        badge.textContent = allUsers.length;
    }
}

async function loadConversationsList() {
    if (!currentUser) return;
    try {
        const res = await fetch(`/api/messages/conversations?userId=${currentUser.id}`);
        const data = await res.json();
        if (data.success) {
            recentConversations = data.data;
            updateSidebarCount();
            if (currentView === 'messages') {
                renderSidebarList();
            }
            // DO NOT auto-select Maya Chen or any peer on launch!
        }
    } catch (e) {
        console.error('Failed to load conversations', e);
    }
}

async function loadDirectoryList() {
    if (!currentUser) return;
    try {
        const res = await fetch(`/api/users?currentUserId=${currentUser.id}`);
        const data = await res.json();
        if (data.success) {
            allUsers = data.data;
            updateSidebarCount();
            if (currentView === 'contacts') {
                renderSidebarList();
            }
        }
    } catch (e) {
        console.error('Failed to load user directory', e);
    }
}

function handleSearch(query) {
    const clearBtn = document.getElementById('clearSearchBtn');
    if (!query || query.trim() === '') {
        if (clearBtn) clearBtn.classList.add('hidden');
        renderSidebarList();
        return;
    }
    if (clearBtn) clearBtn.classList.remove('hidden');

    const q = query.trim().toLowerCase();
    if (currentView === 'messages') {
        const filtered = recentConversations.filter(c => {
            const name = (c.user.displayName || '').toLowerCase();
            const username = (c.user.username || '').toLowerCase();
            const lastMsg = c.lastMessage && c.lastMessage.content ? c.lastMessage.content.toLowerCase() : '';
            return name.includes(q) || username.includes(q) || lastMsg.includes(q);
        });
        renderMessagesCards(filtered);
    } else {
        const filtered = allUsers.filter(u => {
            const name = (u.displayName || '').toLowerCase();
            const username = (u.username || '').toLowerCase();
            const email = (u.email || '').toLowerCase();
            return name.includes(q) || username.includes(q) || email.includes(q);
        });
        renderContactsCards(filtered);
    }
}

function clearSearch() {
    const input = document.getElementById('userSearchInput');
    if (input) input.value = '';
    const clearBtn = document.getElementById('clearSearchBtn');
    if (clearBtn) clearBtn.classList.add('hidden');
    renderSidebarList();
}

function renderSidebarList() {
    const searchInput = document.getElementById('userSearchInput');
    const query = searchInput ? searchInput.value.trim().toLowerCase() : '';

    if (currentView === 'messages') {
        let items = recentConversations;
        if (currentMessagesFilter === 'unread') {
            items = items.filter(c => (c.unreadCount || 0) > 0);
        }
        if (query) {
            items = items.filter(c => {
                const name = (c.user.displayName || '').toLowerCase();
                const username = (c.user.username || '').toLowerCase();
                const lastMsg = c.lastMessage && c.lastMessage.content ? c.lastMessage.content.toLowerCase() : '';
                return name.includes(query) || username.includes(query) || lastMsg.includes(query);
            });
        }
        renderMessagesCards(items);
    } else {
        let users = allUsers;
        if (currentContactsFilter === 'online') {
            users = users.filter(u => u.status === 'ONLINE');
        }
        if (query) {
            users = users.filter(u => {
                const name = (u.displayName || '').toLowerCase();
                const username = (u.username || '').toLowerCase();
                const email = (u.email || '').toLowerCase();
                return name.includes(query) || username.includes(query) || email.includes(query);
            });
        }
        renderContactsCards(users);
    }
}

function renderMessagesCards(items) {
    const listContainer = document.getElementById('userList');
    if (!listContainer) return;
    listContainer.innerHTML = '';

    if (items.length === 0) {
        listContainer.innerHTML = `
            <div style="text-align:center; padding:36px 14px; color:var(--composer-meta-text); font-size:12.5px;">
                <i class="fa-regular fa-comment-dots" style="font-size:24px; margin-bottom:8px; display:block; opacity:0.6;"></i>
                ${currentMessagesFilter === 'unread' ? 'No unread messages.' : 'No recent chats yet.<br><button onclick="switchToContactsView()" style="margin-top:12px; background:var(--composer-send-bg); color:var(--composer-send-color); border:none; padding:7px 16px; border-radius:999px; font-size:12px; font-weight:600; cursor:pointer;"><i class="fa-solid fa-user-group"></i> Browse All Users</button>'}
            </div>`;
        return;
    }

    items.forEach(item => {
        const peer = item.user;
        const lastMsg = item.lastMessage;
        const unread = item.unreadCount || 0;
        const isOnline = peer.status === 'ONLINE';

        const card = document.createElement('div');
        card.className = `contact-card ${activePeer && activePeer.id === peer.id ? 'active' : ''}`;
        card.onclick = () => selectConversationPeer(peer);

        let previewText = 'Started a conversation';
        if (lastMsg) {
            if (lastMsg.type === 'IMAGE') previewText = '📷 Photo attachment';
            else if (lastMsg.content) previewText = lastMsg.content;
        }
        const timeStr = lastMsg ? formatTime(lastMsg.timestamp) : '';

        card.innerHTML = `
            <div class="contact-avatar-wrapper">
                <img src="${peer.avatarUrl || 'https://api.dicebear.com/7.x/bottts/svg?seed=' + peer.username}" alt="${peer.username}" class="contact-avatar">
                <span class="status-indicator-dot ${isOnline ? 'online' : 'offline'}"></span>
            </div>
            <div class="contact-info">
                <div class="contact-top">
                    <span class="contact-name">${escapeHtml(peer.displayName || peer.username)}</span>
                    <span class="contact-time">${timeStr}</span>
                </div>
                <div class="contact-bottom">
                    <span class="contact-preview">${escapeHtml(previewText)}</span>
                    ${unread > 0 ? `<span class="unread-badge">${unread}</span>` : ''}
                </div>
            </div>
        `;
        listContainer.appendChild(card);
    });
}

function renderContactsCards(users) {
    const listContainer = document.getElementById('userList');
    if (!listContainer) return;
    listContainer.innerHTML = '';

    if (users.length === 0) {
        listContainer.innerHTML = `
            <div style="text-align:center; padding:36px 14px; color:var(--composer-meta-text); font-size:12.5px;">
                <i class="fa-solid fa-user-group" style="font-size:24px; margin-bottom:8px; display:block; opacity:0.6;"></i>
                ${currentContactsFilter === 'online' ? 'No users online right now.' : 'No other users registered.'}
            </div>`;
        return;
    }

    users.forEach(peer => {
        const card = document.createElement('div');
        const isOnline = peer.status === 'ONLINE';
        card.className = `contact-card ${activePeer && activePeer.id === peer.id ? 'active' : ''}`;
        card.onclick = () => selectConversationPeer(peer);

        card.innerHTML = `
            <div class="contact-avatar-wrapper">
                <img src="${peer.avatarUrl || 'https://api.dicebear.com/7.x/bottts/svg?seed=' + peer.username}" alt="${peer.username}" class="contact-avatar">
                <span class="status-indicator-dot ${isOnline ? 'online' : 'offline'}"></span>
            </div>
            <div class="contact-info">
                <div class="contact-top">
                    <span class="contact-name">${escapeHtml(peer.displayName || peer.username)}</span>
                    <span class="contact-badge-pill ${isOnline ? 'online' : 'offline'}">${isOnline ? 'Online' : 'Offline'}</span>
                </div>
                <div class="contact-bottom">
                    <span class="contact-preview">@${escapeHtml(peer.username)}${peer.email ? ' • ' + escapeHtml(peer.email) : ''}</span>
                </div>
            </div>
        `;
        listContainer.appendChild(card);
    });
}

/**
 * Select a conversation peer and open chat
 */
function selectConversationPeer(peer) {
    activePeer = peer;

    // Reveal chat canvas, hide empty state
    document.getElementById('chatEmptyState').classList.add('hidden');
    document.getElementById('chatActiveContainer').classList.remove('hidden');

    const avatarUrl = peer.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${peer.username}`;
    document.getElementById('activeTargetAvatar').src = avatarUrl;
    document.getElementById('activeTargetName').textContent = peer.displayName || peer.username;
    updateActiveHeaderStatus();

    // Re-render sidebar so selected item is highlighted
    renderSidebarList();

    // Clear unread badge in memory
    const existing = recentConversations.find(c => c.user && c.user.id === peer.id);
    if (existing) {
        existing.unreadCount = 0;
    }
    updateSidebarCount();

    // Subscribe to pairwise channel
    subscribeToConversationChannels();

    // Algorithm 4: Retrieve Message History
    loadMessageHistory();

    // Mark as read in backend
    fetch(`/api/messages/read?receiverId=${currentUser.id}&senderId=${peer.id}`, { method: 'POST' });

    // Focus input
    setTimeout(() => {
        const input = document.getElementById('chatMessageInput');
        if (input) input.focus();
    }, 100);
}

function updateActiveHeaderStatus() {
    if (!activePeer) return;
    const dot = document.getElementById('activeTargetStatusDot');
    const text = document.getElementById('activeTargetStatusText');
    const isOnline = activePeer.status === 'ONLINE';

    if (dot) dot.className = `status-indicator-dot ${isOnline ? 'online' : 'offline'}`;
    if (text) text.textContent = isOnline ? 'Online now • Available' : 'Offline • Last seen recently';
}

function subscribeToConversationChannels() {
    if (!stompClient || !isConnected || !activePeer || !currentUser) return;

    if (activeSubscription) {
        try { activeSubscription.unsubscribe(); } catch (e) {}
        activeSubscription = null;
    }
    if (activeTypingSubscription) {
        try { activeTypingSubscription.unsubscribe(); } catch (e) {}
        activeTypingSubscription = null;
    }

    const channelKey = Math.min(currentUser.id, activePeer.id) + '.' + Math.max(currentUser.id, activePeer.id);

    activeSubscription = stompClient.subscribe(`/topic/messages.${channelKey}`, (msg) => {
        try {
            const chatMessage = JSON.parse(msg.body);
            // Append incoming message from the peer
            if (chatMessage.senderId !== currentUser.id) {
                appendMessageBubble(chatMessage);
                scrollFeedToBottom();
                fetch(`/api/messages/read?receiverId=${currentUser.id}&senderId=${activePeer.id}`, { method: 'POST' });
            }
            updateConversationInList(chatMessage);
        } catch (e) {
            console.error('Error handling pairwise message', e);
        }
    });

    activeTypingSubscription = stompClient.subscribe(`/topic/typing.${channelKey}`, (msg) => {
        try {
            const payload = JSON.parse(msg.body);
            if (payload.senderId === activePeer.id) {
                handleTypingNotification(payload.isTyping);
            }
        } catch (e) {}
    });
}

/**
 * Algorithm 4 - Retrieve Message History
 */
async function loadMessageHistory() {
    const feed = document.getElementById('messageFeed');
    feed.innerHTML = `
        <div class="date-divider"><span>Today, October 29</span></div>
        <div style="text-align:center; padding:30px; color:var(--composer-meta-text);">
            <i class="fa-solid fa-spinner fa-spin" style="font-size:20px;"></i>
            <p style="margin-top:8px; font-size:12px;">Loading messages...</p>
        </div>`;

    try {
        const res = await fetch(`/api/messages/history?user1=${currentUser.id}&user2=${activePeer.id}`);
        const data = await res.json();
        
        feed.innerHTML = `<div class="date-divider"><span>Today, October 29</span></div>`;

        if (data.success && data.data.length > 0) {
            data.data.forEach(msg => appendMessageBubble(msg));
            scrollFeedToBottom();
        } else {
            feed.innerHTML += `
                <div style="text-align:center; padding:40px 20px; color:var(--composer-meta-text); font-size:13px;">
                    <i class="fa-regular fa-paper-plane" style="font-size:24px; margin-bottom:8px; display:block; opacity:0.6;"></i>
                    No messages yet.<br>Say hello to start the conversation!
                </div>`;
        }
    } catch (e) {
        feed.innerHTML = `<div style="text-align:center; color:#ef4444; padding:20px;">Failed to retrieve history.</div>`;
    }
}

function refreshActiveConversation() {
    if (activePeer) {
        loadMessageHistory();
        loadConversationsList();
    }
}

/**
 * Render message bubbles matching exact Figma layout:
 * - Incoming: Dark obsidian bubble with white text
 * - Outgoing: Crisp white bubble with dark text + "Read ✓✓"
 */
function appendMessageBubble(msg) {
    const feed = document.getElementById('messageFeed');
    const isSent = msg.senderId === currentUser.id;

    const row = document.createElement('div');
    row.className = `msg-row ${isSent ? 'outgoing' : 'incoming'}`;

    const timeStr = formatTime(msg.timestamp);

    // 1. Photo / Media Card (matching Figma Casa Olivo shoot layout)
    if (msg.mediaUrl && (msg.type === 'IMAGE' || msg.mediaUrl.match(/\.(jpeg|jpg|gif|png|webp)$/i))) {
        row.innerHTML = `
            <div class="media-card">
                ${msg.content ? `<div class="media-card-caption">${escapeHtml(msg.content)}</div>` : ''}
                <div class="media-grid">
                    <img src="${msg.mediaUrl}" alt="Photo" onclick="window.open('${msg.mediaUrl}', '_blank')">
                </div>
                <div class="media-location-tag">
                    <span><i class="fa-solid fa-location-dot" style="margin-right:4px;"></i> ${escapeHtml(msg.fileName || 'Shared Photo')}</span>
                    <i class="fa-solid fa-arrow-up-right-from-square"></i>
                </div>
            </div>
            <div class="msg-meta">
                <span>${timeStr}</span>
                ${isSent ? `<span class="read-check">• Read <i class="fa-solid fa-check-double"></i></span>` : ''}
            </div>
        `;
    } 
    // 2. Audio Voice Note
    else if (msg.type === 'AUDIO' || (msg.content && msg.content.startsWith('[VOICE_NOTE]'))) {
        row.innerHTML = `
            <div style="display:flex; align-items:center;">
                <div class="audio-capsule">
                    <button type="button" class="audio-play-btn"><i class="fa-solid fa-play"></i></button>
                    <div class="audio-waveform">
                        <span style="height:6px"></span><span style="height:12px"></span>
                        <span style="height:18px"></span><span style="height:14px"></span>
                        <span style="height:10px"></span><span style="height:16px"></span>
                        <span style="height:8px"></span><span style="height:14px"></span>
                        <span style="height:20px"></span><span style="height:11px"></span>
                        <span style="height:7px"></span><span style="height:15px"></span>
                        <span style="height:12px"></span><span style="height:6px"></span>
                    </div>
                    <span class="audio-duration">0:24</span>
                </div>
                <span class="reaction-badge">🤍 1</span>
            </div>
            <div class="msg-meta">
                <span>${timeStr}</span>
                ${isSent ? `<span class="read-check">• Read <i class="fa-solid fa-check-double"></i></span>` : ''}
            </div>
        `;
    }
    // 3. Regular Text Message Bubble
    else {
        row.innerHTML = `
            <div class="msg-bubble">
                ${msg.mediaUrl ? `<div style="margin-bottom:6px;"><a href="${msg.mediaUrl}" target="_blank" style="color:#60a5fa; text-decoration:none;"><i class="fa-solid fa-paperclip"></i> ${escapeHtml(msg.fileName || 'Attachment')}</a></div>` : ''}
                <span>${escapeHtml(msg.content || '')}</span>
            </div>
            <div class="msg-meta">
                <span>${timeStr}</span>
                ${isSent ? `<span class="read-check">• Read <i class="fa-solid fa-check-double"></i></span>` : ''}
            </div>
        `;
    }

    feed.appendChild(row);
}

function scrollFeedToBottom() {
    const feed = document.getElementById('messageFeed');
    feed.scrollTop = feed.scrollHeight;
}

// =========================================================
// SEND MESSAGE & MEDIA SHARING LOGIC
// =========================================================

/**
 * Algorithm 3 - Send Message
 */
async function handleSendMessage(e) {
    e.preventDefault();
    if (!activePeer || !currentUser) return;

    const input = document.getElementById('chatMessageInput');
    const content = input.value.trim();

    if (!content && !pendingMediaFile) {
        return;
    }

    const sendBtn = document.getElementById('sendBtn');
    sendBtn.disabled = true;

    try {
        let mediaUrl = null;
        let fileName = null;
        let fileSize = null;
        let messageType = 'CHAT';

        if (pendingMediaFile) {
            const formData = new FormData();
            formData.append('file', pendingMediaFile);

            const uploadRes = await fetch('/api/media/upload', {
                method: 'POST',
                body: formData
            });
            const uploadData = await uploadRes.json();
            if (uploadData.success) {
                mediaUrl = uploadData.data.fileDownloadUri;
                fileName = uploadData.data.originalFileName;
                fileSize = uploadData.data.size;
                messageType = pendingMediaFile.type.startsWith('image/') ? 'IMAGE' : 'FILE';
            }
            clearMediaAttachment();
        }

        const messagePayload = {
            senderId: currentUser.id,
            senderUsername: currentUser.username,
            receiverId: activePeer.id,
            receiverUsername: activePeer.username,
            content: content,
            type: messageType,
            mediaUrl: mediaUrl,
            fileName: fileName,
            fileSize: fileSize,
            status: 'SENT',
            timestamp: new Date().toISOString()
        };

        if (stompClient && isConnected) {
            stompClient.send('/app/chat.sendMessage', {}, JSON.stringify(messagePayload));
        } else {
            await fetch('/api/messages/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(messagePayload)
            });
        }

        appendMessageBubble(messagePayload);
        scrollFeedToBottom();

        input.value = '';
        updateConversationInList(messagePayload);
    } catch (err) {
        console.error('Failed to send message', err);
    } finally {
        sendBtn.disabled = false;
        if (input) input.focus();
    }
}

// Media Selection & Preview
function triggerFileInput() {
    document.getElementById('mediaFileInput').click();
}

function handleFileSelected(event) {
    const file = event.target.files[0];
    if (!file) return;

    pendingMediaFile = file;
    const previewBar = document.getElementById('mediaPreviewBar');
    const previewImg = document.getElementById('mediaPreviewImg');
    const nameLabel = document.getElementById('previewFileName');
    const sizeLabel = document.getElementById('previewFileSize');

    nameLabel.textContent = file.name;
    sizeLabel.textContent = (file.size / 1024).toFixed(1) + ' KB';

    if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
            previewImg.src = e.target.result;
            previewImg.classList.remove('hidden');
        };
        reader.readAsDataURL(file);
    } else {
        previewImg.classList.add('hidden');
    }

    previewBar.classList.remove('hidden');
}

function clearMediaAttachment() {
    pendingMediaFile = null;
    document.getElementById('mediaFileInput').value = '';
    document.getElementById('mediaPreviewBar').classList.add('hidden');
}

function insertSampleEmoji() {
    const input = document.getElementById('chatMessageInput');
    input.value += ' 🌿';
    input.focus();
}

function sendSampleVoiceNote() {
    if (!activePeer || !currentUser) return;
    const messagePayload = {
        senderId: currentUser.id,
        senderUsername: currentUser.username,
        receiverId: activePeer.id,
        receiverUsername: activePeer.username,
        content: '[VOICE_NOTE]',
        type: 'AUDIO',
        status: 'SENT',
        timestamp: new Date().toISOString()
    };

    if (stompClient && isConnected) {
        stompClient.send('/app/chat.sendMessage', {}, JSON.stringify(messagePayload));
    }
    appendMessageBubble(messagePayload);
    scrollFeedToBottom();
}

// Typing Indicator Handling
function handleTyping() {
    if (!activePeer || !stompClient || !isConnected) return;

    stompClient.send('/app/chat.typing', {}, JSON.stringify({
        senderId: currentUser.id,
        receiverId: activePeer.id,
        isTyping: true
    }));

    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
        stompClient.send('/app/chat.typing', {}, JSON.stringify({
            senderId: currentUser.id,
            receiverId: activePeer.id,
            isTyping: false
        }));
    }, 2500);
}

function handleTypingNotification(isTyping) {
    const typingBar = document.getElementById('typingIndicatorBar');
    const typingText = document.getElementById('typingIndicatorText');

    if (isTyping && activePeer) {
        typingText.textContent = `${activePeer.displayName || activePeer.username} is typing`;
        typingBar.classList.remove('hidden');
        scrollFeedToBottom();
    } else {
        typingBar.classList.add('hidden');
    }
}

// Utilities
function formatTime(isoString) {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function escapeHtml(text) {
    if (!text) return '';
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
