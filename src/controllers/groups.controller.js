const { query } = require('../../config/database')

// ================================
// CREAR GRUPO
// ================================
async function createGroup(req, res) {
    const { name, description, maxMembers = 50, isPublic = false } = req.body;
    const userId = req.user.id;

    if (!name || name.trim().length < 3) {
        return res.status(400).json({
            error: true,
            message: 'El nombre del grupo debe tener al menos 3 caracteres'
        });
    }

    try {
        // Generar código único
        const codeResult = await query('SELECT generate_group_code() as code');
        const groupCode = codeResult.rows[0].code;

        // Crear grupo
        const groupResult = await query(`
            INSERT INTO groups (name, description, code, created_by, max_members, is_public)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `, [name.trim(), description?.trim(), groupCode, userId, maxMembers, isPublic]);

        const group = groupResult.rows[0];

        // Agregar al creador como admin
        await query(`
            INSERT INTO group_members (group_id, user_id, role)
            VALUES ($1, $2, 'admin')
        `, [group.id, userId]);

        res.json({
            error: false,
            message: 'Grupo creado exitosamente',
            group: {
                id: group.id,
                name: group.name,
                description: group.description,
                code: group.code,
                maxMembers: group.max_members,
                isPublic: group.is_public,
                createdAt: group.created_at,
                memberCount: 1,
                role: 'admin'
            }
        });
    } catch (error) {
        console.error('Error creando grupo:', error);
        res.status(500).json({ 
            error: true, 
            message: 'Error interno al crear grupo' 
        });
    }
}

// ================================
// UNIRSE A GRUPO POR CÓDIGO
// ================================
async function joinGroup(req, res) {
    const { code } = req.body;
    const userId = req.user.id;

    if (!code || code.trim().length === 0) {
        return res.status(400).json({
            error: true,
            message: 'Código de grupo requerido'
        });
    }

    try {
        // Buscar grupo por código
        const groupResult = await query(`
            SELECT g.*, u.display_name as creator_name,
                   (SELECT COUNT(*) FROM group_members WHERE group_id = g.id AND is_active = true) as member_count
            FROM groups g
            JOIN users u ON g.created_by = u.id
            WHERE g.code = $1 AND g.is_active = true
        `, [code.trim().toUpperCase()]);

        if (groupResult.rows.length === 0) {
            return res.status(404).json({
                error: true,
                message: 'Grupo no encontrado o inactivo'
            });
        }

        const group = groupResult.rows[0];

        // Verificar si ya es miembro
        const memberResult = await query(`
            SELECT * FROM group_members 
            WHERE group_id = $1 AND user_id = $2
        `, [group.id, userId]);

        if (memberResult.rows.length > 0) {
            const member = memberResult.rows[0];
            if (member.is_active) {
                return res.status(400).json({
                    error: true,
                    message: 'Ya eres miembro de este grupo'
                });
            } else {
                // Reactivar membresía
                await query(`
                    UPDATE group_members 
                    SET is_active = true, joined_at = NOW()
                    WHERE group_id = $1 AND user_id = $2
                `, [group.id, userId]);
            }
        } else {
            // Verificar límite de miembros
            if (group.member_count >= group.max_members) {
                return res.status(400).json({
                    error: true,
                    message: 'El grupo ha alcanzado el límite de miembros'
                });
            }

            // Agregar como miembro
            await query(`
                INSERT INTO group_members (group_id, user_id, role)
                VALUES ($1, $2, 'member')
            `, [group.id, userId]);
        }

        res.json({
            error: false,
            message: `¡Te has unido a "${group.name}"!`,
            group: {
                id: group.id,
                name: group.name,
                description: group.description,
                code: group.code,
                creatorName: group.creator_name,
                memberCount: parseInt(group.member_count) + 1,
                role: 'member'
            }
        });
    } catch (error) {
        console.error('Error uniéndose al grupo:', error);
        res.status(500).json({ 
            error: true, 
            message: 'Error interno al unirse al grupo' 
        });
    }
}

// ================================
// OBTENER MIS GRUPOS
// ================================
async function getMyGroups(req, res) {
    const userId = req.user.id;

    try {
        const result = await query(`
            SELECT 
                g.id,
                g.name,
                g.description,
                g.code,
                g.created_at,
                g.is_public,
                gm.role,
                gm.joined_at,
                u.display_name as creator_name,
                (SELECT COUNT(*) FROM group_members WHERE group_id = g.id AND is_active = true) as member_count
            FROM groups g
            JOIN group_members gm ON g.id = gm.group_id
            JOIN users u ON g.created_by = u.id
            WHERE gm.user_id = $1 AND gm.is_active = true AND g.is_active = true
            ORDER BY gm.joined_at DESC
        `, [userId]);

        const groups = result.rows.map(row => ({
            id: row.id,
            name: row.name,
            description: row.description,
            code: row.code,
            role: row.role,
            creatorName: row.creator_name,
            memberCount: parseInt(row.member_count),
            joinedAt: row.joined_at,
            createdAt: row.created_at,
            isPublic: row.is_public
        }));

        res.json({
            error: false,
            message: 'Grupos obtenidos exitosamente',
            groups: groups,
            totalGroups: groups.length
        });
    } catch (error) {
        console.error('Error obteniendo grupos:', error);
        res.status(500).json({ 
            error: true, 
            message: 'Error interno al obtener grupos' 
        });
    }
}

// ================================
// OBTENER DETALLES DE GRUPO
// ================================
async function getGroupDetails(req, res) {
    const { groupId } = req.params;
    const userId = req.user.id;

    try {
        // Verificar que el usuario es miembro
        const memberCheck = await query(`
            SELECT role FROM group_members 
            WHERE group_id = $1 AND user_id = $2 AND is_active = true
        `, [groupId, userId]);

        if (memberCheck.rows.length === 0) {
            return res.status(403).json({
                error: true,
                message: 'No tienes acceso a este grupo'
            });
        }

        const userRole = memberCheck.rows[0].role;

        // Obtener detalles del grupo
        const groupResult = await query(`
            SELECT g.*, u.display_name as creator_name
            FROM groups g
            JOIN users u ON g.created_by = u.id
            WHERE g.id = $1 AND g.is_active = true
        `, [groupId]);

        if (groupResult.rows.length === 0) {
            return res.status(404).json({
                error: true,
                message: 'Grupo no encontrado'
            });
        }

        const group = groupResult.rows[0];

        // Obtener miembros del grupo
        const membersResult = await query(`
            SELECT 
                gm.role,
                gm.joined_at,
                u.id,
                u.display_name,
                u.photo_url,
                u.current_streak,
                u.total_workouts
            FROM group_members gm
            JOIN users u ON gm.user_id = u.id
            WHERE gm.group_id = $1 AND gm.is_active = true
            ORDER BY 
                CASE gm.role 
                    WHEN 'admin' THEN 1 
                    WHEN 'moderator' THEN 2 
                    ELSE 3 
                END,
                gm.joined_at ASC
        `, [groupId]);

        const members = membersResult.rows.map(row => ({
            id: row.id,
            displayName: row.display_name,
            photoURL: row.photo_url,
            role: row.role,
            joinedAt: row.joined_at,
            stats: {
                currentStreak: row.current_streak || 0,
                totalWorkouts: row.total_workouts || 0
            }
        }));

        res.json({
            error: false,
            message: 'Detalles del grupo obtenidos exitosamente',
            group: {
                id: group.id,
                name: group.name,
                description: group.description,
                code: group.code,
                creatorName: group.creator_name,
                maxMembers: group.max_members,
                isPublic: group.is_public,
                createdAt: group.created_at,
                memberCount: members.length,
                members: members,
                userRole: userRole
            }
        });
    } catch (error) {
        console.error('Error obteniendo detalles del grupo:', error);
        res.status(500).json({ 
            error: true, 
            message: 'Error interno al obtener detalles del grupo' 
        });
    }
}

// ================================
// SALIR DE GRUPO
// ================================
async function leaveGroup(req, res) {
    const { groupId } = req.params;
    const userId = req.user.id;

    try {
        // Verificar membresía
        const memberResult = await query(`
            SELECT role FROM group_members 
            WHERE group_id = $1 AND user_id = $2 AND is_active = true
        `, [groupId, userId]);

        if (memberResult.rows.length === 0) {
            return res.status(404).json({
                error: true,
                message: 'No eres miembro de este grupo'
            });
        }

        const userRole = memberResult.rows[0].role;

        // Si es admin, verificar si hay otros admins
        if (userRole === 'admin') {
            const adminCount = await query(`
                SELECT COUNT(*) as count FROM group_members 
                WHERE group_id = $1 AND role = 'admin' AND is_active = true
            `, [groupId]);

            if (parseInt(adminCount.rows[0].count) === 1) {
                // Promover al miembro más antiguo a admin
                await query(`
                    UPDATE group_members 
                    SET role = 'admin' 
                    WHERE group_id = $1 AND user_id = (
                        SELECT user_id FROM group_members 
                        WHERE group_id = $1 AND user_id != $2 AND is_active = true 
                        ORDER BY joined_at ASC 
                        LIMIT 1
                    )
                `, [groupId, userId]);
            }
        }

        // Desactivar membresía
        await query(`
            UPDATE group_members 
            SET is_active = false 
            WHERE group_id = $1 AND user_id = $2
        `, [groupId, userId]);

        res.json({
            error: false,
            message: 'Has salido del grupo exitosamente'
        });
    } catch (error) {
        console.error('Error saliendo del grupo:', error);
        res.status(500).json({ 
            error: true, 
            message: 'Error interno al salir del grupo' 
        });
    }
}

module.exports = {
    createGroup,
    joinGroup,
    getMyGroups,
    getGroupDetails,
    leaveGroup
};