package com.realestate.repository;

import com.realestate.entity.Lead;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface LeadRepository extends JpaRepository<Lead, Long> {
    List<Lead> findByAssignedAgent_Id(Long agentId);

    @Query("SELECT l FROM Lead l WHERE (:stage IS NULL OR l.stage = :stage) AND (:city IS NULL OR LOWER(l.city) = LOWER(:city))")
    List<Lead> findByFilters(Lead.Stage stage, String city);

    @Query("SELECT l FROM Lead l WHERE l.assignedAgent.id = :agentId AND (:stage IS NULL OR l.stage = :stage) AND (:city IS NULL OR LOWER(l.city) = LOWER(:city))")
    List<Lead> findByAgentWithFilters(Long agentId, Lead.Stage stage, String city);
}
