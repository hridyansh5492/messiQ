package com.messiq.server.repository;

import com.messiq.server.model.Message;
import com.messiq.server.model.MessageStatus;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MessageRepository extends JpaRepository<Message, Long> {

    @Query("SELECT m FROM Message m WHERE (m.senderId = :user1 AND m.receiverId = :user2) " +
           "OR (m.senderId = :user2 AND m.receiverId = :user1) " +
           "ORDER BY m.timestamp ASC")
    List<Message> findConversation(@Param("user1") Long user1, @Param("user2") Long user2);

    @Query("SELECT m FROM Message m WHERE (m.senderId = :user1 AND m.receiverId = :user2) " +
           "OR (m.senderId = :user2 AND m.receiverId = :user1) " +
           "ORDER BY m.timestamp DESC")
    List<Message> findRecentMessagesBetween(@Param("user1") Long user1, @Param("user2") Long user2, Pageable pageable);

    @Query("SELECT m FROM Message m WHERE m.id IN (" +
           "SELECT MAX(m2.id) FROM Message m2 WHERE m2.senderId = :userId OR m2.receiverId = :userId GROUP BY " +
           "CASE WHEN m2.senderId = :userId THEN m2.receiverId ELSE m2.senderId END" +
           ") ORDER BY m.timestamp DESC")
    List<Message> findLatestMessagePerConversation(@Param("userId") Long userId);

    @Query("SELECT COUNT(m) FROM Message m WHERE m.receiverId = :receiverId AND m.senderId = :senderId AND m.status != 'READ'")
    long countUnreadMessages(@Param("receiverId") Long receiverId, @Param("senderId") Long senderId);

    @Modifying
    @Query("UPDATE Message m SET m.status = :status WHERE m.receiverId = :receiverId AND m.senderId = :senderId AND m.status != 'READ'")
    void updateMessagesAsRead(@Param("receiverId") Long receiverId, @Param("senderId") Long senderId, @Param("status") MessageStatus status);
}
