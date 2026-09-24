// Shared data + deterministic scoring for the Claude Agent (Demo) page's two
// functions (claude-agent.mjs and claude-agent-chat.mjs), so the fixed set
// of fictional accounts and the ICP scoring rules only live in one place.
// Mirrors gtm-agent-demo/gtm_agent_core.py exactly.

export const CUENTAS_DEMO = {
  "Altiplano Brewing Group (Demo)": {
    industria: "Cerveceria", empleados: 8000, pais: "Mexico",
    stack_actual: ["PLC/SCADA por planta, sin capa central", "MES en una sola linea"],
    senales_compra: [
      "Solicito una demo de agentes de IA para planta",
      "Anuncio una nueva planta / expansion de capex",
      "Crecio su equipo de operaciones un 20% este trimestre",
    ],
  },
  "Nebula Snacks Co (Demo)": {
    industria: "Snacks / CPG", empleados: 12000, pais: "Colombia",
    stack_actual: ["MES moderno", "ERP integrado"],
    senales_compra: ["Descargo un whitepaper sobre mantenimiento predictivo"],
  },
  "Grupo Andino Dairy (Demo)": {
    industria: "Lacteos", empleados: 30000, pais: "Peru",
    stack_actual: ["sin integracion PLC/MES/ERP", "sin monitoreo en tiempo real"],
    senales_compra: [
      "Tuvo un paro de linea no planificado reportado en prensa",
      "Contrato un nuevo VP de Operaciones",
    ],
  },
  "Valle Bottling Co (Demo)": {
    industria: "Embotelladora", empleados: 6000, pais: "Chile",
    stack_actual: ["PLC por planta", "varias herramientas de monitoreo sueltas"],
    senales_compra: ["Publico una vacante para Director de Planta"],
  },
  "Horizonte Foods Group (Demo)": {
    industria: "Alimentos y bebidas", empleados: 25000, pais: "Argentina",
    stack_actual: ["PLC/SCADA por planta", "servidores on-prem", "varias herramientas de monitoreo"],
    senales_compra: [
      "Solicito una cotizacion enterprise multi-planta",
      "Asistio a un webinar de reduccion de downtime",
      "Busco 'OEE' en su propio sitio de soporte",
    ],
  },
};

export function buscarCuenta(nombre) {
  if (typeof nombre !== "string") return null;
  const normalizado = nombre.trim().toLowerCase();
  for (const [nombreCanonico, cuenta] of Object.entries(CUENTAS_DEMO)) {
    if (nombreCanonico.toLowerCase().includes(normalizado)) {
      return { nombre: nombreCanonico, ...cuenta };
    }
  }
  return null;
}

function puntajeStack(stackActual) {
  const texto = stackActual.join(" ").toLowerCase();
  const dolorAlto = ["plc por planta", "plc/scada por planta", "on-prem", "varias herramientas"];
  const dolorMedio = ["sin integracion plc/mes/erp", "sin monitoreo en tiempo real"];
  const modernas = ["mes moderno", "erp integrado", "monitoreo en tiempo real"];

  if (dolorAlto.some((k) => texto.includes(k))) {
    return [30, "stack con dolor alto (PLC/SCADA aislado por planta, on-prem o varias herramientas sueltas)"];
  }
  if (dolorMedio.some((k) => texto.includes(k))) {
    return [20, "sin integracion PLC/MES/ERP o sin monitoreo en tiempo real (dolor medio)"];
  }
  if (modernas.some((k) => texto.includes(k))) {
    return [8, "ya usa un stack de manufactura moderno (dolor bajo)"];
  }
  return [8, "stack no clasificado, se asume dolor bajo"];
}

export function calcularScore(nombre, cuenta) {
  const razones = [];

  let ptsTamano;
  if (cuenta.empleados >= 5000 && cuenta.empleados <= 400000) {
    ptsTamano = 25;
    razones.push(`tamano ideal para manufactura Tier-1 (${cuenta.empleados} empleados): +25`);
  } else {
    ptsTamano = 5;
    razones.push(`tamano fuera de rango ideal (${cuenta.empleados} empleados): +5`);
  }

  const [ptsStack, motivoStack] = puntajeStack(cuenta.stack_actual);
  razones.push(`${motivoStack}: +${ptsStack}`);

  const numSenales = cuenta.senales_compra.length;
  const ptsSenales = Math.min(numSenales * 15, 45);
  razones.push(`${numSenales} senal(es) de compra: +${ptsSenales}`);

  const score = ptsTamano + ptsStack + ptsSenales;

  let tier, ruteo;
  if (score >= 75) { tier = "A"; ruteo = "Technical sales"; }
  else if (score >= 50) { tier = "B"; ruteo = "Nurture automatico"; }
  else { tier = "C"; ruteo = "Descartar"; }

  return { nombre, score, tier, ruteo, razon: razones.join("; ") };
}
