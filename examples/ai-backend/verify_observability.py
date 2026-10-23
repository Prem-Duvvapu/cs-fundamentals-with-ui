#!/usr/bin/env python3
"""Owned packaged RAG trace fixture only; no model endpoint or live-data arguments."""
from collections import Counter
import hashlib
import json
import math
from pathlib import Path
import re
import shutil
import sys
import tempfile
import compare_tickets as processes

ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / 'build/evidence/observability.json'
STAGES = dict(REQUEST=14, RETRIEVAL=13, CONTEXT=13, MODEL=12, MODEL_HTTP=11, VALIDATION=9, FIXTURE_PROVIDER=11)
OUTCOMES = {'SUCCESS', 'ABSTAIN', 'ERROR'}
ERRORS = {'NONE', 'INPUT', 'AUTHORIZATION', 'RETRIEVAL_UNAVAILABLE', 'HTTP', 'RATE_LIMITED', 'DEADLINE',
          'TRANSPORT', 'ENVELOPE', 'VALIDATION', 'BUDGET', 'CANCELLED', 'INTERNAL'}
CASES = [
    ('SUCCESS',1,1,['SUCCESS'],['NONE']), ('ABSTENTION',1,0,['ABSTAIN'],['NONE']),
    ('RATE_LIMITED',1,1,['ERROR'],['RATE_LIMITED']), ('DEADLINE',1,1,['ERROR'],['DEADLINE']),
    ('SCHEMA',1,1,['ERROR'],['VALIDATION']), ('CITATION',1,1,['ERROR'],['VALIDATION']),
    ('REVOKED',1,1,['ERROR'],['AUTHORIZATION']), ('UNKNOWN_USAGE',1,1,['SUCCESS'],['NONE']),
    ('MALFORMED_USAGE',1,1,['SUCCESS'],['NONE']), ('INPUT_REJECTED',1,0,['ERROR'],['INPUT']),
    ('BUDGET',2,1,['SUCCESS','ERROR'],['NONE','BUDGET']), ('CONCURRENT',2,2,['SUCCESS','SUCCESS'],['NONE','NONE'])]
SCOPE = ('Actual local lexical/JDBC/context/native HTTP/validation tracing; fixture only, no model quality, '
         'provider queue, streaming, tools, collector or production deployment evidence.')


def require(condition, code):
    if not condition:
        raise ValueError(code)


def integer(value, low=0, high=1_000_000_000):
    return type(value) is int and low <= value <= high


def validate(report):
    require(type(report) is dict and set(report) == {'schemaVersion','evidence','runtime','cases','traces',
            'measurements','droppedSpans','fixtureResourcesClosed','scope'}, 'observation_shape')
    require(type(report['schemaVersion']) is int and report['schemaVersion'] == 1
            and report['evidence'] == 'actual-owned-rag-http-fixture' and report['scope'] == SCOPE, 'observation_identity')
    runtime = report['runtime']
    require(type(runtime) is dict and set(runtime) == {'feature','version'} and type(runtime['feature']) is int
            and runtime['feature'] == 17 and type(runtime['version']) is str
            and re.fullmatch(r'17(?:[.][A-Za-z0-9.+_-]+)?', runtime['version']), 'actual_java17_runtime')
    require(report['fixtureResourcesClosed'] is True and type(report['droppedSpans']) is int and report['droppedSpans'] == 0, 'observation_resources')
    expected = [dict(scenario=name,operations=ops,httpRequests=http,outcomes=outcomes,errors=errors) for name,ops,http,outcomes,errors in CASES]
    require(report['cases'] == expected, 'actual_fixture_outcomes')
    traces = report['traces']
    require(type(traces) is list and len(traces) == 83, 'actual_stage_counts')
    by_id = {}
    for trace in traces:
        require(type(trace) is dict and set(trace) == {'traceId','spanId','parentSpanId','remoteParent','stage','kind','outcome','error','durationNanos'}, 'trace_shape')
        for key,length in (('traceId',32),('spanId',16),('parentSpanId',16)):
            require(type(trace[key]) is str and re.fullmatch('[0-9a-f]{'+str(length)+'}', trace[key]), 'trace_identity')
        require(trace['traceId'] != '0'*32 and trace['spanId'] != '0'*16 and trace['spanId'] not in by_id, 'unique_actual_spans')
        require(type(trace['remoteParent']) is bool and trace['stage'] in STAGES and trace['outcome'] in OUTCOMES
                and trace['error'] in ERRORS and integer(trace['durationNanos'],0,60_000_000_000), 'trace_metadata')
        require((trace['outcome'] == 'ERROR') == (trace['error'] != 'NONE'), 'trace_error_consistency')
        by_id[trace['spanId']] = trace
    require(Counter(trace['stage'] for trace in traces) == Counter(STAGES), 'actual_stage_counts')
    roots = [trace for trace in traces if trace['stage'] == 'REQUEST']
    require(len({trace['traceId'] for trace in roots}) == 14, 'request_trace_isolation')
    for trace in traces:
        stage = trace['stage']
        if stage == 'REQUEST':
            require(trace['parentSpanId'] == '0'*16 and not trace['remoteParent'] and trace['kind'] == 'INTERNAL', 'actual_root_parent')
            continue
        parent = by_id.get(trace['parentSpanId'])
        expected_parent = 'MODEL' if stage == 'MODEL_HTTP' else 'MODEL_HTTP' if stage == 'FIXTURE_PROVIDER' else 'REQUEST'
        require(parent is not None and parent['stage'] == expected_parent and parent['traceId'] == trace['traceId'], 'actual_causal_parent')
        require(trace['remoteParent'] is (stage == 'FIXTURE_PROVIDER') and trace['kind'] == ('SERVER' if stage == 'FIXTURE_PROVIDER' else 'CLIENT' if stage == 'MODEL_HTTP' else 'INTERNAL'), 'actual_http_remote_parent')
    # A failure before a stage must not fabricate execution of that stage.
    for root in roots:
        stages = {trace['stage'] for trace in traces if trace['traceId'] == root['traceId']}
        if root['error'] == 'INPUT': require(stages == {'REQUEST'}, 'input_stage_boundary')
        if root['outcome'] == 'ABSTAIN': require(stages == {'REQUEST','RETRIEVAL','CONTEXT'}, 'abstention_stage_boundary')
        if root['error'] in {'RATE_LIMITED','DEADLINE','BUDGET'}: require('VALIDATION' not in stages, 'failure_stage_boundary')
    measurements = report['measurements']
    require(type(measurements) is list and 1 <= len(measurements) <= 100, 'measurement_limit')
    identities = set()
    for metric in measurements:
        require(type(metric) is dict and set(metric) == {'name','tags','samples','total','unit'} and type(metric['tags']) is dict, 'measurement_shape')
        name,tags = metric['name'],metric['tags']
        if name in {'ai.stage.calls','ai.stage.duration'}:
            require(set(tags) == ({'stage','outcome','error'} if name.endswith('calls') else {'stage','outcome'})
                    and tags['stage'] in STAGES and tags['outcome'] in OUTCOMES
                    and ('error' not in tags or tags['error'] in ERRORS), 'fixed_stage_dimensions')
        elif name == 'ai.model.usage.calls': require(set(tags) == {'state'} and tags['state'] in {'known','unknown'}, 'fixed_usage_dimensions')
        elif name == 'ai.model.known.tokens': require(set(tags) == {'direction'} and tags['direction'] in {'input','output','cached_input'}, 'fixed_token_dimensions')
        else: raise ValueError('unexpected_measurement')
        identity = (name,tuple(sorted(tags.items())))
        require(identity not in identities, 'duplicate_measurement'); identities.add(identity)
        require(integer(metric['samples'],0,1_000_000_000) and type(metric['total']) in (int,float)
                and math.isfinite(metric['total']) and 0 <= metric['total'] <= 1e15
                and metric['unit'] == ('nanoseconds' if name == 'ai.stage.duration' else 'count'), 'bounded_measurement')
        if name != 'ai.stage.duration': require(metric['samples'] == metric['total'], 'counter_measurement')
    stage_calls = Counter((trace['stage'],trace['outcome'],trace['error']) for trace in traces)
    observed_calls = Counter({(metric['tags']['stage'],metric['tags']['outcome'],metric['tags']['error']):metric['samples']
        for metric in measurements if metric['name'] == 'ai.stage.calls'})
    durations = Counter((trace['stage'],trace['outcome']) for trace in traces)
    observed_durations = Counter({(metric['tags']['stage'],metric['tags']['outcome']):metric['samples']
        for metric in measurements if metric['name'] == 'ai.stage.duration'})
    require(stage_calls == observed_calls and durations == observed_durations, 'actual_outcome_measurements')
    def samples(name, **tags):
        return sum(metric['samples'] for metric in measurements if metric['name'] == name and all(metric['tags'].get(key) == value for key,value in tags.items()))
    for stage,count in STAGES.items():
        for name in ('ai.stage.calls','ai.stage.duration'): require(samples(name,stage=stage) == count, 'failure_inclusive_denominator')
    require(samples('ai.model.usage.calls',state='known') == 7 and samples('ai.model.usage.calls',state='unknown') == 5
            and samples('ai.model.known.tokens',direction='input') == 84
            and samples('ai.model.known.tokens',direction='output') == 28
            and samples('ai.model.known.tokens',direction='cached_input') == 21, 'observed_usage_denominator')
    encoded = json.dumps(report)
    for forbidden in ('DO_NOT_EXPORT','TENANT_B','alice','bob','policy:v1','Refund policy','http://','https://','stackTrace','approval'):
        require(forbidden not in encoded, 'observation_privacy')
    return report


def source_identity():
    paths = sorted((ROOT/'src/main/java').rglob('*.java')) + [ROOT/'pom.xml',ROOT/'src/main/resources/application.properties',
        ROOT/'src/test/java/com/csfundamentals/aiexample/AiTelemetryTests.java',
        ROOT/'src/test/java/com/csfundamentals/aiexample/AiDeadlineTelemetryTests.java',Path(__file__).resolve(),
        ROOT/'test_observability.py',ROOT/'OBSERVABILITY.md',ROOT/'compare_tickets.py']
    result = {}
    for path in paths:
        data = path.read_bytes()
        require(len(data) <= 1_048_576, 'source_file_limit')
        result[path.relative_to(ROOT).as_posix()] = dict(sha256=hashlib.sha256(data).hexdigest(),lfSha256=hashlib.sha256(data.replace(b'\r\n',b'\n')).hexdigest())
    return result


def run():
    OUTPUT.parent.mkdir(parents=True,exist_ok=True)
    require(not OUTPUT.is_symlink(), 'observation_report_symlink')
    OUTPUT.unlink(missing_ok=True)  # A failed new execution must not leave an apparently current receipt.
    before = source_identity()
    jar = ROOT/'target/ai-backend-example-0.0.1-SNAPSHOT.jar'
    require(jar.is_file() and 0 < jar.stat().st_size <= 134_217_728, 'bounded_packaged_jar_required')
    jar_hash = hashlib.sha256(jar.read_bytes()).hexdigest()
    with tempfile.TemporaryDirectory(prefix='owned-ai-stage-') as temporary:
        directory = Path(temporary)
        copy, output = directory/'application.jar', directory/'observation.json'
        shutil.copyfile(jar,copy)
        require(hashlib.sha256(copy.read_bytes()).hexdigest() == jar_hash, 'packaged_copy_changed')
        processes.bounded_child(['java','-Xmx256m','-XX:ActiveProcessorCount=2','-jar',str(copy),'--observe-fixture',str(output)],
                processes.isolated_environment(),40,output_limit=4096,error_prefix='observation_child')
        require(output.is_file() and not output.is_symlink() and 0 < output.stat().st_size <= 65536, 'bounded_observation_required')
        report = validate(json.loads(output.read_text(encoding='utf-8')))
    require(not directory.exists(), 'owned_observation_workspace_not_removed')
    require(source_identity() == before and hashlib.sha256(jar.read_bytes()).hexdigest() == jar_hash, 'observation_inputs_changed')
    result = dict(schemaVersion=1,state='complete',evidence='actual-owned-rag-http-fixture',observation=report,
                  binding=dict(sources=before,jarSha256=jar_hash,status='same-observed-bytes-before-and-after',
                    limit='Binds this execution to observed files and copied JAR; not independent source-to-binary build attestation.'),
                  ownedWorkspaceRemoved=True,ownedChildrenReaped=True,
                  scope='Original local fixtures only; no live model, fresh holdout, collector, streaming, tools, quality, price, production traffic or provider queue measurement.')
    require(len(json.dumps(result).encode()) <= 131072, 'final_observation_limit')
    processes.atomic_report(OUTPUT,result)
    print('Packaged AI stage evidence: 12 cases / 14 RAG calls / 11 actual HTTP requests / 83 spans; cleanup and source binding verified.')
    return result


def main():
    if len(sys.argv) != 1: raise SystemExit('No model endpoints, dataset or live-mode arguments are accepted.')
    try:
        with processes.cancellation_signals(): run()
    except (Exception,KeyboardInterrupt):
        # Do not relay JVM output, local paths, provider errors or Python exception details.
        raise SystemExit('AI stage fixture failed or cancelled; no completed evidence published.') from None


if __name__ == '__main__': main()
