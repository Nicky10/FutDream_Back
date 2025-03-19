require("dotenv").config();
const express = require("express");
const cors = require("cors");
const authRoutes = require("./routes/auth");
const bookingRoutes = require("./routes/booking");
const { sendBookingReminders } = require("./jobs/notifications");

const app = express();
app.use(cors());
app.use(express.json());

// Rutas
app.use("/auth", authRoutes);
app.use("/bookings", bookingRoutes);

setInterval(() => {
    console.log("Verificando recordatorios de reservas...");
    sendBookingReminders();
  }, 60 * 60 * 1000); // Ejecutar cada hora

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
