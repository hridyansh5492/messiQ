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

            User maya = new User("maya", "maya.chen@messiq.com", defaultHashedPassword, "Maya Chen");
            maya.setAvatarUrl("https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80");
            maya.setStatus(UserStatus.ONLINE);
            maya.setLastSeen(LocalDateTime.now());
            maya = userRepository.save(maya);

            User janmejay = new User("janmejay", "janmejay.pant@gehu.ac.in", defaultHashedPassword, "Prof. Janmejay Pant");
            janmejay.setAvatarUrl("https://api.dicebear.com/7.x/bottts/svg?seed=janmejay");
            janmejay.setStatus(UserStatus.ONLINE);
            janmejay.setLastSeen(LocalDateTime.now());
            janmejay = userRepository.save(janmejay);

            seedFigmaConversation(hridyansh, maya);

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

            logger.info("Demo data initialized successfully with users and Figma conversations.");
        } else if (userRepository.findByUsername("maya").isEmpty()) {
            logger.info("Seeding Maya Chen (Figma Design user)...");
            String defaultHashedPassword = UserService.hashPassword("messiq123");
            User maya = new User("maya", "maya.chen@messiq.com", defaultHashedPassword, "Maya Chen");
            maya.setAvatarUrl("https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80");
            maya.setStatus(UserStatus.ONLINE);
            User savedMaya = userRepository.save(maya);

            userRepository.findByUsername("hridyansh").ifPresent(hridyansh -> seedFigmaConversation(hridyansh, savedMaya));
            logger.info("Maya Chen seeded successfully.");
        }
    }

    private void seedFigmaConversation(User hridyansh, User maya) {
        Message figmaMsg1 = new Message(maya.getId(), maya.getUsername(), hridyansh.getId(), hridyansh.getUsername(),
                "Hey Alex! Remember that little escape we talked about? 🌿");
        figmaMsg1.setStatus(MessageStatus.READ);
        figmaMsg1.setTimestamp(LocalDateTime.now().minusMinutes(22));
        messageRepository.save(figmaMsg1);

        Message figmaMsg2 = new Message(hridyansh.getId(), hridyansh.getUsername(), maya.getId(), maya.getUsername(),
                "Of course. Please tell me you found the place.");
        figmaMsg2.setStatus(MessageStatus.READ);
        figmaMsg2.setTimestamp(LocalDateTime.now().minusMinutes(20));
        messageRepository.save(figmaMsg2);

        Message figmaMsg3 = new Message(maya.getId(), maya.getUsername(), hridyansh.getId(), hridyansh.getUsername(),
                "Found our kind of quiet. Imagine the next shoot here.");
        figmaMsg3.setType(MessageType.IMAGE);
        figmaMsg3.setMediaUrl("https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=600&auto=format&fit=crop&q=80");
        figmaMsg3.setFileName("Casa Olivo • Mallorca, Spain");
        figmaMsg3.setStatus(MessageStatus.READ);
        figmaMsg3.setTimestamp(LocalDateTime.now().minusMinutes(16));
        messageRepository.save(figmaMsg3);

        Message figmaMsg4 = new Message(hridyansh.getId(), hridyansh.getUsername(), maya.getId(), maya.getUsername(),
                "The light, The textures, I'm already there. Let's make this our November story.");
        figmaMsg4.setStatus(MessageStatus.READ);
        figmaMsg4.setTimestamp(LocalDateTime.now().minusMinutes(14));
        messageRepository.save(figmaMsg4);

        Message figmaMsg5 = new Message(maya.getId(), maya.getUsername(), hridyansh.getId(), hridyansh.getUsername(),
                "[VOICE_NOTE]");
        figmaMsg5.setStatus(MessageStatus.READ);
        figmaMsg5.setTimestamp(LocalDateTime.now().minusMinutes(8));
        messageRepository.save(figmaMsg5);
    }
}
