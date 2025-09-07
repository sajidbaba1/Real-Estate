package com.realestate.repository;

import com.realestate.entity.PgRoom;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PgRoomRepository extends JpaRepository<PgRoom, Long> {
    List<PgRoom> findByProperty_Id(Long propertyId);
}
