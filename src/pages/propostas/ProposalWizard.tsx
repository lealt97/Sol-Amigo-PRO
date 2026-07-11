/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { proposalSchema, ProposalFormValues } from '../../lib/validations/proposal.schema';
import { proposalService } from '../../services/proposalService';
import { profileService } from '../../services/profileService';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/ui/Button';
import { Card, CardContent } from '../../components/ui/Card';
import { ArrowLeft, ArrowRight, Save, CheckCircle2 } from 'lucide-react';
import { StepClient } from './steps/StepClient';
import { StepConsumption } from './steps/StepConsumption';
import { StepProject } from './steps/StepProject';
import { StepInstallation } from './steps/StepInstallation';
import { StepCosts } from './steps/StepCosts';
import { StepFinancial } from './steps/StepFinancial';
import { StepPreview } from './steps/StepPreview';
import { SolarCalculationPreview } from './SolarCalculationPreview';
import { validateFullProposal, validateProposalStep } from './validation/proposalWizardValidation';
import { EMPTY_ROOF_LAYOUT } from '../../types/roofLayout';

const STEPS = [
  { id: 'client', title: 'Cliente' },
  { id: 'consumption', title: 'Consumo' },
  { id: 'project', title: 'Projeto Solar' },
  { id: 'installation', title: 'Local de Instalação' },
  { id: 'costs', title: 'Custos' },
  { id: 'financial', title: 'Financeiro' },
  { id: 'preview', title: 'Preview' },
];

export function ProposalWizard() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const clientIdFromQuery = searchParams.get('clienteId');
  
  const isEditing = !!id;
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [currentStep, setCurrentStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(isEditing);
  const [isSaving, setIsSaving] = useState(false);

  const methods = useForm<ProposalFormValues>({
    resolver: zodResolver(proposalSchema),
    defaultValues: {
      client_id: clientIdFromQuery || '',
      title: 'Nova Proposta',
      consumption_source: 'average',
      roof_type: '',
      roof_area_m2: '',
      roof_image_url: '',
      module_width_m: '1.13',
      module_height_m: '2.28',
      roof_layout_json: EMPTY_ROOF_LAYOUT,
      yield_factor: '0.80',
      generation_target_percent: '100',
      oversizing: '1.20',
      additional_costs: [],
    }
  });

  const applyValidationUpdates = (updates?: Partial<ProposalFormValues>) => {
    Object.entries(updates || {}).forEach(([key, value]) => {
      methods.setValue(key as any, value as any, {
        shouldDirty: true,
        shouldValidate: true,
      });
    });
  };

  useEffect(() => {
    async function initWizard() {
      try {
        if (id) {
          const proposal = await proposalService.getProposalById(id);
          const otherCosts = Number(proposal.other_costs) || 0;

          methods.reset({
            client_id: proposal.client_id,
            title: proposal.title || '',
            consumption_source: proposal.consumption_source || 'average',
            history: (proposal as any).history || [],
            estimated_daily_consumption: proposal.estimated_daily_consumption || '',
            monthly_consumption_kwh: proposal.monthly_consumption_kwh || '',
            bill_amount: proposal.bill_amount || '',
            kit_cost: proposal.kit_cost || '',
            labor_cost: proposal.labor_cost || '',
            fixed_costs: proposal.fixed_costs || '',
            freight_cost: proposal.freight_cost || '',
            taxes: proposal.taxes || '',
            commission: proposal.commission || '',
            other_costs: otherCosts || '',
            additional_costs: otherCosts > 0 ? [{ description: 'Custos adicionais', amount: otherCosts }] : [],
            margin_percentage: proposal.margin_percentage || '',
            discount_percentage: proposal.discount_percentage || '',
            cep: proposal.solar?.cep || '',
            roof_type: proposal.roof_type || '',
            roof_area_m2: proposal.roof_area_m2 || '',
            roof_image_url: proposal.roof_image_url || '',
            module_width_m: proposal.module_width_m || '1.13',
            module_height_m: proposal.module_height_m || '2.28',
            roof_layout_json: proposal.roof_layout_json || EMPTY_ROOF_LAYOUT,
            hsp: proposal.solar?.hsp || '',
            panel_power_w: proposal.solar?.panel_power_w || '',
            yield_factor: proposal.solar?.yield_factor || '0.80',
            generation_target_percent: proposal.solar?.generation_target_percent || '100',
            oversizing: proposal.solar?.oversizing || '1.20',
            energy_tariff: proposal.solar?.energy_tariff || proposal.energy_tariff || '',
            loads: proposal.loads || [],
          });
        } else if (user) {
          const profile = await profileService.getProfile(user.id);
          if (profile?.default_margin_percentage) {
            methods.setValue('margin_percentage', profile.default_margin_percentage);
          }
        }
      } catch (err: any) {
        setError(err.message || 'Erro ao inicializar wizard');
      } finally {
        setIsLoading(false);
      }
    }
    initWizard();
  }, [id, methods, user]);

  const handleNext = async () => {
    const validation = validateProposalStep(currentStep, methods.getValues());

    if (!validation.isValid) {
      setError(validation.message || 'Preencha as informações obrigatórias antes de continuar.');
      if (validation.stepIndex !== undefined && validation.stepIndex !== currentStep) {
        setCurrentStep(validation.stepIndex);
      }
      return;
    }

    applyValidationUpdates(validation.updates);
    setError(null);
    setCurrentStep((prev) => Math.min(prev + 1, STEPS.length - 1));
  };

  const handlePrev = () => {
    setError(null);
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  const onSaveDraft = async () => {
    if (!user) return;

    const validation = validateFullProposal(methods.getValues());
    if (!validation.isValid) {
      setError(validation.message || 'Preencha as informações obrigatórias antes de salvar a proposta.');
      if (validation.stepIndex !== undefined) {
        setCurrentStep(validation.stepIndex);
      }
      return;
    }

    applyValidationUpdates(validation.updates);
    setIsSaving(true);
    setError(null);
    try {
      const data = {
        ...methods.getValues(),
        ...(validation.updates || {}),
      };
      if (isEditing) {
        await proposalService.updateProposal(id, data);
        navigate(`/propostas/${id}`);
      } else {
        const newProposal = await proposalService.createProposal(data, user.id);
        navigate(`/propostas/${newProposal.id}`);
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar rascunho');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="text-brand-blue animate-pulse">Carregando proposta...</div>;
  }

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto w-full">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/propostas')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-brand-dark">
              {isEditing ? 'Editar Proposta' : 'Nova Proposta'}
            </h1>
            <p className="text-sm text-slate-500">
              Etapa {currentStep + 1} de {STEPS.length}: {STEPS[currentStep].title}
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={onSaveDraft} isLoading={isSaving} className="gap-2">
          <Save className="w-4 h-4" />
          Salvar Rascunho
        </Button>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {STEPS.map((step, index) => (
          <div key={step.id} className="flex items-center">
            <div
              className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-medium border-2 transition-colors
                ${
                  index < currentStep
                    ? 'bg-brand-blue border-brand-blue text-white'
                    : index === currentStep
                    ? 'border-brand-blue text-brand-blue'
                    : 'border-brand-border text-slate-500'
                }
              `}
            >
              {index < currentStep ? <CheckCircle2 className="w-5 h-5" /> : index + 1}
            </div>
            <span
              className={`ml-2 text-sm whitespace-nowrap transition-colors ${
                index <= currentStep ? 'text-brand-dark font-medium' : 'text-slate-500'
              }`}
            >
              {step.title}
            </span>
            {index < STEPS.length - 1 && (
              <div className={`w-8 sm:w-12 h-px mx-2 sm:mx-4 transition-colors ${index < currentStep ? 'bg-brand-blue' : 'bg-gray-100'}`} />
            )}
          </div>
        ))}
      </div>

      <FormProvider {...methods}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          <Card className="lg:col-span-2">
            <CardContent className="p-6">
              {error && (
                <div className="mb-6 p-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-md">
                  {error}
                </div>
              )}

              <form className="space-y-6">
                {currentStep === 0 && <StepClient />}
                {currentStep === 1 && <StepConsumption />}
                {currentStep === 2 && <StepProject />}
                {currentStep === 3 && <StepInstallation />}
                {currentStep === 4 && <StepCosts />}
                {currentStep === 5 && <StepFinancial />}
                {currentStep === 6 && <StepPreview />}
              </form>

              <div className="flex justify-between mt-8 pt-6 border-t border-brand-border">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handlePrev}
                  disabled={currentStep === 0}
                  className="gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Anterior
                </Button>
                
                {currentStep < STEPS.length - 1 ? (
                  <Button type="button" onClick={handleNext} className="gap-2">
                    Próximo
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                ) : (
                  <Button type="button" onClick={onSaveDraft} isLoading={isSaving} className="gap-2">
                    Concluir
                    <CheckCircle2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
          
          <div className="lg:col-span-1 lg:sticky lg:top-6">
            <SolarCalculationPreview />
          </div>
        </div>
      </FormProvider>
    </div>
  );
}
