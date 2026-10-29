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
let currentSidebarTab = 'conversations'; // 'conversations', 'unread', 'all'

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
}

function updateTopbarDate() {
    const dateEl = document.getElementById('topbarDate');
    if (dateEl) {
        const options = { weekday: 'short', month: 'long', day: 'numeric' };
        dateEl.textContent = new Date().toLocaleDateString('en-US', options);
    }
}

function checkStoredSession() {
    const storedUser = localStorage.getItem('messiq_user');
    const storedToken = localStorage.getItem('messiq_token');
    if (storedUser && storedToken) {
        try {
            currentUser = JSON.parse(storedUser);
            authToken = storedToken;
            initMessengerDashboard();
            return;
        } catch (e) {
            localStorage.clear();
        }
    }
    // Show auth modal overlay if not logged in
    document.getElementById('authScreen').classList.remove('hidden');
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
 * Algorithm 2 - User Login
 */
async function handleLogin(e) {
    e.preventDefault();
    const identifier = document.getElementById('loginIdentifier').value.trim();
    const password = document.getElementById('loginPassword').value;

    const btn = document.getElementById('loginBtn');
    btn.disabled = true;
    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Authenticating...`;

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
            initMessengerDashboard();
        } else {
            showAuthAlert(data.message || 'Invalid username or password', false);
        }
    } catch (err) {
        showAuthAlert('Unable to connect to messiQ server on port 8080.', false);
    } finally {
        btn.disabled = false;
        btn.innerHTML = `<span>Sign In</span> <i class="fa-solid fa-arrow-right"></i>`;
    }
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
            showAuthAlert('Registration Successful! Logging in...', true);
            setTimeout(() => {
                currentUser = data.user;
                authToken = data.token;
                localStorage.setItem('messiq_user', JSON.stringify(currentUser));
                localStorage.setItem('messiq_token', authToken);
                initMessengerDashboard();
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
            stompClient.send('/app/user.status', {}, JSON.stringify({
                userId: currentUser.id,
                username: currentUser.username,
                status: 'OFFLINE'
            }));
            stompClient.disconnect();
        }
        localStorage.removeItem('messiq_user');
        localStorage.removeItem('messiq_token');
        currentUser = null;
        authToken = null;
        activePeer = null;

        document.getElementById('authScreen').classList.remove('hidden');
    }
}

// =========================================================
// WEBSOCKET & STOMP REAL-TIME ENGINE
// =========================================================

function connectWebSocket() {
    const topWsDot = document.getElementById('topWsDot');
    const topWsText = document.getElementById('topWsText');
    topWsDot.className = 'status-indicator-dot offline';
    topWsText.textContent = 'Connecting...';

    const socket = new SockJS('/ws');
    stompClient = Stomp.over(socket);
    stompClient.debug = null; // suppress noisy frame logs

    stompClient.connect({}, (frame) => {
        isConnected = true;
        topWsDot.className = 'status-indicator-dot online';
        topWsText.textContent = 'All systems connected';

        // 1. Subscribe to presence broadcasts (Algorithm 5)
        stompClient.subscribe('/topic/status', (msg) => {
            const statusUpdate = JSON.parse(msg.body);
            handlePresenceUpdate(statusUpdate);
        });

        // 2. Subscribe to user direct messages queue
        stompClient.subscribe('/user/queue/messages', (msg) => {
            const chatMessage = JSON.parse(msg.body);
            handleIncomingMessage(chatMessage);
        });

        // 3. Broadcast current user is Online (Algorithm 5)
        stompClient.send('/app/user.status', {}, JSON.stringify({
            userId: currentUser.id,
            username: currentUser.username,
            status: 'ONLINE'
        }));
    }, (error) => {
        isConnected = false;
        topWsDot.className = 'status-indicator-dot offline';
        topWsText.textContent = 'Disconnected';
        setTimeout(connectWebSocket, 4000);
    });
}

/**
 * Algorithm 5 - Handle Live Presence Updates
 */
function handlePresenceUpdate(statusUpdate) {
    if (activePeer && activePeer.id === statusUpdate.userId) {
        activePeer.status = statusUpdate.status;
        updateActiveHeaderStatus();
    }

    const found = allUsers.find(u => u.id === statusUpdate.userId);
    if (found) {
        found.status = statusUpdate.status;
    }

    renderSidebarList();
}

function handleIncomingMessage(chatMessage) {
    if (activePeer && (chatMessage.senderId === activePeer.id || chatMessage.receiverId === activePeer.id)) {
        appendMessageBubble(chatMessage);
        scrollFeedToBottom();
        fetch(`/api/messages/read?receiverId=${currentUser.id}&senderId=${activePeer.id}`, { method: 'POST' });
    } else {
        loadConversationsList();
    }
}

// =========================================================
// DASHBOARD & MESSAGING FLOW
// =========================================================

function initMessengerDashboard() {
    document.getElementById('authScreen').classList.add('hidden');

    const avatarUrl = currentUser.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${currentUser.username}`;
    document.getElementById('topbarUserAvatar').src = avatarUrl;
    document.getElementById('railUserAvatar').src = avatarUrl;

    connectWebSocket();
    loadConversationsList();
    loadDirectoryList();
}

function switchSidebarTab(tab) {
    currentSidebarTab = tab;
    document.getElementById('chipAll').classList.toggle('active', tab === 'conversations');
    document.getElementById('chipUnread').classList.toggle('active', tab === 'unread');
    document.getElementById('chipDirectory').classList.toggle('active', tab === 'all');
    renderSidebarList();
}

function filterUnreadMessages() {
    switchSidebarTab('unread');
}

function openNewMessageModal() {
    switchSidebarTab('all');
    document.getElementById('userSearchInput').focus();
}

async function loadConversationsList() {
    try {
        const res = await fetch(`/api/messages/conversations?userId=${currentUser.id}`);
        const data = await res.json();
        if (data.success) {
            recentConversations = data.data;
            document.getElementById('conversationCountBadge').textContent = recentConversations.length;
            if (currentSidebarTab === 'conversations' || currentSidebarTab === 'unread') {
                renderSidebarList();
            }
            // If no active peer is selected, auto-select first conversation
            if (!activePeer && recentConversations.length > 0) {
                selectConversationPeer(recentConversations[0].user);
            }
        }
    } catch (e) {
        console.error('Failed to load conversations', e);
    }
}

async function loadDirectoryList() {
    try {
        const res = await fetch(`/api/users?currentUserId=${currentUser.id}`);
        const data = await res.json();
        if (data.success) {
            allUsers = data.data;
            if (currentSidebarTab === 'all') {
                renderSidebarList();
            }
        }
    } catch (e) {
        console.error('Failed to load user directory', e);
    }
}

async function handleSearch(query) {
    const clearBtn = document.getElementById('clearSearchBtn');
    if (!query || query.trim() === '') {
        clearBtn.classList.add('hidden');
        renderSidebarList();
        return;
    }
    clearBtn.classList.remove('hidden');

    try {
        const res = await fetch(`/api/users/search?query=${encodeURIComponent(query)}&currentUserId=${currentUser.id}`);
        const data = await res.json();
        if (data.success) {
            renderCustomUserList(data.data);
        }
    } catch (e) {
        console.error('Search failed', e);
    }
}

function clearSearch() {
    document.getElementById('userSearchInput').value = '';
    document.getElementById('clearSearchBtn').classList.add('hidden');
    renderSidebarList();
}

function renderSidebarList() {
    const listContainer = document.getElementById('userList');
    listContainer.innerHTML = '';

    if (currentSidebarTab === 'conversations' || currentSidebarTab === 'unread') {
        let itemsToRender = recentConversations;
        if (currentSidebarTab === 'unread') {
            itemsToRender = recentConversations.filter(item => item.unreadCount > 0);
        }

        if (itemsToRender.length === 0) {
            listContainer.innerHTML = `
                <div style="text-align:center; padding:36px 14px; color:var(--composer-meta-text); font-size:12.5px;">
                    <i class="fa-regular fa-comment-dots" style="font-size:24px; margin-bottom:8px; display:block; opacity:0.6;"></i>
                    ${currentSidebarTab === 'unread' ? 'No unread messages.' : 'No conversations yet.<br>Click Directory to start a chat!'}
                </div>`;
            return;
        }

        itemsToRender.forEach(item => {
            const peer = item.user;
            const lastMsg = item.lastMessage;
            const unread = item.unreadCount;
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
    } else {
        // Directory Tab
        if (allUsers.length === 0) {
            listContainer.innerHTML = `<div style="text-align:center; padding:30px 10px; color:var(--composer-meta-text); font-size:12.5px;">No other registered users.</div>`;
            return;
        }
        renderCustomUserList(allUsers);
    }
}

function renderCustomUserList(users) {
    const listContainer = document.getElementById('userList');
    listContainer.innerHTML = '';

    users.forEach(peer => {
        const card = document.createElement('div');
        card.className = `contact-card ${activePeer && activePeer.id === peer.id ? 'active' : ''}`;
        card.onclick = () => selectConversationPeer(peer);

        const isOnline = peer.status === 'ONLINE';

        card.innerHTML = `
            <div class="contact-avatar-wrapper">
                <img src="${peer.avatarUrl || 'https://api.dicebear.com/7.x/bottts/svg?seed=' + peer.username}" alt="${peer.username}" class="contact-avatar">
                <span class="status-indicator-dot ${isOnline ? 'online' : 'offline'}"></span>
            </div>
            <div class="contact-info">
                <div class="contact-top">
                    <span class="contact-name">${escapeHtml(peer.displayName || peer.username)}</span>
                    <span class="contact-time" style="font-size:10px; text-transform:uppercase;">${peer.status || 'OFFLINE'}</span>
                </div>
                <div class="contact-bottom">
                    <span class="contact-preview">@${peer.username}</span>
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
    renderSidebarList();

    document.getElementById('chatEmptyState').classList.add('hidden');
    document.getElementById('chatActiveContainer').classList.remove('hidden');

    document.getElementById('activeTargetAvatar').src = peer.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${peer.username}`;
    document.getElementById('activeTargetName').textContent = peer.displayName || peer.username;
    updateActiveHeaderStatus();

    subscribeToConversationChannels();

    // Algorithm 4: Retrieve Message History
    loadMessageHistory();

    fetch(`/api/messages/read?receiverId=${currentUser.id}&senderId=${peer.id}`, { method: 'POST' });
}

function updateActiveHeaderStatus() {
    if (!activePeer) return;
    const dot = document.getElementById('activeTargetStatusDot');
    const text = document.getElementById('activeTargetStatusText');
    const isOnline = activePeer.status === 'ONLINE';

    dot.className = `status-indicator-dot ${isOnline ? 'online' : 'offline'}`;
    text.textContent = isOnline ? 'Online now • Available' : 'Offline • Last seen recently';
}

function subscribeToConversationChannels() {
    if (!stompClient || !isConnected || !activePeer) return;

    if (activeSubscription) {
        activeSubscription.unsubscribe();
        activeSubscription = null;
    }
    if (activeTypingSubscription) {
        activeTypingSubscription.unsubscribe();
        activeTypingSubscription = null;
    }

    const channelKey = Math.min(currentUser.id, activePeer.id) + '.' + Math.max(currentUser.id, activePeer.id);

    activeSubscription = stompClient.subscribe(`/topic/messages.${channelKey}`, (msg) => {
        const chatMessage = JSON.parse(msg.body);
        if (chatMessage.senderId !== currentUser.id) {
            appendMessageBubble(chatMessage);
            scrollFeedToBottom();
        }
    });

    activeTypingSubscription = stompClient.subscribe(`/topic/typing.${channelKey}`, (msg) => {
        const payload = JSON.parse(msg.body);
        if (payload.senderId === activePeer.id) {
            handleTypingNotification(payload.isTyping);
        }
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
        loadConversationsList();
    } catch (err) {
        console.error('Failed to send message', err);
    } finally {
        sendBtn.disabled = false;
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
