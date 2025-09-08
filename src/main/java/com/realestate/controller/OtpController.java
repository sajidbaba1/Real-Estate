package com.realestate.controller;

import com.realestate.service.OtpService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth/otp")
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:5175", "https://real-estate-alpha-sandy.vercel.app"})
public class OtpController {
    
    @Autowired
    private OtpService otpService;
    
    /**
     * Send OTP to user's email
     */
    @PostMapping("/send")
    public ResponseEntity<Map<String, Object>> sendOtp(@RequestBody Map<String, String> request) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            String email = request.get("email");
            
            if (email == null || email.trim().isEmpty()) {
                response.put("success", false);
                response.put("message", "Email is required");
                return ResponseEntity.badRequest().body(response);
            }
            
            // Validate email format
            if (!isValidEmail(email)) {
                response.put("success", false);
                response.put("message", "Invalid email format");
                return ResponseEntity.badRequest().body(response);
            }
            
            boolean sent = otpService.sendOtp(email.trim().toLowerCase());
            
            if (sent) {
                response.put("success", true);
                response.put("message", "OTP sent successfully to your email");
                response.put("expiryMinutes", 10);
            } else {
                response.put("success", false);
                response.put("message", "Failed to send OTP");
            }
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }
    
    /**
     * Verify OTP code
     */
    @PostMapping("/verify")
    public ResponseEntity<Map<String, Object>> verifyOtp(@RequestBody Map<String, String> request) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            String email = request.get("email");
            String otpCode = request.get("otpCode");
            
            if (email == null || email.trim().isEmpty()) {
                response.put("success", false);
                response.put("message", "Email is required");
                return ResponseEntity.badRequest().body(response);
            }
            
            if (otpCode == null || otpCode.trim().isEmpty()) {
                response.put("success", false);
                response.put("message", "OTP code is required");
                return ResponseEntity.badRequest().body(response);
            }
            
            // Validate OTP format (6 digits)
            if (!otpCode.matches("\\d{6}")) {
                response.put("success", false);
                response.put("message", "OTP must be 6 digits");
                return ResponseEntity.badRequest().body(response);
            }
            
            boolean verified = otpService.verifyOtp(email.trim().toLowerCase(), otpCode.trim());
            
            if (verified) {
                response.put("success", true);
                response.put("message", "OTP verified successfully");
            } else {
                response.put("success", false);
                response.put("message", "Invalid or expired OTP");
            }
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "OTP verification failed: " + e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }
    
    /**
     * Check OTP status for an email
     */
    @GetMapping("/status")
    public ResponseEntity<Map<String, Object>> getOtpStatus(@RequestParam String email) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            if (email == null || email.trim().isEmpty()) {
                response.put("success", false);
                response.put("message", "Email is required");
                return ResponseEntity.badRequest().body(response);
            }
            
            boolean hasValidOtp = otpService.hasValidOtp(email.trim().toLowerCase());
            long remainingMinutes = otpService.getRemainingTimeMinutes(email.trim().toLowerCase());
            
            response.put("success", true);
            response.put("hasValidOtp", hasValidOtp);
            response.put("remainingMinutes", remainingMinutes);
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Failed to get OTP status: " + e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }
    
    /**
     * Simple email validation
     */
    private boolean isValidEmail(String email) {
        return email != null && email.matches("^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$");
    }
}
