/**
 * Envoltorio mínimo sobre IndexedDB. Se usa en vez de localStorage porque las
 * fotos van embebidas como data URL y la cuota de localStorage (~5 MB) se agota
 * alrededor de los 60 jugadores.
 */
const DB_NOMBRE = "cga-evaluacion-futbol";
const DB_VERSION = 1;
const ALMACEN = "kv";

let promesaDb: Promise<IDBDatabase> | null = null;

function abrir(): Promise<IDBDatabase> {
  if (promesaDb) return promesaDb;
  promesaDb = new Promise((resolver, rechazar) => {
    const req = indexedDB.open(DB_NOMBRE, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(ALMACEN)) db.createObjectStore(ALMACEN);
    };
    req.onsuccess = () => resolver(req.result);
    req.onerror = () => rechazar(req.error);
  });
  return promesaDb;
}

export async function idbGet<T>(clave: string): Promise<T | undefined> {
  const db = await abrir();
  return new Promise((resolver, rechazar) => {
    const tx = db.transaction(ALMACEN, "readonly");
    const req = tx.objectStore(ALMACEN).get(clave);
    req.onsuccess = () => resolver(req.result as T | undefined);
    req.onerror = () => rechazar(req.error);
  });
}

export async function idbSet(clave: string, valor: unknown): Promise<void> {
  const db = await abrir();
  return new Promise((resolver, rechazar) => {
    const tx = db.transaction(ALMACEN, "readwrite");
    tx.objectStore(ALMACEN).put(valor, clave);
    tx.oncomplete = () => resolver();
    tx.onerror = () => rechazar(tx.error);
  });
}
