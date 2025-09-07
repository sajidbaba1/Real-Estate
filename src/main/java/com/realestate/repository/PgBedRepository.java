package com.realestate.repository;

import com.realestate.entity.PgBed;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PgBedRepository extends JpaRepository<PgBed, Long> {
    List<PgBed> findByRoom_Id(Long roomId);
}
