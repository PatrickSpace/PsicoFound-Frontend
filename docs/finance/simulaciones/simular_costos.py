#!/usr/bin/env python3
"""Modelo de planificación mensual. No consulta servicios ni ejecuta inferencias.

Uso: python3 simular_costos.py [--inputs supuestos.json] [--output resultados.json]
Todos los montos son USD sin impuestos. Ver informe para alcance y exclusiones.
"""
import argparse
import copy
import json
import math
from decimal import Decimal, ROUND_HALF_UP
from pathlib import Path

GIB = 2**30
ROOT = Path(__file__).resolve().parent


def excess(value, allowance):
    return max(0.0, value - allowance)


def recaptcha_cost(assessments):
    if assessments <= 10_000:
        return 0.0
    return 8.0 + excess(assessments, 100_000) * 0.001


def daily_charge(total, active_days, free_daily, rate):
    # Uniforme dentro de active_days; la cuota no se acumula entre días.
    return active_days * excess(total / active_days, free_daily) * rate


def firestore_network(gib):
    return (max(0, min(gib, 1024) - 10) * 0.12
            + max(0, min(gib, 10240) - 1024) * 0.11
            + max(0, gib - 10240) * 0.08)


def identity_platform_cost(mau):
    return (max(0, min(mau, 100_000) - 50_000) * .0055
            + max(0, min(mau, 1_000_000) - 100_000) * .0046
            + max(0, min(mau, 10_000_000) - 1_000_000) * .0032
            + max(0, mau - 10_000_000) * .0025)


def money(value):
    # Elimina ruido binario antes de redondear importes a centavos.
    return Decimal(f'{value:.8f}').quantize(Decimal('.01'), rounding=ROUND_HALF_UP)


def simulate(config, visitors, conversion, optimized=False, overrides=None):
    a = copy.deepcopy(config['assumptions'])
    a.update(config['optimized'] if optimized else config['baseline'])
    a.update(overrides or {})
    r = config['rates']
    assert visitors >= 0 and 0 <= conversion <= 1
    assert a['ai_turns'] <= a['turns']
    assert 1 <= a['traffic_days'] <= a['days']
    registered = visitors * a['registration_rate']
    entrants = visitors * a['survey_rate']
    payers = visitors * conversion
    served_patients = payers + a['existing_active_patients']
    searches = entrants * a['matching_completion_rate'] * a['searches_per_completion']
    assert payers <= entrants * a['matching_completion_rate'], 'Conversión supera el embudo modelado'
    turns = entrants * a['turns']
    ai_calls = entrants * a['ai_turns']
    non_chat_calls = registered * 3 + entrants * 3 + searches + served_patients * 12
    calls = turns + non_chat_calls + a['days']
    catalogue_reads = (a['therapists'] * 3 + a['available_slots']
                       if not optimized else a['optimized_search_reads'])
    foreground_reads = (visitors * 2 + registered * 20 + entrants * 100
                        + turns * 26 + ai_calls * a['history_docs_per_ai_call']
                        + searches * (catalogue_reads + 8) + served_patients * 500)
    # El job actual lee todos los usuarios cada día, incluidos los suspendidos.
    average_users = a['existing_users'] + registered / 2
    scheduled_reads = a['days'] * average_users
    reads = foreground_reads * a['read_overhead'] + scheduled_reads
    writes = (registered * 10 + entrants * 3 + turns * a['writes_per_turn']
              + non_chat_calls * a['activity_writes_per_call'] + served_patients * 50
              + (a['index_writes_per_day'] * a['days'] if optimized else 0))
    seconds = ((turns - ai_calls) * a['guided_seconds']
               + ai_calls * a['ai_seconds'] + non_chat_calls * a['other_seconds']
               + a['days'] * (2 + average_users * 0.001)) * a['compute_overhead']
    cpu_seconds = seconds * a['vcpu'] / a['effective_concurrency']
    memory_seconds = seconds * a['memory_gib'] / a['effective_concurrency']
    # Cloud Run aplica el nivel gratuito como crédito a tarifas Tier 1.
    compute = (excess(cpu_seconds * r['cpu_second'], r['cpu_credit'])
               + excess(memory_seconds * r['memory_gib_second'], r['memory_credit'])
               + excess(calls - r['requests_free'], 0) * r['request'])
    new_storage_gib = (registered * 3 * 1024 + turns * 10 * 1024 + served_patients * 100 * 1024) / GIB
    average_storage = a['existing_storage_gib'] + new_storage_gib / 2
    browser_reads = visitors * 2 + entrants * 100 + turns * 6 + served_patients * 500
    db_network_gib = browser_reads * a['browser_doc_bytes'] / GIB
    assessments = ((registered * 1.3 if optimized else visitors * 1.2)
                   + served_patients * 3.2)
    components = {
        'firestore_reads': daily_charge(foreground_reads * a['read_overhead'],
                                       a['traffic_days'], 50_000, r['read'])
            if not scheduled_reads else sum(
                excess((foreground_reads * a['read_overhead'] / a['traffic_days']
                        if day < a['traffic_days'] else 0) + average_users, 50_000) * r['read']
                for day in range(a['days'])),
        'firestore_writes': daily_charge(writes, a['traffic_days'], 20_000, r['write']),
        'firestore_storage': excess(average_storage, 1) * r['storage_gib_month'],
        'firestore_network': firestore_network(db_network_gib),
        # Supuesto de siete copias diarias conservadas; no se afirma que estén activas.
        'backup_allowance': average_storage * 7 * r['backup_gib_month'],
        'functions_compute': compute,
        'recaptcha': recaptcha_cost(assessments),
        'scheduler': excess(a['scheduler_jobs'], r['scheduler_free_jobs']) * r['scheduler_job'],
        'auth_identity_platform': identity_platform_cost(registered + a['existing_active_patients'])
            if a['identity_platform'] else 0.0,
        # Provisión explícita, no tarifa: red Functions, logs, secretos, build y artefactos.
        'unmeasured_operations_allowance': a['operations_allowance'],
    }
    backend = sum(components.values())
    loads = visitors * a['loads_per_visitor'] + served_patients * a['extra_loads_per_payer']
    frontend_gb = loads * a['frontend_mb_per_load'] / 1000
    hosting = daily_charge(frontend_gb, a['traffic_days'], 0.36, r['hosting_gb'])
    ia = ai_calls * (a['input_tokens'] * r['ai_input']
                     + a['output_tokens'] * r['ai_output']) / 1_000_000
    # Alternativa comercial, un asiento. Crédito de uso no descuenta la suscripción.
    cdn_requests = loads * a['cdn_requests_per_load']
    vercel_cdn = (0 if cdn_requests <= 1_000_000 and frontend_gb <= 1000 else
                  20 if cdn_requests <= 10_000_000 and frontend_gb <= 50_000 else
                  100 if cdn_requests <= 50_000_000 and frontend_gb <= 50_000 else None)
    vercel = 20 + vercel_cdn if vercel_cdn is not None else None
    total = backend + hosting + ia
    return {
        'visitors': visitors, 'conversion': conversion, 'optimized': optimized,
        'registered': registered, 'survey_entrants': entrants, 'payers': payers,
        'existing_active_patients': a['existing_active_patients'],
        'non_paying_survey_entrants': entrants - payers,
        'ai_calls': ai_calls, 'chat_turns': turns, 'matching_requests': searches,
        'reads_per_matching_request_excluding_guards': catalogue_reads,
        'firestore_reads': reads, 'firestore_writes': writes,
        'functions_requests': calls, 'functions_vcpu_seconds': cpu_seconds,
        'functions_gib_seconds': memory_seconds, 'recaptcha_assessments': assessments,
        'frontend_gb': frontend_gb, 'cdn_requests': cdn_requests,
        'average_storage_gib': average_storage, 'end_storage_gib': average_storage + new_storage_gib / 2,
        'backend_components_usd': components, 'backend_usd': backend,
        'frontend_firebase_usd': hosting, 'ai_usd': ia, 'total_usd': total,
        'planning_budget_usd': math.ceil(total * 1.30),
        'technical_cost_per_payer_usd': total / payers if payers else None,
        'ai_cost_per_payer_usd': ia / payers if payers else None,
        'ai_cost_non_payers_usd': ia * (entrants - payers) / entrants if entrants else 0,
        'frontend_vercel_alternative_usd': vercel,
        'total_with_vercel_alternative_usd': backend + vercel + ia if vercel is not None else None,
    }


def run_checks(config):
    assert recaptcha_cost(10_000) == 0
    assert recaptcha_cost(10_001) == 8
    assert recaptcha_cost(100_000) == 8
    assert recaptcha_cost(130_000) == 38
    assert identity_platform_cost(100_000) == 275
    assert identity_platform_cost(200_000) == 735
    assert str(money(6.674999999999999)) == '6.68'
    assert daily_charge(1_000_000, 30, 50_000, 0.045 / 100_000) == 0
    assert daily_charge(1_000_000, 1, 50_000, 0.045 / 100_000) > 0
    for v in (0, 1000, 10_000, 100_000):
        for c in (0, .005, .02, .05):
            for opt in (False, True):
                row = simulate(config, v, c, opt)
                assert math.isclose(row['total_usd'], row['backend_usd'] + row['frontend_firebase_usd'] + row['ai_usd'])
                assert row['total_usd'] >= 0
    zero_ai = simulate(config, 10_000, .02, overrides={'ai_turns': 0})
    assert zero_ai['ai_usd'] == 0 and zero_ai['backend_usd'] > 0
    # 10k visitantes, 30% encuesta, 4 llamadas, 2500 entrada y 250 salida.
    assert math.isclose(simulate(config, 10_000, .02)['ai_usd'], 4.5)
    # 10k visitantes generan 200 pagadores al 2%, no 2000 ni 200 visitantes.
    assert simulate(config, 10_000, .02)['payers'] == 200
    assert simulate(config, 100_000, .02, True)['firestore_reads'] < simulate(config, 100_000, .02)['firestore_reads']


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--inputs', type=Path, default=ROOT / 'supuestos.json')
    parser.add_argument('--output', type=Path, default=ROOT / 'resultados.json')
    args = parser.parse_args()
    config = json.loads(args.inputs.read_text())
    run_checks(config)
    rows = [simulate(config, v, c, opt) for opt in (False, True)
            for v in (1000, 10_000, 100_000) for c in (.005, .02, .05)]
    sensitivity = []
    for free_turns in (0, 2, 4, 12, 30):
        sensitivity.append(simulate(config, 10_000, .02, overrides={
            'ai_turns': free_turns, 'turns': max(8, free_turns),
            'input_tokens': 5000 if free_turns >= 12 else 2500,
            'output_tokens': 700 if free_turns >= 12 else 250,
            'history_docs_per_ai_call': 30 if free_turns >= 12 else 8,
        }))
    result = {'date': config['date'], 'currency': 'USD', 'scenarios': rows,
              'ai_intensity_10k': sensitivity,
              'adoption_100k': [simulate(config, 100_000, .02, opt, overrides={
                  'survey_rate': adoption, 'registration_rate': max(.4, adoption),
              }) for opt in (False, True) for adoption in (.1, .3, .6, 1)],
              'catalogue_100k': [simulate(config, 100_000, .02, overrides={
                  'therapists': therapists, 'available_slots': slots,
              }) for therapists, slots in [(20, 200), (100, 2000), (500, 10000), (1000, 50000)]],
              'recurring_patients_10k': [simulate(config, 10_000, .02, opt, overrides={
                  'existing_active_patients': patients,
              }) for opt in (False, True) for patients in (0, 1000, 10000)],
              'burst_1_day_10k': simulate(config, 10_000, .02, overrides={'traffic_days': 1}),
              'checks': 'passed: arithmetic, quotas, zero conversions, no AI and component reconciliation'}
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, indent=2, ensure_ascii=False) + '\n')
    print('Modelo validado. Resultados:', args.output)
    print('Modo | Visitantes | Pagadores 2% | Backend USD | Frontend USD | IA USD | Total USD | Presupuesto +30%')
    for row in rows:
        if row['conversion'] == .02:
            print(('Optimizado' if row['optimized'] else 'Base'), row['visitors'], int(row['payers']),
                  *[money(row[k]) for k in ('backend_usd', 'frontend_firebase_usd', 'ai_usd', 'total_usd', 'planning_budget_usd')], sep=' | ')


if __name__ == '__main__':
    main()
