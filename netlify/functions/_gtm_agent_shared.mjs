// Shared data + deterministic scoring for the Claude Agent (Demo) page's two
// functions (claude-agent.mjs and claude-agent-chat.mjs), so the fixed set
// of fictional accounts and the ICP scoring rules only live in one place.
// Mirrors gtm-agent-demo/gtm_agent_core.py exactly.

export const CUENTAS_DEMO = {
  "Acme Textiles (Demo)": {
    industria: "Manufactura", empleados: 800, pais: "Mexico",
    stack_actual: ["Active Directory", "servidores on-prem"],
    senales_compra: [
      "Solicito una demo de seguridad de identidad",
      "Visito la pagina de precios tres veces en una semana",
      "Crecio su equipo de TI un 20% este trimestre",
    ],
  },
  "Nebula Software (Demo)": {
    industria: "SaaS", empleados: 120, pais: "Colombia",
    stack_actual: ["Okta", "Google Workspace"],
    senales_compra: ["Descargo un whitepaper sobre Zero Trust"],
  },
  "Grupo Andino Retail (Demo)": {
    industria: "Retail", empleados: 3000, pais: "Peru",
    stack_actual: ["sin directorio central", "sin MDM"],
    senales_compra: [
      "Tuvo un incidente de seguridad reportado en prensa",
      "Contrato un nuevo CISO",
    ],
  },
  "Constructora del Valle (Demo)": {
    industria: "Construccion", empleados: 60, pais: "Chile",
    stack_actual: ["Active Directory", "varias herramientas de identidad sueltas"],
    senales_compra: ["Publico una vacante para Administrador de TI"],
  },
  "FinTech Horizonte (Demo)": {
    industria: "Fintech", empleados: 250, pais: "Argentina",
    stack_actual: ["Active Directory", "servidores on-prem", "varias herramientas de acceso"],
    senales_compra: [
      "Solicito una cotizacion enterprise",
      "Asistio a un webinar de compliance",
      "Busco 'MFA' en su propio sitio de soporte",
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
  const dolorAlto = ["active directory", "on-prem", "varias herramientas"];
  const dolorMedio = ["sin directorio central", "sin mdm"];
  const modernas = ["okta", "azure ad", "entra id", "google workspace", "jumpcloud", "onelogin"];

  if (dolorAlto.some((k) => texto.includes(k))) {
    return [30, "stack con dolor alto (Active Directory, on-prem o varias herramientas sueltas)"];
  }
  if (dolorMedio.some((k) => texto.includes(k))) {
    return [20, "sin directorio central o sin MDM (dolor medio)"];
  }
  if (modernas.some((k) => texto.includes(k))) {
    return [8, "ya usa un stack de identidad moderno (dolor bajo)"];
  }
  return [8, "stack no clasificado, se asume dolor bajo"];
}

export function calcularScore(nombre, cuenta) {
  const razones = [];

  let ptsTamano;
  if (cuenta.empleados >= 50 && cuenta.empleados <= 1500) {
    ptsTamano = 25;
    razones.push(`tamano ideal (${cuenta.empleados} empleados): +25`);
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
  if (score >= 75) { tier = "A"; ruteo = "SDR humano"; }
  else if (score >= 50) { tier = "B"; ruteo = "Nurture automatico"; }
  else { tier = "C"; ruteo = "Descartar"; }

  return { nombre, score, tier, ruteo, razon: razones.join("; ") };
}
