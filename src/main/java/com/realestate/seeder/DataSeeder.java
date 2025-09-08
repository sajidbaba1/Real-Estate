package com.realestate.seeder;

import com.realestate.entity.Property;
import com.realestate.repository.PropertyRepository;
import com.realestate.entity.User;
import com.realestate.repository.UserRepository;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;

@Component
public class DataSeeder {

    @Autowired
    private PropertyRepository propertyRepository;
    
    @Autowired
    private UserRepository userRepository;

    @PostConstruct
    public void seedData() {
        // Check if data already exists
        if (propertyRepository.count() == 0) {
            // Try to assign an owner to seeded properties (agent demo user if available)
            User owner = userRepository.findByEmail("agent@demo.com").orElse(null);
            // Create sample properties
            Property property1 = new Property(
                "Modern Downtown Apartment",
                "Beautiful modern apartment in the heart of downtown with stunning city views. Features include hardwood floors, granite countertops, and in-unit laundry.",
                new BigDecimal("450000"),
                "123 Main Street",
                "New York",
                "NY",
                "10001",
                2,
                2,
                1200,
                Property.PropertyType.APARTMENT,
                Property.PropertyStatus.FOR_SALE
            );
            property1.setImageUrl("https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1470&q=80");
            property1.setListingType(Property.ListingType.SALE);
            property1.setPriceType(Property.PriceType.ONE_TIME);
            if (owner != null) property1.setOwner(owner);

            Property property2 = new Property(
                "Luxury Family Villa",
                "Spacious 4-bedroom villa with private pool and garden. Located in a quiet neighborhood with excellent schools nearby. Features include a gourmet kitchen, home theater, and 3-car garage.",
                new BigDecimal("1250000"),
                "456 Oak Avenue",
                "Los Angeles",
                "CA",
                "90210",
                4,
                3,
                3500,
                Property.PropertyType.VILLA,
                Property.PropertyStatus.FOR_SALE
            );
            property2.setImageUrl("https://images.unsplash.com/photo-1600585154340-be6161a56a0c?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1470&q=80");
            property2.setListingType(Property.ListingType.SALE);
            property2.setPriceType(Property.PriceType.ONE_TIME);
            if (owner != null) property2.setOwner(owner);

            Property property3 = new Property(
                "Cozy Studio Apartment",
                "Charming studio apartment perfect for young professionals. Recently renovated with modern fixtures and appliances. Building features include gym, rooftop terrace, and 24/7 security.",
                new BigDecimal("3500"),
                "789 Pine Street",
                "Chicago",
                "IL",
                "60601",
                1,
                1,
                600,
                Property.PropertyType.APARTMENT,
                Property.PropertyStatus.FOR_RENT
            );
            property3.setImageUrl("https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1470&q=80");
            property3.setListingType(Property.ListingType.RENT);
            property3.setPriceType(Property.PriceType.MONTHLY);
            if (owner != null) property3.setOwner(owner);

            Property property4 = new Property(
                "Waterfront Condo",
                "Stunning waterfront condo with panoramic ocean views. Features include floor-to-ceiling windows, gourmet kitchen with stainless steel appliances, and access to private beach.",
                new BigDecimal("850000"),
                "101 Beach Boulevard",
                "Miami",
                "FL",
                "33139",
                3,
                2,
                1800,
                Property.PropertyType.CONDO,
                Property.PropertyStatus.FOR_SALE
            );
            property4.setImageUrl("https://images.unsplash.com/photo-1512917774080-9991f1c4c750?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1470&q=80");
            property4.setListingType(Property.ListingType.SALE);
            property4.setPriceType(Property.PriceType.ONE_TIME);
            if (owner != null) property4.setOwner(owner);

            Property property5 = new Property(
                "Historic Townhouse",
                "Beautifully restored historic townhouse in a vibrant neighborhood. Features original hardwood floors, crown molding, and a private garden. Close to parks, restaurants, and public transportation.",
                new BigDecimal("750000"),
                "202 Heritage Lane",
                "Boston",
                "MA",
                "02108",
                3,
                2,
                2200,
                Property.PropertyType.TOWNHOUSE,
                Property.PropertyStatus.FOR_SALE
            );
            property5.setImageUrl("https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1470&q=80");
            property5.setListingType(Property.ListingType.SALE);
            property5.setPriceType(Property.PriceType.ONE_TIME);
            if (owner != null) property5.setOwner(owner);

            Property property6 = new Property(
                "Mountain View Cabin",
                "Rustic cabin with breathtaking mountain views. Perfect for weekend getaways or as a permanent residence. Features include a stone fireplace, large deck, and access to hiking trails.",
                new BigDecimal("2200"),
                "303 Forest Road",
                "Denver",
                "CO",
                "80202",
                2,
                1,
                1100,
                Property.PropertyType.HOUSE,
                Property.PropertyStatus.FOR_RENT
            );
            property6.setImageUrl("https://images.unsplash.com/photo-1502005097973-6a7082348e28?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1470&q=80");
            property6.setListingType(Property.ListingType.RENT);
            property6.setPriceType(Property.PriceType.MONTHLY);
            if (owner != null) property6.setOwner(owner);

            // Save properties to database
            propertyRepository.save(property1);
            propertyRepository.save(property2);
            propertyRepository.save(property3);
            propertyRepository.save(property4);
            propertyRepository.save(property5);
            propertyRepository.save(property6);

            System.out.println("Sample data seeded successfully!");
        }
    }
}
