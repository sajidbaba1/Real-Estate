package com.realestate.config;

import com.realestate.entity.User;
import com.realestate.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
public class DataInitializer {

    @Bean
    CommandLineRunner initDemoUsers(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        return args -> {
            createIfNotExists(userRepository, passwordEncoder,
                    "Admin", "User", "admin@demo.com", "Demo@12345", User.Role.ADMIN);

            createIfNotExists(userRepository, passwordEncoder,
                    "Agent", "User", "agent@demo.com", "Demo@12345", User.Role.AGENT);

            createIfNotExists(userRepository, passwordEncoder,
                    "Client", "User", "user@demo.com", "Demo@12345", User.Role.USER);
        };
    }

    private void createIfNotExists(UserRepository repo, PasswordEncoder encoder,
                                   String first, String last, String email, String rawPassword, User.Role role) {
        if (repo.existsByEmail(email)) {
            return;
        }
        User u = new User();
        u.setFirstName(first);
        u.setLastName(last);
        u.setEmail(email);
        u.setPassword(encoder.encode(rawPassword));
        u.setRole(role);
        u.setEnabled(true);
        repo.save(u);
    }
}
