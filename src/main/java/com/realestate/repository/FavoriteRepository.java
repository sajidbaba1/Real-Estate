package com.realestate.repository;

import com.realestate.entity.Favorite;
import com.realestate.entity.Property;
import com.realestate.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FavoriteRepository extends JpaRepository<Favorite, Long> {
    
    List<Favorite> findByUserOrderByCreatedAtDesc(User user);
    
    Optional<Favorite> findByUserAndProperty(User user, Property property);
    
    boolean existsByUserAndProperty(User user, Property property);
    
    void deleteByUserAndProperty(User user, Property property);
    
    @Query("SELECT f.property FROM Favorite f WHERE f.user = :user ORDER BY f.createdAt DESC")
    List<Property> findFavoritePropertiesByUser(@Param("user") User user);
    
    long countByUser(User user);
}
