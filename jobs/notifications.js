const { PrismaClient } = require("@prisma/client");
const { sendNotification } = require("../services/firebaseAdmin");

const prisma = new PrismaClient();

const sendBookingReminders = async () => {
  const bookings = await prisma.booking.findMany({
    where: {
      date: {
        gte: new Date(), // Solo reservas futuras
        lte: new Date(new Date().getTime() + 24 * 60 * 60 * 1000) // Próximas 24 horas
      }
    },
    include: { user: true }
  });

  for (let booking of bookings) {
    if (booking.user.notificationToken) {
      await sendNotification(
        booking.user.notificationToken,
        `Tienes una reserva programada para ${booking.date}`
      );
    }
  }
};

module.exports = { sendBookingReminders };
