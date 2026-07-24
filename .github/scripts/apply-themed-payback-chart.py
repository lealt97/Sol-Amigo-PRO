from pathlib import Path


PAYBACK_PATH = Path('src/pages/propostas/PaybackStep.tsx')
TEST_PATH = Path('tests/payback-flow.test.ts')


def replace_once(source: str, old: str, new: str, label: str) -> str:
    if old not in source:
        raise SystemExit(f'Marcador não encontrado: {label}')
    return source.replace(old, new, 1)


payback = PAYBACK_PATH.read_text(encoding='utf-8')
payback = replace_once(
    payback,
    '''                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="year" interval={4} tickFormatter={(year) => `${year}`} />
                    <YAxis width={76} tickFormatter={(value) => `R$ ${Math.round(Number(value) / 1000)}k`} />
                    <Tooltip
                      labelFormatter={(year) => `Ano ${year}`}
                      formatter={(value) => [currency.format(Number(value)), 'Saldo acumulado']}
                    />
                    <ReferenceLine y={0} stroke="#64748b" />
                    <Bar dataKey="cumulativeBalance" radius={[5, 5, 0, 0]}>
                      {result.chartData.map((point) => (
                        <Cell
                          key={point.year}
                          fill={point.cumulativeBalance >= 0 ? '#0076DD' : '#ef4444'}
                        />
                      ))}
                    </Bar>''',
    '''                    <CartesianGrid
                      stroke="var(--color-brand-border)"
                      strokeDasharray="3 3"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="year"
                      interval={4}
                      stroke="var(--color-slate-500)"
                      tick={{ fill: 'var(--color-slate-500)' }}
                      tickFormatter={(year) => `${year}`}
                    />
                    <YAxis
                      width={76}
                      stroke="var(--color-slate-500)"
                      tick={{ fill: 'var(--color-slate-500)' }}
                      tickFormatter={(value) => `R$ ${Math.round(Number(value) / 1000)}k`}
                    />
                    <Tooltip
                      cursor={{ fill: 'var(--color-gray-100)' }}
                      contentStyle={{
                        backgroundColor: 'var(--color-brand-surface)',
                        borderColor: 'var(--color-brand-border)',
                        color: 'var(--color-brand-dark)',
                      }}
                      labelStyle={{ color: 'var(--color-brand-dark)' }}
                      itemStyle={{ color: 'var(--color-brand-dark)' }}
                      labelFormatter={(year) => `Ano ${year}`}
                      formatter={(value) => [currency.format(Number(value)), 'Saldo acumulado']}
                    />
                    <ReferenceLine y={0} stroke="var(--color-slate-500)" />
                    <Bar dataKey="cumulativeBalance" radius={0}>
                      {result.chartData.map((point) => (
                        <Cell
                          key={point.year}
                          fill={point.cumulativeBalance >= 0
                            ? 'var(--color-brand-blue)'
                            : 'var(--color-brand-yellow)'}
                        />
                      ))}
                    </Bar>''',
    'configuração visual do gráfico',
)
PAYBACK_PATH.write_text(payback, encoding='utf-8')


tests = TEST_PATH.read_text(encoding='utf-8')
old_assertion = '''  assert.match(payback, /<Bar dataKey="cumulativeBalance"/);
});'''
new_assertion = '''  assert.match(payback, /<Bar dataKey="cumulativeBalance" radius=\\{0\\}/);
  assert.match(payback, /var\\(--color-brand-blue\\)/);
  assert.match(payback, /var\\(--color-brand-yellow\\)/);
  assert.match(payback, /var\\(--color-brand-border\\)/);
  assert.match(payback, /var\\(--color-brand-surface\\)/);
  assert.doesNotMatch(payback, /radius=\\{\\[5, 5, 0, 0\\]\\}/);
  assert.doesNotMatch(payback, /fill=\\{point\\.cumulativeBalance >= 0 \\? '#0076DD' : '#ef4444'\\}/);
});'''
tests = replace_once(tests, old_assertion, new_assertion, 'teste visual do gráfico')
TEST_PATH.write_text(tests, encoding='utf-8')
