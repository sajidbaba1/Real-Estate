package com.realestate.controller;

import com.realestate.entity.*;
import com.realestate.repository.*;
import com.realestate.service.BookingNotificationService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/simple/reviews")
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:5175", "https://real-estate-alpha-sandy.vercel.app"})
public class BookingReviewControllerSimple {

    @Autowired private BookingReviewRepository reviewRepo;
    @Autowired private RentBookingRepository rentBookingRepo;
    @Autowired private PgBookingRepository pgBookingRepo;
    @Autowired private UserRepository userRepo;
    @Autowired private BookingNotificationService notificationService;

    // DTOs
    public static class CreateReviewRequest {
        public Long rentBookingId; // Either this
        public Long pgBookingId;   // Or this
        public Long revieweeId;    // User being reviewed
        public BookingReview.ReviewType reviewType;
        public Integer rating;     // 1-5 stars
        public String comment;
        
        // Detailed ratings
        public Integer cleanlinessRating;
        public Integer communicationRating;
        public Integer reliabilityRating;
        public Integer propertyConditionRating;
        public Integer neighborhoodRating;
        
        public Boolean isAnonymous = false;
    }

    public static class UpdateReviewRequest {
        public Integer rating;
        public String comment;
        public Integer cleanlinessRating;
        public Integer communicationRating;
        public Integer reliabilityRating;
        public Integer propertyConditionRating;
        public Integer neighborhoodRating;
    }

    // Create review
    @PostMapping
    @PreAuthorize("hasAnyRole('USER','ADMIN','AGENT')")
    public ResponseEntity<?> createReview(@Valid @RequestBody CreateReviewRequest req) {
        Optional<User> reviewerOpt = getCurrentUser();
        if (reviewerOpt.isEmpty()) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        User reviewer = reviewerOpt.get();

        // Validate required fields
        if (req.rating == null || req.rating < 1 || req.rating > 5) {
            return ResponseEntity.badRequest().body("Rating must be between 1 and 5");
        }

        if (req.revieweeId == null) {
            return ResponseEntity.badRequest().body("Reviewee ID is required");
        }

        if ((req.rentBookingId == null && req.pgBookingId == null) || 
            (req.rentBookingId != null && req.pgBookingId != null)) {
            return ResponseEntity.badRequest().body("Either rent booking ID or PG booking ID must be provided, not both");
        }

        Optional<User> revieweeOpt = userRepo.findById(req.revieweeId);
        if (revieweeOpt.isEmpty()) return ResponseEntity.badRequest().body("Reviewee not found");
        User reviewee = revieweeOpt.get();

        // Validate booking ownership and review eligibility
        RentBooking rentBooking = null;
        PgBooking pgBooking = null;

        if (req.rentBookingId != null) {
            Optional<RentBooking> bookingOpt = rentBookingRepo.findById(req.rentBookingId);
            if (bookingOpt.isEmpty()) return ResponseEntity.badRequest().body("Rent booking not found");
            rentBooking = bookingOpt.get();

            // Check if user can review this booking
            if (!canReviewBooking(reviewer, rentBooking.getTenant(), rentBooking.getOwner())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Not authorized to review this booking");
            }

            // Check if booking is completed or active for sufficient time
            if (rentBooking.getStatus() == RentBooking.BookingStatus.PENDING_APPROVAL ||
                rentBooking.getStatus() == RentBooking.BookingStatus.REJECTED) {
                return ResponseEntity.badRequest().body("Cannot review booking that hasn't been active");
            }

            // Check if review already exists (simplified check)
            List<BookingReview> existingReviews = reviewRepo.findAll();
            boolean reviewExists = existingReviews.stream()
                .anyMatch(review -> review.getRentBooking() != null && 
                         review.getRentBooking().getId().equals(req.rentBookingId) &&
                         review.getReviewer().getId().equals(reviewer.getId()));
            
            if (reviewExists) {
                return ResponseEntity.badRequest().body("Review already exists for this booking");
            }
        }

        if (req.pgBookingId != null) {
            Optional<PgBooking> bookingOpt = pgBookingRepo.findById(req.pgBookingId);
            if (bookingOpt.isEmpty()) return ResponseEntity.badRequest().body("PG booking not found");
            pgBooking = bookingOpt.get();

            if (!canReviewBooking(reviewer, pgBooking.getTenant(), pgBooking.getOwner())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Not authorized to review this booking");
            }

            if (pgBooking.getStatus() == PgBooking.BookingStatus.PENDING_APPROVAL ||
                pgBooking.getStatus() == PgBooking.BookingStatus.REJECTED) {
                return ResponseEntity.badRequest().body("Cannot review booking that hasn't been active");
            }

            // Check if review already exists (simplified check)
            List<BookingReview> existingReviews = reviewRepo.findAll();
            boolean reviewExists = existingReviews.stream()
                .anyMatch(review -> review.getPgBooking() != null && 
                         review.getPgBooking().getId().equals(req.pgBookingId) &&
                         review.getReviewer().getId().equals(reviewer.getId()));
            
            if (reviewExists) {
                return ResponseEntity.badRequest().body("Review already exists for this booking");
            }
        }

        // Create review
        BookingReview review = new BookingReview();
        review.setRentBooking(rentBooking);
        review.setPgBooking(pgBooking);
        review.setReviewer(reviewer);
        review.setReviewee(reviewee);
        review.setReviewType(req.reviewType);
        review.setRating(req.rating);
        review.setComment(req.comment);
        review.setCleanlinessRating(req.cleanlinessRating);
        review.setCommunicationRating(req.communicationRating);
        review.setReliabilityRating(req.reliabilityRating);
        review.setPropertyConditionRating(req.propertyConditionRating);
        review.setNeighborhoodRating(req.neighborhoodRating);
        review.setIsAnonymous(req.isAnonymous);
        review.setIsVerified(false); // Will be verified later

        review = reviewRepo.save(review);

        // Send notification to reviewee
        String title = "New Review Received";
        String message = String.format("You have received a new %d-star review%s", 
            req.rating, req.isAnonymous ? "" : " from " + reviewer.getFirstName());
        
        notificationService.createNotification(reviewee, BookingNotification.NotificationType.REVIEW_RECEIVED,
            title, message, "/reviews", rentBooking, pgBooking);

        return ResponseEntity.status(HttpStatus.CREATED).body(review);
    }

    // Get reviews for user (as reviewee)
    @GetMapping("/user/{userId}")
    public ResponseEntity<?> getUserReviews(@PathVariable Long userId,
                                          @RequestParam(defaultValue = "0") int page,
                                          @RequestParam(defaultValue = "10") int size) {
        
        List<BookingReview> allReviews = reviewRepo.findAll();
        List<BookingReview> userReviews = allReviews.stream()
            .filter(review -> review.getReviewee().getId().equals(userId))
            .sorted((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()))
            .collect(Collectors.toList());
        
        // Manual pagination
        int start = page * size;
        int end = Math.min(start + size, userReviews.size());
        List<BookingReview> pagedReviews = userReviews.subList(start, end);
        
        // Calculate average ratings
        OptionalDouble averageRating = userReviews.stream().mapToInt(BookingReview::getRating).average();
        OptionalDouble avgCleanliness = userReviews.stream()
            .filter(r -> r.getCleanlinessRating() != null)
            .mapToInt(BookingReview::getCleanlinessRating).average();
        OptionalDouble avgCommunication = userReviews.stream()
            .filter(r -> r.getCommunicationRating() != null)
            .mapToInt(BookingReview::getCommunicationRating).average();
        OptionalDouble avgReliability = userReviews.stream()
            .filter(r -> r.getReliabilityRating() != null)
            .mapToInt(BookingReview::getReliabilityRating).average();
        
        // Count reviews by rating
        Map<Integer, Long> ratingCounts = new HashMap<>();
        for (int i = 1; i <= 5; i++) {
            final int rating = i;
            ratingCounts.put(i, userReviews.stream()
                .filter(review -> review.getRating() == rating)
                .count());
        }

        Map<String, Object> response = new HashMap<>();
        response.put("reviews", pagedReviews);
        response.put("totalReviews", userReviews.size());
        response.put("totalPages", (int) Math.ceil((double) userReviews.size() / size));
        response.put("averageRating", averageRating.isPresent() ? Math.round(averageRating.getAsDouble() * 10.0) / 10.0 : 0.0);
        response.put("averageCleanliness", avgCleanliness.isPresent() ? Math.round(avgCleanliness.getAsDouble() * 10.0) / 10.0 : 0.0);
        response.put("averageCommunication", avgCommunication.isPresent() ? Math.round(avgCommunication.getAsDouble() * 10.0) / 10.0 : 0.0);
        response.put("averageReliability", avgReliability.isPresent() ? Math.round(avgReliability.getAsDouble() * 10.0) / 10.0 : 0.0);
        response.put("ratingBreakdown", ratingCounts);

        return ResponseEntity.ok(response);
    }

    // Get my reviews (as reviewer)
    @GetMapping("/my-reviews")
    @PreAuthorize("hasAnyRole('USER','ADMIN','AGENT')")
    public ResponseEntity<?> getMyReviews(@RequestParam(defaultValue = "0") int page,
                                        @RequestParam(defaultValue = "10") int size) {
        Optional<User> userOpt = getCurrentUser();
        if (userOpt.isEmpty()) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        
        List<BookingReview> allReviews = reviewRepo.findAll();
        List<BookingReview> myReviews = allReviews.stream()
            .filter(review -> review.getReviewer().getId().equals(userOpt.get().getId()))
            .sorted((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()))
            .collect(Collectors.toList());
        
        // Manual pagination
        int start = page * size;
        int end = Math.min(start + size, myReviews.size());
        List<BookingReview> pagedReviews = myReviews.subList(start, end);
        
        Map<String, Object> response = new HashMap<>();
        response.put("reviews", pagedReviews);
        response.put("totalReviews", myReviews.size());
        response.put("totalPages", (int) Math.ceil((double) myReviews.size() / size));

        return ResponseEntity.ok(response);
    }

    // Get reviews for specific booking
    @GetMapping("/booking/rent/{bookingId}")
    public ResponseEntity<?> getRentBookingReviews(@PathVariable Long bookingId) {
        List<BookingReview> allReviews = reviewRepo.findAll();
        List<BookingReview> bookingReviews = allReviews.stream()
            .filter(review -> review.getRentBooking() != null && 
                   review.getRentBooking().getId().equals(bookingId))
            .sorted((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()))
            .collect(Collectors.toList());
        
        return ResponseEntity.ok(bookingReviews);
    }

    @GetMapping("/booking/pg/{bookingId}")
    public ResponseEntity<?> getPgBookingReviews(@PathVariable Long bookingId) {
        List<BookingReview> allReviews = reviewRepo.findAll();
        List<BookingReview> bookingReviews = allReviews.stream()
            .filter(review -> review.getPgBooking() != null && 
                   review.getPgBooking().getId().equals(bookingId))
            .sorted((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()))
            .collect(Collectors.toList());
        
        return ResponseEntity.ok(bookingReviews);
    }

    // Update review
    @PutMapping("/{reviewId}")
    @PreAuthorize("hasAnyRole('USER','ADMIN','AGENT')")
    public ResponseEntity<?> updateReview(@PathVariable Long reviewId, @Valid @RequestBody UpdateReviewRequest req) {
        Optional<User> userOpt = getCurrentUser();
        if (userOpt.isEmpty()) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        User user = userOpt.get();

        Optional<BookingReview> reviewOpt = reviewRepo.findById(reviewId);
        if (reviewOpt.isEmpty()) return ResponseEntity.notFound().build();
        BookingReview review = reviewOpt.get();

        // Check permissions
        if (!user.getId().equals(review.getReviewer().getId()) && user.getRole() != User.Role.ADMIN) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Not authorized to update this review");
        }

        // Update fields
        if (req.rating != null && req.rating >= 1 && req.rating <= 5) {
            review.setRating(req.rating);
        }
        if (req.comment != null) {
            review.setComment(req.comment);
        }
        if (req.cleanlinessRating != null) review.setCleanlinessRating(req.cleanlinessRating);
        if (req.communicationRating != null) review.setCommunicationRating(req.communicationRating);
        if (req.reliabilityRating != null) review.setReliabilityRating(req.reliabilityRating);
        if (req.propertyConditionRating != null) review.setPropertyConditionRating(req.propertyConditionRating);
        if (req.neighborhoodRating != null) review.setNeighborhoodRating(req.neighborhoodRating);

        review = reviewRepo.save(review);
        return ResponseEntity.ok(review);
    }

    // Delete review
    @DeleteMapping("/{reviewId}")
    @PreAuthorize("hasAnyRole('USER','ADMIN','AGENT')")
    public ResponseEntity<?> deleteReview(@PathVariable Long reviewId) {
        Optional<User> userOpt = getCurrentUser();
        if (userOpt.isEmpty()) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        User user = userOpt.get();

        Optional<BookingReview> reviewOpt = reviewRepo.findById(reviewId);
        if (reviewOpt.isEmpty()) return ResponseEntity.notFound().build();
        BookingReview review = reviewOpt.get();

        // Check permissions
        if (!user.getId().equals(review.getReviewer().getId()) && user.getRole() != User.Role.ADMIN) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Not authorized to delete this review");
        }

        reviewRepo.delete(review);
        return ResponseEntity.ok("Review deleted successfully");
    }

    // Mark review as helpful
    @PostMapping("/{reviewId}/helpful")
    @PreAuthorize("hasAnyRole('USER','ADMIN','AGENT')")
    public ResponseEntity<?> markReviewHelpful(@PathVariable Long reviewId) {
        Optional<BookingReview> reviewOpt = reviewRepo.findById(reviewId);
        if (reviewOpt.isEmpty()) return ResponseEntity.notFound().build();
        
        BookingReview review = reviewOpt.get();
        review.setHelpfulCount(review.getHelpfulCount() + 1);
        reviewRepo.save(review);
        
        return ResponseEntity.ok("Review marked as helpful");
    }

    // Get recent high-rated reviews
    @GetMapping("/featured")
    public ResponseEntity<?> getFeaturedReviews(@RequestParam(defaultValue = "10") int limit) {
        List<BookingReview> allReviews = reviewRepo.findAll();
        List<BookingReview> highRatedReviews = allReviews.stream()
            .filter(review -> review.getRating() >= 4)
            .sorted((a, b) -> {
                // Sort by rating desc, then by helpful count desc, then by created date desc
                int ratingCompare = Integer.compare(b.getRating(), a.getRating());
                if (ratingCompare != 0) return ratingCompare;
                int helpfulCompare = Integer.compare(b.getHelpfulCount(), a.getHelpfulCount());
                if (helpfulCompare != 0) return helpfulCompare;
                return b.getCreatedAt().compareTo(a.getCreatedAt());
            })
            .limit(limit)
            .collect(Collectors.toList());
        
        return ResponseEntity.ok(highRatedReviews);
    }

    // Helper methods
    private boolean canReviewBooking(User reviewer, User tenant, User owner) {
        return reviewer.getId().equals(tenant.getId()) || reviewer.getId().equals(owner.getId());
    }

    private Optional<User> getCurrentUser() {
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth == null || !auth.isAuthenticated()) return Optional.empty();
            Object principal = auth.getPrincipal();
            if (principal instanceof org.springframework.security.core.userdetails.User userDetails) {
                String email = userDetails.getUsername();
                return userRepo.findByEmailAndEnabledTrue(email);
            }
            if (principal instanceof User u) return Optional.of(u);
            return Optional.empty();
        } catch (Exception e) { return Optional.empty(); }
    }
}
