package com.realestate.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "sale_inquiries")
public class SaleInquiry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "property_id", nullable = false)
    private Property property;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id", nullable = false)
    private User customer;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "owner_id", nullable = false)
    private User owner;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private InquiryStatus status = InquiryStatus.ACTIVE;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private DealStatus dealStatus = DealStatus.PENDING;

    @Column(precision = 12, scale = 2)
    private BigDecimal acceptedAmount; // when accepted

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @OneToMany(mappedBy = "inquiry", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("createdAt ASC")
    private List<SaleNegotiation> negotiations = new ArrayList<>();

    public enum InquiryStatus { ACTIVE, CANCELLED, CLOSED }

    public enum DealStatus { PENDING, ACCEPTED, BOOKED }

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    // Getters and setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Property getProperty() { return property; }
    public void setProperty(Property property) { this.property = property; }
    public User getCustomer() { return customer; }
    public void setCustomer(User customer) { this.customer = customer; }
    public User getOwner() { return owner; }
    public void setOwner(User owner) { this.owner = owner; }
    public InquiryStatus getStatus() { return status; }
    public void setStatus(InquiryStatus status) { this.status = status; }
    public DealStatus getDealStatus() { return dealStatus; }
    public void setDealStatus(DealStatus dealStatus) { this.dealStatus = dealStatus; }
    public BigDecimal getAcceptedAmount() { return acceptedAmount; }
    public void setAcceptedAmount(BigDecimal acceptedAmount) { this.acceptedAmount = acceptedAmount; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
    public List<SaleNegotiation> getNegotiations() { return negotiations; }
    public void setNegotiations(List<SaleNegotiation> negotiations) { this.negotiations = negotiations; }
}
