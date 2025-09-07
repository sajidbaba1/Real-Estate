package com.realestate.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "sale_negotiations")
public class SaleNegotiation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "inquiry_id", nullable = false)
    private SaleInquiry inquiry;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Party offeredBy; // CUSTOMER or OWNER

    @Column(precision = 12, scale = 2)
    private BigDecimal amount;

    @Column(columnDefinition = "TEXT")
    private String message;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private NegotiationStatus status = NegotiationStatus.PENDING;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    public enum Party { CUSTOMER, OWNER }

    public enum NegotiationStatus { PENDING, ACCEPTED, REJECTED }

    @PrePersist
    protected void onCreate() { createdAt = LocalDateTime.now(); }

    // Getters and setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public SaleInquiry getInquiry() { return inquiry; }
    public void setInquiry(SaleInquiry inquiry) { this.inquiry = inquiry; }
    public Party getOfferedBy() { return offeredBy; }
    public void setOfferedBy(Party offeredBy) { this.offeredBy = offeredBy; }
    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }
    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
    public NegotiationStatus getStatus() { return status; }
    public void setStatus(NegotiationStatus status) { this.status = status; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
