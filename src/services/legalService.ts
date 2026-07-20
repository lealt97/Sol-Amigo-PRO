import { supabase } from '../lib/supabase/client';
import { LegalDocumentType } from '../lib/legal/legalCatalog';

export interface LegalStatusDocument {
  document_type: LegalDocumentType;
  version: string;
  title: string;
  review_status: 'draft' | 'legal_review' | 'approved' | 'retired';
  accepted: boolean;
}

export interface LegalStatus {
  complete: boolean;
  documents: LegalStatusDocument[];
}

export const legalService = {
  async getMyStatus(): Promise<LegalStatus> {
    const { data, error } = await supabase.rpc('get_my_legal_status');
    if (error) throw error;
    return {
      complete: data?.complete === true,
      documents: Array.isArray(data?.documents) ? data.documents : [],
    };
  },

  async acceptCurrentDocuments() {
    const { data, error } = await supabase.rpc('accept_current_legal_documents');
    if (error) throw error;
    return data;
  },
};
