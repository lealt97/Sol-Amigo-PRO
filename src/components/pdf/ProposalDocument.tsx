import React from 'react';
import { Document, Image, Page, StyleSheet } from '@react-pdf/renderer';
import accumulatedSavingsImage from '../../assets/pdf-art/accumulatedSavingsImage';
import implementationTimelineNewImage from '../../assets/pdf-art/implementationTimelineNewImage';
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
  previewPageKey?: ProposalPageKey | null;
}

export const ProposalDocument: React.FC<ProposalDocumentProps> = ({
  proposal,
  coverImage,
  pdfTheme,
  pageConfig,
  illustrationImages = defaultProposalIllustrationImages,
  previewPageKey = null,
}) => {
  // A seleção feita no editor é a fonte de verdade. Uma página marcada como
  // visível não pode desaparecer silenciosamente na exportação por ausência
  // de algum dado opcional da proposta.
  const visiblePages = getVisibleProposalPages(pageConfig);
  const pagesToRender = previewPageKey
    ? visiblePages.flatMap((page, index) => (
      page.key === previewPageKey
        ? [{ page, pageNumber: index + 1 }]
        : []
    ))
    : visiblePages.map((page, index) => ({ page, pageNumber: index + 1 }));

  return (
    <Document>
      <PdfThemeProvider theme={pdfTheme}>
        {pagesToRender.map(({ page, pageNumber }) => {
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
                    illustration={implementationTimelineNewImage}
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
                    illustration={accumulatedSavingsImage}
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
