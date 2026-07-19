import React from 'react';
import { pdf } from '@react-pdf/renderer';
import { ProposalDocument } from '../../components/pdf/ProposalDocument';
import { Proposal } from '../../types/proposal';
import { PdfUserModel } from '../../types/pdfModels';
import { supabase } from '../supabase/client';
import { pdfModelService } from '../../services/pdfModelService';
import { generateSvgCoverImage } from './utils/svgToImage';
import {
  createPdfGenerationOperations,
  type PdfMetadataInput,
} from './pdfGenerationOperations';

async function resolvePdfModel(
  proposal: Proposal,
  selectedModelId?: string | null,
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
  const enrichedProposal: Proposal = { ...proposal };

  try {
    if (proposal.client_id) {
      const { data: client } = await supabase
        .from('clients')
        .select('name, document, email, phone, cep, city, state, address, number, neighborhood, complement')
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

  return enrichedProposal;
}

function buildSecurePdfUrl(publicToken: string): string {
  const supabaseUrl = String(import.meta.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
  return `${supabaseUrl}/functions/v1/public-proposal-pdf?token=${encodeURIComponent(publicToken)}`;
}

async function renderProposalPdf(
  proposal: Proposal,
  selectedModelId?: string | null,
): Promise<Blob> {
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

  return pdf(
    <ProposalDocument
      proposal={enrichedProposal}
      coverImage={coverImage}
      pdfTheme={selectedModel?.theme}
    />,
  ).toBlob();
}

async function uploadProposalPdf(storagePath: string, blob: Blob) {
  const { error } = await supabase.storage
    .from('proposals')
    .upload(storagePath, blob, {
      contentType: 'application/pdf',
      upsert: true,
    });

  if (error) throw error;
}

async function removeProposalPdf(storagePath: string) {
  const { error } = await supabase.storage
    .from('proposals')
    .remove([storagePath]);

  if (error) throw error;
}

async function persistProposalPdfMetadata(input: PdfMetadataInput): Promise<string> {
  const { error: updateError } = await supabase
    .from('proposals')
    .update({
      public_token: input.publicToken,
      pdf_storage_path: input.storagePath,
      pdf_url: input.secureUrl,
    })
    .eq('id', input.proposalId);

  if (!updateError) return input.secureUrl;

  console.warn(
    'Modern update failed, attempting fallback update without pdf_storage_path:',
    updateError,
  );

  const { data: urlData } = supabase.storage
    .from('proposals')
    .getPublicUrl(input.storagePath);
  const fallbackUrl = urlData?.publicUrl || input.secureUrl;

  const { error: fallbackTokenError } = await supabase
    .from('proposals')
    .update({
      public_token: input.publicToken,
      pdf_url: fallbackUrl,
    })
    .eq('id', input.proposalId);

  if (!fallbackTokenError) return fallbackUrl;

  console.warn(
    'Update with public_token failed, trying fallback with only pdf_url:',
    fallbackTokenError,
  );

  const { error: fallbackUrlOnlyError } = await supabase
    .from('proposals')
    .update({ pdf_url: fallbackUrl })
    .eq('id', input.proposalId);

  if (fallbackUrlOnlyError) throw fallbackUrlOnlyError;
  return fallbackUrl;
}

const pdfGenerationOperations = createPdfGenerationOperations(
  {
    render: renderProposalPdf,
    upload: uploadProposalPdf,
    persistMetadata: persistProposalPdfMetadata,
    remove: removeProposalPdf,
  },
  {
    createToken: () => globalThis.crypto.randomUUID().replace(/-/g, ''),
    buildSecureUrl: buildSecurePdfUrl,
    logger: console,
  },
);

export async function generateAndUploadPdf(
  proposal: Proposal,
  selectedModelId?: string | null,
): Promise<string | null> {
  return pdfGenerationOperations.generateAndStore(proposal, selectedModelId);
}
