package com.messiq.server.repository;

import com.messiq.server.model.User;
import com.messiq.server.model.UserStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByUsername(String username);

    Optional<User> findByEmail(String email);

    @Query("SELECT u FROM User u WHERE u.username = :login OR u.email = :login")
    Optional<User> findByUsernameOrEmail(@Param("login") String login);

    boolean existsByUsername(String username);

    boolean existsByEmail(String email);

    List<User> findByUsernameContainingIgnoreCaseOrDisplayNameContainingIgnoreCase(String username, String displayName);

    @Modifying
    @Query("UPDATE User u SET u.status = :status, u.lastSeen = :lastSeen WHERE u.id = :id")
    void updateUserStatus(@Param("id") Long id, @Param("status") UserStatus status, @Param("lastSeen") LocalDateTime lastSeen);

    @Modifying
    @Query("UPDATE User u SET u.status = :status, u.lastSeen = :lastSeen WHERE u.username = :username")
    void updateUserStatusByUsername(@Param("username") String username, @Param("status") UserStatus status, @Param("lastSeen") LocalDateTime lastSeen);
}
