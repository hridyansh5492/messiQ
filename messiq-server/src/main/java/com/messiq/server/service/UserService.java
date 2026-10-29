package com.messiq.server.service;

import com.messiq.server.dto.AuthRequest;
import com.messiq.server.dto.AuthResponse;
import com.messiq.server.dto.RegisterRequest;
import com.messiq.server.dto.UserDTO;
import com.messiq.server.model.User;
import com.messiq.server.model.UserStatus;
import com.messiq.server.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class UserService {

    @Autowired
    private UserRepository userRepository;

    public UserService() {
    }

    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    /**
     * Algorithm 1 - User Registration
     * Input: Username, email, password
     * Output: Successful registration or error message
     */
    @Transactional
    public AuthResponse register(RegisterRequest request) {
        // Step 3: Validate the entered information
        if (request.getUsername() == null || request.getUsername().trim().isEmpty() ||
            request.getEmail() == null || request.getEmail().trim().isEmpty() ||
            request.getPassword() == null || request.getPassword().trim().isEmpty()) {
            return AuthResponse.error("All fields (username, email, password) are required");
        }

        String username = request.getUsername().trim().toLowerCase();
        String email = request.getEmail().trim().toLowerCase();

        // Step 4: Check whether the email/username already exists
        if (userRepository.existsByUsername(username)) {
            // Step 5: If it exists, display "User already exists"
            return AuthResponse.error("User already exists with this username");
        }

        if (userRepository.existsByEmail(email)) {
            return AuthResponse.error("User already exists with this email");
        }

        // Step 6: Otherwise, store the user information in the database
        String displayName = request.getDisplayName();
        if (displayName == null || displayName.trim().isEmpty()) {
            displayName = request.getUsername();
        }

        String hashedPassword = hashPassword(request.getPassword());
        User newUser = new User(username, email, hashedPassword, displayName);
        newUser.setStatus(UserStatus.ONLINE);
        newUser.setLastSeen(LocalDateTime.now());
        User savedUser = userRepository.save(newUser);

        String token = generateToken(savedUser);

        // Step 7: Display "Registration Successful"
        return new AuthResponse(true, "Registration Successful", token, UserDTO.fromEntity(savedUser));
    }

    /**
     * Algorithm 2 - User Login
     * Input: Email/Username and Password
     * Output: Login success or failure
     */
    @Transactional
    public AuthResponse login(AuthRequest request) {
        // Step 2 & 3: Validate input
        if (request.getUsernameOrEmail() == null || request.getUsernameOrEmail().trim().isEmpty() ||
            request.getPassword() == null || request.getPassword().trim().isEmpty()) {
            return AuthResponse.error("Username/Email and password are required");
        }

        String loginIdentifier = request.getUsernameOrEmail().trim().toLowerCase();

        // Step 4: Check the entered credentials in the database
        Optional<User> userOptional = userRepository.findByUsernameOrEmail(loginIdentifier);
        if (userOptional.isEmpty()) {
            // Step 6: Otherwise, display "Invalid username or password"
            return AuthResponse.error("Invalid username or password");
        }

        User user = userOptional.get();
        if (!verifyPassword(request.getPassword(), user.getPassword())) {
            return AuthResponse.error("Invalid username or password");
        }

        // Step 5: If credentials are correct, allow user to enter application
        user.setStatus(UserStatus.ONLINE);
        user.setLastSeen(LocalDateTime.now());
        userRepository.save(user);

        String token = generateToken(user);
        return new AuthResponse(true, "Login Successful", token, UserDTO.fromEntity(user));
    }

    /**
     * Algorithm 5 - Online/Offline Status
     */
    @Transactional
    public void updateUserStatus(Long userId, UserStatus status) {
        userRepository.findById(userId).ifPresent(user -> {
            user.setStatus(status);
            user.setLastSeen(LocalDateTime.now());
            userRepository.save(user);
        });
    }

    @Transactional
    public void updateUserStatusByUsername(String username, UserStatus status) {
        userRepository.findByUsername(username).ifPresent(user -> {
            user.setStatus(status);
            user.setLastSeen(LocalDateTime.now());
            userRepository.save(user);
        });
    }

    @Transactional(readOnly = true)
    public List<UserDTO> getAllUsers(Long currentUserId) {
        return userRepository.findAll().stream()
                .filter(u -> currentUserId == null || !u.getId().equals(currentUserId))
                .map(UserDTO::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<UserDTO> searchUsers(String query, Long currentUserId) {
        if (query == null || query.trim().isEmpty()) {
            return getAllUsers(currentUserId);
        }
        return userRepository.findByUsernameContainingIgnoreCaseOrDisplayNameContainingIgnoreCase(query, query).stream()
                .filter(u -> currentUserId == null || !u.getId().equals(currentUserId))
                .map(UserDTO::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public Optional<UserDTO> getUserById(Long id) {
        return userRepository.findById(id).map(UserDTO::fromEntity);
    }

    @Transactional(readOnly = true)
    public Optional<UserDTO> getUserByUsername(String username) {
        return userRepository.findByUsername(username).map(UserDTO::fromEntity);
    }

    public static String hashPassword(String password) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] encodedHash = digest.digest(password.getBytes(StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder();
            for (byte b : encodedHash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) hexString.append('0');
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("Error hashing password", e);
        }
    }

    public static boolean verifyPassword(String inputPassword, String storedPassword) {
        // Support plain text comparison for pre-seeded database rows or hashed comparison
        if (storedPassword.equals(inputPassword)) {
            return true;
        }
        return hashPassword(inputPassword).equals(storedPassword);
    }

    private String generateToken(User user) {
        return Base64.getEncoder().encodeToString(
                (user.getId() + ":" + user.getUsername() + ":" + UUID.randomUUID()).getBytes(StandardCharsets.UTF_8)
        );
    }
}
