"""
gtm-agent-demo - Agente de GTM AI Operations construido con el Claude Agent SDK.

DEMO FICTICIA: todas las cuentas, señales y mensajes son inventados.
El agente no envía correos, no escribe en ningún CRM real ni contacta a nadie.
Todo lo que "guarda" queda en un archivo local: crm_demo.json.
"""

import asyncio
import json
import os
import sys
from pathlib import Path

from claude_agent_sdk import (
    AgentDefinition,
    AssistantMessage,
    ClaudeAgentOptions,
    ClaudeSDKClient,
    PermissionResultAllow,
    PermissionResultDeny,
    ResultMessage,
    TextBlock,
    ThinkingBlock,
    ToolUseBlock,
    create_sdk_mcp_server,
    tool,
)

# Compatibilidad con consolas de Windows (evita errores de encoding con acentos).
sys.stdout.reconfigure(encoding="utf-8")

CRM_FILE = Path(__file__).parent / "crm_demo.json"

# ---------------------------------------------------------------------------
# Datos ficticios de cuentas (todas marcadas como Demo)
# ---------------------------------------------------------------------------

CUENTAS_DEMO = [
    {
        "nombre": "Acme Textiles (Demo)",
        "industria": "Manufactura",
        "empleados": 800,
        "pais": "Mexico",
        "stack_actual": ["Active Directory", "servidores on-prem"],
        "senales_compra": [
            "Solicito una demo de seguridad de identidad",
            "Visito la pagina de precios tres veces en una semana",
            "Crecio su equipo de TI un 20% este trimestre",
        ],
    },
    {
        "nombre": "Nebula Software (Demo)",
        "industria": "SaaS",
        "empleados": 120,
        "pais": "Colombia",
        "stack_actual": ["Okta", "Google Workspace"],
        "senales_compra": [
            "Descargo un whitepaper sobre Zero Trust",
        ],
    },
    {
        "nombre": "Grupo Andino Retail (Demo)",
        "industria": "Retail",
        "empleados": 3000,
        "pais": "Peru",
        "stack_actual": ["sin directorio central", "sin MDM"],
        "senales_compra": [
            "Tuvo un incidente de seguridad reportado en prensa",
            "Contrato un nuevo CISO",
        ],
    },
    {
        "nombre": "Constructora del Valle (Demo)",
        "industria": "Construccion",
        "empleados": 60,
        "pais": "Chile",
        "stack_actual": ["Active Directory", "varias herramientas de identidad sueltas"],
        "senales_compra": [
            "Publico una vacante para Administrador de TI",
        ],
    },
    {
        "nombre": "FinTech Horizonte (Demo)",
        "industria": "Fintech",
        "empleados": 250,
        "pais": "Argentina",
        "stack_actual": ["Active Directory", "servidores on-prem", "varias herramientas de acceso"],
        "senales_compra": [
            "Solicito una cotizacion enterprise",
            "Asistio a un webinar de compliance",
            "Busco 'MFA' en su propio sitio de soporte",
        ],
    },
]


def _buscar_cuenta(nombre: str) -> dict | None:
    nombre_normalizado = nombre.strip().lower()
    for cuenta in CUENTAS_DEMO:
        if nombre_normalizado in cuenta["nombre"].lower():
            return cuenta
    return None


def _puntaje_stack(stack_actual: list[str]) -> tuple[int, str]:
    texto = " ".join(stack_actual).lower()
    dolor_alto = ["active directory", "on-prem", "varias herramientas"]
    dolor_medio = ["sin directorio central", "sin mdm"]
    modernas = ["okta", "azure ad", "entra id", "google workspace", "jumpcloud", "onelogin"]

    if any(k in texto for k in dolor_alto):
        return 30, "stack con dolor alto (Active Directory, on-prem o varias herramientas sueltas)"
    if any(k in texto for k in dolor_medio):
        return 20, "sin directorio central o sin MDM (dolor medio)"
    if any(k in texto for k in modernas):
        return 8, "ya usa un stack de identidad moderno (dolor bajo)"
    return 8, "stack no clasificado, se asume dolor bajo"


def _calcular_score(cuenta: dict) -> dict:
    razones = []

    empleados = cuenta["empleados"]
    if 50 <= empleados <= 1500:
        pts_tamano = 25
        razones.append(f"tamano ideal ({empleados} empleados): +25")
    else:
        pts_tamano = 5
        razones.append(f"tamano fuera de rango ideal ({empleados} empleados): +5")

    pts_stack, motivo_stack = _puntaje_stack(cuenta["stack_actual"])
    razones.append(f"{motivo_stack}: +{pts_stack}")

    num_senales = len(cuenta["senales_compra"])
    pts_senales = min(num_senales * 15, 45)
    razones.append(f"{num_senales} senal(es) de compra: +{pts_senales}")

    score = pts_tamano + pts_stack + pts_senales

    if score >= 75:
        tier = "A"
        ruteo = "SDR humano"
    elif score >= 50:
        tier = "B"
        ruteo = "Nurture automatico"
    else:
        tier = "C"
        ruteo = "Descartar"

    return {
        "nombre": cuenta["nombre"],
        "score": score,
        "tier": tier,
        "ruteo": ruteo,
        "razon": "; ".join(razones),
    }


# ---------------------------------------------------------------------------
# Herramientas MCP en proceso
# ---------------------------------------------------------------------------


@tool("list_accounts", "Lista las cuentas demo disponibles con su industria y pais.", {})
async def list_accounts(args: dict) -> dict:
    resumen = [
        {
            "nombre": c["nombre"],
            "industria": c["industria"],
            "empleados": c["empleados"],
            "pais": c["pais"],
        }
        for c in CUENTAS_DEMO
    ]
    return {"content": [{"type": "text", "text": json.dumps(resumen, ensure_ascii=False, indent=2)}]}


@tool("get_account", "Obtiene el detalle completo de una cuenta demo por nombre.", {"nombre": str})
async def get_account(args: dict) -> dict:
    cuenta = _buscar_cuenta(args["nombre"])
    if cuenta is None:
        return {
            "content": [{"type": "text", "text": f"No se encontro ninguna cuenta demo que coincida con '{args['nombre']}'."}],
            "is_error": True,
        }
    return {"content": [{"type": "text", "text": json.dumps(cuenta, ensure_ascii=False, indent=2)}]}


@tool("score_icp", "Calcula el score de ICP, tier y ruteo de una cuenta demo por nombre.", {"nombre": str})
async def score_icp(args: dict) -> dict:
    cuenta = _buscar_cuenta(args["nombre"])
    if cuenta is None:
        return {
            "content": [{"type": "text", "text": f"No se encontro ninguna cuenta demo que coincida con '{args['nombre']}'."}],
            "is_error": True,
        }
    resultado = _calcular_score(cuenta)
    return {"content": [{"type": "text", "text": json.dumps(resultado, ensure_ascii=False, indent=2)}]}


@tool(
    "save_to_crm",
    "Guarda el resultado de una cuenta (score, tier, ruteo, razon y mensaje) en el CRM demo local (crm_demo.json).",
    {"nombre": str, "score": float, "tier": str, "ruteo": str, "razon": str, "mensaje": str},
)
async def save_to_crm(args: dict) -> dict:
    registros = []
    if CRM_FILE.exists():
        try:
            registros = json.loads(CRM_FILE.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            registros = []

    registros.append(
        {
            "nombre": args["nombre"],
            "score": args["score"],
            "tier": args["tier"],
            "ruteo": args["ruteo"],
            "razon": args.get("razon", ""),
            "mensaje": args["mensaje"],
        }
    )
    CRM_FILE.write_text(json.dumps(registros, ensure_ascii=False, indent=2), encoding="utf-8")

    return {
        "content": [
            {
                "type": "text",
                "text": f"[CRM DEMO] Guardado localmente en {CRM_FILE.name} para '{args['nombre']}' (tier {args['tier']}).",
            }
        ]
    }


crm_server = create_sdk_mcp_server(
    name="gtm_crm_demo",
    version="1.0.0",
    tools=[list_accounts, get_account, score_icp, save_to_crm],
)


# ---------------------------------------------------------------------------
# Guardrail de aprobacion humana antes de escribir en el CRM demo
# ---------------------------------------------------------------------------


async def can_use_tool(tool_name: str, tool_input: dict, context) -> PermissionResultAllow | PermissionResultDeny:
    if tool_name.endswith("save_to_crm"):
        print("\n--- Aprobacion requerida antes de guardar en el CRM demo ---")
        print(f"Cuenta:  {tool_input.get('nombre')}")
        print(f"Score:   {tool_input.get('score')}")
        print(f"Tier:    {tool_input.get('tier')}")
        print(f"Ruteo:   {tool_input.get('ruteo')}")
        print(f"Mensaje: {tool_input.get('mensaje')}")

        global aprobar_todas
        if aprobar_todas:
            print("(aprobado automaticamente: modo 'aprobar todas' activo)")
            return PermissionResultAllow()

        while True:
            respuesta = input("¿Guardar en el CRM demo? [s = si / n = no / t = si a todas]: ").strip().lower()
            if respuesta == "s":
                return PermissionResultAllow()
            if respuesta == "n":
                return PermissionResultDeny(message="El usuario rechazo guardar esta cuenta en el CRM demo.")
            if respuesta == "t":
                aprobar_todas = True
                return PermissionResultAllow()
            print("Opcion invalida. Escribe 's', 'n' o 't'.")

    return PermissionResultAllow()


aprobar_todas = False


# ---------------------------------------------------------------------------
# Subagente redactor de outreach
# ---------------------------------------------------------------------------

REDACTOR = AgentDefinition(
    description="Redacta mensajes cortos de outreach en espanol de Mexico para cuentas tier A y B.",
    prompt=(
        "Eres 'Sara', una especialista de GTM AI Operations. Escribes mensajes de outreach en frio, "
        "en espanol de Mexico, de maximo 80 palabras. Reglas estrictas:\n"
        "- No inventes datos, cifras ni nombres de personas que no te hayan dado.\n"
        "- No uses corchetes ni placeholders sin rellenar.\n"
        "- No uses emojis.\n"
        "- Firma siempre como 'Sara'.\n"
        "- Usa solo la informacion de la cuenta (industria, stack, señales de compra, tier) que se te entregue.\n"
        "- El tono es profesional, directo y sin exagerar promesas."
    ),
    tools=[],
    model="claude-sonnet-5",
)


# ---------------------------------------------------------------------------
# Agente principal
# ---------------------------------------------------------------------------

SYSTEM_PROMPT = (
    "Eres un agente de GTM AI Operations en una demo. Tu trabajo:\n"
    "1. Llama a list_accounts para ver todas las cuentas demo.\n"
    "2. Para cada cuenta, llama a get_account y luego score_icp para obtener su score, tier y ruteo.\n"
    "3. Para las cuentas con tier A o B, delega en el subagente 'redactor' la redaccion de un mensaje de "
    "outreach (maximo 80 palabras, espanol de Mexico, firmado 'Sara', sin corchetes ni emojis, sin inventar datos). "
    "Para tier C usa el mensaje fijo 'No aplica: cuenta descartada por bajo ajuste a ICP.'\n"
    "4. Llama a save_to_crm para cada cuenta con su nombre, score, tier, ruteo, la razon breve que devolvio "
    "score_icp y el mensaje.\n"
    "5. Al final, presenta una tabla resumen en texto plano ordenada por score de mayor a menor, con columnas "
    "cuenta, score, tier, ruteo y una razon breve.\n"
    "Todo esto es una demostracion con datos ficticios: nunca digas que enviaste nada a alguien real."
)


async def main() -> None:
    if not os.environ.get("ANTHROPIC_API_KEY") or len(os.environ["ANTHROPIC_API_KEY"]) <= 40:
        print(
            "La variable de entorno ANTHROPIC_API_KEY no esta definida (o parece invalida).\n"
            "Definela en tu terminal antes de correr este script, por ejemplo:\n"
            "  export ANTHROPIC_API_KEY=tu_api_key   (macOS/Linux)\n"
            "  $env:ANTHROPIC_API_KEY = 'tu_api_key' (Windows PowerShell)\n"
        )
        return

    options = ClaudeAgentOptions(
        model="claude-sonnet-5",
        system_prompt=SYSTEM_PROMPT,
        mcp_servers={"crm": crm_server},
        allowed_tools=[
            "mcp__crm__list_accounts",
            "mcp__crm__get_account",
            "mcp__crm__score_icp",
        ],
        disallowed_tools=[
            "Bash",
            "Read",
            "Write",
            "Edit",
            "Glob",
            "Grep",
            "WebFetch",
            "WebSearch",
        ],
        can_use_tool=can_use_tool,
        agents={"redactor": REDACTOR},
        permission_mode="default",
    )

    async with ClaudeSDKClient(options=options) as client:
        await client.query(
            "Procesa todas las cuentas demo del CRM siguiendo tus instrucciones de sistema paso a paso."
        )

        async for message in client.receive_response():
            if isinstance(message, AssistantMessage):
                for block in message.content:
                    if isinstance(block, ToolUseBlock):
                        print(f"\n[HERRAMIENTA] {block.name} -> entrada: {json.dumps(block.input, ensure_ascii=False)}")
                    elif isinstance(block, TextBlock):
                        print(block.text)
                    elif isinstance(block, ThinkingBlock):
                        # Se ignoran los bloques de pensamiento: solo se muestra texto.
                        pass
            elif isinstance(message, ResultMessage):
                print("\n--- Fin de la corrida del agente ---")

    _imprimir_tabla_resumen()


def _imprimir_tabla_resumen() -> None:
    if not CRM_FILE.exists():
        print("\nNo se genero crm_demo.json: no hay registros que resumir.")
        return

    registros = json.loads(CRM_FILE.read_text(encoding="utf-8"))
    registros_ordenados = sorted(registros, key=lambda r: r["score"], reverse=True)

    print("\n=== Tabla resumen (CRM demo, ordenada por score) ===")
    encabezado = f"{'Cuenta':<28} {'Score':>5} {'Tier':^4} {'Ruteo':<20} Razon"
    print(encabezado)
    print("-" * len(encabezado))
    for r in registros_ordenados:
        print(f"{r['nombre']:<28} {r['score']:>5} {r['tier']:^4} {r['ruteo']:<20} {r.get('razon', '')}")


if __name__ == "__main__":
    asyncio.run(main())
