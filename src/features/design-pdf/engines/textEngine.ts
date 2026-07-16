export type CoverTextValues = {
  clientName?: string;
  clientDocument?: string;
  powerKwp?: string;
  cityState?: string;
  date?: string;
  validityText?: string;
  proposalCode?: string;
  companyName?: string;
  sellerName?: string;
  systemType?: string;
  investment?: string;
};

function replaceTextContent(text: string, values: CoverTextValues) {
  const clean = text.trim();
  const lower = clean.toLowerCase();

  if (!clean) return text;

  if (/nome\s+(sobrenome|do cliente)|nome do cliente|nome sobrenome/i.test(clean)) {
    return values.clientName || clean;
  }

  if (/000[.\s]?000[.\s]?000[-\s]?00|00[.\s]?000[.\s]?000[/\s]?0000[-\s]?00/i.test(clean)) {
    return values.clientDocument || clean;
  }

  if (/0[,.]00\s*kwp|4[,.]95\s*kwp/i.test(clean)) {
    return values.powerKwp || clean;
  }

  if (/cidade\s*-?\s*estado|cidade-estado|cidade estado|cidade\s*-?\s*uf/i.test(clean)) {
    return values.cityState || clean;
  }

  if (/dd\s*\/\s*mm\s*\/\s*(aa|aaaa)/i.test(clean)) {
    return values.date || clean;
  }

  if (/validade\s*:\s*\d+\s*dias?/i.test(clean)) {
    return values.validityText || clean;
  }

  if (/fv[-\s]?aaaa[-\s]?0000|c[oó]digo\s*:\s*0000/i.test(clean)) {
    return values.proposalCode || clean;
  }

  if (/nome da empresa|nome empresa/i.test(clean)) {
    return values.companyName || clean;
  }

  if (/nome do vendedor|nome vendedor|nome do consultor/i.test(clean)) {
    return values.sellerName || clean;
  }

  if (/tipo de sistema|sistema on-grid|sistema on grid/i.test(clean) && values.systemType) {
    return values.systemType;
  }

  if (/r\$\s*0[,.]00/i.test(clean)) {
    return values.investment || clean;
  }

  if (lower === 'cliente' || lower === 'data' || lower === 'localização') return clean;

  return text;
}

export function applyDynamicTexts(doc: Document, values: CoverTextValues) {
  doc.querySelectorAll('text, tspan').forEach((element) => {
    const current = element.textContent || '';
    const next = replaceTextContent(current, values);
    if (next !== current) element.textContent = next;
  });
}
