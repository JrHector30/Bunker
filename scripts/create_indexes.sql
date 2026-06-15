-- Script to create indexes on PostgreSQL foreign keys for ComandaGo
-- Copy and run this script in your Supabase SQL Editor to optimize query joins.

CREATE INDEX IF NOT EXISTS idx_comanda_mesaId ON "Comanda"("mesaId");
CREATE INDEX IF NOT EXISTS idx_comanda_usuarioId ON "Comanda"("usuarioId");
CREATE INDEX IF NOT EXISTS idx_detallecomanda_comandaId ON "DetalleComanda"("comandaId");
CREATE INDEX IF NOT EXISTS idx_detallecomanda_platoId ON "DetalleComanda"("platoId");
CREATE INDEX IF NOT EXISTS idx_plato_categoriaId ON "Plato"("categoriaId");
CREATE INDEX IF NOT EXISTS idx_recetainsumo_platoId ON "RecetaInsumo"("platoId");
CREATE INDEX IF NOT EXISTS idx_recetainsumo_insumoId ON "RecetaInsumo"("insumoId");
CREATE INDEX IF NOT EXISTS idx_movimientoinsumo_insumoId ON "MovimientoInsumo"("insumoId");
CREATE INDEX IF NOT EXISTS idx_movimientoinsumo_usuarioId ON "MovimientoInsumo"("usuarioId");
