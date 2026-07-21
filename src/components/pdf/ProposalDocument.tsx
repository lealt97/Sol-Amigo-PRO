import React from 'react';
import { Document, Page, StyleSheet, Image, Text, View } from '@react-pdf/renderer';
import { Proposal } from '../../types/proposal';
import { PdfTheme } from '../../types/pdfModels';
import { CoverPage } from './sections/CoverPage';
import { DynamicCoverOverlay } from './sections/DynamicCoverOverlay';
import { IntroLetterSection } from './sections/IntroLetterSection';
import { ExecutiveSummary } from './sections/ExecutiveSummary';
import { EnergyDiagnosisSection } from './sections/EnergyDiagnosisSection';
import { SolarSolutionSection } from './sections/SolarSolutionSection';
import { EquipmentSection } from './sections/EquipmentSection';
import { GenerationSection } from './sections/GenerationSection';
import { FinancialSection } from './sections/FinancialSection';
import { TermsSection } from './sections/TermsSection';
import { WarrantyAndNextStepsSection } from './sections/WarrantyAndNextStepsSection';
import { AcceptanceSection } from './sections/AcceptanceSection';
import { PdfThemeProvider, resolvePdfDocumentTheme } from './pdfTheme';

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    backgroundColor: '#ffffff',
    color: '#3f3f46',
    padding: 0,
  },
  section: {
    padding: 40,
    paddingBottom: 58,
  },
  coverImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover'
  },
  footer: {
    position: 'absolute',
    left: 40,
    right: 40,
    bottom: 22,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopStyle: 'solid',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 8,
    color: '#71717a',
  },
  footerBrand: {
    width: 48,
    height: 3,
    borderRadius: 2,
  },
});

interface ProposalDocumentProps {
  proposal: Proposal;
  coverImage?: string | null;
  pdfTheme?: Partial<PdfTheme> | null;
}

const PageSection = ({ children, pdfTheme }: { children: React.ReactNode; pdfTheme?: Partial<PdfTheme> | null }) => {
  const theme = resolvePdfDocumentTheme(pdfTheme);

  return (
    <Page size="A4" style={[styles.page, styles.section]}>
      {children}
      <View fixed style={[styles.footer, { borderTopColor: theme.border }]}> 
        <View style={[styles.footerBrand, { backgroundColor: theme.primary }]} />
        <Text
          style={[styles.footerText, { color: theme.muted }]}
          render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`}
        />
      </View>
    </Page>
  );
};

export const ProposalDocument: React.FC<ProposalDocumentProps> = ({ proposal, coverImage, pdfTheme }) => {
  return (
    <Document>
      <PdfThemeProvider theme={pdfTheme}>
        <Page size="A4" style={styles.page}>
          {coverImage ? (
            <>
              <Image src={coverImage} style={styles.coverImage} />
              <DynamicCoverOverlay proposal={proposal} />
            </>
          ) : (
            <CoverPage proposal={proposal} />
          )}
        </Page>

        <PageSection pdfTheme={pdfTheme}>
          <IntroLetterSection proposal={proposal} />
        </PageSection>

        <PageSection pdfTheme={pdfTheme}>
          <ExecutiveSummary proposal={proposal} />
        </PageSection>

        <PageSection pdfTheme={pdfTheme}>
          <EnergyDiagnosisSection proposal={proposal} />
        </PageSection>

        <PageSection pdfTheme={pdfTheme}>
          <SolarSolutionSection proposal={proposal} />
        </PageSection>

        <PageSection pdfTheme={pdfTheme}>
          <EquipmentSection proposal={proposal} />
        </PageSection>

        <PageSection pdfTheme={pdfTheme}>
          <GenerationSection proposal={proposal} />
        </PageSection>

        <PageSection pdfTheme={pdfTheme}>
          <FinancialSection proposal={proposal} />
        </PageSection>

        <PageSection pdfTheme={pdfTheme}>
          <TermsSection proposal={proposal} />
        </PageSection>

        <PageSection pdfTheme={pdfTheme}>
          <WarrantyAndNextStepsSection proposal={proposal} />
        </PageSection>

        <PageSection pdfTheme={pdfTheme}>
          <AcceptanceSection proposal={proposal} />
        </PageSection>
      </PdfThemeProvider>
    </Document>
  );
};
