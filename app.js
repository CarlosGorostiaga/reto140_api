const express = require("express");
const cors = require("cors");
require('dotenv').config();

const { errorHandling } = require("./src/error/errorHandling");
const authRouters = require("./src/routers/auth.routers");

const app = express();

// Configuración
app.set("port", process.env.PORT || 3000);

// CORS configurado para múltiples orígenes
const allowedOrigins = [
    'http://localhost:4200',        // Para desarrollo local
    'https://reto140.vercel.app',   // Para producción
    'http://localhost:3000',        // Por si usas otro puerto local
    'http://127.0.0.1:4200'         // Alternativa de localhost
];

app.use(cors({
    origin: function (origin, callback) {
        // Permitir requests sin origin (ej: mobile apps, Postman)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            console.log('❌ CORS blocked origin:', origin);
            callback(new Error('No permitido por CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
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