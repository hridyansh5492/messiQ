package com.messiq.server.controller;

import com.messiq.server.dto.ApiResponse;
import com.messiq.server.dto.StatusUpdateDTO;
import com.messiq.server.dto.UserDTO;
import com.messiq.server.model.UserStatus;
import com.messiq.server.service.UserService;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;
    private final SimpMessagingTemplate messagingTemplate;

    public UserController(UserService userService, SimpMessagingTemplate messagingTemplate) {
        this.userService = userService;
        this.messagingTemplate = messagingTemplate;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<UserDTO>>> getAllUsers(
            @RequestParam(value = "currentUserId", required = false) Long currentUserId) {
        List<UserDTO> users = userService.getAllUsers(currentUserId);
        return ResponseEntity.ok(ApiResponse.success(users));
    }

    @GetMapping("/search")
    public ResponseEntity<ApiResponse<List<UserDTO>>> searchUsers(
            @RequestParam("query") String query,
            @RequestParam(value = "currentUserId", required = false) Long currentUserId) {
        List<UserDTO> users = userService.searchUsers(query, currentUserId);
        return ResponseEntity.ok(ApiResponse.success(users));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<UserDTO>> getUserById(@PathVariable("id") Long id) {
        return userService.getUserById(id)
                .map(user -> ResponseEntity.ok(ApiResponse.success(user)))
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Algorithm 5 - Online/Offline Status REST endpoint
     */
    @PutMapping("/{id}/status")
    public ResponseEntity<ApiResponse<StatusUpdateDTO>> updateStatus(
            @PathVariable("id") Long id,
            @RequestParam("status") UserStatus status) {
        userService.updateUserStatus(id, status);
        UserDTO user = userService.getUserById(id).orElse(null);
        if (user != null) {
            StatusUpdateDTO update = new StatusUpdateDTO(user.getId(), user.getUsername(), status, LocalDateTime.now());
            // Broadcast status change to all connected WebSocket subscribers
            messagingTemplate.convertAndSend("/topic/status", update);
            return ResponseEntity.ok(ApiResponse.success("Status updated", update));
        }
        return ResponseEntity.notFound().build();
    }
}
