const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { PrismaClient } = require("@prisma/client");

const router = express.Router();
const prisma = new PrismaClient();

router.post("/register", async (req, res) => {
  const { firstName, secondName, firstLastName, secondLastName, phone, email, password, role } = req.body;

  if (!firstName || !firstLastName || !phone || !email || !password) {
    return res.status(400).json({ error: "Todos los campos obligatorios deben ser completados." });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await prisma.user.create({
      data: {
        firstName,
        secondName,
        firstLastName,
        secondLastName,
        phone,
        email,
        password: hashedPassword,
        role,
      },
    });

    res.status(201).json({ message: "Usuario registrado exitosamente" });
  } catch (error) {
    console.error("Error al registrar usuario:", error);
    res.status(500).json({ error: "Error en el servidor" });
  }
});


router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const token = jwt.sign(
    { userId: user.id, 
      email: user.email, 
      role: user.role, 
      firstName: user.firstName, 
      firstLastName: user.firstLastName,  
      phone: user.phone,
      courtNumber: user.courtNumber 
    },
      process.env.JWT_SECRET,
    { expiresIn: "2h" }
  );
  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      firstLastName: user.firstLastName,
      phone: user.phone,
      courtNumber: user.courtNumber,
    }
  });
});

module.exports = router;
