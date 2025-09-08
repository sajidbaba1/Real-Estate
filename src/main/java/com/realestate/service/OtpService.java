package com.realestate.service;

import com.realestate.entity.OtpToken;
import com.realestate.entity.User;
import com.realestate.repository.OtpTokenRepository;
import com.realestate.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Optional;

@Service
@Transactional
public class OtpService {
    
    @Autowired
    private OtpTokenRepository otpTokenRepository;
    
    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private JavaMailSender mailSender;
    
    private static final int OTP_LENGTH = 6;
    private static final int OTP_EXPIRY_MINUTES = 10;
    private static final int MAX_OTP_ATTEMPTS = 3;
    private static final int RATE_LIMIT_MINUTES = 5;
    private static final int MAX_OTPS_PER_PERIOD = 3;
    
    private final SecureRandom random = new SecureRandom();
    
    /**
     * Generate and send OTP to user's email
     */
    public boolean sendOtp(String email) {
        try {
            // Check if user exists
            Optional<User> userOpt = userRepository.findByEmail(email);
            if (userOpt.isEmpty()) {
                throw new RuntimeException("User not found with email: " + email);
            }
            
            // Rate limiting - check if user has requested too many OTPs recently
            LocalDateTime rateLimitTime = LocalDateTime.now().minusMinutes(RATE_LIMIT_MINUTES);
            long recentOtpCount = otpTokenRepository.countOtpsByEmailSince(email, rateLimitTime);
            
            if (recentOtpCount >= MAX_OTPS_PER_PERIOD) {
                throw new RuntimeException("Too many OTP requests. Please wait " + RATE_LIMIT_MINUTES + " minutes before requesting again.");
            }
            
            // Generate OTP
            String otpCode = generateOtp();
            LocalDateTime expiresAt = LocalDateTime.now().plusMinutes(OTP_EXPIRY_MINUTES);
            
            // Save OTP to database
            OtpToken otpToken = new OtpToken(email, otpCode, expiresAt);
            otpTokenRepository.save(otpToken);
            
            // Send email
            sendOtpEmail(email, otpCode, userOpt.get().getName());
            
            // Clean up expired OTPs
            cleanupExpiredOtps();
            
            return true;
            
        } catch (Exception e) {
            System.err.println("Error sending OTP: " + e.getMessage());
            throw new RuntimeException("Failed to send OTP: " + e.getMessage());
        }
    }
    
    /**
     * Verify OTP code
     */
    public boolean verifyOtp(String email, String otpCode) {
        try {
            // Find the OTP
            Optional<OtpToken> otpTokenOpt = otpTokenRepository.findByEmailAndOtpCodeAndUsedFalse(email, otpCode);
            
            if (otpTokenOpt.isEmpty()) {
                return false;
            }
            
            OtpToken otpToken = otpTokenOpt.get();
            
            // Check if OTP is still valid
            if (!otpToken.isValid()) {
                return false;
            }
            
            // Increment attempts
            otpToken.incrementAttempts();
            
            // Check if OTP code matches
            if (!otpToken.getOtpCode().equals(otpCode)) {
                otpTokenRepository.save(otpToken);
                return false;
            }
            
            // Mark OTP as used
            otpToken.setUsed(true);
            otpTokenRepository.save(otpToken);
            
            // Clean up all OTPs for this email
            otpTokenRepository.deleteByEmail(email);
            
            return true;
            
        } catch (Exception e) {
            System.err.println("Error verifying OTP: " + e.getMessage());
            return false;
        }
    }
    
    /**
     * Check if user has a valid OTP
     */
    public boolean hasValidOtp(String email) {
        Optional<OtpToken> otpToken = otpTokenRepository.findLatestValidOtpByEmail(email, LocalDateTime.now());
        return otpToken.isPresent() && otpToken.get().isValid();
    }
    
    /**
     * Generate random 6-digit OTP
     */
    private String generateOtp() {
        StringBuilder otp = new StringBuilder();
        for (int i = 0; i < OTP_LENGTH; i++) {
            otp.append(random.nextInt(10));
        }
        return otp.toString();
    }
    
    /**
     * Send OTP email
     */
    private void sendOtpEmail(String email, String otpCode, String userName) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setTo(email);
            message.setSubject("Your Real Estate Login OTP");
            message.setText(buildOtpEmailContent(userName, otpCode));
            message.setFrom("ss2727303@gmail.com");
            
            mailSender.send(message);
            
        } catch (Exception e) {
            System.err.println("Error sending email: " + e.getMessage());
            throw new RuntimeException("Failed to send OTP email: " + e.getMessage());
        }
    }
    
    /**
     * Build OTP email content
     */
    private String buildOtpEmailContent(String userName, String otpCode) {
        return String.format(
            "Dear %s,\n\n" +
            "Your One-Time Password (OTP) for Real Estate login is: %s\n\n" +
            "This OTP is valid for %d minutes only.\n\n" +
            "If you didn't request this OTP, please ignore this email.\n\n" +
            "Best regards,\n" +
            "Real Estate Team",
            userName, otpCode, OTP_EXPIRY_MINUTES
        );
    }
    
    /**
     * Clean up expired OTPs
     */
    public void cleanupExpiredOtps() {
        try {
            otpTokenRepository.deleteExpiredOtps(LocalDateTime.now());
        } catch (Exception e) {
            System.err.println("Error cleaning up expired OTPs: " + e.getMessage());
        }
    }
    
    /**
     * Get remaining time for OTP expiry
     */
    public long getRemainingTimeMinutes(String email) {
        Optional<OtpToken> otpToken = otpTokenRepository.findLatestValidOtpByEmail(email, LocalDateTime.now());
        if (otpToken.isPresent()) {
            LocalDateTime now = LocalDateTime.now();
            LocalDateTime expiresAt = otpToken.get().getExpiresAt();
            if (expiresAt.isAfter(now)) {
                return java.time.Duration.between(now, expiresAt).toMinutes();
            }
        }
        return 0;
    }
}
