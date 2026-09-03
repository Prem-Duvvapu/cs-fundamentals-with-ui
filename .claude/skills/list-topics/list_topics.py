#!/usr/bin/env python3
"""Inventory of curriculum topics per category, plus a registration audit.

Reads TopicService.java (the source of truth for what exists) and cross-references the
other five hard-required registration points, plus an informational check of whether the
topic has a topicVisualizerRegistry.jsx entry (optional — a topic with none is Study-only
by design). Usage:

    python3 .claude/skills/list-topics/list_topics.py [category] [--summaries] [--audit]

category: os | networking | dbms | java-spring | aiml  (aliases: cn, net, db, java, spring, ai, ml)
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]

ALIASES = {
    'cn': 'networking', 'net': 'networking', 'networks': 'networking',
    'db': 'dbms', 'database': 'dbms', 'databases': 'dbms',
    'java': 'java-spring', 'spring': 'java-spring',
    'ai': 'aiml', 'ml': 'aiml', 'ai-ml': 'aiml',
}
LABELS = {
    'os': 'Operating Systems', 'networking': 'Computer Networks',
    'dbms': 'Database Management Systems', 'java-spring': 'Java & Spring Ecosystem',
    'aiml': 'AI / ML Architecture',
}
LEVEL_ICON = {'beginner': 'B', 'intermediate': 'I', 'expert': 'E'}
ORDER = ['os', 'networking', 'dbms', 'java-spring', 'aiml']

FIELD = r'"((?:[^"\\]|\\.)*)"'
TOPIC_RE = re.compile(r'new Topic\(\s*' + r'\s*,\s*'.join([FIELD] * 5) + r'\s*\)', re.S)


def read(rel):
    p = ROOT / rel
    return p.read_text(encoding='utf-8', errors='replace') if p.exists() else ''


def load_topics():
    src = read('backend/src/main/java/com/csfundamentals/service/TopicService.java')
    return [
        {'id': m[0], 'title': m[1], 'category': m[2], 'level': m[3], 'summary': m[4]}
        for m in TOPIC_RE.findall(src)
    ]


def content_files():
    """category -> {stripped-filename-stem: filename}, mirroring ContentService.stripPrefix()"""
    out = {}
    croot = ROOT / 'content'
    for d in sorted(croot.iterdir()) if croot.is_dir() else []:
        if d.is_dir():
            out[d.name] = {
                re.sub(r'^\d+[a-z]?-', '', f.name)[:-3]: f.name
                for f in sorted(d.glob('*.md'))
            }
    return out


def resolve_content(files, category, topic_id):
    """Same two-stage lookup as ContentService: exact stem, then startsWith prefix."""
    entries = files.get(category, {})
    if topic_id in entries:
        return entries[topic_id]
    for stem, fname in entries.items():
        if stem.startswith(topic_id):
            return fname
    return None


def audit(topics, files):
    topic_page = read('frontend/src/pages/TopicPage.jsx')
    registry = read('frontend/src/components/visualizers/topicVisualizerRegistry.jsx')
    categories = read('frontend/src/utils/topicCategories.js')
    home = read('frontend/src/pages/HomePage.jsx')
    tests = read('backend/src/test/java/com/csfundamentals/service/TopicServiceTest.java')
    problems = []
    no_visualizer = []

    for t in topics:
        tid, cat = t['id'], t['category']
        miss = []
        if not resolve_content(files, cat, tid):
            miss.append('content file')
        if f"'{tid}':" not in topic_page:
            miss.append('TopicPage titleMap')
        if f"'{tid}'" not in registry:
            no_visualizer.append(tid)
        if f"'{tid}':" not in categories and f"{tid}:" not in categories:
            miss.append('topicCategories TOPIC_CATEGORY_MAP')
        if f"'{tid}'" not in home:
            miss.append('HomePage fallback')
        if f'"{tid}"' not in tests:
            miss.append('TopicServiceTest assertion')
        if miss:
            problems.append(f"  {tid:34} missing: {', '.join(miss)}")

    used = {resolve_content(files, t['category'], t['id']) for t in topics}
    for cat, entries in sorted(files.items()):
        for tid, fname in entries.items():
            if fname not in used:
                problems.append(f"  {tid:34} content/{cat}/{fname} exists but no topic resolves to it")

    for m in re.finditer(r'assertEquals\((\d+),\s*(\w+)Topics\.size\(\)', tests):
        expected, var = int(m.group(1)), m.group(2)
        actual = sum(1 for t in topics if t['category'] == ALIASES.get(var, var))
        if actual and actual != expected:
            problems.append(f"  {var:34} test asserts {expected} topics, TopicService has {actual}")
    return problems, no_visualizer


def main():
    args = [a for a in sys.argv[1:]]
    show_summaries = '--summaries' in args or '-s' in args
    do_audit = '--audit' in args or '-a' in args
    cats = [ALIASES.get(a.lower(), a.lower()) for a in args if not a.startswith('-')]

    topics = load_topics()
    files = content_files()
    if not topics:
        print('No topics parsed — TopicService.java missing or its format changed.')
        return 1

    for cat in ORDER:
        if cats and cat not in cats:
            continue
        rows = [t for t in topics if t['category'] == cat]
        if not rows:
            continue
        print(f"\n{LABELS[cat]}  ({cat}) — {len(rows)} topics")
        print('-' * 78)
        for t in rows:
            flag = '' if resolve_content(files, cat, t['id']) else '  [no content file]'
            print(f"  [{LEVEL_ICON.get(t['level'], '?')}] {t['id']:34} {t['title']}{flag}")
            if show_summaries:
                print(f"      {t['summary']}")

    if not cats:
        print(f"\nTotal registered: {len(topics)} topics across {len(ORDER)} categories")
        print(f"Content files on disk: {sum(len(v) for v in files.values())}")

    if do_audit:
        problems, no_visualizer = audit(topics, files)
        print('\nRegistration audit')
        print('-' * 78)
        print('\n'.join(problems) if problems else '  All registered topics are wired at all 6 hard-required points.')
        if no_visualizer:
            print('\nNo topicVisualizerRegistry.jsx entry (Study only, no Simulation tab — may be intentional):')
            print('\n'.join(f'  {tid}' for tid in no_visualizer))
    return 0


if __name__ == '__main__':
    sys.exit(main())
