import { localDriver } from "./localDriver";
import { nubeConfigurada, supabaseDriver } from "./supabaseDriver";
import type { Store } from "./store";

/**
 * Con credenciales de Supabase la aplicación trabaja contra la base única del
 * club; sin ellas, contra IndexedDB de este computador. La interfaz es la misma
 * en ambos casos y los respaldos son intercambiables, así que se puede empezar
 * en local y pasar a la nube sin perder nada.
 */
export const store: Store = nubeConfigurada ? supabaseDriver : localDriver;
export { nubeConfigurada };
