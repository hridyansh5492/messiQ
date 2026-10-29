package com.messiq.client.network;

import java.util.Map;

public class SessionManager {

    private static SessionManager instance;

    private ApiClient apiClient;
    private StompWebSocketClient stompClient;
    private Map<String, Object> currentUser;
    private String token;
    private Map<String, Object> activePeer;

    private SessionManager() {
        this.apiClient = new ApiClient("http://localhost:8080");
        this.stompClient = new StompWebSocketClient("ws://localhost:8080/ws-direct");
    }

    public static synchronized SessionManager getInstance() {
        if (instance == null) {
            instance = new SessionManager();
        }
        return instance;
    }

    public ApiClient getApiClient() {
        return apiClient;
    }

    public StompWebSocketClient getStompClient() {
        return stompClient;
    }

    public Map<String, Object> getCurrentUser() {
        return currentUser;
    }

    public void setCurrentUser(Map<String, Object> currentUser) {
        this.currentUser = currentUser;
    }

    public String getToken() {
        return token;
    }

    public void setToken(String token) {
        this.token = token;
    }

    public Map<String, Object> getActivePeer() {
        return activePeer;
    }

    public void setActivePeer(Map<String, Object> activePeer) {
        this.activePeer = activePeer;
    }

    public Long getCurrentUserId() {
        if (currentUser != null && currentUser.get("id") != null) {
            return Long.parseLong(currentUser.get("id").toString());
        }
        return null;
    }

    public String getCurrentUsername() {
        if (currentUser != null && currentUser.get("username") != null) {
            return currentUser.get("username").toString();
        }
        return "";
    }
}
