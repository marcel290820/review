#!/usr/bin/env python3
"""Record docs/media/tui.gif: a scripted review in the real TUI, inside a real shell.

Usage: python3 docs/media/record-tui.py target/release/review
Needs tmux, jq, gifski, and the frontend's Playwright (npm ci in frontend/). tmux plays the
terminal and answers the color queries; each captured screen is drawn with the bundled
JetBrains Mono, then docs/media/encode.mjs turns the screens into the GIF.
"""
import html, json, os, re, subprocess, sys, tempfile, time, unicodedata
from pathlib import Path

COLS, ROWS = 100, 30
SOCKET = f'review-demo-{os.getpid()}'
FG, BG = '#d4d7dc', '#121418'
MEDIA = Path(__file__).resolve().parent
FONTS = MEDIA.parent.parent / 'frontend' / 'public' / 'fonts'
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
frames = work / 'frames'
frames.mkdir()
(work / 'bin').mkdir()
(work / 'bin' / 'review').symlink_to(binary)
(work / 'api').mkdir()
(work / 'api' / 'plan.md').write_text(PLAN)
timeline = []


def tmux(*args):
    return subprocess.run(['tmux', '-L', SOCKET, '-f', '/dev/null', *args],
                          check=True, capture_output=True, text=True).stdout


def color(n):
    if n < 16:
        return ['#121418', '#e5949f', '#8cc5a0', '#e5c07b', '#7fb0e8', '#c4a7e7', '#8cc5d8', '#d4d7dc',
                '#5c6370', '#e5949f', '#8cc5a0', '#e5c07b', '#a9c9f0', '#c4a7e7', '#8cc5d8', '#ffffff'][n]
    if n < 232:
        n -= 16
        level = [0, 95, 135, 175, 215, 255]
        return '#%02x%02x%02x' % (level[n // 36], level[n // 6 % 6], level[n % 6])
    return '#%02x%02x%02x' % ((8 + 10 * (n - 232),) * 3)


def cells(line):
    """The characters of a captured line with their styles."""
    style, out = {}, []
    for token in re.findall(r'\x1b\[[0-9;:]*m|[^\x1b]', line):
        if not token.startswith('\x1b'):
            if unicodedata.combining(token) and out:
                out[-1] = (out[-1][0] + token, out[-1][1], out[-1][2])
            else:
                wide = unicodedata.east_asian_width(token) in 'WF' or ord(token) >= 0x1F300
                out.append((token, dict(style), 2 if wide else 1))
            continue
        params = [int(p or 0) for p in (token[2:-1].replace(':', ';') or '0').split(';')]
        i = 0
        while i < len(params):
            p = params[i]
            if p == 0:
                style = {}
            elif p in (1, 2, 3, 4, 7):
                style[p] = True
            elif p == 22:
                style.pop(1, None), style.pop(2, None)
            elif p in (23, 24, 27):
                style.pop(p - 20, None)
            elif p in (38, 48):
                key = 'fg' if p == 38 else 'bg'
                if params[i + 1] == 2:
                    style[key] = '#%02x%02x%02x' % tuple(params[i + 2:i + 5])
                    i += 4
                else:
                    style[key] = color(params[i + 2])
                    i += 2
            elif p in (39, 49):
                style.pop('fg' if p == 39 else 'bg', None)
            elif 30 <= p <= 37 or 90 <= p <= 97:
                style['fg'] = color(p - 30 if p < 90 else p - 82)
            elif 40 <= p <= 47 or 100 <= p <= 107:
                style['bg'] = color(p - 40 if p < 100 else p - 92)
            i += 1
    return out


def shot(seconds):
    """Captures the screen and shows it for `seconds`."""
    capture = tmux('capture-pane', '-t', 'demo', '-e', '-p', '-N')
    x, y, shown = tmux('display', '-p', '-t', 'demo', '#{cursor_x},#{cursor_y},#{cursor_flag}').strip().split(',')
    cursor = (int(x), int(y)) if shown == '1' else None
    cw, ch = 9.6, 22
    out = [f'''<!doctype html><meta charset=utf-8><style>
@font-face{{font-family:J;src:url("file://{FONTS / 'mono.woff2'}")}}
@font-face{{font-family:J;src:url("file://{FONTS / 'mono-italic.woff2'}");font-style:italic}}
body{{margin:0}}.s{{position:relative;width:{COLS * cw}px;height:{ROWS * ch}px;padding:14px;background:{BG};
color:{FG};font:16px/{ch}px J,monospace;font-variant-ligatures:none}}
span{{position:absolute;height:{ch}px;white-space:pre}}</style><div class=s>''']
    for row, line in enumerate(capture.split('\n')[:ROWS]):
        col = 0
        for char, st, width in cells(line):
            fg, bg = st.get('fg', FG), st.get('bg')
            if st.get(7):
                fg, bg = bg or BG, fg
            if (col, row) == cursor:
                fg, bg = BG, FG
            css = f'left:{14 + col * cw}px;top:{14 + row * ch}px;width:{width * cw}px;color:{fg}'
            css += f';background:{bg}' if bg else ''
            css += ';font-weight:700' if st.get(1) else ''
            css += ';opacity:.55' if st.get(2) else ''
            css += ';font-style:italic' if st.get(3) else ''
            css += ';text-decoration:underline' if st.get(4) else ''
            if char != ' ' or bg:
                out.append(f'<span style="{css}">{html.escape(char)}</span>')
            col += width
    name = f'{len(timeline):04d}.html'
    (frames / name).write_text(''.join(out) + '</div>')
    timeline.append([name, seconds])


def keys(*names, hold=0.35):
    tmux('send-keys', '-t', 'demo', *names)
    time.sleep(0.15)
    shot(hold)


def type_(text, step=2, hold=0.6):
    for i in range(0, len(text), step):
        tmux('send-keys', '-t', 'demo', '-l', '--', text[i:i + step])
        time.sleep(0.04)
        shot(0.1)
    shot(hold)


env = {'HOME': work, 'PATH': f"{work / 'bin'}:/usr/bin:/bin", 'TERM': 'tmux-256color', 'COLORTERM': 'truecolor',
       'LANG': 'C.UTF-8', 'PS1': r'\[\e[38;2;127;176;232m\]~/api\[\e[0m\] $ '}
tmux('new-session', '-d', '-x', str(COLS), '-y', str(ROWS), '-s', 'demo', '-c', str(work / 'api'),
     'env', '-i', *(f'{k}={v}' for k, v in env.items()), 'bash', '--norc', '--noprofile', '-i')
tmux('set', '-g', 'window-style', f'fg={FG},bg={BG}')
tmux('set', '-g', 'status', 'off')
time.sleep(0.6)
try:
    shot(0.8)
    type_('review plan.md', step=1, hold=0.3)
    keys('Enter', hold=0)
    time.sleep(2.5)
    shot(1.4)
    for _ in range(4):
        keys('j', hold=0.25)                       # line 5: "Key buckets by client IP address."
    keys('c', hold=0.5)
    type_('Key by API token instead; many clients share one IP behind NAT.', step=3)
    keys('Enter', hold=1.4)                        # Enter records the comment
    for _ in range(5):
        keys('j', hold=0.2)                        # line 10: rollout
    keys('v', hold=0.3)
    keys('j', hold=0.4)
    keys('c', hold=0.5)
    type_('Roll out on /search first, behind a flag, then widen.', step=3)
    keys('Enter', hold=1.2)
    keys('a', hold=2.4)                            # every comment, on the document's grid
    keys('a', hold=0.4)
    keys('s', hold=1.8)                            # save review-feedback.json
    keys('q', hold=1.2)
    type_("jq '.comments[] | {quote: .target.quote, body}' review-feedback.json", step=4, hold=0.2)
    keys('Enter', hold=3.5)
    type_('claude "Address the review comments in review-feedback.json"', step=3, hold=4)
finally:
    tmux('kill-server')
saved = json.loads((work / 'api' / 'review-feedback.json').read_text())
assert [(c['target']['start_line'], c['target']['end_line']) for c in saved['comments']] == [(5, 5), (10, 11)]
(frames / 'timeline.json').write_text(json.dumps(timeline))
subprocess.run(['node', MEDIA / 'encode.mjs', frames, MEDIA / 'tui.gif'], check=True)
subprocess.run(['rm', '-r', work], check=True)
print(MEDIA / 'tui.gif')
