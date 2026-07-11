import React from 'react';
import { View, Text, StyleSheet, Image, Svg, Rect, Line, G, Polygon, Text as SvgText } from '@react-pdf/renderer';
import { Proposal } from '../../../types/proposal';
import { DEFAULT_ROOF_LAYOUT_STRINGS, RoofLayoutData, RoofLayoutModule } from '../../../types/roofLayout';
import { getSectionTitleStyle, usePdfTheme } from '../pdfTheme';

const styles = StyleSheet.create({
  sectionTitle: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, color: '#18181b', borderBottomWidth: 2, borderBottomStyle: 'solid', borderBottomColor: '#3b82f6', paddingBottom: 5 },
  intro: { fontSize: 12, color: '#3f3f46', lineHeight: 1.5, marginBottom: 18 },
  grid: { display: 'flex', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 14 },
  card: { width: '48%', backgroundColor: '#f8fafc', padding: 14, borderRadius: 8, marginBottom: 14, borderWidth: 1, borderStyle: 'solid', borderColor: '#e4e4e7' },
  cardLabel: { fontSize: 9, color: '#71717a', textTransform: 'uppercase', marginBottom: 4 },
  cardValue: { fontSize: 17, fontWeight: 'bold', color: '#18181b' },
  roofSectionTitle: { fontSize: 13, fontWeight: 'bold', color: '#18181b', marginBottom: 8, marginTop: 4 },
  roofInfoGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 10 },
  roofInfoCard: { width: '48%', backgroundColor: '#f8fafc', borderWidth: 1, borderStyle: 'solid', borderColor: '#e4e4e7', borderRadius: 8, padding: 9, marginBottom: 8 },
  roofInfoLabel: { fontSize: 8, color: '#71717a', textTransform: 'uppercase', marginBottom: 3 },
  roofInfoValue: { fontSize: 11, fontWeight: 'bold', color: '#18181b' },
  roofPlanningBox: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  roofImageBox: { width: '58%', height: 174, backgroundColor: '#f8fafc', borderWidth: 1, borderStyle: 'dashed', borderColor: '#94a3b8', borderRadius: 8, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', padding: 0, position: 'relative' },
  roofImageLayer: { width: '100%', height: '100%', position: 'relative' },
  roofImage: { width: '100%', height: '100%', objectFit: 'cover' },
  roofOverlay: { position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 },
  placeholder: { padding: 14 },
  placeholderTitle: { fontSize: 12, fontWeight: 'bold', color: '#334155', marginBottom: 6, textAlign: 'center' },
  placeholderText: { fontSize: 9, color: '#64748b', lineHeight: 1.4, textAlign: 'center' },
  modulePlanBox: { width: '38%', height: 174, backgroundColor: '#f8fafc', borderWidth: 1, borderStyle: 'solid', borderColor: '#e4e4e7', borderRadius: 8, padding: 10 },
  planTitle: { fontSize: 10, fontWeight: 'bold', color: '#18181b', marginBottom: 6 },
  planSvg: { width: '100%', height: 92, borderRadius: 4 },
  overlayPlanSvg: { width: '100%', height: '100%' },
  legend: { marginTop: 7 },
  legendRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 3 },
  legendDot: { width: 7, height: 7, borderRadius: 4, marginRight: 5 },
  legendText: { fontSize: 8, color: '#52525b' },
  planNote: { fontSize: 7, color: '#71717a', lineHeight: 1.25, marginTop: 4 },
  objectiveBox: { backgroundColor: '#ecfdf5', borderLeftWidth: 4, borderLeftStyle: 'solid', borderLeftColor: '#10b981', padding: 16, borderRadius: 8, marginTop: 6 },
  objectiveTitle: { fontSize: 12, fontWeight: 'bold', color: '#047857', marginBottom: 6 },
  objectiveText: { fontSize: 11, color: '#065f46', lineHeight: 1.45 },
  note: { fontSize: 10, color: '#71717a', marginTop: 16, lineHeight: 1.4, fontStyle: 'italic' },
});

const formatMoney = (val: number | null | undefined) => {
  if (val === null || val === undefined) return 'N/A';
  return 'R$ ' + val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const formatKwh = (val: number | null | undefined) => {
  if (val === null || val === undefined) return 'N/A';
  return `${val.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} kWh`;
};

const formatArea = (val: number | null | undefined) => {
  if (val === null || val === undefined || val <= 0) return 'A definir';
  return `${val.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} m²`;
};

const sourceLabel: Record<string, string> = {
  average: 'Consumo médio informado',
  historical: 'Histórico de consumo',
  load_survey: 'Levantamento de cargas',
};

function buildFallbackLayout(moduleCount: number): RoofLayoutData {
  const count = Math.min(Math.max(moduleCount || 8, 4), 24);
  const strings = DEFAULT_ROOF_LAYOUT_STRINGS.slice(0, 2);
  const modules: RoofLayoutModule[] = Array.from({ length: count }).map((_, index) => ({
    id: `fallback-${index}`,
    x: 8 + (index % 4) * 21,
    y: 12 + Math.floor(index / 4) * 18,
    width: 10,
    height: 15,
    rotation: 0,
    stringId: strings[index % strings.length].id,
  }));

  return { modules, strings };
}

function getStringColor(layout: RoofLayoutData, stringId: string, fallback: string) {
  return layout.strings.find((string) => string.id === stringId)?.color || fallback;
}

function RoofPlanSvg({ layout, showLabels = false, overlay = false }: { layout: RoofLayoutData; showLabels?: boolean; overlay?: boolean }) {
  const modules = layout.modules || [];
  const strings = layout.strings?.length ? layout.strings : DEFAULT_ROOF_LAYOUT_STRINGS;

  return (
    <Svg style={overlay ? styles.overlayPlanSvg : styles.planSvg} viewBox="0 0 100 100" preserveAspectRatio="none">
      {strings.map((string) => {
        const stringModules = modules.filter((module) => module.stringId === string.id);
        return stringModules.slice(1).map((module, index) => {
          const previous = stringModules[index];
          const x1 = previous.x + previous.width / 2;
          const y1 = previous.y + previous.height / 2;
          const x2 = module.x + module.width / 2;
          const y2 = module.y + module.height / 2;

          return <Line key={`${string.id}-${module.id}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke={string.color} strokeWidth={0.45} strokeDasharray="1 0.8" />;
        });
      })}

      {modules.map((module, index) => {
        const color = getStringColor(layout, module.stringId, '#2563EB');
        const cx = module.x + module.width / 2;
        const cy = module.y + module.height / 2;
        const arrowTop = module.y + 0.8;
        const arrowMiddle = module.x + module.width / 2;

        return (
          <G key={module.id} transform={`rotate(${module.rotation || 0} ${cx} ${cy})`}>
            <Rect x={module.x} y={module.y} width={module.width} height={module.height} rx={0.8} fill="#F8FAFC" stroke={color} strokeWidth={0.7} />
            <Rect x={module.x + module.width * 0.12} y={module.y + module.height * 0.18} width={module.width * 0.76} height={module.height * 0.58} fill={color} fillOpacity={0.16} />
            <Line x1={module.x + module.width * 0.5} y1={module.y + module.height * 0.18} x2={module.x + module.width * 0.5} y2={module.y + module.height * 0.76} stroke={color} strokeWidth={0.25} />
            <Line x1={module.x + module.width * 0.12} y1={module.y + module.height * 0.38} x2={module.x + module.width * 0.88} y2={module.y + module.height * 0.38} stroke={color} strokeWidth={0.25} />
            <Line x1={module.x + module.width * 0.12} y1={module.y + module.height * 0.58} x2={module.x + module.width * 0.88} y2={module.y + module.height * 0.58} stroke={color} strokeWidth={0.25} />
            <Polygon points={`${arrowMiddle},${arrowTop} ${module.x + module.width * 0.86},${module.y + module.height * 0.2} ${module.x + module.width * 0.6},${module.y + module.height * 0.2} ${module.x + module.width * 0.6},${module.y + module.height * 0.38} ${module.x + module.width * 0.4},${module.y + module.height * 0.38} ${module.x + module.width * 0.4},${module.y + module.height * 0.2} ${module.x + module.width * 0.14},${module.y + module.height * 0.2}`} fill="#111827" />
            {showLabels && <SvgText x={cx} y={module.y + module.height - 1.2} fontSize={2.4} textAnchor="middle" fill="#111827">{index + 1}</SvgText>}
          </G>
        );
      })}
    </Svg>
  );
}

export const EnergyDiagnosisSection = ({ proposal }: { proposal: Proposal }) => {
  const theme = usePdfTheme();
  const solar = proposal.solar;
  const generationTarget = solar?.generation_target_percent || 100;
  const roofImageUrl = proposal.roof_image_url || proposal.roof_photo_url || proposal.roof_plan_image_url || null;
  const roofType = proposal.roof_type || 'A definir';
  const savedLayout = proposal.roof_layout_json;
  const hasSavedLayout = !!savedLayout?.modules?.length;
  const layout = hasSavedLayout ? savedLayout : buildFallbackLayout(solar?.panel_count || 8);
  const moduleWidthM = proposal.module_width_m || 1.13;
  const moduleHeightM = proposal.module_height_m || 2.28;
  const moduleArea = moduleWidthM * moduleHeightM;
  const occupiedArea = moduleArea * (layout.modules?.length || solar?.panel_count || 0);
  const stringsWithModules = layout.strings.filter((string) => layout.modules.some((module) => module.stringId === string.id));

  return (
    <View>
      <Text style={[styles.sectionTitle, getSectionTitleStyle(theme)]}>Diagnóstico Energético</Text>
      <Text style={styles.intro}>Esta etapa resume a situação de consumo considerada no dimensionamento e os dados usados para estimar a economia do sistema.</Text>

      <View style={styles.grid}>
        <View style={[styles.card, { borderColor: theme.border }]}> 
          <Text style={styles.cardLabel}>Método de consumo</Text>
          <Text style={[styles.cardValue, { color: theme.neutral }]}>{sourceLabel[proposal.consumption_source || 'average'] || 'Consumo informado'}</Text>
        </View>
        <View style={[styles.card, { borderColor: theme.border }]}> 
          <Text style={styles.cardLabel}>Consumo mensal considerado</Text>
          <Text style={[styles.cardValue, { color: theme.neutral }]}>{formatKwh(solar?.monthly_consumption_kwh || proposal.monthly_consumption_kwh)}</Text>
        </View>
        <View style={[styles.card, { borderColor: theme.border }]}> 
          <Text style={styles.cardLabel}>Valor médio da conta</Text>
          <Text style={[styles.cardValue, { color: theme.neutral }]}>{formatMoney(proposal.bill_amount || solar?.current_bill_value)}</Text>
        </View>
        <View style={[styles.card, { borderColor: theme.border }]}> 
          <Text style={styles.cardLabel}>Tarifa estimada</Text>
          <Text style={[styles.cardValue, { color: theme.neutral }]}>{formatMoney(proposal.energy_tariff || solar?.energy_tariff)}/kWh</Text>
        </View>
      </View>

      <Text style={[styles.roofSectionTitle, { color: theme.neutral }]}>Local de instalação e planimetria dos módulos</Text>

      <View style={styles.roofInfoGrid}>
        <View style={[styles.roofInfoCard, { borderColor: theme.border }]}> 
          <Text style={styles.roofInfoLabel}>Tipo de telhado/local</Text>
          <Text style={[styles.roofInfoValue, { color: theme.neutral }]}>{roofType}</Text>
        </View>
        <View style={[styles.roofInfoCard, { borderColor: theme.border }]}> 
          <Text style={styles.roofInfoLabel}>Área útil informada</Text>
          <Text style={[styles.roofInfoValue, { color: theme.neutral }]}>{formatArea(proposal.roof_area_m2)}</Text>
        </View>
        <View style={[styles.roofInfoCard, { borderColor: theme.border }]}> 
          <Text style={styles.roofInfoLabel}>Dimensão do módulo</Text>
          <Text style={[styles.roofInfoValue, { color: theme.neutral }]}>{moduleWidthM.toFixed(2)} × {moduleHeightM.toFixed(2)} m</Text>
        </View>
        <View style={[styles.roofInfoCard, { borderColor: theme.border }]}> 
          <Text style={styles.roofInfoLabel}>Área ocupada estimada</Text>
          <Text style={[styles.roofInfoValue, { color: theme.neutral }]}>{formatArea(occupiedArea)}</Text>
        </View>
      </View>

      <View style={styles.roofPlanningBox}>
        <View style={[styles.roofImageBox, { borderColor: theme.primary }]}> 
          {roofImageUrl ? (
            <View style={styles.roofImageLayer}>
              <Image src={roofImageUrl} style={styles.roofImage} />
              {hasSavedLayout && <View style={styles.roofOverlay}><RoofPlanSvg layout={layout} showLabels overlay /></View>}
            </View>
          ) : (
            <View style={styles.placeholder}>
              <Text style={[styles.placeholderTitle, { color: theme.neutral }]}>Espaço para foto do telhado do cliente</Text>
              <Text style={styles.placeholderText}>Área reservada para inserir a imagem real do local de instalação, com visão do telhado ou área onde os módulos serão posicionados.</Text>
            </View>
          )}
        </View>

        <View style={[styles.modulePlanBox, { borderColor: theme.border }]}> 
          <Text style={[styles.planTitle, { color: theme.neutral }]}>Strings e módulos</Text>
          <RoofPlanSvg layout={layout} showLabels />
          <View style={styles.legend}>
            {stringsWithModules.slice(0, 4).map((string) => {
              const count = layout.modules.filter((module) => module.stringId === string.id).length;
              return (
                <View key={string.id} style={styles.legendRow}>
                  <View style={[styles.legendDot, { backgroundColor: string.color }]} />
                  <Text style={styles.legendText}>{string.name}: {count} módulos</Text>
                </View>
              );
            })}
          </View>
          <Text style={styles.planNote}>Representação preliminar das strings. A posição final depende da visita técnica, orientação, sombreamento e estrutura.</Text>
        </View>
      </View>

      <View style={[styles.objectiveBox, { backgroundColor: theme.secondarySoft, borderLeftColor: theme.secondary }]}> 
        <Text style={[styles.objectiveTitle, { color: theme.secondary }]}>Objetivo da solução</Text>
        <Text style={[styles.objectiveText, { color: theme.neutral }]}>Dimensionar um sistema fotovoltaico capaz de atender aproximadamente {generationTarget.toFixed(0)}% do consumo considerado, respeitando os parâmetros técnicos de irradiação solar, rendimento, potência dos módulos e relação DC/AC do inversor.</Text>
      </View>

      <Text style={styles.note}>Observação: valores de consumo, tarifa e economia podem variar conforme hábitos de uso, reajustes tarifários, bandeiras, impostos, disponibilidade solar e regras de compensação vigentes.</Text>
    </View>
  );
};
