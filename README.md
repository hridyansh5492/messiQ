# messiQ - Real-Time Messenger Application

<div align="center">

![messiQ Banner](https://img.shields.io/badge/messiQ-Real--Time%20Messenger-10b981?style=for-the-badge&logo=messenger&logoColor=white)
![Java](https://img.shields.io/badge/Java-21%20LTS-ED8B00?style=for-the-badge&logo=openjdk&logoColor=white)
![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.2.5-6DB33F?style=for-the-badge&logo=springboot&logoColor=white)
![WebSocket](https://img.shields.io/badge/WebSocket-STOMP-010101?style=for-the-badge&logo=socketdotio&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Containerized-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-8.0-4479A1?style=for-the-badge&logo=mysql&logoColor=white)
![Render](https://img.shields.io/badge/Deploy%20on-Render-46E3B7?style=for-the-badge&logo=render&logoColor=white)

**A high-performance, real-time communication platform built using Java 21, Spring Boot 3, WebSocket (STOMP), Supabase / PostgreSQL / MySQL, and JavaFX.**

</div>

---

## 📌 Project Overview & Synopsis Details

**messiQ** is designed per the academic project specifications for the award of the degree of **Bachelor of Computer Application (BCA)** at **Graphic Era Hill University (Bhimtal Campus)**.

* **Project Title:** Real-Time Messenger Application (**messiQ**)
* **Institution:** School of Computing, Graphic Era Hill University, Bhimtal, Uttarakhand
* **Academic Year:** 2026–2027
* **Supervisor:** Mr. Janmejay Pant, Assistant Professor
* **Group No:** 24
* **Student Contributors:**
  * **Megha Dhami** (Student ID: 2471126)
  * **Hridyansh Sati** (Student ID: 2471085)
  * **Hrithik Bashera** (Student ID: 2471086)

---

## 🏗️ System Architecture

**messiQ** follows a modern, scalable **Client-Server Architecture** divided into coordinated layers:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        messiQ CLIENT LAYER                             │
│                                                                        │
│   ┌────────────────────────────────┐  ┌────────────────────────────┐   │
│   │   JavaFX 21 Desktop Client     │  │   Web Companion Client     │   │
│   │   • Modern Glassmorphic Dark UI│  │   • HTML5 / CSS3 / Vanilla │   │
│   │   • Live Chat & Presence       │  │   • SockJS & Stomp.js      │   │
│   │   • Media Attachment Chooser   │  │   • Voice Note & Emoji Bar │   │
│   └───────────────▲────────────────┘  └─────────────▲──────────────┘   │
│                   │                                 │                  │
└───────────────────┼─────────────────────────────────┼──────────────────┘
                    │                                 │
           HTTP REST│& WebSocket (STOMP)     HTTP REST│& WebSocket (STOMP)
                    │                                 │
┌───────────────────▼─────────────────────────────────▼──────────────────┐
│                   messiQ BACKEND (SPRING BOOT 3.2.5)                   │
│                                                                        │
│   ┌───────────────────────────────┐ ┌──────────────────────────────┐   │
│   │      REST API Controllers     │ │  WebSocket Message Broker    │   │
│   │  • /api/auth (Login/Register) │ │  • /ws & /ws-direct          │   │
│   │  • /api/users (Directory)     │ │  • /topic (Broadcast Status) │   │
│   │  • /api/messages (History)    │ │  • /queue (Direct Messages)  │   │
│   │  • /api/media (Upload/Serve)  │ │  • /topic/messages.{pair}    │   │
│   └───────────────┬───────────────┘ └──────────────┬───────────────┘   │
│                   │                                │                   │
│   ┌───────────────▼────────────────────────────────▼───────────────┐   │
│   │                       Service & Business Layer                 │   │
│   │  • UserService        • MessageService       • FileStorageSvc  │   │
│   └───────────────────────────────┬────────────────────────────────┘   │
└───────────────────────────────────┼────────────────────────────────────┘
                                    │
                                    │ Spring Data JPA / Hibernate (Auto-Dialect)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                       DATABASE PERSISTENCE LAYER                       │
│                                                                        │
│   • Supabase PostgreSQL (Cloud Production - Connection Pooler)         │
│   • MySQL 8.0 Engine (Self-Hosted / Docker Profile)                    │
│   • H2 In-Memory/File Mode (Zero-Friction Local Development)           │
│   • Automatic Table Creation, Constraints & Seed Data via Hibernate    │
└────────────────────────────────────────────────────────────────────────┘
```

---

## ✨ Key Features & User Capabilities

### 1. Real-Time Chat & Instant Delivery
* **Zero-Latency Messaging**: Sub-millisecond two-way messaging using Spring WebSocket and STOMP message broker without polling or page refreshes.
* **Double Blue Read Receipts (`✓✓`)**: Real-time delivery ticks that turn vibrant blue once the recipient opens and reads the conversation.
* **Typing Indicator**: Live indicator shown when the active peer is composing a response.

### 2. Audio Voice Messaging
* **In-Browser Recording**: High-fidelity audio recording using the browser `MediaRecorder` API with live timer counter.
* **Instantaneous Feedback & Cloud Persistence**: Automatic `.webm` / `.wav` upload to `/api/media/upload` and persistent storage across page reloads.
* **Waveform Audio Player**: Animated waveform visualizer with play/pause toggle and duration counter.
* **Fallback Tone Engine**: Built-in Web Audio API tone synthesis for systems without microphone hardware or when running in demo environments.

### 3. WhatsApp-Style Emoji Palette & Quick Picker
* **Anchored Popup**: Smoothly floating emoji popup positioned directly above the input box.
* **Categorized Tabs**: Quick-jump tabs for `😃 Smileys`, `👍 Gestures`, `❤️ Hearts & Fire`, `🌿 Nature & Animals`, `☕ Food & Drink`, and `🎉 Objects`.
* **Multi-Emoji Insertion**: Click emojis to continuously insert them into the message text box at active cursor position without dismissing the picker.
* **Integrated Backspace (`⌫`)**: Dedicated backspace button to delete emojis or text at the cursor.

### 4. Pinned Messages & Pinned Conversations
* **Message Pinning**: Pin any critical message inside a conversation with one click.
* **Pinned Message Banner**: Top-of-chat banner showing a snippet of the pinned message, an unpin (`✕`) action, and a **Jump to Message** button that smoothly scrolls and highlights the message with a radiant pulse animation.
* **Conversation Pinning**: Pin frequently contacted peers to the very top of your sidebar message list.

### 5. Photos, Media & File Attachments
* **Inline Media Cards**: Instant high-resolution photo previews with location tags and full-screen view.
* **Document Attachments**: Safe unique file naming for documents, PDFs, and archives with download links.

### 6. WhatsApp-Style Contact Details & Clear Chat
* **WhatsApp-Inspired Details Pane**: Side drawer with high-resolution avatar, bio/status, contact information, shared media gallery, star messages, and encryption notices.
* **Persistent Clear Chat**: Clear conversation history from the deleter's perspective with persistent local timestamp filtering.

### 7. Dual Client Architecture
* **Web Companion Client**: Responsive, modern, celadon & obsidian forest theme accessible from any modern web browser (`http://localhost:8080` or on Render).
* **JavaFX 21 Desktop Client**: Native desktop application with custom window styling, themes, and direct raw WebSocket connections.

---

## 🗄️ Database Entities & Schema

The schema is automatically maintained by Hibernate (`spring.jpa.hibernate.ddl-auto=update`) across PostgreSQL, MySQL, and H2:

### `users` Table
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `BIGINT` | `PRIMARY KEY AUTO_INCREMENT` | Unique user identifier |
| `username` | `VARCHAR(50)` | `NOT NULL UNIQUE` | Unique login handle |
| `email` | `VARCHAR(100)` | `NOT NULL UNIQUE` | User email address |
| `password` | `VARCHAR(255)` | `NOT NULL` | SHA-256 hashed password |
| `display_name`| `VARCHAR(100)` | `NOT NULL` | Full / friendly name |
| `avatar_url` | `VARCHAR(500)` | `NULL` | Avatar image URI |
| `status` | `VARCHAR(20)` | `DEFAULT 'OFFLINE'` | Presence (`ONLINE`, `OFFLINE`, `AWAY`) |
| `last_seen` | `DATETIME` | `DEFAULT CURRENT_TIMESTAMP` | Last active timestamp |
| `created_at` | `DATETIME` | `DEFAULT CURRENT_TIMESTAMP` | Account creation timestamp |

### `messages` Table
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `BIGINT` | `PRIMARY KEY AUTO_INCREMENT` | Unique message identifier |
| `sender_id` | `BIGINT` | `NOT NULL` | Sender user ID |
| `sender_username` | `VARCHAR(50)` | `NOT NULL` | Sender username |
| `receiver_id` | `BIGINT` | `NOT NULL` | Recipient user ID |
| `receiver_username` | `VARCHAR(50)` | `NOT NULL` | Recipient username |
| `content` | `TEXT` | `NULL` | Message text content |
| `type` | `VARCHAR(20)` | `DEFAULT 'CHAT'` | `CHAT`, `IMAGE`, `AUDIO`, `FILE` |
| `media_url` | `VARCHAR(500)` | `NULL` | Uploaded media download URL |
| `file_name` | `VARCHAR(255)` | `NULL` | Original file name or audio duration |
| `file_size` | `BIGINT` | `NULL` | File size in bytes |
| `status` | `VARCHAR(20)` | `DEFAULT 'SENT'` | `SENT`, `DELIVERED`, `READ` |
| `timestamp` | `DATETIME` | `DEFAULT CURRENT_TIMESTAMP` | Message timestamp |

---

## 📡 REST API & WebSocket Protocol Reference

### REST Endpoints
| Method | Endpoint | Description | Payload / Params |
|---|---|---|---|
| `POST` | `/api/auth/register` | Register new user | `{"username", "email", "password", "displayName"}` |
| `POST` | `/api/auth/login` | User login | `{"usernameOrEmail", "password"}` |
| `GET` | `/api/auth/me` | Fetch active user profile | `?username=...` |
| `GET` | `/api/users` | List registered users | `?currentUserId=...` |
| `GET` | `/api/users/search` | Search users by name/handle | `?query=...` |
| `PUT` | `/api/users/{id}/status` | Update presence status | `?status=ONLINE\|OFFLINE\|AWAY` |
| `POST` | `/api/messages/send` | Send message (REST fallback) | `ChatMessageDTO` |
| `GET` | `/api/messages/history`| Retrieve chat history | `?user1=...&user2=...` |
| `GET` | `/api/messages/conversations`| Recent conversations with unread | `?userId=...` |
| `POST` | `/api/messages/read` | Mark conversation messages as read | `?receiverId=...&senderId=...` |
| `POST` | `/api/media/upload` | Upload photo, audio, or media file | Multipart form-data `file` |
| `GET` | `/api/media/{filename}`| Stream/download media file | URL path parameter |

### WebSocket (STOMP) Destinations
* **Connection Handshake:** `/ws` (SockJS for web browsers) and `/ws-direct` (raw WebSocket for JavaFX client).
* **Inbound Application Mappings (`/app`):**
  * `/app/chat.sendMessage`: Ingests and routes chat messages.
  * `/app/chat.typing`: Emits live typing status.
  * `/app/user.status`: Emits presence changes.
* **Outbound Subscriptions:**
  * `/topic/user.{userId}`: Personal direct message topic for instant delivery.
  * `/user/queue/messages`: Fallback user destination.
  * `/topic/status`: Real-time presence updates broadcasted to all users.
  * `/topic/messages.{user1}.{user2}`: Pairwise channel feed.
  * `/topic/typing.{user1}.{user2}`: Pairwise typing indicator stream.

---

## 🚀 Local Quick Start Guide

### Prerequisites
* **Java:** JDK 17 or higher (tested on Java 21 LTS)
* **Maven:** Apache Maven 3.8+

### 1. Default Demo Accounts
The database automatically seeds default accounts on first startup:
* `hridyansh` / `messiq123` (Hridyansh Sati)
* `megha` / `messiq123` (Megha Dhami)
* `hrithik` / `messiq123` (Hrithik Bashera)

### 2. Running the Server Locally
```bash
# Package the server
mvn clean package -pl messiq-server -DskipTests

# Start the server (uses embedded H2 database by default)
./run-server.sh

# Or start with a local MySQL instance:
./run-server.sh --mysql
```

### 3. Accessing the Web Application
Open your browser and navigate to:
```text
http://localhost:8080/
```

### 4. Running the Desktop JavaFX Client
In a separate terminal:
```bash
./run-client.sh
```

---

## ☁️ Deploying to Render with Supabase

`messiQ` is fully containerized and production-ready for deployment on **Render** paired with a **Supabase PostgreSQL** database.

### Step 1: Create a Supabase Database
1. Go to [supabase.com](https://supabase.com/) and create a free project.
2. In **Project Settings** → **Database** → **Connection string**:
   * Select **Connection pooler** (Mode: **Transaction** or **Session**, Port: **6543**).
   * Copy the connection URI:
     ```text
     postgresql://postgres.[project-ref]:[YOUR-PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres
     ```
     > **Important:** Always use the pooler host (`pooler.supabase.com` on port `6543`). The direct host (`db.xxxx.supabase.co:5432`) uses IPv6, which is not supported on Render's free tier.

### Step 2: Deploy on Render
1. Go to [dashboard.render.com](https://dashboard.render.com/) → **New +** → **Web Service**.
2. Connect your GitHub repository (`messiQ`).
3. Set the service properties:
   * **Runtime**: `Docker` (Render automatically uses the multi-stage [Dockerfile](Dockerfile))
   * **Instance Type**: `Free`
4. Under **Environment Variables**, add:
   * **Key:** `DATABASE_URL`
   * **Value:** *(Paste your Supabase connection string from Step 1 with your actual password)*
5. Click **Create Web Service**.

> **Automatic Configuration:** The built-in [DatabaseConfig.java](messiq-server/src/main/java/com/messiq/server/config/DatabaseConfig.java) automatically converts standard PostgreSQL URIs into JDBC format, configures the PostgreSQL dialect, and enables SSL mode. Hibernate automatically generates the required database tables on initial startup!

---

## 📁 Repository Structure

```
messiQ/
├── pom.xml                                   # Root Maven multi-module POM
├── Dockerfile                                # Multi-stage Docker production build for Render
├── .dockerignore                             # Build optimization exclusions
├── docker-compose.yml                        # Local MySQL 8.0 container service
├── schema.mysql.sql                          # Standalone MySQL DDL schema reference
├── run-server.sh                             # Spring Boot server launcher script
├── run-client.sh                             # JavaFX desktop client launcher script
├── README.md                                 # Complete project documentation
│
├── messiq-server/                            # Spring Boot Backend & WebSocket Server
│   ├── pom.xml
│   └── src/
│       ├── main/
│       │   ├── java/com/messiq/server/
│       │   │   ├── MessiqServerApplication.java
│       │   │   ├── config/                   # WebSocket, CORS, DatabaseConfig & Initializer
│       │   │   ├── controller/               # REST, Media & STOMP controllers
│       │   │   ├── dto/                      # Data Transfer Objects
│       │   │   ├── model/                    # JPA Entities (User, Message, MessageType)
│       │   │   ├── repository/               # Spring Data JPA repositories
│       │   │   └── service/                  # Business logic & FileStorageService
│       │   └── resources/
│       │       ├── application.properties    # Dynamic cloud & local config
│       │       ├── application-mysql.properties # MySQL profile configuration
│       │       └── static/                   # Web Companion Client
│       │           ├── favicon.svg           # High-resolution SVG favicon
│       │           ├── favicon.ico           # Multi-resolution ICO favicon
│       │           ├── index.html            # 3-Column messenger markup
│       │           ├── css/styles.css        # Obsidian & Celadon design system
│       │           └── js/app.js             # STOMP/SockJS real-time engine
│       └── test/                             # Automated unit & integration tests
│
└── messiq-client/                            # JavaFX 21 Desktop Client
    ├── pom.xml
    └── src/
        └── main/
            ├── java/com/messiq/client/
            │   ├── MessiqClientApplication.java
            │   ├── controller/               # Login & MainChat controllers
            │   └── network/                  # ApiClient, StompWebSocketClient
            └── resources/com/messiq/client/
                ├── fxml/                     # login.fxml & main.fxml
                └── css/styles.css            # Desktop stylesheet
```

---

## 📜 Academic Declaration

This application and documentation have been developed in partial fulfillment of the requirements for the award of the degree of **Bachelor of Computer Application (BCA)** at **Graphic Era Hill University, Bhimtal**, under the guidance of **Mr. Janmejay Pant**.
