const express = require("express");
const { PrismaClient, ServiceType } = require("@prisma/client"); // Importar el ENUM
const authMiddleware = require("../middlewares/authMiddleware");

const router = express.Router();
const prisma = new PrismaClient();

// Mapeo de nombres de servicio en string al ENUM de Prisma
const serviceTypeEnum = {
  futbol_5: ServiceType.FUTBOL_5,
  futbol_11: ServiceType.FUTBOL_11,
  padel: ServiceType.PADEL,
  bolos: ServiceType.BOLOS,
};

// Límites de canchas por servicio
const courtLimits = {
  FUTBOL_5: 4,
  FUTBOL_11: 1,
  PADEL: 3,
  BOLOS: 5,
};

// Obtener reservas del usuario autenticado
router.get("/", authMiddleware, async (req, res) => {
  try {
    const bookings = await prisma.booking.findMany({
      where: { userId: req.user.userId },
      orderBy: { date: "desc" }, // Opcional
    });
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener reservas" });
  }
});


// Crear nueva reserva
// Crear nueva reserva
router.post("/", authMiddleware, async (req, res) => {
  const { date, hour, serviceType, courtNumber } = req.body;

  console.log("🟢 Recibido en /bookings:", { date, hour, serviceType, courtNumber });

  try {
    const maxCourts = courtLimits[serviceTypeEnum[serviceType]];

    // 🔹 Verificar reservas en la misma hora
    const existingBookings = await prisma.booking.findMany({
      where: { 
        date: new Date(date), 
        hour, 
        serviceType: serviceTypeEnum[serviceType.toLowerCase()]
      }
    });

    console.log("🔍 Reservas existentes:", existingBookings);

    if (existingBookings.length >= maxCourts) {
      return res.status(400).json({ error: "No hay canchas disponibles en esta hora" });
    }

    // 🔹 Validar si la cancha está disponible
    if (existingBookings.some(b => b.courtNumber === courtNumber)) {
      return res.status(400).json({ error: `La cancha #${courtNumber} ya está reservada en este horario` });
    }

    // 🔹 Crear reserva
    const booking = await prisma.booking.create({
      data: {
        userId: req.user.userId,
        date: new Date(date),
        hour,
        serviceType: serviceTypeEnum[serviceType.toLowerCase()], // ✅ Convertir al ENUM
        courtNumber,
        status: "CONFIRMED",
      },
    });

    console.log("✅ Reserva creada:", booking);
    res.json(booking);
  } catch (error) {
    console.error("❌ Error al crear reserva:", error);
    res.status(500).json({ error: "Error al crear reserva", details: error.message });
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
// Verificar disponibilidad antes de reservar
// Verificar disponibilidad antes de reservar
router.post("/check-availability", async (req, res) => {
  const { date, serviceType } = req.body;

  if (!date || !serviceType) {
    return res.status(400).json({ error: "Fecha y tipo de servicio son requeridos" });
  }

  try {
    const formattedDate = new Date(date).toISOString().split("T")[0];

    // 🔹 Definir el número máximo de canchas por servicio
    const courtLimits = {
      FUTBOL_5: 4,
      FUTBOL_11: 1,
      PADEL: 3,
      BOLOS: 5
    };

    const maxCourts = courtLimits[serviceType];

    // Obtener todas las reservas de ese día y servicio
    const existingBookings = await prisma.booking.findMany({
      where: {
        date: new Date(formattedDate),
        serviceType
      },
      select: { hour: true, courtNumber: true }
    });

    // 🔹 Definir las horas disponibles por defecto
    const allHours = ["10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"];
    let availableHours = [];

    allHours.forEach((hour) => {
      const bookingsAtHour = existingBookings.filter(b => b.hour === hour);
      const courtsTaken = bookingsAtHour.length;

      if (courtsTaken < maxCourts) {
        availableHours.push({
          hour,
          availableCourts: maxCourts - courtsTaken, // Muestra cuántas canchas quedan disponibles
          occupiedCourts: bookingsAtHour.map(b => b.courtNumber) // Canchas ya reservadas
        });
      }
    });

    // ✅ Devolver la respuesta con las horas disponibles y la ocupación de canchas
    res.json({
      available: availableHours.length > 0,
      hours: availableHours
    });
  } catch (error) {
    console.error("Error en /check-availability:", error);
    res.status(500).json({ error: "Error al verificar disponibilidad" });
  }
});




module.exports = router;
