#!/usr/bin/env python3
"""Proyección offline de una base estable; no consulta ni modifica servicios.

Ejecutar desde cualquier carpeta. Imprime JSON; todos los consumos son supuestos.
Tarifas contrastadas el 31/10/2026. Ver el informe adyacente para fuentes y límites.
"""
import json
import math

USERS = 1000
CONVERSION = 0.05
SESSIONS_PER_PATIENT_YEAR = 30
PLATFORM_REVENUE_PEN = 30
USD_PEN = 3.467  # SBS venta 30/10/2026; no incluye recargo de tarjeta.
MONTHS = 12
DAYS = 30  # Mes financiero uniforme, no calendario de facturación real.
READ_USD = 0.045 / 100000
WRITE_USD = 0.135 / 100000
CPU_USD = 0.0000336
MEMORY_USD = 0.0000035
INPUT_MTOK_USD = 0.10
OUTPUT_MTOK_USD = 0.50


def daily_cost(quantity, free, rate):
    return DAYS * max(0, quantity / DAYS - free) * rate


def projection(inferences_per_survey=4, attempts=1, spread=False):
    """Una encuesta inicial o diez intentos repartidos, sin nuevas cohortes."""
    patients = USERS * CONVERSION
    sessions_month = patients * SESSIONS_PER_PATIENT_YEAR / MONTHS
    months = []
    for month in range(1, MONTHS + 1):
        entrants = USERS * attempts / MONTHS if spread else USERS * attempts if month == 1 else 0
        registrations = USERS if month == 1 else 0
        ai_calls = entrants * inferences_per_survey
        turns = entrants * max(8, inferences_per_survey)
        searches = entrants * 0.6 * 1.2
        # Bolsas conservadoras: no son recuentos medidos de cada transacción.
        # 40/20 por turno incorporan guards, ledgers IA y persistencia/listeners.
        scheduled_reads = DAYS * (200 + 1 + 100) + 20000
        recurring_reads = USERS * 20 + sessions_month * 500 + 50000 + 2000 + scheduled_reads
        reads = (recurring_reads + registrations * 100 + turns * 40 + searches * 214) * 1.1
        writes = (sessions_month * 50 + 5000 + 2000 + USERS * 3 + DAYS
                  + registrations * 10 + turns * 20)
        base_calls = USERS * 3 + sessions_month * 12 + 500 + 100 + DAYS
        other_calls = registrations * 3 + entrants + searches
        requests = base_calls + other_calls + turns
        seconds = ((base_calls + other_calls) * .3 + DAYS * 5
                   + ai_calls * 6 + (turns - ai_calls) * .35) * 1.2
        # 1 vCPU, 256 MiB, concurrencia efectiva conservadora 1, mínimo cero.
        compute = (max(0, seconds * CPU_USD - 4.32)
                   + max(0, seconds * .25 * MEMORY_USD - .90)
                   + max(0, requests - 2000000) * .40 / 1000000)
        loads = USERS * 1.5 + sessions_month * 4 + 300 + entrants
        hosting_gb = loads * 1.2 / 1000
        assessments = USERS * 1.3 + sessions_month * 3.2 + 300 + entrants * 2
        recaptcha = 0 if assessments <= 10000 else 8 + max(0, assessments - 100000) * .001
        network_gib = reads * 1536 / 2**30  # Incluye incluso lecturas de servidor, conservador.
        components = {
            'firestore_reads': daily_cost(reads, 50000, READ_USD),
            'firestore_writes': daily_cost(writes, 20000, WRITE_USD),
            'firestore_egress': max(0, network_gib - 10) * .12,
            'functions_compute_and_requests': compute,
            'firebase_hosting_transfer': daily_cost(hosting_gb, .36, .15),
            'auth_email_google': 0,
            'app_check_recaptcha': recaptcha,
            'scheduler_one_job': 0,
            # Reservas de planificación; no son cargos verificados.
            'storage_and_backup_provision': .50,
            'logs_secrets_builds_artifacts_network_provision': 5,
            'domain_renewal_provision': 30 / MONTHS,
            'openai': ai_calls * (2500 * INPUT_MTOK_USD + 250 * OUTPUT_MTOK_USD) / 1000000,
        }
        months.append({'month': month, 'surveys': entrants, 'ai_calls': ai_calls,
                       'reads': reads, 'writes': writes, 'functions_requests': requests,
                       'cpu_seconds': seconds, 'hosting_gb': hosting_gb,
                       'recaptcha_assessments': assessments, 'components_usd': components,
                       'total_usd': sum(components.values())})
    annual_usd = sum(m['total_usd'] for m in months)
    annual_sessions = patients * SESSIONS_PER_PATIENT_YEAR
    annual_revenue = annual_sessions * PLATFORM_REVENUE_PEN
    annual_pen = annual_usd * USD_PEN
    component_totals = {key: sum(m['components_usd'][key] for m in months)
                        for key in months[0]['components_usd']}
    return {'users': USERS, 'paying_patients': patients,
            'non_paying_users': USERS-patients, 'surveys_per_user_year': attempts,
            'inferences_per_survey': inferences_per_survey,
            'annual_sessions': annual_sessions, 'monthly_average_sessions': sessions_month,
            'annual_revenue_pen': annual_revenue, 'monthly_average_revenue_pen': annual_revenue / MONTHS,
            'annual_cost_usd': annual_usd, 'annual_cost_pen': annual_pen,
            'monthly_average_cost_usd': annual_usd / MONTHS,
            'monthly_average_cost_pen': annual_pen / MONTHS,
            'cost_per_therapy_pen': annual_pen / annual_sessions,
            'after_technology_only_pen': annual_revenue - annual_pen,
            'components_annual_usd': component_totals, 'months': months}


if __name__ == '__main__':
    normal = projection()
    one_max_survey = projection(20)
    max_attempts_distributed = projection(20, 10, spread=True)
    assert normal['paying_patients'] == 50
    assert normal['annual_sessions'] == 1500
    assert normal['annual_revenue_pen'] == 45000
    assert normal['monthly_average_revenue_pen'] == 3750
    assert math.isclose(normal['annual_cost_usd'], 97.5)
    assert math.isclose(normal['components_annual_usd']['openai'], 1.5)
    for scenario in [normal, one_max_survey, max_attempts_distributed]:
        assert math.isclose(scenario['annual_cost_usd'], sum(scenario['components_annual_usd'].values()))
        assert sum(m['ai_calls'] for m in scenario['months']) <= USERS * 200 + .001
        assert all(m['components_usd']['openai'] < 50 for m in scenario['months'])
    print(json.dumps({'mode':'planning_only_no_remote_metrics', 'usd_pen':USD_PEN,
                      'normal':normal, 'one_survey_at_20':one_max_survey,
                      'ten_surveys_at_20_distributed':max_attempts_distributed,
                      'monthly_planning_budget_usd':20,
                      'annual_planning_budget_pen':20 * 12 * USD_PEN},
                     indent=2, ensure_ascii=False))
