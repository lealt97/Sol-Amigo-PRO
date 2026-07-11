import React from 'react';
import { View, Text, StyleSheet } from '@react-pdf/renderer';
import { Proposal } from '../../../types/proposal';

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 18,
    color: '#18181b',
    borderBottom: '2px solid #3b82f6',
    paddingBottom: 5,
  },
  eyebrow: {
    fontSize: 10,
    color: '#3b82f6',
    textTransform: 'uppercase',
    fontWeight: 'bold',
    marginBottom: 18,
  },
  greeting: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#18181b',
    marginBottom: 16,
  },
  paragraph: {
    fontSize: 12,
    color: '#3f3f46',
    lineHeight: 1.6,
    marginBottom: 12,
  },
  highlightBox: {
    marginTop: 16,
    marginBottom: 18,
    padding: 18,
    backgroundColor: '#eff6ff',
    borderLeft: '4px solid #3b82f6',
    borderRadius: 8,
  },
  highlightText: {
    fontSize: 12,
    color: '#1e3a8a',
    lineHeight: 1.5,
    fontWeight: 'bold',
  },
  signatureBlock: {
    marginTop: 34,
  },
  signatureName: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#18181b',
    marginBottom: 4,
  },
  signatureRole: {
    fontSize: 10,
    color: '#71717a',
  },
});

export const IntroLetterSection = ({ proposal }: { proposal: Proposal }) => {
  const clientName = proposal.client?.name || 'cliente';
  const companyName = proposal.profile?.company_name || 'nossa equipe';
  const sellerName = proposal.profile?.seller_name || proposal.profile?.company_name || 'Equipe comercial';

  return (
    <View>
      <Text style={styles.eyebrow}>Proposta comercial fotovoltaica</Text>
      <Text style={styles.sectionTitle}>Carta de Apresentação</Text>

      <Text style={styles.greeting}>Olá, {clientName}.</Text>

      <Text style={styles.paragraph}>
        Preparamos esta proposta para apresentar uma solução de energia solar fotovoltaica personalizada para o seu perfil de consumo.
        Nosso objetivo é reduzir seus gastos com energia elétrica, aumentar a previsibilidade financeira e entregar uma solução moderna,
        segura e durável.
      </Text>

      <Text style={styles.paragraph}>
        O estudo considera os dados de consumo informados, as condições de geração estimadas para o local de instalação e os parâmetros
        técnicos necessários para dimensionar um sistema compatível com a sua necessidade.
      </Text>

      <View style={styles.highlightBox}>
        <Text style={styles.highlightText}>
          A proposta foi estruturada para facilitar a decisão: primeiro mostramos o resumo do investimento, depois o diagnóstico,
          a solução técnica, a geração estimada, o retorno financeiro e os próximos passos para execução do projeto.
        </Text>
      </View>

      <Text style={styles.paragraph}>
        Agradecemos a oportunidade de apresentar este estudo. Ficamos à disposição para ajustar a solução, esclarecer dúvidas e conduzir
        todas as etapas até a instalação e homologação do sistema.
      </Text>

      <View style={styles.signatureBlock}>
        <Text style={styles.signatureName}>{sellerName}</Text>
        <Text style={styles.signatureRole}>{companyName}</Text>
      </View>
    </View>
  );
};
