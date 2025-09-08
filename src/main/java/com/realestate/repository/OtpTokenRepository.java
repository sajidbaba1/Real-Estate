package com.realestate.repository;

import com.realestate.entity.OtpToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;

@Repository
public interface OtpTokenRepository extends JpaRepository<OtpToken, Long> {
    
    // Find the latest valid OTP for an email
    @Query("SELECT o FROM OtpToken o WHERE o.email = :email AND o.used = false AND o.expiresAt > :now ORDER BY o.createdAt DESC")
    Optional<OtpToken> findLatestValidOtpByEmail(@Param("email") String email, @Param("now") LocalDateTime now);
    
    // Find OTP by email and code
    Optional<OtpToken> findByEmailAndOtpCodeAndUsedFalse(String email, String otpCode);
    
    // Delete expired OTPs (cleanup)
    @Modifying
    @Transactional
    @Query("DELETE FROM OtpToken o WHERE o.expiresAt < :now")
    void deleteExpiredOtps(@Param("now") LocalDateTime now);
    
    // Delete all OTPs for an email (when user successfully logs in)
    @Modifying
    @Transactional
    void deleteByEmail(String email);
    
    // Count active OTPs for an email (rate limiting)
    @Query("SELECT COUNT(o) FROM OtpToken o WHERE o.email = :email AND o.createdAt > :since")
    long countOtpsByEmailSince(@Param("email") String email, @Param("since") LocalDateTime since);
}
