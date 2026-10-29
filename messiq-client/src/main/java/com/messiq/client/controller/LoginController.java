package com.messiq.client.controller;

import com.messiq.client.network.ApiClient;
import com.messiq.client.network.SessionManager;
import javafx.application.Platform;
import javafx.event.ActionEvent;
import javafx.fxml.FXML;
import javafx.fxml.FXMLLoader;
import javafx.scene.Parent;
import javafx.scene.Scene;
import javafx.scene.control.*;
import javafx.scene.layout.VBox;
import javafx.stage.Stage;

import java.io.IOException;
import java.util.Map;

public class LoginController {

    @FXML private VBox loginFormBox;
    @FXML private VBox registerFormBox;
    @FXML private Button tabLoginBtn;
    @FXML private Button tabRegisterBtn;

    // Login fields
    @FXML private TextField loginUsernameField;
    @FXML private PasswordField loginPasswordField;
    @FXML private Button loginSubmitBtn;

    // Register fields
    @FXML private TextField regUsernameField;
    @FXML private TextField regDisplayNameField;
    @FXML private TextField regEmailField;
    @FXML private PasswordField regPasswordField;
    @FXML private Button regSubmitBtn;

    // Alert label
    @FXML private Label alertLabel;

    private final ApiClient apiClient = SessionManager.getInstance().getApiClient();

    @FXML
    public void initialize() {
        showLoginForm();
    }

    @FXML
    public void showLoginForm() {
        loginFormBox.setVisible(true);
        loginFormBox.setManaged(true);
        registerFormBox.setVisible(false);
        registerFormBox.setManaged(false);
        tabLoginBtn.getStyleClass().add("active-tab");
        tabRegisterBtn.getStyleClass().remove("active-tab");
        hideAlert();
    }

    @FXML
    public void showRegisterForm() {
        loginFormBox.setVisible(false);
        loginFormBox.setManaged(false);
        registerFormBox.setVisible(true);
        registerFormBox.setManaged(true);
        tabRegisterBtn.getStyleClass().add("active-tab");
        tabLoginBtn.getStyleClass().remove("active-tab");
        hideAlert();
    }

    @FXML
    public void fillDemoHridyansh() {
        loginUsernameField.setText("hridyansh");
        loginPasswordField.setText("messiq123");
    }

    @FXML
    public void fillDemoMegha() {
        loginUsernameField.setText("megha");
        loginPasswordField.setText("messiq123");
    }

    @FXML
    public void fillDemoJanmejay() {
        loginUsernameField.setText("janmejay");
        loginPasswordField.setText("messiq123");
    }

    @FXML
    public void handleLogin(ActionEvent event) {
        String username = loginUsernameField.getText().trim();
        String password = loginPasswordField.getText();

        if (username.isEmpty() || password.isEmpty()) {
            showAlert("Please enter both username and password.", true);
            return;
        }

        loginSubmitBtn.setDisable(true);
        loginSubmitBtn.setText("Signing in...");

        new Thread(() -> {
            try {
                Map<String, Object> response = apiClient.login(username, password);
                Platform.runLater(() -> {
                    loginSubmitBtn.setDisable(false);
                    loginSubmitBtn.setText("Sign In");

                    if (Boolean.TRUE.equals(response.get("success"))) {
                        SessionManager.getInstance().setCurrentUser((Map<String, Object>) response.get("user"));
                        SessionManager.getInstance().setToken((String) response.get("token"));
                        navigateToMainScreen();
                    } else {
                        showAlert((String) response.get("message"), true);
                    }
                });
            } catch (Exception e) {
                Platform.runLater(() -> {
                    loginSubmitBtn.setDisable(false);
                    loginSubmitBtn.setText("Sign In");
                    showAlert("Cannot connect to messiQ server on port 8080.", true);
                });
            }
        }).start();
    }

    @FXML
    public void handleRegister(ActionEvent event) {
        String username = regUsernameField.getText().trim();
        String displayName = regDisplayNameField.getText().trim();
        String email = regEmailField.getText().trim();
        String password = regPasswordField.getText();

        if (username.isEmpty() || email.isEmpty() || password.isEmpty()) {
            showAlert("Please fill in all required fields.", true);
            return;
        }

        regSubmitBtn.setDisable(true);
        regSubmitBtn.setText("Creating Account...");

        new Thread(() -> {
            try {
                Map<String, Object> response = apiClient.register(username, email, password, displayName);
                Platform.runLater(() -> {
                    regSubmitBtn.setDisable(false);
                    regSubmitBtn.setText("Create Account");

                    if (Boolean.TRUE.equals(response.get("success"))) {
                        showAlert("Registration Successful! Logging in...", false);
                        SessionManager.getInstance().setCurrentUser((Map<String, Object>) response.get("user"));
                        SessionManager.getInstance().setToken((String) response.get("token"));
                        navigateToMainScreen();
                    } else {
                        showAlert((String) response.get("message"), true);
                    }
                });
            } catch (Exception e) {
                Platform.runLater(() -> {
                    regSubmitBtn.setDisable(false);
                    regSubmitBtn.setText("Create Account");
                    showAlert("Registration error: Server unreachable.", true);
                });
            }
        }).start();
    }

    private void showAlert(String message, boolean isError) {
        alertLabel.setText(message);
        alertLabel.setVisible(true);
        alertLabel.setManaged(true);
        if (isError) {
            alertLabel.setStyle("-fx-text-fill: #f87171; -fx-background-color: rgba(239, 68, 68, 0.15); -fx-padding: 8px 12px; -fx-background-radius: 6px;");
        } else {
            alertLabel.setStyle("-fx-text-fill: #34d399; -fx-background-color: rgba(16, 185, 129, 0.15); -fx-padding: 8px 12px; -fx-background-radius: 6px;");
        }
    }

    private void hideAlert() {
        alertLabel.setVisible(false);
        alertLabel.setManaged(false);
    }

    private void navigateToMainScreen() {
        try {
            FXMLLoader loader = new FXMLLoader(getClass().getResource("/com/messiq/client/fxml/main.fxml"));
            Parent root = loader.load();
            Stage stage = (Stage) loginSubmitBtn.getScene().getWindow();
            Scene scene = new Scene(root, 1080, 720);
            scene.getStylesheets().add(getClass().getResource("/com/messiq/client/css/styles.css").toExternalForm());
            stage.setScene(scene);
            stage.setTitle("messiQ - " + SessionManager.getInstance().getCurrentUsername());
            stage.centerOnScreen();
        } catch (IOException e) {
            e.printStackTrace();
            showAlert("Failed to load messenger dashboard: " + e.getMessage(), true);
        }
    }
}
