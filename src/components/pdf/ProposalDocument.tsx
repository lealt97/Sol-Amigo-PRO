import React from 'react';
import { Document, Page, StyleSheet, Image } from '@react-pdf/renderer';
import { Proposal } from '../../types/proposal';
import { PdfPageConfig } from '../../types/pdfModels';
import { normalizePdfPageConfig } from '../../lib/pdf/pageConfig';
import { CoverPage } from './sections/CoverPage';
import { ExecutiveSummary } from './sections/ExecutiveSummary';
import { TechnicalSection } from './sections/TechnicalSection';
import { FinancialSection } from './sections/FinancialSection';
import { PaybackSection } from './sections/PaybackSection';
import { TermsSection } from './sections/TermsSection';
import { AcceptanceSection } from './sections/AcceptanceSection';

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    backgroundColor: '#ffffff',
    color: '#3f3f46',
    padding: 0,
  },
  section: {
    padding: 40,
  },
  coverImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover'
  }
});

interface ProposalDocumentProps {
  proposal: Proposal;
  coverImage?: string | null;
  pageConfig?: PdfPageConfig | null;
}

function renderPageContent(pageId: string, proposal: Proposal, coverImage?: string | null) {
  if (pageId === 'cover') {
    return coverImage ? <Image src={coverImage} style={styles.coverImage} /> : <CoverPage proposal={proposal} />;
  }

  if (pageId === 'intro') return <ExecutiveSummary proposal={proposal} />;
  if (pageId === 'technical') return <TechnicalSection proposal={proposal} />;
  if (pageId === 'financial') return <FinancialSection proposal={proposal} />;
  if (pageId === 'payback') return <PaybackSection proposal={proposal} />;
  if (pageId === 'terms') return <TermsSection proposal={proposal} />;
  if (pageId === 'acceptance') return <AcceptanceSection proposal={proposal} />;
  return null;
}

export const ProposalDocument: React.FC<ProposalDocumentProps> = ({ proposal, coverImage, pageConfig }) => {
  const normalizedConfig = normalizePdfPageConfig(pageConfig);
  const visiblePages = normalizedConfig.order.filter(pageId => normalizedConfig.visiblePages?.[pageId] !== false);

  return (
    <Document>
      {visiblePages.map(pageId => {
        const isCover = pageId === 'cover';
        return (
          <Page key={pageId} size="A4" style={isCover ? styles.page : [styles.page, styles.section]}>
            {renderPageContent(pageId, proposal, coverImage)}
          </Page>
        );
      })}
    </Document>
  );
};
