#!/usr/bin/env python3
"""Import clients/policies exported from רואטו (Roeto) or שורנס (SureNS)
into the CRM's Supabase database.

Roeto/SureNS don't expose a public, stable export schema, so this script
works off two column-mapping dicts below (CLIENT_COLUMN_MAP /
POLICY_COLUMN_MAP): edit the left-hand keys to match the actual column
headers in your exported CSV/XLSX before running.

Usage:
    python scripts/import_clients_policies.py \\
        --agent-id <agent-uuid> \\
        --clients-file export_clients.xlsx \\
        --policies-file export_policies.xlsx

Requires DATABASE_URL (a direct Postgres connection string to the Supabase
project, e.g. from Project Settings -> Database) in the environment, or
pass --database-url.
"""

import argparse
import os
import sys

import pandas as pd
import psycopg2

# Map: "column header in the Roeto/SureNS export" -> "our schema field".
# Edit these to match the real export before running.
CLIENT_COLUMN_MAP = {
    "תעודת זהות": "id_number",
    "שם מלא": "full_name",
    "טלפון": "phone",
    "אימייל": "email",
    "תאריך לידה": "birth_date",
}

POLICY_COLUMN_MAP = {
    "תעודת זהות": "client_id_number",  # links each policy row back to a client
    "מספר פוליסה": "policy_number",
    "חברת ביטוח": "company",
    "סוג ביטוח": "insurance_type",
    "תאריך תחילה": "start_date",
    "תאריך חידוש": "renewal_date",
    "פרמיה חודשית": "monthly_premium",
}


def load_dataframe(path: str) -> pd.DataFrame:
    if path.lower().endswith((".xlsx", ".xls")):
        return pd.read_excel(path, dtype=str)
    return pd.read_csv(path, dtype=str)


def upsert_clients(conn, agent_id: str, df: pd.DataFrame) -> dict[str, str]:
    """Inserts/updates clients, returns {id_number: client_uuid}."""
    df = df.rename(columns=CLIENT_COLUMN_MAP)[list(CLIENT_COLUMN_MAP.values())]
    df = df.dropna(subset=["id_number", "full_name", "phone"])

    id_number_to_uuid: dict[str, str] = {}
    with conn.cursor() as cur:
        for row in df.to_dict("records"):
            cur.execute(
                """
                insert into clients (agent_id, id_number, full_name, phone, email, birth_date)
                values (%(agent_id)s, %(id_number)s, %(full_name)s, %(phone)s, %(email)s, %(birth_date)s)
                on conflict (agent_id, id_number) do update
                    set full_name = excluded.full_name,
                        phone = excluded.phone,
                        email = excluded.email,
                        birth_date = excluded.birth_date
                returning id, id_number
                """,
                {**row, "agent_id": agent_id},
            )
            client_id, id_number = cur.fetchone()
            id_number_to_uuid[id_number] = client_id
    conn.commit()
    print(f"Upserted {len(id_number_to_uuid)} clients.")
    return id_number_to_uuid


def insert_policies(
    conn, agent_id: str, df: pd.DataFrame, client_id_by_number: dict[str, str]
) -> None:
    df = df.rename(columns=POLICY_COLUMN_MAP)[list(POLICY_COLUMN_MAP.values())]
    df = df.dropna(subset=["client_id_number", "policy_number", "company"])

    inserted, skipped_no_client, skipped_existing = 0, 0, 0
    with conn.cursor() as cur:
        for row in df.to_dict("records"):
            client_id = client_id_by_number.get(row["client_id_number"])
            if not client_id:
                skipped_no_client += 1
                continue

            cur.execute(
                "select 1 from policies where agent_id = %s and policy_number = %s",
                (agent_id, row["policy_number"]),
            )
            if cur.fetchone():
                skipped_existing += 1
                continue

            cur.execute(
                """
                insert into policies
                    (agent_id, client_id, policy_number, company, insurance_type,
                     start_date, renewal_date, monthly_premium)
                values
                    (%(agent_id)s, %(client_id)s, %(policy_number)s, %(company)s, %(insurance_type)s,
                     %(start_date)s, %(renewal_date)s, %(monthly_premium)s)
                """,
                {
                    **row,
                    "agent_id": agent_id,
                    "client_id": client_id,
                },
            )
            inserted += 1
    conn.commit()
    print(
        f"Inserted {inserted} policies "
        f"(skipped {skipped_no_client} with no matching client, "
        f"{skipped_existing} already existing)."
    )


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--agent-id", required=True, help="agents.id (uuid) to attach rows to")
    parser.add_argument("--clients-file", help="path to a clients export CSV/XLSX")
    parser.add_argument("--policies-file", help="path to a policies export CSV/XLSX")
    parser.add_argument(
        "--database-url",
        default=os.environ.get("DATABASE_URL"),
        help="Postgres connection string (defaults to $DATABASE_URL)",
    )
    args = parser.parse_args()

    if not args.database_url:
        sys.exit("Set DATABASE_URL or pass --database-url")
    if not args.clients_file and not args.policies_file:
        sys.exit("Pass at least one of --clients-file / --policies-file")

    conn = psycopg2.connect(args.database_url)
    try:
        client_id_by_number: dict[str, str] = {}
        if args.clients_file:
            client_id_by_number = upsert_clients(
                conn, args.agent_id, load_dataframe(args.clients_file)
            )
        if args.policies_file:
            if not client_id_by_number:
                # Policies-only run: look up existing clients instead of
                # relying on the just-upserted set.
                with conn.cursor() as cur:
                    cur.execute(
                        "select id_number, id from clients where agent_id = %s",
                        (args.agent_id,),
                    )
                    client_id_by_number = {
                        id_number: client_id for id_number, client_id in cur.fetchall()
                    }
            insert_policies(
                conn, args.agent_id, load_dataframe(args.policies_file), client_id_by_number
            )
    finally:
        conn.close()


if __name__ == "__main__":
    main()
