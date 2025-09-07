package com.realestate.repository;

import com.realestate.entity.MonthlyPayment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
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
}
