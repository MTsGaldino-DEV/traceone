"""
Script: import_medidores.py
Limpa medidores_list + servicos_report e reimporta a partir do CSV.

Regras:
- "SERVIÇO GDIS" preenchido (não vazio, não #N/D) → status CONCLUIDO + preenche servico_gdis
- "SERVIÇO GDIS" vazio ou #N/D → status PENDENTE, servico_gdis NULL
- servicos_report é populada com os serviços referenciados (FK necessária)
"""
import csv, json, urllib.request, datetime, sys

URL = "https://ctlaygzndbaojxpwqsco.supabase.co/rest/v1"
KEY = "SERVICE_ROLE_KEY_REMOVED"
BASE_HEADERS = {
    "apikey": KEY,
    "Authorization": f"Bearer {KEY}",
    "Content-Type": "application/json",
}

CSV_PATH = "C:/APPWEB/traceone/Importação/medidores_list.CSV"
BATCH_SIZE = 500
INVALID_GDIS = {"", "#n/d", "#n/a", "#ref!", "#value!", "#div/0!"}


def req(method, path, body=None, extra_headers=None):
    headers = {**BASE_HEADERS, **(extra_headers or {})}
    data = json.dumps(body).encode() if body is not None else None
    r = urllib.request.Request(f"{URL}/{path}", data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(r) as resp:
            raw = resp.read()
            return json.loads(raw) if raw else None
    except urllib.error.HTTPError as e:
        print(f"HTTP {e.code}: {e.read().decode()}", file=sys.stderr)
        raise


def parse_date(s):
    s = (s or "").strip()
    if not s:
        return None
    try:
        return datetime.datetime.strptime(s, "%d/%m/%Y").strftime("%Y-%m-%d")
    except ValueError:
        return None


def get_existing_matriculas():
    result = set()
    offset = 0
    while True:
        batch = req("GET", f"colaboradores?select=matricula&limit=1000&offset={offset}")
        if not batch:
            break
        for r in batch:
            result.add(r["matricula"])
        if len(batch) < 1000:
            break
        offset += 1000
    return result


def get_existing_tipos():
    tipos = req("GET", "tipos_de_medidores?select=cod_sap")
    return {t["cod_sap"] for t in (tipos or [])}


def create_colaboradores(missing):
    rows = [{"matricula": m["matricula"], "nome": m["nome"], "supervisor": m["supervisor"] or None} for m in missing]
    for i in range(0, len(rows), 100):
        req("POST", "colaboradores", rows[i:i+100], extra_headers={"Prefer": "resolution=ignore-duplicates"})
    print(f"  Criados {len(rows)} colaboradores ausentes.")


def delete_table_in_batches(table, pk):
    """Busca PKs e deleta em lotes de 200 para evitar timeout."""
    offset = 0
    total = 0
    while True:
        rows = req("GET", f"{table}?select={pk}&limit=200&offset={offset}")
        if not rows:
            break
        ids = [r[pk] for r in rows]
        id_list = ",".join(f'"{i}"' if "-" in str(i) else str(i) for i in ids)
        req("DELETE", f"{table}?{pk}=in.({id_list})")
        total += len(ids)
        print(f"  {total} deletados...")
        if len(rows) < 200:
            break
    print(f"  {table} zerada ({total} registros).")


def delete_all():
    print("Zerando medidores_list...")
    delete_table_in_batches("medidores_list", "id")
    print("Zerando servicos_report...")
    delete_table_in_batches("servicos_report", "servico")


def insert_servicos_report(servicos_map):
    """
    servicos_map: dict { servico_gdis_str -> {matricula, termino} }
    termino deve ser uma data ISO (usamos como TIMESTAMPTZ).
    """
    rows = []
    for servico, info in servicos_map.items():
        rows.append({
            "servico": servico,
            "matricula": info["matricula"],
            "termino": info["termino"] + "T00:00:00+00:00",
            "status_conferencia": "CONFERIDO",
        })
    print(f"Inserindo {len(rows)} registros em servicos_report...")
    for i in range(0, len(rows), BATCH_SIZE):
        req("POST", "servicos_report", rows[i:i+BATCH_SIZE],
            extra_headers={"Prefer": "resolution=ignore-duplicates"})
        print(f"  {min(i+BATCH_SIZE, len(rows))}/{len(rows)}")
    print("  servicos_report preenchida.")


def insert_medidores(parsed):
    print(f"Inserindo {len(parsed)} registros em medidores_list...")
    total = 0
    for i in range(0, len(parsed), BATCH_SIZE):
        batch = parsed[i:i+BATCH_SIZE]
        req("POST", "medidores_list", batch, extra_headers={"Prefer": "resolution=ignore-duplicates"})
        total += len(batch)
        print(f"  {total}/{len(parsed)}")
    print("  medidores_list preenchida.")


def main():
    print("Lendo CSV...")
    with open(CSV_PATH, encoding="windows-1252") as f:
        raw_rows = list(csv.DictReader(f, delimiter=";"))
    print(f"  {len(raw_rows)} linhas lidas.")

    parsed = []
    skipped = 0
    colabs_from_csv = {}
    servicos_map = {}  # servico_gdis -> {matricula, termino}

    for r in raw_rows:
        serial    = r.get("Serial", "").strip()
        mat_sap   = r.get("Material SAP", "").strip()
        matricula = r.get("MATRICULA", "").strip().lower()
        data      = parse_date(r.get("Data", ""))

        if not serial or not mat_sap or not matricula or not data:
            skipped += 1
            continue

        # SERVIÇO GDIS — detecta valor real vs erro/vazio
        gdis_raw = r.get("SERVI\xc7O GDIS", r.get("SERVIÇO GDIS", "")).strip()
        gdis_val = gdis_raw if gdis_raw.lower() not in INVALID_GDIS else None

        if gdis_val:
            status = "CONCLUIDO"
        else:
            gdis_val = None
            status_raw = r.get("Conclu\xeddo/Pendente", r.get("Concluído/Pendente", "Pendente")).strip()
            status = "CONCLUIDO" if "onclu" in status_raw else "PENDENTE"

        data_conclusao = parse_date(r.get("Data da conclus\xe3o", r.get("Data da conclusão", "")))
        nome       = r.get("COLABORADOR ", r.get("COLABORADOR", "")).strip()
        supervisor = r.get("SUPERVISOR", "").strip() or None
        servico_campo = r.get("SERVI\xc7O CAMPO", r.get("SERVIÇO CAMPO", "")).strip() or None

        colabs_from_csv[matricula] = {"matricula": matricula, "nome": nome or matricula, "supervisor": supervisor}

        # Registra serviço para inserir em servicos_report (FK)
        if gdis_val:
            if gdis_val not in servicos_map:
                termino = data_conclusao or data
                servicos_map[gdis_val] = {"matricula": matricula, "termino": termino}

        parsed.append({
            "data":          data,
            "material_sap":  mat_sap,
            "serial":        serial,
            "matricula":     matricula,
            "status":        status,
            "data_conclusao": data_conclusao,
            "servico_gdis":  gdis_val,
            "servico_campo": servico_campo,
        })

    print(f"  {len(parsed)} linhas válidas, {skipped} ignoradas.")
    gdis_count = sum(1 for p in parsed if p["servico_gdis"])
    print(f"  Com SERVIÇO GDIS (CONCLUIDO): {gdis_count}")
    print(f"  Sem SERVIÇO GDIS (PENDENTE):  {len(parsed) - gdis_count}")

    # Colaboradores faltantes
    print("\nVerificando colaboradores...")
    existing_mats = get_existing_matriculas()
    missing_mats = [v for k, v in colabs_from_csv.items() if k not in existing_mats]
    if missing_mats:
        print(f"  {len(missing_mats)} ausentes — criando...")
        create_colaboradores(missing_mats)
    else:
        print("  Todos existem.")

    # Tipos faltantes
    print("Verificando tipos de medidores...")
    existing_tipos = get_existing_tipos()
    sap_in_csv = {r["material_sap"] for r in parsed}
    missing_tipos = sap_in_csv - existing_tipos
    if missing_tipos:
        print(f"  ATENÇÃO: SAP codes não cadastrados, serão ignorados: {missing_tipos}")
        parsed = [r for r in parsed if r["material_sap"] not in missing_tipos]

    # Reset
    print()
    delete_all()

    # Insere servicos_report antes (FK)
    print()
    if servicos_map:
        insert_servicos_report(servicos_map)

    # Insere medidores
    print()
    insert_medidores(parsed)

    print(f"\n✓ Concluído! {len(parsed)} medidores importados, {len(servicos_map)} serviços GDIS referenciados.")


if __name__ == "__main__":
    main()
