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

async function enrichProposalForPdf(proposal: Proposal): Promise<Proposal> {
  const enrichedProposal: any = { ...proposal };

  try {
    if (proposal.client_id) {
      const { data: client } = await supabase
        .from('clients')
        .select('name, document, email, phone, city, state')
        .eq('id', proposal.client_id)
        .maybeSingle();

      if (client) {
        enrichedProposal.client = {
          ...(proposal.client || {}),
          ...client,
        };
      }
    }
  } catch (clientError) {
    console.warn('Could not enrich PDF proposal client data', clientError);
  }

  try {
    const currentPower = Number(enrichedProposal.solar?.installed_power_kwp || 0);
    if (!currentPower) {
      const { data: solarRows } = await supabase
        .from('solar_system_calculations')
        .select('*')
        .eq('proposal_id', proposal.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (solarRows?.[0]) {
        enrichedProposal.solar = solarRows[0];
      }
    }
  } catch (solarError) {
    console.warn('Could not enrich PDF proposal solar data', solarError);
  }

  return enrichedProposal as Proposal;
}

function buildSecurePdfUrl(publicToken: string): string {
  const supabaseUrl = String(import.meta.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
  return `${supabaseUrl}/functions/v1/public-proposal-pdf?token=${encodeURIComponent(publicToken)}`;
}

export async function generateAndUploadPdf(
  proposal: Proposal,
  selectedModelId?: string | null
): Promise<string | null> {
  try {
    const enrichedProposal = await enrichProposalForPdf(proposal);
    let coverImage: string | null = null;
    let selectedModel: PdfUserModel | null = null;

    try {
      selectedModel = await resolvePdfModel(enrichedProposal, selectedModelId);
      if (selectedModel) {
        coverImage = await generateSvgCoverImage(selectedModel, enrichedProposal);
      }
    } catch (templateError) {
      console.warn('Could not load custom cover template, falling back to default', templateError);
    }

    const asPdf = pdf(
      <ProposalDocument
        proposal={enrichedProposal}
        coverImage={coverImage}
        pdfTheme={selectedModel?.theme}
      />
    );
    const blob = await asPdf.toBlob();

    const timestamp = Date.now();
    const fileName = `proposta-${enrichedProposal.code || enrichedProposal.id.substring(0, 8)}-${timestamp}.pdf`;
    const filePath = `${enrichedProposal.user_id}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('proposals')
      .upload(filePath, blob, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (uploadError) {
      console.error('Error uploading private PDF to storage:', uploadError);
      return null;
    }

    const publicToken = enrichedProposal.public_token
      || crypto.randomUUID().replace(/-/g, '');
    const securePdfUrl = buildSecurePdfUrl(publicToken);

    const { error: updateError } = await supabase
      .from('proposals')
      .update({
        public_token: publicToken,
        pdf_storage_path: filePath,
        pdf_url: securePdfUrl,
      })
      .eq('id', enrichedProposal.id);

    if (updateError) {
      console.error('Error updating proposal with private PDF path:', updateError);
      return null;
    }

    return securePdfUrl;
  } catch (error) {
    console.error('Error generating PDF:', error);
    return null;
  }
}
