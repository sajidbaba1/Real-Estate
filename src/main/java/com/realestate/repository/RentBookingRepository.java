package com.realestate.repository;

import com.realestate.entity.RentBooking;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface RentBookingRepository extends JpaRepository<RentBooking, Long> {
    
    List<RentBooking> findByTenant_Id(Long tenantId);
    
    List<RentBooking> findByOwner_Id(Long ownerId);
    
    List<RentBooking> findByProperty_Id(Long propertyId);
    
    List<RentBooking> findByStatus(RentBooking.BookingStatus status);
    
    // Check if property is available for rent in a date range
    @Query("SELECT rb FROM RentBooking rb WHERE rb.property.id = :propertyId " +
           "AND rb.status = com.realestate.entity.RentBooking$BookingStatus.ACTIVE " +
           "AND ((rb.endDate IS NULL) OR (rb.startDate <= :endDate AND rb.endDate >= :startDate))")
    List<RentBooking> findConflictingBookings(@Param("propertyId") Long propertyId, 
                                              @Param("startDate") LocalDate startDate, 
                                              @Param("endDate") LocalDate endDate);
    
    Optional<RentBooking> findByProperty_IdAndStatus(Long propertyId, RentBooking.BookingStatus status);
}
