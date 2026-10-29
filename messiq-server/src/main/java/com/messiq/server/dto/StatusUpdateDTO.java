package com.messiq.server.dto;

import com.messiq.server.model.UserStatus;
import java.time.LocalDateTime;

public class StatusUpdateDTO {

    private Long userId;
    private String username;
    private UserStatus status;
    private LocalDateTime lastSeen;

    public StatusUpdateDTO() {
    }

    public StatusUpdateDTO(Long userId, String username, UserStatus status, LocalDateTime lastSeen) {
        this.userId = userId;
        this.username = username;
        this.status = status;
        this.lastSeen = lastSeen;
    }

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public UserStatus getStatus() {
        return status;
    }

    public void setStatus(UserStatus status) {
        this.status = status;
    }

    public LocalDateTime getLastSeen() {
        return lastSeen;
    }

    public void setLastSeen(LocalDateTime lastSeen) {
        this.lastSeen = lastSeen;
    }
}
