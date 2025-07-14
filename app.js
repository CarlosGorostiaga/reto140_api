const express = require("express");
const cors = require("cors");
require('dotenv').config();

const { errorHandling } = require("./src/error/errorHandling");
const authRouters = require("./src/routers/auth.routers");

const app = express();

// Configuración
app.set("port", process.env.PORT || 3000);

// Middlewares globales
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:4200',
    credentials: true
}));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        service: 'reto140-api',
        timestamp: new Date().toISOString(),
        database: 'Connected to Railway PostgreSQL',
        auth: 'Firebase Auth Ready'
    });
});

// Rutas principales
app.use('/api/auth', authRouters);

// 404 Handler
app.use(function (req, res, next) {
    res.status(404).json({
        error: true,
        codigo: 404,
        message: "Endpoint not found"
    });
});

// Error Handler
app.use(errorHandling);

module.exports = app;