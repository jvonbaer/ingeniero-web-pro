import { localDriver } from "./localDriver";
import { nubeConfigurada, supabaseDriver } from "./supabaseDriver";
import type { Store } from "./store";

/**
 * Si hay credenciales de Supabase, la aplicación trabaja contra la nube
 * compartida; si no, contra IndexedDB del propio dispositivo. En ambos casos la
 * interfaz es idéntica y los respaldos son intercambiables.
 */
export const store: Store = nubeConfigurada ? supabaseDriver : localDriver;
export { nubeConfigurada };
