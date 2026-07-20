#!/usr/bin/env python3

import argparse
import json
import os
import re
import urllib.request
from pathlib import Path


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument('--repository', required=True)
    parser.add_argument('--sha', required=True)
    parser.add_argument('--context', required=True)
    parser.add_argument('--outcome', required=True)
    parser.add_argument('--log', required=True)
    return parser.parse_args()


def normalize_summary(value: str) -> str:
    value = re.sub(r'^\s*#\s*', '', value, flags=re.MULTILINE)
    value = re.sub(r'\x1b\[[0-9;]*m', '', value)
    value = re.sub(r'\s+', ' ', value).strip()
    return value[:135]


def summarize_log(path: str, succeeded: bool) -> str:
    if succeeded:
        return 'Etapa concluída com sucesso.'

    text = Path(path).read_text(encoding='utf-8', errors='replace') if Path(path).exists() else ''
    patterns = (
        r'error TS\d+:[^\n]+',
        r'AssertionError(?: \[ERR_ASSERTION\])?:\s*[^\n]+',
        r'The input did not match the regular expression[^\n]*',
        r'Expected values to be strictly equal:[^\n]*',
        r'Could not resolve[^\n]+',
        r'RollupError[^\n]*',
        r'\[vite:[^\]]+\][^\n]+',
        r'not ok[^\n]*',
        r'Error:[^\n]+',
        r'ERR_[A-Z0-9_]+[^\n]*',
        r'failed[^\n]*',
    )
    for pattern in patterns:
        match = re.search(pattern, text, flags=re.IGNORECASE)
        if match:
            summary = normalize_summary(match.group(0))
            if summary and summary.lower() not in {'assertionerror', "assertionerror'"}:
                return summary

    lines = [normalize_summary(line) for line in text.splitlines()]
    meaningful = [
        line for line in lines
        if line and not line.startswith(('>', 'TAP version', 'npm warn', 'npm notice'))
    ]
    return meaningful[-1][:135] if meaningful else 'A etapa falhou; consulte o workflow Diagnóstico de build.'


def main() -> None:
    args = parse_args()
    token = os.environ.get('GH_TOKEN', '').strip()
    if not token:
        raise SystemExit('GH_TOKEN ausente')

    succeeded = args.outcome == 'success'
    summary = summarize_log(args.log, succeeded)
    context = args.context if succeeded else summary
    context = context[:100]

    payload = json.dumps({
        'state': 'success' if succeeded else 'failure',
        'context': context,
        'description': summary,
        'target_url': f"https://github.com/{args.repository}/actions",
    }).encode('utf-8')

    request = urllib.request.Request(
        f"https://api.github.com/repos/{args.repository}/statuses/{args.sha}",
        data=payload,
        method='POST',
        headers={
            'Accept': 'application/vnd.github+json',
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json',
            'X-GitHub-Api-Version': '2022-11-28',
            'User-Agent': 'solamigo-ci-diagnostics',
        },
    )

    with urllib.request.urlopen(request, timeout=30) as response:
        if response.status >= 300:
            raise SystemExit(f'Falha ao publicar status: HTTP {response.status}')


if __name__ == '__main__':
    main()
