import React from 'react';
import { pdf } from '@react-pdf/renderer';
import { ProposalDocument } from '../../components/pdf/ProposalDocument';
import { Proposal } from '../../types/proposal';
import { PdfUserModel } from '../../types/pdfModels';
import { supabase } from '../supabase/client';
import { resolveStorageAssetUrl } from '../storage/privateAsset';
import { pdfModelService } from '../../services/pdfModelService';
import { monitoringService } from '../../services/monitoringService';
import { generateSvgCoverImage } from './utils/svgToImage';
import {
  createPdfGenerationOperations,
  type PdfMetadataInput,
} from './pdfGenerationOperations';
import { PDF_SIZE_LIMITS, validatePdfBlob } from './pdfQuality';

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

  const privateRoofImage = proposal.roof_image_url || proposal.roof_photo_url || proposal.roof_plan_image_url;
  if (privateRoofImage) {
    try {
      enrichedProposal.roof_image_url = await resolveStorageAssetUrl(privateRoofImage, 900);
    } catch (roofImageError) {
      console.warn('Could not authorize private roof image for PDF generation', roofImageError);
      enrichedProposal.roof_image_url = null;
    }
  }

  return enrichedProposal;
}

function buildSecurePdfUrl(publicToken: string): string {
  const supabaseUrl = String(import.meta.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
  if (!supabaseUrl) throw new Error('VITE_SUPABASE_URL não configurada para gerar o link seguro.');
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

  const blob = await pdf(
    <ProposalDocument
      proposal={enrichedProposal}
      coverImage={coverImage}
      pdfTheme={selectedModel?.theme}
    />,
  ).toBlob();

  await validatePdfBlob(blob, {
    minByteLength: 4_096,
    maxByteLength: PDF_SIZE_LIMITS.hardMaxBytes,
    minPages: 1,
  });

  return blob;
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

  if (updateError) {
    console.error('Secure PDF metadata update failed', updateError);
    throw new Error('Não foi possível registrar o PDF privado. O arquivo público não será usado como alternativa.');
  }

  return input.secureUrl;
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
  try {
    return await pdfGenerationOperations.generateAndStore(proposal, selectedModelId);
  } catch (error) {
    void monitoringService.capture('pdf.generation_failed', {
      error,
      fingerprint: 'pdf.generation_failed',
      metadata: {
        proposal_id: proposal.id,
        has_selected_model: Boolean(selectedModelId),
      },
    });
    throw error;
  }
}
