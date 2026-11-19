package com.messiq.server.config;

import com.messiq.server.model.Message;
import com.messiq.server.model.MessageStatus;
import com.messiq.server.model.MessageType;
import com.messiq.server.model.User;
import com.messiq.server.model.UserStatus;
import com.messiq.server.repository.MessageRepository;
import com.messiq.server.repository.UserRepository;
import com.messiq.server.service.UserService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.List;

@Component
public class DataInitializer implements CommandLineRunner {

    private static final Logger logger = LoggerFactory.getLogger(DataInitializer.class);

    private final UserRepository userRepository;
    private final MessageRepository messageRepository;

    public DataInitializer(UserRepository userRepository, MessageRepository messageRepository) {
        this.userRepository = userRepository;
        this.messageRepository = messageRepository;
    }

    @Override
    public void run(String... args) {
        logger.info("Synchronizing messiQ database: verifying required default users...");

        String defaultHashedPassword = UserService.hashPassword("messiq123");

        // Ensure User 1: hridyansh exists
        if (userRepository.findByUsername("hridyansh").isEmpty()) {
            User hridyansh = new User("hridyansh", "hridyansh5492@gmail.com", defaultHashedPassword, "Hridyansh Sati");
            hridyansh.setAvatarUrl("https://api.dicebear.com/7.x/bottts/svg?seed=hridyansh");
            hridyansh.setStatus(UserStatus.ONLINE);
            hridyansh.setLastSeen(LocalDateTime.now());
            userRepository.save(hridyansh);
            logger.info("Created user: hridyansh");
        }

        // Ensure User 2: megha exists
        if (userRepository.findByUsername("megha").isEmpty()) {
            User megha = new User("megha", "megha.dhami@gehu.ac.in", defaultHashedPassword, "Megha Dhami");
            megha.setAvatarUrl("https://api.dicebear.com/7.x/bottts/svg?seed=megha");
            megha.setStatus(UserStatus.ONLINE);
            megha.setLastSeen(LocalDateTime.now());
            userRepository.save(megha);
            logger.info("Created user: megha");
        }

        // Ensure User 3: hrithik exists
        if (userRepository.findByUsername("hrithik").isEmpty()) {
            User hrithik = new User("hrithik", "hrithik.bashera@gehu.ac.in", defaultHashedPassword, "Hrithik Bashera");
            hrithik.setAvatarUrl("https://api.dicebear.com/7.x/bottts/svg?seed=hrithik");
            hrithik.setStatus(UserStatus.OFFLINE);
            hrithik.setLastSeen(LocalDateTime.now().minusHours(2));
            userRepository.save(hrithik);
            logger.info("Created user: hrithik");
        }

        logger.info("messiQ database ready.");
    }
}
