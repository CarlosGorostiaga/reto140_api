const { Router } = require("express");
const router = Router();
const groupsCtrl = require("../controllers/groups.controller");
const authCtrl = require("../controllers/auth.controller"); // Solo para el middleware verifyToken

// ================================
// RUTAS DE GRUPOS (Todas requieren autenticación)
// ================================

// Crear grupo
router.post("/create", authCtrl.verifyToken, groupsCtrl.createGroup);

// Unirse a grupo por código
router.post("/join", authCtrl.verifyToken, groupsCtrl.joinGroup);

// Obtener mis grupos
router.get("/my-groups", authCtrl.verifyToken, groupsCtrl.getMyGroups);

// Obtener detalles específicos de un grupo
router.get("/:groupId", authCtrl.verifyToken, groupsCtrl.getGroupDetails);

// Salir de un grupo
router.delete("/:groupId/leave", authCtrl.verifyToken, groupsCtrl.leaveGroup);

module.exports = router;