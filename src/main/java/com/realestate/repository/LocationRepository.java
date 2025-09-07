package com.realestate.repository;

import com.realestate.entity.Location;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface LocationRepository extends JpaRepository<Location, Long> {
    
    Optional<Location> findByName(String name);
    
    boolean existsByName(String name);
    
    @Query("SELECT l FROM Location l ORDER BY l.name ASC")
    List<Location> findAllOrderByName();
    
    @Query("SELECT l FROM Location l WHERE LOWER(l.name) LIKE LOWER(CONCAT('%', :keyword, '%')) OR LOWER(l.description) LIKE LOWER(CONCAT('%', :keyword, '%'))")
    List<Location> searchByKeyword(String keyword);
}
