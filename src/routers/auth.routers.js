const { Router } = require("express");
const router = Router();
const authCtrl = require("../controllers/auth.controller");

// Rutas públicas
router.get("/test", authCtrl.testApi);

// Rutas protegidas (requieren token Firebase)
router.get("/me", authCtrl.verifyToken, authCtrl.getCurrentUser);
router.get("/stats", authCtrl.verifyToken, authCtrl.getStats);
router.get("/workouts", authCtrl.verifyToken, authCtrl.getWorkouts);
router.put("/profile", authCtrl.verifyToken, authCtrl.updateProfile);
router.put("/streak", authCtrl.verifyToken, authCtrl.updateStreak);
router.post("/workout", authCtrl.verifyToken, authCtrl.addWorkout);

module.exports = router;