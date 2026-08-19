const axios = require('axios');

const PUBCHEM_BASE_URL = 'https://pubchem.ncbi.nlm.nih.gov/rest/pug';

const normalizeQuery = (query = '') => String(query).trim();

// Fetch CID by Chemical Name, CAS Number, or direct PubChem CID
const fetchCidByQuery = async (query) => {
  const q = normalizeQuery(query);
  if (!q) return null;

  // 1. If it's a numeric CID or CID-1234
  const numericCid = q.replace(/^CID-?/i, '');
  if (/^\d+$/.test(numericCid)) {
    return numericCid;
  }

  // 2. If it's a CAS Number (e.g. 7761-88-8, 64-17-5)
  if (/^\d{2,7}-\d{2}-\d$/.test(q)) {
    try {
      const res = await axios.get(`${PUBCHEM_BASE_URL}/compound/xref/RegistryID/${encodeURIComponent(q)}/cids/JSON`, { timeout: 8000 });
      const cid = res.data?.IdentifierList?.CID?.[0];
      if (cid) return String(cid);
    } catch (e) { /* fallback to name search */ }
  }

  // 3. Search by Chemical Name
  try {
    const res = await axios.get(`${PUBCHEM_BASE_URL}/compound/name/${encodeURIComponent(q)}/cids/JSON`, { timeout: 8000 });
    const cid = res.data?.IdentifierList?.CID?.[0];
    if (cid) return String(cid);
  } catch (e) {
    // 4. Fallback search by RegistryID / synonym
    try {
      const res = await axios.get(`${PUBCHEM_BASE_URL}/compound/xref/RN/${encodeURIComponent(q)}/cids/JSON`, { timeout: 8000 });
      const cid = res.data?.IdentifierList?.CID?.[0];
      if (cid) return String(cid);
    } catch (err) {
      return null;
    }
  }

  return null;
};

const fetchCompoundProperties = async (cid) => {
  if (!cid) return null;

  const response = await axios.get(
    `${PUBCHEM_BASE_URL}/compound/cid/${encodeURIComponent(cid)}/property/Title,MolecularFormula,SMILES,ConnectivitySMILES,InChI,IUPACName/JSON`,
    { timeout: 8000 }
  );

  return response.data?.PropertyTable?.Properties?.[0] || null;
};

const fetchCompoundSynonyms = async (cid) => {
  if (!cid) return [];

  try {
    const response = await axios.get(`${PUBCHEM_BASE_URL}/compound/cid/${encodeURIComponent(cid)}/synonyms/JSON`, {
      timeout: 8000,
    });

    return response.data?.InformationList?.Information?.[0]?.Synonym || [];
  } catch (e) {
    return [];
  }
};

const extractCasFromSynonyms = (synonyms = []) => {
  const casPattern = /^\d{2,7}-\d{2}-\d$/;
  for (const s of synonyms) {
    if (casPattern.test(s.trim())) {
      return s.trim();
    }
  }
  return '';
};

const pickChemicalName = (properties, synonyms = []) => {
  const preferred = [
    properties?.Title,
    properties?.IUPACName,
    ...synonyms,
  ].find((value) => typeof value === 'string' && value.trim().length > 0);

  return preferred ? preferred.trim() : '';
};

const fetchChemicalDataByQuery = async (query) => {
  const normalized = normalizeQuery(query);
  if (!normalized) {
    return { found: false, source: 'pubchem', message: 'Chemical Name, CAS Number, or PubChem CID is required.' };
  }

  try {
    const cid = await fetchCidByQuery(normalized);
    if (!cid) {
      return { found: false, source: 'pubchem', message: `No PubChem record found for "${normalized}".` };
    }

    const [properties, synonyms] = await Promise.all([
      fetchCompoundProperties(cid),
      fetchCompoundSynonyms(cid),
    ]);

    if (!properties) {
      return { found: false, source: 'pubchem', message: 'PubChem record found, but no compound properties were returned.' };
    }

    const detectedCas = extractCasFromSynonyms(synonyms) || (/^\d{2,7}-\d{2}-\d$/.test(normalized) ? normalized : '');

    return {
      found: true,
      source: 'pubchem',
      cid,
      data: {
        chemicalName: pickChemicalName(properties, synonyms),
        casNumber: detectedCas,
        chemicalFormula: properties.MolecularFormula || '',
        smiles: properties.SMILES || properties.ConnectivitySMILES || '',
        inchi: properties.InChI || '',
        iupacName: properties.IUPACName || '',
        pubchemUrl: `https://pubchem.ncbi.nlm.nih.gov/compound/${cid}`,
      },
    };
  } catch (error) {
    const status = error?.response?.status;
    if (status === 404) {
      return { found: false, source: 'pubchem', message: `No PubChem record found for "${normalized}".` };
    }

    throw new Error(`PubChem lookup failed: ${error.message}`);
  }
};

const fetchChemicalDataByCas = async (casNumber) => {
  return fetchChemicalDataByQuery(casNumber);
};

module.exports = {
  fetchChemicalDataByQuery,
  fetchChemicalDataByCas,
};
