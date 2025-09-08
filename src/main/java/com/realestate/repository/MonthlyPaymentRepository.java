package com.realestate.repository;

import com.realestate.entity.MonthlyPayment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface MonthlyPaymentRepository extends JpaRepository<MonthlyPayment, Long> {
    
    List<MonthlyPayment> findByRentBooking_Id(Long rentBookingId);
    
    List<MonthlyPayment> findByPgBooking_Id(Long pgBookingId);
    
    List<MonthlyPayment> findByStatus(MonthlyPayment.PaymentStatus status);
    
    @Query("SELECT mp FROM MonthlyPayment mp WHERE mp.dueDate <= :date AND mp.status = com.realestate.entity.MonthlyPayment$PaymentStatus.PENDING")
    List<MonthlyPayment> findOverduePayments(@Param("date") LocalDate date);
    
    @Query("SELECT mp FROM MonthlyPayment mp WHERE " +
           "(mp.rentBooking.tenant.id = :tenantId OR mp.pgBooking.tenant.id = :tenantId) " +
           "AND mp.status = :status")
    List<MonthlyPayment> findByTenantAndStatus(@Param("tenantId") Long tenantId, 
                                               @Param("status") MonthlyPayment.PaymentStatus status);
    
    @Query("SELECT mp FROM MonthlyPayment mp WHERE " +
           "(mp.rentBooking.owner.id = :ownerId OR mp.pgBooking.owner.id = :ownerId) " +
           "AND mp.status = :status")
    List<MonthlyPayment> findByOwnerAndStatus(@Param("ownerId") Long ownerId, 
                                              @Param("status") MonthlyPayment.PaymentStatus status);

    // Additional finders used by services/controllers
    @Query("SELECT mp FROM MonthlyPayment mp WHERE " +
           "(mp.rentBooking.tenant.id = :tenantId OR mp.pgBooking.tenant.id = :tenantId) " +
           "AND mp.status = com.realestate.entity.MonthlyPayment$PaymentStatus.PENDING")
    List<MonthlyPayment> findPendingPaymentsByTenant(@Param("tenantId") Long tenantId);

    @Query("SELECT mp FROM MonthlyPayment mp WHERE " +
           "(mp.rentBooking.tenant.id = :tenantId OR mp.pgBooking.tenant.id = :tenantId) " +
           "AND ((mp.status = com.realestate.entity.MonthlyPayment$PaymentStatus.PENDING AND mp.dueDate < :date) " +
           "OR mp.status = com.realestate.entity.MonthlyPayment$PaymentStatus.OVERDUE)")
    List<MonthlyPayment> findOverduePaymentsByTenant(@Param("tenantId") Long tenantId, @Param("date") LocalDate date);

    @Query("SELECT mp FROM MonthlyPayment mp WHERE mp.status = com.realestate.entity.MonthlyPayment$PaymentStatus.PENDING AND mp.dueDate <= :reminderDate")
    List<MonthlyPayment> findUpcomingDuePayments(@Param("reminderDate") LocalDate reminderDate);

    // Counts for analytics
    long countByStatus(MonthlyPayment.PaymentStatus status);

    @Query("SELECT COUNT(mp) FROM MonthlyPayment mp WHERE mp.dueDate < :date AND mp.status <> com.realestate.entity.MonthlyPayment$PaymentStatus.PAID")
    long countOverduePayments(@Param("date") LocalDate date);

    @Query("SELECT COUNT(mp) FROM MonthlyPayment mp WHERE (mp.rentBooking.owner.id = :ownerId OR mp.pgBooking.owner.id = :ownerId) " +
           "AND mp.dueDate < :date AND mp.status <> com.realestate.entity.MonthlyPayment$PaymentStatus.PAID")
    long countOverduePaymentsByOwner(@Param("ownerId") Long ownerId, @Param("date") LocalDate date);

    @Query("SELECT COUNT(mp) FROM MonthlyPayment mp WHERE (mp.rentBooking.owner.id = :ownerId OR mp.pgBooking.owner.id = :ownerId) AND mp.status = com.realestate.entity.MonthlyPayment$PaymentStatus.PENDING")
    long countPendingByOwner(@Param("ownerId") Long ownerId);

    @Query("SELECT COUNT(mp) FROM MonthlyPayment mp WHERE (mp.rentBooking.owner.id = :ownerId OR mp.pgBooking.owner.id = :ownerId) AND mp.status = com.realestate.entity.MonthlyPayment$PaymentStatus.OVERDUE")
    long countOverdueByOwner(@Param("ownerId") Long ownerId);

    @Query("SELECT COUNT(mp) FROM MonthlyPayment mp WHERE (mp.rentBooking.owner.id = :ownerId OR mp.pgBooking.owner.id = :ownerId) AND mp.status = com.realestate.entity.MonthlyPayment$PaymentStatus.PAID")
    long countPaidByOwner(@Param("ownerId") Long ownerId);

    // Sums for analytics
    @Query("SELECT COALESCE(SUM(mp.amount), 0) FROM MonthlyPayment mp WHERE mp.status = com.realestate.entity.MonthlyPayment$PaymentStatus.PENDING")
    java.math.BigDecimal sumPendingAmount();

    @Query("SELECT COALESCE(SUM(mp.amount + COALESCE(mp.lateFee, 0)), 0) FROM MonthlyPayment mp WHERE mp.status = com.realestate.entity.MonthlyPayment$PaymentStatus.OVERDUE")
    java.math.BigDecimal sumOverdueAmount();

    @Query("SELECT COALESCE(SUM(mp.amount), 0) FROM MonthlyPayment mp WHERE (mp.rentBooking.owner.id = :ownerId OR mp.pgBooking.owner.id = :ownerId) AND mp.status = com.realestate.entity.MonthlyPayment$PaymentStatus.PENDING")
    java.math.BigDecimal sumPendingAmountByOwner(@Param("ownerId") Long ownerId);

    @Query("SELECT COALESCE(SUM(mp.amount + COALESCE(mp.lateFee, 0)), 0) FROM MonthlyPayment mp WHERE (mp.rentBooking.owner.id = :ownerId OR mp.pgBooking.owner.id = :ownerId) AND mp.status = com.realestate.entity.MonthlyPayment$PaymentStatus.OVERDUE")
    java.math.BigDecimal sumOverdueAmountByOwner(@Param("ownerId") Long ownerId);

    // Revenue = PAID payments amount + lateFee within date range
    @Query("SELECT COALESCE(SUM(mp.amount + COALESCE(mp.lateFee, 0)), 0) FROM MonthlyPayment mp WHERE mp.status = com.realestate.entity.MonthlyPayment$PaymentStatus.PAID AND mp.paidDate BETWEEN :start AND :end")
    java.math.BigDecimal sumRevenueBetween(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    @Query("SELECT COALESCE(SUM(mp.amount + COALESCE(mp.lateFee, 0)), 0) FROM MonthlyPayment mp WHERE mp.status = com.realestate.entity.MonthlyPayment$PaymentStatus.PAID AND mp.paidDate BETWEEN :start AND :end " +
           "AND (mp.rentBooking.owner.id = :ownerId OR mp.pgBooking.owner.id = :ownerId)")
    java.math.BigDecimal sumRevenueBetweenForOwner(@Param("ownerId") Long ownerId, @Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    @Query("SELECT COALESCE(SUM(mp.amount + COALESCE(mp.lateFee, 0)), 0) FROM MonthlyPayment mp WHERE mp.status = com.realestate.entity.MonthlyPayment$PaymentStatus.PAID AND mp.paidDate BETWEEN :start AND :end " +
           "AND ((mp.rentBooking.property.id = :propertyId) OR (mp.pgBooking.bed.room.property.id = :propertyId))")
    java.math.BigDecimal sumRevenueBetweenForProperty(@Param("propertyId") Long propertyId, @Param("start") LocalDateTime start, @Param("end") LocalDateTime end);
}

