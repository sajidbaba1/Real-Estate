package com.realestate.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "booking_reviews")
public class BookingReview {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "rent_booking_id")
    private RentBooking rentBooking;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "pg_booking_id")
    private PgBooking pgBooking;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reviewer_id", nullable = false)
    private User reviewer;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reviewee_id", nullable = false)
    private User reviewee;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ReviewType reviewType;

    @Column(nullable = false)
    private Integer rating; // 1-5 stars

    @Column(columnDefinition = "TEXT")
    private String comment;

    // Detailed ratings
    @Column(name = "cleanliness_rating")
    private Integer cleanlinessRating;

    @Column(name = "communication_rating")
    private Integer communicationRating;

    @Column(name = "reliability_rating")
    private Integer reliabilityRating;

    @Column(name = "property_condition_rating")
    private Integer propertyConditionRating;

    @Column(name = "neighborhood_rating")
    private Integer neighborhoodRating;

    @Column(name = "is_anonymous", nullable = false)
    private Boolean isAnonymous = false;

    @Column(name = "is_verified", nullable = false)
    private Boolean isVerified = false;

    @Column(name = "helpful_count", nullable = false)
    private Integer helpfulCount = 0;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public enum ReviewType {
        TENANT_TO_OWNER,    // Tenant reviewing property owner/manager
        OWNER_TO_TENANT,    // Owner reviewing tenant
        PROPERTY_REVIEW     // Review of the property itself
    }

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
    public RentBooking getRentBooking() { return rentBooking; }
    public void setRentBooking(RentBooking rentBooking) { this.rentBooking = rentBooking; }
    public PgBooking getPgBooking() { return pgBooking; }
    public void setPgBooking(PgBooking pgBooking) { this.pgBooking = pgBooking; }
    public User getReviewer() { return reviewer; }
    public void setReviewer(User reviewer) { this.reviewer = reviewer; }
    public User getReviewee() { return reviewee; }
    public void setReviewee(User reviewee) { this.reviewee = reviewee; }
    public ReviewType getReviewType() { return reviewType; }
    public void setReviewType(ReviewType reviewType) { this.reviewType = reviewType; }
    public Integer getRating() { return rating; }
    public void setRating(Integer rating) { this.rating = rating; }
    public String getComment() { return comment; }
    public void setComment(String comment) { this.comment = comment; }
    public Integer getCleanlinessRating() { return cleanlinessRating; }
    public void setCleanlinessRating(Integer cleanlinessRating) { this.cleanlinessRating = cleanlinessRating; }
    public Integer getCommunicationRating() { return communicationRating; }
    public void setCommunicationRating(Integer communicationRating) { this.communicationRating = communicationRating; }
    public Integer getReliabilityRating() { return reliabilityRating; }
    public void setReliabilityRating(Integer reliabilityRating) { this.reliabilityRating = reliabilityRating; }
    public Integer getPropertyConditionRating() { return propertyConditionRating; }
    public void setPropertyConditionRating(Integer propertyConditionRating) { this.propertyConditionRating = propertyConditionRating; }
    public Integer getNeighborhoodRating() { return neighborhoodRating; }
    public void setNeighborhoodRating(Integer neighborhoodRating) { this.neighborhoodRating = neighborhoodRating; }
    public Boolean getIsAnonymous() { return isAnonymous; }
    public void setIsAnonymous(Boolean isAnonymous) { this.isAnonymous = isAnonymous; }
    public Boolean getIsVerified() { return isVerified; }
    public void setIsVerified(Boolean isVerified) { this.isVerified = isVerified; }
    public Integer getHelpfulCount() { return helpfulCount; }
    public void setHelpfulCount(Integer helpfulCount) { this.helpfulCount = helpfulCount; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
