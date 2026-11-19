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
let currentView = 'messages'; // 'messages', 'contacts', or 'pinned'
let currentMessagesFilter = 'conversations'; // 'conversations' or 'unread'
let currentContactsFilter = 'all'; // 'all' or 'online'
let toastTimer = null;

// WhatsApp-Inspired User Customization State
let userSettings = {
    statusBio: 'Available • Using messiQ',
    lastSeenPrivacy: 'everyone',
    readReceipts: true,
    typingBroadcast: true,
    enterToSend: true,
    wallpaper: 'celadon',
    fontSize: 'md',
    messageSounds: true,
    desktopNotifications: false
};

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    updateTopbarDate();
    initGlobalKeyListeners();
    checkStoredSession();
    initRandomMockupProfiles();
});

// =========================================================
// RANDOM INDIAN PROFILES FOR LIVE APPLICATION PREVIEW
// =========================================================

const RANDOM_INDIAN_PROFILES = [
    { name: 'Aarav Sharma', seed: 'Aarav', snippet: 'The WebSocket delivery is blazing fast!', time: '11:42 AM', status: 'Online now • Available', incomingMsg: 'Here are the latest photo shoot previews from Jaipur! 🌿', photoTitle: 'Hawa Mahal • Jaipur, India (2.4 MB)' },
    { name: 'Priya Patel', seed: 'Priya', snippet: 'Double blue read receipts look seamless.', time: '11:15 AM', status: 'Online now • Available', incomingMsg: 'Checked the real-time presence channel, working 100%! ✨', photoTitle: 'Amber Palace • Rajasthan, India (3.1 MB)' },
    { name: 'Rohan Verma', seed: 'Rohan', snippet: 'Audio voice note sounded super crisp!', time: '10:50 AM', status: 'Online now • Audio Lead', incomingMsg: 'Just recorded a quick voice summary for the team.', photoTitle: 'Dal Lake • Srinagar, India (1.8 MB)' },
    { name: 'Ananya Iyer', seed: 'Ananya', snippet: 'Multi-tab state synchronized instantaneously.', time: 'Yesterday', status: 'Online now • Available', incomingMsg: 'Testing real-time message notifications across clients.', photoTitle: 'Tea Gardens • Munnar, India (2.7 MB)' },
    { name: 'Kabir Mehta', seed: 'Kabir', snippet: 'Ready for the live demo showcase.', time: 'Yesterday', status: 'Offline • Last seen 2h ago', incomingMsg: 'Everything is prepared and ready for today’s session.', photoTitle: 'Marine Drive • Mumbai, India (2.2 MB)' },
    { name: 'Diya Sen', seed: 'Diya', snippet: 'Photo attachment uploaded in under 120ms.', time: '2 days ago', status: 'Offline • Last seen yesterday', incomingMsg: 'Check out the new high-resolution photo gallery!', photoTitle: 'Victoria Memorial • Kolkata, India (2.5 MB)' },
    { name: 'Ishaan Malhotra', seed: 'Ishaan', snippet: 'End-to-end encryption handshake active.', time: '2 days ago', status: 'Online now • Available', incomingMsg: 'Secure token verification passed all curriculum tests.', photoTitle: 'Qutub Minar • New Delhi, India (2.9 MB)' },
    { name: 'Neha Joshi', seed: 'Neha', snippet: 'Quick emoji send feels so responsive 👍', time: '3 days ago', status: 'Online now • Available', incomingMsg: 'Loved the 1-click thumbs up instant reaction!', photoTitle: 'Pangong Lake • Ladakh, India (3.4 MB)' },
    { name: 'Aditya Nair', seed: 'Aditya', snippet: 'Presence tracking working across devices.', time: '4 days ago', status: 'Offline • Last seen recently', incomingMsg: 'Connected from desktop and web simultaneously.', photoTitle: 'Backwaters • Alleppey, India (2.1 MB)' },
    { name: 'Tanvi Deshmukh', seed: 'Tanvi', snippet: 'Pinned chat toggle count updates dynamically.', time: '5 days ago', status: 'Online now • Available', incomingMsg: 'Pinned conversations stay pinned right at the top!', photoTitle: 'Gateway of India • Mumbai, India (2.8 MB)' }
];

let activeMockupProfiles = [];
let activeMockupIndex = 0;

function initRandomMockupProfiles() {
    // Pick 3 distinct random Indian profiles from pool
    const poolCopy = [...RANDOM_INDIAN_PROFILES];
    for (let i = poolCopy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [poolCopy[i], poolCopy[j]] = [poolCopy[j], poolCopy[i]];
    }
    activeMockupProfiles = poolCopy.slice(0, 3);
    activeMockupIndex = 0;

    // Populate Sidebar Items
    activeMockupProfiles.forEach((profile, idx) => {
        const elName = document.getElementById(`mockupName${idx + 1}`);
        const elAvatar = document.getElementById(`mockupAvatar${idx + 1}`);
        const elSnippet = document.getElementById(`mockupSnippet${idx + 1}`);
        const elTime = document.getElementById(`mockupTime${idx + 1}`);

        if (elName) elName.textContent = profile.name;
        if (elAvatar) elAvatar.src = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(profile.seed)}`;
        if (elSnippet) elSnippet.textContent = profile.snippet;
        if (elTime) elTime.textContent = profile.time;
    });

    renderMockupActiveTarget(0);
}

function selectMockupProfile(index) {
    if (!activeMockupProfiles || !activeMockupProfiles[index]) return;
    activeMockupIndex = index;

    // Update active highlight on mockup items
    [1, 2, 3].forEach(num => {
        const item = document.getElementById(`mockupItem${num}`);
        if (item) item.classList.toggle('active', num === index + 1);
    });

    renderMockupActiveTarget(index);
}

function renderMockupActiveTarget(index) {
    const profile = activeMockupProfiles[index];
    if (!profile) return;

    const elActiveTarget = document.getElementById('mockupActiveName');
    const elActiveStatus = document.getElementById('mockupActiveStatus');
    const elIncomingMsg = document.getElementById('mockupIncomingMsg');
    const elPhotoTitle = document.getElementById('mockupPhotoTitle');

    if (elActiveTarget) elActiveTarget.textContent = profile.name;
    if (elActiveStatus) elActiveStatus.textContent = `● ${profile.status}`;
    if (elIncomingMsg && profile.incomingMsg) elIncomingMsg.textContent = profile.incomingMsg;
    if (elPhotoTitle && profile.photoTitle) elPhotoTitle.textContent = profile.photoTitle;
}

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

function handleLogout(e) {
    toggleProfilePopover(e, 'rail');
}

function executeSignOut() {
    closeProfilePopover();
    closeContactDetailsPane();

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

    showToast('Signed out of messiQ');
    // Transition back to clean Home Page
    showHomeScreen();
    scrollToTop();
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

// =========================================================
// RECEIVER-SIDE MESSAGE DEDUPLICATION CACHE & READ RECEIPTS
// =========================================================

const processedMessageCache = new Set();

function isMessageAlreadyProcessed(msg) {
    if (!msg) return false;
    let key = '';
    if (msg.id) {
        key = `id_${msg.id}`;
    } else {
        key = `fp_${msg.senderId}_${msg.receiverId}_${msg.timestamp}_${msg.content || ''}`;
    }
    if (processedMessageCache.has(key)) {
        return true;
    }
    processedMessageCache.add(key);
    if (processedMessageCache.size > 1000) {
        const first = processedMessageCache.values().next().value;
        processedMessageCache.delete(first);
    }
    return false;
}

function handleReadReceiptEvent(event) {
    if (!currentUser || !event) return;
    // When the peer reads our messages, turn all sent double ticks blue
    if (activePeer && Number(event.receiverId) === Number(activePeer.id)) {
        const feed = document.getElementById('messageFeed');
        if (feed) {
            const checks = feed.querySelectorAll('.msg-row.outgoing .read-check');
            checks.forEach(check => {
                check.classList.add('is-read');
                check.title = 'Read';
                check.innerHTML = `• Read <i class="fa-solid fa-check-double blue-ticks"></i>`;
            });
        }
    }
}

/**
 * Instantaneous real-time message handler without page refresh
 */
function handleIncomingMessage(chatMessage) {
    if (!currentUser || !chatMessage) return;

    // 1. Check if this is a real-time read receipt notification
    if (chatMessage.type === 'READ_RECEIPT') {
        handleReadReceiptEvent(chatMessage);
        return;
    }

    // 2. Triple Cache & duplicate reception protection on receiver's side
    // Drops any duplicated packet arriving from multiple topics (user topic, queue, or pairwise topic)
    if (isMessageAlreadyProcessed(chatMessage)) {
        return;
    }

    // Trigger audio chime & notification if message was sent by another user
    if (chatMessage.senderId !== currentUser.id) {
        if (userSettings.messageSounds) {
            playMessageNotificationSound();
        }
        if (userSettings.desktopNotifications && document.hidden && 'Notification' in window && Notification.permission === 'granted') {
            const senderName = chatMessage.senderUsername || 'Contact';
            try {
                new Notification(`messiQ: ${senderName}`, {
                    body: chatMessage.content || (chatMessage.type === 'IMAGE' ? '📷 Photo attachment' : 'Sent a file'),
                    icon: `https://api.dicebear.com/7.x/bottts/svg?seed=${senderName}`
                });
            } catch (e) {}
        }
    }

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
    if (currentView === 'messages' || currentView === 'pinned') {
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

    // Load WhatsApp-style settings (wallpaper, bio, font size, etc.)
    loadUserSettings();

    // DO NOT open any default chat! Start with clean empty state
    activePeer = null;
    document.getElementById('chatActiveContainer').classList.add('hidden');
    document.getElementById('chatEmptyState').classList.remove('hidden');

    connectWebSocket();
    loadConversationsList();
    loadDirectoryList();
    switchToMessagesView();
}

// =========================================================
// PINNED CHATS ENGINE
// =========================================================

function getPinnedUserIds() {
    if (!currentUser) return [];
    try {
        const stored = localStorage.getItem(`messiq_pinned_${currentUser.id}`);
        return stored ? JSON.parse(stored).map(Number) : [];
    } catch (e) {
        return [];
    }
}

function savePinnedUserIds(ids) {
    if (!currentUser) return;
    localStorage.setItem(`messiq_pinned_${currentUser.id}`, JSON.stringify(ids.map(Number)));
}

function isChatPinned(userId) {
    if (!userId) return false;
    const ids = getPinnedUserIds();
    return ids.includes(Number(userId));
}

// =========================================================
// PINNED MESSAGE ENGINE (INDIVIDUAL MESSAGE PINNING)
// =========================================================

function getPinnedMessagesMap() {
    if (!currentUser) return {};
    try {
        const stored = localStorage.getItem(`messiq_pinned_messages_${currentUser.id}`);
        return stored ? JSON.parse(stored) : {};
    } catch (e) {
        return {};
    }
}

function getPinnedMessageForPeer(peerId) {
    if (!peerId) return null;
    const map = getPinnedMessagesMap();
    return map[Number(peerId)] || null;
}

function savePinnedMessageForPeer(peerId, pinnedMsg) {
    if (!currentUser || !peerId) return;
    const map = getPinnedMessagesMap();
    map[Number(peerId)] = pinnedMsg;
    localStorage.setItem(`messiq_pinned_messages_${currentUser.id}`, JSON.stringify(map));
}

function removePinnedMessageForPeer(peerId) {
    if (!currentUser || !peerId) return;
    const map = getPinnedMessagesMap();
    delete map[Number(peerId)];
    localStorage.setItem(`messiq_pinned_messages_${currentUser.id}`, JSON.stringify(map));
}

function updatePinnedMessageBanner() {
    const banner = document.getElementById('pinnedMessageBanner');
    const textEl = document.getElementById('pinnedBannerText');
    if (!banner || !activePeer) {
        if (banner) banner.classList.add('hidden');
        return;
    }

    const pinned = getPinnedMessageForPeer(activePeer.id);
    if (!pinned) {
        banner.classList.add('hidden');
        return;
    }

    let snippet = pinned.content || '';
    if (pinned.type === 'IMAGE' || (pinned.mediaUrl && pinned.mediaUrl.match(/\.(jpeg|jpg|gif|png|webp)$/i))) {
        snippet = '📷 ' + (pinned.fileName || 'Photo attachment');
    } else if (pinned.type === 'AUDIO' || (snippet && snippet.startsWith('[VOICE_NOTE]'))) {
        snippet = '🎤 Voice message (' + (pinned.fileName || '0:05') + ')';
    }
    if (snippet.length > 55) {
        snippet = snippet.substring(0, 52) + '...';
    }

    if (textEl) textEl.textContent = snippet || 'Pinned message';
    banner.classList.remove('hidden');
}

function togglePinMessage(e, msgId) {
    if (e) {
        e.stopPropagation();
        e.preventDefault();
    }
    if (!currentUser || !activePeer) return;

    const pinned = getPinnedMessageForPeer(activePeer.id);
    const msgIdNum = Number(msgId);

    // If this message is already pinned, clicking it unpins it
    if (pinned && Number(pinned.id) === msgIdNum) {
        unpinCurrentMessage(e);
        return;
    }

    // Find the message row in the DOM
    const feed = document.getElementById('messageFeed');
    const rowEl = feed ? feed.querySelector(`.msg-row[data-msg-id="${msgId}"]`) : null;
    let content = '';
    let type = 'CHAT';
    let fileName = '';
    let mediaUrl = '';

    if (rowEl) {
        const textSpan = rowEl.querySelector('.msg-bubble span');
        if (textSpan) content = textSpan.textContent;
        const img = rowEl.querySelector('.media-grid img');
        if (img) {
            type = 'IMAGE';
            mediaUrl = img.src;
        }
        const audioCap = rowEl.querySelector('.audio-capsule');
        if (audioCap) {
            type = 'AUDIO';
        }
    }

    const pinnedPayload = {
        id: msgIdNum,
        content: content,
        type: type,
        fileName: fileName,
        mediaUrl: mediaUrl,
        timestamp: new Date().toISOString()
    };

    savePinnedMessageForPeer(activePeer.id, pinnedPayload);
    updatePinnedMessageBanner();

    // Update active highlight / tag in the feed
    if (feed) {
        feed.querySelectorAll('.msg-pin-btn').forEach(btn => {
            const isMatch = Number(btn.getAttribute('data-pin-id')) === msgIdNum;
            btn.classList.toggle('pinned', isMatch);
            btn.title = isMatch ? 'Unpin message' : 'Pin message';
        });

        feed.querySelectorAll('.pinned-bubble-tag').forEach(tag => tag.remove());
        if (rowEl) {
            const tag = document.createElement('div');
            tag.className = 'pinned-bubble-tag';
            tag.innerHTML = `<i class="fa-solid fa-thumbtack"></i> Pinned`;
            rowEl.insertBefore(tag, rowEl.firstChild);
        }
    }

    showToast('Message pinned to chat');
}

function jumpToPinnedMessage() {
    if (!activePeer) return;
    const pinned = getPinnedMessageForPeer(activePeer.id);
    if (!pinned) return;

    const feed = document.getElementById('messageFeed');
    if (!feed) return;

    const rowEl = feed.querySelector(`.msg-row[data-msg-id="${pinned.id}"]`);
    if (rowEl) {
        rowEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        rowEl.classList.remove('pulse-highlight');
        void rowEl.offsetWidth; // force reflow
        rowEl.classList.add('pulse-highlight');
        setTimeout(() => rowEl.classList.remove('pulse-highlight'), 1800);
    } else {
        showToast('Pinned message is earlier in history');
    }
}

function unpinCurrentMessage(e) {
    if (e) {
        e.stopPropagation();
        e.preventDefault();
    }
    if (!activePeer) return;

    removePinnedMessageForPeer(activePeer.id);
    updatePinnedMessageBanner();

    const feed = document.getElementById('messageFeed');
    if (feed) {
        feed.querySelectorAll('.msg-pin-btn.pinned').forEach(btn => {
            btn.classList.remove('pinned');
            btn.title = 'Pin message';
        });
        feed.querySelectorAll('.pinned-bubble-tag').forEach(tag => tag.remove());
    }

    showToast('Message unpinned');
}

// =========================================================
// PERSISTENT CLEARED CHATS (DELETER SIDE PERSISTENCE)
// =========================================================

function getClearedChatTimestamps() {
    if (!currentUser) return {};
    try {
        const stored = localStorage.getItem(`messiq_cleared_${currentUser.id}`);
        return stored ? JSON.parse(stored) : {};
    } catch (e) {
        return {};
    }
}

function saveClearedChatTimestamp(peerId, isoTimestamp) {
    if (!currentUser || !peerId) return;
    const map = getClearedChatTimestamps();
    map[Number(peerId)] = isoTimestamp;
    localStorage.setItem(`messiq_cleared_${currentUser.id}`, JSON.stringify(map));
}

function getClearedChatTimestampForPeer(peerId) {
    if (!peerId) return null;
    const map = getClearedChatTimestamps();
    return map[Number(peerId)] || null;
}

function togglePinChat(e, userId) {
    if (e) {
        e.stopPropagation();
        e.preventDefault();
    }
    if (!currentUser || !userId) return;

    userId = Number(userId);
    let ids = getPinnedUserIds();
    const index = ids.indexOf(userId);

    if (index >= 0) {
        ids.splice(index, 1);
        showToast('Chat unpinned');
    } else {
        ids.push(userId);
        showToast('Chat pinned to top');
    }

    savePinnedUserIds(ids);
    updateActiveChatPinButton();
    updateSidebarCount();
    renderSidebarList();
}

function togglePinActiveChat() {
    if (!activePeer) return;
    togglePinChat(null, activePeer.id);
}

function togglePinActiveChatFromDetails(shouldPin) {
    if (!currentUser || !activePeer) return;
    const userId = Number(activePeer.id);
    let ids = getPinnedUserIds();
    const index = ids.indexOf(userId);

    if (shouldPin && index === -1) {
        ids.push(userId);
        showToast('Chat pinned to top');
    } else if (!shouldPin && index >= 0) {
        ids.splice(index, 1);
        showToast('Chat unpinned');
    }

    savePinnedUserIds(ids);
    updateActiveChatPinButton();
    updateSidebarCount();
    renderSidebarList();
}

function updateActiveChatPinButton() {
    const isPinned = activePeer ? isChatPinned(activePeer.id) : false;
    const btn = document.getElementById('chatPinHeaderBtn');
    if (btn) {
        if (isPinned) {
            btn.classList.add('active');
            btn.title = 'Unpin this conversation';
        } else {
            btn.classList.remove('active');
            btn.title = 'Pin conversation to top';
        }
    }

    const pinToggle = document.getElementById('detailsPinToggle');
    const pinSubtext = document.getElementById('detailsPinnedCountSubtext');
    const pinnedCount = getPinnedUserIds().length;

    if (pinToggle) {
        pinToggle.checked = isPinned;
    }
    if (pinSubtext) {
        pinSubtext.textContent = isPinned 
            ? `Pinned to top (${pinnedCount} pinned)` 
            : `Pin this chat to top (${pinnedCount} total pinned)`;
    }
}

function switchToMessagesView() {
    currentView = 'messages';
    const railMsg = document.getElementById('railBtnMessages');
    const railContacts = document.getElementById('railBtnContacts');
    const railPinned = document.getElementById('railBtnPinned');
    if (railMsg) railMsg.classList.add('active');
    if (railContacts) railContacts.classList.remove('active');
    if (railPinned) railPinned.classList.remove('active');

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
    const railPinned = document.getElementById('railBtnPinned');
    if (railMsg) railMsg.classList.remove('active');
    if (railContacts) railContacts.classList.add('active');
    if (railPinned) railPinned.classList.remove('active');

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

function switchToPinnedView() {
    currentView = 'pinned';
    const railMsg = document.getElementById('railBtnMessages');
    const railContacts = document.getElementById('railBtnContacts');
    const railPinned = document.getElementById('railBtnPinned');
    if (railMsg) railMsg.classList.remove('active');
    if (railContacts) railContacts.classList.remove('active');
    if (railPinned) railPinned.classList.add('active');

    const title = document.getElementById('sidebarTitle');
    const label = document.getElementById('sectionLabel');
    const searchInput = document.getElementById('userSearchInput');
    const msgFilter = document.getElementById('messagesFilterRow');
    const contactsFilter = document.getElementById('contactsFilterRow');

    if (title) title.textContent = 'Pinned';
    if (label) label.textContent = 'PINNED CONVERSATIONS';
    if (searchInput) searchInput.placeholder = 'Search pinned chats...';
    if (msgFilter) msgFilter.classList.add('hidden');
    if (contactsFilter) contactsFilter.classList.add('hidden');

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
    } else if (currentView === 'pinned') {
        const pinnedIds = getPinnedUserIds();
        const count = recentConversations.filter(c => c.user && pinnedIds.includes(Number(c.user.id))).length;
        badge.textContent = count;
    } else {
        badge.textContent = allUsers.length;
    }
}

async function loadConversationsList() {
    if (!currentUser) return;
    try {
        const res = await fetch(`/api/messages/conversations?userId=${currentUser.id}`);
        const data = await res.json();
        if (data.success && data.data) {
            recentConversations = data.data.map(conv => {
                if (conv && conv.user && conv.lastMessage) {
                    const clearTime = getClearedChatTimestampForPeer(conv.user.id);
                    if (clearTime && conv.lastMessage.timestamp && new Date(conv.lastMessage.timestamp) <= new Date(clearTime)) {
                        return {
                            ...conv,
                            lastMessage: null,
                            unreadCount: 0
                        };
                    }
                }
                return conv;
            });
            updateSidebarCount();
            if (currentView === 'messages' || currentView === 'pinned') {
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
            if (currentView === 'contacts' || currentView === 'pinned') {
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
    } else if (currentView === 'pinned') {
        const pinnedIds = getPinnedUserIds();
        let items = recentConversations.filter(c => c.user && pinnedIds.includes(Number(c.user.id)));
        pinnedIds.forEach(id => {
            if (!items.some(it => it.user && it.user.id === Number(id))) {
                const foundU = allUsers.find(u => u.id === Number(id));
                if (foundU) items.push({ user: foundU, lastMessage: null, unreadCount: 0 });
            }
        });
        const filtered = items.filter(c => {
            const name = (c.user.displayName || '').toLowerCase();
            const username = (c.user.username || '').toLowerCase();
            const lastMsg = c.lastMessage && c.lastMessage.content ? c.lastMessage.content.toLowerCase() : '';
            return name.includes(q) || username.includes(q) || lastMsg.includes(q);
        });
        renderPinnedCards(filtered);
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
        let items = [...recentConversations];
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
        // Always sort pinned conversations to the very top of messages list
        items.sort((a, b) => {
            const aPinned = isChatPinned(a.user.id);
            const bPinned = isChatPinned(b.user.id);
            if (aPinned && !bPinned) return -1;
            if (!aPinned && bPinned) return 1;
            return 0;
        });
        renderMessagesCards(items);
    } else if (currentView === 'pinned') {
        const pinnedIds = getPinnedUserIds();
        let items = recentConversations.filter(c => c.user && pinnedIds.includes(Number(c.user.id)));
        
        // Also include any user who was pinned from contacts even if no prior message history
        pinnedIds.forEach(id => {
            if (!items.some(it => it.user && it.user.id === Number(id))) {
                const foundU = allUsers.find(u => u.id === Number(id));
                if (foundU) {
                    items.push({ user: foundU, lastMessage: null, unreadCount: 0 });
                }
            }
        });

        if (query) {
            items = items.filter(c => {
                const name = (c.user.displayName || '').toLowerCase();
                const username = (c.user.username || '').toLowerCase();
                const lastMsg = c.lastMessage && c.lastMessage.content ? c.lastMessage.content.toLowerCase() : '';
                return name.includes(query) || username.includes(query) || lastMsg.includes(query);
            });
        }
        renderPinnedCards(items);
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
        const isPinned = isChatPinned(peer.id);

        const card = document.createElement('div');
        card.className = `contact-card ${activePeer && activePeer.id === peer.id ? 'active' : ''}`;
        card.onclick = () => selectConversationPeer(peer);

        let previewText = 'Started a conversation';
        if (lastMsg) {
            if (lastMsg.type === 'IMAGE') previewText = '📷 Photo attachment';
            else if (lastMsg.type === 'AUDIO' || (lastMsg.content && lastMsg.content.startsWith('[VOICE_NOTE]'))) {
                previewText = '🎤 Voice message' + (lastMsg.fileName ? ` (${lastMsg.fileName})` : '');
            }
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
                    <span class="contact-name">
                        ${escapeHtml(peer.displayName || peer.username)}
                        ${isPinned ? '<i class="fa-solid fa-thumbtack pinned-indicator" title="Pinned Chat"></i>' : ''}
                    </span>
                    <div style="display:flex; align-items:center; gap:6px;">
                        <span class="contact-time">${timeStr}</span>
                        <button type="button" class="pin-card-btn ${isPinned ? 'pinned' : ''}" title="${isPinned ? 'Unpin chat' : 'Pin chat to top'}" onclick="togglePinChat(event, ${peer.id})">
                            <i class="fa-solid fa-thumbtack"></i>
                        </button>
                    </div>
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

function renderPinnedCards(items) {
    const listContainer = document.getElementById('userList');
    if (!listContainer) return;
    listContainer.innerHTML = '';

    if (items.length === 0) {
        listContainer.innerHTML = `
            <div style="text-align:center; padding:36px 14px; color:var(--composer-meta-text); font-size:12.5px;">
                <i class="fa-solid fa-thumbtack" style="font-size:24px; margin-bottom:8px; display:block; opacity:0.6; transform:rotate(45deg);"></i>
                No pinned chats yet.<br>Click the pin icon on any chat to keep it at the top!
                <div style="margin-top:14px;">
                    <button onclick="switchToMessagesView()" style="background:var(--composer-send-bg); color:var(--composer-send-color); border:none; padding:7px 16px; border-radius:999px; font-size:12px; font-weight:600; cursor:pointer;">
                        <i class="fa-solid fa-comment"></i> View Messages
                    </button>
                </div>
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

        let previewText = 'Pinned conversation';
        if (lastMsg) {
            if (lastMsg.type === 'IMAGE') previewText = '📷 Photo attachment';
            else if (lastMsg.type === 'AUDIO' || (lastMsg.content && lastMsg.content.startsWith('[VOICE_NOTE]'))) {
                previewText = '🎤 Voice message' + (lastMsg.fileName ? ` (${lastMsg.fileName})` : '');
            }
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
                    <span class="contact-name">
                        ${escapeHtml(peer.displayName || peer.username)}
                        <i class="fa-solid fa-thumbtack pinned-indicator" title="Pinned Chat"></i>
                    </span>
                    <div style="display:flex; align-items:center; gap:6px;">
                        <span class="contact-time">${timeStr}</span>
                        <button type="button" class="pin-card-btn pinned" title="Unpin chat" onclick="togglePinChat(event, ${peer.id})">
                            <i class="fa-solid fa-thumbtack"></i>
                        </button>
                    </div>
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
        const isPinned = isChatPinned(peer.id);
        card.className = `contact-card ${activePeer && activePeer.id === peer.id ? 'active' : ''}`;
        card.onclick = () => selectConversationPeer(peer);

        card.innerHTML = `
            <div class="contact-avatar-wrapper">
                <img src="${peer.avatarUrl || 'https://api.dicebear.com/7.x/bottts/svg?seed=' + peer.username}" alt="${peer.username}" class="contact-avatar">
                <span class="status-indicator-dot ${isOnline ? 'online' : 'offline'}"></span>
            </div>
            <div class="contact-info">
                <div class="contact-top">
                    <span class="contact-name">
                        ${escapeHtml(peer.displayName || peer.username)}
                        ${isPinned ? '<i class="fa-solid fa-thumbtack pinned-indicator" title="Pinned Chat"></i>' : ''}
                    </span>
                    <div style="display:flex; align-items:center; gap:6px;">
                        <span class="contact-badge-pill ${isOnline ? 'online' : 'offline'}">${isOnline ? 'Online' : 'Offline'}</span>
                        <button type="button" class="pin-card-btn ${isPinned ? 'pinned' : ''}" title="${isPinned ? 'Unpin chat' : 'Pin chat to top'}" onclick="togglePinChat(event, ${peer.id})">
                            <i class="fa-solid fa-thumbtack"></i>
                        </button>
                    </div>
                </div>
                <div class="contact-bottom">
                    <span class="contact-preview">@${escapeHtml(peer.username)}</span>
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
    updateActiveChatPinButton();
    updateContactDetailsContent();
    updatePinnedMessageBanner();

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
            // Route through handleIncomingMessage with deduplication cache protection
            handleIncomingMessage(chatMessage);
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
        <div class="date-divider"><span>Today</span></div>
        <div style="text-align:center; padding:30px; color:var(--composer-meta-text);">
            <i class="fa-solid fa-spinner fa-spin" style="font-size:20px;"></i>
            <p style="margin-top:8px; font-size:12px;">Loading messages...</p>
        </div>`;

    try {
        const res = await fetch(`/api/messages/history?user1=${currentUser.id}&user2=${activePeer.id}`);
        const data = await res.json();
        
        feed.innerHTML = `<div class="date-divider"><span>Today</span></div>`;

        if (data.success && data.data) {
            const clearTime = getClearedChatTimestampForPeer(activePeer.id);
            let messages = data.data;
            if (clearTime) {
                const clearDate = new Date(clearTime);
                messages = messages.filter(msg => msg.timestamp && new Date(msg.timestamp) > clearDate);
            }

            if (messages.length > 0) {
                messages.forEach(msg => appendMessageBubble(msg));
                scrollFeedToBottom();
            } else {
                feed.innerHTML += `
                    <div style="text-align:center; padding:40px 20px; color:var(--composer-meta-text); font-size:13px;">
                        <i class="fa-regular fa-paper-plane" style="font-size:24px; margin-bottom:8px; display:block; opacity:0.6;"></i>
                        No messages yet.<br>Say hello to start the conversation!
                    </div>`;
            }
            updatePinnedMessageBanner();
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
    if (!feed) return;

    // DOM duplicate check and live status update
    if (msg.id) {
        const existing = feed.querySelector(`.msg-row[data-msg-id="${msg.id}"]`);
        if (existing) {
            if (msg.status === 'READ') {
                const check = existing.querySelector('.read-check');
                if (check) {
                    check.classList.add('is-read');
                    check.title = 'Read';
                    check.innerHTML = `• Read <i class="fa-solid fa-check-double blue-ticks"></i>`;
                }
            }
            return;
        }
    }

    const isSent = msg.senderId === currentUser.id;
    const isRead = msg.status === 'READ';

    const pinned = activePeer ? getPinnedMessageForPeer(activePeer.id) : null;
    const isThisMsgPinned = pinned && msg.id && Number(pinned.id) === Number(msg.id);
    const pinBtnHtml = msg.id 
        ? `<button type="button" class="msg-pin-btn ${isThisMsgPinned ? 'pinned' : ''}" data-pin-id="${msg.id}" onclick="togglePinMessage(event, ${msg.id})" title="${isThisMsgPinned ? 'Unpin message' : 'Pin message'}"><i class="fa-solid fa-thumbtack"></i></button>`
        : '';
    const pinnedTagHtml = isThisMsgPinned
        ? `<div class="pinned-bubble-tag"><i class="fa-solid fa-thumbtack"></i> Pinned</div>`
        : '';

    const row = document.createElement('div');
    row.className = `msg-row ${isSent ? 'outgoing' : 'incoming'}`;
    if (msg.id) {
        row.setAttribute('data-msg-id', msg.id);
    }

    const timeStr = formatTime(msg.timestamp);
    const readCheckHtml = isSent 
        ? (isRead 
            ? `<span class="read-check is-read" title="Read">• Read <i class="fa-solid fa-check-double blue-ticks"></i></span>`
            : `<span class="read-check" title="Delivered">• Sent <i class="fa-solid fa-check-double"></i></span>`)
        : '';

    // 1. Photo / Media Card (matching Figma Casa Olivo shoot layout)
    if (msg.mediaUrl && (msg.type === 'IMAGE' || msg.mediaUrl.match(/\.(jpeg|jpg|gif|png|webp)$/i))) {
        row.innerHTML = `
            ${pinnedTagHtml}
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
                ${readCheckHtml}
                ${pinBtnHtml}
            </div>
        `;
    } 
    // 2. Audio Voice Note
    else if (msg.type === 'AUDIO' || (msg.content && msg.content.startsWith('[VOICE_NOTE]'))) {
        const audioId = 'aud_' + Math.random().toString(36).substring(2, 9);
        const duration = msg.fileName || '0:05';
        const audioSrc = msg.mediaUrl || '';
        row.innerHTML = `
            ${pinnedTagHtml}
            <div style="display:flex; align-items:center;">
                <div class="audio-capsule" id="capsule_${audioId}">
                    <button type="button" class="audio-play-btn" onclick="toggleVoiceAudioPlayback('${audioId}', '${audioSrc}', '${escapeHtml(duration)}')" title="Play / Pause Voice Note">
                        <i class="fa-solid fa-play" id="icon_${audioId}"></i>
                    </button>
                    <div class="audio-waveform" id="wave_${audioId}">
                        <span style="height:6px"></span><span style="height:12px"></span>
                        <span style="height:18px"></span><span style="height:14px"></span>
                        <span style="height:10px"></span><span style="height:16px"></span>
                        <span style="height:8px"></span><span style="height:14px"></span>
                        <span style="height:20px"></span><span style="height:11px"></span>
                        <span style="height:7px"></span><span style="height:15px"></span>
                        <span style="height:12px"></span><span style="height:6px"></span>
                    </div>
                    <span class="audio-duration" id="dur_${audioId}">${escapeHtml(duration)}</span>
                    ${audioSrc ? `<audio id="${audioId}" src="${audioSrc}" preload="auto" onended="onVoiceAudioEnded('${audioId}')"></audio>` : ''}
                </div>
                <span class="reaction-badge" onclick="reactToMessage(this)" title="React with Heart">🤍 1</span>
            </div>
            <div class="msg-meta">
                <span>${timeStr}</span>
                ${readCheckHtml}
                ${pinBtnHtml}
            </div>
        `;
    }
    // 3. Regular Text Message Bubble
    else {
        row.innerHTML = `
            ${pinnedTagHtml}
            <div class="msg-bubble">
                ${msg.mediaUrl ? `<div style="margin-bottom:6px;"><a href="${msg.mediaUrl}" target="_blank" style="color:#60a5fa; text-decoration:none;"><i class="fa-solid fa-paperclip"></i> ${escapeHtml(msg.fileName || 'Attachment')}</a></div>` : ''}
                <span>${escapeHtml(msg.content || '')}</span>
            </div>
            <div class="msg-meta">
                <span>${timeStr}</span>
                ${readCheckHtml}
                ${pinBtnHtml}
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

// =========================================================
// EMOJI QUICK PICKER ENGINE (POPULAR EMOJIS: ❤️ 😂 😭 😊 🔥)
// =========================================================

function toggleEmojiPicker(e) {
    if (e) e.stopPropagation();
    const bar = document.getElementById('emojiPickerBar');
    if (!bar) return;
    bar.classList.toggle('hidden');
}

function closeEmojiPicker() {
    const bar = document.getElementById('emojiPickerBar');
    if (bar) bar.classList.add('hidden');
}

function insertEmoji(emojiChar) {
    const input = document.getElementById('chatMessageInput');
    if (!input) return;

    const start = input.selectionStart != null ? input.selectionStart : input.value.length;
    const end = input.selectionEnd != null ? input.selectionEnd : input.value.length;
    const currentVal = input.value;

    input.value = currentVal.substring(0, start) + emojiChar + currentVal.substring(end);
    input.focus();
    input.selectionStart = input.selectionEnd = start + emojiChar.length;

    handleTyping();
    closeEmojiPicker();
}

async function sendEmojiDirectly(emojiChar) {
    closeEmojiPicker();
    if (!activePeer || !currentUser) {
        showToast('Select a conversation to send emoji');
        return;
    }

    try {
        const messagePayload = {
            senderId: currentUser.id,
            senderUsername: currentUser.username,
            receiverId: activePeer.id,
            receiverUsername: activePeer.username,
            content: emojiChar,
            type: 'CHAT',
            mediaUrl: null,
            fileName: null,
            fileSize: null,
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
        updateConversationInList(messagePayload);
    } catch (err) {
        console.error('Failed to send emoji', err);
    }
}

// =========================================================
// PROPER VOICE MESSAGE RECORDING & AUDIO PLAYBACK ENGINE
// =========================================================

let mediaRecorder = null;
let audioChunks = [];
let voiceRecInterval = null;
let voiceRecSeconds = 0;
let voiceAudioStream = null;
let currentlyPlayingAudioId = null;
let currentSynthStopCallback = null;

async function startVoiceRecording() {
    if (!activePeer || !currentUser) {
        showToast('Select a conversation to record a voice message');
        return;
    }

    voiceRecSeconds = 0;
    audioChunks = [];
    const timerEl = document.getElementById('voiceRecTimer');
    if (timerEl) timerEl.textContent = '0:00';

    const form = document.getElementById('chatForm');
    const overlay = document.getElementById('voiceRecordingOverlay');
    if (form) form.classList.add('hidden');
    if (overlay) overlay.classList.remove('hidden');

    // Request actual microphone if available
    try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            voiceAudioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder = new MediaRecorder(voiceAudioStream);
            mediaRecorder.ondataavailable = (e) => {
                if (e.data && e.data.size > 0) {
                    audioChunks.push(e.data);
                }
            };
            mediaRecorder.start(250);
        } else {
            mediaRecorder = null;
        }
    } catch (err) {
        console.warn('Microphone hardware/permission unavailable; running in demo simulation:', err);
        mediaRecorder = null;
        showToast('Microphone not detected, recording voice message in demo mode');
    }

    // Live timer counter
    clearInterval(voiceRecInterval);
    voiceRecInterval = setInterval(() => {
        voiceRecSeconds++;
        const mins = Math.floor(voiceRecSeconds / 60);
        const secs = voiceRecSeconds % 60;
        if (timerEl) {
            timerEl.textContent = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
        }
    }, 1000);
}

function cancelVoiceRecording() {
    clearInterval(voiceRecInterval);
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        try { mediaRecorder.stop(); } catch (e) {}
    }
    if (voiceAudioStream) {
        voiceAudioStream.getTracks().forEach(t => t.stop());
        voiceAudioStream = null;
    }
    mediaRecorder = null;
    audioChunks = [];

    const form = document.getElementById('chatForm');
    const overlay = document.getElementById('voiceRecordingOverlay');
    if (form) form.classList.remove('hidden');
    if (overlay) overlay.classList.add('hidden');

    showToast('Voice recording canceled');
}

async function stopAndSendVoiceRecording() {
    clearInterval(voiceRecInterval);

    if (voiceRecSeconds < 1) {
        showToast('Recording too short (minimum 1 second)');
        cancelVoiceRecording();
        return;
    }

    const durationStr = formatVoiceDuration(voiceRecSeconds);
    const form = document.getElementById('chatForm');
    const overlay = document.getElementById('voiceRecordingOverlay');
    if (form) form.classList.remove('hidden');
    if (overlay) overlay.classList.add('hidden');

    let audioBlob = null;
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        try {
            await new Promise(resolve => {
                mediaRecorder.onstop = resolve;
                mediaRecorder.stop();
            });
            if (audioChunks.length > 0) {
                audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
            }
        } catch (e) {
            console.warn('MediaRecorder stop error:', e);
        }
    }
    if (voiceAudioStream) {
        voiceAudioStream.getTracks().forEach(t => t.stop());
        voiceAudioStream = null;
    }

    let mediaUrl = null;
    if (audioBlob) {
        try {
            const formData = new FormData();
            formData.append('file', audioBlob, `voice_${Date.now()}.webm`);
            const uploadRes = await fetch('/api/media/upload', {
                method: 'POST',
                body: formData
            });
            const uploadData = await uploadRes.json();
            if (uploadData.success) {
                mediaUrl = uploadData.data.fileDownloadUri;
            }
        } catch (e) {
            console.warn('Voice upload failed, using local Blob URL', e);
            mediaUrl = URL.createObjectURL(audioBlob);
        }
    }

    const messagePayload = {
        senderId: currentUser.id,
        senderUsername: currentUser.username,
        receiverId: activePeer.id,
        receiverUsername: activePeer.username,
        content: '[VOICE_NOTE]',
        type: 'AUDIO',
        mediaUrl: mediaUrl,
        fileName: durationStr,
        fileSize: audioBlob ? audioBlob.size : 12400,
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
    updateConversationInList(messagePayload);
    showToast(`Voice message (${durationStr}) sent!`);
}

function formatVoiceDuration(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
}

function toggleVoiceAudioPlayback(audioId, audioSrc, durationStr) {
    const icon = document.getElementById(`icon_${audioId}`);
    const wave = document.getElementById(`wave_${audioId}`);
    const audioEl = document.getElementById(audioId);

    // If another audio was playing, stop it first
    if (currentlyPlayingAudioId && currentlyPlayingAudioId !== audioId) {
        stopAnyPlayingVoiceNote();
    }

    // Case 1: Play actual recorded audio element
    if (audioEl && audioSrc) {
        if (audioEl.paused) {
            audioEl.play().then(() => {
                currentlyPlayingAudioId = audioId;
                if (icon) icon.className = 'fa-solid fa-pause';
                if (wave) wave.classList.add('playing');
            }).catch(e => {
                playSynthesizedVoiceTone(audioId, durationStr);
            });
        } else {
            audioEl.pause();
            if (icon) icon.className = 'fa-solid fa-play';
            if (wave) wave.classList.remove('playing');
            currentlyPlayingAudioId = null;
        }
        return;
    }

    // Case 2: Synthesized voice note audio playback
    if (currentlyPlayingAudioId === audioId) {
        stopAnyPlayingVoiceNote();
        return;
    }
    playSynthesizedVoiceTone(audioId, durationStr);
}

function stopAnyPlayingVoiceNote() {
    if (!currentlyPlayingAudioId) return;
    const oldAudio = document.getElementById(currentlyPlayingAudioId);
    if (oldAudio) {
        try { oldAudio.pause(); oldAudio.currentTime = 0; } catch (e) {}
    }
    const oldIcon = document.getElementById(`icon_${currentlyPlayingAudioId}`);
    const oldWave = document.getElementById(`wave_${currentlyPlayingAudioId}`);
    if (oldIcon) oldIcon.className = 'fa-solid fa-play';
    if (oldWave) oldWave.classList.remove('playing');
    if (currentSynthStopCallback) {
        try { currentSynthStopCallback(); } catch (e) {}
        currentSynthStopCallback = null;
    }
    currentlyPlayingAudioId = null;
}

function onVoiceAudioEnded(audioId) {
    const icon = document.getElementById(`icon_${audioId}`);
    const wave = document.getElementById(`wave_${audioId}`);
    if (icon) icon.className = 'fa-solid fa-play';
    if (wave) wave.classList.remove('playing');
    if (currentlyPlayingAudioId === audioId) {
        currentlyPlayingAudioId = null;
    }
}

function playSynthesizedVoiceTone(audioId, durationStr) {
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();

        const icon = document.getElementById(`icon_${audioId}`);
        const wave = document.getElementById(`wave_${audioId}`);
        if (icon) icon.className = 'fa-solid fa-pause';
        if (wave) wave.classList.add('playing');
        currentlyPlayingAudioId = audioId;

        let sec = 4;
        if (durationStr) {
            const parts = durationStr.split(':');
            if (parts.length === 2) {
                sec = (parseInt(parts[0], 10) * 60) + parseInt(parts[1], 10);
            }
        }
        if (sec <= 0) sec = 4;
        sec = Math.min(sec, 8); // cap preview to 8s

        const osc = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(220, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(320, ctx.currentTime + (sec * 0.5));
        osc.frequency.exponentialRampToValueAtTime(260, ctx.currentTime + sec);

        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(440, ctx.currentTime);

        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + sec);

        osc.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);

        osc.start();
        osc2.start();

        const timer = setTimeout(() => {
            onVoiceAudioEnded(audioId);
            try { osc.stop(); osc2.stop(); } catch (e) {}
        }, sec * 1000);

        currentSynthStopCallback = () => {
            clearTimeout(timer);
            try { osc.stop(); osc2.stop(); } catch (e) {}
        };
    } catch (e) {
        console.warn('Synth voice error:', e);
        onVoiceAudioEnded(audioId);
    }
}

function reactToMessage(badgeEl) {
    if (badgeEl.textContent.includes('🤍')) {
        badgeEl.innerHTML = '❤️ 1';
        badgeEl.style.transform = 'scale(1.2)';
        setTimeout(() => badgeEl.style.transform = 'scale(1)', 200);
    } else if (badgeEl.textContent.includes('❤️')) {
        badgeEl.innerHTML = '😂 1';
    } else if (badgeEl.textContent.includes('😂')) {
        badgeEl.innerHTML = '🔥 1';
    } else {
        badgeEl.innerHTML = '🤍 1';
    }
}

// Typing Indicator Handling
function handleTyping() {
    if (!activePeer || !stompClient || !isConnected) return;
    if (userSettings.typingBroadcast === false) return;

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

// =========================================================
// WHATSAPP-STYLE SETTINGS & PREFERENCES ENGINE
// =========================================================

function loadUserSettings() {
    if (!currentUser) return;
    try {
        const stored = localStorage.getItem(`messiq_settings_${currentUser.id}`);
        if (stored) {
            userSettings = { ...userSettings, ...JSON.parse(stored) };
        }
    } catch (e) {
        console.warn('Failed to load user settings', e);
    }

    // Apply chat wallpaper
    setChatWallpaper(userSettings.wallpaper || 'celadon', false);

    // Apply font size
    setChatFontSize(userSettings.fontSize || 'md', false);
}

function saveUserSettings() {
    if (!currentUser) return;
    try {
        localStorage.setItem(`messiq_settings_${currentUser.id}`, JSON.stringify(userSettings));
    } catch (e) {
        console.error('Failed to save user settings', e);
    }
}

function openSettingsModal() {
    if (!currentUser) {
        openAuthModal('login');
        return;
    }

    // Populate user profile info
    const avatarUrl = currentUser.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${currentUser.username}`;
    const profileImg = document.getElementById('settingsProfileAvatarImg');
    const miniAvatar = document.getElementById('settingsUserAvatarMini');
    const nameInput = document.getElementById('settingsDisplayNameInput');
    const userInput = document.getElementById('settingsUsernameInput');
    const emailInput = document.getElementById('settingsEmailInput');
    const bioInput = document.getElementById('settingsBioInput');
    const miniName = document.getElementById('settingsUserNameMini');
    const miniBio = document.getElementById('settingsUserBioMini');

    if (profileImg) profileImg.src = avatarUrl;
    if (miniAvatar) miniAvatar.src = avatarUrl;
    if (nameInput) nameInput.value = currentUser.displayName || currentUser.username;
    if (userInput) userInput.value = `@${currentUser.username}`;
    if (emailInput) emailInput.value = currentUser.email || 'N/A';
    if (bioInput) bioInput.value = userSettings.statusBio || 'Available • Using messiQ';
    if (miniName) miniName.textContent = currentUser.displayName || currentUser.username;
    if (miniBio) miniBio.textContent = userSettings.statusBio || 'Available • Using messiQ';

    // Populate Privacy toggles
    const lastSeenSelect = document.getElementById('settingLastSeen');
    const readReceiptsToggle = document.getElementById('settingReadReceipts');
    const liveTypingToggle = document.getElementById('settingTypingBroadcast');
    if (lastSeenSelect) lastSeenSelect.value = userSettings.lastSeenPrivacy || 'everyone';
    if (readReceiptsToggle) readReceiptsToggle.checked = userSettings.readReceipts !== false;
    if (liveTypingToggle) liveTypingToggle.checked = userSettings.typingBroadcast !== false;

    // Populate Chats toggles
    const enterToSendToggle = document.getElementById('settingEnterToSend');
    if (enterToSendToggle) enterToSendToggle.checked = userSettings.enterToSend !== false;

    // Populate Notifications toggles
    const soundToggle = document.getElementById('settingMessageSounds');
    if (soundToggle) soundToggle.checked = userSettings.messageSounds !== false;

    // Show modal
    const modal = document.getElementById('settingsModal');
    if (modal) modal.classList.remove('hidden');

    // Default to profile tab
    switchSettingsTab('profile');
}

function closeSettingsModal() {
    const modal = document.getElementById('settingsModal');
    if (modal) modal.classList.add('hidden');
}

function handleSettingsOverlayClick(e) {
    if (e.target.id === 'settingsModal') {
        closeSettingsModal();
    }
}

function switchSettingsTab(tabName) {
    const tabs = ['profile', 'privacy', 'chats', 'notifications', 'appearance', 'about'];
    tabs.forEach(tab => {
        const cap = tab.charAt(0).toUpperCase() + tab.slice(1);
        const navBtn = document.getElementById(`setTab${cap}`);
        const panel = document.getElementById(`settingsPanel${cap}`);
        if (navBtn) navBtn.classList.toggle('active', tab === tabName);
        if (panel) panel.classList.toggle('hidden', tab !== tabName);
    });
}

function setQuickBio(bioText) {
    const bioInput = document.getElementById('settingsBioInput');
    if (bioInput) {
        bioInput.value = bioText;
        showToast(`Status bio set to "${bioText}"`);
    }
}

function saveProfileSettings() {
    if (!currentUser) return;
    const nameInput = document.getElementById('settingsDisplayNameInput');
    const bioInput = document.getElementById('settingsBioInput');

    if (nameInput && nameInput.value.trim()) {
        currentUser.displayName = nameInput.value.trim();
        localStorage.setItem('messiq_user', JSON.stringify(currentUser));
    }
    if (bioInput) {
        userSettings.statusBio = bioInput.value.trim() || 'Available • Using messiQ';
        saveUserSettings();
    }

    const miniName = document.getElementById('settingsUserNameMini');
    const miniBio = document.getElementById('settingsUserBioMini');
    if (miniName) miniName.textContent = currentUser.displayName;
    if (miniBio) miniBio.textContent = userSettings.statusBio;

    showToast('Profile & status updated successfully!');
}

function randomizeAvatar() {
    if (!currentUser) return;
    const randomSeed = Math.random().toString(36).substring(2, 9);
    const newAvatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${randomSeed}`;
    currentUser.avatarUrl = newAvatar;
    localStorage.setItem('messiq_user', JSON.stringify(currentUser));

    const profileImg = document.getElementById('settingsProfileAvatarImg');
    const miniAvatar = document.getElementById('settingsUserAvatarMini');
    const topAvatar = document.getElementById('topbarUserAvatar');
    const railAvatar = document.getElementById('railUserAvatar');

    if (profileImg) profileImg.src = newAvatar;
    if (miniAvatar) miniAvatar.src = newAvatar;
    if (topAvatar) topAvatar.src = newAvatar;
    if (railAvatar) railAvatar.src = newAvatar;

    showToast('Randomized new avatar!');
}

function updatePrivacySetting(key, val) {
    userSettings[key] = val;
    saveUserSettings();
    showToast('Settings saved');
}

function setChatWallpaper(name, notify = true) {
    userSettings.wallpaper = name;
    saveUserSettings();

    const canvas = document.querySelector('.chat-canvas');
    if (canvas) {
        canvas.classList.remove('wallpaper-celadon', 'wallpaper-forest', 'wallpaper-doodle', 'wallpaper-slate');
        canvas.classList.add(`wallpaper-${name}`);
    }

    document.querySelectorAll('.wallpaper-swatch').forEach(sw => {
        sw.classList.toggle('active', sw.classList.contains(name));
    });

    if (notify) {
        showToast(`Chat wallpaper set to ${name.charAt(0).toUpperCase() + name.slice(1)}`);
    }
}

function setChatFontSize(size, notify = true) {
    userSettings.fontSize = size;
    saveUserSettings();

    document.body.classList.remove('font-sm', 'font-md', 'font-lg');
    if (size !== 'md') {
        document.body.classList.add(`font-${size}`);
    }

    const pillSm = document.getElementById('fontPillSm');
    const pillMd = document.getElementById('fontPillMd');
    const pillLg = document.getElementById('fontPillLg');
    if (pillSm) pillSm.classList.toggle('active', size === 'sm');
    if (pillMd) pillMd.classList.toggle('active', size === 'md');
    if (pillLg) pillLg.classList.toggle('active', size === 'lg');

    if (notify) {
        const label = size === 'sm' ? 'Small' : size === 'lg' ? 'Large' : 'Medium';
        showToast(`Chat font size set to ${label}`);
    }
}

function playMessageNotificationSound() {
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();
        const now = ctx.currentTime;

        // Pleasant high chime: 880Hz (A5) -> 1760Hz (A6)
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(880, now);
        gain1.gain.setValueAtTime(0.12, now);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.start(now);
        osc1.stop(now + 0.22);

        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(1760, now + 0.08);
        gain2.gain.setValueAtTime(0.18, now + 0.08);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.42);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start(now + 0.08);
        osc2.stop(now + 0.42);
    } catch (e) {
        console.warn('Audio chime warning:', e);
    }
}

function requestDesktopNotifications() {
    if (!('Notification' in window)) {
        showToast('Desktop notifications not supported in this browser');
        return;
    }
    Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
            userSettings.desktopNotifications = true;
            saveUserSettings();
            showToast('Desktop notifications enabled!');
            new Notification('messiQ', {
                body: 'Notifications are active and will notify you of incoming messages.',
                icon: 'https://api.dicebear.com/7.x/bottts/svg?seed=messiq'
            });
        } else {
            userSettings.desktopNotifications = false;
            saveUserSettings();
            showToast('Desktop notifications permission denied');
        }
    });
}

function selectThemeMode(mode) {
    applyTheme(mode);
    localStorage.setItem('messiq_theme', mode);
    showToast(`Switched to ${mode === 'theme-dark' ? 'Dark Mode' : 'Light Mode'}`);
}

function clearLocalChatCache() {
    if (confirm('Are you sure you want to clear your local chat cache? This will refresh your conversations list from the server.')) {
        loadConversationsList();
        if (activePeer) {
            loadMessageHistory();
        }
        showToast('Local chat cache refreshed');
    }
}

function showToast(msg) {
    const toast = document.getElementById('appToast');
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.remove('hidden');

    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
        toast.classList.add('hidden');
    }, 2600);
}

// =========================================================
// PROFILE POPOVER ENGINE (PROPER SIGN OUT BUTTON)
// =========================================================

function toggleProfilePopover(e, source = 'rail') {
    if (e) {
        e.stopPropagation();
        e.preventDefault();
    }
    const popover = document.getElementById('profilePopover');
    if (!popover || !currentUser) return;

    if (!popover.classList.contains('hidden') && popover.dataset.source === source) {
        closeProfilePopover();
        return;
    }

    // Populate user profile info in popover
    const avatarUrl = currentUser.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${currentUser.username}`;
    const avatarEl = document.getElementById('popoverUserAvatar');
    const nameEl = document.getElementById('popoverDisplayName');
    const userEl = document.getElementById('popoverUsername');
    const bioEl = document.getElementById('popoverBioText');

    if (avatarEl) avatarEl.src = avatarUrl;
    if (nameEl) nameEl.textContent = currentUser.displayName || currentUser.username;
    if (userEl) userEl.textContent = `@${currentUser.username}`;
    if (bioEl) bioEl.textContent = userSettings.statusBio || 'Available • Using messiQ';

    popover.classList.remove('hidden', 'from-rail', 'from-topbar');
    popover.classList.add(source === 'rail' ? 'from-rail' : 'from-topbar');
    popover.dataset.source = source;
}

function closeProfilePopover() {
    const popover = document.getElementById('profilePopover');
    if (popover) {
        popover.classList.add('hidden');
    }
}

function openSettingsModalFromPopover(tab = 'profile') {
    closeProfilePopover();
    openSettingsModal();
    switchSettingsTab(tab);
}

// =========================================================
// WHATSAPP-STYLE CONTACT DETAILS PANE
// =========================================================

function toggleContactDetailsPane() {
    if (!activePeer) {
        showToast('Select a conversation to view contact info');
        return;
    }
    const pane = document.getElementById('chatDetailsPane');
    if (!pane) return;

    if (pane.classList.contains('hidden')) {
        openContactDetailsPane();
    } else {
        closeContactDetailsPane();
    }
}

function openContactDetailsPane() {
    if (!activePeer) return;
    const pane = document.getElementById('chatDetailsPane');
    const btn = document.getElementById('chatDetailsBtn');
    if (pane) pane.classList.remove('hidden');
    if (btn) btn.classList.add('active');
    updateContactDetailsContent();
}

function closeContactDetailsPane() {
    const pane = document.getElementById('chatDetailsPane');
    const btn = document.getElementById('chatDetailsBtn');
    if (pane) pane.classList.add('hidden');
    if (btn) btn.classList.remove('active');
}

function updateContactDetailsContent() {
    if (!activePeer) return;
    const pane = document.getElementById('chatDetailsPane');
    if (!pane || pane.classList.contains('hidden')) return;

    const avatarUrl = activePeer.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${activePeer.username}`;
    const isOnline = activePeer.status === 'ONLINE';

    const avatarImg = document.getElementById('detailsAvatar');
    const nameEl = document.getElementById('detailsName');
    const userEl = document.getElementById('detailsUsername');
    const statusDot = document.getElementById('detailsStatusDot');
    const statusText = document.getElementById('detailsStatusText');

    if (avatarImg) avatarImg.src = avatarUrl;
    if (nameEl) nameEl.textContent = activePeer.displayName || activePeer.username;
    if (userEl) userEl.textContent = `@${activePeer.username}`;

    if (statusDot) statusDot.className = `status-indicator-dot ${isOnline ? 'online' : 'offline'}`;
    if (statusText) {
        statusText.textContent = isOnline ? 'Online now • Available' : 'Offline • Last seen recently';
        statusText.className = `details-contact-status ${isOnline ? '' : 'offline'}`;
    }

    // Synchronize pinned toggle switch and count
    updateActiveChatPinButton();

    // Populate media thumbnails
    populateDetailsMediaGrid();
}

async function populateDetailsMediaGrid() {
    const grid = document.getElementById('detailsMediaGrid');
    const countEl = document.getElementById('detailsMediaCount');
    if (!grid || !activePeer || !currentUser) return;

    grid.innerHTML = '';
    try {
        const res = await fetch(`/api/messages/history?user1=${currentUser.id}&user2=${activePeer.id}`);
        const data = await res.json();
        if (data.success && data.data) {
            const clearTime = getClearedChatTimestampForPeer(activePeer.id);
            let msgs = data.data;
            if (clearTime) {
                const clearDate = new Date(clearTime);
                msgs = msgs.filter(m => m.timestamp && new Date(m.timestamp) > clearDate);
            }
            const mediaMsgs = msgs.filter(m => m.mediaUrl && (m.type === 'IMAGE' || m.mediaUrl.match(/\.(jpeg|jpg|gif|png|webp)$/i)));
            if (countEl) countEl.textContent = mediaMsgs.length;

            if (mediaMsgs.length === 0) {
                grid.innerHTML = `<div class="details-media-empty">No shared media yet</div>`;
            } else {
                mediaMsgs.slice(-6).reverse().forEach(m => {
                    const thumb = document.createElement('div');
                    thumb.className = 'details-media-thumb';
                    thumb.innerHTML = `<img src="${m.mediaUrl}" alt="Media" onclick="window.open('${m.mediaUrl}', '_blank')">`;
                    grid.appendChild(thumb);
                });
            }
        }
    } catch (e) {
        grid.innerHTML = `<div class="details-media-empty">Unable to load media</div>`;
    }
}

function toggleMuteChat(muted) {
    showToast(muted ? `Muted notifications for @${activePeer ? activePeer.username : 'contact'}` : 'Notifications unmuted');
}

function clearCurrentChatAction() {
    if (!activePeer || !currentUser) return;

    // Save persistent cleared timestamp for deleter side
    const nowIso = new Date().toISOString();
    saveClearedChatTimestamp(activePeer.id, nowIso);

    // Clear active message feed
    const feed = document.getElementById('messageFeed');
    if (feed) {
        feed.innerHTML = `
            <div class="date-divider"><span>Today</span></div>
            <div style="text-align:center; padding:40px 20px; color:var(--composer-meta-text); font-size:13px;">
                <i class="fa-regular fa-comment" style="font-size:24px; margin-bottom:8px; display:block; opacity:0.6;"></i>
                Chat cleared. Say hello to start fresh!
            </div>`;
    }

    // Clear any pinned message for this conversation
    removePinnedMessageForPeer(activePeer.id);
    updatePinnedMessageBanner();

    // Update conversation in memory to clear last message preview and unread count
    const existing = recentConversations.find(c => c.user && c.user.id === activePeer.id);
    if (existing) {
        existing.lastMessage = null;
        existing.unreadCount = 0;
    }

    // Refresh details media grid and sidebar
    populateDetailsMediaGrid();
    updateSidebarCount();
    renderSidebarList();

    showToast('Chat history cleared');
}

function viewAllSharedMedia() {
    showToast('All media photos previewed below');
}

function initGlobalKeyListeners() {
    // Escape key closes modals and popovers
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeEmojiPicker();
            closeProfilePopover();
            closeContactDetailsPane();
            closeSettingsModal();
            closeAuthModal();
        }
    });

    // Click outside listener for profile popover & emoji picker
    document.addEventListener('click', (e) => {
        const popover = document.getElementById('profilePopover');
        if (popover && !popover.classList.contains('hidden')) {
            if (!popover.contains(e.target) && !e.target.closest('.rail-user-avatar') && !e.target.closest('.topbar-avatar')) {
                closeProfilePopover();
            }
        }

        const emojiBar = document.getElementById('emojiPickerBar');
        if (emojiBar && !emojiBar.classList.contains('hidden')) {
            if (!emojiBar.contains(e.target) && !e.target.closest('#emojiPickerBtn')) {
                closeEmojiPicker();
            }
        }
    });

    // Enter is Send handling in chat message input
    const chatInput = document.getElementById('chatMessageInput');
    if (chatInput) {
        chatInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                if (userSettings.enterToSend === false) {
                    // Enter is Send is disabled: prevent auto-submit
                    e.preventDefault();
                    showToast('Enter is Send is disabled. Click the send button.');
                }
            }
        });
    }
}

function triggerCallNotification(type) {
    showToast(`Initiating encrypted ${type} call...`);
}

function focusChatSearch() {
    const searchInput = document.getElementById('userSearchInput');
    if (searchInput) {
        searchInput.focus();
        showToast('Search active');
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
