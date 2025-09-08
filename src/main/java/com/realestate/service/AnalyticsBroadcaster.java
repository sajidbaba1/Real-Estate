package com.realestate.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

import java.util.Map;

@Component
public class AnalyticsBroadcaster {

    @Autowired private AnalyticsService analyticsService;
    @Autowired private SimpMessagingTemplate messagingTemplate;

    public void broadcastSummary() {
        Map<String, Object> summary = analyticsService.getSummary();
        // Broadcast to admins subscribed to analytics summary
        messagingTemplate.convertAndSend("/topic/analytics/summary", summary);
    }

    public void broadcastRecent() {
        var recent = analyticsService.recentInquiries(10);
        messagingTemplate.convertAndSend("/topic/analytics/recent", recent);
    }

    public void broadcastAll() {
        broadcastSummary();
        broadcastRecent();
    }
}
