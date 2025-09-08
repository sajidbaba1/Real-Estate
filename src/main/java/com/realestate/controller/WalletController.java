package com.realestate.controller;

import com.realestate.entity.User;
import com.realestate.entity.Wallet;
import com.realestate.entity.WalletTransaction;
import com.realestate.repository.UserRepository;
import com.realestate.repository.WalletRepository;
import com.realestate.repository.WalletTransactionRepository;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

// Razorpay
import com.razorpay.Order;
import com.razorpay.RazorpayClient;
import com.razorpay.Utils;
import org.json.JSONObject;

@RestController
@RequestMapping("/api/wallet")
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:5175", "https://real-estate-alpha-sandy.vercel.app"})
public class WalletController {

    @Autowired private WalletRepository walletRepo;
    @Autowired private WalletTransactionRepository transactionRepo;
    @Autowired private UserRepository userRepo;

    @Value("${razorpay.key.id:}")
    private String razorpayKeyId;

    @Value("${razorpay.key.secret:}")
    private String razorpayKeySecret;

    // Get or create wallet for current user
    @GetMapping
    @PreAuthorize("hasAnyRole('USER','ADMIN','AGENT')")
    public ResponseEntity<?> getMyWallet() {
        Optional<User> userOpt = getCurrentUser();
        if (userOpt.isEmpty()) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        User user = userOpt.get();

        Optional<Wallet> walletOpt = walletRepo.findByUser_Id(user.getId());
        Wallet wallet;
        if (walletOpt.isEmpty()) {
            // Create wallet if not exists
            wallet = new Wallet();
            wallet.setUser(user);
            wallet.setBalance(BigDecimal.ZERO);
            wallet = walletRepo.save(wallet);
        } else {
            wallet = walletOpt.get();
        }

        Map<String, Object> response = new HashMap<>();
        response.put("id", wallet.getId());
        response.put("balance", wallet.getBalance());
        response.put("userId", user.getId());
        return ResponseEntity.ok(response);
    }

    // ---------- Razorpay Server Order/Verify for Wallet Top-up ----------
    public static class CreateWalletOrderRequest {
        public Integer amount; // INR
        public String description;
    }

    @PostMapping("/pay/order")
    @PreAuthorize("hasAnyRole('USER','ADMIN','AGENT')")
    public ResponseEntity<?> createWalletOrder(@RequestBody CreateWalletOrderRequest req) {
        try {
            if (razorpayKeyId == null || razorpayKeyId.isEmpty() || razorpayKeySecret == null || razorpayKeySecret.isEmpty()) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Razorpay keys not configured");
            }
            if (req.amount == null || req.amount <= 0) {
                return ResponseEntity.badRequest().body("Amount must be positive");
            }

            int amountInPaise = req.amount * 100;
            RazorpayClient client = new RazorpayClient(razorpayKeyId, razorpayKeySecret);
            JSONObject orderRequest = new JSONObject();
            orderRequest.put("amount", amountInPaise);
            orderRequest.put("currency", "INR");
            orderRequest.put("payment_capture", 1);
            orderRequest.put("receipt", "wallet_" + System.currentTimeMillis());

            Order order = client.orders.create(orderRequest);

            Map<String, Object> resp = new HashMap<>();
            resp.put("orderId", order.get("id"));
            resp.put("amount", order.get("amount"));
            resp.put("currency", order.get("currency"));
            resp.put("keyId", razorpayKeyId);
            return ResponseEntity.ok(resp);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Order creation failed: " + e.getMessage());
        }
    }

    public static class VerifyWalletRequest {
        public Integer amount; // INR
        public String description;
        public String razorpay_order_id;
        public String razorpay_payment_id;
        public String razorpay_signature;
    }

    @PostMapping("/pay/verify")
    @PreAuthorize("hasAnyRole('USER','ADMIN','AGENT')")
    public ResponseEntity<?> verifyWalletPayment(@RequestBody VerifyWalletRequest req) {
        try {
            if (razorpayKeySecret == null || razorpayKeySecret.isEmpty()) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Razorpay secret not configured");
            }
            if (req.amount == null || req.amount <= 0) {
                return ResponseEntity.badRequest().body("Amount must be positive");
            }

            String payload = req.razorpay_order_id + '|' + req.razorpay_payment_id;
            boolean isValid = Utils.verifySignature(payload, req.razorpay_signature, razorpayKeySecret);
            if (!isValid) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Invalid signature");
            }

            Optional<User> userOpt = getCurrentUser();
            if (userOpt.isEmpty()) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
            User user = userOpt.get();

            // Ensure wallet exists
            Optional<Wallet> walletOpt = walletRepo.findByUser_Id(user.getId());
            Wallet wallet = walletOpt.orElseGet(() -> {
                Wallet w = new Wallet();
                w.setUser(user);
                w.setBalance(BigDecimal.ZERO);
                return walletRepo.save(w);
            });

            BigDecimal amount = new BigDecimal(req.amount);

            // Persist credit transaction with Razorpay payment id as reference
            WalletTransaction txn = new WalletTransaction();
            txn.setWallet(wallet);
            txn.setType(WalletTransaction.TransactionType.CREDIT);
            txn.setAmount(amount);
            txn.setDescription(req.description != null ? req.description : "Wallet top-up via Razorpay");
            txn.setReferenceId(req.razorpay_payment_id);
            transactionRepo.save(txn);

            // Update wallet balance
            wallet.setBalance(wallet.getBalance().add(amount));
            walletRepo.save(wallet);

            Map<String, Object> response = new HashMap<>();
            response.put("status", "success");
            response.put("walletId", wallet.getId());
            response.put("newBalance", wallet.getBalance());
            response.put("transactionId", txn.getId());
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Verification failed: " + e.getMessage());
        }
    }

    // Get wallet transactions
    @GetMapping("/transactions")
    @PreAuthorize("hasAnyRole('USER','ADMIN','AGENT')")
    public ResponseEntity<?> getMyTransactions() {
        Optional<User> userOpt = getCurrentUser();
        if (userOpt.isEmpty()) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        User user = userOpt.get();

        Optional<Wallet> walletOpt = walletRepo.findByUser_Id(user.getId());
        if (walletOpt.isEmpty()) {
            return ResponseEntity.ok(List.of()); // Empty list if no wallet
        }

        List<WalletTransaction> transactions = transactionRepo.findByWallet_IdOrderByCreatedAtDesc(walletOpt.get().getId());
        return ResponseEntity.ok(transactions);
    }

    public static class AddMoneyRequest {
        public BigDecimal amount;
        public String description;
    }

    // Add money to wallet (for testing/admin)
    @PostMapping("/add")
    @PreAuthorize("hasAnyRole('USER','ADMIN','AGENT')")
    public ResponseEntity<?> addMoney(@Valid @RequestBody AddMoneyRequest req) {
        if (req.amount == null || req.amount.compareTo(BigDecimal.ZERO) <= 0) {
            return ResponseEntity.badRequest().body("Amount must be positive");
        }

        Optional<User> userOpt = getCurrentUser();
        if (userOpt.isEmpty()) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        User user = userOpt.get();

        Optional<Wallet> walletOpt = walletRepo.findByUser_Id(user.getId());
        Wallet wallet;
        if (walletOpt.isEmpty()) {
            wallet = new Wallet();
            wallet.setUser(user);
            wallet.setBalance(BigDecimal.ZERO);
            wallet = walletRepo.save(wallet);
        } else {
            wallet = walletOpt.get();
        }

        // Add transaction
        WalletTransaction txn = new WalletTransaction();
        txn.setWallet(wallet);
        txn.setType(WalletTransaction.TransactionType.CREDIT);
        txn.setAmount(req.amount);
        txn.setDescription(req.description != null ? req.description : "Money added to wallet");
        transactionRepo.save(txn);

        // Update balance
        wallet.setBalance(wallet.getBalance().add(req.amount));
        walletRepo.save(wallet);

        Map<String, Object> response = new HashMap<>();
        response.put("walletId", wallet.getId());
        response.put("newBalance", wallet.getBalance());
        response.put("transactionId", txn.getId());
        return ResponseEntity.ok(response);
    }

    // Helper method to deduct money (used by other controllers)
    public boolean deductMoney(Long userId, BigDecimal amount, String description, String referenceId) {
        try {
            Optional<Wallet> walletOpt = walletRepo.findByUser_Id(userId);
            if (walletOpt.isEmpty()) return false;
            Wallet wallet = walletOpt.get();

            if (wallet.getBalance().compareTo(amount) < 0) return false; // Insufficient balance

            // Create debit transaction
            WalletTransaction txn = new WalletTransaction();
            txn.setWallet(wallet);
            txn.setType(WalletTransaction.TransactionType.DEBIT);
            txn.setAmount(amount);
            txn.setDescription(description);
            txn.setReferenceId(referenceId);
            transactionRepo.save(txn);

            // Update balance
            wallet.setBalance(wallet.getBalance().subtract(amount));
            walletRepo.save(wallet);
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    // Helper method to add money (used by other controllers)
    public void addMoney(Long userId, BigDecimal amount, String description, String referenceId) {
        Optional<Wallet> walletOpt = walletRepo.findByUser_Id(userId);
        Wallet wallet;
        if (walletOpt.isEmpty()) {
            Optional<User> userOpt = userRepo.findById(userId);
            if (userOpt.isEmpty()) return;
            wallet = new Wallet();
            wallet.setUser(userOpt.get());
            wallet.setBalance(BigDecimal.ZERO);
            wallet = walletRepo.save(wallet);
        } else {
            wallet = walletOpt.get();
        }

        WalletTransaction txn = new WalletTransaction();
        txn.setWallet(wallet);
        txn.setType(WalletTransaction.TransactionType.CREDIT);
        txn.setAmount(amount);
        txn.setDescription(description);
        txn.setReferenceId(referenceId);
        transactionRepo.save(txn);

        wallet.setBalance(wallet.getBalance().add(amount));
        walletRepo.save(wallet);
    }

    private Optional<User> getCurrentUser() {
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth == null || !auth.isAuthenticated()) return Optional.empty();
            Object principal = auth.getPrincipal();
            if (principal instanceof org.springframework.security.core.userdetails.User userDetails) {
                String email = userDetails.getUsername();
                return userRepo.findByEmailAndEnabledTrue(email);
            }
            if (principal instanceof User u) return Optional.of(u);
            return Optional.empty();
        } catch (Exception e) { return Optional.empty(); }
    }
}
