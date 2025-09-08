package com.realestate.controller;

import com.realestate.dto.SendMessageRequest;
import com.realestate.entity.*;
import com.realestate.repository.*;
import com.realestate.service.AnalyticsBroadcaster;
import com.realestate.service.UserService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/inquiries")
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:5175", "http://localhost:8888", "https://real-estate-alpha-sandy.vercel.app"})
public class PropertyInquiryController {

    @Autowired private PropertyInquiryRepository inquiryRepo;
    @Autowired private ChatMessageRepository messageRepo;
    @Autowired private PropertyRepository propertyRepo;
    @Autowired private UserRepository userRepo;
    @Autowired private NotificationRepository notificationRepo;
    @Autowired private SimpMessagingTemplate messagingTemplate; // For WebSocket messaging
    @Autowired(required = false) private AnalyticsBroadcaster analyticsBroadcaster;

    // DTOs
    // ---- Lightweight DTOs to ensure stable JSON serialization ----
    public static class UserDto {
        public Long id;
        public String firstName;
        public String lastName;
        public String email;
    }

    public static class PropertyDto {
        public Long id;
        public String title;
        public String imageUrl;
        public String address;
        public String city;
        public String state;
        public java.math.BigDecimal price;
    }

    public static class ChatMessageDto {
        public Long id;
        public String content;
        public String messageType;
        public java.math.BigDecimal priceAmount;
        public java.time.LocalDateTime sentAt;
        public boolean isRead;
        public UserDto sender;
    }

    public static class InquiryDto {
        public Long id;
        public String status;
        public java.math.BigDecimal agreedPrice;
        public java.math.BigDecimal offeredPrice;
        public java.time.LocalDateTime createdAt;
        public java.time.LocalDateTime updatedAt;
        public PropertyDto property;
        public UserDto client;
        public UserDto owner;
    }
    public static class CreateInquiryRequest {
        public Long propertyId;
        public String message;
        public BigDecimal offeredPrice;
        
        // Getters and setters
        public Long getPropertyId() { return propertyId; }
        public void setPropertyId(Long propertyId) { this.propertyId = propertyId; }
        public String getMessage() { return message; }
        public void setMessage(String message) { this.message = message; }
        public BigDecimal getOfferedPrice() { return offeredPrice; }
        public void setOfferedPrice(BigDecimal offeredPrice) { this.offeredPrice = offeredPrice; }
    }

    // Using external DTO: com.realestate.dto.SendMessageRequest

    // Create new inquiry
    @PostMapping
    @PreAuthorize("hasAnyRole('USER','ADMIN')")
    public ResponseEntity<?> createInquiry(@Valid @RequestBody CreateInquiryRequest request) {
        Optional<User> currentUserOpt = getCurrentUser();
        if (currentUserOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("User not found");
        }
        User client = currentUserOpt.get();

        // Find the property
        Optional<Property> propertyOpt = propertyRepo.findById(request.getPropertyId());
        if (propertyOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Property not found");
        }
        Property property = propertyOpt.get();

        if (property.getOwner() == null) {
            return ResponseEntity.badRequest().body("Property has no assigned owner");
        }

        // Check if there's already an active inquiry
        Optional<PropertyInquiry> existingInquiry = inquiryRepo.findActiveInquiryByClientAndProperty(
            client.getId(), property.getId());
        if (existingInquiry.isPresent()) {
            return ResponseEntity.badRequest().body("You already have an active inquiry for this property");
        }

        // Create new inquiry
        PropertyInquiry inquiry = new PropertyInquiry(property, client, property.getOwner(), 
                                                    request.getMessage(), request.getOfferedPrice());
        inquiry = inquiryRepo.save(inquiry);

        // Create initial message if provided
        if (request.getMessage() != null && !request.getMessage().trim().isEmpty()) {
            ChatMessage initialMessage = new ChatMessage(inquiry, client, ChatMessage.MessageType.TEXT, request.getMessage());
            messageRepo.save(initialMessage);
        }

        // Create price offer message if provided
        if (request.getOfferedPrice() != null) {
            String priceContent = "I would like to offer ₹" + request.getOfferedPrice().toString() + " for this property.";
            ChatMessage priceMessage = new ChatMessage(inquiry, client, ChatMessage.MessageType.PRICE_OFFER, priceContent, request.getOfferedPrice());
            messageRepo.save(priceMessage);
        }

        // Send notification to owner via WebSocket
        sendNotificationToOwner(inquiry, "New inquiry received for " + property.getTitle());

        // Create database notification for owner
        Notification notification = new Notification();
        notification.setRecipient(property.getOwner());
        notification.setType(Notification.Type.INQUIRY_NEW);
        notification.setTitle("New Property Inquiry");
        notification.setBody("You have received a new inquiry for " + property.getTitle() + " from " + 
                           client.getFirstName() + " " + client.getLastName());
        notification.setLink("/inquiries/" + inquiry.getId());
        notificationRepo.save(notification);

        // Build and return DTO
        InquiryDto dto = new InquiryDto();
        dto.id = inquiry.getId();
        dto.status = inquiry.getStatus() != null ? inquiry.getStatus().name() : null;
        dto.agreedPrice = inquiry.getAgreedPrice();
        dto.offeredPrice = inquiry.getOfferedPrice();
        dto.createdAt = inquiry.getCreatedAt();
        dto.updatedAt = inquiry.getUpdatedAt();
        PropertyDto pd = new PropertyDto();
        pd.id = property.getId();
        pd.title = property.getTitle();
        pd.imageUrl = property.getImageUrl();
        pd.address = property.getAddress();
        pd.city = property.getCity();
        pd.state = property.getState();
        pd.price = property.getPrice();
        dto.property = pd;
        UserDto cd = new UserDto();
        cd.id = client.getId();
        cd.firstName = client.getFirstName();
        cd.lastName = client.getLastName();
        cd.email = client.getEmail();
        dto.client = cd;
        User ownerUser = property.getOwner();
        if (ownerUser != null) {
            UserDto od = new UserDto();
            od.id = ownerUser.getId();
            od.firstName = ownerUser.getFirstName();
            od.lastName = ownerUser.getLastName();
            od.email = ownerUser.getEmail();
            dto.owner = od;
        }

        // Broadcast analytics updates
        if (analyticsBroadcaster != null) analyticsBroadcaster.broadcastAll();
        return ResponseEntity.status(HttpStatus.CREATED).body(dto);
    }

    // Get user's inquiries (client perspective)
    @GetMapping("/my")
    // @PreAuthorize("hasAnyRole('USER','ADMIN')") // Temporarily removed for debugging
    public ResponseEntity<?> getMyInquiries() {
        Optional<User> currentUserOpt = getCurrentUser();
        if (currentUserOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        User user = currentUserOpt.get();

        List<PropertyInquiry> inquiries = inquiryRepo.findByClient_IdOrderByUpdatedAtDesc(user.getId());
        List<InquiryDto> dtos = new java.util.ArrayList<>();
        for (PropertyInquiry inq : inquiries) {
            InquiryDto d = new InquiryDto();
            d.id = inq.getId();
            d.status = inq.getStatus() != null ? inq.getStatus().name() : null;
            d.agreedPrice = inq.getAgreedPrice();
            d.offeredPrice = inq.getOfferedPrice();
            d.createdAt = inq.getCreatedAt();
            d.updatedAt = inq.getUpdatedAt();
            if (inq.getProperty() != null) {
                Property p = inq.getProperty();
                PropertyDto pd2 = new PropertyDto();
                pd2.id = p.getId();
                pd2.title = p.getTitle();
                pd2.imageUrl = p.getImageUrl();
                pd2.address = p.getAddress();
                pd2.city = p.getCity();
                pd2.state = p.getState();
                pd2.price = p.getPrice();
                d.property = pd2;
            }
            if (inq.getClient() != null) {
                User c2 = inq.getClient();
                UserDto ud2 = new UserDto();
                ud2.id = c2.getId();
                ud2.firstName = c2.getFirstName();
                ud2.lastName = c2.getLastName();
                ud2.email = c2.getEmail();
                d.client = ud2;
            }
            if (inq.getOwner() != null) {
                User o2 = inq.getOwner();
                UserDto ud3 = new UserDto();
                ud3.id = o2.getId();
                ud3.firstName = o2.getFirstName();
                ud3.lastName = o2.getLastName();
                ud3.email = o2.getEmail();
                d.owner = ud3;
            }
            dtos.add(d);
        }
        return ResponseEntity.ok(dtos);
    }

    // Get inquiries for properties I own (owner perspective)
    @GetMapping("/owner")
    @PreAuthorize("hasAnyRole('USER','AGENT','ADMIN')")
    public ResponseEntity<?> getOwnerInquiries() {
        Optional<User> currentUserOpt = getCurrentUser();
        if (currentUserOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        User owner = currentUserOpt.get();

        List<PropertyInquiry> inquiries;
        if (owner.getRole() == User.Role.ADMIN) {
            inquiries = inquiryRepo.findRecentInquiries();
        } else {
            inquiries = inquiryRepo.findByOwner_IdOrderByUpdatedAtDesc(owner.getId());
        }

        List<InquiryDto> dtos = new java.util.ArrayList<>();
        for (PropertyInquiry inq : inquiries) {
            InquiryDto d = new InquiryDto();
            d.id = inq.getId();
            d.status = inq.getStatus() != null ? inq.getStatus().name() : null;
            d.agreedPrice = inq.getAgreedPrice();
            d.offeredPrice = inq.getOfferedPrice();
            d.createdAt = inq.getCreatedAt();
            d.updatedAt = inq.getUpdatedAt();
            if (inq.getProperty() != null) {
                Property p = inq.getProperty();
                PropertyDto pd2 = new PropertyDto();
                pd2.id = p.getId();
                pd2.title = p.getTitle();
                pd2.imageUrl = p.getImageUrl();
                pd2.address = p.getAddress();
                pd2.city = p.getCity();
                pd2.state = p.getState();
                pd2.price = p.getPrice();
                d.property = pd2;
            }
            if (inq.getClient() != null) {
                User c2 = inq.getClient();
                UserDto ud2 = new UserDto();
                ud2.id = c2.getId();
                ud2.firstName = c2.getFirstName();
                ud2.lastName = c2.getLastName();
                ud2.email = c2.getEmail();
                d.client = ud2;
            }
            if (inq.getOwner() != null) {
                User o2 = inq.getOwner();
                UserDto ud3 = new UserDto();
                ud3.id = o2.getId();
                ud3.firstName = o2.getFirstName();
                ud3.lastName = o2.getLastName();
                ud3.email = o2.getEmail();
                d.owner = ud3;
            }
            dtos.add(d);
        }
        return ResponseEntity.ok(dtos);
    }

    // Get specific inquiry with messages
    @GetMapping("/{inquiryId}")
    @PreAuthorize("hasAnyRole('USER','AGENT','ADMIN')")
    @Transactional
    public ResponseEntity<?> getInquiry(@PathVariable Long inquiryId) {
        Optional<User> currentUserOpt = getCurrentUser();
        if (currentUserOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        User user = currentUserOpt.get();

        // Debug logging
        System.out.println("DEBUG: User accessing inquiry " + inquiryId + " - ID: " + user.getId() + ", Email: " + user.getEmail() + ", Role: " + user.getRole());

        Optional<PropertyInquiry> inquiryOpt;
        if (user.getRole() == User.Role.ADMIN) {
            inquiryOpt = inquiryRepo.findById(inquiryId);
        } else {
            inquiryOpt = inquiryRepo.findByIdAndInvolvedUser(inquiryId, user.getId());
        }

        if (inquiryOpt.isEmpty()) {
            // Debug: Check if inquiry exists at all
            Optional<PropertyInquiry> anyInquiry = inquiryRepo.findById(inquiryId);
            if (anyInquiry.isPresent()) {
                PropertyInquiry inquiry = anyInquiry.get();
                System.out.println("DEBUG: Inquiry exists - Client ID: " + inquiry.getClient().getId() + ", Owner ID: " + inquiry.getOwner().getId() + ", User ID: " + user.getId());
            } else {
                System.out.println("DEBUG: Inquiry " + inquiryId + " does not exist");
            }
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Inquiry not found or access denied");
        }

        PropertyInquiry inquiry = inquiryOpt.get();

        // Build Inquiry DTO
        InquiryDto inquiryDto = new InquiryDto();
        inquiryDto.id = inquiry.getId();
        inquiryDto.status = inquiry.getStatus() != null ? inquiry.getStatus().name() : null;
        inquiryDto.agreedPrice = inquiry.getAgreedPrice();
        inquiryDto.offeredPrice = inquiry.getOfferedPrice();
        inquiryDto.createdAt = inquiry.getCreatedAt();
        inquiryDto.updatedAt = inquiry.getUpdatedAt();

        if (inquiry.getProperty() != null) {
            Property p = inquiry.getProperty();
            PropertyDto pd = new PropertyDto();
            pd.id = p.getId();
            pd.title = p.getTitle();
            pd.imageUrl = p.getImageUrl();
            pd.address = p.getAddress();
            pd.city = p.getCity();
            pd.state = p.getState();
            pd.price = p.getPrice();
            inquiryDto.property = pd;
        }
        if (inquiry.getClient() != null) {
            User c = inquiry.getClient();
            UserDto ud = new UserDto();
            ud.id = c.getId();
            ud.firstName = c.getFirstName();
            ud.lastName = c.getLastName();
            ud.email = c.getEmail();
            inquiryDto.client = ud;
        }
        if (inquiry.getOwner() != null) {
            User o = inquiry.getOwner();
            UserDto ud = new UserDto();
            ud.id = o.getId();
            ud.firstName = o.getFirstName();
            ud.lastName = o.getLastName();
            ud.email = o.getEmail();
            inquiryDto.owner = ud;
        }

        // Build Messages DTOs
        List<ChatMessage> messages = messageRepo.findByInquiry_IdOrderBySentAtAsc(inquiryId);
        List<ChatMessageDto> messageDtos = new java.util.ArrayList<>();
        for (ChatMessage m : messages) {
            ChatMessageDto md = new ChatMessageDto();
            md.id = m.getId();
            md.content = m.getContent();
            md.messageType = m.getMessageType() != null ? m.getMessageType().name() : null;
            md.priceAmount = m.getPriceAmount();
            md.sentAt = m.getSentAt();
            md.isRead = m.isRead();
            if (m.getSender() != null) {
                User s = m.getSender();
                UserDto sd = new UserDto();
                sd.id = s.getId();
                sd.firstName = s.getFirstName();
                sd.lastName = s.getLastName();
                sd.email = s.getEmail();
                md.sender = sd;
            }
            messageDtos.add(md);
        }

        // Mark messages as read for current user
        messageRepo.markMessagesAsRead(inquiryId, user.getId(), LocalDateTime.now());

        Map<String, Object> response = new HashMap<>();
        response.put("inquiry", inquiryDto);
        response.put("messages", messageDtos);
        response.put("unreadCount", messageRepo.countUnreadMessages(inquiryId, user.getId()));

        return ResponseEntity.ok(response);
    }

    // Send message in inquiry
    @PostMapping("/{inquiryId}/messages")
    @PreAuthorize("hasAnyRole('USER','AGENT','ADMIN')")
    public ResponseEntity<?> sendMessage(@PathVariable Long inquiryId, @Valid @RequestBody SendMessageRequest request) {
        Optional<User> currentUserOpt = getCurrentUser();
        if (currentUserOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        User sender = currentUserOpt.get();

        Optional<PropertyInquiry> inquiryOpt;
        if (sender.getRole() == User.Role.ADMIN) {
            inquiryOpt = inquiryRepo.findById(inquiryId);
        } else {
            inquiryOpt = inquiryRepo.findByIdAndInvolvedUser(inquiryId, sender.getId());
        }

        if (inquiryOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Inquiry not found or access denied");
        }

        PropertyInquiry inquiry = inquiryOpt.get();

        if (!inquiry.canBeModified()) {
            return ResponseEntity.badRequest().body("Cannot send messages to this inquiry");
        }

        // Create message
        ChatMessage.MessageType messageType = ChatMessage.MessageType.valueOf(request.getMessageType());
        ChatMessage message = new ChatMessage(inquiry, sender, messageType, request.getContent(), request.getPriceAmount());
        message = messageRepo.save(message);

        // Update inquiry timestamp and status if needed
        inquiry.setUpdatedAt(LocalDateTime.now());
        if (messageType == ChatMessage.MessageType.PRICE_OFFER || messageType == ChatMessage.MessageType.PRICE_COUNTER) {
            inquiry.setStatus(PropertyInquiry.InquiryStatus.NEGOTIATING);
        }
        inquiryRepo.save(inquiry);
        // Broadcast analytics updates
        if (analyticsBroadcaster != null) analyticsBroadcaster.broadcastAll();

        // Send real-time message via WebSocket
        User recipient = sender.getId().equals(inquiry.getClient().getId()) ? inquiry.getOwner() : inquiry.getClient();
        sendMessageViaWebSocket(inquiryId, message, recipient);

        // Create notification for recipient
        createMessageNotification(inquiry, sender, recipient, message);

        return ResponseEntity.ok(message);
    }

    // Update inquiry status
    @PatchMapping("/{inquiryId}/status")
    @PreAuthorize("hasAnyRole('USER','AGENT','ADMIN')")
    public ResponseEntity<?> updateInquiryStatus(@PathVariable Long inquiryId, @RequestParam String status) {
        Optional<User> currentUserOpt = getCurrentUser();
        if (currentUserOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        User user = currentUserOpt.get();

        Optional<PropertyInquiry> inquiryOpt;
        if (user.getRole() == User.Role.ADMIN) {
            inquiryOpt = inquiryRepo.findById(inquiryId);
        } else {
            inquiryOpt = inquiryRepo.findByIdAndInvolvedUser(inquiryId, user.getId());
        }

        if (inquiryOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Inquiry not found or access denied");
        }

        PropertyInquiry inquiry = inquiryOpt.get();
        PropertyInquiry.InquiryStatus newStatus = PropertyInquiry.InquiryStatus.valueOf(status);
        
        inquiry.setStatus(newStatus);
        inquiry = inquiryRepo.save(inquiry);

        // Send status update via WebSocket
        User otherParty = user.getId().equals(inquiry.getClient().getId()) ? inquiry.getOwner() : inquiry.getClient();
        sendStatusUpdateViaWebSocket(inquiryId, newStatus, otherParty);

        // Broadcast analytics updates
        if (analyticsBroadcaster != null) analyticsBroadcaster.broadcastAll();
        return ResponseEntity.ok(inquiry);
    }

    // Get unread message count for user
    @GetMapping("/unread-count")
    @PreAuthorize("hasAnyRole('USER','AGENT','ADMIN')")
    public ResponseEntity<?> getUnreadCount() {
        Optional<User> currentUserOpt = getCurrentUser();
        if (currentUserOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        User user = currentUserOpt.get();

        Long unreadCount = messageRepo.countTotalUnreadMessagesForUser(user.getId());
        Map<String, Object> response = new HashMap<>();
        response.put("unreadCount", unreadCount);
        
        return ResponseEntity.ok(response);
    }

    // Helper methods
    private Optional<User> getCurrentUser() {
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth == null || !auth.isAuthenticated()) return Optional.empty();
            
            Object principal = auth.getPrincipal();
            if (principal instanceof org.springframework.security.core.userdetails.User userDetails) {
                return userRepo.findByEmailAndEnabledTrue(userDetails.getUsername());
            }
            if (principal instanceof User user) return Optional.of(user);
            return Optional.empty();
        } catch (Exception e) {
            return Optional.empty();
        }
    }

    private void sendNotificationToOwner(PropertyInquiry inquiry, String message) {
        try {
            Map<String, Object> notification = new HashMap<>();
            notification.put("type", "NEW_INQUIRY");
            notification.put("inquiryId", inquiry.getId());
            notification.put("message", message);
            notification.put("propertyTitle", inquiry.getProperty().getTitle());
            notification.put("clientName", inquiry.getClient().getFirstName() + " " + inquiry.getClient().getLastName());
            
            messagingTemplate.convertAndSendToUser(
                inquiry.getOwner().getEmail(),
                "/queue/notifications",
                notification
            );
        } catch (Exception e) {
            System.err.println("Failed to send WebSocket notification: " + e.getMessage());
        }
    }

    private void sendMessageViaWebSocket(Long inquiryId, ChatMessage message, User recipient) {
        try {
            Map<String, Object> wsMessage = new HashMap<>();
            wsMessage.put("type", "NEW_MESSAGE");
            wsMessage.put("inquiryId", inquiryId);
            wsMessage.put("message", message);
            
            messagingTemplate.convertAndSendToUser(
                recipient.getEmail(),
                "/queue/messages",
                wsMessage
            );
        } catch (Exception e) {
            System.err.println("Failed to send WebSocket message: " + e.getMessage());
        }
    }

    private void sendStatusUpdateViaWebSocket(Long inquiryId, PropertyInquiry.InquiryStatus status, User recipient) {
        try {
            Map<String, Object> statusUpdate = new HashMap<>();
            statusUpdate.put("type", "STATUS_UPDATE");
            statusUpdate.put("inquiryId", inquiryId);
            statusUpdate.put("status", status.toString());
            
            messagingTemplate.convertAndSendToUser(
                recipient.getEmail(),
                "/queue/status",
                statusUpdate
            );
        } catch (Exception e) {
            System.err.println("Failed to send WebSocket status update: " + e.getMessage());
        }
    }

    private void createMessageNotification(PropertyInquiry inquiry, User sender, User recipient, ChatMessage message) {
        try {
            Notification notification = new Notification();
            notification.setRecipient(recipient);
            notification.setType(Notification.Type.INQUIRY_UPDATE);
            notification.setTitle("New message from " + sender.getFirstName() + " " + sender.getLastName());
            
            String body = message.getContent();
            if (body.length() > 100) {
                body = body.substring(0, 100) + "...";
            }
            notification.setBody(body);
            notification.setLink("/inquiries/" + inquiry.getId());
            
            notificationRepo.save(notification);

            // Send notification via WebSocket
            Map<String, Object> wsNotification = new HashMap<>();
            wsNotification.put("type", "MESSAGE_NOTIFICATION");
            wsNotification.put("notification", notification);
            
            messagingTemplate.convertAndSendToUser(
                recipient.getEmail(),
                "/queue/notifications",
                wsNotification
            );
        } catch (Exception e) {
            System.err.println("Failed to create message notification: " + e.getMessage());
        }
    }
}
