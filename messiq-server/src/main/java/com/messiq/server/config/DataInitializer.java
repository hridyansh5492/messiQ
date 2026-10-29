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
        if (userRepository.count() == 0) {
            logger.info("Initializing demo users and conversations for messiQ...");

            String defaultHashedPassword = UserService.hashPassword("messiq123");

            User hridyansh = new User("hridyansh", "hridyansh5492@gmail.com", defaultHashedPassword, "Hridyansh Sati");
            hridyansh.setAvatarUrl("https://api.dicebear.com/7.x/bottts/svg?seed=hridyansh");
            hridyansh.setStatus(UserStatus.ONLINE);
            hridyansh.setLastSeen(LocalDateTime.now());
            hridyansh = userRepository.save(hridyansh);

            User megha = new User("megha", "megha.dhami@gehu.ac.in", defaultHashedPassword, "Megha Dhami");
            megha.setAvatarUrl("https://api.dicebear.com/7.x/bottts/svg?seed=megha");
            megha.setStatus(UserStatus.ONLINE);
            megha.setLastSeen(LocalDateTime.now());
            megha = userRepository.save(megha);

            User hrithik = new User("hrithik", "hrithik.bashera@gehu.ac.in", defaultHashedPassword, "Hrithik Bashera");
            hrithik.setAvatarUrl("https://api.dicebear.com/7.x/bottts/svg?seed=hrithik");
            hrithik.setStatus(UserStatus.OFFLINE);
            hrithik.setLastSeen(LocalDateTime.now().minusHours(2));
            hrithik = userRepository.save(hrithik);

            User janmejay = new User("janmejay", "janmejay.pant@gehu.ac.in", defaultHashedPassword, "Prof. Janmejay Pant");
            janmejay.setAvatarUrl("https://api.dicebear.com/7.x/bottts/svg?seed=janmejay");
            janmejay.setStatus(UserStatus.ONLINE);
            janmejay.setLastSeen(LocalDateTime.now());
            janmejay = userRepository.save(janmejay);

            // Sample Welcome Messages
            Message msg1 = new Message(hridyansh.getId(), hridyansh.getUsername(), megha.getId(), megha.getUsername(),
                    "Hi Megha! The real-time messenger messiQ is live and running smoothly!");
            msg1.setStatus(MessageStatus.READ);
            msg1.setTimestamp(LocalDateTime.now().minusMinutes(25));
            messageRepository.save(msg1);

            Message msg2 = new Message(megha.getId(), megha.getUsername(), hridyansh.getId(), hridyansh.getUsername(),
                    "Awesome Hridyansh! WebSocket messaging and media upload look super fast.");
            msg2.setStatus(MessageStatus.READ);
            msg2.setTimestamp(LocalDateTime.now().minusMinutes(20));
            messageRepository.save(msg2);

            Message msg3 = new Message(janmejay.getId(), janmejay.getUsername(), hridyansh.getId(), hridyansh.getUsername(),
                    "Great work on the architecture design, Group 24! Both JavaFX and WebSocket endpoints meet all requirements.");
            msg3.setStatus(MessageStatus.READ);
            msg3.setTimestamp(LocalDateTime.now().minusMinutes(10));
            messageRepository.save(msg3);

            logger.info("Demo data initialized successfully with 4 users and sample conversations.");
        }
    }
}
