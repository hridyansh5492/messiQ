package com.messiq.server.dto;

import com.messiq.server.model.User;
import com.messiq.server.model.UserStatus;

import java.time.LocalDateTime;

public class UserDTO {

    private Long id;
    private String username;
    private String email;
    private String displayName;
    private String avatarUrl;
    private UserStatus status;
    private LocalDateTime lastSeen;

    public UserDTO() {
    }

    public UserDTO(User user) {
        if (user != null) {
            this.id = user.getId();
            this.username = user.getUsername();
            this.email = user.getEmail();
            this.displayName = user.getDisplayName();
            this.avatarUrl = user.getAvatarUrl();
            this.status = user.getStatus();
            this.lastSeen = user.getLastSeen();
        }
    }

    public static UserDTO fromEntity(User user) {
        return new UserDTO(user);
    }

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getDisplayName() {
        return displayName;
    }

    public void setDisplayName(String displayName) {
        this.displayName = displayName;
    }

    public String getAvatarUrl() {
        return avatarUrl;
    }

    public void setAvatarUrl(String avatarUrl) {
        this.avatarUrl = avatarUrl;
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
