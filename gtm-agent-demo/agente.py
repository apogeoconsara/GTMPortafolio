"""
gtm-agent-demo - Agente de GTM AI Operations construido con el Claude Agent SDK.

Version de linea de comandos (CLI). Para una interfaz de chat en el navegador,
ve chat_app.py (README: seccion "Interfaz de chat en el navegador").

DEMO FICTICIA: todas las cuentas, señales y mensajes son inventados.
El agente no envía correos, no escribe en ningún CRM real ni contacta a nadie.
Todo lo que "guarda" queda en un archivo local: crm_demo.json.
"""

import asyncio
import json
import os
import sys

from claude_agent_sdk import (
    AssistantMessage,
    ClaudeSDKClient,
    PermissionResultAllow,
    PermissionResultDeny,
    ResultMessage,
    TextBlock,
    ThinkingBlock,
    ToolUseBlock,
)

from gtm_agent_core import CRM_FILE, build_options, leer_registros_crm

# Compatibilidad con consolas de Windows (evita errores de encoding con acentos).
sys.stdout.reconfigure(encoding="utf-8")

aprobar_todas = False


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


async def main() -> None:
    if not os.environ.get("ANTHROPIC_API_KEY") or len(os.environ["ANTHROPIC_API_KEY"]) <= 40:
        print(
            "La variable de entorno ANTHROPIC_API_KEY no esta definida (o parece invalida).\n"
            "Definela en tu terminal antes de correr este script, por ejemplo:\n"
            "  export ANTHROPIC_API_KEY=tu_api_key   (macOS/Linux)\n"
            "  $env:ANTHROPIC_API_KEY = 'tu_api_key' (Windows PowerShell)\n"
        )
        return

    options = build_options(can_use_tool)

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
    registros = leer_registros_crm()
    if not registros:
        print("\nNo se genero crm_demo.json: no hay registros que resumir.")
        return

    registros_ordenados = sorted(registros, key=lambda r: r["score"], reverse=True)

    print("\n=== Tabla resumen (CRM demo, ordenada por score) ===")
    encabezado = f"{'Cuenta':<28} {'Score':>5} {'Tier':^4} {'Ruteo':<20} Razon"
    print(encabezado)
    print("-" * len(encabezado))
    for r in registros_ordenados:
        print(f"{r['nombre']:<28} {r['score']:>5} {r['tier']:^4} {r['ruteo']:<20} {r.get('razon', '')}")


if __name__ == "__main__":
    asyncio.run(main())
