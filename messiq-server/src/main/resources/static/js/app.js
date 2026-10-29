/**
 * messiQ - Real-Time Messenger Application Client Engine
 * Implements:
 * Algorithm 1: User Registration
 * Algorithm 2: User Login
 * Algorithm 3: Send Message (WebSocket STOMP + REST)
 * Algorithm 4: Retrieve Message History
 * Algorithm 5: Online/Offline Status Tracking
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
let currentSidebarTab = 'conversations';

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
    checkStoredSession();
});

function checkStoredSession() {
    const storedUser = localStorage.getItem('messiq_user');
    const storedToken = localStorage.getItem('messiq_token');
    if (storedUser && storedToken) {
        try {
            currentUser = JSON.parse(storedUser);
            authToken = storedToken;
            initMessengerDashboard();
        } catch (e) {
            localStorage.clear();
        }
    }
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
        showAuthAlert('Unable to connect to messiQ server. Please ensure backend is running.', false);
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
    if (confirm('Are you sure you want to log out of messiQ?')) {
        // Broadcast offline status
        if (stompClient && isConnected && currentUser) {
            stompClient.send('/app/user.status', {}, JSON.stringify({
                userId: currentUser.id,
                username: currentUser.username,
                status: 'OFFLINE'
            }));
            stompClient.disconnect();
        }
        localStorage.clear();
        currentUser = null;
        authToken = null;
        activePeer = null;

        document.getElementById('mainScreen').classList.add('hidden');
        document.getElementById('authScreen').classList.remove('hidden');
    }
}

// =========================================================
// WEBSOCKET & STOMP REAL-TIME ENGINE
// =========================================================

function connectWebSocket() {
    const statusDot = document.getElementById('wsStatusDot');
    const statusText = document.getElementById('wsStatusText');
    statusDot.className = 'status-dot connecting';
    statusText.textContent = 'Connecting to WebSocket...';

    const socket = new SockJS('/ws');
    stompClient = Stomp.over(socket);
    stompClient.debug = null; // suppress noisy logs

    stompClient.connect({}, (frame) => {
        isConnected = true;
        statusDot.className = 'status-dot connected';
        statusText.textContent = 'Connected (Real-time)';

        // 1. Subscribe to presence broadcasts (Algorithm 5)
        stompClient.subscribe('/topic/status', (msg) => {
            const statusUpdate = JSON.parse(msg.body);
            handlePresenceUpdate(statusUpdate);
        });

        // 2. Subscribe to user-specific direct messages
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
        statusDot.className = 'status-dot disconnected';
        statusText.textContent = 'Disconnected. Reconnecting...';
        setTimeout(connectWebSocket, 4000);
    });
}

/**
 * Algorithm 5 - Handle Live Presence Updates
 */
function handlePresenceUpdate(statusUpdate) {
    // Update active peer if open
    if (activePeer && activePeer.id === statusUpdate.userId) {
        activePeer.status = statusUpdate.status;
        updateActiveHeaderStatus();
    }

    // Update in allUsers list
    const found = allUsers.find(u => u.id === statusUpdate.userId);
    if (found) {
        found.status = statusUpdate.status;
    }

    // Refresh UI list item
    renderSidebarList();
}

function handleIncomingMessage(chatMessage) {
    // If incoming message belongs to active peer conversation
    if (activePeer && (chatMessage.senderId === activePeer.id || chatMessage.receiverId === activePeer.id)) {
        appendMessageBubble(chatMessage);
        scrollFeedToBottom();
        // Mark as read
        fetch(`/api/messages/read?receiverId=${currentUser.id}&senderId=${activePeer.id}`, { method: 'POST' });
    } else {
        // Notification for background conversation
        loadConversationsList();
    }
}

// =========================================================
// DASHBOARD & MESSAGING FLOW
// =========================================================

function initMessengerDashboard() {
    document.getElementById('authScreen').classList.add('hidden');
    document.getElementById('mainScreen').classList.remove('hidden');

    // Populate user profile badge
    document.getElementById('currentUserAvatar').src = currentUser.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${currentUser.username}`;
    document.getElementById('currentUserName').textContent = currentUser.displayName || currentUser.username;
    document.getElementById('currentUserTag').textContent = `@${currentUser.username}`;

    connectWebSocket();
    loadConversationsList();
    loadDirectoryList();
}

function switchSidebarTab(tab) {
    currentSidebarTab = tab;
    document.getElementById('tabConversations').classList.toggle('active', tab === 'conversations');
    document.getElementById('tabAllUsers').classList.toggle('active', tab === 'all');
    renderSidebarList();
}

async function loadConversationsList() {
    try {
        const res = await fetch(`/api/messages/conversations?userId=${currentUser.id}`);
        const data = await res.json();
        if (data.success) {
            recentConversations = data.data;
            if (currentSidebarTab === 'conversations') {
                renderSidebarList();
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

    if (currentSidebarTab === 'conversations') {
        if (recentConversations.length === 0) {
            listContainer.innerHTML = `
                <div style="text-align:center; padding:30px 10px; color:var(--text-muted); font-size:13px;">
                    <i class="fa-regular fa-comment-dots" style="font-size:26px; margin-bottom:8px; display:block;"></i>
                    No conversations yet.<br>Switch to Directory to start a chat!
                </div>`;
            return;
        }

        recentConversations.forEach(item => {
            const peer = item.user;
            const lastMsg = item.lastMessage;
            const unread = item.unreadCount;
            const isOnline = peer.status === 'ONLINE';

            const div = document.createElement('div');
            div.className = `user-item ${activePeer && activePeer.id === peer.id ? 'active' : ''}`;
            div.onclick = () => selectConversationPeer(peer);

            const previewText = lastMsg ? (lastMsg.type === 'IMAGE' ? '📷 Photo' : (lastMsg.content || 'Media')) : 'Started a conversation';
            const timeStr = lastMsg ? formatTime(lastMsg.timestamp) : '';

            div.innerHTML = `
                <div class="avatar-wrapper">
                    <img src="${peer.avatarUrl || 'https://api.dicebear.com/7.x/bottts/svg?seed=' + peer.username}" alt="${peer.username}" class="item-avatar">
                    <span class="status-indicator ${peer.status ? peer.status.toLowerCase() : 'offline'}"></span>
                </div>
                <div class="item-content">
                    <div class="item-top">
                        <span class="item-name">${escapeHtml(peer.displayName || peer.username)}</span>
                        <span class="item-time">${timeStr}</span>
                    </div>
                    <div class="item-bottom">
                        <span class="item-preview">${escapeHtml(previewText)}</span>
                        ${unread > 0 ? `<span class="badge-unread">${unread}</span>` : ''}
                    </div>
                </div>
            `;
            listContainer.appendChild(div);
        });
    } else {
        // Directory Tab
        if (allUsers.length === 0) {
            listContainer.innerHTML = `<div style="text-align:center; padding:30px 10px; color:var(--text-muted);">No other users found.</div>`;
            return;
        }
        renderCustomUserList(allUsers);
    }
}

function renderCustomUserList(users) {
    const listContainer = document.getElementById('userList');
    listContainer.innerHTML = '';

    users.forEach(peer => {
        const div = document.createElement('div');
        div.className = `user-item ${activePeer && activePeer.id === peer.id ? 'active' : ''}`;
        div.onclick = () => selectConversationPeer(peer);

        div.innerHTML = `
            <div class="avatar-wrapper">
                <img src="${peer.avatarUrl || 'https://api.dicebear.com/7.x/bottts/svg?seed=' + peer.username}" alt="${peer.username}" class="item-avatar">
                <span class="status-indicator ${peer.status ? peer.status.toLowerCase() : 'offline'}"></span>
            </div>
            <div class="item-content">
                <div class="item-top">
                    <span class="item-name">${escapeHtml(peer.displayName || peer.username)}</span>
                    <span class="item-time" style="font-size:10px; text-transform:uppercase;">${peer.status || 'OFFLINE'}</span>
                </div>
                <div class="item-bottom">
                    <span class="item-preview">@${peer.username}</span>
                </div>
            </div>
        `;
        listContainer.appendChild(div);
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

    // Header info
    document.getElementById('activeTargetAvatar').src = peer.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${peer.username}`;
    document.getElementById('activeTargetName').textContent = peer.displayName || peer.username;
    updateActiveHeaderStatus();

    // Subscribe to active pair conversation topic and typing
    subscribeToConversationChannels();

    // Algorithm 4: Retrieve Message History
    loadMessageHistory();

    // Mark messages from peer as read
    fetch(`/api/messages/read?receiverId=${currentUser.id}&senderId=${peer.id}`, { method: 'POST' });
}

function updateActiveHeaderStatus() {
    if (!activePeer) return;
    const dot = document.getElementById('activeTargetStatusDot');
    const text = document.getElementById('activeTargetStatusText');
    const status = activePeer.status ? activePeer.status.toUpperCase() : 'OFFLINE';

    dot.className = `status-indicator ${status.toLowerCase()}`;
    text.textContent = status === 'ONLINE' ? 'Online' : (status === 'AWAY' ? 'Away' : 'Offline');
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

    // Subscribe to public conversation channel
    activeSubscription = stompClient.subscribe(`/topic/messages.${channelKey}`, (msg) => {
        const chatMessage = JSON.parse(msg.body);
        if (chatMessage.senderId !== currentUser.id) {
            appendMessageBubble(chatMessage);
            scrollFeedToBottom();
        }
    });

    // Subscribe to typing indicator
    activeTypingSubscription = stompClient.subscribe(`/topic/typing.${channelKey}`, (msg) => {
        const payload = JSON.parse(msg.body);
        if (payload.senderId === activePeer.id) {
            handleTypingNotification(payload.isTyping);
        }
    });
}

/**
 * Algorithm 4 - Retrieve Message History
 * Input: Sender ID and Receiver ID
 * Output: Previous conversation in chronological order
 */
async function loadMessageHistory() {
    const feed = document.getElementById('messageFeed');
    feed.innerHTML = `
        <div style="text-align:center; padding:40px; color:var(--text-muted);">
            <i class="fa-solid fa-spinner fa-spin" style="font-size:24px;"></i>
            <p style="margin-top:10px; font-size:13px;">Retrieving message history...</p>
        </div>`;

    try {
        const res = await fetch(`/api/messages/history?user1=${currentUser.id}&user2=${activePeer.id}`);
        const data = await res.json();
        feed.innerHTML = '';

        if (data.success && data.data.length > 0) {
            data.data.forEach(msg => appendMessageBubble(msg));
            scrollFeedToBottom();
        } else {
            feed.innerHTML = `
                <div style="text-align:center; padding:50px 20px; color:var(--text-muted); font-size:13px;">
                    <i class="fa-regular fa-paper-plane" style="font-size:28px; margin-bottom:10px; display:block; opacity:0.6;"></i>
                    No messages here yet.<br>Send a greeting to start your conversation!
                </div>`;
        }
    } catch (e) {
        feed.innerHTML = `<div style="text-align:center; color:#fca5a5; padding:20px;">Failed to retrieve message history.</div>`;
    }
}

function refreshActiveConversation() {
    if (activePeer) {
        loadMessageHistory();
        loadConversationsList();
    }
}

function appendMessageBubble(msg) {
    const feed = document.getElementById('messageFeed');
    // Clear empty placeholder if exists
    if (feed.querySelector('div[style*="text-align:center"]')) {
        feed.innerHTML = '';
    }

    const isSent = msg.senderId === currentUser.id;
    const row = document.createElement('div');
    row.className = `message-row ${isSent ? 'sent' : 'received'}`;

    let mediaHtml = '';
    if (msg.mediaUrl) {
        if (msg.type === 'IMAGE' || (msg.mediaUrl.match(/\.(jpeg|jpg|gif|png|webp|svg)$/i))) {
            mediaHtml = `
                <div class="media-attachment-container">
                    <img src="${msg.mediaUrl}" alt="Media Attachment" class="chat-image" onclick="window.open('${msg.mediaUrl}', '_blank')">
                </div>`;
        } else {
            mediaHtml = `
                <div class="media-attachment-container" style="padding:10px; background:rgba(0,0,0,0.2);">
                    <a href="${msg.mediaUrl}" target="_blank" style="color:#a5b4fc; text-decoration:none; display:flex; align-items:center; gap:8px;">
                        <i class="fa-solid fa-file-arrow-down" style="font-size:20px;"></i>
                        <span>${escapeHtml(msg.fileName || 'Download Attachment')}</span>
                    </a>
                </div>`;
        }
    }

    const timeStr = formatTime(msg.timestamp);

    row.innerHTML = `
        <div class="message-bubble">
            ${mediaHtml}
            ${msg.content ? `<span>${escapeHtml(msg.content)}</span>` : ''}
        </div>
        <div class="message-meta">
            <span>${timeStr}</span>
            ${isSent ? `<i class="fa-solid fa-check-double" style="font-size:10px; color:${msg.status === 'READ' ? '#38bdf8' : 'var(--text-muted)'};"></i>` : ''}
        </div>
    `;

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
 * Input: Sender ID, Receiver ID, Message
 * Output: Message delivered to receiver and stored in MySQL
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

        // 1. Upload media file if attached
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

        // 2. Deliver through WebSocket STOMP
        if (stompClient && isConnected) {
            stompClient.send('/app/chat.sendMessage', {}, JSON.stringify(messagePayload));
        } else {
            // Fallback to REST API
            await fetch('/api/messages/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(messagePayload)
            });
        }

        // Render bubble immediately for sender
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
        typingText.textContent = `${activePeer.displayName || activePeer.username} is typing...`;
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
