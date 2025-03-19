const express = require("express");
const { PrismaClient } = require("@prisma/client");
const authMiddleware = require("../middlewares/authMiddleware");

const router = express.Router();
const prisma = new PrismaClient();

// Obtener reservas del usuario autenticado
router.get("/", authMiddleware, async (req, res) => {
  try {
    const bookings = await prisma.booking.findMany({
      where: { userId: req.user.userId },
    });
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener reservas" });
  }
});

// Crear nueva reserva
router.post("/", authMiddleware, async (req, res) => {
    const { date, hour, serviceType } = req.body;
  
    if (!date || !hour || !serviceType) {
      return res.status(400).json({ error: "Fecha, hora y tipo de servicio son requeridos" });
    }
  
    try {
      const parsedDate = new Date(date);
  
      // ❌ Si hay una reserva de Fútbol 11 en esta hora, Fútbol 5 no puede reservarse
      const futbol11Booking = await prisma.booking.findFirst({
        where: {
          date: parsedDate,
          hour,
          serviceType: "futbol_11"
        }
      });
  
      if (futbol11Booking && serviceType === "futbol_5") {
        return res.status(400).json({ error: "No se puede reservar Fútbol 5 porque ya hay una reserva de Fútbol 11 en esta hora" });
      }
  
      // ❌ Si ya hay al menos una reserva de Fútbol 5, Fútbol 11 no puede reservarse
      const futbol5Bookings = await prisma.booking.count({
        where: {
          date: parsedDate,
          hour,
          serviceType: "futbol_5"
        }
      });
  
      if (serviceType === "futbol_11" && futbol5Bookings > 0) {
        return res.status(400).json({ error: "No se puede reservar Fútbol 11 porque ya hay reservas de Fútbol 5 en esta hora" });
      }
  
      // ❌ Si ya hay 4 reservas de Fútbol 5 en la misma hora, no permitir más
      if (serviceType === "futbol_5" && futbol5Bookings >= 4) {
        return res.status(400).json({ error: "Todas las 4 canchas de Fútbol 5 están ocupadas en esta hora" });
      }
  
      // ✅ Crear la reserva
      const booking = await prisma.booking.create({
        data: {
          userId: req.user.userId,
          date: parsedDate,
          hour,
          serviceType,
          status: "CONFIRMED"
        }
      });
  
      res.json(booking);
    } catch (error) {
      console.error("Error al crear reserva:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });
  
  
  
  
  
  

// Cancelar una reserva
router.delete("/:id", authMiddleware, async (req, res) => {
  const { id } = req.params;

  try {
    const booking = await prisma.booking.findUnique({ where: { id } });

    if (!booking || booking.userId !== req.user.userId) {
      return res.status(403).json({ error: "No autorizado" });
    }

    await prisma.booking.delete({ where: { id } });
    res.json({ message: "Reserva cancelada" });
  } catch (error) {
    res.status(500).json({ error: "Error al cancelar reserva" });
  }
});

// Verificar disponibilidad antes de reservar
router.post("/check-availability", async (req, res) => {
    const { date, serviceType } = req.body;
  
    if (!date || !serviceType) {
      return res.status(400).json({ error: "Fecha y tipo de servicio son requeridos" });
    }
  
    try {
      const formattedDate = new Date(date).toISOString().split("T")[0]; // YYYY-MM-DD
  
      // Obtener todas las reservas de ese día
      const existingBookings = await prisma.booking.findMany({
        where: {
          date: {
            gte: new Date(`${formattedDate}T00:00:00.000Z`),
            lt: new Date(`${formattedDate}T23:59:59.999Z`)
          }
        },
        select: { hour: true, serviceType: true }
      });
  
      const allHours = ["10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"];
      let blockedHours = {};
      let futbol5Count = {}; // Llevar el conteo de reservas de Fútbol 5 por hora
  
      allHours.forEach((hour) => {
        blockedHours[hour] = false;
        futbol5Count[hour] = 0;
      });
  
      existingBookings.forEach((booking) => {
        if (booking.serviceType === "futbol_11") {
          blockedHours[booking.hour] = true; // Bloquea la hora para Fútbol 5 si hay Fútbol 11
        }
        if (booking.serviceType === "futbol_5") {
          futbol5Count[booking.hour] += 1; // Cuenta cuántas reservas de Fútbol 5 hay en la misma hora
          if (futbol5Count[booking.hour] >= 4) {
            blockedHours[booking.hour] = true; // Si hay 4 reservas de Fútbol 5, bloquea la hora
          }
        }
      });
  
      // Filtrar horas disponibles según el tipo de servicio
      const availableHours = allHours.filter((hour) => !blockedHours[hour]);
  
      res.json({ available: availableHours.length > 0, hours: availableHours });
    } catch (error) {
      console.error("Error en /check-availability:", error);
      res.status(500).json({ error: "Error al verificar disponibilidad" });
    }
  });
  
  
  
  

module.exports = router;
