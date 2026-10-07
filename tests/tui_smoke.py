#!/usr/bin/env python3
"""Drive the real terminal application through a PTY; no extra Python packages."""
import argparse
import errno
import fcntl
import json
import os
from pathlib import Path
import pty
import re
import select
import signal
import struct
import subprocess
import tempfile
import termios
import time


class Terminal:
    def __init__(self, binary, args, cwd):
        self.master, slave = pty.openpty()
        fcntl.ioctl(slave, termios.TIOCSWINSZ, struct.pack('HHHH', 36, 120, 0, 0))
        self.original = termios.tcgetattr(slave)
        self.slave = slave
        self.process = subprocess.Popen([str(binary), *map(str, args)], cwd=cwd,
                                        stdin=slave, stdout=slave, stderr=slave,
                                        env={**os.environ, 'TERM': 'xterm-256color'})
        self.output = b''
        self.columns = 120
        self.expect('review')

    def drain(self, seconds=0.15):
        deadline = time.monotonic() + seconds
        while time.monotonic() < deadline:
            if select.select([self.master], [], [], min(0.03, max(0, deadline-time.monotonic())))[0]:
                try:
                    data = os.read(self.master, 65536)
                    if not data:
                        break
                    self.output += data
                    # Answer the device attributes query like a terminal that does not
                    # report its colors, so color detection returns at once.
                    if b'\x1b[c' in data:
                        os.write(self.master, b'\x1b[?62;22c')
                except OSError as error:
                    if error.errno == errno.EIO:
                        break
                    raise

    def expect(self, text, timeout=8):
        def visible():
            rendered = re.sub(r'\x1b\[[0-?]*[ -/]*[@-~]', '', self.output.decode(errors='replace'))
            return ''.join(text.split()) in ''.join(rendered.split())
        self.drain(0.1)
        # Ratatui sends changed cells, so request a full repaint before matching text.
        if not visible() and self.process.poll() is None:
            self.columns = 119 if self.columns == 120 else 120
            fcntl.ioctl(self.slave, termios.TIOCSWINSZ, struct.pack('HHHH', 36, self.columns, 0, 0))
            self.process.send_signal(signal.SIGWINCH)
        deadline = time.monotonic() + timeout
        while not visible() and time.monotonic() < deadline:
            self.drain(0.1)
        assert visible(), f'Missing terminal text {text!r}; process={self.process.poll()}; tail={self.output[-1500:]!r}'

    def send(self, text):
        os.write(self.master, text.encode())
        self.drain()

    def paste(self, text):
        self.send('\x1b[200~' + text + '\x1b[201~')

    def finish(self):
        self.send('q')
        self.process.wait(timeout=8)
        self.drain()
        assert self.process.returncode == 0, self.output[-1500:]
        assert termios.tcgetattr(self.slave) == self.original, 'Terminal settings were not restored'
        os.close(self.master)
        os.close(self.slave)

    def close(self):
        if self.process.poll() is None:
            self.process.terminate()
            self.process.wait(timeout=5)
        for fd in (self.master, self.slave):
            try:
                os.close(fd)
            except OSError:
                pass


def wait_file(path):
    deadline = time.monotonic() + 5
    while not path.exists() and time.monotonic() < deadline:
        time.sleep(0.03)
    assert path.exists(), f'Feedback not saved: {path}'
    return json.loads(path.read_text())


def bridge(binary, input_path, output, root):
    terminal = Terminal(binary, ['--reopen', input_path, '--root', root, '--output', output], root)
    try:
        terminal.send('\te')
        terminal.paste(' · edited in TUI')
        terminal.send('\x13')
        terminal.send('s')
        data = wait_file(output)
        assert data['comments'][0]['body'].endswith(' · edited in TUI')
        terminal.send('\t')
        terminal.send('c')
        terminal.paste('New comment from TUI\nSecond line')
        terminal.send('\x13')
        terminal.send('s')
        terminal.finish()
        return max(output.parent.glob(output.name + '*'), key=lambda p: p.stat().st_mtime_ns)
    finally:
        terminal.close()


def smoke(binary):
    with tempfile.TemporaryDirectory(prefix='review-tui-') as directory:
        root = Path(directory)
        (root/'note.md').write_text('# Plan\nCafé 🦀 is old.\nNext step.\n')
        (root/'second.txt').write_text('Second file\n')
        output = root/'feedback.json'
        terminal = Terminal(binary, ['note.md', 'second.txt', '--output', output], root)
        try:
            terminal.send('jvjc')
            terminal.paste('Make this clear 🦀\nExplain the next step.')
            terminal.send('\x13')
            terminal.send('s')
            data = wait_file(output)
            assert data['comments'][0]['target']['quote'] == 'Café 🦀 is old.\nNext step.\n'
            assert data['comments'][0]['target']['start_line'] == 2
            terminal.send('\te')
            terminal.paste(' Edited.')
            terminal.send('\x13s')
            terminal.send('\t]c')
            terminal.paste('Temporary second-file comment')
            terminal.send('\x13')
            terminal.send('\tjd')
            terminal.send('y')
            terminal.send('s')
            terminal.finish()
            versions = sorted(root.glob('feedback.json*.json'), key=lambda p: p.stat().st_mtime_ns)
            latest = versions[-1] if versions else output
            data = json.loads(latest.read_text())
            assert len(data['files']) == 2 and len(data['comments']) == 1
            assert data['comments'][0]['body'].endswith(' Edited.')
            original_target = data['comments'][0]['target']
        finally:
            terminal.close()
        (root/'note.md').write_text('Inserted\n# Plan\nNew wording.\n')
        terminal = Terminal(binary, ['--reopen', latest, '--root', root, '--output', root/'reopened.json'], root)
        try:
            terminal.expect('changed')
            terminal.send('r')
            terminal.expect('Inserted')
            terminal.send('\t\r')
            terminal.send('s')
            reopened = wait_file(root/'reopened.json')
            assert reopened['comments'][0]['target'] == original_target
            terminal.finish()
        finally:
            terminal.close()
        terminal = Terminal(binary, ['note.md', '--output', root/'missing/out.json'], root)
        try:
            terminal.send('c')
            terminal.paste('Retain on failure')
            terminal.send('\x13s')
            terminal.expect('Save directory does not exist')
            (root/'missing').mkdir()
            terminal.send('s')
            assert wait_file(root/'missing/out.json')['comments'][0]['body'] == 'Retain on failure'
            terminal.send('c')
            terminal.paste('Unsaved comment')
            terminal.send('\x13')
            terminal.send('q')
            terminal.expect('Unsaved feedback')
            terminal.send('\x1b')
            terminal.send('q')
            terminal.send('d')
            terminal.process.wait(timeout=5)
        finally:
            terminal.close()
        failed = subprocess.run([str(binary), 'note.md'], cwd=root, capture_output=True, text=True)
        assert failed.returncode != 0 and '--browser' in failed.stderr
        repo = root/'git'
        repo.mkdir()
        def git(*args):
            subprocess.run(['git', '-C', str(repo), *args], check=True, capture_output=True)
        git('init', '-q')
        git('config', 'user.name', 'Local test')
        git('config', 'user.email', 'test@example.invalid')
        (repo/'diff.txt').write_text('context\nold 🦀\nlast\n')
        git('add', '.')
        git('commit', '-qm', 'fixture')
        (repo/'diff.txt').write_text('context\nnew 🦀\nlast\n')
        terminal = Terminal(binary, ['--diff', '--output', repo/'diff.json'], repo)
        try:
            terminal.send('bc')
            terminal.paste('Context on old side')
            terminal.send('\x13')
            terminal.send('j')
            terminal.send('c')
            terminal.paste('Old side concern')
            terminal.send('\x13')
            terminal.send('b')
            terminal.send('j')
            terminal.send('c')
            terminal.paste('New side concern')
            terminal.send('\x13s')
            data = wait_file(repo/'diff.json')
            assert data['comments'][1]['target']['side'] == 'old'
            assert data['comments'][1]['target']['quote'] == 'old 🦀\n'
            assert data['comments'][2]['target']['side'] == 'new'
            assert data['comments'][2]['target']['quote'] == 'new 🦀\n'
            terminal.send('bjvjjc')
            terminal.expect('Select a single diff side')
            terminal.finish()
        finally:
            terminal.close()
    return {'tui': 'passed', 'checks': ['line ranges', 'Unicode multiline entry', 'edit', 'delete', 'multiple files', 'save/reopen', 'revision inspection', 'failed save retention', 'quit guard', 'terminal restoration', 'noninteractive CLI', 'Git old/new targets', 'mixed-side selection rejection']}


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--bin', type=Path, default=Path(os.environ.get('REVIEW_BIN', Path(__file__).resolve().parents[1]/'target/debug/review')))
    parser.add_argument('--bridge', nargs=3, metavar=('FEEDBACK', 'OUTPUT', 'ROOT'))
    args = parser.parse_args()
    if args.bridge:
        print(json.dumps({'saved': str(bridge(args.bin.resolve(), Path(args.bridge[0]), Path(args.bridge[1]), Path(args.bridge[2])))}))
    else:
        print(json.dumps(smoke(args.bin.resolve())))
