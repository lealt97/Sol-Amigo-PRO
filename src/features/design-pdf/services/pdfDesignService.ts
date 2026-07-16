import { pdfModelService } from '../../../services/pdfModelService';
import { storageAssetService } from '../../../services/storageAssetService';

export const pdfDesignService = {
  getPresets: pdfModelService.getPresets.bind(pdfModelService),
  getPreset: pdfModelService.getPreset.bind(pdfModelService),
  getPresetSvgContent: pdfModelService.getPresetSvgContent.bind(pdfModelService),
  getUserModels: pdfModelService.getUserModels.bind(pdfModelService),
  getModelById: pdfModelService.getModelById.bind(pdfModelService),
  createModelFromPreset: pdfModelService.createModelFromPreset.bind(pdfModelService),
  duplicateModel: pdfModelService.duplicateModel.bind(pdfModelService),
  updateModel: pdfModelService.updateModel.bind(pdfModelService),
  deleteModel: pdfModelService.deleteModel.bind(pdfModelService),
  setDefaultModel: pdfModelService.setDefaultModel.bind(pdfModelService),
  uploadAsset: storageAssetService.uploadAsset.bind(storageAssetService),
};

export type PdfDesignService = typeof pdfDesignService;
