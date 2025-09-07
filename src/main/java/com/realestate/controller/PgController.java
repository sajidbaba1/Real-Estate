package com.realestate.controller;

import com.realestate.entity.PgBed;
import com.realestate.entity.PgRoom;
import com.realestate.entity.Property;
import com.realestate.entity.User;
import com.realestate.repository.PgBedRepository;
import com.realestate.repository.PgRoomRepository;
import com.realestate.repository.PropertyRepository;
import com.realestate.repository.UserRepository;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/pg")
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:5175", "https://real-estate-alpha-sandy.vercel.app"})
public class PgController {

    @Autowired private PgRoomRepository pgRoomRepository;
    @Autowired private PgBedRepository pgBedRepository;
    @Autowired private PropertyRepository propertyRepository;
    @Autowired private UserRepository userRepository;

    // ===== ROOMS =====

    public static class CreateRoomRequest {
        public Long propertyId;
        public String roomNumber;
        public String description;
        public PgRoom.RoomType roomType; // PRIVATE or SHARED
        public PgRoom.RoomCategory roomCategory; // BOYS/GIRLS/FAMILY
        public BigDecimal privateRoomPrice; // when PRIVATE
        public BigDecimal bedPrice;         // when SHARED
        public Integer totalBeds;           // when SHARED
        public Integer roomSizeSqft;
    }

    @GetMapping("/rooms/property/{propertyId}")
    @PreAuthorize("hasAnyRole('ADMIN','AGENT')")
    public ResponseEntity<?> listRoomsForProperty(@PathVariable Long propertyId) {
        Optional<Property> propertyOpt = propertyRepository.findById(propertyId);
        if (propertyOpt.isEmpty()) return ResponseEntity.notFound().build();
        Property p = propertyOpt.get();
        if (!canManageProperty(p)) return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        List<PgRoom> rooms = pgRoomRepository.findByProperty_Id(propertyId);
        return ResponseEntity.ok(rooms);
    }

    @PostMapping("/rooms")
    @PreAuthorize("hasAnyRole('ADMIN','AGENT')")
    public ResponseEntity<?> createRoom(@Valid @RequestBody CreateRoomRequest req) {
        if (req.propertyId == null) return ResponseEntity.badRequest().body("propertyId is required");
        Optional<Property> propertyOpt = propertyRepository.findById(req.propertyId);
        if (propertyOpt.isEmpty()) return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Property not found");
        Property property = propertyOpt.get();
        if (!canManageProperty(property)) return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        if (Boolean.FALSE.equals(property.getIsPgListing())) return ResponseEntity.badRequest().body("Property is not marked as PG listing");

        PgRoom room = new PgRoom();
        room.setProperty(property);
        room.setRoomNumber(req.roomNumber);
        room.setDescription(req.description);
        room.setRoomType(req.roomType);
        room.setRoomCategory(req.roomCategory);
        room.setRoomSizeSqft(req.roomSizeSqft);
        if (req.roomType == PgRoom.RoomType.PRIVATE) {
            room.setPrivateRoomPrice(req.privateRoomPrice);
            room.setTotalBeds(1);
            room.setAvailableBeds(1);
        } else {
            room.setBedPrice(req.bedPrice);
            room.setTotalBeds(req.totalBeds != null ? req.totalBeds : 0);
            room.setAvailableBeds(room.getTotalBeds());
        }
        PgRoom saved = pgRoomRepository.save(room);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @PutMapping("/rooms/{roomId}")
    @PreAuthorize("hasAnyRole('ADMIN','AGENT')")
    public ResponseEntity<?> updateRoom(@PathVariable Long roomId, @Valid @RequestBody CreateRoomRequest req) {
        Optional<PgRoom> roomOpt = pgRoomRepository.findById(roomId);
        if (roomOpt.isEmpty()) return ResponseEntity.notFound().build();
        PgRoom room = roomOpt.get();
        if (!canManageProperty(room.getProperty())) return ResponseEntity.status(HttpStatus.FORBIDDEN).build();

        if (req.roomNumber != null) room.setRoomNumber(req.roomNumber);
        if (req.description != null) room.setDescription(req.description);
        if (req.roomCategory != null) room.setRoomCategory(req.roomCategory);
        if (req.roomSizeSqft != null) room.setRoomSizeSqft(req.roomSizeSqft);

        if (room.getRoomType() == PgRoom.RoomType.PRIVATE) {
            if (req.privateRoomPrice != null) room.setPrivateRoomPrice(req.privateRoomPrice);
        } else {
            if (req.bedPrice != null) room.setBedPrice(req.bedPrice);
            if (req.totalBeds != null) {
                int delta = req.totalBeds - (room.getTotalBeds() != null ? room.getTotalBeds() : 0);
                room.setTotalBeds(req.totalBeds);
                // do not auto change availableBeds blindly, keep as-is unless increasing capacity
                if (delta > 0 && room.getAvailableBeds() != null) {
                    room.setAvailableBeds(room.getAvailableBeds() + delta);
                }
            }
        }
        return ResponseEntity.ok(pgRoomRepository.save(room));
    }

    @DeleteMapping("/rooms/{roomId}")
    @PreAuthorize("hasAnyRole('ADMIN','AGENT')")
    public ResponseEntity<?> deleteRoom(@PathVariable Long roomId) {
        Optional<PgRoom> roomOpt = pgRoomRepository.findById(roomId);
        if (roomOpt.isEmpty()) return ResponseEntity.notFound().build();
        PgRoom room = roomOpt.get();
        if (!canManageProperty(room.getProperty())) return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        pgRoomRepository.deleteById(roomId);
        return ResponseEntity.noContent().build();
    }

    // ===== BEDS =====

    public static class CreateBedRequest {
        public Long roomId;
        public String bedNumber;
    }

    @GetMapping("/beds/room/{roomId}")
    @PreAuthorize("hasAnyRole('ADMIN','AGENT')")
    public ResponseEntity<?> listBeds(@PathVariable Long roomId) {
        Optional<PgRoom> roomOpt = pgRoomRepository.findById(roomId);
        if (roomOpt.isEmpty()) return ResponseEntity.notFound().build();
        PgRoom room = roomOpt.get();
        if (!canManageProperty(room.getProperty())) return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        return ResponseEntity.ok(pgBedRepository.findByRoom_Id(roomId));
    }

    @PostMapping("/beds")
    @PreAuthorize("hasAnyRole('ADMIN','AGENT')")
    public ResponseEntity<?> createBed(@Valid @RequestBody CreateBedRequest req) {
        if (req.roomId == null) return ResponseEntity.badRequest().body("roomId is required");
        Optional<PgRoom> roomOpt = pgRoomRepository.findById(req.roomId);
        if (roomOpt.isEmpty()) return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Room not found");
        PgRoom room = roomOpt.get();
        if (room.getRoomType() != PgRoom.RoomType.SHARED) return ResponseEntity.badRequest().body("Beds are only for SHARED rooms");
        if (!canManageProperty(room.getProperty())) return ResponseEntity.status(HttpStatus.FORBIDDEN).build();

        PgBed bed = new PgBed();
        bed.setRoom(room);
        bed.setBedNumber(req.bedNumber);
        PgBed saved = pgBedRepository.save(bed);

        if (room.getTotalBeds() == null) room.setTotalBeds(0);
        if (room.getAvailableBeds() == null) room.setAvailableBeds(0);
        room.setTotalBeds(room.getTotalBeds() + 1);
        room.setAvailableBeds(room.getAvailableBeds() + 1);
        pgRoomRepository.save(room);

        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @DeleteMapping("/beds/{bedId}")
    @PreAuthorize("hasAnyRole('ADMIN','AGENT')")
    public ResponseEntity<?> deleteBed(@PathVariable Long bedId) {
        Optional<PgBed> bedOpt = pgBedRepository.findById(bedId);
        if (bedOpt.isEmpty()) return ResponseEntity.notFound().build();
        PgBed bed = bedOpt.get();
        PgRoom room = bed.getRoom();
        if (!canManageProperty(room.getProperty())) return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        pgBedRepository.deleteById(bedId);
        if (room.getTotalBeds() != null && room.getTotalBeds() > 0) room.setTotalBeds(room.getTotalBeds() - 1);
        if (room.getAvailableBeds() != null && room.getAvailableBeds() > 0) room.setAvailableBeds(room.getAvailableBeds() - 1);
        pgRoomRepository.save(room);
        return ResponseEntity.noContent().build();
    }

    // ===== Helpers =====
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

    private boolean canManageProperty(Property property) {
        Optional<User> userOpt = getCurrentUser();
        if (userOpt.isEmpty()) return false;
        User u = userOpt.get();
        if (u.getRole() == User.Role.ADMIN) return true;
        return property.getOwner() != null && property.getOwner().getId().equals(u.getId());
    }
}
