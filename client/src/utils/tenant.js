/**
 * Helper para obtener los datos del restaurante/tenant activo en la sesión
 */

export function getActiveRestaurant() {
    try {
        const storedTenant = localStorage.getItem('bunker_current_tenant');
        if (storedTenant) {
            const t = JSON.parse(storedTenant);
            if (t && t.nombre) return t;
        }
        const storedUser = localStorage.getItem('bunker_user');
        if (storedUser) {
            const u = JSON.parse(storedUser);
            if (u?.restaurante?.nombre) return u.restaurante;
            if (u?.nombreRestaurante) return { nombre: u.nombreRestaurante, id: u.restauranteId };
        }
    } catch (e) {
        console.error('[tenant.js] Error al leer tenant activo:', e);
    }
    return {
        id: 1,
        nombre: "Bunker Restobar",
        slug: "bunker-restobar",
        telefono: "51 9123456789",
        ruc: "10000000000",
        direccion: "Av. Principal 123"
    };
}

export function getActiveRestaurantName() {
    const rest = getActiveRestaurant();
    return rest?.nombre || "Bunker Restobar";
}
