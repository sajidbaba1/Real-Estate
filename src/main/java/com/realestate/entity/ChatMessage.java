package com.realestate.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "chat_messages")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class ChatMessage {
    
    public enum MessageType {
        TEXT,           // Regular text message
        PRICE_OFFER,    // Price offer from client
        PRICE_COUNTER,  // Counter offer from owner
        PRICE_ACCEPT,   // Price acceptance
        PRICE_REJECT,   // Price rejection
        SYSTEM,         // System generated message
        PURCHASE_REQUEST, // Client wants to purchase at agreed price
        PURCHASE_CONFIRM  // Owner confirms purchase
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "inquiry_id", nullable = false)
    private PropertyInquiry inquiry;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sender_id", nullable = false)
    private User sender; // Who sent this message

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private MessageType messageType = MessageType.TEXT;

    @Column(name = "content", columnDefinition = "TEXT")
    private String content; // Message text content

    @Column(name = "price_amount")
    private BigDecimal priceAmount; // For price-related messages

    @Column(name = "sent_at", nullable = false)
    private LocalDateTime sentAt;

    @Column(name = "read_at")
    private LocalDateTime readAt; // When the message was read by the recipient

    @Column(name = "is_read", nullable = false)
    private boolean isRead = false;

    @PrePersist
    public void onCreate() {
        sentAt = LocalDateTime.now();
    }

    // Constructors
    public ChatMessage() {}

    public ChatMessage(PropertyInquiry inquiry, User sender, MessageType messageType, String content) {
        this.inquiry = inquiry;
        this.sender = sender;
        this.messageType = messageType;
        this.content = content;
    }

    public ChatMessage(PropertyInquiry inquiry, User sender, MessageType messageType, String content, BigDecimal priceAmount) {
        this(inquiry, sender, messageType, content);
        this.priceAmount = priceAmount;
    }

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public PropertyInquiry getInquiry() {
        return inquiry;
    }

    public void setInquiry(PropertyInquiry inquiry) {
        this.inquiry = inquiry;
    }

    public User getSender() {
        return sender;
    }

    public void setSender(User sender) {
        this.sender = sender;
    }

    public MessageType getMessageType() {
        return messageType;
    }

    public void setMessageType(MessageType messageType) {
        this.messageType = messageType;
    }

    public String getContent() {
        return content;
    }

    public void setContent(String content) {
        this.content = content;
    }

    public BigDecimal getPriceAmount() {
        return priceAmount;
    }

    public void setPriceAmount(BigDecimal priceAmount) {
        this.priceAmount = priceAmount;
    }

    public LocalDateTime getSentAt() {
        return sentAt;
    }

    public void setSentAt(LocalDateTime sentAt) {
        this.sentAt = sentAt;
    }

    public LocalDateTime getReadAt() {
        return readAt;
    }

    public void setReadAt(LocalDateTime readAt) {
        this.readAt = readAt;
        this.isRead = readAt != null;
    }

    public boolean isRead() {
        return isRead;
    }

    public void setRead(boolean read) {
        this.isRead = read;
        if (read && readAt == null) {
            this.readAt = LocalDateTime.now();
        }
    }

    // Helper methods
    public boolean isPriceRelated() {
        return messageType == MessageType.PRICE_OFFER || 
               messageType == MessageType.PRICE_COUNTER || 
               messageType == MessageType.PRICE_ACCEPT || 
               messageType == MessageType.PRICE_REJECT;
    }

    public boolean isPurchaseRelated() {
        return messageType == MessageType.PURCHASE_REQUEST || 
               messageType == MessageType.PURCHASE_CONFIRM;
    }

    public void markAsRead() {
        this.isRead = true;
        this.readAt = LocalDateTime.now();
    }
}
