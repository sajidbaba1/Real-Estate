package com.realestate.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "property_inquiries")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class PropertyInquiry {
    
    public enum InquiryStatus {
        ACTIVE,      // Inquiry is active and can receive messages
        NEGOTIATING, // Price negotiation in progress
        AGREED,      // Price has been agreed upon
        PURCHASED,   // Property has been purchased
        CANCELLED,   // Inquiry has been cancelled
        CLOSED       // Inquiry has been closed
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "property_id", nullable = false)
    private Property property;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "client_id", nullable = false)
    private User client; // The user making the inquiry (CLIENT role)

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "owner_id", nullable = false)
    private User owner; // The property owner (AGENT role)

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private InquiryStatus status = InquiryStatus.ACTIVE;

    @Column(name = "initial_message", columnDefinition = "TEXT")
    private String initialMessage; // Client's initial inquiry message

    @Column(name = "offered_price")
    private BigDecimal offeredPrice; // Client's offered price

    @Column(name = "agreed_price")
    private BigDecimal agreedPrice; // Final agreed price

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Column(name = "closed_at")
    private LocalDateTime closedAt;

    // One inquiry can have many chat messages
    @OneToMany(mappedBy = "inquiry", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<ChatMessage> messages;

    @PrePersist
    public void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    public void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    // Constructors
    public PropertyInquiry() {}

    public PropertyInquiry(Property property, User client, User owner, String initialMessage, BigDecimal offeredPrice) {
        this.property = property;
        this.client = client;
        this.owner = owner;
        this.initialMessage = initialMessage;
        this.offeredPrice = offeredPrice;
        this.status = InquiryStatus.ACTIVE;
    }

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Property getProperty() {
        return property;
    }

    public void setProperty(Property property) {
        this.property = property;
    }

    public User getClient() {
        return client;
    }

    public void setClient(User client) {
        this.client = client;
    }

    public User getOwner() {
        return owner;
    }

    public void setOwner(User owner) {
        this.owner = owner;
    }

    public InquiryStatus getStatus() {
        return status;
    }

    public void setStatus(InquiryStatus status) {
        this.status = status;
        if (status == InquiryStatus.PURCHASED || status == InquiryStatus.CANCELLED || status == InquiryStatus.CLOSED) {
            this.closedAt = LocalDateTime.now();
        }
    }

    public String getInitialMessage() {
        return initialMessage;
    }

    public void setInitialMessage(String initialMessage) {
        this.initialMessage = initialMessage;
    }

    public BigDecimal getOfferedPrice() {
        return offeredPrice;
    }

    public void setOfferedPrice(BigDecimal offeredPrice) {
        this.offeredPrice = offeredPrice;
    }

    public BigDecimal getAgreedPrice() {
        return agreedPrice;
    }

    public void setAgreedPrice(BigDecimal agreedPrice) {
        this.agreedPrice = agreedPrice;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }

    public LocalDateTime getClosedAt() {
        return closedAt;
    }

    public void setClosedAt(LocalDateTime closedAt) {
        this.closedAt = closedAt;
    }

    public List<ChatMessage> getMessages() {
        return messages;
    }

    public void setMessages(List<ChatMessage> messages) {
        this.messages = messages;
    }

    // Helper methods
    public boolean isActive() {
        return status == InquiryStatus.ACTIVE || status == InquiryStatus.NEGOTIATING;
    }

    public boolean canBeModified() {
        return status != InquiryStatus.PURCHASED && status != InquiryStatus.CANCELLED && status != InquiryStatus.CLOSED;
    }

    public boolean isPurchased() {
        return status == InquiryStatus.PURCHASED;
    }
}
