package com.realestate.controller;

import com.realestate.entity.Property;
import com.realestate.entity.User;
import com.realestate.service.FavoriteService;
import com.realestate.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/users")
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:5175", "https://real-estate-alpha-sandy.vercel.app"})
public class UserController {
    
    @Autowired
    private UserService userService;
    
    @Autowired
    private FavoriteService favoriteService;
    
    @GetMapping("/profile")
    public ResponseEntity<?> getUserProfile(@AuthenticationPrincipal UserDetails userDetails) {
        try {
            User user = userService.findByEmail(userDetails.getUsername())
                    .orElseThrow(() -> new RuntimeException("User not found"));
            
            // Remove password from response
            user.setPassword(null);
            
            return ResponseEntity.ok(user);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error fetching user profile: " + e.getMessage());
        }
    }
    
    @PutMapping("/profile")
    public ResponseEntity<?> updateUserProfile(@AuthenticationPrincipal UserDetails userDetails, 
                                               @RequestBody User updatedUser) {
        try {
            User currentUser = userService.findByEmail(userDetails.getUsername())
                    .orElseThrow(() -> new RuntimeException("User not found"));
            
            User user = userService.updateUser(currentUser.getId(), updatedUser);
            
            // Remove password from response
            user.setPassword(null);
            
            return ResponseEntity.ok(user);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error updating user profile: " + e.getMessage());
        }
    }
    
    @GetMapping("/favorites")
    public ResponseEntity<?> getUserFavorites(@AuthenticationPrincipal UserDetails userDetails) {
        try {
            User user = userService.findByEmail(userDetails.getUsername())
                    .orElseThrow(() -> new RuntimeException("User not found"));
            
            List<Property> favorites = favoriteService.getUserFavorites(user);
            
            return ResponseEntity.ok(favorites);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error fetching favorites: " + e.getMessage());
        }
    }
    
    @PostMapping("/favorites/{propertyId}")
    public ResponseEntity<?> addToFavorites(@AuthenticationPrincipal UserDetails userDetails,
                                            @PathVariable Long propertyId) {
        try {
            User user = userService.findByEmail(userDetails.getUsername())
                    .orElseThrow(() -> new RuntimeException("User not found"));
            
            favoriteService.addToFavorites(user, propertyId);
            
            return ResponseEntity.ok(Map.of("message", "Property added to favorites"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error adding to favorites: " + e.getMessage());
        }
    }
    
    @DeleteMapping("/favorites/{propertyId}")
    public ResponseEntity<?> removeFromFavorites(@AuthenticationPrincipal UserDetails userDetails,
                                                 @PathVariable Long propertyId) {
        try {
            User user = userService.findByEmail(userDetails.getUsername())
                    .orElseThrow(() -> new RuntimeException("User not found"));
            
            favoriteService.removeFromFavorites(user, propertyId);
            
            return ResponseEntity.ok(Map.of("message", "Property removed from favorites"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error removing from favorites: " + e.getMessage());
        }
    }
    
    @GetMapping("/favorites/{propertyId}/check")
    public ResponseEntity<?> checkIfFavorite(@AuthenticationPrincipal UserDetails userDetails,
                                             @PathVariable Long propertyId) {
        try {
            User user = userService.findByEmail(userDetails.getUsername())
                    .orElseThrow(() -> new RuntimeException("User not found"));
            
            boolean isFavorite = favoriteService.isPropertyFavorited(user, propertyId);
            
            return ResponseEntity.ok(Map.of("isFavorite", isFavorite));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error checking favorite status: " + e.getMessage());
        }
    }
    
    @GetMapping("/stats")
    public ResponseEntity<?> getUserStats(@AuthenticationPrincipal UserDetails userDetails) {
        try {
            User user = userService.findByEmail(userDetails.getUsername())
                    .orElseThrow(() -> new RuntimeException("User not found"));
            
            long favoritesCount = favoriteService.getFavoritesCount(user);
            
            Map<String, Object> stats = Map.of(
                "favoritesCount", favoritesCount,
                "memberSince", user.getCreatedAt()
            );
            
            return ResponseEntity.ok(stats);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error fetching user stats: " + e.getMessage());
        }
    }
}
