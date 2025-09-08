package com.realestate.repository;

import com.realestate.entity.ChatMessage;
import com.realestate.entity.PropertyInquiry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {
    
    // Find all messages for an inquiry, ordered by sent time
    List<ChatMessage> findByInquiry_IdOrderBySentAtAsc(Long inquiryId);
    
    // Find messages for an inquiry with pagination
    @Query("SELECT cm FROM ChatMessage cm WHERE cm.inquiry.id = :inquiryId ORDER BY cm.sentAt ASC")
    List<ChatMessage> findMessagesByInquiryId(@Param("inquiryId") Long inquiryId);
    
    // Find unread messages for a specific user in an inquiry
    @Query("SELECT cm FROM ChatMessage cm WHERE cm.inquiry.id = :inquiryId AND cm.sender.id != :userId AND cm.isRead = false ORDER BY cm.sentAt ASC")
    List<ChatMessage> findUnreadMessages(@Param("inquiryId") Long inquiryId, @Param("userId") Long userId);
    
    // Count unread messages for a user in an inquiry
    @Query("SELECT COUNT(cm) FROM ChatMessage cm WHERE cm.inquiry.id = :inquiryId AND cm.sender.id != :userId AND cm.isRead = false")
    Long countUnreadMessages(@Param("inquiryId") Long inquiryId, @Param("userId") Long userId);
    
    // Count total unread messages for a user across all inquiries
    @Query("SELECT COUNT(cm) FROM ChatMessage cm WHERE cm.sender.id != :userId AND cm.isRead = false AND (cm.inquiry.client.id = :userId OR cm.inquiry.owner.id = :userId)")
    Long countTotalUnreadMessagesForUser(@Param("userId") Long userId);
    
    // Mark messages as read
    @Modifying
    @Transactional
    @Query("UPDATE ChatMessage cm SET cm.isRead = true, cm.readAt = :readAt WHERE cm.inquiry.id = :inquiryId AND cm.sender.id != :userId AND cm.isRead = false")
    void markMessagesAsRead(@Param("inquiryId") Long inquiryId, @Param("userId") Long userId, @Param("readAt") LocalDateTime readAt);
    
    // Find the latest message in an inquiry
    @Query("SELECT cm FROM ChatMessage cm WHERE cm.inquiry.id = :inquiryId ORDER BY cm.sentAt DESC LIMIT 1")
    ChatMessage findLatestMessageByInquiry(@Param("inquiryId") Long inquiryId);
    
    // Find price-related messages in an inquiry
    @Query("SELECT cm FROM ChatMessage cm WHERE cm.inquiry.id = :inquiryId AND cm.messageType IN ('PRICE_OFFER', 'PRICE_COUNTER', 'PRICE_ACCEPT', 'PRICE_REJECT') ORDER BY cm.sentAt DESC")
    List<ChatMessage> findPriceMessages(@Param("inquiryId") Long inquiryId);
    
    // Find the latest price offer in an inquiry
    @Query("SELECT cm FROM ChatMessage cm WHERE cm.inquiry.id = :inquiryId AND cm.messageType IN ('PRICE_OFFER', 'PRICE_COUNTER') ORDER BY cm.sentAt DESC LIMIT 1")
    ChatMessage findLatestPriceOffer(@Param("inquiryId") Long inquiryId);
    
    // Find messages by type
    List<ChatMessage> findByInquiry_IdAndMessageTypeOrderBySentAtDesc(Long inquiryId, ChatMessage.MessageType messageType);
    
    // Find messages sent after a specific time (for real-time updates)
    @Query("SELECT cm FROM ChatMessage cm WHERE cm.inquiry.id = :inquiryId AND cm.sentAt > :afterTime ORDER BY cm.sentAt ASC")
    List<ChatMessage> findRecentMessages(@Param("inquiryId") Long inquiryId, @Param("afterTime") LocalDateTime afterTime);
    
    // Find messages involving a specific user (either as sender or recipient)
    @Query("SELECT cm FROM ChatMessage cm WHERE cm.inquiry.id = :inquiryId AND (cm.sender.id = :userId OR cm.inquiry.client.id = :userId OR cm.inquiry.owner.id = :userId) ORDER BY cm.sentAt ASC")
    List<ChatMessage> findMessagesByInquiryAndUser(@Param("inquiryId") Long inquiryId, @Param("userId") Long userId);
    
    // Delete all messages for an inquiry (cascade delete)
    void deleteByInquiry_Id(Long inquiryId);
    
    // Find system messages for an inquiry
    List<ChatMessage> findByInquiry_IdAndMessageTypeOrderBySentAtAsc(Long inquiryId, ChatMessage.MessageType messageType);
    
    // Analytics - count messages sent today
    @Query("SELECT COUNT(cm) FROM ChatMessage cm WHERE cm.sentAt >= :startOfDay")
    Long countMessagesSentToday(@Param("startOfDay") LocalDateTime startOfDay);
    
    // Analytics - count messages by date range
    @Query("SELECT COUNT(cm) FROM ChatMessage cm WHERE cm.sentAt BETWEEN :startDate AND :endDate")
    Long countMessagesBetween(@Param("startDate") LocalDateTime startDate, @Param("endDate") LocalDateTime endDate);
}
