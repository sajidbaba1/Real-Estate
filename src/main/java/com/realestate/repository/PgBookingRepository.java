package com.realestate.repository;

import com.realestate.entity.PgBooking;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface PgBookingRepository extends JpaRepository<PgBooking, Long> {
    
    List<PgBooking> findByTenant_Id(Long tenantId);
    
    List<PgBooking> findByOwner_Id(Long ownerId);
    
    List<PgBooking> findByBed_Id(Long bedId);
    
    List<PgBooking> findByStatus(PgBooking.BookingStatus status);

    // Additional finders
    List<PgBooking> findByOwner_IdAndStatus(Long ownerId, PgBooking.BookingStatus status);
    
    long countByStatus(PgBooking.BookingStatus status);
    long countByOwner_IdAndStatus(Long ownerId, PgBooking.BookingStatus status);

    // Created/approved/cancelled trends
    @Query("SELECT COUNT(pb) FROM PgBooking pb WHERE pb.createdAt BETWEEN :start AND :end")
    long countCreatedBetween(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    @Query("SELECT COUNT(pb) FROM PgBooking pb WHERE pb.approvalDate BETWEEN :start AND :end")
    long countApprovedBetween(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    @Query("SELECT COUNT(pb) FROM PgBooking pb WHERE pb.status = :status AND pb.updatedAt BETWEEN :start AND :end")
    long countByStatusAndUpdatedAtBetween(@Param("status") PgBooking.BookingStatus status,
                                          @Param("start") LocalDateTime start,
                                          @Param("end") LocalDateTime end);

    @Query("SELECT COUNT(pb) FROM PgBooking pb WHERE pb.owner.id = :ownerId AND pb.createdAt BETWEEN :start AND :end")
    long countByOwner_IdAndCreatedAtBetween(@Param("ownerId") Long ownerId,
                                            @Param("start") LocalDateTime start,
                                            @Param("end") LocalDateTime end);

    @Query("SELECT COUNT(pb) FROM PgBooking pb WHERE pb.owner.id = :ownerId AND pb.approvalDate BETWEEN :start AND :end")
    long countByOwner_IdAndApprovalDateBetween(@Param("ownerId") Long ownerId,
                                               @Param("start") LocalDateTime start,
                                               @Param("end") LocalDateTime end);

    @Query("SELECT COUNT(pb) FROM PgBooking pb WHERE pb.owner.id = :ownerId AND pb.status = :status AND pb.updatedAt BETWEEN :start AND :end")
    long countByOwner_IdAndStatusAndUpdatedAtBetween(@Param("ownerId") Long ownerId,
                                                     @Param("status") PgBooking.BookingStatus status,
                                                     @Param("start") LocalDateTime start,
                                                     @Param("end") LocalDateTime end);
    
    // Check if bed is available for booking in a date range
    @Query("SELECT pb FROM PgBooking pb WHERE pb.bed.id = :bedId " +
           "AND pb.status = com.realestate.entity.PgBooking$BookingStatus.ACTIVE " +
           "AND ((pb.endDate IS NULL) OR (pb.startDate <= :endDate AND pb.endDate >= :startDate))")
    List<PgBooking> findConflictingBedBookings(@Param("bedId") Long bedId, 
                                               @Param("startDate") LocalDate startDate, 
                                               @Param("endDate") LocalDate endDate);
    
    Optional<PgBooking> findByBed_IdAndStatus(Long bedId, PgBooking.BookingStatus status);
    
    @Query("SELECT pb FROM PgBooking pb WHERE pb.bed.room.property.id = :propertyId")
    List<PgBooking> findByProperty_Id(@Param("propertyId") Long propertyId);

    // Distinct active tenants
    @Query("SELECT COUNT(DISTINCT pb.tenant.id) FROM PgBooking pb WHERE pb.status = com.realestate.entity.PgBooking$BookingStatus.ACTIVE")
    long countDistinctActiveTenants();
}

