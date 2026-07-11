import React from 'react';
import { pdf } from '@react-pdf/renderer';
import { ProposalDocument } from '../../components/pdf/ProposalDocument';
import { Proposal } from '../../types/proposal';
import { PdfUserModel } from '../../types/pdfModels';
import { supabase } from '../supabase/client';
import { pdfModelService } from '../../services/pdfModelService';
import { generateSvgCoverImage } from './utils/svgToImage';

async function resolvePdfModel(
  proposal: Proposal,
  selectedModelId?: string | null
): Promise<PdfUserModel | null> {
  const models = await pdfModelService.getUserModels(proposal.user_id);

  if (selectedModelId) {
    const selectedModel = models.find((model) => model.id === selectedModelId);

    if (selectedModel) {
      return selectedModel;
    }

    console.warn('Selected PDF model was not found for this proposal user. Falling back to default model.');
  }

  return models.find((model) => model.is_default) || models[0] || null;
}

export async function generateAndUploadPdf(
  proposal: Proposal,
  selectedModelId?: string | null
): Promise<string | null> {
  try {
    let coverImage: string | null = null;
    let selectedModel: PdfUserModel | null = null;
    
    // Attempt to load the selected template for this generation, falling back to the user's default template.
    try {
      selectedModel = await resolvePdfModel(proposal, selectedModelId);
      if (selectedModel) {
        coverImage = await generateSvgCoverImage(selectedModel, proposal);
      }
    } catch (templateError) {
      console.warn('Could not load custom cover template, falling back to default', templateError);
    }

    // Generate PDF blob. The internal pages inherit the same theme used by the selected/default cover model.
    const asPdf = pdf(
      <ProposalDocument
        proposal={proposal}
        coverImage={coverImage}
        pdfTheme={selectedModel?.theme}
      />
    );
    const blob = await asPdf.toBlob();
    
    // Create unique filename
    const timestamp = new Date().getTime();
    const fileName = `proposta-${proposal.code || proposal.id.substring(0, 8)}-${timestamp}.pdf`;
    const filePath = `${proposal.user_id}/${fileName}`;
    
    // Check if bucket exists, if not, it will fail but we assume 'proposals' bucket exists
    const { error: uploadError } = await supabase
      .storage
      .from('proposals')
      .upload(filePath, blob, {
        contentType: 'application/pdf',
        upsert: true
      });

    if (uploadError) {
      console.error('Error uploading PDF to storage:', uploadError);
      return null;
    }

    // Get public URL
    const { data: urlData } = supabase
      .storage
      .from('proposals')
      .getPublicUrl(filePath);

    // Update proposal with PDF URL
    if (urlData?.publicUrl) {
      const { error: updateError } = await supabase
        .from('proposals')
        .update({ pdf_url: urlData.publicUrl })
        .eq('id', proposal.id);
        
      if (updateError) {
        console.error('Error updating proposal with PDF URL:', updateError);
      }
      
      return urlData.publicUrl;
    }

    return null;
  } catch (error) {
    console.error('Error generating PDF:', error);
    return null;
  }
}