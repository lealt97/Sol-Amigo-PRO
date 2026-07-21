import React from 'react';
import { Document, Page, StyleSheet, Image } from '@react-pdf/renderer';
import { Proposal } from '../../types/proposal';
import { PdfTheme } from '../../types/pdfModels';
import { CoverPage } from './sections/CoverPage';
import { DynamicCoverOverlay } from './sections/DynamicCoverOverlay';
import { PdfThemeProvider } from './pdfTheme';

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
}

export const ProposalDocument: React.FC<ProposalDocumentProps> = ({ proposal, coverImage, pdfTheme }) => {
  return (
    <Document>
      <PdfThemeProvider theme={pdfTheme}>
        <Page size="A4" style={styles.page} wrap={false}>
          {coverImage ? (
            <>
              <Image src={coverImage} style={styles.coverImage} />
              <DynamicCoverOverlay proposal={proposal} />
            </>
          ) : (
            <CoverPage proposal={proposal} />
          )}
        </Page>
      </PdfThemeProvider>
    </Document>
  );
};
