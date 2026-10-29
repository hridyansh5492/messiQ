package com.messiq.server.config;

import com.messiq.server.dto.StatusUpdateDTO;
import com.messiq.server.model.UserStatus;
import com.messiq.server.service.UserService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.SimpMessageSendingOperations;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionConnectedEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

import java.time.LocalDateTime;

@Component
public class WebSocketEventListener {

    private static final Logger logger = LoggerFactory.getLogger(WebSocketEventListener.class);

    private final SimpMessageSendingOperations messagingTemplate;
    private final UserService userService;

    public WebSocketEventListener(SimpMessageSendingOperations messagingTemplate, UserService userService) {
        this.messagingTemplate = messagingTemplate;
        this.userService = userService;
    }

    @EventListener
    public void handleWebSocketConnectListener(SessionConnectedEvent event) {
        logger.info("Received a new WebSocket connection: {}", event.getMessage());
    }

    @EventListener
    public void handleWebSocketDisconnectListener(SessionDisconnectEvent event) {
        StompHeaderAccessor headerAccessor = StompHeaderAccessor.wrap(event.getMessage());
        String username = (String) headerAccessor.getSessionAttributes().get("username");
        Long userId = (Long) headerAccessor.getSessionAttributes().get("userId");

        if (username != null) {
            logger.info("User Disconnected: {}", username);
            userService.updateUserStatusByUsername(username, UserStatus.OFFLINE);

            StatusUpdateDTO statusUpdate = new StatusUpdateDTO(userId, username, UserStatus.OFFLINE, LocalDateTime.now());
            messagingTemplate.convertAndSend("/topic/status", statusUpdate);
        }
    }
}
