package com.realestate.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

public class SendMessageRequest {
    
    @NotBlank(message = "Message content is required")
    @Size(max = 1000, message = "Message must not exceed 1000 characters")
    private String content;
    
    private String messageType = "TEXT"; // Default to TEXT
    
    private BigDecimal priceAmount; // Optional, for price-related messages
    
    // Constructors
    public SendMessageRequest() {}
    
    public SendMessageRequest(String content) {
        this.content = content;
    }
    
    public SendMessageRequest(String content, String messageType, BigDecimal priceAmount) {
        this.content = content;
        this.messageType = messageType;
        this.priceAmount = priceAmount;
    }
    
    // Getters and Setters
    public String getContent() {
        return content;
    }
    
    public void setContent(String content) {
        this.content = content;
    }
    
    public String getMessageType() {
        return messageType;
    }
    
    public void setMessageType(String messageType) {
        this.messageType = messageType;
    }
    
    public BigDecimal getPriceAmount() {
        return priceAmount;
    }
    
    public void setPriceAmount(BigDecimal priceAmount) {
        this.priceAmount = priceAmount;
    }
}
