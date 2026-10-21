"""Require actual new Redis scenarios and bounded original evidence; native/CI share this gate."""
import json
from pathlib import Path
import re
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parent
EXPECTED = {
    'cold-burst':dict(callersPerRun=6,originFullReads=[6,1],metadataReads=[6,6],ownedKeysDeleted=True),
    'origin-failure':dict(sharedFailures=6,failedOriginReads=1,totalOriginReadsAfterRecovery=2,errorNotCached=True,ownedKeysDeleted=True),
    'deadline-capacity':dict(timedOutCalls=3,rejectedAdmissions=2,retainedFlightsWhileOriginBlocked=1,originReadsBeforeRelease=1,originReadsAfterRecovery=2,expiredOriginNotCached=True,ownedKeysDeleted=True),
    'tenant-version':dict(independentOriginReads=3,lateOldVersion=1,subsequentCurrentVersion=2,tenantIsolation=True,ownedKeysDeleted=True),
    'coordination-scope':dict(coordinatorInstances=2,originFullReads=2,sharedRedis=True,distributedLock=False,ownedKeysDeleted=True),
}
SCOPE = 'Actual authenticated Redis; controlled original origin, no MongoDB, cross-process lock, load benchmark or production capacity claim.'


def validate():
    xml=ROOT/'target/surefire-reports/TEST-com.csfundamentals.dataservices.CacheRecoveryRedisTests.xml'
    suite=ET.parse(xml).getroot()
    if suite.get('tests')!='5' or len(suite.findall('testcase'))!=5 or any(int(suite.get(key,'0')) for key in ('skipped','errors','failures')):
        raise ValueError('all_five_actual_cache_recovery_cases_required')
    if any(case.find(tag) is not None for case in suite.findall('testcase') for tag in ('skipped','failure','error')):
        raise ValueError('actual_cache_recovery_case_missing')
    path=ROOT/'target/cache-recovery-evidence.json'
    if path.is_symlink() or not 0<path.stat().st_size<=16384: raise ValueError('bounded_actual_cache_receipt_required')
    report=json.loads(path.read_text())
    if (set(report)!={'schemaVersion','evidence','redisVersion','javaRuntime','actualCasesExecuted','cases','scope'}
            or report['schemaVersion']!=1 or report['actualCasesExecuted']!=5 or report['cases']!=EXPECTED
            or report['evidence']!='actual-redis-controlled-origin' or report['scope']!=SCOPE
            or not re.fullmatch(r'[0-9]+\.[0-9]+\.[0-9]+(?:[-a-zA-Z0-9.]+)?',report['redisVersion'])
            or len(report['redisVersion'])>40 or not re.fullmatch(r'[A-Za-z0-9.+_-]{1,128}',report['javaRuntime'])):
        raise ValueError('actual_cache_recovery_receipt_mismatch')
    print('Actual Redis cache recovery: 6→1 full origin reads; failure/deadline/admission/revision/isolation/coordination limits and exact key cleanup verified.')
    return report


if __name__=='__main__': validate()
