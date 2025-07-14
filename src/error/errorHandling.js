const errorHandling = (error, req, res, next) => {
    console.error('❌ Error caught by middleware:', error);

    // Error de validación de Firebase
    if (error.code && error.code.includes('auth/')) {
        return res.status(401).json({
            error: true,
            codigo: 401,
            message: 'Error de autenticación Firebase',
            details: error.message
        });
    }

    // Error de base de datos PostgreSQL
    if (error.code && error.code.includes('23')) { 
        let message = 'Error de base de datos';
        
        if (error.code === '23505') {
            message = 'Ya existe un registro con estos datos';
        } else if (error.code === '23503') {
            message = 'Referencia no válida';
        }
        
        return res.status(400).json({
            error: true,
            codigo: 400,
            message: message,
            details: process.env.NODE_ENV === 'development' ? error.detail : undefined
        });
    }

    // Error de conexión de base de datos
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
        return res.status(503).json({
            error: true,
            codigo: 503,
            message: 'Error de conexión a la base de datos',
            details: 'El servicio no está disponible temporalmente'
        });
    }

    // Error genérico del servidor
    res.status(500).json({
        error: true,
        codigo: 500,
        message: 'Error interno del servidor',
        details: process.env.NODE_ENV === 'development' ? error.message : 'Algo salió mal'
    });
};

module.exports = { errorHandling };