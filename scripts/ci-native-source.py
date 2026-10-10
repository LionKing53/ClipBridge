"""Run only on a disposable GitHub Linux runner; never on the personal host."""
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import tarfile
import zipfile

ROOT = Path(__file__).resolve().parent.parent
WORK = ROOT / 'build/ci-native'
LOCK = json.loads((ROOT / 'native-sources-lock.json').read_text())
TOOLCHAIN_IMAGE = ('ghcr.io/libvips/build-win64-mxe@sha256:'
                   '306f986a3e9daea18a03f30694a9843524e2ccdf90a0b5833cb51120186375bd')


def run(*args, cwd=ROOT):
    return subprocess.check_output(args, cwd=cwd, text=True).strip()


def sha(data):
    return hashlib.sha256(data).hexdigest()


def write_json(path, value):
    path.write_text(json.dumps(value, indent=2) + '\n')


def prepare():
    WORK.mkdir(parents=True, exist_ok=False)
    for name, recipe in LOCK['recipes'].items():
        directory = WORK / name
        run('git', 'init', '--quiet', str(directory))
        run('git', 'fetch', '--depth=1', recipe['repository'], recipe['commit'], cwd=directory)
        run('git', 'checkout', '--detach', 'FETCH_HEAD', cwd=directory)
        assert run('git', 'rev-parse', 'HEAD', cwd=directory) == recipe['commit']
    base = WORK / 'vips/container/base.Dockerfile'
    original = base.read_text()
    old = 'RUN git clone -b llvm-mingw-20260924 --single-branch https://github.com/kleisauke/mxe.git'
    new = ('RUN git init mxe && cd mxe && git fetch --depth=1 '
           + LOCK['recipes']['mxe']['repository'] + ' ' + LOCK['recipes']['mxe']['commit']
           + ' && git checkout --detach FETCH_HEAD')
    assert old in original
    base.write_text(original.replace(old, new, 1))
    script = WORK / 'vips/build.sh'
    before = script.read_text()
    assert 'run --rm -t' in before
    adapted = before.replace('run --rm -t', 'run --rm', 1)
    assert 'image="ghcr.io/libvips/build-win64-mxe:latest"' in adapted
    adapted = adapted.replace('image="ghcr.io/libvips/build-win64-mxe:latest"',
                              'image="' + TOOLCHAIN_IMAGE + '"', 1)
    script.write_text(adapted)
    # The image supplies host compilers/tools only. Reject any prebuilt Windows
    # target area before the upstream source build starts. Do not run it locally.
    compiler_check = (
        'set -eu; cd /usr/local/mxe; '
        'test "$(git rev-parse HEAD)" = ' + LOCK['recipes']['mxe']['commit'] + '; '
        'test ! -e usr/x86_64-w64-mingw32.static; '
        'test ! -e usr/x86_64-w64-mingw32.shared; '
        'usr/x86_64-pc-linux-gnu/bin/clang --version')
    compiler = run('docker', 'run', '--rm', '--entrypoint', '/bin/sh',
                   TOOLCHAIN_IMAGE, '-c', compiler_check)
    assert re.search(r'clang version 23\.1\.2\b', compiler)
    (WORK / 'compiler-version.txt').write_text(compiler + '\n')
    # Preserve original recipes plus exact adapted inputs, not a reproducibility claim.
    adaptation = {'format': 1, 'recipes': LOCK['recipes'], 'changes': [
        'Pin MXE checkout to the supplied commit instead of a moving branch.',
        'Remove packaging TTY allocation for noninteractive CI.',
        'Pin the matching host-toolchain image; reject existing Windows target libraries.'],
        'baseImage': TOOLCHAIN_IMAGE,
        'systemPackagesPinned': False, 'prebuiltLibraryUsed': False,
        'hostCompilerRebuilt': False, 'compilerVersion': compiler,
        'emptyWindowsTargetVerified': True,
        'sourceCommit': run('git', 'rev-parse', 'HEAD')}
    write_json(WORK / 'build-adaptation.json', adaptation)


def filename(item):
    suffix = re.search(r'\.tar\.(gz|xz|bz2)$', item['url'])
    return item['name'] + '-' + item['version'] + (suffix.group() if suffix else '.crate')


def collect():
    transfer = WORK / 'transfer'
    libraries = transfer / 'libraries'
    sources = transfer / 'sources'
    libraries.mkdir(parents=True)
    sources.mkdir()
    packages = list((WORK / 'vips/packaging').glob('vips-dev-x64-web-8.18.7-static.zip'))
    assert len(packages) == 1
    with zipfile.ZipFile(packages[0]) as package:
        dlls = [n for n in package.namelist() if n.endswith('/bin/libvips-42.dll')]
        versions = [n for n in package.namelist() if n.endswith('/versions.json')]
        assert len(dlls) == len(versions) == 1
        dll = package.read(dlls[0])
        version_data = json.loads(package.read(versions[0]))
        assert version_data['vips'] == '8.18.7'
        (libraries / 'libvips-42.dll').write_bytes(dll)
    cache = ROOT / 'build/native-sources-cache'
    rust = json.loads((cache / 'rust-sources-lock.json').read_text())
    assert rust['provenance'] == next(x['sha256'] for x in LOCK['artifacts'] if x['name'] == 'librsvg')
    records, notices = [], []
    bundle = sources / 'ClipBridge-sharp-0.35.5-sources.zip'
    with zipfile.ZipFile(bundle, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=6) as archive:
        for item in LOCK['artifacts'] + LOCK.get('runtimeArtifacts', []) + rust['artifacts']:
            file = cache / filename(item)
            data = file.read_bytes()
            assert sha(data) == item['sha256']
            name = 'archives/' + file.name
            archive.writestr(name, data)
            records.append({'name': name, 'sha256': item['sha256'], 'url': item['url']})
            runtime = item in LOCK.get('runtimeArtifacts', [])
            # Stream once; seeking repeatedly through LLVM's compressed archive
            # is costly. All original files remain in the corresponding archive.
            with tarfile.open(file, mode='r|*') as tar:
                for member in tar:
                    parts = member.name.split('/')
                    runtime_notice = not runtime or len(parts) == 2 or (
                        len(parts) == 3 and parts[1] in (
                            'compiler-rt', 'libcxx', 'libcxxabi', 'libunwind',
                            'mingw-w64-crt', 'mingw-w64-headers'))
                    if member.isfile() and member.size < 8 * 1024**2 and re.match(
                            r'^(copying|copyright|licen[cs]e|notice|authors)([._-]|$)',
                            Path(member.name).name, re.I) and runtime_notice:
                        content = tar.extractfile(member).read().decode('utf-8', errors='replace')
                        notices.append('\n===== ' + item['name'] + '@' + item['version']
                                       + ': ' + member.name + ' =====\n' + content)
        for name, recipe in LOCK['recipes'].items():
            file = WORK / (name + '-recipe.tar')
            run('git', 'archive', '--format=tar', '--prefix=' + name + '/',
                '--output=' + str(file), recipe['commit'], cwd=WORK / name)
            data = file.read_bytes()
            member = 'recipes/' + name + '.tar'
            archive.writestr(member, data)
            records.append({'name': member, 'sha256': sha(data), **recipe})
        texts = {'native-sources-lock.json': (ROOT / 'native-sources-lock.json').read_bytes(),
                 'rust-sources-lock.json': (cache / 'rust-sources-lock.json').read_bytes(),
                 'NATIVE-NOTICES.txt': ('Collected original source notices; includes optional/test components.\n'
                                        + '\n'.join(notices)).encode(),
                 'REBUILD.md': (ROOT / 'docs/NATIVE-REBUILD.md').read_bytes(),
                 'inventory.json': json.dumps({'format': 1, 'sharp': LOCK['sharp'],
                                              'artifacts': records, 'compiledHere': True}).encode()}
        for name, data in texts.items():
            archive.writestr(name, data)
            (sources / name).write_bytes(data)
        for name, file in {'build-adaptation.json': WORK / 'build-adaptation.json',
                           'base.Dockerfile': WORK / 'vips/container/base.Dockerfile',
                           'build.sh': WORK / 'vips/build.sh',
                           'compiler-version.txt': WORK / 'compiler-version.txt',
                           'workflow.yml': ROOT / '.github/workflows/native-rebuild.yml',
                           'ci-native-source.py': Path(__file__)}.items():
            archive.write(file, 'adaptation/' + name)
    write_json(sources / 'evidence.json', {'format': 1, 'bundle': bundle.name,
        'sha256': sha(bundle.read_bytes()), 'nativeArchives': len(LOCK['artifacts']),
        'rustArchives': len(rust['artifacts']), 'recipeArchives': len(LOCK['recipes']),
        'runtimeArchives': len(LOCK.get('runtimeArtifacts', [])),
        'noticeFiles': len(notices), 'compiledHere': True})
    write_json(transfer / 'build-evidence.json', {'format': 1,
        'sourceCommit': run('git', 'rev-parse', 'HEAD'), 'vips': version_data,
        'rebuiltLibrarySHA256': sha(dll), 'actualSourceBuild': True,
        'originalCppAndAddonRetained': True, 'approvedForPublication': False})
    print('Actual native source build collected with corresponding sources; ABI test pending.')


if __name__ == '__main__':
    if os.environ.get('GITHUB_ACTIONS') != 'true' or os.name == 'nt':
        raise SystemExit('Disposable GitHub Linux runner required; no local upstream execution.')
    {'prepare': prepare, 'collect': collect}[sys.argv[1]]()
