package com.realestate.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "pg_rooms")
public class PgRoom {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @NotBlank(message = "Room number is required")
    @Column(nullable = false)
    private String roomNumber;
    
    @Column(columnDefinition = "TEXT")
    private String description;
    
    @NotNull(message = "Property is required")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "property_id", nullable = false)
    private Property property;
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private RoomType roomType;
    
    @Enumerated(EnumType.STRING)
    private RoomCategory roomCategory;
    
    // For private rooms
    @Column(name = "private_room_price", precision = 10, scale = 2)
    private BigDecimal privateRoomPrice;
    
    // For shared rooms
    @Column(name = "bed_price", precision = 10, scale = 2)
    private BigDecimal bedPrice;
    
    @Column(name = "total_beds")
    private Integer totalBeds;
    
    @Column(name = "available_beds")
    private Integer availableBeds;
    
    @Column(name = "room_size_sqft")
    private Integer roomSizeSqft;
    
    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;
    
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
    
    @OneToMany(mappedBy = "room", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<PgBed> beds;
    
    public enum RoomType {
        PRIVATE, SHARED
    }
    
    public enum RoomCategory {
        BOYS, GIRLS, FAMILY
    }
    
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (roomType == RoomType.PRIVATE) {
            totalBeds = 1;
            availableBeds = 1;
        }
    }
    
    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
    
    // Constructors
    public PgRoom() {}
    
    public PgRoom(String roomNumber, Property property, RoomType roomType) {
        this.roomNumber = roomNumber;
        this.property = property;
        this.roomType = roomType;
    }
    
    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    
    public String getRoomNumber() { return roomNumber; }
    public void setRoomNumber(String roomNumber) { this.roomNumber = roomNumber; }
    
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    
    public Property getProperty() { return property; }
    public void setProperty(Property property) { this.property = property; }
    
    public RoomType getRoomType() { return roomType; }
    public void setRoomType(RoomType roomType) { this.roomType = roomType; }
    
    public RoomCategory getRoomCategory() { return roomCategory; }
    public void setRoomCategory(RoomCategory roomCategory) { this.roomCategory = roomCategory; }
    
    public BigDecimal getPrivateRoomPrice() { return privateRoomPrice; }
    public void setPrivateRoomPrice(BigDecimal privateRoomPrice) { this.privateRoomPrice = privateRoomPrice; }
    
    public BigDecimal getBedPrice() { return bedPrice; }
    public void setBedPrice(BigDecimal bedPrice) { this.bedPrice = bedPrice; }
    
    public Integer getTotalBeds() { return totalBeds; }
    public void setTotalBeds(Integer totalBeds) { this.totalBeds = totalBeds; }
    
    public Integer getAvailableBeds() { return availableBeds; }
    public void setAvailableBeds(Integer availableBeds) { this.availableBeds = availableBeds; }
    
    public Integer getRoomSizeSqft() { return roomSizeSqft; }
    public void setRoomSizeSqft(Integer roomSizeSqft) { this.roomSizeSqft = roomSizeSqft; }
    
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
    
    public List<PgBed> getBeds() { return beds; }
    public void setBeds(List<PgBed> beds) { this.beds = beds; }
}
