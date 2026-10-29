package com.messiq.server.controller;

import com.messiq.server.dto.ChatMessageDTO;
import com.messiq.server.dto.StatusUpdateDTO;
import com.messiq.server.model.UserStatus;
import com.messiq.server.service.MessageService;
import com.messiq.server.service.UserService;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.time.LocalDateTime;
import java.util.Map;

@Controller
public class ChatWebSocketController {

    private final MessageService messageService;
    private final UserService userService;
    private final SimpMessagingTemplate messagingTemplate;

    public ChatWebSocketController(MessageService messageService,
                                   UserService userService,
                                   SimpMessagingTemplate messagingTemplate) {
        this.messageService = messageService;
        this.userService = userService;
        this.messagingTemplate = messagingTemplate;
    }

    /**
     * Algorithm 3 - Real-Time Message Processing via WebSocket
     */
    @MessageMapping("/chat.sendMessage")
    public void sendMessage(@Payload ChatMessageDTO chatMessage) {
        ChatMessageDTO saved = messageService.sendMessage(chatMessage);

        // Also broadcast to the active conversation channel if clients subscribe to it
        String conversationKey = Math.min(chatMessage.getSenderId(), chatMessage.getReceiverId()) + "." +
                                 Math.max(chatMessage.getSenderId(), chatMessage.getReceiverId());
        messagingTemplate.convertAndSend("/topic/messages." + conversationKey, saved);
    }

    /**
     * Real-time typing status
     */
    @MessageMapping("/chat.typing")
    public void typingIndicator(@Payload Map<String, Object> payload) {
        Object senderId = payload.get("senderId");
        Object receiverId = payload.get("receiverId");
        if (senderId != null && receiverId != null) {
            String conversationKey = Math.min(Long.parseLong(senderId.toString()), Long.parseLong(receiverId.toString())) + "." +
                                     Math.max(Long.parseLong(senderId.toString()), Long.parseLong(receiverId.toString()));
            messagingTemplate.convertAndSend("/topic/typing." + conversationKey, payload);
        }
    }

    /**
     * Algorithm 5 - Online/Offline Status Real-Time Notification
     */
    @MessageMapping("/user.status")
    public void broadcastStatus(@Payload StatusUpdateDTO statusUpdate) {
        if (statusUpdate.getUserId() != null && statusUpdate.getStatus() != null) {
            userService.updateUserStatus(statusUpdate.getUserId(), statusUpdate.getStatus());
            statusUpdate.setLastSeen(LocalDateTime.now());
            messagingTemplate.convertAndSend("/topic/status", statusUpdate);
        }
    }
}
