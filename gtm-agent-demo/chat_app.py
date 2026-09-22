"""
gtm-agent-demo - Interfaz de chat en el navegador (Streamlit) para el mismo
agente de GTM AI Operations que corre en agente.py (CLI).

Corre localmente con: streamlit run chat_app.py
No es un deploy publico: solo se abre en tu propio navegador, en tu maquina,
usando tu propia ANTHROPIC_API_KEY.

DEMO FICTICIA: todas las cuentas, señales y mensajes son inventados. El agente
no envia correos ni escribe en ningun CRM real; todo queda en crm_demo.json.
"""

import asyncio
import json
import os
import queue
import threading
import time
import uuid

import streamlit as st
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

from gtm_agent_core import build_options, leer_registros_crm

st.set_page_config(page_title="gtm-agent-demo", page_icon="🧭")


class AgentWorker:
    """Corre el ClaudeSDKClient en un hilo con su propio event loop, para que
    Streamlit (sincrono, basado en reruns) pueda hablar con el agente (async)
    a traves de colas thread-safe."""

    def __init__(self) -> None:
        self.events: queue.Queue = queue.Queue()
        self.incoming: queue.Queue = queue.Queue()
        self.decisions: queue.Queue = queue.Queue()
        self.loop: asyncio.AbstractEventLoop | None = None
        self.auto_approve = False
        self._started = False
        self._thread = threading.Thread(target=self._run_loop, daemon=True)

    def start(self) -> None:
        if not self._started:
            self._started = True
            self._thread.start()

    def send_message(self, text: str) -> None:
        self.start()
        self.incoming.put(text)

    def submit_decision(self, approved: bool, approve_all: bool = False) -> None:
        if approve_all:
            self.auto_approve = True
        self.decisions.put({"approved": approved})

    def _run_loop(self) -> None:
        self.loop = asyncio.new_event_loop()
        asyncio.set_event_loop(self.loop)
        self.loop.run_until_complete(self._main())

    async def _main(self) -> None:
        options = build_options(self._can_use_tool)
        try:
            async with ClaudeSDKClient(options=options) as client:
                while True:
                    user_msg = await self.loop.run_in_executor(None, self.incoming.get)
                    await client.query(user_msg)
                    async for message in client.receive_response():
                        if isinstance(message, AssistantMessage):
                            for block in message.content:
                                if isinstance(block, ToolUseBlock):
                                    self.events.put(
                                        {"type": "tool_use", "name": block.name, "input": block.input}
                                    )
                                elif isinstance(block, TextBlock):
                                    self.events.put({"type": "text", "text": block.text})
                                elif isinstance(block, ThinkingBlock):
                                    pass
                        elif isinstance(message, ResultMessage):
                            self.events.put({"type": "turn_done"})
        except Exception as exc:  # noqa: BLE001 - se muestra en la UI, no se silencia
            self.events.put({"type": "error", "text": str(exc)})

    async def _can_use_tool(self, tool_name, tool_input, context):
        if tool_name.endswith("save_to_crm"):
            if self.auto_approve:
                return PermissionResultAllow()

            req_id = str(uuid.uuid4())
            self.events.put({"type": "approval_request", "req_id": req_id, "input": tool_input})
            decision = await self.loop.run_in_executor(None, self.decisions.get)
            if decision["approved"]:
                return PermissionResultAllow()
            return PermissionResultDeny(message="El usuario rechazo guardar esta cuenta en el CRM demo.")
        return PermissionResultAllow()


def _get_worker() -> AgentWorker:
    if "worker" not in st.session_state:
        st.session_state.worker = AgentWorker()
        st.session_state.chat_log = []
        st.session_state.pending_approval = None
        st.session_state.running = False
    return st.session_state.worker


def _drenar_eventos(worker: AgentWorker) -> None:
    while True:
        try:
            event = worker.events.get_nowait()
        except queue.Empty:
            return

        if event["type"] == "tool_use":
            st.session_state.chat_log.append(
                {"role": "tool", "name": event["name"], "input": event["input"]}
            )
        elif event["type"] == "text":
            st.session_state.chat_log.append({"role": "assistant", "text": event["text"]})
        elif event["type"] == "approval_request":
            st.session_state.pending_approval = event
            return  # el hilo del agente esta bloqueado esperando la decision
        elif event["type"] == "turn_done":
            st.session_state.running = False
        elif event["type"] == "error":
            st.session_state.chat_log.append({"role": "error", "text": event["text"]})
            st.session_state.running = False


def _render_chat_log() -> None:
    for item in st.session_state.chat_log:
        if item["role"] == "user":
            st.chat_message("user").write(item["text"])
        elif item["role"] == "assistant":
            st.chat_message("assistant").write(item["text"])
        elif item["role"] == "tool":
            with st.chat_message("assistant"):
                st.caption(f"🔧 Herramienta: {item['name']}")
                st.json(item["input"])
        elif item["role"] == "error":
            st.chat_message("assistant").error(item["text"])


def _render_pending_approval(worker: AgentWorker) -> None:
    req = st.session_state.pending_approval
    tool_input = req["input"]
    with st.chat_message("assistant"):
        st.warning("El agente pide aprobacion antes de guardar esta cuenta en el CRM demo (crm_demo.json).")
        st.write(f"**Cuenta:** {tool_input.get('nombre')}")
        st.write(f"**Score:** {tool_input.get('score')}  |  **Tier:** {tool_input.get('tier')}  |  **Ruteo:** {tool_input.get('ruteo')}")
        st.write(f"**Mensaje:** {tool_input.get('mensaje')}")

        col_si, col_no, col_todas = st.columns(3)
        req_id = req["req_id"]
        if col_si.button("Si, guardar", key=f"si_{req_id}"):
            worker.submit_decision(approved=True)
            st.session_state.chat_log.append({"role": "assistant", "text": f"Aprobado: se guardo '{tool_input.get('nombre')}' en el CRM demo."})
            st.session_state.pending_approval = None
            st.rerun()
        if col_no.button("No", key=f"no_{req_id}"):
            worker.submit_decision(approved=False)
            st.session_state.chat_log.append({"role": "assistant", "text": f"Rechazado: no se guardo '{tool_input.get('nombre')}'."})
            st.session_state.pending_approval = None
            st.rerun()
        if col_todas.button("Si a todas", key=f"todas_{req_id}"):
            worker.submit_decision(approved=True, approve_all=True)
            st.session_state.chat_log.append({"role": "assistant", "text": "Aprobacion automatica activada para el resto de esta sesion."})
            st.session_state.pending_approval = None
            st.rerun()


def _render_tabla_crm() -> None:
    registros = leer_registros_crm()
    if not registros:
        return
    registros_ordenados = sorted(registros, key=lambda r: r["score"], reverse=True)
    with st.sidebar.expander("CRM demo (crm_demo.json)", expanded=True):
        st.dataframe(
            [
                {
                    "Cuenta": r["nombre"],
                    "Score": r["score"],
                    "Tier": r["tier"],
                    "Ruteo": r["ruteo"],
                }
                for r in registros_ordenados
            ],
            hide_index=True,
            width="stretch",
        )


def main() -> None:
    st.title("gtm-agent-demo")
    st.caption(
        "Demo ficticia de un agente de GTM AI Operations (Claude Agent SDK). "
        "No envia correos ni escribe en ningun CRM real; todo queda en crm_demo.json local."
    )

    api_key = os.environ.get("ANTHROPIC_API_KEY", "")
    if not api_key or len(api_key) <= 40:
        st.error(
            "La variable de entorno ANTHROPIC_API_KEY no esta definida (o parece invalida). "
            "Definela en la terminal donde corriste `streamlit run chat_app.py` y recarga la pagina."
        )
        st.stop()

    worker = _get_worker()

    with st.sidebar:
        st.subheader("Sobre este demo")
        st.write(
            "Todas las cuentas estan marcadas '(Demo)' y son ficticias. "
            "Antes de cada escritura al CRM demo, el agente pide tu aprobacion aqui mismo, en el chat."
        )
        if st.button("Procesar todas las cuentas demo"):
            st.session_state.chat_log.append(
                {"role": "user", "text": "Procesa todas las cuentas demo del CRM y dame la tabla resumen."}
            )
            st.session_state.running = True
            worker.send_message("Procesa todas las cuentas demo del CRM siguiendo tus instrucciones de sistema paso a paso.")
        _render_tabla_crm()

    _drenar_eventos(worker)
    _render_chat_log()

    if st.session_state.pending_approval:
        _render_pending_approval(worker)
    elif st.session_state.running:
        with st.chat_message("assistant"):
            st.caption("El agente esta trabajando...")

    prompt = st.chat_input("Pidele al agente que procese una cuenta, o pregunta algo sobre las cuentas demo...")
    if prompt:
        st.session_state.chat_log.append({"role": "user", "text": prompt})
        st.session_state.running = True
        worker.send_message(prompt)
        st.rerun()

    if st.session_state.running and not st.session_state.pending_approval:
        time.sleep(0.4)
        st.rerun()


if __name__ == "__main__":
    main()
