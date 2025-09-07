package com.realestate.repository;

import com.realestate.entity.SaleNegotiation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SaleNegotiationRepository extends JpaRepository<SaleNegotiation, Long> {
    List<SaleNegotiation> findByInquiry_Id(Long inquiryId);
}
