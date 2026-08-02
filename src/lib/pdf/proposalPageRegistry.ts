import type { PdfPageConfig } from '../../types/pdfModels';

export type ProposalPageKey =
  | 'cover'
  | 'intro'
  | 'consumption'
  | 'technical'
  | 'kit'
  | 'roof'
  | 'timeline'
  | 'financial'
  | 'payback'
  | 'acceptance';

export interface ProposalPageDefinition {
  key: ProposalPageKey;
  label: string;
  description: string;
  optional?: boolean;
}

export const PROPOSAL_PAGE_DEFINITIONS: ProposalPageDefinition[] = [
  {
    key: 'cover',
    label: 'Capa',
    description: 'Apresentação principal da proposta e identificação do cliente.',
  },
  {
    key: 'intro',
    label: 'Resumo da solução',
    description: 'Benefícios centrais, potência, geração e economia estimada.',
  },
  {
    key: 'consumption',
    label: 'Consumo e geração',
    description: 'Comparativo mensal entre consumo, geração solar e energia da rede.',
  },
  {
    key: 'technical',
    label: 'Sistema proposto',
    description: 'Dimensionamento, componentes principais e desempenho esperado.',
  },
  {
    key: 'kit',
    label: 'Itens do kit FV',
    description: 'Tabela listrada com os equipamentos incluídos na solução.',
    optional: true,
  },
  {
    key: 'roof',
    label: 'Simulação no telhado',
    description: 'Foto ou estudo visual do posicionamento dos módulos.',
    optional: true,
  },
  {
    key: 'timeline',
    label: 'Etapas da implantação',
    description: 'Projeto, homologação, entrega, instalação e ativação.',
  },
  {
    key: 'financial',
    label: 'Investimento',
    description: 'Valor comercial, economia e visão financeira da proposta.',
  },
  {
    key: 'payback',
    label: 'Retorno do investimento',
    description: 'Curva de payback e economia acumulada ao longo do tempo.',
  },
  {
    key: 'acceptance',
    label: 'Próximos passos',
    description: 'Chamada para aprovação, contatos e espaço de aceite.',
  },
];

export const DEFAULT_PROPOSAL_PAGE_ORDER: ProposalPageKey[] = PROPOSAL_PAGE_DEFINITIONS.map(
  ({ key }) => key,
);

export const DEFAULT_PROPOSAL_VISIBLE_PAGES: Record<ProposalPageKey, boolean> =
  PROPOSAL_PAGE_DEFINITIONS.reduce(
    (accumulator, page) => {
      accumulator[page.key] = true;
      return accumulator;
    },
    {} as Record<ProposalPageKey, boolean>,
  );

const PAGE_KEYS = new Set<string>(DEFAULT_PROPOSAL_PAGE_ORDER);

export function isProposalPageKey(value: string): value is ProposalPageKey {
  return PAGE_KEYS.has(value);
}

export function createDefaultProposalPageConfig(): PdfPageConfig {
  return {
    order: [...DEFAULT_PROPOSAL_PAGE_ORDER],
    visiblePages: { ...DEFAULT_PROPOSAL_VISIBLE_PAGES },
  };
}

export function normalizeProposalPageConfig(
  pageConfig?: Partial<PdfPageConfig> | null,
): PdfPageConfig {
  const configuredOrder = Array.isArray(pageConfig?.order)
    ? pageConfig.order.filter(isProposalPageKey)
    : [];
  const uniqueConfiguredOrder = Array.from(new Set(configuredOrder));
  const missingPages = DEFAULT_PROPOSAL_PAGE_ORDER.filter(
    (pageKey) => !uniqueConfiguredOrder.includes(pageKey),
  );

  return {
    order: [...uniqueConfiguredOrder, ...missingPages],
    visiblePages: {
      ...DEFAULT_PROPOSAL_VISIBLE_PAGES,
      ...(pageConfig?.visiblePages || {}),
      cover: true,
    },
  };
}

export function getOrderedProposalPages(
  pageConfig?: Partial<PdfPageConfig> | null,
): ProposalPageDefinition[] {
  const normalized = normalizeProposalPageConfig(pageConfig);
  const definitionsByKey = new Map(
    PROPOSAL_PAGE_DEFINITIONS.map((definition) => [definition.key, definition]),
  );

  return normalized.order
    .filter(isProposalPageKey)
    .map((pageKey) => definitionsByKey.get(pageKey))
    .filter((definition): definition is ProposalPageDefinition => Boolean(definition));
}

export function getVisibleProposalPages(
  pageConfig?: Partial<PdfPageConfig> | null,
): ProposalPageDefinition[] {
  const normalized = normalizeProposalPageConfig(pageConfig);

  return getOrderedProposalPages(normalized).filter(
    (definition) => normalized.visiblePages?.[definition.key] !== false,
  );
}
