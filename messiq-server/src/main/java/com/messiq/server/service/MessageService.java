package com.messiq.server.service;

import com.messiq.server.dto.ChatMessageDTO;
import com.messiq.server.dto.ConversationSummaryDTO;
import com.messiq.server.dto.UserDTO;
import com.messiq.server.model.Message;
import com.messiq.server.model.MessageStatus;
import com.messiq.server.model.MessageType;
import com.messiq.server.model.User;
import com.messiq.server.repository.MessageRepository;
import com.messiq.server.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.messaging.simp.SimpMessageSendingOperations;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class MessageService {

    @Autowired
    private MessageRepository messageRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private SimpMessageSendingOperations messagingTemplate;

    public MessageService() {
    }

    public MessageService(MessageRepository messageRepository,
                          UserRepository userRepository,
                          SimpMessageSendingOperations messagingTemplate) {
        this.messageRepository = messageRepository;
        this.userRepository = userRepository;
        this.messagingTemplate = messagingTemplate;
    }

    /**
     * Algorithm 3 - Send Message
     * Input: Sender ID, Receiver ID, Message
     * Output: Message delivered to receiver
     */
    @Transactional
    public ChatMessageDTO sendMessage(ChatMessageDTO dto) {
        // Step 4: Check whether the message is valid
        if (dto.getSenderId() == null || dto.getReceiverId() == null) {
            throw new IllegalArgumentException("Sender ID and Receiver ID are required");
        }

        if ((dto.getContent() == null || dto.getContent().trim().isEmpty()) &&
            (dto.getMediaUrl() == null || dto.getMediaUrl().trim().isEmpty())) {
            throw new IllegalArgumentException("Message content or media attachment cannot be empty");
        }

        User sender = userRepository.findById(dto.getSenderId())
                .orElseThrow(() -> new IllegalArgumentException("Sender not found with ID: " + dto.getSenderId()));
        User receiver = userRepository.findById(dto.getReceiverId())
                .orElseThrow(() -> new IllegalArgumentException("Receiver not found with ID: " + dto.getReceiverId()));

        Message message = new Message();
        message.setSenderId(sender.getId());
        message.setSenderUsername(sender.getUsername());
        message.setReceiverId(receiver.getId());
        message.setReceiverUsername(receiver.getUsername());
        message.setContent(dto.getContent());
        message.setType(dto.getType() != null ? dto.getType() : MessageType.CHAT);
        message.setMediaUrl(dto.getMediaUrl());
        message.setFileName(dto.getFileName());
        message.setFileSize(dto.getFileSize());
        message.setStatus(MessageStatus.SENT);
        message.setTimestamp(LocalDateTime.now());

        // Step 8: Store the message in the MySQL database
        Message savedMessage = messageRepository.save(message);
        ChatMessageDTO savedDto = ChatMessageDTO.fromEntity(savedMessage);

        // Step 7: Deliver the message to the receiver in real time via WebSocket
        try {
            // User-specific queue
            messagingTemplate.convertAndSendToUser(
                    receiver.getUsername(),
                    "/queue/messages",
                    savedDto
            );
            // Public chat channel for this conversation pair
            String conversationChannel = getConversationChannel(sender.getId(), receiver.getId());
            messagingTemplate.convertAndSend("/topic/messages." + conversationChannel, savedDto);
        } catch (Exception e) {
            // Log warning, message is saved in DB
            System.err.println("Could not deliver WebSocket frame: " + e.getMessage());
        }

        return savedDto;
    }

    /**
     * Algorithm 4 - Retrieve Message History
     * Input: Sender ID and Receiver ID
     * Output: Previous conversation in chronological order
     */
    @Transactional(readOnly = true)
    public List<ChatMessageDTO> getConversationHistory(Long user1, Long user2) {
        // Step 4: Search the database for messages exchanged between the two users
        // Step 5: Retrieve the messages in chronological order
        List<Message> messages = messageRepository.findConversation(user1, user2);
        return messages.stream()
                .map(ChatMessageDTO::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional
    public void markMessagesAsRead(Long receiverId, Long senderId) {
        messageRepository.updateMessagesAsRead(receiverId, senderId, MessageStatus.READ);
    }

    @Transactional(readOnly = true)
    public List<ConversationSummaryDTO> getRecentConversations(Long userId) {
        List<Message> latestMessages = messageRepository.findLatestMessagePerConversation(userId);
        List<ConversationSummaryDTO> summaries = new ArrayList<>();

        for (Message msg : latestMessages) {
            Long otherUserId = msg.getSenderId().equals(userId) ? msg.getReceiverId() : msg.getSenderId();
            Optional<User> otherUserOpt = userRepository.findById(otherUserId);
            if (otherUserOpt.isPresent()) {
                long unread = messageRepository.countUnreadMessages(userId, otherUserId);
                summaries.add(new ConversationSummaryDTO(
                        UserDTO.fromEntity(otherUserOpt.get()),
                        ChatMessageDTO.fromEntity(msg),
                        unread
                ));
            }
        }
        return summaries;
    }

    private String getConversationChannel(Long u1, Long u2) {
        return Math.min(u1, u2) + "." + Math.max(u1, u2);
    }
}
