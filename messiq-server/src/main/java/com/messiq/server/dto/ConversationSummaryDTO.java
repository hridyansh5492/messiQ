package com.messiq.server.dto;

public class ConversationSummaryDTO {

    private UserDTO user;
    private ChatMessageDTO lastMessage;
    private long unreadCount;

    public ConversationSummaryDTO() {
    }

    public ConversationSummaryDTO(UserDTO user, ChatMessageDTO lastMessage, long unreadCount) {
        this.user = user;
        this.lastMessage = lastMessage;
        this.unreadCount = unreadCount;
    }

    public UserDTO getUser() {
        return user;
    }

    public void setUser(UserDTO user) {
        this.user = user;
    }

    public ChatMessageDTO getLastMessage() {
        return lastMessage;
    }

    public void setLastMessage(ChatMessageDTO lastMessage) {
        this.lastMessage = lastMessage;
    }

    public long getUnreadCount() {
        return unreadCount;
    }

    public void setUnreadCount(long unreadCount) {
        this.unreadCount = unreadCount;
    }
}
