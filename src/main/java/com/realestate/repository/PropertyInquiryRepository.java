package com.realestate.repository;

import com.realestate.entity.PropertyInquiry;
import com.realestate.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface PropertyInquiryRepository extends JpaRepository<PropertyInquiry, Long> {
    
    // Find inquiries by client (USER role)
    List<PropertyInquiry> findByClient_IdOrderByUpdatedAtDesc(Long clientId);
    
    // Find inquiries by owner (AGENT role)
    List<PropertyInquiry> findByOwner_IdOrderByUpdatedAtDesc(Long ownerId);
    
    // Find inquiries for a specific property
    List<PropertyInquiry> findByProperty_IdOrderByUpdatedAtDesc(Long propertyId);
    
    // Find active inquiries for a client
    List<PropertyInquiry> findByClient_IdAndStatusInOrderByUpdatedAtDesc(Long clientId, List<PropertyInquiry.InquiryStatus> statuses);
    
    // Find active inquiries for an owner
    List<PropertyInquiry> findByOwner_IdAndStatusInOrderByUpdatedAtDesc(Long ownerId, List<PropertyInquiry.InquiryStatus> statuses);
    
    // Check if there's an active inquiry between client and property
    @Query("SELECT pi FROM PropertyInquiry pi WHERE pi.client.id = :clientId AND pi.property.id = :propertyId AND pi.status IN ('ACTIVE', 'NEGOTIATING', 'AGREED')")
    Optional<PropertyInquiry> findActiveInquiryByClientAndProperty(@Param("clientId") Long clientId, @Param("propertyId") Long propertyId);
    
    // Find inquiry that involves a specific user (either as client or owner)
    @Query("SELECT pi FROM PropertyInquiry pi WHERE (pi.client.id = :userId OR pi.owner.id = :userId) AND pi.id = :inquiryId")
    Optional<PropertyInquiry> findByIdAndInvolvedUser(@Param("inquiryId") Long inquiryId, @Param("userId") Long userId);
    
    // Count active inquiries for a client
    @Query("SELECT COUNT(pi) FROM PropertyInquiry pi WHERE pi.client.id = :clientId AND pi.status IN ('ACTIVE', 'NEGOTIATING', 'AGREED')")
    Long countActiveInquiriesByClient(@Param("clientId") Long clientId);
    
    // Count active inquiries for an owner
    @Query("SELECT COUNT(pi) FROM PropertyInquiry pi WHERE pi.owner.id = :ownerId AND pi.status IN ('ACTIVE', 'NEGOTIATING', 'AGREED')")
    Long countActiveInquiriesByOwner(@Param("ownerId") Long ownerId);
    
    // Find inquiries created within a date range (for analytics)
    List<PropertyInquiry> findByCreatedAtBetween(LocalDateTime startDate, LocalDateTime endDate);
    
    // Find inquiries by status
    List<PropertyInquiry> findByStatusOrderByUpdatedAtDesc(PropertyInquiry.InquiryStatus status);
    
    // Find inquiries that need attention (no recent activity)
    @Query("SELECT pi FROM PropertyInquiry pi WHERE pi.status IN ('ACTIVE', 'NEGOTIATING') AND pi.updatedAt < :cutoffDate ORDER BY pi.updatedAt ASC")
    List<PropertyInquiry> findStaleInquiries(@Param("cutoffDate") LocalDateTime cutoffDate);
    
    // Admin queries - find all active inquiries
    @Query("SELECT pi FROM PropertyInquiry pi WHERE pi.status IN ('ACTIVE', 'NEGOTIATING', 'AGREED') ORDER BY pi.updatedAt DESC")
    List<PropertyInquiry> findAllActiveInquiries();
    
    // Find recent inquiries for admin dashboard
    @Query("SELECT pi FROM PropertyInquiry pi ORDER BY pi.createdAt DESC")
    List<PropertyInquiry> findRecentInquiries();
}
