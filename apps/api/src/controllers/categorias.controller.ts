import { Request, Response } from 'express';
import {
    obtenerTodasCategorias,
    obtenerSubcategoriasPorCategoria,
} from '../services/categorias.service';

// ============================================
// GET /api/categorias
// Obtiene todas las categorías activas
// ============================================

export const obtenerCategorias = async (req: Request, res: Response) => {
    try {
        const categorias = await obtenerTodasCategorias();

        res.status(200).json({
            success: true,
            data: categorias,
        });
    } catch (error) {
        console.error('Error al obtener categorías:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener categorías',
        });
    }
};

// ============================================
// GET /api/categorias/:id/subcategorias
// Obtiene subcategorías de una categoría específica
// ============================================

export const obtenerSubcategorias = async (req: Request, res: Response) => {
    try {
        // Convertir y validar el parámetro
        const categoriaId = Number(req.params.id);

        if (isNaN(categoriaId) || categoriaId <= 0) {
            return res.status(400).json({
                success: false,
                message: 'ID de categoría inválido',
            });
        }

        const subcategorias = await obtenerSubcategoriasPorCategoria(categoriaId);

        // Si la categoría no existe o no tiene subcategorías
        if (subcategorias.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No se encontraron subcategorías para esta categoría',
            });
        }

        res.status(200).json({
            success: true,
            data: subcategorias,
        });
    } catch (error) {
        console.error('Error al obtener subcategorías:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener subcategorías',
        });
    }
};