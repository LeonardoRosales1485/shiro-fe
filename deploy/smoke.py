#!/usr/bin/env python3
# Smoke del ambiente desplegado: reemplaza al Bruno de obtencion contra staging/produccion.
# Verifica que /actuator/health responda UP y que /actuator/info responda la version esperada.
#
# Uso:
#   python deploy/smoke.py <entorno> [servicio] [--version X.Y.Z] [--url URL_BASE]
#
#   entorno     Bloque de deploy.yml (ej. local, malvinas2).
#   servicio    Servicio del bloque (default: el primero).
#   --version   Version esperada (default: el <version> de app/pom.xml).
#   --url       URL base de la API, si no se puede deducir de deploy.yml (ej. https://stg.dominio.com/proyecto/api).
#
# La URL base sale del servicio: con domain, https://<domain>[/<path>]/api (plantilla nginx de Spring); sin
# domain, http://localhost:<port>/api. Sale con codigo 0 si todo esta bien y 1 si algo falla.
# En Windows correr con PYTHONUTF8=1 (o desde una consola UTF-8): igual el script fuerza UTF-8 en su salida.

import argparse
import json
import sys
import urllib.error
import urllib.request
from pathlib import Path
from xml.etree import ElementTree

DEPLOY_DIR = Path(__file__).resolve().parent
REPO_ROOT = DEPLOY_DIR.parent
POM_APP = REPO_ROOT / "app" / "pom.xml"
TIMEOUT_SEGUNDOS = 15

sys.path.insert(0, str(DEPLOY_DIR))

from deployer import yml_parser  # noqa: E402


def _utf8() -> None:
    """Fuerza UTF-8 en stdout/stderr (equivalente a PYTHONUTF8=1 para la salida del script)."""
    for stream in (sys.stdout, sys.stderr):
        if hasattr(stream, "reconfigure"):
            stream.reconfigure(encoding="utf-8")


def version_del_codigo() -> str:
    """Lee la version del proyecto del <version> de app/pom.xml (el del proyecto, no el del parent).

    Returns:
        La version (ej. 1.0.130).
    """
    raiz = ElementTree.parse(POM_APP).getroot()
    version = raiz.find("{http://maven.apache.org/POM/4.0.0}version")
    if version is None or not (version.text or "").strip():
        raise SystemExit(f"[smoke] no se encontro <version> en {POM_APP}")
    return version.text.strip()


def url_base(entorno: str, servicio: str | None) -> str:
    """Deduce la URL base de la API desde deploy.yml.

    Args:
        entorno: Bloque de deploy.yml.
        servicio: Servicio del bloque; None para el primero.
    Returns:
        URL base terminada en /api, sin barra final.
    """
    datos = yml_parser.load_yaml(REPO_ROOT / "deploy.yml")
    _, cfg = yml_parser.select_service(datos, entorno, servicio)
    dominio = str(cfg.get("domain", "") or "").strip()
    path = str(cfg.get("path", "") or "").strip().strip("/")
    if dominio:
        return f"https://{dominio}" + (f"/{path}" if path else "") + "/api"
    puerto = str(cfg.get("port", "") or "").strip()
    if not puerto:
        raise SystemExit(f"[smoke] el servicio de [{entorno}] no tiene domain ni port: usar --url")
    return f"http://localhost:{puerto}/api"


def get_json(url: str) -> tuple[int, dict]:
    """Hace un GET y parsea el body JSON.

    Args:
        url: URL a consultar.
    Returns:
        (status HTTP, body como dict; vacio si no es JSON).
    """
    request = urllib.request.Request(url, headers={"Accept": "application/json"})
    try:
        with urllib.request.urlopen(request, timeout=TIMEOUT_SEGUNDOS) as respuesta:
            status, cuerpo = respuesta.status, respuesta.read()
    except urllib.error.HTTPError as error:
        status, cuerpo = error.code, error.read()
    try:
        return status, json.loads(cuerpo.decode("utf-8") or "{}")
    except ValueError:
        return status, {}


def main() -> int:
    _utf8()
    parser = argparse.ArgumentParser(description="Smoke del ambiente desplegado: health UP y version esperada.")
    parser.add_argument("entorno", help="bloque de deploy.yml")
    parser.add_argument("servicio", nargs="?", default=None, help="servicio del bloque (default: el primero)")
    parser.add_argument("--version", dest="version", default=None, help="version esperada (default: <version> de app/pom.xml)")
    parser.add_argument("--url", dest="url", default=None, help="URL base de la API (ej. https://host/api)")
    args = parser.parse_args()

    base = (args.url or url_base(args.entorno, args.servicio)).rstrip("/")
    esperada = args.version or version_del_codigo()
    print(f"[smoke] {base} | version esperada {esperada}")

    fallas = []
    try:
        status, health = get_json(f"{base}/actuator/health")
        print(f"[smoke] health: HTTP {status} {health}")
        if status != 200 or health.get("status") != "UP":
            fallas.append(f"health no esta UP (HTTP {status}, status {health.get('status')})")

        status, info = get_json(f"{base}/actuator/info")
        print(f"[smoke] info: HTTP {status} {info}")
        if status != 200 or info.get("version") != esperada:
            fallas.append(f"version {info.get('version')} distinta de la esperada {esperada} (HTTP {status})")
    except (urllib.error.URLError, TimeoutError, OSError) as error:
        fallas.append(f"no se pudo conectar a {base}: {error}")

    if fallas:
        for falla in fallas:
            print(f"[smoke] FALLA: {falla}", file=sys.stderr)
        return 1
    print("[smoke] OK")
    return 0


if __name__ == "__main__":
    sys.exit(main())
