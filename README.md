# messiQ - Real-Time Messenger Application

<div align="center">

![messiQ Banner](https://img.shields.io/badge/messiQ-Real--Time%20Messenger-6366f1?style=for-the-badge&logo=messenger&logoColor=white)
![Java](https://img.shields.io/badge/Java-21%20LTS-ED8B00?style=for-the-badge&logo=openjdk&logoColor=white)
![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.2.5-6DB33F?style=for-the-badge&logo=springboot&logoColor=white)
![JavaFX](https://img.shields.io/badge/JavaFX-21-2C5E8A?style=for-the-badge&logo=java&logoColor=white)
![WebSocket](https://img.shields.io/badge/WebSocket-STOMP-010101?style=for-the-badge&logo=socketdotio&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-8.0-4479A1?style=for-the-badge&logo=mysql&logoColor=white)

**A high-performance, real-time one-to-one communication platform built using Java, Spring Boot, JavaFX, WebSocket (STOMP), and MySQL.**

</div>

---

## 📌 Project Overview & Synopsis Details

**messiQ** is designed per the academic project specifications for the award of the degree of **Bachelor of Computer Application (BCA)** at **Graphic Era Hill University (Bhimtal Campus)**.

* **Project Title:** Real-Time Messenger Application (**messiQ**)
* **Institution:** School of Computing, Graphic Era Hill University, Bhimtal, Uttarakhand
* **Academic Year:** Sep-2026
* **Supervisor:** Mr. Janmejay Pant, Assistant Professor
* **Group No:** 24
* **Student Contributors:**
  * **Megha Dhami** (Student ID: 2471126)
  * **Hridyansh Sati** (Student ID: 2471085)
  * **Hrithik Bashera** (Student ID: 2471086)

---

## 🏗️ System Architecture

**messiQ** follows a modern, scalable **Client-Server Architecture** divided into four coordinated layers:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        messiQ CLIENT LAYER                             │
│                                                                        │
│   ┌────────────────────────────────┐  ┌────────────────────────────┐   │
│   │   JavaFX 21 Desktop Client     │  │   Web Companion Client     │   │
│   │   • Modern Glassmorphic Dark UI│  │   • HTML5 / CSS3 / Vanilla │   │
│   │   • Live Chat & Presence       │  │   • SockJS & Stomp.js      │   │
│   │   • Media Attachment Chooser   │  │   • Photo Sharing Preview  │   │
│   └───────────────▲────────────────┘  └─────────────▲──────────────┘   │
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
                                    │ Spring Data JPA / Hibernate
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                       DATABASE PERSISTENCE LAYER                       │
│                                                                        │
│   • MySQL 8.0 Engine (Production / Docker Profile)                     │
│   • H2 In-Memory/File Mode (Zero-Friction Development Fallback)        │
│   • Tables: users, messages, indices & foreign key cascades            │
└────────────────────────────────────────────────────────────────────────┘
```

---

## ✨ Implemented Features & Core Modules

1. **User Authentication & Account Management**
   * Secure registration with validation for unique usernames and emails.
   * Secure credential authentication with password hashing (SHA-256).
   * Tokenized authentication session management.
2. **Real-Time One-to-One Chat (WebSocket + STOMP)**
   * Instant peer-to-peer message routing without polling or page refreshes.
   * Typing indicators and read-receipt indicators (`✓✓`).
3. **Chronological Message History**
   * Persistent database storage for all conversations.
   * Chronological query retrieval between any two users with timestamps and status.
4. **Live Online / Offline User Presence**
   * Automated connection & disconnection event listeners (`SessionConnectedEvent`, `SessionDisconnectEvent`).
   * Real-time status badge indicators (Online: glowing emerald, Offline: muted gray, Away: amber).
5. **Photo & Media Sharing**
   * Multipart file upload service with safe unique file naming.
   * Inline photo previews in chat bubbles and clickable attachments for documents.
6. **Dual Client Support**
   * **JavaFX 21 Desktop Client**: Full-featured desktop application with custom theme switching, smooth animations, dialog choosers, and floating pill composer.
   * **Companion Web Client**: Built-in responsive browser dashboard served directly from Spring Boot (`http://localhost:8080`).
7. **Figma-Inspired Modern Design System (3-Column Layout)**
   * **Slim Left Navigation Rail**: Quick navigation icons (Apps, Messages, Contacts, Bookmarks, Notifications, Theme Switcher, Settings, and Profile Avatar with status indicator).
   * **Messages Directory Column**: Message count badge, compose shortcut, full-text live contact search (`⌘ K`), and filter tabs (`All messages`, `Unread`, `Groups`).
   * **Celadon Chat Canvas**: Header with contact info, status bullet, search and call actions; pinned banner ("📌 A slower kind of story — our November moodboard"); photo message cards ("Casa Olivo • Mallorca, Spain"); audio voice capsule preview; and floating pill composer with instant attachment, emoji, and voice recording buttons.
8. **Dynamic Light & Dark Mode Theming**
   * Instant toggle switch available in both the Web Client (persisted in `localStorage`) and the JavaFX Desktop Client.
   * **Light Mode (Figma Warm Ivory & Celadon)**: Warm Ivory surfaces (`#f6f5f0`), Celadon chat canvas (`#e8efe9`), high-contrast Obsidian incoming bubbles (`#181e1d`), crisp White outgoing bubbles (`#ffffff`), and Emerald accents (`#10b981`).
   * **Dark Mode (Obsidian & Forest Slate)**: Deep Obsidian rail (`#0f1312`), Forest Slate directory (`#151c19`), Charcoal canvas (`#1b2420`), Emerald outgoing bubbles (`#059669`), and Slate incoming bubbles (`#222e2a`).

---

## 📐 Implemented Algorithms (from Synopsis Chapter 4)

### Algorithm 1 – User Registration
* **Input:** Username, Email, Password, Display Name
* **Output:** Successful registration or error message
* **Steps:**
  1. Start
  2. Enter username, email and password.
  3. Validate the entered information.
  4. Check whether the email/username already exists in the database.
  5. If it exists, display `"User already exists"`.
  6. Otherwise, hash password and store the user information in the database.
  7. Display `"Registration Successful"`.
  8. Stop

### Algorithm 2 – User Login
* **Input:** Email/Username and Password
* **Output:** Login success or failure
* **Steps:**
  1. Start
  2. Enter username/email and password.
  3. Send login details to the backend API (`/api/auth/login`).
  4. Check the entered credentials in the database.
  5. If the credentials are correct, generate session token and allow user to enter application.
  6. Otherwise, display `"Invalid username or password"`.
  7. Stop

### Algorithm 3 – Send Message
* **Input:** Sender ID, Receiver ID, Message, Optional Media Attachment
* **Output:** Message delivered to receiver and persisted
* **Steps:**
  1. Start
  2. Sender selects a receiver from the directory/conversation list.
  3. Sender enters message or selects a photo/media file.
  4. Check whether the message or attachment is valid.
  5. Send the message payload through WebSocket destination `/app/chat.sendMessage`.
  6. Backend receives, validates, and processes the message.
  7. Deliver the message to receiver in real time via STOMP user queue `/user/queue/messages` and pair topic.
  8. Store the message in MySQL database table `messages`.
  9. Display the message in the sender and receiver chat windows.
  10. Stop

### Algorithm 4 – Retrieve Message History
* **Input:** Sender ID and Receiver ID
* **Output:** Previous conversation in chronological order
* **Steps:**
  1. Start
  2. User opens a conversation with a contact.
  3. Send sender and receiver IDs to backend endpoint (`/api/messages/history`).
  4. Search database for messages where `(sender = user1 AND receiver = user2) OR (sender = user2 AND receiver = user1)`.
  5. Retrieve messages sorted by timestamp in chronological ascending order (`ORDER BY timestamp ASC`).
  6. Display the formatted message bubbles in the chat scroll area.
  7. Stop

### Algorithm 5 – Online/Offline Status
* **Input:** User Connection / Disconnection lifecycle events
* **Output:** Presence broadcast to all subscribers
* **Steps:**
  1. Start
  2. User logs in / connects WebSocket.
  3. Update user's status in database to `"ONLINE"` and update `last_seen`.
  4. Broadcast status update payload to `/topic/status`.
  5. When user disconnects or logs out, update user's status to `"OFFLINE"`.
  6. Display the current presence status in contact lists and active conversation headers.
  7. Stop

---

## 🗄️ Database Schema & Entities

The database schema (`schema.mysql.sql`) is compatible with MySQL 8.0+:

### `users` Table
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `BIGINT` | `PRIMARY KEY AUTO_INCREMENT` | Unique user identifier |
| `username` | `VARCHAR(50)` | `NOT NULL UNIQUE` | Unique login username |
| `email` | `VARCHAR(100)` | `NOT NULL UNIQUE` | User email address |
| `password` | `VARCHAR(255)` | `NOT NULL` | Hashed password |
| `display_name`| `VARCHAR(100)` | `NOT NULL` | Full / friendly name |
| `avatar_url` | `VARCHAR(500)` | `NULL` | Avatar image URI |
| `status` | `VARCHAR(20)` | `DEFAULT 'OFFLINE'` | Presence (`ONLINE`, `OFFLINE`, `AWAY`) |
| `last_seen` | `DATETIME` | `DEFAULT CURRENT_TIMESTAMP` | Last active timestamp |
| `created_at` | `DATETIME` | `DEFAULT CURRENT_TIMESTAMP` | Account creation timestamp |

### `messages` Table
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `BIGINT` | `PRIMARY KEY AUTO_INCREMENT` | Unique message identifier |
| `sender_id` | `BIGINT` | `FOREIGN KEY REFERENCES users(id)` | Sender user ID |
| `sender_username` | `VARCHAR(50)` | `NOT NULL` | Sender username |
| `receiver_id` | `BIGINT` | `FOREIGN KEY REFERENCES users(id)` | Recipient user ID |
| `receiver_username` | `VARCHAR(50)` | `NOT NULL` | Recipient username |
| `content` | `TEXT` | `NULL` | Message text content |
| `type` | `VARCHAR(20)` | `DEFAULT 'CHAT'` | `CHAT`, `IMAGE`, `FILE` |
| `media_url` | `VARCHAR(500)` | `NULL` | Uploaded media download URL |
| `file_name` | `VARCHAR(255)` | `NULL` | Original uploaded file name |
| `file_size` | `BIGINT` | `NULL` | File size in bytes |
| `status` | `VARCHAR(20)` | `DEFAULT 'SENT'` | `SENT`, `DELIVERED`, `READ` |
| `timestamp` | `DATETIME` | `DEFAULT CURRENT_TIMESTAMP` | Message timestamp |

---

## 📡 REST API & WebSocket Protocol Reference

### REST Endpoints
| Method | Endpoint | Description | Payload / Params |
|---|---|---|---|
| `POST` | `/api/auth/register` | Register new user (Algorithm 1) | `{"username", "email", "password", "displayName"}` |
| `POST` | `/api/auth/login` | User login (Algorithm 2) | `{"usernameOrEmail", "password"}` |
| `GET` | `/api/auth/me` | Fetch active user profile | `?username=...` |
| `GET` | `/api/users` | List registered users | `?currentUserId=...` |
| `GET` | `/api/users/search` | Search users by name/handle | `?query=...&currentUserId=...` |
| `PUT` | `/api/users/{id}/status` | Update status (Algorithm 5) | `?status=ONLINE|OFFLINE|AWAY` |
| `POST` | `/api/messages/send` | Send message (REST fallback) | `ChatMessageDTO` |
| `GET` | `/api/messages/history`| Retrieve chat history (Algorithm 4)| `?user1=...&user2=...` |
| `GET` | `/api/messages/conversations`| Recent conversations with unread | `?userId=...` |
| `POST` | `/api/messages/read` | Mark conversation messages read | `?receiverId=...&senderId=...` |
| `POST` | `/api/media/upload` | Upload photo or media file | Multipart form-data `file` |
| `GET` | `/api/media/{filename}`| Serve/download media file | URL path parameter |

### WebSocket (STOMP) Destinations
* **Endpoint:** `/ws` (with SockJS support for browsers) and `/ws-direct` (raw WebSocket for JavaFX desktop client).
* **Application Inbound Destinations (`/app`):**
  * `/app/chat.sendMessage`: Ingests and routes chat messages.
  * `/app/chat.typing`: Emits typing indicator notification.
  * `/app/user.status`: Emits online/offline presence change.
* **Broker Outbound Subscriptions:**
  * `/user/queue/messages`: Recipient-specific incoming message queue.
  * `/topic/status`: Real-time presence updates broadcasted to all users.
  * `/topic/messages.{user1}.{user2}`: Live conversation message feed.
  * `/topic/typing.{user1}.{user2}`: Live typing indicator for conversation pair.

---

## 🚀 Getting Started & Quick Start Guide

### Prerequisites
* **Java:** JDK 17 or higher (tested on Java 21 LTS)
* **Maven:** Apache Maven 3.8+ (or wrapper)
* **MySQL:** MySQL 8.0+ (optional; an embedded H2 database in MySQL-mode runs automatically if MySQL is not running)

### 1. Pre-Seeded Demo Accounts
The database automatically seeds test accounts on first launch:
* `hridyansh` / `messiq123` (Hridyansh Sati)
* `maya` / `messiq123` (Maya Chen - Photographer & good friend, from Figma design)
* `megha` / `messiq123` (Megha Dhami)
* `hrithik` / `messiq123` (Hrithik Bashera)
* `janmejay` / `messiq123` (Prof. Janmejay Pant)

---

### 2. Running the Backend Server

```bash
# Build the entire project
mvn clean package -DskipTests

# Run with default profile (Zero-setup embedded database)
./run-server.sh

# OR run with external MySQL database
./run-server.sh --mysql
```

> **MySQL with Docker Compose:**
> To run a local MySQL 8.0 container pre-configured with `messiq_db`:
> ```bash
> docker compose up -d
> ```

---

### 3. Running the JavaFX Desktop Client

In a separate terminal:
```bash
./run-client.sh
```
*Or via Maven directly:*
```bash
mvn javafx:run -pl messiq-client
```

---

### 4. Accessing the Web Companion Client

Open Google Chrome or Microsoft Edge and navigate to:
```
http://localhost:8080/
```
You can open multiple browser tabs or use the Web Client and JavaFX Desktop Client concurrently to witness real-time two-way messaging, media exchange, and live online/offline presence updates!

---

## 🧪 Running Automated Tests

To run the complete test suite verifying Algorithms 1 to 5:
```bash
mvn test
```

---

## 📁 Repository Structure

```
messiQ/
├── pom.xml                                   # Root Maven multi-module POM
├── docker-compose.yml                        # Dockerized MySQL 8.0 service
├── schema.mysql.sql                          # MySQL DDL schema and initial seed data
├── run-server.sh                             # Spring Boot backend launcher script
├── run-client.sh                             # JavaFX desktop client launcher script
├── README.md                                 # Comprehensive project documentation
│
├── messiq-server/                            # Spring Boot Backend & WebSocket Server
│   ├── pom.xml
│   └── src/
│       ├── main/
│       │   ├── java/com/messiq/server/
│       │   │   ├── MessiqServerApplication.java
│       │   │   ├── config/                   # WebSocket, CORS, and Data Initializer
│       │   │   ├── controller/               # REST and STOMP WebSocket controllers
│       │   │   ├── dto/                      # Transfer objects (Auth, Chat, Status)
│       │   │   ├── model/                    # JPA Entities (User, Message, Enums)
│       │   │   ├── repository/               # Spring Data JPA repositories
│       │   │   └── service/                  # Business logic (Algorithms 1-5, Storage)
│       │   └── resources/
│       │       ├── application.properties    # Default profile configuration
│       │       ├── application-mysql.properties # MySQL profile configuration
│       │       └── static/                   # Embedded Web Companion Client
│       │           ├── index.html            # Figma-aligned 3-column messenger markup
│       │           ├── css/styles.css        # Figma design system (Light/Dark mode)
│       │           └── js/app.js             # STOMP/SockJS real-time engine & theme controller
│       └── test/                             # Automated integration tests
│
└── messiq-client/                            # JavaFX 21 Desktop Client
    ├── pom.xml
    └── src/
        └── main/
            ├── java/com/messiq/client/
            │   ├── MessiqClientApplication.java # JavaFX Application entrypoint
            │   ├── controller/               # Login and MainChat controllers
            │   └── network/                  # ApiClient, StompWebSocketClient, Session
            └── resources/com/messiq/client/
                ├── fxml/                     # login.fxml and 3-column main.fxml
                └── css/styles.css            # Desktop Light & Dark mode stylesheet
```

---

## 📜 Academic Declaration

This application and documentation have been developed in partial fulfillment of the requirements for the award of the degree of **Bachelor of Computer Application (BCA)** at **Graphic Era Hill University, Bhimtal**, under the guidance of **Mr. Janmejay Pant**.
