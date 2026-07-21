import { Navigate, useParams } from 'react-router-dom';
import { ProposalDetails } from '../../pages/propostas/ProposalDetails';

export function ProposalDetailsRoute() {
  const { id } = useParams<{ id: string }>();
  if (!id) return <Navigate to="/propostas" replace />;
  return <ProposalDetails />;
}
