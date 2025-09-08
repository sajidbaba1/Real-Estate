package com.realestate.repository;

import com.realestate.entity.RentBooking;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface RentBookingRepository extends JpaRepository<RentBooking, Long> {
    
    List<RentBooking> findByTenant_Id(Long tenantId);
    
    List<RentBooking> findByOwner_Id(Long ownerId);
    
    List<RentBooking> findByProperty_Id(Long propertyId);
    
    List<RentBooking> findByStatus(RentBooking.BookingStatus status);

    // Additional finders
    List<RentBooking> findByOwner_IdAndStatus(Long ownerId, RentBooking.BookingStatus status);
    
    long countByStatus(RentBooking.BookingStatus status);
    long countByOwner_IdAndStatus(Long ownerId, RentBooking.BookingStatus status);
    long countByProperty_Id(Long propertyId);
    long countByProperty_IdAndStatus(Long propertyId, RentBooking.BookingStatus status);

    // Created/approved/cancelled trends
    @Query("SELECT COUNT(rb) FROM RentBooking rb WHERE rb.createdAt BETWEEN :start AND :end")
    long countCreatedBetween(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    @Query("SELECT COUNT(rb) FROM RentBooking rb WHERE rb.approvalDate BETWEEN :start AND :end")
    long countApprovedBetween(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    @Query("SELECT COUNT(rb) FROM RentBooking rb WHERE rb.status = :status AND rb.updatedAt BETWEEN :start AND :end")
    long countByStatusAndUpdatedAtBetween(@Param("status") RentBooking.BookingStatus status,
                                          @Param("start") LocalDateTime start,
                                          @Param("end") LocalDateTime end);

    @Query("SELECT COUNT(rb) FROM RentBooking rb WHERE rb.owner.id = :ownerId AND rb.createdAt BETWEEN :start AND :end")
    long countByOwner_IdAndCreatedAtBetween(@Param("ownerId") Long ownerId,
                                            @Param("start") LocalDateTime start,
                                            @Param("end") LocalDateTime end);

    @Query("SELECT COUNT(rb) FROM RentBooking rb WHERE rb.owner.id = :ownerId AND rb.approvalDate BETWEEN :start AND :end")
    long countByOwner_IdAndApprovalDateBetween(@Param("ownerId") Long ownerId,
                                               @Param("start") LocalDateTime start,
                                               @Param("end") LocalDateTime end);

    @Query("SELECT COUNT(rb) FROM RentBooking rb WHERE rb.owner.id = :ownerId AND rb.status = :status AND rb.updatedAt BETWEEN :start AND :end")
    long countByOwner_IdAndStatusAndUpdatedAtBetween(@Param("ownerId") Long ownerId,
                                                     @Param("status") RentBooking.BookingStatus status,
                                                     @Param("start") LocalDateTime start,
                                                     @Param("end") LocalDateTime end);

    // Distinct active tenants
    @Query("SELECT COUNT(DISTINCT rb.tenant.id) FROM RentBooking rb WHERE rb.status = com.realestate.entity.RentBooking$BookingStatus.ACTIVE")
    long countDistinctActiveTenants();
    
    // Check if property is available for rent in a date range
    @Query("SELECT rb FROM RentBooking rb WHERE rb.property.id = :propertyId " +
           "AND rb.status = com.realestate.entity.RentBooking$BookingStatus.ACTIVE " +
           "AND ((rb.endDate IS NULL) OR (rb.startDate <= :endDate AND rb.endDate >= :startDate))")
    List<RentBooking> findConflictingBookings(@Param("propertyId") Long propertyId, 
                                              @Param("startDate") LocalDate startDate, 
                                              @Param("endDate") LocalDate endDate);
    
    Optional<RentBooking> findByProperty_IdAndStatus(Long propertyId, RentBooking.BookingStatus status);
}

