import React from 'react';
import { Document, Image, Page, StyleSheet } from '@react-pdf/renderer';
import {
  getVisibleProposalPages,
  type ProposalPageKey,
} from '../../lib/pdf/proposalPageRegistry';
import {
  defaultProposalIllustrationImages,
  type ProposalIllustrationImages,
} from '../../lib/pdf/utils/illustrationColorEngine';
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
} from './sections/ProposalPagesWithVectorArt';
import { TimelineTallPage } from './sections/TimelineTallPage';

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
  illustrationImages?: ProposalIllustrationImages;
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
  illustrationImages = defaultProposalIllustrationImages,
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
              return <React.Fragment key={page.key}><IntroPage proposal={proposal} pageNumber={pageNumber} /></React.Fragment>;
            case 'consumption':
              return <React.Fragment key={page.key}><ConsumptionPage proposal={proposal} pageNumber={pageNumber} /></React.Fragment>;
            case 'technical':
              return <React.Fragment key={page.key}><TechnicalPage proposal={proposal} pageNumber={pageNumber} /></React.Fragment>;
            case 'kit':
              return (
                <React.Fragment key={page.key}>
                  <KitPage
                    proposal={proposal}
                    pageNumber={pageNumber}
                    illustration={illustrationImages.kit}
                  />
                </React.Fragment>
              );
            case 'roof':
              return <React.Fragment key={page.key}><RoofPage proposal={proposal} pageNumber={pageNumber} /></React.Fragment>;
            case 'timeline':
              return (
                <React.Fragment key={page.key}>
                  <TimelineTallPage
                    proposal={proposal}
                    pageNumber={pageNumber}
                    illustration={illustrationImages.timeline}
                  />
                </React.Fragment>
              );
            case 'financial':
              return (
                <React.Fragment key={page.key}>
                  <FinancialPage
                    proposal={proposal}
                    pageNumber={pageNumber}
                    illustration={illustrationImages.financial}
                  />
                </React.Fragment>
              );
            case 'payback':
              return (
                <React.Fragment key={page.key}>
                  <PaybackPage
                    proposal={proposal}
                    pageNumber={pageNumber}
                    illustration={illustrationImages.financial}
                  />
                </React.Fragment>
              );
            case 'acceptance':
              return <React.Fragment key={page.key}><AcceptancePage proposal={proposal} pageNumber={pageNumber} /></React.Fragment>;
            default:
              return null;
          }
        })}
      </PdfThemeProvider>
    </Document>
  );
};
