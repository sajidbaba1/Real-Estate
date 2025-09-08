package com.realestate.repository;

import com.realestate.entity.BookingNotification;
import com.realestate.entity.BookingNotification.NotificationType;
import com.realestate.entity.BookingNotification.NotificationPriority;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface BookingNotificationRepository extends JpaRepository<BookingNotification, Long> {
    
    // Find notifications by user
    List<BookingNotification> findByUser_IdOrderByCreatedAtDesc(Long userId);
    
    // Find unread notifications by user
    List<BookingNotification> findByUser_IdAndIsReadFalseOrderByCreatedAtDesc(Long userId);
    
    // Count unread notifications by user
    Long countByUser_IdAndIsReadFalse(Long userId);
    
    // Find notifications by user with pagination
    Page<BookingNotification> findByUser_IdOrderByCreatedAtDesc(Long userId, Pageable pageable);
    
    // Find notifications by type
    List<BookingNotification> findByUser_IdAndTypeOrderByCreatedAtDesc(Long userId, NotificationType type);
    
    // Find high priority notifications
    List<BookingNotification> findByUser_IdAndPriorityOrderByCreatedAtDesc(Long userId, NotificationPriority priority);
    
    // Find notifications within date range
    @Query("SELECT n FROM BookingNotification n WHERE n.user.id = :userId AND n.createdAt BETWEEN :startDate AND :endDate ORDER BY n.createdAt DESC")
    List<BookingNotification> findByUserAndDateRange(@Param("userId") Long userId, @Param("startDate") LocalDateTime startDate, @Param("endDate") LocalDateTime endDate);
    
    // Find expired notifications
    @Query("SELECT n FROM BookingNotification n WHERE n.expiresAt < :currentDate")
    List<BookingNotification> findExpiredNotifications(@Param("currentDate") LocalDateTime currentDate);
    
    // Find notifications for rent booking
    List<BookingNotification> findByRentBooking_IdOrderByCreatedAtDesc(Long rentBookingId);
    
    // Find notifications for PG booking
    List<BookingNotification> findByPgBooking_IdOrderByCreatedAtDesc(Long pgBookingId);
    
    // Mark all as read for user
    @Query("UPDATE BookingNotification n SET n.isRead = true WHERE n.user.id = :userId AND n.isRead = false")
    void markAllAsReadForUser(@Param("userId") Long userId);
    
    // Delete old read notifications
    @Query("DELETE FROM BookingNotification n WHERE n.isRead = true AND n.createdAt < :cutoffDate")
    void deleteOldReadNotifications(@Param("cutoffDate") LocalDateTime cutoffDate);
}
