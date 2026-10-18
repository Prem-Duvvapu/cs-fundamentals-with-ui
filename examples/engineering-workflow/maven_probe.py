"""Actual Maven mediation using an owned offline repository and a tiny local inspection Mojo."""
from pathlib import Path
import re
import hashlib
import shutil
import zipfile
from commands import LabFailure, run

FIXTURES = Path(__file__).resolve().parent / 'fixtures'


def pom(artifact, version='1.0', dependencies='', management='', packaging='jar'):
    return f'''<project xmlns="http://maven.apache.org/POM/4.0.0"><modelVersion>4.0.0</modelVersion><groupId>fixture</groupId><artifactId>{artifact}</artifactId><version>{version}</version><packaging>{packaging}</packaging><properties><revision>1.0</revision></properties>{management}<dependencies>{dependencies}</dependencies></project>'''


def dependency(name, version):
    return f'<dependency><groupId>fixture</groupId><artifactId>{name}</artifactId><version>{version}</version></dependency>'


def artifact(repository, name, version, model, classes=None, plugin=False):
    directory = repository / 'fixture' / name / version
    directory.mkdir(parents=True)
    (directory / f'{name}-{version}.pom').write_text(model)
    with zipfile.ZipFile(directory / f'{name}-{version}.jar', 'w') as jar:
        jar.writestr('META-INF/MANIFEST.MF', 'Manifest-Version: 1.0\n\n')
        if classes:
            for file in sorted(classes.rglob('*.class')):
                jar.write(file, file.relative_to(classes))
        if plugin:
            jar.write(FIXTURES / 'plugin.xml', 'META-INF/maven/plugin.xml')


def exercise(root, budget):
    root.mkdir()
    mvn = shutil.which('mvn')
    if not mvn:
        raise LabFailure('Maven 3.x is required; no dependency downloads are performed')
    _, version = run([mvn, '-version', '-Dstyle.color=never'], root, budget)
    if not re.search(r'Apache Maven 3\.', version):
        raise LabFailure('This fixture supports the installed Maven 3.x API/layout')
    home = Path(mvn).resolve().parent.parent
    libraries = home / 'lib'
    if not libraries.is_dir():
        raise LabFailure('Maven lib directory unavailable; use a standard Maven 3 installation')
    repository = root / 'repository'
    for release in ['1.0', '2.0']:
        source = root / f'codec-{release}'
        classes = source / 'classes'
        source.mkdir(); classes.mkdir()
        java = source / 'Codec.java'
        java.write_text(f'package fixture.codec; public final class Codec {{ public static String version() {{ return "{release}"; }} }}')
        run(['javac', '--release', '17', '-d', classes, java], root, budget)
        artifact(repository, 'codec', release, pom('codec', release), classes)
    artifact(repository, 'adapter', '1.0', pom('adapter', dependencies=dependency('codec', '1.0')))
    artifact(repository, 'audit', '1.0', pom('audit', dependencies=dependency('codec', '2.0')))
    classes = root / 'probe-classes'; classes.mkdir()
    run(['javac', '--release', '17', '-cp', str(libraries / '*'), '-d', classes, FIXTURES / 'ProbeMojo.java'], root, budget)
    support = next(libraries.glob('plexus-utils*.jar'))
    with zipfile.ZipFile(support) as jar:
        metadata = jar.read('META-INF/maven/org.codehaus.plexus/plexus-utils/pom.properties').decode()
    support_version = re.search(r'^version=(.+)$', metadata, re.M).group(1).strip()
    support_directory = repository / 'org/codehaus/plexus/plexus-utils' / support_version
    support_directory.mkdir(parents=True)
    shutil.copyfile(support, support_directory / f'plexus-utils-{support_version}.jar')
    (support_directory / f'plexus-utils-{support_version}.pom').write_text(f'<project><modelVersion>4.0.0</modelVersion><groupId>org.codehaus.plexus</groupId><artifactId>plexus-utils</artifactId><version>{support_version}</version></project>')
    support_dependency = f'<dependency><groupId>org.codehaus.plexus</groupId><artifactId>plexus-utils</artifactId><version>{support_version}</version></dependency>'
    artifact(repository, 'workflow-probe', '1.0', pom('workflow-probe', dependencies=support_dependency, packaging='maven-plugin'), classes, plugin=True)
    settings = root / 'settings.xml'; settings.write_text('<settings xmlns="http://maven.apache.org/SETTINGS/1.0.0"/>')
    app = root / 'app'; app.mkdir(); (app / '.mvn').mkdir()
    model = app / 'pom.xml'
    dependencies = dependency('adapter', '1.0') + dependency('audit', '1.0')
    base = pom('routing-app', '${revision}', dependencies, packaging='pom')
    model.write_text(base)
    command = [mvn, '-o', '-B', '-ntp', '-Dstyle.color=never', '-s', settings, '-gs', settings,
               f'-Dmaven.repo.local={repository}', 'fixture:workflow-probe:1.0:inspect']

    def inspect(extra=()):
        _, text = run(command + list(extra), app, budget, timeout=30)
        values = {key: re.search(rf'{key}=([^\r\n]+)', text).group(1).strip() for key in ['MODEL_VERSION', 'SELECTED_CODEC', 'LOADED_CODEC']}
        return values

    nearest = inspect()
    management = '<dependencyManagement><dependencies>' + dependency('codec', '2.0') + '</dependencies></dependencyManagement>'
    model.write_text(pom('routing-app', '${revision}', dependencies, management, packaging='pom'))
    managed = inspect()
    config = app / '.mvn'; config.mkdir(exist_ok=True); (config / 'maven.config').write_text('-Drevision=2.0\n')
    configured = inspect()
    explicit = inspect(['-Drevision=3.0'])
    if (nearest['SELECTED_CODEC'], nearest['LOADED_CODEC'], managed['SELECTED_CODEC'], managed['LOADED_CODEC']) != ('1.0', '1.0', '2.0', '2.0'):
        raise LabFailure('Actual Maven mediation or loaded dependency differs from the stated fixture contract')
    if (nearest['MODEL_VERSION'], configured['MODEL_VERSION'], explicit['MODEL_VERSION']) != ('1.0', '2.0', '3.0'):
        raise LabFailure('Observed Maven property precedence differs from the fixture contract')
    return {'runtime': re.sub(r'\x1b\[[0-9;]*m', '', version).splitlines()[0], 'offline': True, 'installed_plexus_utils': {'version': support_version, 'sha256': hashlib.sha256(support.read_bytes()).hexdigest()},
            'nearest_equal_depth': nearest, 'dependency_management': managed, 'maven_config': configured, 'explicit_cli': explicit,
            'scope': 'Actual Maven dependency resolution and loaded synthetic JAR; no third-party vulnerability audit'}
