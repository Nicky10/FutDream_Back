const admin = require("firebase-admin");
const path = require("path");

// Ruta absoluta al archivo JSON de credenciales
const serviceAccountPath = path.join(__dirname, "firebase-service-account.json");

admin.initializeApp({
  credential: admin.credential.cert(require(serviceAccountPath))
});

const messaging = admin.messaging();

const sendNotification = async (token, message) => {
  try {
    await messaging.send({
      token,
      notification: {
        title: "Recordatorio de Reserva",
        body: message
      }
    });
    console.log("Notificación enviada");
  } catch (error) {
    console.error("Error enviando notificación:", error);
  }
};

module.exports = { sendNotification };
