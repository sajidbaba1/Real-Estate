package com.realestate.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "booking_notifications")
public class BookingNotification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "rent_booking_id")
    private RentBooking rentBooking;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "pg_booking_id")
    private PgBooking pgBooking;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private NotificationType type;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String message;

    @Column(name = "is_read", nullable = false)
    private Boolean isRead = false;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private NotificationPriority priority = NotificationPriority.MEDIUM;

    @Column(name = "action_url")
    private String actionUrl;

    @Column(name = "expires_at")
    private LocalDateTime expiresAt;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    public enum NotificationType {
        BOOKING_CREATED,          // New booking request
        BOOKING_APPROVED,         // Booking approved by owner
        BOOKING_REJECTED,         // Booking rejected by owner
        BOOKING_CANCELLED,        // Booking cancelled
        BOOKING_EXTENDED,         // Booking extended
        BOOKING_TERMINATED,       // Booking terminated
        PAYMENT_DUE,             // Payment due reminder
        PAYMENT_OVERDUE,         // Payment overdue
        PAYMENT_RECEIVED,        // Payment received
        LATE_FEE_APPLIED,        // Late fee added
        REVIEW_REQUEST,          // Request for review
        REVIEW_RECEIVED,         // Review received
        MAINTENANCE_REQUEST,     // Maintenance request
        CONTRACT_RENEWAL,        // Contract renewal notice
        SYSTEM_ANNOUNCEMENT      // General system notification
    }

    public enum NotificationPriority {
        LOW,
        MEDIUM,
        HIGH,
        URGENT
    }

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        if (expiresAt == null) {
            // Default expiry: 30 days for most notifications
            expiresAt = createdAt.plusDays(30);
        }
    }

    // Getters and setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }
    public RentBooking getRentBooking() { return rentBooking; }
    public void setRentBooking(RentBooking rentBooking) { this.rentBooking = rentBooking; }
    public PgBooking getPgBooking() { return pgBooking; }
    public void setPgBooking(PgBooking pgBooking) { this.pgBooking = pgBooking; }
    public NotificationType getType() { return type; }
    public void setType(NotificationType type) { this.type = type; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
    public Boolean getIsRead() { return isRead; }
    public void setIsRead(Boolean isRead) { this.isRead = isRead; }
    public NotificationPriority getPriority() { return priority; }
    public void setPriority(NotificationPriority priority) { this.priority = priority; }
    public String getActionUrl() { return actionUrl; }
    public void setActionUrl(String actionUrl) { this.actionUrl = actionUrl; }
    public LocalDateTime getExpiresAt() { return expiresAt; }
    public void setExpiresAt(LocalDateTime expiresAt) { this.expiresAt = expiresAt; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
