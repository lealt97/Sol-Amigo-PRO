import React from 'react';
import { StyleSheet, Text, View } from '@react-pdf/renderer';
import { getRoofCardinalLabel } from '../../../lib/calculations/roofOrientation';
import type { Proposal } from '../../../types/proposal';

const styles = StyleSheet.create({
  sectionTitle: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, color: '#18181b', borderBottom: '2px solid #3b82f6', paddingBottom: 5 },
  table: { width: 'auto', borderStyle: 'solid', borderWidth: 1, borderColor: '#e4e4e7', borderRightWidth: 0, borderBottomWidth: 0, marginTop: 20 },
  tableRow: { margin: 'auto', flexDirection: 'row' },
  tableColHeader: { width: '50%', borderStyle: 'solid', borderWidth: 1, borderColor: '#e4e4e7', borderLeftWidth: 0, borderTopWidth: 0, backgroundColor: '#f4f4f5', padding: 8 },
  tableCol: { width: '50%', borderStyle: 'solid', borderWidth: 1, borderColor: '#e4e4e7', borderLeftWidth: 0, borderTopWidth: 0, padding: 8 },
  tableCellHeader: { fontSize: 10, fontWeight: 'bold', color: '#3f3f46' },
  tableCell: { fontSize: 10, color: '#52525b' },
  note: { fontSize: 10, color: '#71717a', marginTop: 16, fontStyle: 'italic', lineHeight: 1.5 },
  planeList: { marginTop: 12, padding: 10, backgroundColor: '#f8fafc', border: '1px solid #e4e4e7' },
  planeTitle: { fontSize: 10, fontWeight: 'bold', color: '#3f3f46', marginBottom: 5 },
  planeText: { fontSize: 9, color: '#52525b', marginBottom: 3 },
  provisionalBox: { marginTop: 12, padding: 12, backgroundColor: '#fffbeb', border: '1px solid #fbbf24' },
  provisionalTitle: { fontSize: 11, fontWeight: 'bold', color: '#92400e', marginBottom: 5 },
  provisionalText: { fontSize: 9, color: '#78350f', lineHeight: 1.5 },
});

function TechnicalRow({ label, value }: { label: string; value: string }) {
  return <View style={styles.tableRow}><View style={styles.tableCol}><Text style={styles.tableCell}>{label}</Text></View><View style={styles.tableCol}><Text style={styles.tableCell}>{value}</Text></View></View>;
}

const formatNumber = (value: number, decimals = 2) => value.toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

export const TechnicalSection = ({ proposal }: { proposal: Proposal }) => {
  const solar = proposal.solar;
  const kit = proposal.solar_kit_snapshot;
  const roofPlanes = proposal.roof_planes_json ?? [];
  const panelPowerW = solar?.panel_power_w ?? kit?.module_power_w ?? null;
  const panelCount = solar?.panel_count ?? kit?.module_quantity ?? null;
  const installedPowerKwp = solar?.installed_power_kwp ?? kit?.kit_power_kwp ?? null;
  const inverterPowerKw = solar?.min_inverter_power_kw ?? kit?.inverter_power_kw ?? null;
  const hasTechnicalData = Boolean(solar || kit || roofPlanes.length || proposal.roof_orientation_factor || proposal.effective_performance_ratio);

  return (
    <View>
      <Text style={styles.sectionTitle}>Solução Técnica Preliminar</Text>
      {hasTechnicalData ? (
        <View style={styles.table}>
<View style={styles.tableRow}><View style={styles.tableColHeader}><Text style={styles.tableCellHeader}>Especificação</Text></View><View style={styles.tableColHeader}><Text style={styles.tableCellHeader}>Detalhes preliminares</Text></View></View>
{panelPowerW != null && <TechnicalRow label="Potência de cada módulo" value={`${formatNumber(panelPowerW, 0)} W`} />}
{panelCount != null && <TechnicalRow label="Quantidade de módulos" value={`${panelCount} unidades`} />}
{installedPowerKwp != null && <TechnicalRow label="Potência total estimada" value={`${formatNumber(installedPowerKwp)} kWp`} />}
{inverterPowerKw != null && <TechnicalRow label="Potência AC estimada do inversor" value={`${formatNumber(inverterPowerKw)} kW`} />}
{proposal.roof_area_m2 != null && <TechnicalRow label="Área útil informada" value={`${formatNumber(proposal.roof_area_m2)} m²`} />}
{solar?.hsp != null && <TechnicalRow label="Índice de irradiação adotado (HSP)" value={`${formatNumber(solar.hsp)} kWh/m².dia`} />}
{proposal.roof_latitude_degrees != null && <TechnicalRow label="Latitude informada" value={`${formatNumber(proposal.roof_latitude_degrees, 4)}°`} />}
{roofPlanes.length > 0 && <TechnicalRow label="Águas consideradas" value={`${roofPlanes.length}`} />}
{proposal.roof_orientation_factor != null && <TechnicalRow label="Fator solar ponderado" value={`${formatNumber(proposal.roof_orientation_factor * 100, 1)}%`} />}
{proposal.effective_performance_ratio != null && <TechnicalRow label="Rendimento global estimado" value={`${formatNumber(proposal.effective_performance_ratio * 100, 1)}%`} />}
        </View>
      ) : (
        <View style={styles.provisionalBox}>
<Text style={styles.provisionalTitle}>Dados técnicos ainda não verificados</Text>
<Text style={styles.provisionalText}>O telhado, a área disponível, a orientação, a inclinação e os equipamentos serão definidos após a vistoria técnica.</Text>
        </View>
      )}
      {roofPlanes.length > 0 && <View style={styles.planeList}><Text style={styles.planeTitle}>Configuração preliminar das águas do telhado</Text>{roofPlanes.map((plane, index) => <Text key={plane.id || String(index)} style={styles.planeText}>{plane.name || `Água ${index + 1}`}: {formatNumber(plane.areaM2)} m², inclinação de {formatNumber(plane.tiltDegrees, 1)}°, {getRoofCardinalLabel(plane.cardinalDirection)} ({formatNumber(plane.azimuthDegrees, 1)}°).</Text>)}</View>}
      <Text style={styles.note}>* Esta é uma pré-proposta comercial. Kit, fabricantes, modelos, quantidade de módulos, inversor, potência final, layout, área, inclinação, orientação, sombreamento, estrutura, geração e custos poderão ser ajustados após a vistoria técnica e o projeto executivo.</Text>
    </View>
  );
};
