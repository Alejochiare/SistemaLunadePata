/**
 * nomenclaturas.js — Luna de Plata
 * Códigos de nomenclatura por categoría para autocompletar en el formulario de paños.
 * Cada entrada: { codigo, descripcion }
 * El campo que se completa queda como "CODIGO — Descripción".
 */

window.Nomenclaturas = {

  anillos: [
    { codigo: 'APDU', descripcion: 'ANILLO PLATA 925 (DUBLE)' },
    { codigo: 'APBR', descripcion: 'ANILLO PLATA 925 (BRILLO)' },
    { codigo: 'APES', descripcion: 'ANILLO PLATA 925 (ESMALTADO)' },
    { codigo: 'APGO', descripcion: 'ANILLO PLATA 925 (GOLD)' },
    { codigo: 'APIM', descripcion: 'ANILLO PLATA 925 (IMPORTADO)' },
    { codigo: 'APIN', descripcion: 'ANILLO PLATA 925 (INFLADO)' },
    { codigo: 'APLI', descripcion: 'ANILLO PLATA 925 (LISO)' },
    { codigo: 'APMI', descripcion: 'ANILLOS PLATA 925 (ADI)' },
    { codigo: 'APNA', descripcion: 'ANILLO PLATA 925 (NACAR)' },
    { codigo: 'APPA', descripcion: 'ANILLO PLATA 925 (PANDORA)' },
    { codigo: 'APPE', descripcion: 'ANILLO PLATA 950 (PERUANO)' },
    { codigo: 'APPI', descripcion: 'ANILLO PLATA 925 (PIEDRA)' },
    { codigo: 'APRO', descripcion: 'ANILLOS PLATA 925 (ROSE)' },
  ],

  // Las demás categorías se van completando a medida que se cargan las nomenclaturas
  aros: [
    { codigo: 'APIE', descripcion: 'AROS PLATA 925 (PIERCING)' },
    { codigo: 'ARAB', descripcion: 'AROS PLATA 925 (ABRIDORES)' },
    { codigo: 'ARAR', descripcion: 'AROS PLATA 925 (ARGOLLA)' },
    { codigo: 'ARBO', descripcion: 'AROS PLATA 925 (BOLITA)' },
    { codigo: 'ARBR', descripcion: 'AROS PLATA 925 (BRILLO)' },
    { codigo: 'ARBV', descripcion: 'AROS PLATA 925 (BVULARI)' },
    { codigo: 'ARCO', descripcion: 'AROS PLATA 925 (COLGANTE)' },
    { codigo: 'ARCU', descripcion: 'AROS PLATA 925 (CUBICO)' },
    { codigo: 'ARDU', descripcion: 'AROS PLATA 925 (DUBLE)' },
    { codigo: 'ARES', descripcion: 'AROS PLATA 925 (ESMALTE)' },
    { codigo: 'ARGO', descripcion: 'AROS PLATA 925 (GOLD)' },
    { codigo: 'ARIN', descripcion: 'AROS PLATA 925 (INFLADOS)' },
    { codigo: 'ARLD', descripcion: 'AROS PLATA 925 (LADY DI)' },
    { codigo: 'ARMI', descripcion: 'AROS PLATA 925 (MIX)' },
    { codigo: 'ARNA', descripcion: 'AROS PLATA 925 (NACAR)' },
    { codigo: 'ARPE', descripcion: 'AROS PLATA 950 (PERUANOS)' },
    { codigo: 'ARPI', descripcion: 'AROS PLATA 925 (PIEDRA)' },
    { codigo: 'ARPL', descripcion: 'AROS PLATA 925 (LISO)' },
    { codigo: 'ARPR', descripcion: 'AROS PLATA 925 (PRESION)' },
    { codigo: 'ARRO', descripcion: 'AROS PLATA 925 (ROSE)' },
    { codigo: 'ARSW', descripcion: 'AROS PLATA 925 (SWAROVSKY)' },
    { codigo: 'ARTR', descripcion: 'AROS PLATA 925 (TREPADOR)' },
  ],

  cadenasConjuntos: [
    { codigo: 'CPLA',  descripcion: 'CADENA PLATA 800 (LAMINADA)' },
    { codigo: 'CPBO',  descripcion: 'CADENA PLATA 925 (BOLITAS)' },
    { codigo: 'CPBR',  descripcion: 'CADENA PLATA 925 (BRILLO)' },
    { codigo: 'CPCO',  descripcion: 'CADENA PLATA 925 (CONJUNTO)' },
    { codigo: 'CPDE',  descripcion: 'CADENA PLATA 925 (DENARIO)' },
    { codigo: 'CPDU',  descripcion: 'CADENA PLATA 925 (DUBLE)' },
    { codigo: 'CPGO',  descripcion: 'CADENA PLATA 925 (GOLD)' },
    { codigo: 'CPIT',  descripcion: 'CADENA PLATA 925 (ITALIANA)' },
    { codigo: 'CPLI',  descripcion: 'CADENA PLATA 925 (LISA)' },
    { codigo: 'CPPE',  descripcion: 'CADENA PLATA 950 (PERUANA)' },
    { codigo: 'CPPI',  descripcion: 'CADENA PLATA 925 (PIEDRA)' },
    { codigo: 'CPRO',  descripcion: 'CADENA PLATA 925 (ROLO NAC.)' },
    { codigo: 'CPROS', descripcion: 'CADENA PLATA 925 (ROSE)' },
    { codigo: 'CROS',  descripcion: 'CADENA PLATA 925 (ROSE)' },
  ],

  dijes: [
    { codigo: 'DPPE', descripcion: 'DIJE PLATA 950 (PERUANO)' },
    { codigo: 'DPBR', descripcion: 'DIJE PLATA 925 (BRILLO)' },
    { codigo: 'DPDU', descripcion: 'DIJE PLATA 925 (DUBLE)' },
    { codigo: 'DPEL', descripcion: 'DIJE PLATA 925 (ELECTROFORMATURA)' },
    { codigo: 'DPEN', descripcion: 'DIJE PLATA 925 (ENCAJONADO)' },
    { codigo: 'DPEP', descripcion: 'DIJE METAL (ELECTRO PLAY)' },
    { codigo: 'DPES', descripcion: 'DIJE PLATA 925 (ESMALTADO)' },
    { codigo: 'DPGO', descripcion: 'DIJE PLATA 925 (GOLD)' },
    { codigo: 'DPIN', descripcion: 'DIJE PLATA 925 (INFLADO)' },
    { codigo: 'DPLI', descripcion: 'DIJE PLATA 925 (LISA)' },
    { codigo: 'DPNA', descripcion: 'DIJE PLATA 925 (NACAR)' },
    { codigo: 'DPPI', descripcion: 'DIJE PLATA 925 (PIEDRA)' },
    { codigo: 'DPRO', descripcion: 'DIJE PLATA 925 (ROSE)' },
    { codigo: 'DPSW', descripcion: 'DIJE PLATA 925 (SWAROVSKI)' },
  ],

  pulseras: [
    { codigo: 'PPBO',  descripcion: 'PULSERA PLATA 925 (BOLITAS)' },
    { codigo: 'PPBR',  descripcion: 'PULSERA PLATA 925 (BRILLO)' },
    { codigo: 'PPDE',  descripcion: 'PULSERA PLATA 925 (DENARIO)' },
    { codigo: 'PPDU',  descripcion: 'PULSERA PLATA 925 (DUBLE)' },
    { codigo: 'PPES',  descripcion: 'PULSERA PLATA 925 (ESCLAVA)' },
    { codigo: 'PPGO',  descripcion: 'PULSERA PLATA 925 (GOLD)' },
    { codigo: 'PPIT',  descripcion: 'PULSERA PLATA 925 (ITALIANA)' },
    { codigo: 'PPLA',  descripcion: 'PULSERA PLATA 800 (LAMINADA)' },
    { codigo: 'PPLI',  descripcion: 'PULSERA PLATA 925 (LISA)' },
    { codigo: 'PPPA',  descripcion: 'PULSERA PLATA 925 (PANDORA)' },
    { codigo: 'PPPE',  descripcion: 'PULSERA PLATA 950 (PERUANA)' },
    { codigo: 'PPPI',  descripcion: 'PULSERA PLATA 925 (PIEDRA)' },
    { codigo: 'PPRO',  descripcion: 'PULSERA PLATA 925 (ROLO NAC.)' },
    { codigo: 'PPROS', descripcion: 'PULSERA PLATA 925 (ROSE)' },
    { codigo: 'PPSW',  descripcion: 'PULSERA PLATA 925 (SWAROVSKI)' },
    { codigo: 'PPTA',  descripcion: 'PULSERA PLATA 925 (TAILANDA)' },
    { codigo: 'PPTO',  descripcion: 'TOBILLERA PLATA 925 (VARIOS)' },
  ],
  accesoriosGoldFabricacion: [
    { codigo: '',     descripcion: 'BANDOLERA' },
    { codigo: '',     descripcion: 'BILLETERA' },
    { codigo: '',     descripcion: 'BUFANDA' },
    { codigo: '',     descripcion: 'CARTERA' },
    { codigo: '',     descripcion: 'CHALINA' },
    { codigo: '',     descripcion: 'PAÑUELO' },
    { codigo: '',     descripcion: 'INDIA PULSERA' },
    { codigo: '',     descripcion: 'RUANA' },
    { codigo: '',     descripcion: 'TOBILLERA' },
    { codigo: '',     descripcion: 'CRISTAL BOLITAS PLATA 800 (ENCHAPADAS)' },
    { codigo: '',     descripcion: 'GOLD FIELD ENCHAPADO EN ORO (BOHO)' },
    { codigo: '',     descripcion: 'KIT LIMPIADOR' },
    { codigo: '',     descripcion: 'PERFORADORES' },
    { codigo: 'ARLA', descripcion: 'AROS PLATA 800 (LAMINADOS)' },
    { codigo: 'DPLA', descripcion: 'DUE PLATA 800 (LAMINADOS)' },
    { codigo: 'APLA', descripcion: 'ANILLO PLATA 800 (LAMINADOS)' },
    { codigo: 'PPLA', descripcion: 'PULSERA PLATA 800 (LAMINADOS)' },
  ],
  anillosAcero: [
    { codigo: 'AALI', descripcion: 'ANILLO ACERO IONIZADO (LISO)' },
    { codigo: 'AABR', descripcion: 'ANILLO ACERO IONIZADO (BRILLO)' },
    { codigo: 'AAES', descripcion: 'ANILLO ACERO IONIZADO (ESMALTE)' },
    { codigo: 'AAGO', descripcion: 'ANILLO ACERO IONIZADO (GOLD)' },
    { codigo: 'AANA', descripcion: 'ANILLO ACERO IONIZADO (NACAR)' },
    { codigo: 'AAPI', descripcion: 'ANILLO ACERO IONIZADO (PIEDRA)' },
    { codigo: 'AARO', descripcion: 'ANILLO ACERO IONIZADO (ROSE)' },
  ],

  arosAcero: [
    { codigo: 'AAAB', descripcion: 'AROS ACERO IONIZADO (ABRIDORES)' },
    { codigo: 'AABO', descripcion: 'AROS ACERO IONIZADO (BOLITAS)' },
    { codigo: 'AABR', descripcion: 'AROS ACERO IONIZADO (BRILLO)' },
    { codigo: 'AACO', descripcion: 'AROS ACERO IONIZADO (COLGANTE)' },
    { codigo: 'AAES', descripcion: 'AROS ACERO IONIZADO (ESMALTE)' },
    { codigo: 'AAGO', descripcion: 'AROS ACERO IONIZADO (GOLD)' },
    { codigo: 'AALI', descripcion: 'AROS ACERO IONIZADO (LISOS)' },
    { codigo: 'AAMI', descripcion: 'AROS ACERO IONIZADO (MIX)' },
    { codigo: 'AAPA', descripcion: 'AROS ACERO IONIZADO (PASANTES)' },
    { codigo: 'AAPI', descripcion: 'AROS ACERO IONIZADO (PIEDRA)' },
    { codigo: 'AAPR', descripcion: 'AROS ACERO IONIZADO (PRESION)' },
    { codigo: 'AARO', descripcion: 'AROS ACERO IONIZADO (ROSE)' },
    { codigo: 'AASW', descripcion: 'AROS ACERO IONIZADO (D/SWAROVSKI)' },
    { codigo: 'AATR', descripcion: 'AROS ACERO IONIZADO (TREPADORES)' },
  ],

  cadenasAcero: [
    { codigo: 'CABO', descripcion: 'CADENA ACERO IONIZADO (BOLITAS)' },
    { codigo: 'CABR', descripcion: 'CADENA ACERO IONIZADO (BRILLO)' },
    { codigo: 'CACO', descripcion: 'CADENA ACERO IONIZADO (CONJUNTO)' },
    { codigo: 'CADE', descripcion: 'CADENA ACERO IONIZADO (DENARIO)' },
    { codigo: 'CAGO', descripcion: 'CADENA ACERO IONIZADO (GOLD)' },
    { codigo: 'CALI', descripcion: 'CADENA ACERO IONIZADO (LISO)' },
    { codigo: 'CAPI', descripcion: 'CADENA ACERO IONIZADO (PIEDRA)' },
    { codigo: 'CARO', descripcion: 'CADENA ACERO IONIZADO (ROLO)' },
    { codigo: 'CARS', descripcion: 'CADENA ACERO IONIZADO (ROSE)' },
  ],

  dijesAcero: [
    { codigo: 'DABR', descripcion: 'DIJE ACERO IONIZADO (BRILLO)' },
    { codigo: 'DAEN', descripcion: 'DIJE ACERO IONIZADO (ENCAJONADO)' },
    { codigo: 'DAES', descripcion: 'DIJE ACERO IONIZADO (ESMALTADO)' },
    { codigo: 'DAGO', descripcion: 'DIJE ACERO IONIZADO (GOLD)' },
    { codigo: 'DALI', descripcion: 'DIJE ACERO IONIZADO (LISO)' },
    { codigo: 'DANA', descripcion: 'DIJE ACERO IONIZADO (NACAR)' },
    { codigo: 'DAPI', descripcion: 'DIJE ACERO IONIZADO (PIEDRA)' },
    { codigo: 'DARO', descripcion: 'DIJE ACERO IONIZADO (ROSE)' },
    { codigo: 'DASW', descripcion: 'DIJE ACERO IONIZADO (D/SWAROVSKI)' },
  ],

  pulserasAcero: [
    { codigo: 'PAPA', descripcion: 'PULSERA ACERO IONIZADO (PANDORA)' },
    { codigo: 'PABO', descripcion: 'PULSERA ACERO IONIZADO (BOLITAS)' },
    { codigo: 'PABR', descripcion: 'PULSERA ACERO IONIZADO (BRILLO)' },
    { codigo: 'PADE', descripcion: 'PULSERA ACERO IONIZADO (DENARIO)' },
    { codigo: 'PAES', descripcion: 'PULSERA ACERO IONIZADO (ESCLAVA)' },
    { codigo: 'PAGO', descripcion: 'PULSERA ACERO IONIZADO (GOLD)' },
    { codigo: 'PALI', descripcion: 'PULSERA ACERO IONIZADO (LISA)' },
    { codigo: 'PAPI', descripcion: 'PULSERA ACERO IONIZADO (PIEDRA)' },
    { codigo: 'PARO', descripcion: 'PULSERA ACERO IONIZADO (ROLO)' },
    { codigo: 'PAROS',descripcion: 'PULSERA ACERO IONIZADO (ROSE)' },
    { codigo: 'PASW', descripcion: 'PULSERA ACERO IONIZADO (D/SWAROVSKI)' },
    { codigo: 'PATO', descripcion: 'TOBILLERA ACERO IONIZADO' },
    { codigo: 'PANE', descripcion: 'PULSERA ACERO IONIZADO (NEOPRENE)' },
  ],
  relojes: [
    { codigo: '', descripcion: 'ABRIDORES' },
    { codigo: '', descripcion: 'KNOCK OUT' },
    { codigo: '', descripcion: 'PRO SPACE' },
    { codigo: '', descripcion: 'SWATCH' },
    { codigo: '', descripcion: 'TOMMY' },
    { codigo: '', descripcion: 'TRESSA' },
    { codigo: '', descripcion: 'WILLIAM' },
    { codigo: '', descripcion: 'MISTRAL' },
    { codigo: '', descripcion: 'CADENA' },
    { codigo: '', descripcion: 'PULSERA' },
    { codigo: '', descripcion: 'AROS' },
  ],

  precioFijoArreglos: [
    { codigo: '', descripcion: 'ALIANZA CAJA PAKAGING' },
    { codigo: '', descripcion: 'ANILLO CAJA PAKAGING' },
    { codigo: '', descripcion: 'ARREGLO - SOLDADURA - PULIDO' },
    { codigo: '', descripcion: 'BOLSA ORGANZA PAKAGING' },
    { codigo: '', descripcion: 'CHICO SOBRES PAKAGING' },
    { codigo: '', descripcion: 'CONJUNTO CAJA PAKAGING' },
    { codigo: '', descripcion: 'ESCLAVA CAJA PAKAGING' },
    { codigo: '', descripcion: 'ESTUCHE PAKAGING' },
    { codigo: '', descripcion: 'GRANDE SOBRE PAKAGING' },
    { codigo: '', descripcion: 'MEDIANO SOBRE PAKAGING' },
    { codigo: '', descripcion: 'METALIZADA - BOLSITA PAKAGING' },
    { codigo: '', descripcion: 'MOÑO PAKAGING' },
    { codigo: '', descripcion: 'PULSERA CAJA PAKAGING' },
  ],

  joyasPersonalizadas: [
    { codigo: '', descripcion: 'ANILLOS PERSONALIZADOS' },
    { codigo: '', descripcion: 'DIJES PERSONALIZADOS' },
    { codigo: '', descripcion: 'GRABADOS' },
    { codigo: '', descripcion: 'PULSERAS PERSONALIZADAS' },
    { codigo: '', descripcion: 'MANO OBRA' },
    { codigo: '', descripcion: 'JOYAS PERSONALIZADAS' },
  ],

  maryKay: [
    { codigo: '', descripcion: 'AT PLAY' },
    { codigo: '', descripcion: 'CREMA' },
    { codigo: '', descripcion: 'PERFUME' },
    { codigo: '', descripcion: 'TIME WISE' },
    { codigo: '', descripcion: 'MARY KAY' },
    { codigo: '', descripcion: 'PRODUCTOS MARY KAY' },
  ],

  /**
   * Devuelve las sugerencias para una categoría que coincidan con el texto escrito.
   * Busca tanto en el código como en la descripción (insensible a mayúsculas/acentos).
   */
  buscar(catKey, texto) {
    const lista = this[catKey];
    if (!lista || !lista.length || !texto.trim()) return [];
    const q = texto.trim().toLowerCase();
    return lista.filter(n =>
      n.codigo.toLowerCase().includes(q) ||
      n.descripcion.toLowerCase().includes(q)
    ).slice(0, 10);
  },

  /** Texto que se pega en el input al seleccionar una sugerencia */
  formatear(n) {
    return n.codigo ? `${n.codigo} — ${n.descripcion}` : n.descripcion;
  },
};
