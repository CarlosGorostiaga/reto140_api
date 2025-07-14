const { query } = require('../../config/database');
const { auth } = require('../../config/firebase');

// *********************************** MIDDLEWARE DE VERIFICACIÓN DE TOKEN ***********************************

async function verifyToken(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                error: true,
                message: 'Token de autorización requerido'
            });
        }

        const token = authHeader.substring(7);
        const decodedToken = await auth.verifyIdToken(token);
        
        // Buscar usuario en PostgreSQL
        const userResult = await query(
            'SELECT * FROM users WHERE firebase_uid = $1',
            [decodedToken.uid]
        );

        let user = userResult.rows[0];

        if (!user) {
            // Crear usuario si no existe
            const createResult = await query(`
                INSERT INTO users (firebase_uid, email, display_name, photo_url, email_verified, created_at, updated_at)
                VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
                RETURNING *
            `, [
                decodedToken.uid,
                decodedToken.email,
                decodedToken.name || decodedToken.email?.split('@')[0],
                decodedToken.picture || null,
                decodedToken.email_verified || false
            ]);
            
            user = createResult.rows[0];
            console.log('✅ New user created:', user.email);
        } else {
            // Actualizar último login
            await query(
                'UPDATE users SET last_login_at = NOW(), updated_at = NOW() WHERE firebase_uid = $1',
                [decodedToken.uid]
            );
        }

        req.user = {
            id: user.id,
            firebaseUid: decodedToken.uid,
            email: decodedToken.email,
            displayName: user.display_name,
            emailVerified: decodedToken.email_verified,
            dbUser: user
        };

        next();
    } catch (error) {
        console.error('❌ Token verification error:', error.message);
        return res.status(401).json({
            error: true,
            message: 'Token inválido'
        });
    }
}

// *********************************** RUTA DE PRUEBA DE API ***********************************

async function testApi(req, res) {
    try {
        res.json({
            error: false,
            message: 'RETO140 API funcionando correctamente',
            timestamp: new Date().toISOString(),
            service: 'reto140-api',
            version: '1.0.0',
            endpoints: [
                'GET /api/auth/test - Prueba de API',
                'GET /api/auth/me - Usuario actual (requiere token)',
                'GET /api/auth/stats - Estadísticas (requiere token)',
                'PUT /api/auth/profile - Actualizar perfil (requiere token)',
                'POST /api/auth/workout - Agregar entrenamiento (requiere token)'
            ]
        });
    } catch (error) {
        console.error("Error en test de API:", error);
        res.status(500).json({ error: "Error interno en test de API" });
    }
}

// *********************************** OBTENER USUARIO ACTUAL ***********************************

async function getCurrentUser(req, res) {
    try {
        const user = req.user.dbUser;
        
        res.json({
            error: false,
            message: 'Usuario obtenido exitosamente',
            user: {
                id: user.id,
                email: user.email,
                displayName: user.display_name,
                photoURL: user.photo_url,
                emailVerified: user.email_verified,
                isActive: user.is_active,
                currentStreak: user.current_streak,
                totalWorkouts: user.total_workouts,
                joinedAt: user.joined_at,
                lastLoginAt: user.last_login_at
            }
        });
    } catch (error) {
        console.error("Error al obtener usuario actual:", error);
        res.status(500).json({ error: "Error interno al obtener usuario" });
    }
}

// *********************************** OBTENER ESTADÍSTICAS DE USUARIO ***********************************

async function getStats(req, res) {
    try {
        const user = req.user.dbUser;

        const stats = {
            currentStreak: user.current_streak || 0,
            totalWorkouts: user.total_workouts || 0,
            joinedDaysAgo: Math.floor((new Date() - new Date(user.joined_at)) / (1000 * 60 * 60 * 24)),
            lastLogin: user.last_login_at,
            isActive: user.is_active
        };

        res.json({
            error: false,
            message: 'Estadísticas obtenidas exitosamente',
            stats
        });
    } catch (error) {
        console.error("Error al obtener estadísticas:", error);
        res.status(500).json({ error: "Error interno al obtener estadísticas" });
    }
}

// *********************************** ACTUALIZAR PERFIL DE USUARIO ***********************************

async function updateProfile(req, res) {
    const { displayName, photoURL } = req.body;
    const firebaseUid = req.user.firebaseUid;

    if (!displayName && !photoURL) {
        return res.status(400).json({
            error: true,
            message: 'No hay datos para actualizar'
        });
    }

    try {
        const updates = [];
        const values = [];
        let paramIndex = 1;

        if (displayName !== undefined) {
            updates.push(`display_name = $${paramIndex++}`);
            values.push(displayName);
        }
        
        if (photoURL !== undefined) {
            updates.push(`photo_url = $${paramIndex++}`);
            values.push(photoURL);
        }

        updates.push(`updated_at = NOW()`);
        values.push(firebaseUid);

        const result = await query(`
            UPDATE users 
            SET ${updates.join(', ')}
            WHERE firebase_uid = $${paramIndex}
            RETURNING *
        `, values);

        res.json({
            error: false,
            message: 'Perfil actualizado exitosamente',
            user: {
                id: result.rows[0].id,
                email: result.rows[0].email,
                displayName: result.rows[0].display_name,
                photoURL: result.rows[0].photo_url
            }
        });
    } catch (error) {
        console.error("Error al actualizar perfil:", error);
        res.status(500).json({ error: "Error interno al actualizar perfil" });
    }
}

// *********************************** AGREGAR ENTRENAMIENTO ***********************************

async function addWorkout(req, res) {
    const { type, duration, intensity, notes } = req.body;
    const userId = req.user.id;

    console.log('=== Payload recibido en addWorkout ===');
    console.dir(req.body, { depth: 3 });

    if (!type || !duration) {
        return res.status(400).json({ error: "Tipo y duración son obligatorios" });
    }

    try {
        // Incrementar total de workouts
        await query(
            'UPDATE users SET total_workouts = total_workouts + 1, updated_at = NOW() WHERE id = $1',
            [userId]
        );

        // Aquí podrías crear una tabla de workouts si quieres más detalle
        // await query(`
        //     INSERT INTO workouts (user_id, type, duration, intensity, notes, created_at)
        //     VALUES ($1, $2, $3, $4, $5, NOW())
        // `, [userId, type, duration, intensity, notes]);

        res.json({
            error: false,
            message: 'Entrenamiento agregado exitosamente',
            workout: { type, duration, intensity, notes }
        });
    } catch (error) {
        console.error("Error al agregar entrenamiento:", error);
        res.status(500).json({ error: "Error interno al agregar entrenamiento" });
    }
}

// *********************************** OBTENER ENTRENAMIENTOS DE USUARIO ***********************************

async function getWorkouts(req, res) {
    const userId = req.user.id;

    try {
        const userResult = await query(
            'SELECT total_workouts, current_streak FROM users WHERE id = $1',
            [userId]
        );

        const workoutData = {
            total: userResult.rows[0]?.total_workouts || 0,
            streak: userResult.rows[0]?.current_streak || 0,
            // Aquí podrías obtener el historial detallado si tienes tabla de workouts
            recent: []
        };

        res.json({
            error: false,
            message: 'Entrenamientos obtenidos exitosamente',
            workouts: workoutData
        });
    } catch (error) {
        console.error("Error al obtener entrenamientos:", error);
        res.status(500).json({ error: "Error interno al obtener entrenamientos" });
    }
}

// *********************************** ACTUALIZAR RACHA DE ENTRENAMIENTOS ***********************************

async function updateStreak(req, res) {
    const { increment } = req.body;
    const userId = req.user.id;

    try {
        const operation = increment ? 'current_streak + 1' : '0';
        
        const result = await query(`
            UPDATE users 
            SET current_streak = ${operation}, updated_at = NOW()
            WHERE id = $1
            RETURNING current_streak
        `, [userId]);

        res.json({
            error: false,
            message: 'Racha actualizada exitosamente',
            newStreak: result.rows[0].current_streak
        });
    } catch (error) {
        console.error("Error al actualizar racha:", error);
        res.status(500).json({ error: "Error interno al actualizar racha" });
    }
}

// ****************************************** EXPORTAR FUNCIONES *******************************************

module.exports = {
    verifyToken,
    testApi,
    getCurrentUser,
    getStats,
    updateProfile,
    addWorkout,
    getWorkouts,
    updateStreak
};