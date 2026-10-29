package com.messiq.server.controller;

import com.messiq.server.dto.ApiResponse;
import com.messiq.server.dto.ChatMessageDTO;
import com.messiq.server.dto.ConversationSummaryDTO;
import com.messiq.server.service.MessageService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/messages")
public class MessageController {

    private final MessageService messageService;

    public MessageController(MessageService messageService) {
        this.messageService = messageService;
    }

    /**
     * Algorithm 3 - Send Message (REST fallback endpoint)
     */
    @PostMapping("/send")
    public ResponseEntity<ApiResponse<ChatMessageDTO>> sendMessage(@RequestBody ChatMessageDTO messageDTO) {
        try {
            ChatMessageDTO saved = messageService.sendMessage(messageDTO);
            return ResponseEntity.ok(ApiResponse.success("Message sent successfully", saved));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(ApiResponse.error(ex.getMessage()));
        }
    }

    /**
     * Algorithm 4 - Retrieve Message History
     * Input: Sender ID and Receiver ID
     * Output: Previous conversation in chronological order
     */
    @GetMapping("/history")
    public ResponseEntity<ApiResponse<List<ChatMessageDTO>>> getConversationHistory(
            @RequestParam("user1") Long user1,
            @RequestParam("user2") Long user2) {
        List<ChatMessageDTO> history = messageService.getConversationHistory(user1, user2);
        return ResponseEntity.ok(ApiResponse.success(history));
    }

    /**
     * Get list of conversations for a user with last message and unread count
     */
    @GetMapping("/conversations")
    public ResponseEntity<ApiResponse<List<ConversationSummaryDTO>>> getRecentConversations(
            @RequestParam("userId") Long userId) {
        List<ConversationSummaryDTO> conversations = messageService.getRecentConversations(userId);
        return ResponseEntity.ok(ApiResponse.success(conversations));
    }

    /**
     * Mark messages from sender as read by receiver
     */
    @PostMapping("/read")
    public ResponseEntity<ApiResponse<String>> markAsRead(
            @RequestParam("receiverId") Long receiverId,
            @RequestParam("senderId") Long senderId) {
        messageService.markMessagesAsRead(receiverId, senderId);
        return ResponseEntity.ok(ApiResponse.success("Messages marked as read", "OK"));
    }
}
