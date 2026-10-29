-- =======================================================
-- messiQ - Real-Time Messenger Application Database Schema
-- Compatible with MySQL 8.0+
-- Graphic Era Hill University - BCA Project Group 24
-- =======================================================

CREATE DATABASE IF NOT EXISTS `messiq_db` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `messiq_db`;

-- -------------------------------------------------------
-- Table: users
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS `users` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `username` VARCHAR(50) NOT NULL UNIQUE,
    `email` VARCHAR(100) NOT NULL UNIQUE,
    `password` VARCHAR(255) NOT NULL,
    `display_name` VARCHAR(100) NOT NULL,
    `avatar_url` VARCHAR(500) DEFAULT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'OFFLINE', -- ONLINE, OFFLINE, AWAY
    `last_seen` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_users_username` (`username`),
    INDEX `idx_users_email` (`email`),
    INDEX `idx_users_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------
-- Table: messages
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS `messages` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `sender_id` BIGINT NOT NULL,
    `sender_username` VARCHAR(50) NOT NULL,
    `receiver_id` BIGINT NOT NULL,
    `receiver_username` VARCHAR(50) NOT NULL,
    `content` TEXT,
    `type` VARCHAR(20) NOT NULL DEFAULT 'CHAT', -- CHAT, IMAGE, FILE
    `media_url` VARCHAR(500) DEFAULT NULL,
    `file_name` VARCHAR(255) DEFAULT NULL,
    `file_size` BIGINT DEFAULT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'SENT', -- SENT, DELIVERED, READ
    `timestamp` DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`sender_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`receiver_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
    INDEX `idx_messages_conversation` (`sender_id`, `receiver_id`, `timestamp`),
    INDEX `idx_messages_timestamp` (`timestamp`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------
-- Seed Initial Demo Users & Sample Messages
-- Password for all demo accounts is 'messiq123' (plain or bcrypt hashed)
-- -------------------------------------------------------
INSERT INTO `users` (`id`, `username`, `email`, `password`, `display_name`, `avatar_url`, `status`, `last_seen`)
VALUES
    (1, 'hridyansh', 'hridyansh5492@gmail.com', 'messiq123', 'Hridyansh Sati', 'https://api.dicebear.com/7.x/bottts/svg?seed=hridyansh', 'ONLINE', NOW()),
    (2, 'megha', 'megha.dhami@gehu.ac.in', 'messiq123', 'Megha Dhami', 'https://api.dicebear.com/7.x/bottts/svg?seed=megha', 'ONLINE', NOW()),
    (3, 'hrithik', 'hrithik.bashera@gehu.ac.in', 'messiq123', 'Hrithik Bashera', 'https://api.dicebear.com/7.x/bottts/svg?seed=hrithik', 'OFFLINE', NOW()),
    (4, 'janmejay', 'janmejay.pant@gehu.ac.in', 'messiq123', 'Prof. Janmejay Pant', 'https://api.dicebear.com/7.x/bottts/svg?seed=janmejay', 'ONLINE', NOW())
ON DUPLICATE KEY UPDATE `username`=`username`;

INSERT INTO `messages` (`sender_id`, `sender_username`, `receiver_id`, `receiver_username`, `content`, `type`, `status`, `timestamp`)
VALUES
    (1, 'hridyansh', 2, 'megha', 'Hi Megha! The real-time messenger messiQ is up and running!', 'CHAT', 'READ', DATE_SUB(NOW(), INTERVAL 10 MINUTE)),
    (2, 'megha', 1, 'hridyansh', 'Awesome Hridyansh! WebSocket messaging and media upload look smooth.', 'CHAT', 'READ', DATE_SUB(NOW(), INTERVAL 8 MINUTE)),
    (4, 'janmejay', 1, 'hridyansh', 'Well done team. Make sure to test both JavaFX and WebSocket endpoints.', 'CHAT', 'READ', DATE_SUB(NOW(), INTERVAL 5 MINUTE))
ON DUPLICATE KEY UPDATE `sender_id`=`sender_id`;
