package com.messiq.client;

import javafx.application.Application;
import javafx.application.Platform;
import javafx.fxml.FXMLLoader;
import javafx.scene.Parent;
import javafx.scene.Scene;
import javafx.stage.Stage;

public class MessiqClientApplication extends Application {

    @Override
    public void start(Stage primaryStage) throws Exception {
        FXMLLoader loader = new FXMLLoader(getClass().getResource("/com/messiq/client/fxml/login.fxml"));
        Parent root = loader.load();

        Scene scene = new Scene(root, 480, 640);
        scene.getStylesheets().add(getClass().getResource("/com/messiq/client/css/styles.css").toExternalForm());

        primaryStage.setTitle("messiQ - Real-Time Messenger");
        primaryStage.setScene(scene);
        primaryStage.setResizable(true);
        primaryStage.setMinWidth(440);
        primaryStage.setMinHeight(580);

        primaryStage.setOnCloseRequest(e -> {
            Platform.exit();
            System.exit(0);
        });

        primaryStage.show();
    }

    public static void main(String[] args) {
        launch(args);
    }
}
