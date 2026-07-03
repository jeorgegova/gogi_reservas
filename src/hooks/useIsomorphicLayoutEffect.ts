/**
 * useIsomorphicLayoutEffect
 * Usa useLayoutEffect en el cliente y useEffect en el servidor.
 * Esto evita warnings de hidratación cuando se usan animaciones DOM.
 */
import { useEffect } from 'react';

export const useIsomorphicLayoutEffect = useEffect;
