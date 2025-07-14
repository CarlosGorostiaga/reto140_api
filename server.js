const app = require("./app");

// Manejador para promesas rechazadas no manejadas
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Manejador para excepciones no capturadas
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    process.exit(1);
});

app.listen(app.get("port"), function () {
    console.log("🚀 RETO140 API listening on port " + app.get("port"));
    console.log("📱 Firebase Auth + PostgreSQL ready!");
    console.log("🌐 Frontend URL: http://localhost:4200");
    console.log("🔗 API URL: http://localhost:" + app.get("port"));
});