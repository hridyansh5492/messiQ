package com.messiq.server.dto;

import com.messiq.server.model.Message;
import com.messiq.server.model.MessageStatus;
import com.messiq.server.model.MessageType;

import java.time.LocalDateTime;

public class ChatMessageDTO {

    private Long id;
    private Long senderId;
    private String senderUsername;
    private Long receiverId;
    private String receiverUsername;
    private String content;
    private MessageType type = MessageType.CHAT;
    private String mediaUrl;
    private String fileName;
    private Long fileSize;
    private MessageStatus status = MessageStatus.SENT;
    private LocalDateTime timestamp;

    public ChatMessageDTO() {
    }

    public ChatMessageDTO(Message entity) {
        if (entity != null) {
            this.id = entity.getId();
            this.senderId = entity.getSenderId();
            this.senderUsername = entity.getSenderUsername();
            this.receiverId = entity.getReceiverId();
            this.receiverUsername = entity.getReceiverUsername();
            this.content = entity.getContent();
            this.type = entity.getType();
            this.mediaUrl = entity.getMediaUrl();
            this.fileName = entity.getFileName();
            this.fileSize = entity.getFileSize();
            this.status = entity.getStatus();
            this.timestamp = entity.getTimestamp();
        }
    }

    public static ChatMessageDTO fromEntity(Message message) {
        return new ChatMessageDTO(message);
    }

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getSenderId() {
        return senderId;
    }

    public void setSenderId(Long senderId) {
        this.senderId = senderId;
    }

    public String getSenderUsername() {
        return senderUsername;
    }

    public void setSenderUsername(String senderUsername) {
        this.senderUsername = senderUsername;
    }

    public Long getReceiverId() {
        return receiverId;
    }

    public void setReceiverId(Long receiverId) {
        this.receiverId = receiverId;
    }

    public String getReceiverUsername() {
        return receiverUsername;
    }

    public void setReceiverUsername(String receiverUsername) {
        this.receiverUsername = receiverUsername;
    }

    public String getContent() {
        return content;
    }

    public void setContent(String content) {
        this.content = content;
    }

    public MessageType getType() {
        return type;
    }

    public void setType(MessageType type) {
        this.type = type;
    }

    public String getMediaUrl() {
        return mediaUrl;
    }

    public void setMediaUrl(String mediaUrl) {
        this.mediaUrl = mediaUrl;
    }

    public String getFileName() {
        return fileName;
    }

    public void setFileName(String fileName) {
        this.fileName = fileName;
    }

    public Long getFileSize() {
        return fileSize;
    }

    public void setFileSize(Long fileSize) {
        this.fileSize = fileSize;
    }

    public MessageStatus getStatus() {
        return status;
    }

    public void setStatus(MessageStatus status) {
        this.status = status;
    }

    public LocalDateTime getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(LocalDateTime timestamp) {
        this.timestamp = timestamp;
    }
}
