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


def summarize_log(path: str, succeeded: bool) -> str:
    if succeeded:
        return 'Etapa concluída com sucesso.'

    text = Path(path).read_text(encoding='utf-8', errors='replace') if Path(path).exists() else ''
    candidates = []
    patterns = (
        r'error TS\d+:[^\n]+',
        r'AssertionError[^\n]*',
        r'not ok[^\n]*',
        r'Error:[^\n]+',
        r'failed[^\n]*',
        r'ERR_[A-Z0-9_]+[^\n]*',
    )
    for pattern in patterns:
        match = re.search(pattern, text, flags=re.IGNORECASE)
        if match:
            candidates.append(match.group(0))
            break

    summary = candidates[0] if candidates else 'A etapa falhou; consulte o workflow Diagnóstico de build.'
    summary = re.sub(r'\s+', ' ', summary).strip()
    return summary[:135]


def main() -> None:
    args = parse_args()
    token = os.environ.get('GH_TOKEN', '').strip()
    if not token:
        raise SystemExit('GH_TOKEN ausente')

    succeeded = args.outcome == 'success'
    payload = json.dumps({
        'state': 'success' if succeeded else 'failure',
        'context': args.context,
        'description': summarize_log(args.log, succeeded),
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
