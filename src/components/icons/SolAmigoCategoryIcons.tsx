import type { SVGProps } from 'react';
import {
  ChartNoAxesCombined,
  ContactRound,
  FileSignature,
  PackageSearch,
  PenTool,
  ShieldCheck,
  SlidersHorizontal,
  type LucideIcon,
} from 'lucide-react';

type CategoryIconProps = SVGProps<SVGSVGElement> & {
  title?: string;
};

type CategoryIconBaseProps = CategoryIconProps & {
  icon: LucideIcon;
};

function CategoryIconBase({ icon: Icon, title, ...props }: CategoryIconBaseProps) {
  return (
    <Icon
      {...props}
      strokeWidth={1.9}
      absoluteStrokeWidth
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    />
  );
}

/** Visão operacional, indicadores e desempenho. */
export function DashboardCategoryIcon(props: CategoryIconProps) {
  return <CategoryIconBase icon={ChartNoAxesCombined} {...props} />;
}

/** Cadastro, contatos e relacionamento comercial com clientes. */
export function ClientsCategoryIcon(props: CategoryIconProps) {
  return <CategoryIconBase icon={ContactRound} {...props} />;
}

/** Propostas comerciais e formalização da venda. */
export function ProposalsCategoryIcon(props: CategoryIconProps) {
  return <CategoryIconBase icon={FileSignature} {...props} />;
}

/** Catálogo e pesquisa de kits fotovoltaicos. */
export function SolarKitsCategoryIcon(props: CategoryIconProps) {
  return <CategoryIconBase icon={PackageSearch} {...props} />;
}

/** Edição visual e personalização dos documentos comerciais. */
export function DesignPdfCategoryIcon(props: CategoryIconProps) {
  return <CategoryIconBase icon={PenTool} {...props} />;
}

/** Preferências e controles da conta. */
export function SettingsCategoryIcon(props: CategoryIconProps) {
  return <CategoryIconBase icon={SlidersHorizontal} {...props} />;
}

/** Administração, permissões e segurança operacional. */
export function AdminCategoryIcon(props: CategoryIconProps) {
  return <CategoryIconBase icon={ShieldCheck} {...props} />;
}
