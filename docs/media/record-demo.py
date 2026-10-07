#!/usr/bin/env python3
"""Record docs/media/demo.cast: a scripted review session in a real PTY.

Usage: python3 docs/media/record-demo.py target/release/review
Render with agg (github.com/asciinema/agg) and JetBrains Mono:
  agg --font-family "JetBrains Mono" --font-size 18 --line-height 1.35 --idle-time-limit 2 \
      --last-frame-duration 4 --theme "$THEME" docs/media/demo.cast docs/media/demo.gif
  THEME=121418,d4d7dc,121418,e5949f,8cc5a0,e5c07b,7fb0e8,c4a7e7,8cc5d8,d4d7dc,5c6370,e5949f,8cc5a0,e5c07b,a9c9f0,c4a7e7,8cc5d8,ffffff
"""
import json, os, pty, select, shutil, subprocess, sys, tempfile, time, fcntl, struct, termios
from pathlib import Path

COLS, ROWS = 100, 30
PLAN = """# Plan: rate-limit the public API

## Approach
1. Add a token-bucket limiter in `middleware/limit.rs`.
2. Key buckets by client IP address.
3. Store buckets in a global `HashMap` behind a `Mutex`.
4. Return HTTP 429 with a `Retry-After` header.

## Rollout
- Enable for all routes at once.
- Log rejected requests at `info` level.

## Tests
- Unit test the bucket refill math.
"""

binary = Path(sys.argv[1]).resolve()
work = Path(tempfile.mkdtemp(prefix='demo-'))  # shown in the recording, so keep it short
(work / 'bin').mkdir()
(work / 'bin' / 'review').symlink_to(binary)
(work / 'api').mkdir()
(work / 'api' / 'plan.md').write_text(PLAN)

master, slave = pty.openpty()
fcntl.ioctl(slave, termios.TIOCSWINSZ, struct.pack('HHHH', ROWS, COLS, 0, 0))
env = {'PATH': f"{work / 'bin'}:/usr/bin:/bin", 'TERM': 'xterm-256color', 'COLORTERM': 'truecolor',
       'HOME': str(work), 'PS1': '\\[\\e[38;5;110m\\]~/api\\[\\e[0m\\] $ ', 'LANG': 'C.UTF-8'}
shell = subprocess.Popen(['bash', '--norc', '--noprofile', '-i'], cwd=work / 'api', env=env,
                         stdin=slave, stdout=slave, stderr=slave, start_new_session=True)
start = time.monotonic()
events = []


def pump(seconds):
    deadline = time.monotonic() + seconds
    while (left := deadline - time.monotonic()) > 0:
        if select.select([master], [], [], min(left, 0.02))[0]:
            data = os.read(master, 65536)
            # Answer the device-attributes query like a terminal that keeps its colors private.
            if b'\x1b[c' in data:
                os.write(master, b'\x1b[?62;22c')
            events.append([round(time.monotonic() - start, 3), 'o', data.decode(errors='replace')])


def key(seq, pause=0.35):
    os.write(master, seq.encode())
    pump(pause)


def type_(text, delay=0.045, pause=0.6):
    for ch in text:
        key(ch, delay)
    pump(pause)


pump(0.8)
type_('review plan.md\r', pause=1.8)
key('j' * 4, 0.6)                       # line 5: "Key buckets by client IP address."
key('c', 0.5)
type_('Key by API token instead; many clients share one IP behind NAT.', delay=0.035)
key('\x13', 1.2)                        # Ctrl+S records the comment
key('j' * 5, 0.6)                       # line 10: rollout
key('v', 0.3); key('j', 0.5); key('c', 0.5)
type_('Roll out on /search first, behind a flag, then widen.', delay=0.035)
key('\x13', 1.2)
key('s', 1.6)                           # save review-feedback.json
key('q', 0.8)
type_("jq '.comments[] | {quote: .target.quote, body}' review-feedback.json\r",
      delay=0.02, pause=3.5)
type_('# hand it to your agent', delay=0.03, pause=0.2)
key('\r', 0.3)
type_('claude "Address the review comments in review-feedback.json"', delay=0.03, pause=3)

shell.kill()
out = Path(__file__).with_name('demo.cast')
with out.open('w') as f:
    f.write(json.dumps({'version': 2, 'width': COLS, 'height': ROWS, 'env': {'TERM': 'xterm-256color'}}) + '\n')
    for event in events:
        f.write(json.dumps(event) + '\n')
saved = json.loads((work / 'api' / 'review-feedback.json').read_text())
assert [(c['target']['start_line'], c['target']['end_line']) for c in saved['comments']] == [(5, 5), (10, 11)], saved['comments']
shutil.rmtree(work)
print(out)
