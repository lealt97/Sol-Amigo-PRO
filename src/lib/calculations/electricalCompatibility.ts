import type { ConnectionType } from './professionalSizing';
import type { SolarKitConnectionType } from '../../types/solarKit';
import { formatElectricalStandardVoltages } from './electricalStandards';

export type ElectricalCompatibilityStatus =
  | 'compatible'
  | 'connection_upgrade_required'
  | 'technical_review'
  | 'unknown';

export type ElectricalCompatibilityInput = {
  customerConnectionType: ConnectionType;
  customerVoltagesV: readonly number[];
  kitConnectionType: SolarKitConnectionType | null;
  kitVoltageV: number | null;
};

export type ElectricalCompatibilityResult = {
  status: ElectricalCompatibilityStatus;
  statusLabel: string;
  guidance: string;
  requiresConnectionUpgrade: boolean;
  voltageDifferencePercent: number | null;
};

const CONNECTION_LABELS: Record<ConnectionType, string> = {
  monophase: 'monofásica',
  biphase: 'bifásica',
  triphase: 'trifásica',
};

const CONNECTION_RANK: Record<ConnectionType, number> = {
  monophase: 1,
  biphase: 2,
  triphase: 3,
};

export const NOMINAL_VOLTAGE_TOLERANCE_PERCENT = 5;

const validVoltage = (value: number | null) => (
  value != null && Number.isFinite(value) && value > 0
);

const validVoltages = (values: readonly number[]) => (
  values.filter((value) => Number.isFinite(value) && value > 0)
);

export function calculateElectricalCompatibility(
  input: ElectricalCompatibilityInput,
): ElectricalCompatibilityResult {
  const customerVoltagesV = validVoltages(input.customerVoltagesV);

  if (!input.kitConnectionType || !validVoltage(input.kitVoltageV) || customerVoltagesV.length === 0) {
    return {
      status: 'unknown',
      statusLabel: 'Dados elétricos incompletos',
      guidance: 'Cadastre a ligação e a tensão nominal do kit e selecione o padrão elétrico da unidade para concluir a análise.',
      requiresConnectionUpgrade: false,
      voltageDifferencePercent: null,
    };
  }

  const kitVoltageV = input.kitVoltageV as number;
  const voltageDifferences = customerVoltagesV.map((customerVoltageV) => (
    Math.abs(kitVoltageV - customerVoltageV) / customerVoltageV * 100
  ));
  const voltageDifferencePercent = Math.min(...voltageDifferences);
  const voltageCompatible = voltageDifferencePercent <= NOMINAL_VOLTAGE_TOLERANCE_PERCENT;
  const customerRank = CONNECTION_RANK[input.customerConnectionType];
  const kitRank = CONNECTION_RANK[input.kitConnectionType];
  const customerLabel = CONNECTION_LABELS[input.customerConnectionType];
  const kitLabel = CONNECTION_LABELS[input.kitConnectionType];
  const customerVoltagesLabel = formatElectricalStandardVoltages(customerVoltagesV);

  if (kitRank > customerRank) {
    return {
      status: 'connection_upgrade_required',
      statusLabel: 'Aumento de carga necessário',
      guidance: `O kit foi configurado para ligação ${kitLabel} em ${kitVoltageV} V, enquanto a unidade possui padrão ${customerLabel} com ${customerVoltagesLabel}. Antes da aquisição, avalie com a distribuidora o aumento de carga e a alteração do padrão de entrada para ${kitLabel}.`,
      requiresConnectionUpgrade: true,
      voltageDifferencePercent,
    };
  }

  if (!voltageCompatible) {
    return {
      status: 'technical_review',
      statusLabel: 'Análise técnica necessária',
      guidance: `A tensão nominal cadastrada para o kit é ${kitVoltageV} V e o padrão da unidade disponibiliza ${customerVoltagesLabel}. Isso não significa automaticamente que a rede precise ser adequada: confirme apenas a versão correta do inversor, a tensão de conexão e as regras da distribuidora.`,
      requiresConnectionUpgrade: false,
      voltageDifferencePercent,
    };
  }

  if (kitRank < customerRank) {
    return {
      status: 'technical_review',
      statusLabel: 'Análise técnica necessária',
      guidance: `A unidade possui ligação ${customerLabel}, enquanto o kit foi configurado para ligação ${kitLabel}. A instalação pode ser possível, mas deve ser confirmada quanto ao balanceamento de fases, limite de potência por fase e regras da distribuidora.`,
      requiresConnectionUpgrade: false,
      voltageDifferencePercent,
    };
  }

  return {
    status: 'compatible',
    statusLabel: 'Compatibilidade elétrica confirmada',
    guidance: `A ligação ${kitLabel} e a tensão nominal de ${kitVoltageV} V do kit são atendidas pelo padrão elétrico ${customerLabel} de ${customerVoltagesLabel}.`,
    requiresConnectionUpgrade: false,
    voltageDifferencePercent,
  };
}
