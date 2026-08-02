import React from 'react';
import { Document, Image, Page, StyleSheet } from '@react-pdf/renderer';
import {
  getVisibleProposalPages,
  type ProposalPageKey,
} from '../../lib/pdf/proposalPageRegistry';
import { PdfPageConfig, PdfTheme } from '../../types/pdfModels';
import { Proposal } from '../../types/proposal';
import { PdfThemeProvider } from './pdfTheme';
import { CoverPage } from './sections/CoverPage';
import {
  AcceptancePage,
  ConsumptionPage,
  FinancialPage,
  IntroPage,
  KitPage,
  PaybackPage,
  RoofPage,
  TechnicalPage,
  TimelinePage,
} from './sections/ProposalPages';

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    backgroundColor: '#ffffff',
    color: '#3f3f46',
    padding: 0,
  },
  coverImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
});

interface ProposalDocumentProps {
  proposal: Proposal;
  coverImage?: string | null;
  pdfTheme?: Partial<PdfTheme> | null;
  pageConfig?: Partial<PdfPageConfig> | null;
}

function hasFinancialData(proposal: Proposal) {
  return Number(proposal.final_price || proposal.gross_price || proposal.solar_kit_snapshot?.sale_price || 0) > 0;
}

function hasEnergyData(proposal: Proposal) {
  return Number(
    proposal.monthly_consumption_kwh ||
      proposal.solar?.monthly_consumption_kwh ||
      proposal.solar?.estimated_monthly_generation_kwh ||
      0,
  ) > 0;
}

function shouldRenderPage(pageKey: ProposalPageKey, proposal: Proposal) {
  switch (pageKey) {
    case 'kit':
      return Boolean(proposal.solar_kit_snapshot);
    case 'roof':
      return Boolean(proposal.roof_image_url || proposal.roof_photo_url || proposal.roof_plan_image_url);
    case 'financial':
      return hasFinancialData(proposal);
    case 'payback':
      return hasFinancialData(proposal) || Number(proposal.solar?.annual_savings || proposal.solar?.monthly_savings || 0) > 0;
    case 'consumption':
      return hasEnergyData(proposal);
    default:
      return true;
  }
}

export const ProposalDocument: React.FC<ProposalDocumentProps> = ({
  proposal,
  coverImage,
  pdfTheme,
  pageConfig,
}) => {
  const visiblePages = getVisibleProposalPages(pageConfig).filter(({ key }) => shouldRenderPage(key, proposal));

  return (
    <Document>
      <PdfThemeProvider theme={pdfTheme}>
        {visiblePages.map((page, index) => {
          const pageNumber = index + 1;

          switch (page.key) {
            case 'cover':
              return (
                <Page key={page.key} size="A4" style={styles.page} wrap={false}>
                  {coverImage ? (
                    <Image src={coverImage} style={styles.coverImage} />
                  ) : (
                    <CoverPage proposal={proposal} />
                  )}
                </Page>
              );
            case 'intro':
              return <IntroPage key={page.key} proposal={proposal} pageNumber={pageNumber} />;
            case 'consumption':
              return <ConsumptionPage key={page.key} proposal={proposal} pageNumber={pageNumber} />;
            case 'technical':
              return <TechnicalPage key={page.key} proposal={proposal} pageNumber={pageNumber} />;
            case 'kit':
              return <KitPage key={page.key} proposal={proposal} pageNumber={pageNumber} />;
            case 'roof':
              return <RoofPage key={page.key} proposal={proposal} pageNumber={pageNumber} />;
            case 'timeline':
              return <TimelinePage key={page.key} proposal={proposal} pageNumber={pageNumber} />;
            case 'financial':
              return <FinancialPage key={page.key} proposal={proposal} pageNumber={pageNumber} />;
            case 'payback':
              return <PaybackPage key={page.key} proposal={proposal} pageNumber={pageNumber} />;
            case 'acceptance':
              return <AcceptancePage key={page.key} proposal={proposal} pageNumber={pageNumber} />;
            default:
              return null;
          }
        })}
      </PdfThemeProvider>
    </Document>
  );
};
