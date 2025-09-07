package com.realestate.repository;

import com.realestate.entity.SaleInquiry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SaleInquiryRepository extends JpaRepository<SaleInquiry, Long> {

    List<SaleInquiry> findByCustomer_Id(Long customerId);

    List<SaleInquiry> findByOwner_Id(Long ownerId);

    List<SaleInquiry> findByProperty_Id(Long propertyId);

    @Query("SELECT si FROM SaleInquiry si WHERE si.customer.id = :userId AND si.status = com.realestate.entity.SaleInquiry$InquiryStatus.ACTIVE")
    List<SaleInquiry> findActiveByCustomer(@Param("userId") Long userId);

    @Query("SELECT si FROM SaleInquiry si WHERE si.owner.id = :ownerId AND si.status = com.realestate.entity.SaleInquiry$InquiryStatus.ACTIVE")
    List<SaleInquiry> findActiveByOwner(@Param("ownerId") Long ownerId);
}
