package com.realestate.controller;

import com.realestate.entity.BookingNotification;
import com.realestate.entity.User;
import com.realestate.repository.UserRepository;
import com.realestate.service.BookingNotificationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/booking-notifications")
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:5175", "https://real-estate-alpha-sandy.vercel.app"})
public class BookingNotificationController {

    @Autowired private BookingNotificationService notificationService;
    @Autowired private UserRepository userRepository;

    // Get unread notification count
    @GetMapping("/unread-count")
    @PreAuthorize("hasAnyRole('USER','ADMIN','AGENT')")
    public ResponseEntity<?> getUnreadCount() {
        Optional<User> userOpt = getCurrentUser();
        if (userOpt.isEmpty()) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        
        Long count = notificationService.countUnreadNotifications(userOpt.get().getId());
        Map<String, Object> response = new HashMap<>();
        response.put("unreadCount", count);
        return ResponseEntity.ok(response);
    }

    // Get all notifications for current user
    @GetMapping
    @PreAuthorize("hasAnyRole('USER','ADMIN','AGENT')")
    public ResponseEntity<?> getAllNotifications(@RequestParam(defaultValue = "0") int page,
                                               @RequestParam(defaultValue = "20") int size) {
        Optional<User> userOpt = getCurrentUser();
        if (userOpt.isEmpty()) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        
        List<BookingNotification> notifications = notificationService.getAllNotifications(userOpt.get().getId());
        
        // Manual pagination for simplicity
        int start = page * size;
        int end = Math.min(start + size, notifications.size());
        List<BookingNotification> pageContent = notifications.subList(start, end);
        
        Map<String, Object> response = new HashMap<>();
        response.put("notifications", pageContent);
        response.put("totalElements", notifications.size());
        response.put("totalPages", (int) Math.ceil((double) notifications.size() / size));
        response.put("currentPage", page);
        response.put("pageSize", size);
        
        return ResponseEntity.ok(response);
    }

    // Get unread notifications
    @GetMapping("/unread")
    @PreAuthorize("hasAnyRole('USER','ADMIN','AGENT')")
    public ResponseEntity<?> getUnreadNotifications() {
        Optional<User> userOpt = getCurrentUser();
        if (userOpt.isEmpty()) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        
        List<BookingNotification> notifications = notificationService.getUnreadNotifications(userOpt.get().getId());
        return ResponseEntity.ok(notifications);
    }

    // Mark specific notification as read
    @PatchMapping("/{notificationId}/read")
    @PreAuthorize("hasAnyRole('USER','ADMIN','AGENT')")
    public ResponseEntity<?> markAsRead(@PathVariable Long notificationId) {
        Optional<User> userOpt = getCurrentUser();
        if (userOpt.isEmpty()) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        
        notificationService.markAsRead(notificationId, userOpt.get().getId());
        
        Map<String, Object> response = new HashMap<>();
        response.put("status", "success");
        response.put("message", "Notification marked as read");
        return ResponseEntity.ok(response);
    }

    // Mark all notifications as read
    @PatchMapping("/mark-all-read")
    @PreAuthorize("hasAnyRole('USER','ADMIN','AGENT')")
    public ResponseEntity<?> markAllAsRead() {
        Optional<User> userOpt = getCurrentUser();
        if (userOpt.isEmpty()) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        
        notificationService.markAllAsRead(userOpt.get().getId());
        
        Map<String, Object> response = new HashMap<>();
        response.put("status", "success");
        response.put("message", "All notifications marked as read");
        return ResponseEntity.ok(response);
    }

    // Get notifications by type
    @GetMapping("/type/{type}")
    @PreAuthorize("hasAnyRole('USER','ADMIN','AGENT')")
    public ResponseEntity<?> getNotificationsByType(@PathVariable BookingNotification.NotificationType type,
                                                  @RequestParam(defaultValue = "0") int page,
                                                  @RequestParam(defaultValue = "10") int size) {
        Optional<User> userOpt = getCurrentUser();
        if (userOpt.isEmpty()) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        
        // For simplicity, filter from all notifications
        List<BookingNotification> allNotifications = notificationService.getAllNotifications(userOpt.get().getId());
        List<BookingNotification> filteredNotifications = allNotifications.stream()
            .filter(notification -> notification.getType() == type)
            .toList();
        
        // Manual pagination
        int start = page * size;
        int end = Math.min(start + size, filteredNotifications.size());
        List<BookingNotification> pageContent = filteredNotifications.subList(start, end);
        
        Map<String, Object> response = new HashMap<>();
        response.put("notifications", pageContent);
        response.put("totalElements", filteredNotifications.size());
        response.put("totalPages", (int) Math.ceil((double) filteredNotifications.size() / size));
        response.put("type", type);
        
        return ResponseEntity.ok(response);
    }

    // Get notifications by priority
    @GetMapping("/priority/{priority}")
    @PreAuthorize("hasAnyRole('USER','ADMIN','AGENT')")
    public ResponseEntity<?> getNotificationsByPriority(@PathVariable BookingNotification.NotificationPriority priority,
                                                       @RequestParam(defaultValue = "0") int page,
                                                       @RequestParam(defaultValue = "10") int size) {
        Optional<User> userOpt = getCurrentUser();
        if (userOpt.isEmpty()) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        
        // Filter from all notifications
        List<BookingNotification> allNotifications = notificationService.getAllNotifications(userOpt.get().getId());
        List<BookingNotification> filteredNotifications = allNotifications.stream()
            .filter(notification -> notification.getPriority() == priority)
            .toList();
        
        // Manual pagination
        int start = page * size;
        int end = Math.min(start + size, filteredNotifications.size());
        List<BookingNotification> pageContent = filteredNotifications.subList(start, end);
        
        Map<String, Object> response = new HashMap<>();
        response.put("notifications", pageContent);
        response.put("totalElements", filteredNotifications.size());
        response.put("totalPages", (int) Math.ceil((double) filteredNotifications.size() / size));
        response.put("priority", priority);
        
        return ResponseEntity.ok(response);
    }

    // Get notification summary/statistics
    @GetMapping("/summary")
    @PreAuthorize("hasAnyRole('USER','ADMIN','AGENT')")
    public ResponseEntity<?> getNotificationSummary() {
        Optional<User> userOpt = getCurrentUser();
        if (userOpt.isEmpty()) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        
        List<BookingNotification> allNotifications = notificationService.getAllNotifications(userOpt.get().getId());
        Long unreadCount = notificationService.countUnreadNotifications(userOpt.get().getId());
        
        // Count by type
        Map<BookingNotification.NotificationType, Long> typeCount = new HashMap<>();
        Map<BookingNotification.NotificationPriority, Long> priorityCount = new HashMap<>();
        
        for (BookingNotification notification : allNotifications) {
            typeCount.merge(notification.getType(), 1L, Long::sum);
            priorityCount.merge(notification.getPriority(), 1L, Long::sum);
        }
        
        Map<String, Object> response = new HashMap<>();
        response.put("totalNotifications", allNotifications.size());
        response.put("unreadNotifications", unreadCount);
        response.put("notificationsByType", typeCount);
        response.put("notificationsByPriority", priorityCount);
        
        return ResponseEntity.ok(response);
    }

    private Optional<User> getCurrentUser() {
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth == null || !auth.isAuthenticated()) return Optional.empty();
            Object principal = auth.getPrincipal();
            if (principal instanceof org.springframework.security.core.userdetails.User userDetails) {
                String email = userDetails.getUsername();
                return userRepository.findByEmailAndEnabledTrue(email);
            }
            if (principal instanceof User u) return Optional.of(u);
            return Optional.empty();
        } catch (Exception e) { return Optional.empty(); }
    }
}
