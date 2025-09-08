package com.realestate.controller;

import com.realestate.entity.*;
import com.realestate.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.messaging.simp.annotation.SendToUser;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Controller;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@Controller
public class ChatWebSocketController {

    @Autowired private PropertyInquiryRepository inquiryRepo;
    @Autowired private ChatMessageRepository messageRepo;
    @Autowired private UserRepository userRepo;
    @Autowired private PropertyRepository propertyRepo;
    @Autowired private NotificationRepository notificationRepo;
    @Autowired private SimpMessagingTemplate messagingTemplate;

    // WebSocket message DTOs
    public static class WebSocketMessage {
        private String type;
        private Long inquiryId;
        private String content;
        private BigDecimal priceAmount;
        private String messageType = "TEXT";

        // Getters and setters
        public String getType() { return type; }
        public void setType(String type) { this.type = type; }
        public Long getInquiryId() { return inquiryId; }
        public void setInquiryId(Long inquiryId) { this.inquiryId = inquiryId; }
        public String getContent() { return content; }
        public void setContent(String content) { this.content = content; }
        public BigDecimal getPriceAmount() { return priceAmount; }
        public void setPriceAmount(BigDecimal priceAmount) { this.priceAmount = priceAmount; }
        public String getMessageType() { return messageType; }
        public void setMessageType(String messageType) { this.messageType = messageType; }
    }

    public static class TypingIndicator {
        private Long inquiryId;
        private boolean isTyping;

        // Getters and setters
        public Long getInquiryId() { return inquiryId; }
        public void setInquiryId(Long inquiryId) { this.inquiryId = inquiryId; }
        public boolean isTyping() { return isTyping; }
        public void setTyping(boolean typing) { isTyping = typing; }
    }

    public static class PurchaseRequest {
        private Long inquiryId;
        private BigDecimal finalPrice;
        private String message;

        // Getters and setters
        public Long getInquiryId() { return inquiryId; }
        public void setInquiryId(Long inquiryId) { this.inquiryId = inquiryId; }
        public BigDecimal getFinalPrice() { return finalPrice; }
        public void setFinalPrice(BigDecimal finalPrice) { this.finalPrice = finalPrice; }
        public String getMessage() { return message; }
        public void setMessage(String message) { this.message = message; }
    }

    // Send message via WebSocket
    @MessageMapping("/chat.send/{inquiryId}")
    public void sendMessage(@DestinationVariable Long inquiryId, @Payload WebSocketMessage wsMessage, Authentication authentication) {
        try {
            User sender = getCurrentUserFromAuth(authentication);
            if (sender == null) return;

            // Verify user has access to this inquiry
            Optional<PropertyInquiry> inquiryOpt = inquiryRepo.findByIdAndInvolvedUser(inquiryId, sender.getId());
            if (inquiryOpt.isEmpty()) return;

            PropertyInquiry inquiry = inquiryOpt.get();
            if (!inquiry.canBeModified()) return;

            // Create and save message
            ChatMessage.MessageType messageType = ChatMessage.MessageType.valueOf(wsMessage.getMessageType());
            ChatMessage message = new ChatMessage(inquiry, sender, messageType, wsMessage.getContent(), wsMessage.getPriceAmount());
            message = messageRepo.save(message);

            // Update inquiry timestamp and status
            inquiry.setUpdatedAt(LocalDateTime.now());
            if (messageType == ChatMessage.MessageType.PRICE_OFFER || messageType == ChatMessage.MessageType.PRICE_COUNTER) {
                inquiry.setStatus(PropertyInquiry.InquiryStatus.NEGOTIATING);
                inquiry.setOfferedPrice(wsMessage.getPriceAmount());
            } else if (messageType == ChatMessage.MessageType.PRICE_ACCEPT) {
                inquiry.setStatus(PropertyInquiry.InquiryStatus.AGREED);
                inquiry.setAgreedPrice(wsMessage.getPriceAmount());
            }
            inquiryRepo.save(inquiry);

            // Determine recipient
            User recipient = sender.getId().equals(inquiry.getClient().getId()) ? inquiry.getOwner() : inquiry.getClient();

            // Send message to recipient via WebSocket
            Map<String, Object> response = new HashMap<>();
            response.put("type", "NEW_MESSAGE");
            response.put("inquiryId", inquiryId);
            response.put("message", message);
            response.put("senderName", sender.getFirstName() + " " + sender.getLastName());

            messagingTemplate.convertAndSendToUser(
                recipient.getEmail(),
                "/queue/messages",
                response
            );

            // Also send to sender for confirmation
            messagingTemplate.convertAndSendToUser(
                sender.getEmail(),
                "/queue/messages",
                response
            );

            // Create notification for recipient
            createMessageNotification(inquiry, sender, recipient, message);

        } catch (Exception e) {
            System.err.println("Error in WebSocket sendMessage: " + e.getMessage());
            e.printStackTrace();
        }
    }

    // Handle typing indicator
    @MessageMapping("/chat.typing/{inquiryId}")
    public void handleTyping(@DestinationVariable Long inquiryId, @Payload TypingIndicator typingIndicator, Authentication authentication) {
        try {
            User sender = getCurrentUserFromAuth(authentication);
            if (sender == null) return;

            // Verify user has access to this inquiry
            Optional<PropertyInquiry> inquiryOpt = inquiryRepo.findByIdAndInvolvedUser(inquiryId, sender.getId());
            if (inquiryOpt.isEmpty()) return;

            PropertyInquiry inquiry = inquiryOpt.get();
            User recipient = sender.getId().equals(inquiry.getClient().getId()) ? inquiry.getOwner() : inquiry.getClient();

            // Send typing indicator to recipient
            Map<String, Object> response = new HashMap<>();
            response.put("type", "TYPING_INDICATOR");
            response.put("inquiryId", inquiryId);
            response.put("isTyping", typingIndicator.isTyping());
            response.put("senderName", sender.getFirstName() + " " + sender.getLastName());

            messagingTemplate.convertAndSendToUser(
                recipient.getEmail(),
                "/queue/typing",
                response
            );

        } catch (Exception e) {
            System.err.println("Error in WebSocket handleTyping: " + e.getMessage());
        }
    }

    // Handle purchase request
    @MessageMapping("/chat.purchase/{inquiryId}")
    public void handlePurchaseRequest(@DestinationVariable Long inquiryId, @Payload PurchaseRequest purchaseRequest, Authentication authentication) {
        try {
            User client = getCurrentUserFromAuth(authentication);
            if (client == null) return;

            // Verify user has access to this inquiry and is the client
            Optional<PropertyInquiry> inquiryOpt = inquiryRepo.findById(inquiryId);
            if (inquiryOpt.isEmpty()) return;

            PropertyInquiry inquiry = inquiryOpt.get();
            if (!inquiry.getClient().getId().equals(client.getId()) || inquiry.getStatus() != PropertyInquiry.InquiryStatus.AGREED) {
                return;
            }

            // Create purchase request message
            String content = purchaseRequest.getMessage() != null ? purchaseRequest.getMessage() : 
                           "I would like to purchase this property at the agreed price of ₹" + purchaseRequest.getFinalPrice();
            
            ChatMessage purchaseMessage = new ChatMessage(inquiry, client, ChatMessage.MessageType.PURCHASE_REQUEST, content, purchaseRequest.getFinalPrice());
            purchaseMessage = messageRepo.save(purchaseMessage);

            // Update inquiry status
            inquiry.setStatus(PropertyInquiry.InquiryStatus.AGREED);
            inquiry.setAgreedPrice(purchaseRequest.getFinalPrice());
            inquiry.setUpdatedAt(LocalDateTime.now());
            inquiryRepo.save(inquiry);

            // Send to owner via WebSocket
            Map<String, Object> response = new HashMap<>();
            response.put("type", "PURCHASE_REQUEST");
            response.put("inquiryId", inquiryId);
            response.put("message", purchaseMessage);
            response.put("finalPrice", purchaseRequest.getFinalPrice());
            response.put("clientName", client.getFirstName() + " " + client.getLastName());

            messagingTemplate.convertAndSendToUser(
                inquiry.getOwner().getEmail(),
                "/queue/purchase",
                response
            );

            // Create notification for owner
            Notification notification = new Notification();
            notification.setRecipient(inquiry.getOwner());
            notification.setType(Notification.Type.INQUIRY_UPDATE);
            notification.setTitle("Purchase Request Received");
            notification.setBody(client.getFirstName() + " " + client.getLastName() + 
                               " wants to purchase " + inquiry.getProperty().getTitle() + 
                               " for ₹" + purchaseRequest.getFinalPrice());
            notification.setLink("/inquiries/" + inquiryId);
            notificationRepo.save(notification);

        } catch (Exception e) {
            System.err.println("Error in WebSocket handlePurchaseRequest: " + e.getMessage());
        }
    }

    // Handle purchase confirmation by owner
    @MessageMapping("/chat.confirmPurchase/{inquiryId}")
    public void handlePurchaseConfirmation(@DestinationVariable Long inquiryId, @Payload PurchaseRequest confirmRequest, Authentication authentication) {
        try {
            User owner = getCurrentUserFromAuth(authentication);
            if (owner == null) return;

            // Verify user is the owner of this inquiry
            Optional<PropertyInquiry> inquiryOpt = inquiryRepo.findById(inquiryId);
            if (inquiryOpt.isEmpty()) return;

            PropertyInquiry inquiry = inquiryOpt.get();
            if (!inquiry.getOwner().getId().equals(owner.getId())) return;

            // Create purchase confirmation message
            String content = confirmRequest.getMessage() != null ? confirmRequest.getMessage() : 
                           "I confirm the sale of this property for ₹" + inquiry.getAgreedPrice();
            
            ChatMessage confirmMessage = new ChatMessage(inquiry, owner, ChatMessage.MessageType.PURCHASE_CONFIRM, content, inquiry.getAgreedPrice());
            confirmMessage = messageRepo.save(confirmMessage);

            // Update inquiry and property status
            inquiry.setStatus(PropertyInquiry.InquiryStatus.PURCHASED);
            inquiry.setUpdatedAt(LocalDateTime.now());
            inquiryRepo.save(inquiry);

            // Mark property as SOLD
            Property property = inquiry.getProperty();
            property.setStatus(Property.PropertyStatus.SOLD);
            propertyRepo.save(property);

            // Send confirmation to client via WebSocket
            Map<String, Object> clientResponse = new HashMap<>();
            clientResponse.put("type", "PURCHASE_CONFIRMED");
            clientResponse.put("inquiryId", inquiryId);
            clientResponse.put("message", confirmMessage);
            clientResponse.put("propertyTitle", property.getTitle());

            messagingTemplate.convertAndSendToUser(
                inquiry.getClient().getEmail(),
                "/queue/purchase",
                clientResponse
            );

            // Send notification to admin about completed sale
            sendAdminSaleNotification(inquiry, property);

            // Create notification for client
            Notification clientNotification = new Notification();
            clientNotification.setRecipient(inquiry.getClient());
            clientNotification.setType(Notification.Type.INQUIRY_UPDATE);
            clientNotification.setTitle("Purchase Confirmed!");
            clientNotification.setBody("Congratulations! Your purchase of " + property.getTitle() + 
                                     " has been confirmed for ₹" + inquiry.getAgreedPrice());
            clientNotification.setLink("/inquiries/" + inquiryId);
            notificationRepo.save(clientNotification);

        } catch (Exception e) {
            System.err.println("Error in WebSocket handlePurchaseConfirmation: " + e.getMessage());
        }
    }

    // Mark messages as read
    @MessageMapping("/chat.markRead/{inquiryId}")
    public void markMessagesAsRead(@DestinationVariable Long inquiryId, Authentication authentication) {
        try {
            User user = getCurrentUserFromAuth(authentication);
            if (user == null) return;

            // Verify user has access to this inquiry
            Optional<PropertyInquiry> inquiryOpt = inquiryRepo.findByIdAndInvolvedUser(inquiryId, user.getId());
            if (inquiryOpt.isEmpty()) return;

            // Mark messages as read
            messageRepo.markMessagesAsRead(inquiryId, user.getId(), LocalDateTime.now());

            // Send read confirmation
            Map<String, Object> response = new HashMap<>();
            response.put("type", "MESSAGES_READ");
            response.put("inquiryId", inquiryId);
            response.put("readAt", LocalDateTime.now());

            messagingTemplate.convertAndSendToUser(
                user.getEmail(),
                "/queue/read",
                response
            );

        } catch (Exception e) {
            System.err.println("Error in WebSocket markMessagesAsRead: " + e.getMessage());
        }
    }

    // Helper methods
    private User getCurrentUserFromAuth(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return null;
        }

        try {
            Object principal = authentication.getPrincipal();
            if (principal instanceof org.springframework.security.core.userdetails.User userDetails) {
                Optional<User> userOpt = userRepo.findByEmailAndEnabledTrue(userDetails.getUsername());
                return userOpt.orElse(null);
            }
            if (principal instanceof User user) {
                return user;
            }
            return null;
        } catch (Exception e) {
            System.err.println("Error getting current user from authentication: " + e.getMessage());
            return null;
        }
    }

    private void createMessageNotification(PropertyInquiry inquiry, User sender, User recipient, ChatMessage message) {
        try {
            Notification notification = new Notification();
            notification.setRecipient(recipient);
            notification.setType(Notification.Type.INQUIRY_UPDATE);
            notification.setTitle("New message from " + sender.getFirstName() + " " + sender.getLastName());
            
            String body = message.getContent();
            if (body != null && body.length() > 100) {
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

    private void sendAdminSaleNotification(PropertyInquiry inquiry, Property property) {
        try {
            // Find admin users
            List<User> adminUsers = userRepo.findByRoleAndEnabledTrue(User.Role.ADMIN);
            
            for (User admin : adminUsers) {
                Notification adminNotification = new Notification();
                adminNotification.setRecipient(admin);
                adminNotification.setType(Notification.Type.SYSTEM);
                adminNotification.setTitle("Property Sale Completed");
                adminNotification.setBody("Property '" + property.getTitle() + "' has been sold for ₹" + 
                                        inquiry.getAgreedPrice() + " to " + inquiry.getClient().getFirstName() + 
                                        " " + inquiry.getClient().getLastName());
                adminNotification.setLink("/admin/properties");
                notificationRepo.save(adminNotification);

                // Send via WebSocket
                Map<String, Object> wsNotification = new HashMap<>();
                wsNotification.put("type", "SALE_NOTIFICATION");
                wsNotification.put("notification", adminNotification);
                wsNotification.put("inquiryId", inquiry.getId());
                wsNotification.put("propertyId", property.getId());
                
                messagingTemplate.convertAndSendToUser(
                    admin.getEmail(),
                    "/queue/notifications",
                    wsNotification
                );
            }
        } catch (Exception e) {
            System.err.println("Failed to send admin sale notification: " + e.getMessage());
        }
    }
}
