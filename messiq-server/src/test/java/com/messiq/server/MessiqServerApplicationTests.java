package com.messiq.server;

import com.messiq.server.dto.AuthRequest;
import com.messiq.server.dto.AuthResponse;
import com.messiq.server.dto.ChatMessageDTO;
import com.messiq.server.dto.RegisterRequest;
import com.messiq.server.dto.UserDTO;
import com.messiq.server.model.MessageType;
import com.messiq.server.model.UserStatus;
import com.messiq.server.service.MessageService;
import com.messiq.server.service.UserService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
class MessiqServerApplicationTests {

    @Autowired
    private UserService userService;

    @Autowired
    private MessageService messageService;

    @Test
    @DisplayName("Context loads successfully")
    void contextLoads() {
        assertNotNull(userService);
        assertNotNull(messageService);
    }

    @Test
    @DisplayName("Algorithm 1 - User Registration creates new user or rejects duplicate")
    void testAlgorithm1UserRegistration() {
        String testUser = "testuser_" + System.currentTimeMillis();
        RegisterRequest req = new RegisterRequest(testUser, testUser + "@example.com", "secret123", "Test User");

        AuthResponse res = userService.register(req);
        assertTrue(res.isSuccess());
        assertEquals("Registration Successful", res.getMessage());
        assertNotNull(res.getUser());
        assertEquals(testUser, res.getUser().getUsername());

        // Duplicate registration check
        AuthResponse dupRes = userService.register(req);
        assertFalse(dupRes.isSuccess());
        assertTrue(dupRes.getMessage().contains("already exists"));
    }

    @Test
    @DisplayName("Algorithm 2 - User Login validates correct and incorrect credentials")
    void testAlgorithm2UserLogin() {
        // Test valid login with seeded user 'hridyansh'
        AuthRequest validReq = new AuthRequest("hridyansh", "messiq123");
        AuthResponse validRes = userService.login(validReq);
        assertTrue(validRes.isSuccess(), "Login should succeed for valid credentials");
        assertNotNull(validRes.getUser());
        assertEquals("hridyansh", validRes.getUser().getUsername());

        // Test invalid login
        AuthRequest invalidReq = new AuthRequest("hridyansh", "wrong_password");
        AuthResponse invalidRes = userService.login(invalidReq);
        assertFalse(invalidRes.isSuccess(), "Login should fail for invalid password");
        assertEquals("Invalid username or password", invalidRes.getMessage());
    }

    @Test
    @DisplayName("Algorithm 3 & 4 - Send Message stores in DB and Retrieve Message History returns in chronological order")
    void testAlgorithm3And4MessageExchangeAndHistory() {
        UserDTO sender = userService.getUserByUsername("hridyansh").orElseThrow();
        UserDTO receiver = userService.getUserByUsername("megha").orElseThrow();

        ChatMessageDTO msg = new ChatMessageDTO();
        msg.setSenderId(sender.getId());
        msg.setSenderUsername(sender.getUsername());
        msg.setReceiverId(receiver.getId());
        msg.setReceiverUsername(receiver.getUsername());
        msg.setContent("Test message for automated verification " + System.currentTimeMillis());
        msg.setType(MessageType.CHAT);

        ChatMessageDTO saved = messageService.sendMessage(msg);
        assertNotNull(saved.getId());
        assertEquals(msg.getContent(), saved.getContent());

        // Algorithm 4: Retrieve history
        List<ChatMessageDTO> history = messageService.getConversationHistory(sender.getId(), receiver.getId());
        assertFalse(history.isEmpty());
        // Verify chronological order
        for (int i = 0; i < history.size() - 1; i++) {
            assertTrue(history.get(i).getTimestamp().compareTo(history.get(i + 1).getTimestamp()) <= 0,
                    "Messages must be strictly chronological");
        }
    }

    @Test
    @DisplayName("Algorithm 5 - Online/Offline Status tracks user presence")
    void testAlgorithm5StatusUpdates() {
        UserDTO user = userService.getUserByUsername("hridyansh").orElseThrow();
        userService.updateUserStatus(user.getId(), UserStatus.AWAY);

        UserDTO updated = userService.getUserById(user.getId()).orElseThrow();
        assertEquals(UserStatus.AWAY, updated.getStatus());

        userService.updateUserStatus(user.getId(), UserStatus.ONLINE);
        UserDTO onlineAgain = userService.getUserById(user.getId()).orElseThrow();
        assertEquals(UserStatus.ONLINE, onlineAgain.getStatus());
    }
}
