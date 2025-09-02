package com.realestate.service;

import com.realestate.entity.Favorite;
import com.realestate.entity.Property;
import com.realestate.entity.User;
import com.realestate.repository.FavoriteRepository;
import com.realestate.repository.PropertyRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class FavoriteService {
    
    @Autowired
    private FavoriteRepository favoriteRepository;
    
    @Autowired
    private PropertyRepository propertyRepository;
    
    public List<Property> getUserFavorites(User user) {
        return favoriteRepository.findFavoritePropertiesByUser(user);
    }
    
    @Transactional
    public void addToFavorites(User user, Long propertyId) {
        Property property = propertyRepository.findById(propertyId)
                .orElseThrow(() -> new RuntimeException("Property not found"));
        
        if (!favoriteRepository.existsByUserAndProperty(user, property)) {
            Favorite favorite = new Favorite(user, property);
            favoriteRepository.save(favorite);
        } else {
            throw new RuntimeException("Property is already in favorites");
        }
    }
    
    @Transactional
    public void removeFromFavorites(User user, Long propertyId) {
        Property property = propertyRepository.findById(propertyId)
                .orElseThrow(() -> new RuntimeException("Property not found"));
        
        favoriteRepository.deleteByUserAndProperty(user, property);
    }
    
    public boolean isPropertyFavorited(User user, Long propertyId) {
        Property property = propertyRepository.findById(propertyId)
                .orElseThrow(() -> new RuntimeException("Property not found"));
        
        return favoriteRepository.existsByUserAndProperty(user, property);
    }
    
    public long getFavoritesCount(User user) {
        return favoriteRepository.countByUser(user);
    }
}
