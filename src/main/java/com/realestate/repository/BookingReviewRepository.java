package com.realestate.repository;

import com.realestate.entity.BookingReview;
import com.realestate.entity.BookingReview.ReviewType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface BookingReviewRepository extends JpaRepository<BookingReview, Long> {
    
    // Find reviews by reviewer
    List<BookingReview> findByReviewer_IdOrderByCreatedAtDesc(Long reviewerId);
    
    // Find reviews by reviewee (person being reviewed)
    List<BookingReview> findByReviewee_IdOrderByCreatedAtDesc(Long revieweeId);
    
    // Find reviews by reviewer with pagination
    Page<BookingReview> findByReviewer_IdOrderByCreatedAtDesc(Long reviewerId, Pageable pageable);
    
    // Find reviews by reviewee with pagination
    Page<BookingReview> findByReviewee_IdOrderByCreatedAtDesc(Long revieweeId, Pageable pageable);
    
    // Find reviews for specific rent booking
    List<BookingReview> findByRentBooking_IdOrderByCreatedAtDesc(Long rentBookingId);
    
    // Find reviews for specific PG booking
    List<BookingReview> findByPgBooking_IdOrderByCreatedAtDesc(Long pgBookingId);
    
    // Find reviews by type
    List<BookingReview> findByReviewTypeOrderByCreatedAtDesc(ReviewType reviewType);
    
    // Check if review exists for specific booking and reviewer
    @Query("SELECT r FROM BookingReview r WHERE r.rentBooking.id = :rentBookingId AND r.reviewer.id = :reviewerId")
    Optional<BookingReview> findByRentBookingAndReviewer(@Param("rentBookingId") Long rentBookingId, @Param("reviewerId") Long reviewerId);
    
    @Query("SELECT r FROM BookingReview r WHERE r.pgBooking.id = :pgBookingId AND r.reviewer.id = :reviewerId")
    Optional<BookingReview> findByPgBookingAndReviewer(@Param("pgBookingId") Long pgBookingId, @Param("reviewerId") Long reviewerId);
    
    // Calculate average rating for user
    @Query("SELECT AVG(r.rating) FROM BookingReview r WHERE r.reviewee.id = :userId")
    Double calculateAverageRatingForUser(@Param("userId") Long userId);
    
    // Calculate average rating by category for user
    @Query("SELECT AVG(r.cleanlinessRating) FROM BookingReview r WHERE r.reviewee.id = :userId AND r.cleanlinessRating IS NOT NULL")
    Double calculateAverageCleanlinessRating(@Param("userId") Long userId);
    
    @Query("SELECT AVG(r.communicationRating) FROM BookingReview r WHERE r.reviewee.id = :userId AND r.communicationRating IS NOT NULL")
    Double calculateAverageCommunicationRating(@Param("userId") Long userId);
    
    @Query("SELECT AVG(r.reliabilityRating) FROM BookingReview r WHERE r.reviewee.id = :userId AND r.reliabilityRating IS NOT NULL")
    Double calculateAverageReliabilityRating(@Param("userId") Long userId);
    
    // Count reviews by rating
    @Query("SELECT COUNT(r) FROM BookingReview r WHERE r.reviewee.id = :userId AND r.rating = :rating")
    Long countReviewsByRating(@Param("userId") Long userId, @Param("rating") Integer rating);
    
    // Find recent reviews (last 30 days)
    @Query("SELECT r FROM BookingReview r WHERE r.createdAt >= :cutoffDate ORDER BY r.createdAt DESC")
    List<BookingReview> findRecentReviews(@Param("cutoffDate") LocalDateTime cutoffDate);
    
    // Find verified reviews
    List<BookingReview> findByIsVerifiedTrueOrderByCreatedAtDesc();
    
    // Find reviews with high rating (4-5 stars)
    @Query("SELECT r FROM BookingReview r WHERE r.rating >= 4 ORDER BY r.rating DESC, r.createdAt DESC")
    List<BookingReview> findHighRatedReviews();
    
    // Find reviews that need verification
    List<BookingReview> findByIsVerifiedFalseOrderByCreatedAtAsc();
    
    // Calculate total review count for user
    Long countByReviewee_Id(Long revieweeId);
    
    // Find reviews by rating range
    @Query("SELECT r FROM BookingReview r WHERE r.reviewee.id = :userId AND r.rating BETWEEN :minRating AND :maxRating ORDER BY r.createdAt DESC")
    List<BookingReview> findByRatingRange(@Param("userId") Long userId, @Param("minRating") Integer minRating, @Param("maxRating") Integer maxRating);

    // Average rating for a property across rent and PG bookings
    @Query("SELECT AVG(r.rating) FROM BookingReview r WHERE " +
           "(r.rentBooking.property.id = :propertyId) OR " +
           "(r.pgBooking.bed.room.property.id = :propertyId)")
    Double calculateAverageRatingForProperty(@Param("propertyId") Long propertyId);

    // Top-rated tenants: return [userId, firstName, lastName, avgRating, reviewCount]
    @Query("SELECT r.reviewee.id, r.reviewee.firstName, r.reviewee.lastName, AVG(r.rating) as avgRating, COUNT(r) as reviewCount " +
           "FROM BookingReview r WHERE r.reviewType = com.realestate.entity.BookingReview$ReviewType.OWNER_TO_TENANT " +
           "GROUP BY r.reviewee.id, r.reviewee.firstName, r.reviewee.lastName " +
           "ORDER BY avgRating DESC, reviewCount DESC")
    List<Object[]> findTopRatedTenants(Pageable pageable);
}
