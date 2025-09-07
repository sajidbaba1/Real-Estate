package com.realestate.controller;

import com.razorpay.Order;
import com.razorpay.RazorpayClient;
import com.razorpay.Utils;
import com.realestate.entity.Property;
import com.realestate.entity.SaleInquiry;
import com.realestate.entity.User;
import com.realestate.repository.PropertyRepository;
import com.realestate.repository.SaleInquiryRepository;
import com.realestate.repository.UserRepository;
import org.json.JSONObject;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/payments")
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:5175", "https://real-estate-alpha-sandy.vercel.app"})
public class PaymentController {

    @Value("${razorpay.key.id:}")
    private String razorpayKeyId;

    @Value("${razorpay.key.secret:}")
    private String razorpayKeySecret;

    private final SaleInquiryRepository inquiryRepo;
    private final PropertyRepository propertyRepo;
    private final WalletController walletController;

    public PaymentController(SaleInquiryRepository inquiryRepo, PropertyRepository propertyRepo, WalletController walletController) {
        this.inquiryRepo = inquiryRepo;
        this.propertyRepo = propertyRepo;
        this.walletController = walletController;
    }

    public static class CreateOrderRequest {
        public Long inquiryId;
        public Integer amount; // in INR, optional; default token 10000
    }

    @PostMapping("/order")
    @PreAuthorize("hasAnyRole('USER','ADMIN','AGENT')")
    public ResponseEntity<?> createOrder(@RequestBody CreateOrderRequest req) {
        try {
            if (razorpayKeyId == null || razorpayKeyId.isEmpty() || razorpayKeySecret == null || razorpayKeySecret.isEmpty()) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Razorpay keys not configured");
            }
            Optional<SaleInquiry> inqOpt = inquiryRepo.findById(req.inquiryId);
            if (inqOpt.isEmpty()) return ResponseEntity.notFound().build();
            SaleInquiry inq = inqOpt.get();
            if (inq.getDealStatus() != SaleInquiry.DealStatus.ACCEPTED) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Deal is not accepted yet");
            }

            int amountInInr = (req.amount != null && req.amount > 0) ? req.amount : 10000; // default token 10,000 INR
            int amountInPaise = amountInInr * 100;

            RazorpayClient client = new RazorpayClient(razorpayKeyId, razorpayKeySecret);
            JSONObject orderRequest = new JSONObject();
            orderRequest.put("amount", amountInPaise);
            orderRequest.put("currency", "INR");
            orderRequest.put("payment_capture", 1);
            orderRequest.put("receipt", "inq_" + inq.getId());

            Order order = client.Orders.create(orderRequest);

            Map<String, Object> resp = new HashMap<>();
            resp.put("orderId", order.get("id"));
            resp.put("amount", order.get("amount"));
            resp.put("currency", order.get("currency"));
            resp.put("keyId", razorpayKeyId);
            resp.put("inquiryId", inq.getId());
            return ResponseEntity.ok(resp);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Order creation failed: " + e.getMessage());
        }
    }

    public static class VerifyRequest {
        public Long inquiryId;
        public String razorpay_order_id;
        public String razorpay_payment_id;
        public String razorpay_signature;
    }

    @PostMapping("/verify")
    @PreAuthorize("hasAnyRole('USER','ADMIN','AGENT')")
    public ResponseEntity<?> verifyPayment(@RequestBody VerifyRequest req) {
        try {
            if (razorpayKeySecret == null || razorpayKeySecret.isEmpty()) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Razorpay secret not configured");
            }
            String payload = req.razorpay_order_id + '|' + req.razorpay_payment_id;
            boolean isValid = Utils.verifySignature(payload, req.razorpay_signature, razorpayKeySecret);
            if (!isValid) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Invalid signature");
            }

            Optional<SaleInquiry> inqOpt = inquiryRepo.findById(req.inquiryId);
            if (inqOpt.isEmpty()) return ResponseEntity.notFound().build();
            SaleInquiry inq = inqOpt.get();
            inq.setDealStatus(SaleInquiry.DealStatus.BOOKED);
            inq.setStatus(SaleInquiry.InquiryStatus.CLOSED);
            inquiryRepo.save(inq);

            // Mark property SOLD
            Property property = inq.getProperty();
            property.setStatus(Property.PropertyStatus.SOLD);
            propertyRepo.save(property);

            // Deduct token amount from customer's wallet (optional, if wallet used for record-keeping)
            try {
                BigDecimal tokenAmount = new BigDecimal("10000"); // Default token amount (INR)
                walletController.deductMoney(inq.getCustomer().getId(), tokenAmount,
                        "Token payment for property booking - Inquiry #" + inq.getId(),
                        req.razorpay_payment_id);
            } catch (Exception ignored) {}

            Map<String, Object> resp = new HashMap<>();
            resp.put("status", "success");
            resp.put("inquiryId", inq.getId());
            resp.put("propertyId", property.getId());
            resp.put("dealStatus", inq.getDealStatus().name());
            return ResponseEntity.ok(resp);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Verification failed: " + e.getMessage());
        }
    }
}
