package com.realestate.controller;

import com.realestate.dto.AuthResponse;
import com.realestate.dto.LoginRequest;
import com.realestate.dto.RegisterRequest;
import com.realestate.entity.User;
import com.realestate.service.UserService;
import com.realestate.util.JwtUtil;
import com.realestate.service.OtpService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:5175", "http://127.0.0.1:5173", "http://127.0.0.1:5175", "https://real-estate-alpha-sandy.vercel.app"})
public class AuthController {
    
    @Autowired
    private AuthenticationManager authenticationManager;
    
    @Autowired
    private UserService userService;
    
    @Autowired
    private JwtUtil jwtUtil;
    
    @Autowired
    private OtpService otpService;
    
    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest loginRequest) {
        try {
            Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(loginRequest.getEmail(), loginRequest.getPassword())
            );
            
            UserDetails userDetails = (UserDetails) authentication.getPrincipal();
            String token = jwtUtil.generateToken(userDetails);
            
            User user = userService.findByEmail(loginRequest.getEmail()).orElseThrow();
            
            return ResponseEntity.ok(new AuthResponse(token, user));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Invalid email or password");
        }
    
    /**
     * Login with OTP: expects { email, otpCode }
     */
    @PostMapping("/login-otp")
    public ResponseEntity<?> loginWithOtp(@RequestBody java.util.Map<String, String> body) {
        String email = body.get("email");
        String otpCode = body.get("otpCode");
        if (email == null || otpCode == null || !otpCode.matches("\\d{6}")) {
            return ResponseEntity.badRequest().body("Email and 6-digit otpCode are required");
        }
        boolean ok = otpService.verifyOtp(email.trim().toLowerCase(), otpCode.trim());
        if (!ok) {
            return ResponseEntity.badRequest().body("Invalid or expired OTP");
        }
        User user = userService.findByEmail(email.trim().toLowerCase()).orElse(null);
        if (user == null) {
            return ResponseEntity.badRequest().body("User not found");
        }
        String token = jwtUtil.generateToken(user);
        return ResponseEntity.ok(new AuthResponse(token, user));
    }
    
    @PostMapping("/register")
    public ResponseEntity<?> register(@Valid @RequestBody RegisterRequest registerRequest) {
        try {
            if (userService.existsByEmail(registerRequest.getEmail())) {
                return ResponseEntity.badRequest().body("Email is already taken!");
            }
            
            User user = new User(
                registerRequest.getFirstName(),
                registerRequest.getLastName(),
                registerRequest.getEmail(),
                registerRequest.getPassword()
            );
            user.setPhoneNumber(registerRequest.getPhoneNumber());
            
            User savedUser = userService.createUser(user);
            String token = jwtUtil.generateToken(savedUser);
            
            return ResponseEntity.ok(new AuthResponse(token, savedUser));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error: " + e.getMessage());
        }
    }
    
    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUser(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.badRequest().body("User not authenticated");
        }
        
        String email = authentication.getName();
        User user = userService.findByEmail(email).orElseThrow();
        
        return ResponseEntity.ok(user);
    }
}
