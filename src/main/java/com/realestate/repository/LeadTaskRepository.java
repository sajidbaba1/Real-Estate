package com.realestate.repository;

import com.realestate.entity.LeadTask;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface LeadTaskRepository extends JpaRepository<LeadTask, Long> {
    List<LeadTask> findByLead_IdOrderByCreatedAtDesc(Long leadId);
}
