#!/usr/bin/env python3
# Humo de la imagen del front (MJ-15 del plan de mejoras): espera a que el contenedor sirva la app y verifica que la
# pagina tenga el punto de montaje de React (div raiz) y que el JavaScript del build responda. Lo usa el job "imagen" de
# .github/workflows/calidad.yml despues de `python deploy/deploy.py --local`.
# Uso: python .github/scripts/smoke_imagen.py [--url http://localhost:7091/]
import argparse
import re
import sys
import time
import urllib.error
import urllib.request


def leer(url: str) -> tuple[int, str]:
    """GET; responde el status y el texto."""
    try:
        with urllib.request.urlopen(url, timeout=15) as respuesta:
            return respuesta.status, respuesta.read().decode(errors="replace")
    except urllib.error.HTTPError as error:
        return error.code, ""


def main() -> int:
    parser = argparse.ArgumentParser(description="Humo de la imagen del front.")
    parser.add_argument("--url", default="http://localhost:7091/", help="URL de la app")
    parser.add_argument("--espera", type=int, default=180, help="segundos maximos para que levante")
    args = parser.parse_args()

    limite = time.time() + args.espera
    html = ""
    while time.time() < limite:
        try:
            status, html = leer(args.url)
            if status == 200 and 'id="raiz"' in html:
                break
        except OSError:
            pass
        time.sleep(3)
    else:
        sys.exit(f"[imagen] la app no respondio en {args.espera} s")
    print("[imagen] index.html OK")

    script = re.search(r'src="([^"]+\.js)"', html)
    if not script:
        sys.exit("[imagen] index.html no referencia el JavaScript del build")
    status, _ = leer(urllib.request.urljoin(args.url, script.group(1)))
    if status != 200:
        sys.exit(f"[imagen] el JavaScript del build respondio {status}")
    print("[imagen] JavaScript del build OK")
    return 0


if __name__ == "__main__":
    sys.exit(main())
