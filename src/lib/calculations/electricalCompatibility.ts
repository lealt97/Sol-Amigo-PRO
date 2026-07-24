import type { ConnectionType } from './professionalSizing';
import type { SolarKitConnectionType } from '../../types/solarKit';

export type ElectricalCompatibilityStatus =
  | 'compatible'
  | 'connection_upgrade_required'
  | 'voltage_adaptation_required'
  | 'technical_review'
  | 'unknown';

export type ElectricalCompatibilityInput = {
  customerConnectionType: ConnectionType;
  customerVoltageV: number | null;
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

export function calculateElectricalCompatibility(
  input: ElectricalCompatibilityInput,
): ElectricalCompatibilityResult {
  if (!input.kitConnectionType || !validVoltage(input.kitVoltageV) || !validVoltage(input.customerVoltageV)) {
    return {
      status: 'unknown',
      statusLabel: 'Dados elétricos incompletos',
      guidance: 'Cadastre a ligação e a tensão nominal do kit e informe a tensão da unidade consumidora para concluir a análise.',
      requiresConnectionUpgrade: false,
      voltageDifferencePercent: null,
    };
  }

  const customerVoltageV = input.customerVoltageV as number;
  const kitVoltageV = input.kitVoltageV as number;
  const voltageDifferencePercent = Math.abs(kitVoltageV - customerVoltageV) / customerVoltageV * 100;
  const voltageCompatible = voltageDifferencePercent <= NOMINAL_VOLTAGE_TOLERANCE_PERCENT;
  const customerRank = CONNECTION_RANK[input.customerConnectionType];
  const kitRank = CONNECTION_RANK[input.kitConnectionType];
  const customerLabel = CONNECTION_LABELS[input.customerConnectionType];
  const kitLabel = CONNECTION_LABELS[input.kitConnectionType];

  if (kitRank > customerRank) {
    return {
      status: 'connection_upgrade_required',
      statusLabel: 'Aumento de carga necessário',
      guidance: `O kit foi configurado para ligação ${kitLabel} em ${kitVoltageV} V, enquanto a unidade está em ligação ${customerLabel} de ${customerVoltageV} V. Antes da aquisição, avalie com a distribuidora o aumento de carga e a alteração do padrão de entrada para ${kitLabel}.`,
      requiresConnectionUpgrade: true,
      voltageDifferencePercent,
    };
  }

  if (!voltageCompatible) {
    return {
      status: 'voltage_adaptation_required',
      statusLabel: 'Adequação de tensão necessária',
      guidance: `A tensão nominal do kit é ${kitVoltageV} V e a unidade foi informada com ${customerVoltageV} V. Selecione uma versão compatível do kit ou confirme a adequação elétrica com o projetista e a distribuidora.`,
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
    guidance: `A ligação ${kitLabel} e a tensão nominal de ${kitVoltageV} V do kit correspondem aos dados informados para a unidade consumidora.`,
    requiresConnectionUpgrade: false,
    voltageDifferencePercent,
  };
}
